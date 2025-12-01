import { v4 as uuidv4 } from 'uuid';
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";
import { qdrantClient, openAiEmbbeding, collectionExists, createCollecion } from "../../config";
import { traceable } from "langsmith/traceable";

const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection'

export const ingestJuridicoData = traceable(
    async function ingestJuridicoData(fullJson: any, document: string, name: string, existingSessionId?: string, isDetailed?: boolean, processId?: string) {
        console.log("⚖️ [Juridico Ingest] Iniciando ingestão...");

        const sessionId = existingSessionId || uuidv4();
        console.log(`📌 [Juridico Ingest] SessionID: ${sessionId} ${existingSessionId ? '(reutilizado)' : '(novo)'}`);


        const exists = await collectionExists(QDRANT_JURIDICO_COLLECTION_NAME);

        if (!exists) {
            await createCollecion(QDRANT_JURIDICO_COLLECTION_NAME);

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.sessionId",
                field_schema: "keyword"
            });
            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.processId",
                field_schema: "keyword"
            });
            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.document",
                field_schema: "keyword"
            });
            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.name",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.status",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.grau",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.classe",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.dataDistribuicao",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.area",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.tribunal",
                field_schema: "keyword"
            });

            await qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.uf",
                field_schema: "keyword"
            });

        } else {

            try {
                const searchResult = await qdrantClient.count(QDRANT_JURIDICO_COLLECTION_NAME, {
                    filter: {
                        must: [
                            {
                                key: "metadata.document",
                                match: {
                                    value: document
                                }
                            }
                        ]
                    }
                });

                if (searchResult.count > 0) {
                    console.log(`[Juridico Ingest] 🧹 Deletando ${searchResult.count} registros antigos...`);

                    await qdrantClient.delete(QDRANT_JURIDICO_COLLECTION_NAME, {
                        filter: {
                            must: [
                                {
                                    key: "metadata.document",
                                    match: {
                                        value: document
                                    }
                                }
                            ]
                        },
                        wait: true
                    });

                    console.log(`[Juridico Ingest] ✅ Limpeza concluída com sucesso.`);
                } else {
                    console.log(`[Juridico Ingest] ⏩ Nenhum dado antigo para limpar. Prosseguindo...`);
                }

            } catch (error) {
                console.error(`[Juridico Ingest] ⚠️ Erro ao tentar limpar dados antigos:`, error);
            }
        }

        const dadosCadastrais = fullJson?.RESPOSTA?.DADOSCADASTRAIS?.[0] || {};
        const rawData = fullJson?.RESPOSTA?.DATA || {};

        const processes = Object.keys(rawData)
            .filter(key => key.startsWith('REGISTRO'))
            .map(key => rawData[key]);

        if (processes.length === 0) {
            console.warn("⚠️ [Juridico Ingest] Nenhum processo encontrado.");
            return { sessionId, count: 0 };
        }

        const registroObjectToArray = (obj: any): any[] => {
            if (!obj || typeof obj !== 'object') return [];

            return Object.keys(obj)
                .filter(key => key.startsWith('REGISTRO'))
                .sort((a, b) => {
                    const numA = parseInt(a.replace('REGISTRO', ''));
                    const numB = parseInt(b.replace('REGISTRO', ''));
                    return numA - numB;
                })
                .map(key => obj[key]);
        };

        const getMainParties = (partesObj: any): string => {
            const partesArray = registroObjectToArray(partesObj);
            if (partesArray.length === 0) return "N/A";

            return partesArray
                .map((p: any, index: number) => {
                    const tipo = p.TIPO || "N/A";
                    const nome = p.NOME || "N/A";
                    const polo = p.POLO || "N/A";

                    const documento =
                        p.CPF ||
                        p.CPFCNPJ ||
                        p.CNPJ ||
                        p.DOCUMENTO ||
                        "N/A";

                    const advogadosArray = registroObjectToArray(p.ADVOGADOS);
                    const advogados =
                        advogadosArray.length > 0
                            ? advogadosArray
                                .map((a: any) => a.NOME || "N/A")
                                .join(", ")
                            : "N/A";

                    return (
                        `${index + 1}. ${tipo} - ${nome}\n` +
                        `   - Polo: ${polo}\n` +
                        `   - CPF/CNPJ: ${documento}\n` +
                        `   - Advogados: ${advogados}`
                    );
                })
                .join("\n\n");
        };

        const getLastDecision = (julgamentosObj: any): string => {
            const julgamentosArray = registroObjectToArray(julgamentosObj);

            if (julgamentosArray.length === 0) return 'Sem decisões registradas';

            const lastJulgamento = julgamentosArray[julgamentosArray.length - 1];
            return `${lastJulgamento.TIPOJULGAMENTO || 'N/A'} (${lastJulgamento.DATAJULGAMENTO || 'N/A'})`;
        };

        const getAllDecisions = (julgamentosObj: any): string => {
            try {
                if (!julgamentosObj || typeof julgamentosObj !== "object") {
                    return "Sem decisões registradas";
                }

                const julgamentosArray = registroObjectToArray(julgamentosObj);

                if (julgamentosArray.length === 0) {
                    return "Sem decisões registradas";
                }

                return julgamentosArray
                    .map((j: any, index: number) => {
                        const tipo = j.TIPOJULGAMENTO || "N/A";
                        const data = j.DATAJULGAMENTO || "N/A";

                        const isLast = index === julgamentosArray.length - 1;

                        return `${index + 1}. ${tipo} - ${data}${isLast ? " (última decisão)" : ""}`;
                    })
                    .join("\n");

            } catch (error) {
                console.error("Erro ao processar decisões:", error);
                return "Erro ao processar decisões";
            }
        };

        const documents: Document[] = processes.map((proc: any) => {
            const pageContent = `
                    DADOS DO ALVO:
                    - Nome: ${name}
                    - Documento: ${document}

                    DETALHES DO PROCESSO:
                        - ID do Processo: ${processId || proc._ID || "N/A"} 
                        - Número do CNJ: ${proc.NUMEROPROCESSOUNICO || "N/A"} 
                        - Grau do Processo: ${proc.GRAUPROCESSO || "N/A"}
                        - Área: ${proc.AREA || "N/A"}
                        - Tribunal: ${proc.TRIBUNAL || "N/A"} 
                        - UF do Tribunal: ${proc.UF || "N/A"}
                        - Classe Processual: ${proc.CLASSEPROCESSUAL?.NOME || "N/A"}
                        - Data de Distribuição(Data de nascimento do processo): ${proc.DATADISTRIBUICAO || "N/A"}
                        - Valor da Causa: R$ ${proc.VALORCAUSA?.VALOR || "0"}
                        - Status: ${proc.STATUSPREDICTUS?.STATUSPROCESSO || "N/A"}

                        PARTES PRINCIPAIS:
                        ${getMainParties(proc.PARTES)}

                        DECISÕES DE JULGAMENTOS:
                        ${getAllDecisions(proc.STATUSPREDICTUS?.JULGAMENTOS)}

                        ${isDetailed ? `\n\n⚠️ DADOS DETALHADOS DISPONÍVEIS\n${JSON.stringify(proc, null, 2)}` : ''}
                `.trim();

            const partesArray = registroObjectToArray(proc.PARTES);
            const julgamentosArray = registroObjectToArray(proc.STATUSPREDICTUS?.JULGAMENTOS);

            return new Document({
                pageContent: pageContent,
                metadata: {
                    sessionId: sessionId,
                    processId: processId || proc._ID,
                    name: name,
                    document: document,
                    processNumber: proc.NUMEROPROCESSOUNICO,
                    area: proc.AREA,
                    value: parseFloat(proc.VALORCAUSA?.VALOR || "0"),

                    source: "api_juridica",
                    isDetailed: isDetailed || false,
                    partesCount: partesArray.length,
                    julgamentosCount: julgamentosArray.length,
                    tribunal: proc.TRIBUNAL,
                    uf: proc.UF,

                    status: proc.STATUSPREDICTUS?.STATUSPROCESSO || "N/A",
                    grau: proc.GRAUPROCESSO || "N/A",
                    classe: proc.CLASSEPROCESSUAL?.NOME || "N/A",
                    dataDistribuicao: proc.DATADISTRIBUICAO || "N/A"
                }
            });
        });

        console.log(`[Juridico Ingest] Inserindo ${documents.length} documentos vinculados a ${name}...`);

        const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
            client: qdrantClient,
            collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
        });

        let maior: any = null;

        documents.forEach((doc, index) => {
            const texto = doc.pageContent || "";
            const tamanho = texto.length;

            if (!maior || tamanho > maior.tamanho) {
                maior = {
                    index,
                    tamanho,
                    processNumber: doc.metadata?.processNumber || "N/A",
                    pageContent: texto,
                    preview: texto.substring(0, 200)
                };
            }
        });

        await vectorStore.addDocuments(documents);

        console.log(`[Juridico Ingest] ✅ Sucesso! SessionID: ${sessionId}`);

        return {
            sessionId: sessionId,
            count: documents.length
        };
    },
    { name: "Ingestão de dados - JURIDICO", run_type: "tool" }
);
