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
exports.hybridSearchTool = exports.aggregateTool = exports.specificQueryTool = void 0;
exports.calculatorTool = calculatorTool;
const config_1 = require("./config");
const qdrant_1 = require("@langchain/qdrant");
const traceable_1 = require("langsmith/traceable");
const mathjs_1 = require("mathjs");
const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
    client: config_1.qdrantClient,
    collectionName: config_1.QDRANT_COLLECTION_NAME,
});
function createMonthFilter(month) {
    return {
        must: [
            { key: "metadata.month", match: { value: month } }
        ]
    };
}
exports.specificQueryTool = (0, traceable_1.traceable)(function specificQueryTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("🔍 Specific Query Tool (Qdrant):", input);
        try {
            const month = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.month) || input.filters;
            const qdrantFilter = createMonthFilter(month);
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`🔍 Specific Query: ${results.length} documentos encontrados`);
            console.log(`💰 Valores já estão em reais (convertidos no ingest)`);
            return results.map(doc => ({
                document: doc,
                score: null
            }));
        }
        catch (error) {
            console.error("❌ Erro no Specific Query Tool:", error.message);
            return [];
        }
    });
}, { name: "Specific Query Tool (Qdrant)", run_type: "retriever" });
exports.aggregateTool = (0, traceable_1.traceable)(function aggregateTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        console.log("📊 Aggregate Tool (Qdrant):", input);
        try {
            const month = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.month) || input.filters;
            const qdrantFilter = createMonthFilter(month);
            const retriever = vectorStore.asRetriever({
                k: 500,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`📊 Aggregate Tool: ${results.length} documentos recuperados para agregação`);
            const grouped = {};
            for (const doc of results) {
                const data = doc.metadata;
                let groupKey;
                const groupByField = input.groupBy;
                if (groupByField === "representative") {
                    groupKey = ((_b = data.representative) === null || _b === void 0 ? void 0 : _b.name) || "Sem representante";
                }
                else if (groupByField === "company") {
                    groupKey = ((_c = data.company) === null || _c === void 0 ? void 0 : _c.name) || "Sem empresa";
                }
                else if (groupByField === "organization") {
                    groupKey = ((_d = data.organization) === null || _d === void 0 ? void 0 : _d.name) || "Sem organização";
                }
                else if (groupByField === "plan") {
                    groupKey = ((_e = data.plan) === null || _e === void 0 ? void 0 : _e.name) || "Sem plano";
                }
                else if (groupByField === "company_type") {
                    groupKey = ((_f = data.company) === null || _f === void 0 ? void 0 : _f.type) || "Sem tipo";
                }
                else if (groupByField === "revenue") {
                    groupKey = ((_g = data.revenue) === null || _g === void 0 ? void 0 : _g.name) || "Sem revenue";
                }
                else {
                    groupKey = "Grupo Desconhecido";
                }
                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        name: groupKey,
                        totalConsumptions: 0,
                        totalValueInReais: 0,
                        totalValueWithDiscountInReais: 0,
                        totalSourcesCostInReais: 0,
                        lucro: 0,
                        count: 0
                    };
                }
                const valueWithDiscount = ((_h = data.totals) === null || _h === void 0 ? void 0 : _h.totalValueWithDiscountInReais) || 0;
                const sourcesCost = ((_j = data.totals) === null || _j === void 0 ? void 0 : _j.totalSourcesCostInReais) || 0;
                grouped[groupKey].totalConsumptions += ((_k = data.totals) === null || _k === void 0 ? void 0 : _k.totalConsumptions) || 0;
                grouped[groupKey].totalValueInReais += ((_l = data.totals) === null || _l === void 0 ? void 0 : _l.totalValueInReais) || 0;
                grouped[groupKey].totalValueWithDiscountInReais += valueWithDiscount;
                grouped[groupKey].totalSourcesCostInReais += sourcesCost;
                grouped[groupKey].lucro += (valueWithDiscount - sourcesCost);
                grouped[groupKey].count += 1;
            }
            const aggregated = Object.values(grouped).sort((a, b) => b.totalValueWithDiscountInReais - a.totalValueWithDiscountInReais);
            console.log(`📊 Agregado por ${input.groupBy}: ${aggregated.length} grupos`);
            console.log(`💰 Valores já estão em reais (não precisa dividir)`);
            return [{
                    document: {
                        pageContent: JSON.stringify({
                            groupBy: input.groupBy,
                            data: aggregated,
                            note: "Valores já estão em Reais (R$), não em centavos"
                        })
                    },
                    score: 1.0,
                    aggregated: true
                }];
        }
        catch (error) {
            console.error("❌ Erro no Aggregate Tool:", error.message);
            return [{
                    document: {
                        pageContent: JSON.stringify({
                            groupBy: input.groupBy,
                            data: [],
                            error: "Erro ao agregar dados"
                        })
                    },
                    score: 0,
                    aggregated: true
                }];
        }
    });
}, { name: "Aggregate Tool (Qdrant)", run_type: "tool" });
exports.hybridSearchTool = (0, traceable_1.traceable)(function hybridSearchTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("🔀 Hybrid Search Tool (Qdrant):", input);
        try {
            const month = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.month) || input.filters;
            const qdrantFilter = createMonthFilter(month);
            const retriever = vectorStore.asRetriever({
                k: 200,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`🔀 Hybrid Search: ${results.length} documentos encontrados`);
            console.log(`💰 Valores já estão em reais (convertidos no ingest)`);
            return results.map(doc => ({
                document: doc,
                score: null
            }));
        }
        catch (error) {
            console.error("❌ Erro no Hybrid Search Tool:", error.message);
            return [];
        }
    });
}, { name: "Hybrid Search Tool (Qdrant)", run_type: "retriever" });
function calculatorTool(userInput) {
    try {
        const result = (0, mathjs_1.evaluate)(userInput);
        return String(result);
    }
    catch (error) {
        return `Error: ${error}`;
    }
}
