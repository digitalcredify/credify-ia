import { v4 as uuidv4 } from 'uuid';
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";
import { qdrantClient, openAiEmbbeding, collectionExists } from "../../config";
import { traceable } from "langsmith/traceable";

const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection'


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


const formatAssuntos = (assuntosObj: any): string => {
    const assuntosArray = registroObjectToArray(assuntosObj);
    if (assuntosArray.length === 0) return "Sem assuntos registrados";

    return assuntosArray
        .map((assunto: any, index: number) => {
            const titulo = assunto.TITULO || "N/A";
            const codigoCNJ = assunto.CODIGOCNJ || "N/A";
            return `${index + 1}. ${titulo} (CNJ: ${codigoCNJ})`;
        })
        .join("\n");
};

/**
 * Formata as partes do processo com advogados
 */
const formatPartes = (partesObj: any): string => {
    const partesArray = registroObjectToArray(partesObj);
    if (partesArray.length === 0) return "Sem partes registradas";

    return partesArray
        .map((parte: any, index: number) => {
            const tipo = parte.TIPO || "N/A";
            const nome = parte.NOME || "N/A";
            const polo = parte.POLO || "N/A";
            const documento = parte.CPF || parte.CNPJ || "N/A";

            const advogadosArray = registroObjectToArray(parte.ADVOGADOS);
            const advogados = advogadosArray.length > 0
                ? advogadosArray
                    .map((adv: any) => {
                        const nomeAdv = adv.NOME || "N/A";
                        const oab = adv.OAB
                            ? `OAB ${adv.OAB.UF}/${adv.OAB.NUMERO}`
                            : "OAB não informada";
                        return `${nomeAdv} (${oab})`;
                    })
                    .join(", ")
                : "Sem advogados registrados";

            return (
                `${index + 1}. ${tipo} - ${nome}\n` +
                `   - Polo: ${polo}\n` +
                `   - Documento: ${documento}\n` +
                `   - Advogados: ${advogados}`
            );
        })
        .join("\n\n");
};


const formatMovimentos = (movimentosObj: any): string => {
    const movimentosArray = registroObjectToArray(movimentosObj);
    if (movimentosArray.length === 0) return "Sem movimentos registrados";

    const ultimosMovimentos = movimentosArray.slice(0, 10);

    return ultimosMovimentos
        .map((mov: any, index: number) => {
            const nomeOriginalArray = registroObjectToArray(mov.NOMEORIGINAL);
            const descricao = nomeOriginalArray.length > 0
                ? nomeOriginalArray[0]
                : mov.DESCRICAO || "N/A";
            const data = mov.DATA || "N/A";

            return `${index + 1}. [${data}] ${descricao}`;
        })
        .join("\n");
};


