"use strict";
/**
 * @fileoverview
 * este arquivo é responsável pela capacidade de busca do sistema. Oq ele faz?
 * 1- Transforma os dados provenientes de um JSON em embeddings (vetores semânticos)
 * 2- Armazena esses embeddings no Qdrant Cloud.
 * 3- Converte valores de centavos (com 4 casas decimais) para reais
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
function convertCentsToReais(valueInCents) {
    if (!valueInCents)
        return 0;
    return valueInCents / 10000;
}
function processDocumentValues(doc) {
    const processed = Object.assign({}, doc);
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
        processed.users = processed.users.map((user) => {
            if (user.totals) {
                return Object.assign(Object.assign({}, user), { totals: {
                        totalConsumptions: user.totals.totalConsumptions || 0,
                        totalValueInReais: convertCentsToReais(user.totals.totalValueInCents),
                        totalValueWithDiscountInReais: convertCentsToReais(user.totals.totalValueWithDiscountInCents),
                        totalSourcesCostInReais: convertCentsToReais(user.totals.totalSourcesCostInCents),
                        totalValueInCents: user.totals.totalValueInCents || 0,
                        totalValueWithDiscountInCents: user.totals.totalValueWithDiscountInCents || 0,
                        totalSourcesCostInCents: user.totals.totalSourcesCostInCents || 0
                    } });
            }
            return user;
        });
    }
    return processed;
}
function ensureCollectionExists() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const collectionInfo = yield config_1.qdrantClient.getCollection(config_1.QDRANT_COLLECTION_NAME);
            console.log(`[Qdrant] Coleção '${config_1.QDRANT_COLLECTION_NAME}' já existe.`);
            return;
        }
        catch (error) {
            if (error.status === 404 || (error.message && error.message.includes("Not found"))) {
                console.log(`[Qdrant] Coleção não encontrada. Criando '${config_1.QDRANT_COLLECTION_NAME}'...`);
                try {
                    yield config_1.qdrantClient.createCollection(config_1.QDRANT_COLLECTION_NAME, {
                        vectors: {
                            size: 1536,
                            distance: "Cosine"
                        }
                    });
                    console.log(`[Qdrant] ✅ Coleção criada!`);
                    yield config_1.qdrantClient.createPayloadIndex(config_1.QDRANT_COLLECTION_NAME, {
                        field_name: "metadata.month",
                        field_schema: "keyword"
                    });
                    console.log(`[Qdrant] ✅ Índice criado para metadata.month!`);
                }
                catch (createError) {
                    if (createError.message && createError.message.includes("already exists")) {
                        console.log(`[Qdrant] Coleção já foi criada por outra requisição.`);
                        return;
                    }
                    throw createError;
                }
            }
            else {
                throw error;
            }
        }
    });
}
function deleteExistingDataForMonth(month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Ingest] 🗑️ Verificando dados existentes para o mês: ${month}`);
        try {
            const existingPoints = yield config_1.qdrantClient.scroll(config_1.QDRANT_COLLECTION_NAME, {
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
                yield config_1.qdrantClient.delete(config_1.QDRANT_COLLECTION_NAME, {
                    points: idsToDelete
                });
                console.log(`[Qdrant Ingest] ✅ ${idsToDelete.length} pontos deletados.`);
            }
            else {
                console.log(`[Qdrant Ingest] Nenhum ponto encontrado para deletar.`);
            }
        }
        catch (error) {
            console.error("[Qdrant Ingest] ❌ Erro ao deletar dados antigos:", error);
            throw error;
        }
    });
}
exports.ingestData = (0, traceable_1.traceable)(function ingestData(jsonData, month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Ingest] 🚀 Iniciando ingestão de dados para o mês: ${month}`);
        try {
            const documents = jsonData.data;
            if (!Array.isArray(documents)) {
                throw new Error("O JSON recebido não contém um array 'data'.");
            }
            console.log(`[Qdrant Ingest] Documentos JSON encontrados: ${documents.length}`);
            yield ensureCollectionExists();
            yield deleteExistingDataForMonth(month);
            const langchainDocs = documents.map(doc => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                const processedDoc = processDocumentValues(doc);
                const totalValue = ((_a = processedDoc.totals) === null || _a === void 0 ? void 0 : _a.totalValueInReais) || 0;
                const totalValueWithDiscount = ((_b = processedDoc.totals) === null || _b === void 0 ? void 0 : _b.totalValueWithDiscountInReais) || 0;
                const totalSourcesCost = ((_c = processedDoc.totals) === null || _c === void 0 ? void 0 : _c.totalSourcesCostInReais) || 0;
                const lucro = totalValueWithDiscount - totalSourcesCost;
                return new documents_1.Document({
                    pageContent: `
Empresa: ${(_e = (_d = processedDoc.company) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : 'N/A'}
Tipo de Empresa: ${(_g = (_f = processedDoc.company) === null || _f === void 0 ? void 0 : _f.type) !== null && _g !== void 0 ? _g : 'N/A'}
CNPJ: ${(_j = (_h = processedDoc.company) === null || _h === void 0 ? void 0 : _h.document) !== null && _j !== void 0 ? _j : 'N/A'}

Plano: ${(_l = (_k = processedDoc.plan) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : 'N/A'}
Organização: ${(_o = (_m = processedDoc.organization) === null || _m === void 0 ? void 0 : _m.name) !== null && _o !== void 0 ? _o : 'N/A'}
Representante: ${(_q = (_p = processedDoc.representative) === null || _p === void 0 ? void 0 : _p.name) !== null && _q !== void 0 ? _q : 'N/A'}
Revenue: ${(_s = (_r = processedDoc.revenue) === null || _r === void 0 ? void 0 : _r.name) !== null && _s !== void 0 ? _s : 'N/A'}

Dados Financeiros (valores em Reais):
        - Total de Consumos: ${(_u = (_t = processedDoc.totals) === null || _t === void 0 ? void 0 : _t.totalConsumptions) !== null && _u !== void 0 ? _u : 0}
        - Valor Total: R$ ${totalValue.toFixed(4)}
        - Valor com Desconto: R$ ${totalValueWithDiscount.toFixed(4)}
        - Custo de Fontes: R$ ${totalSourcesCost.toFixed(4)}
        - Lucro: R$ ${lucro.toFixed(4)}

Período: ${month}
                    `.trim(),
                    metadata: Object.assign(Object.assign({}, processedDoc), { month: month })
                });
            });
            console.log(`[Qdrant Ingest] Gerando embeddings e inserindo ${langchainDocs.length} documentos...`);
            yield qdrant_1.QdrantVectorStore.fromDocuments(langchainDocs, config_1.openAiEmbbeding, {
                client: config_1.qdrantClient,
                collectionName: config_1.QDRANT_COLLECTION_NAME,
            });
            console.log(`[Qdrant Ingest] ✅ Ingestão concluída! ${langchainDocs.length} documentos inseridos.`);
            console.log(`[Qdrant Ingest] 💰 Valores convertidos de centavos para reais (÷ 10.000)`);
            return langchainDocs.length;
        }
        catch (error) {
            console.error("[Qdrant Ingest] ❌ Erro de ingestão:", error);
            throw error;
        }
    });
}, { name: "Ingestão de dados - novo", run_type: "tool" });
function checkIfDataExists(month) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[Qdrant Check] Verificando se dados para o mês ${month} já existem...`);
        try {
            yield ensureCollectionExists();
            const result = yield config_1.qdrantClient.scroll(config_1.QDRANT_COLLECTION_NAME, {
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
        }
        catch (error) {
            console.error("[Qdrant Check] ❌ Erro ao verificar dados:", error);
            return false;
        }
    });
}
