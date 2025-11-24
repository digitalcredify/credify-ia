/**
 * @fileoverview 
 * este arquivo é responsável pela ingestão de dados operacionais no Qdrant.
 * Diferente do ingest-data.ts que trabalha com mês, este trabalha com ranges de datas (startDate, endDate)
 * e também com ranges de horas (startHour, endHour)
 * 1- Transforma os dados provenientes de um JSON em embeddings (vetores semânticos)
 * 2- Armazena esses embeddings no Qdrant Cloud com metadados de range de datas e horas
 * 3- Verifica se um range já está contido em ranges previamente ingeridos
 */

import { traceable } from "langsmith/traceable";
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";
import { qdrantClient, openAiEmbbeding } from "../../config";

export const QDRANT_OPERATION_COLLECTION_NAME = "credify_operation_collection";

/**
 * Converte string de data para objeto Date
 */
function parseDate(dateString: string): Date {
    return new Date(dateString);
}

/**
 * Verifica se um range (A) está completamente contido em outro range (B)
 * @param requestStart - Data inicial do range solicitado
 * @param requestEnd - Data final do range solicitado
 * @param existingStart - Data inicial do range existente
 * @param existingEnd - Data final do range existente
 * @returns true se o range solicitado está contido no range existente
 */
export function isRangeContained(
    requestStart: Date,
    requestEnd: Date,
    existingStart: Date,
    existingEnd: Date
): boolean {
    return requestStart >= existingStart && requestEnd <= existingEnd;
}

/**
 * Verifica se já existe um range no Qdrant que contenha o range solicitado
 * Agora verifica tanto o range de datas quanto o range de horas
 * @param startDate - Data inicial solicitada
 * @param endDate - Data final solicitada
 * @param startHour - Hora inicial solicitada
 * @param endHour - Hora final solicitada
 * @returns true se o range já está coberto, false caso contrário
 */
export const checkIfRangeExists = traceable(
    async function checkIfRangeExists(
        startDate: string, 
        endDate: string, 
        startHour: string, 
        endHour: string
    ): Promise<boolean> {
        try {
            console.log(`[Operation Ingest] Verificando se range ${startDate} a ${endDate} ${startHour}h - ${endHour}h já existe...`);

            const requestStart = parseDate(startDate);
            const requestEnd = parseDate(endDate);
            const requestStartHour = parseInt(startHour);
            const requestEndHour = parseInt(endHour);

            // Busca todos os pontos da coleção para verificar ranges existentes
            const scrollResult = await qdrantClient.scroll(QDRANT_OPERATION_COLLECTION_NAME, {
                limit: 100,
                with_payload: true,
                with_vector: false
            });

            if (!scrollResult.points || scrollResult.points.length === 0) {
                console.log(`[Operation Ingest] Nenhum range encontrado na coleção.`);
                return false;
            }

            // Extrai ranges únicos dos metadados (incluindo horas)
            const existingRanges = new Set<string>();
            for (const point of scrollResult.points) {
                const payload = point.payload as any;
                if (payload?.metadata?.startDate && 
                    payload?.metadata?.endDate && 
                    payload?.metadata?.startHour !== undefined && 
                    payload?.metadata?.endHour !== undefined) {
                    const rangeKey = `${payload.metadata.startDate}|${payload.metadata.endDate}|${payload.metadata.startHour}|${payload.metadata.endHour}`;
                    existingRanges.add(rangeKey);
                }
            }

            console.log(`[Operation Ingest] Encontrados ${existingRanges.size} ranges únicos na coleção.`);

            // Verifica se algum range existente contém o range solicitado
            for (const rangeKey of existingRanges) {
                const [existingStartStr, existingEndStr, existingStartHourStr, existingEndHourStr] = rangeKey.split('|');
                const existingStart = parseDate(existingStartStr);
                const existingEnd = parseDate(existingEndStr);
                const existingStartHour = parseInt(existingStartHourStr);
                const existingEndHour = parseInt(existingEndHourStr);

                // Verifica se o range de datas está contido
                const dateRangeContained = isRangeContained(requestStart, requestEnd, existingStart, existingEnd);
                
                // Verifica se o range de horas está contido
                const hourRangeContained = requestStartHour >= existingStartHour && requestEndHour <= existingEndHour;

                // Só retorna true se AMBOS os ranges (data E hora) estiverem contidos
                if (dateRangeContained && hourRangeContained) {
                    console.log(`[Operation Ingest] ✅ Range solicitado está contido em: ${existingStartStr} a ${existingEndStr} (${existingStartHourStr}h - ${existingEndHourStr}h)`);
                    return true;
                }
            }

            console.log(`[Operation Ingest] ❌ Range solicitado NÃO está contido em nenhum range existente.`);
            return false;

        } catch (error: any) {
            if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
                console.log(`[Operation Ingest] Coleção não existe ainda.`);
                return false;
            }
            console.error("[Operation Ingest] Erro ao verificar ranges:", error);
            return false;
        }
    },
    { name: "Check If Range Exists", run_type: "retriever" }
);

