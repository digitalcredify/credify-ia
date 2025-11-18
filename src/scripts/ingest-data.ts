/**
 * @fileoverview 
 * este arquivo é responsável pela capacidade de busca do sistema. Oq ele faz?
 * 1- Transforma os dados provenientes de um JSON em embeddings (vetores semânticos)
 * 2- Armazena esses embeddings no Qdrant Cloud.
 * 3- Converte valores de centavos (com 4 casas decimais) para reais
 */

import { qdrantClient, openAiEmbbeding, QDRANT_COLLECTION_NAME } from "../config";
import { traceable } from "langsmith/traceable";
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";


function convertCentsToReais(valueInCents: number | undefined): number {
    if (!valueInCents) return 0;
    return valueInCents / 10000;
}


function processDocumentValues(doc: any): any {
    const processed = { ...doc };
    
    
    if (processed.totals) {
        processed.totals = {
            totalConsumptions: processed.totals.totalConsumptions || 0,
            totalValueInReais: convertCentsToReais(processed.totals.totalValueInCents),
            totalValueWithDiscountInReais: convertCentsToReais(processed.totals.totalValueWithDiscountInCents),
            totalSourcesCostInReais: convertCentsToReais(processed.totals.totalSourcesCostInCents),
            
            totalValueInCents: processed.totals.totalValueInCents || 0,
            totalValueWithDiscountInCents: processed.totals.totalValueWithDiscountInCents || 0,
            totalSourcesCostInCents: processed.totals.totalSourcesCostInCents || 0
        };
    }
    
    
    if (processed.plan && processed.plan.minimumBillingValueInCents) {
        processed.plan.minimumBillingValueInReais = convertCentsToReais(processed.plan.minimumBillingValueInCents);
    }
    
    
    if (processed.users && Array.isArray(processed.users)) {
        processed.users = processed.users.map((user: any) => {
            if (user.totals) {
                return {
                    ...user,
                    totals: {
                        totalConsumptions: user.totals.totalConsumptions || 0,
                        totalValueInReais: convertCentsToReais(user.totals.totalValueInCents),
                        totalValueWithDiscountInReais: convertCentsToReais(user.totals.totalValueWithDiscountInCents),
                        totalSourcesCostInReais: convertCentsToReais(user.totals.totalSourcesCostInCents),
                        totalValueInCents: user.totals.totalValueInCents || 0,
                        totalValueWithDiscountInCents: user.totals.totalValueWithDiscountInCents || 0,
                        totalSourcesCostInCents: user.totals.totalSourcesCostInCents || 0
                    }
                };
            }
            return user;
        });
    }
    
    return processed;
}


