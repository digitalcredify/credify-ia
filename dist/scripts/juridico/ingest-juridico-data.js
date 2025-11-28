"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestJuridicoData = void 0;
const uuid_1 = require("uuid");
const documents_1 = require("@langchain/core/documents");
const qdrant_1 = require("@langchain/qdrant");
const config_1 = require("../../config");
const traceable_1 = require("langsmith/traceable");
const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection';
exports.ingestJuridicoData = (0, traceable_1.traceable)(function ingestJuridicoData(fullJson, document, name) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        console.log("⚖️ [Juridico Ingest] Iniciando ingestão...");
        const sessionId = (0, uuid_1.v4)();
        const exists = yield (0, config_1.collectionExists)(QDRANT_JURIDICO_COLLECTION_NAME);
        if (!exists) {
            yield (0, config_1.createCollecion)(QDRANT_JURIDICO_COLLECTION_NAME);
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.sessionId",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.document",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.name",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.status",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.grau",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.classe",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.dataDistribuicao",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.area",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.tribunal",
                field_schema: "keyword"
            });
            yield config_1.qdrantClient.createPayloadIndex(QDRANT_JURIDICO_COLLECTION_NAME, {
                field_name: "metadata.uf",
                field_schema: "keyword"
            });
        }
        else {
            try {
                const searchResult = yield config_1.qdrantClient.count(QDRANT_JURIDICO_COLLECTION_NAME, {
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
                    yield config_1.qdrantClient.delete(QDRANT_JURIDICO_COLLECTION_NAME, {
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
                }
                else {
                    console.log(`[Juridico Ingest] ⏩ Nenhum dado antigo para limpar. Prosseguindo...`);
                }
            }
            catch (error) {
                console.error(`[Juridico Ingest] ⚠️ Erro ao tentar limpar dados antigos:`, error);
            }
        }
        const dadosCadastrais = ((_b = (_a = fullJson === null || fullJson === void 0 ? void 0 : fullJson.RESPOSTA) === null || _a === void 0 ? void 0 : _a.DADOSCADASTRAIS) === null || _b === void 0 ? void 0 : _b[0]) || {};
        const rawData = ((_c = fullJson === null || fullJson === void 0 ? void 0 : fullJson.RESPOSTA) === null || _c === void 0 ? void 0 : _c.DATA) || {};
        const processes = Object.keys(rawData)
            .filter(key => key.startsWith('REGISTRO'))
            .map(key => rawData[key]);
        if (processes.length === 0) {
            console.warn("⚠️ [Juridico Ingest] Nenhum processo encontrado.");
            return { sessionId, count: 0 };
        }
        const registroObjectToArray = (obj) => {
            if (!obj || typeof obj !== 'object')
                return [];
            return Object.keys(obj)
                .filter(key => key.startsWith('REGISTRO'))
                .sort((a, b) => {
                const numA = parseInt(a.replace('REGISTRO', ''));
                const numB = parseInt(b.replace('REGISTRO', ''));
                return numA - numB;
            })
                .map(key => obj[key]);
        };
        const getMainParties = (partesObj) => {
            const partesArray = registroObjectToArray(partesObj);
            if (partesArray.length === 0)
                return "N/A";
            return partesArray
                .map((p, index) => {
                const tipo = p.TIPO || "N/A";
                const nome = p.NOME || "N/A";
                const polo = p.POLO || "N/A";
                const documento = p.CPF ||
                    p.CPFCNPJ ||
                    p.CNPJ ||
                    p.DOCUMENTO ||
                    "N/A";
                const advogadosArray = registroObjectToArray(p.ADVOGADOS);
                const advogados = advogadosArray.length > 0
                    ? advogadosArray
                        .map((a) => a.NOME || "N/A")
                        .join(", ")
                    : "N/A";
                return (`${index + 1}. ${tipo} - ${nome}\n` +
                    `   - Polo: ${polo}\n` +
                    `   - CPF/CNPJ: ${documento}\n` +
                    `   - Advogados: ${advogados}`);
            })
                .join("\n\n");
        };
        const getLastDecision = (julgamentosObj) => {
            const julgamentosArray = registroObjectToArray(julgamentosObj);
            if (julgamentosArray.length === 0)
                return 'Sem decisões registradas';
            const lastJulgamento = julgamentosArray[julgamentosArray.length - 1];
            return `${lastJulgamento.TIPOJULGAMENTO || 'N/A'} (${lastJulgamento.DATAJULGAMENTO || 'N/A'})`;
        };
        const getAllDecisions = (julgamentosObj) => {
            try {
                if (!julgamentosObj || typeof julgamentosObj !== "object") {
                    return "Sem decisões registradas";
                }
                const julgamentosArray = registroObjectToArray(julgamentosObj);
                if (julgamentosArray.length === 0) {
                    return "Sem decisões registradas";
                }
                return julgamentosArray
                    .map((j, index) => {
                    const tipo = j.TIPOJULGAMENTO || "N/A";
                    const data = j.DATAJULGAMENTO || "N/A";
                    const isLast = index === julgamentosArray.length - 1;
                    return `${index + 1}. ${tipo} - ${data}${isLast ? " (última decisão)" : ""}`;
                })
                    .join("\n");
            }
            catch (error) {
                console.error("Erro ao processar decisões:", error);
                return "Erro ao processar decisões";
            }
        };
        const documents = processes.map((proc) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const pageContent = `
                    DADOS DO ALVO:
                    - Nome: ${name}
                    - Documento: ${document}

                    DETALHES DO PROCESSO:
                        - Número do CNJ: ${proc.NUMEROPROCESSOUNICO || "N/A"} 
                        - Grau do Processo: ${proc.GRAUPROCESSO || "N/A"}
                        - Área: ${proc.AREA || "N/A"}
                        - Tribunal: ${proc.TRIBUNAL || "N/A"} 
                        - UF do Tribunal: ${proc.UF || "N/A"}
                        - Classe Processual: ${((_a = proc.CLASSEPROCESSUAL) === null || _a === void 0 ? void 0 : _a.NOME) || "N/A"}
                        - Data de Distribuição(Data de nascimento do processo): ${proc.DATADISTRIBUICAO || "N/A"}
                        - Valor da Causa: R$ ${((_b = proc.VALORCAUSA) === null || _b === void 0 ? void 0 : _b.VALOR) || "0"}
                        - Status: ${((_c = proc.STATUSPREDICTUS) === null || _c === void 0 ? void 0 : _c.STATUSPROCESSO) || "N/A"}

                        PARTES PRINCIPAIS:
                        ${getMainParties(proc.PARTES)}

                        DECISÕES DE JULGAMENTOS:
                        ${getAllDecisions((_d = proc.STATUSPREDICTUS) === null || _d === void 0 ? void 0 : _d.JULGAMENTOS)}
                `.trim();
            const partesArray = registroObjectToArray(proc.PARTES);
            const julgamentosArray = registroObjectToArray((_e = proc.STATUSPREDICTUS) === null || _e === void 0 ? void 0 : _e.JULGAMENTOS);
            return new documents_1.Document({
                pageContent: pageContent,
                metadata: {
                    sessionId: sessionId,
                    name: name,
                    document: document,
                    processNumber: proc.NUMEROPROCESSOUNICO,
                    area: proc.AREA,
                    value: parseFloat(((_f = proc.VALORCAUSA) === null || _f === void 0 ? void 0 : _f.VALOR) || "0"),
                    source: "api_juridica",
                    partesCount: partesArray.length,
                    julgamentosCount: julgamentosArray.length,
                    tribunal: proc.TRIBUNAL,
                    uf: proc.UF,
                    status: ((_g = proc.STATUSPREDICTUS) === null || _g === void 0 ? void 0 : _g.STATUSPROCESSO) || "N/A",
                    grau: proc.GRAUPROCESSO || "N/A",
                    classe: ((_h = proc.CLASSEPROCESSUAL) === null || _h === void 0 ? void 0 : _h.NOME) || "N/A",
                    dataDistribuicao: proc.DATADISTRIBUICAO || "N/A"
                }
            });
        });
        console.log(`[Juridico Ingest] Inserindo ${documents.length} documentos vinculados a ${name}...`);
        const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
            client: config_1.qdrantClient,
            collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
        });
        let maior = null;
        documents.forEach((doc, index) => {
            var _a;
            const texto = doc.pageContent || "";
            const tamanho = texto.length;
            if (!maior || tamanho > maior.tamanho) {
                maior = {
                    index,
                    tamanho,
                    processNumber: ((_a = doc.metadata) === null || _a === void 0 ? void 0 : _a.processNumber) || "N/A",
                    pageContent: texto,
                    preview: texto.substring(0, 200)
                };
            }
        });
        yield vectorStore.addDocuments(documents);
        console.log(`[Juridico Ingest] ✅ Sucesso! SessionID: ${sessionId}`);
        console.log(`[Juridico Ingest] ✅ Documentos ingeridos com metadados completos para filtros dinâmicos`);
        return {
            sessionId: sessionId,
            count: documents.length
        };
    });
}, { name: "Ingestão de dados - JURIDICO", run_type: "tool" });