/**
 * Garante que a coleção do Qdrant existe
 */
async function ensureOperationCollectionExists() {
    try {
        const collectionInfo = await qdrantClient.getCollection(QDRANT_OPERATION_COLLECTION_NAME);
        console.log(`[Qdrant] Coleção '${QDRANT_OPERATION_COLLECTION_NAME}' já existe.`);
        return;
    } catch (error: any) {
        if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
            console.log(`[Qdrant] Coleção não encontrada. Criando '${QDRANT_OPERATION_COLLECTION_NAME}'...`);
            
            try {
                await qdrantClient.createCollection(QDRANT_OPERATION_COLLECTION_NAME, {
                    vectors: {
                        size: 1536,
                        distance: "Cosine"
                    }
                });
                console.log(`[Qdrant] ✅ Coleção criada!`);
                
                // Cria índices para os campos de data e hora
                await qdrantClient.createPayloadIndex(QDRANT_OPERATION_COLLECTION_NAME, {
                    field_name: "metadata.startDate",
                    field_schema: "keyword"
                });
                await qdrantClient.createPayloadIndex(QDRANT_OPERATION_COLLECTION_NAME, {
                    field_name: "metadata.endDate",
                    field_schema: "keyword"
                });
                await qdrantClient.createPayloadIndex(QDRANT_OPERATION_COLLECTION_NAME, {
                    field_name: "metadata.startHour",
                    field_schema: "integer"
                });
                await qdrantClient.createPayloadIndex(QDRANT_OPERATION_COLLECTION_NAME, {
                    field_name: "metadata.endHour",
                    field_schema: "integer"
                });
                console.log(`[Qdrant] ✅ Índices criados para startDate, endDate, startHour e endHour!`);
                
            } catch (createError: any) {
                if (createError.message && createError.message.includes("already exists")) {
                    console.log(`[Qdrant] Coleção já foi criada por outra requisição.`);
                    return;
                }
                throw createError;
            }
        } else {
            throw error;
        }
    }
}

/**
 * Processa os dados operacionais e cria documentos para ingestão
 */
