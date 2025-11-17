"use strict";
/**
 * @fileoverview
 * este arquivo é responsável pela capacidade de busca do sistema. Oq ele faz?
 * 1- Transforma os dados provenientes de um JSON em embeddings (vetores semânticos)
 * 2- Armazena esses embeddings no MongoDB Atlas.
 */
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
exports.ingestData = void 0;
exports.checkIfDataExists = checkIfDataExists;
const config_1 = require("../config");
const traceable_1 = require("langsmith/traceable");
const documents_1 = require("@langchain/core/documents");
const qdrant_1 = require("@langchain/qdrant");
function deleteExistingDataForMonth(month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Ingest] 🗑️ Verificando e deletando dados existentes para o mês: ${month}`);
        try {
            const existingPoints = yield config_1.qdrantClient.scroll(config_1.QDRANT_COLLECTION_NAME, {
                filter: {
                    must: [
                        { key: "month", match: { value: month } }
                    ]
                },
                limit: 10000,
            });
            if (existingPoints.points.length > 0) {
                const idsToDelete = existingPoints.points.map(point => point.id);
                console.log(`[Qdrant Ingest] Deletando ${idsToDelete.length} pontos existentes...`);
                yield config_1.qdrantClient.delete(config_1.QDRANT_COLLECTION_NAME, { points: idsToDelete });
                console.log(`[Qdrant Ingest] ✅ Pontos antigos deletados.`);
            }
        }
        catch (error) {
            if (error.message.includes("Not found")) {
                console.log("[Qdrant Ingest] Coleção não encontrada, será criada na primeira ingestão.");
                return;
            }
            console.error("[Qdrant Ingest] ❌ Erro ao deletar dados antigos:", error);
            throw error;
        }
    });
}
exports.ingestData = (0, traceable_1.traceable)(function ingestData(jsonData, month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Ingest] Iniciando ingestão de dados para o mês: ${month}`);
        try {
            const documents = jsonData.data;
            if (!Array.isArray(documents)) {
                throw new Error("O JSON recebido não contém um array 'data'.");
            }
            console.log(`[Qdrant Ingest] Documentos JSON encontrados: ${documents.length}`);
            // deleta dados existente para o mês
            yield deleteExistingDataForMonth(month);
            // formatando o json para depois "embedar"
            const langchainDocs = documents.map(doc => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return new documents_1.Document({
                    pageContent: `
                    Empresa: ${(_b = (_a = doc.company) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'N/A'}
                    Plano: ${(_d = (_c = doc.plan) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'N/A'}
                    Organização: ${(_f = (_e = doc.organization) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : 'N/A'}
                    Representante: ${(_h = (_g = doc.representative) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : 'N/A'}
                `,
                    metadata: Object.assign(Object.assign({}, doc), { month: month })
                });
            });
            // aplica embeddings nos langChain Documents armazena na collection usando QdrantVectorStore
            yield qdrant_1.QdrantVectorStore.fromDocuments(langchainDocs, config_1.openAiEmbbeding, {
                client: config_1.qdrantClient,
                collectionName: config_1.QDRANT_COLLECTION_NAME,
            });
            console.log(`[Qdrant Ingest] ✅ Documentos inseridos para ${month}: ${langchainDocs.length}`);
            return langchainDocs.length;
        }
        catch (error) {
            console.error("[Qdrant Ingest] ❌ Erro de ingestão:", error);
            throw error;
        }
    });
}, { name: "Ingestão de dados - Qdrant", run_type: "tool" });
function checkIfDataExists(month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Check] Verificando se dados para o mês ${month} já existem...`);
        try {
            const result = yield config_1.qdrantClient.scroll(config_1.QDRANT_COLLECTION_NAME, {
                filter: {
                    must: [
                        { key: "month", match: { value: month } }
                    ]
                },
                limit: 1,
            });
            const exists = result.points.length > 0;
            console.log(`[Qdrant Check] Dados para ${month} ${exists ? 'encontrados.' : 'não encontrados.'}`);
            return exists;
        }
        catch (error) {
            if (error.message && error.message.includes("Not found")) {
                console.log("[Qdrant Check] Coleção não encontrada, portanto, dados não existem.");
                return false;
            }
            console.error("[Qdrant Check] ❌ Erro ao verificar dados:", error);
            return false;
        }
    });
}