export const ingestJuridicoDetailedData = traceable(
    async function ingestJuridicoDetailedData(
        fullJson: any,
        document: string,
        name: string,
        existingSessionId: string,
        processId: string
    ) {
        console.log("⚖️ [Juridico Detailed Ingest] Iniciando ingestão de dados detalhados...");
        console.log(`📌 [Juridico Detailed Ingest] SessionID: ${existingSessionId} (reutilizado)`);
        console.log(`🔖 [Juridico Detailed Ingest] ProcessID: ${processId}`);

        try {
            const exists = await collectionExists(QDRANT_JURIDICO_COLLECTION_NAME);

            if (exists) {
                console.log(`[Juridico Detailed Ingest] 🔍 Buscando e deletando registros antigos para o processo ${processId}...`);

                const searchResult = await qdrantClient.count(QDRANT_JURIDICO_COLLECTION_NAME, {
                    filter: {
                        must: [
                            {
                                key: "metadata.processId",
                                match: {
                                    value: processId
                                }
                            }
                        ]
                    }
                });

                const count = searchResult.count;

                if (count > 0) {
                    console.log(`[Juridico Detailed Ingest] 🧹 Deletando ${count} registro(s) antigo(s)...`);

                    await qdrantClient.delete(QDRANT_JURIDICO_COLLECTION_NAME, {
                        filter: { 
                            must: [
                                {
                                    key: "metadata.processId",
                                    match: {
                                        value: processId
                                    }
                                }
                            ]
                        },
                        wait: true
                    });

                    console.log(`[Juridico Detailed Ingest] ✅ Limpeza concluída com sucesso.`);
                } else {
                    console.log(`[Juridico Detailed Ingest] ℹ️ Nenhum registro antigo encontrado.`);
                }
            }
        } catch (error: any) {
            console.warn(`[Juridico Detailed Ingest] ⚠️ Erro não fatal ao tentar limpar dados antigos:`, error.message);
        }

        const processData = fullJson?.RESPOSTA?.DATA;

        if (!processData) {
            console.warn("⚠️ [Juridico Detailed Ingest] Nenhum dado de processo encontrado.");
            return { sessionId: existingSessionId, count: 0 };
        }

        const pageContent = `
🔖 PROCESSO ID: ${processId}
📋 TIPO: CONSULTA DETALHADA (JURÍDICO COMPLETO)

═══════════════════════════════════════════════════════════════
IDENTIFICAÇÃO DO PROCESSO
═══════════════════════════════════════════════════════════════
- Número CNJ: ${processData.NUMEROPROCESSOUNICO || "N/A"}
- URL do Processo: ${processData.URLPROCESSO || "N/A"}
- Grau: ${processData.GRAUPROCESSO || "N/A"}
- Sistema: ${processData.SISTEMA || "N/A"}
- Segmento: ${processData.SEGMENTO || "N/A"}

═══════════════════════════════════════════════════════════════
LOCALIZAÇÃO E COMPETÊNCIA
═══════════════════════════════════════════════════════════════
- Tribunal: ${processData.TRIBUNAL || "N/A"}
- UF: ${processData.UF || "N/A"}
- Órgão Julgador: ${processData.ORGAOJULGADOR || "N/A"}
- Unidade de Origem: ${processData.UNIDADEORIGEM || "N/A"}
- Juiz: ${processData.JUIZ || "N/A"}

═══════════════════════════════════════════════════════════════
CLASSIFICAÇÃO
═══════════════════════════════════════════════════════════════
- Área: ${processData.AREA || "N/A"}
- Classe Processual: ${processData.CLASSEPROCESSUAL?.NOME || "N/A"} (CNJ: ${processData.CLASSEPROCESSUAL?.CODIGOCNJ || "N/A"})

ASSUNTOS:
${formatAssuntos(processData.ASSUNTOSCNJ)}

═══════════════════════════════════════════════════════════════
DATAS IMPORTANTES
═══════════════════════════════════════════════════════════════
- Data de Distribuição: ${processData.DATADISTRIBUICAO || "N/A"}
- Data de Autuação: ${processData.DATAAUTUACAO || "N/A"}
- Data de Processamento: ${processData.DATAPROCESSAMENTO || "N/A"}

═══════════════════════════════════════════════════════════════
VALOR E CARACTERÍSTICAS
═══════════════════════════════════════════════════════════════
- Valor da Causa: ${processData.VALORCAUSA?.MOEDA || "R$"} ${processData.VALORCAUSA?.VALOR || "0"}
- Justiça Gratuita: ${processData.EJUSTICAGRATUITA === "1" ? "Sim" : "Não"}
- Processo Digital: ${processData.EPROCESSODIGITAL === "1" ? "Sim" : "Não"}
- Status: ${processData.STATUSPREDICTUS?.STATUSPROCESSO || "N/A"}

═══════════════════════════════════════════════════════════════
PARTES ENVOLVIDAS
═══════════════════════════════════════════════════════════════
${formatPartes(processData.PARTES)}

═══════════════════════════════════════════════════════════════
MOVIMENTOS PROCESSUAIS (ÚLTIMOS 10)
═══════════════════════════════════════════════════════════════
${formatMovimentos(processData.MOVIMENTOS)}

═══════════════════════════════════════════════════════════════
DADOS DO ALVO DA CONSULTA
═══════════════════════════════════════════════════════════════
- Nome: ${name}
- Documento: ${document}
        `.trim();

        const partesArray = registroObjectToArray(processData.PARTES);
        const autores = partesArray.filter((p: any) => p.POLO === "ATIVO").map((p: any) => p.NOME).join(", ");
        const reus = partesArray.filter((p: any) => p.POLO === "PASSIVO").map((p: any) => p.NOME).join(", ");

        const detailedDocument = new Document({
            pageContent: pageContent,
            metadata: {
                sessionId: existingSessionId,
                processId: processId,
                name: name,
                document: document,
                processNumber: processData.NUMEROPROCESSOUNICO,
                area: processData.AREA,
                tribunal: processData.TRIBUNAL,
                uf: processData.UF,
                value: parseFloat(processData.VALORCAUSA?.VALOR || "0"),
                status: processData.STATUSPREDICTUS?.STATUSPROCESSO || "N/A",
                grau: processData.GRAUPROCESSO || "N/A",
                classe: processData.CLASSEPROCESSUAL?.NOME || "N/A",
                dataDistribuicao: processData.DATADISTRIBUICAO || "N/A",
                juiz: processData.JUIZ || "N/A",
                orgaoJulgador: processData.ORGAOJULGADOR || "N/A",
                autores: autores || "N/A",
                reus: reus || "N/A",
                source: "api_juridica_detailed",
                isDetailed: true,
                partesCount: partesArray.length,
                movimentosCount: registroObjectToArray(processData.MOVIMENTOS).length,
                assuntosCount: registroObjectToArray(processData.ASSUNTOSCNJ).length
            }
        });

        console.log(`[Juridico Detailed Ingest] Inserindo 1 documento detalhado para o processo ${processId}...`);

        const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
            client: qdrantClient,
            collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
        });

        await vectorStore.addDocuments([detailedDocument]);

        console.log(`[Juridico Detailed Ingest] ✅ Sucesso! Dados detalhados adicionados ao SessionID: ${existingSessionId}`);

        return {
            sessionId: existingSessionId,
            count: 1,
            processId: processId
        };
    },
    { name: "Ingestão de dados DETALHADOS - JURIDICO", run_type: "tool" }
);