function processOperationData(jsonData: any, startDate: string, endDate: string, startHour: string, endHour: string): Document[] {
    const documents: Document[] = [];

    // Processa produtos
    if (jsonData.datasets?.products) {
        for (const product of jsonData.datasets.products) {
            const content = `
Produto: ${product.product.name}
ID: ${product.product.id}
Total de execuções: ${product.total}
Sucessos: ${product.successes}
Sucessos com dados: ${product.successesWithData}
Sucessos sem dados: ${product.successesWithoutData}
Falhas: ${product.fails}
Pendentes: ${product.pendings}
Tempo médio de execução: ${product.averageExecutionTime}ms
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "product",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    productId: product.product.id,
                    productName: product.product.name,
                    ...product
                }
            }));
        }
    }

    // Processa métricas horárias
    if (jsonData.datasets?.hourlyMetrics) {
        for (const hourly of jsonData.datasets.hourlyMetrics) {
            const content = `
Hora: ${hourly.hour}:00
Total de execuções: ${hourly.total}
Sucessos: ${hourly.successes}
Sucessos com dados: ${hourly.successesWithData}
Sucessos sem dados: ${hourly.successesWithoutData}
Falhas: ${hourly.fails}
Pendentes: ${hourly.pendings}
Tempo médio de execução: ${hourly.averageExecutionTime}ms
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "hourlyMetric",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    hour: hourly.hour,
                    ...hourly
                }
            }));
        }
    }

    // Processa aplicações de origem
    if (jsonData.datasets?.applicationsOrigin) {
        for (const app of jsonData.datasets.applicationsOrigin) {
            const content = `
Aplicação: ${app.application.name}
ID: ${app.application.id}
Total de execuções: ${app.total}
Sucessos: ${app.successes}
Sucessos com dados: ${app.successesWithData}
Sucessos sem dados: ${app.successesWithoutData}
Falhas: ${app.fails}
Pendentes: ${app.pendings}
Tempo médio de execução: ${app.averageExecutionTime}ms
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "application",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    applicationId: app.application.id,
                    applicationName: app.application.name,
                    ...app
                }
            }));
        }
    }

    // Processa lista de usuários
    if (jsonData.datasets?.usersList) {
        for (const user of jsonData.datasets.usersList) {
            const content = `
Usuário: ${user.user.login}
ID: ${user.user.id}
Total de execuções: ${user.total}
Sucessos: ${user.successes}
Sucessos com dados: ${user.successesWithData}
Sucessos sem dados: ${user.successesWithoutData}
Falhas: ${user.fails}
Pendentes: ${user.pendings}
Tempo médio de execução: ${user.averageExecutionTime}ms
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "user",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    userId: user.user.id,
                    userLogin: user.user.login,
                    ...user
                }
            }));
        }
    }

    // Processa métricas diárias
    if (jsonData.datasets?.dailyMetrics) {
        for (const daily of jsonData.datasets.dailyMetrics) {
            const content = `
Data: ${daily.date}
Total de execuções: ${daily.total}
Sucessos: ${daily.successes}
Sucessos com dados: ${daily.successesWithData}
Sucessos sem dados: ${daily.successesWithoutData}
Falhas: ${daily.fails}
Pendentes: ${daily.pendings}
Tempo médio de execução: ${daily.averageExecutionTime}ms
Total mapeado: ${daily.fields?.totalMapped || 0}
Total retornado: ${daily.fields?.totalReturned || 0}
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "dailyMetric",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    date: daily.date,
                    ...daily
                }
            }));
        }
    }

    // Processa breakdown de empresas
    if (jsonData.datasets?.companiesBreakdown) {
        for (const company of jsonData.datasets.companiesBreakdown) {
            const content = `
Empresa: ${company.company.name}
ID: ${company.company.id}
Tipo: ${company.company.type}
Totais da empresa:
- Total de execuções: ${company.totals.total}
- Sucessos: ${company.totals.successes}
- Sucessos com dados: ${company.totals.successesWithData}
- Sucessos sem dados: ${company.totals.successesWithoutData}
- Falhas: ${company.totals.fails}
- Pendentes: ${company.totals.pendings}
- Tempo médio de execução: ${company.totals.averageExecutionTime}ms
            `.trim();

            documents.push(new Document({
                pageContent: content,
                metadata: {
                    type: "company",
                    startDate,
                    endDate,
                    startHour: parseInt(startHour),
                    endHour: parseInt(endHour),
                    companyId: company.company.id,
                    companyName: company.company.name,
                    companyType: company.company.type,
                    ...company.totals
                }
            }));

            // Processa usuários dentro de cada empresa
            if (company.users) {
                for (const user of company.users) {
                    const userContent = `
Usuário: ${user.login}
ID: ${user.id}
Conta: ${user.accountName}
Empresa: ${company.company.name}
Total de execuções: ${user.total}
Sucessos: ${user.successes}
Sucessos com dados: ${user.successesWithData}
Sucessos sem dados: ${user.successesWithoutData}
Falhas: ${user.fails}
Pendentes: ${user.pendings}
Tempo médio de execução: ${user.averageExecutionTime}ms
                    `.trim();

                    documents.push(new Document({
                        pageContent: userContent,
                        metadata: {
                            type: "companyUser",
                            startDate,
                            endDate,
                            startHour: parseInt(startHour),
                            endHour: parseInt(endHour),
                            userId: user.id,
                            userLogin: user.login,
                            companyId: company.company.id,
                            companyName: company.company.name,
                            ...user
                        }
                    }));
                }
            }
        }
    }

    return documents;
}

/**
 * Ingere dados operacionais no Qdrant
 */
export const ingestOperationData = traceable(
    async function ingestOperationData(
        jsonData: any, 
        startDate: string, 
        endDate: string, 
        startHour: string, 
        endHour: string
    ) {
        try {
            console.log(`[Operation Ingest] Iniciando ingestão para range: ${startDate} a ${endDate} (${startHour}h - ${endHour}h)`);

            await ensureOperationCollectionExists();

            const documents = processOperationData(jsonData, startDate, endDate, startHour, endHour);
            console.log(`[Operation Ingest] ${documents.length} documentos criados`);

            if (documents.length === 0) {
                console.log(`[Operation Ingest] Nenhum documento para ingerir.`);
                return;
            }

            const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
                client: qdrantClient,
                collectionName: QDRANT_OPERATION_COLLECTION_NAME,
            });

            await vectorStore.addDocuments(documents);
            console.log(`[Operation Ingest] ✅ ${documents.length} documentos ingeridos com sucesso!`);

        } catch (error) {
            console.error("[Operation Ingest] Erro ao ingerir dados:", error);
            throw error;
        }
    },
    { name: "Ingest Operation Data", run_type: "tool" }
);