async function ensureCollectionExists() {
    try {
        const collectionInfo = await qdrantClient.getCollection(QDRANT_COLLECTION_NAME);
        console.log(`[Qdrant] Coleção '${QDRANT_COLLECTION_NAME}' já existe.`);
        return;
    } catch (error: any) {
        if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
            console.log(`[Qdrant] Coleção não encontrada. Criando '${QDRANT_COLLECTION_NAME}'...`);
            
            try {
                await qdrantClient.createCollection(QDRANT_COLLECTION_NAME, {
                    vectors: {
                        size: 1536,
                        distance: "Cosine"
                    }
                });
                console.log(`[Qdrant] ✅ Coleção criada!`);
                
                await qdrantClient.createPayloadIndex(QDRANT_COLLECTION_NAME, {
                    field_name: "metadata.month",
                    field_schema: "keyword"
                });
                console.log(`[Qdrant] ✅ Índice criado para metadata.month!`);
                
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


async function deleteExistingDataForMonth(month: string) {
    console.log(`[Qdrant Ingest] 🗑️ Verificando dados existentes para o mês: ${month}`);

    try {
        const existingPoints = await qdrantClient.scroll(QDRANT_COLLECTION_NAME, {
            filter: {
                must: [
                    { key: "metadata.month", match: { value: month } }
                ]
            },
            limit: 10000,
        });

        if (existingPoints.points.length > 0) {
            const idsToDelete = existingPoints.points.map(point => point.id);
            console.log(`[Qdrant Ingest] Deletando ${idsToDelete.length} pontos existentes...`);

            await qdrantClient.delete(QDRANT_COLLECTION_NAME, {
                points: idsToDelete
            });

            console.log(`[Qdrant Ingest] ✅ ${idsToDelete.length} pontos deletados.`);
        } else {
            console.log(`[Qdrant Ingest] Nenhum ponto encontrado para deletar.`);
        }

    } catch (error: any) {
        console.error("[Qdrant Ingest] ❌ Erro ao deletar dados antigos:", error);
        throw error;
    }
}


export const ingestData = traceable(
    async function ingestData(jsonData: any, month: string) {
        console.log(`[Qdrant Ingest] 🚀 Iniciando ingestão de dados para o mês: ${month}`);

        try {
            const documents = jsonData.data;
            if (!Array.isArray(documents)) {
                throw new Error("O JSON recebido não contém um array 'data'.");
            }
            console.log(`[Qdrant Ingest] Documentos JSON encontrados: ${documents.length}`);

            await ensureCollectionExists();
            await deleteExistingDataForMonth(month);

            const langchainDocs = documents.map(doc => {
                
                const processedDoc = processDocumentValues(doc);
                
                
                const totalValue = processedDoc.totals?.totalValueInReais || 0;
                const totalValueWithDiscount = processedDoc.totals?.totalValueWithDiscountInReais || 0;
                const totalSourcesCost = processedDoc.totals?.totalSourcesCostInReais || 0;
                const lucro = totalValueWithDiscount - totalSourcesCost;
                
                return new Document({
                    pageContent: `
Empresa: ${processedDoc.company?.name ?? 'N/A'}
Tipo de Empresa: ${processedDoc.company?.type ?? 'N/A'}
CNPJ: ${processedDoc.company?.document ?? 'N/A'}

Plano: ${processedDoc.plan?.name ?? 'N/A'}
Organização: ${processedDoc.organization?.name ?? 'N/A'}
Representante: ${processedDoc.representative?.name ?? 'N/A'}
Revenue: ${processedDoc.revenue?.name ?? 'N/A'}

Dados Financeiros (valores em Reais):
        - Total de Consumos: ${processedDoc.totals?.totalConsumptions ?? 0}
        - Valor Total: R$ ${totalValue.toFixed(4)}
        - Valor com Desconto: R$ ${totalValueWithDiscount.toFixed(4)}
        - Custo de Fontes: R$ ${totalSourcesCost.toFixed(4)}
        - Lucro: R$ ${lucro.toFixed(4)}

Período: ${month}
                    `.trim(),
                    metadata: {
                        ...processedDoc,
                        month: month
                    }
                });
            });

            console.log(`[Qdrant Ingest] Gerando embeddings e inserindo ${langchainDocs.length} documentos...`);

            await QdrantVectorStore.fromDocuments(
                langchainDocs,
                openAiEmbbeding,
                {
                    client: qdrantClient,
                    collectionName: QDRANT_COLLECTION_NAME,
                }
            );

            console.log(`[Qdrant Ingest] ✅ Ingestão concluída! ${langchainDocs.length} documentos inseridos.`);
            console.log(`[Qdrant Ingest] 💰 Valores convertidos de centavos para reais (÷ 10.000)`);
            return langchainDocs.length;

        } catch (error) {
            console.error("[Qdrant Ingest] ❌ Erro de ingestão:", error);
            throw error;
        }
    },
    { name: "Ingestão de dados - novo", run_type: "tool" }
)

export async function checkIfDataExists(month: string): Promise<boolean> {
    console.log(`[Qdrant Check] Verificando se dados para o mês ${month} já existem...`);

    try {
        await ensureCollectionExists();

        const result = await qdrantClient.scroll(QDRANT_COLLECTION_NAME, {
            filter: {
                must: [
                    { key: "metadata.month", match: { value: month } }
                ]
            },
            limit: 1,
        });

        const exists = result.points.length > 0;
        console.log(`[Qdrant Check] Dados para ${month}: ${exists ? '✅ encontrados' : '❌ não encontrados'}`);
        return exists;

    } catch (error: any) {
        console.error("[Qdrant Check] ❌ Erro ao verificar dados:", error);
        return false;
    }
}
