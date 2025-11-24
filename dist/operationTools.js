"use strict";
/**
 * @fileoverview
 * Ferramentas (tools) específicas para consulta de dados operacionais no Qdrant
 * Similar ao tools.ts, mas adaptado para a estrutura de dados operacionais
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
exports.operationPerformanceAnalysisTool = exports.operationCalculatorTool = exports.operationHybridSearchTool = exports.operationAggregateTool = exports.operationSpecificQueryTool = void 0;
const config_1 = require("./config");
const qdrant_1 = require("@langchain/qdrant");
const traceable_1 = require("langsmith/traceable");
const mathjs_1 = require("mathjs");
const ingest_operation_data_1 = require("./scripts/ingest-operation-data");
const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
    client: config_1.qdrantClient,
    collectionName: ingest_operation_data_1.QDRANT_OPERATION_COLLECTION_NAME,
});
/**
 * Cria filtro para range de datas
 */
function createRangeFilter(startDate, endDate) {
    return {
        must: [
            { key: "metadata.startDate", match: { value: startDate } },
            { key: "metadata.endDate", match: { value: endDate } }
        ]
    };
}
/**
 * Ferramenta de busca específica para dados operacionais
 */
exports.operationSpecificQueryTool = (0, traceable_1.traceable)(function operationSpecificQueryTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("🔍 Operation Specific Query Tool (Qdrant):", input);
        try {
            const startDate = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.startDate) || input.filters;
            const endDate = ((_b = input.filters) === null || _b === void 0 ? void 0 : _b.endDate) || input.filters;
            const qdrantFilter = createRangeFilter(startDate, endDate);
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`🔍 Operation Specific Query: ${results.length} documentos encontrados`);
            return results.map(doc => ({
                document: doc,
                score: null
            }));
        }
        catch (error) {
            console.error("❌ Erro no Operation Specific Query Tool:", error.message);
            return [];
        }
    });
}, { name: "Operation Specific Query Tool (Qdrant)", run_type: "retriever" });
/**
 * Ferramenta de agregação para dados operacionais
 */
exports.operationAggregateTool = (0, traceable_1.traceable)(function operationAggregateTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("📊 Operation Aggregate Tool (Qdrant):", input);
        try {
            const startDate = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.startDate) || input.filters;
            const endDate = ((_b = input.filters) === null || _b === void 0 ? void 0 : _b.endDate) || input.filters;
            const qdrantFilter = createRangeFilter(startDate, endDate);
            const retriever = vectorStore.asRetriever({
                k: 500,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`📊 Operation Aggregate Tool: ${results.length} documentos recuperados para agregação`);
            const grouped = {};
            for (const doc of results) {
                const data = doc.metadata;
                let groupKey;
                const groupByField = input.groupBy;
                if (groupByField === "product") {
                    groupKey = data.productName || "Sem produto";
                }
                else if (groupByField === "application") {
                    groupKey = data.applicationName || "Sem aplicação";
                }
                else if (groupByField === "user") {
                    groupKey = data.userLogin || "Sem usuário";
                }
                else if (groupByField === "company") {
                    groupKey = data.companyName || "Sem empresa";
                }
                else if (groupByField === "hour") {
                    groupKey = data.hour || "Sem hora";
                }
                else if (groupByField === "date") {
                    groupKey = data.date || "Sem data";
                }
                else if (groupByField === "type") {
                    groupKey = data.type || "Sem tipo";
                }
                else {
                    groupKey = "Grupo Desconhecido";
                }
                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        name: groupKey,
                        totalExecutions: 0,
                        totalSuccesses: 0,
                        totalSuccessesWithData: 0,
                        totalSuccessesWithoutData: 0,
                        totalFails: 0,
                        totalPendings: 0,
                        averageExecutionTime: 0,
                        count: 0
                    };
                }
                grouped[groupKey].totalExecutions += data.total || 0;
                grouped[groupKey].totalSuccesses += data.successes || 0;
                grouped[groupKey].totalSuccessesWithData += data.successesWithData || 0;
                grouped[groupKey].totalSuccessesWithoutData += data.successesWithoutData || 0;
                grouped[groupKey].totalFails += data.fails || 0;
                grouped[groupKey].totalPendings += data.pendings || 0;
                grouped[groupKey].averageExecutionTime += data.averageExecutionTime || 0;
                grouped[groupKey].count += 1;
            }
            // Calcula a média do tempo de execução
            for (const key in grouped) {
                if (grouped[key].count > 0) {
                    grouped[key].averageExecutionTime = grouped[key].averageExecutionTime / grouped[key].count;
                }
            }
            const aggregatedResults = Object.values(grouped);
            console.log(`📊 Agregação concluída: ${aggregatedResults.length} grupos`);
            return aggregatedResults;
        }
        catch (error) {
            console.error("❌ Erro no Operation Aggregate Tool:", error.message);
            return [];
        }
    });
}, { name: "Operation Aggregate Tool (Qdrant)", run_type: "retriever" });
/**
 * Ferramenta de busca híbrida para dados operacionais
 */
exports.operationHybridSearchTool = (0, traceable_1.traceable)(function operationHybridSearchTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("🔎 Operation Hybrid Search Tool (Qdrant):", input);
        try {
            const startDate = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.startDate) || input.filters;
            const endDate = ((_b = input.filters) === null || _b === void 0 ? void 0 : _b.endDate) || input.filters;
            const qdrantFilter = createRangeFilter(startDate, endDate);
            const retriever = vectorStore.asRetriever({
                k: 100,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments(input.query);
            console.log(`🔎 Operation Hybrid Search: ${results.length} documentos encontrados`);
            return results.map(doc => ({
                document: doc,
                score: null
            }));
        }
        catch (error) {
            console.error("❌ Erro no Operation Hybrid Search Tool:", error.message);
            return [];
        }
    });
}, { name: "Operation Hybrid Search Tool (Qdrant)", run_type: "retriever" });
/**
 * Ferramenta de calculadora (reutilizada do tools.ts)
 */
exports.operationCalculatorTool = (0, traceable_1.traceable)(function operationCalculatorTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🧮 Operation Calculator Tool:", input);
        try {
            const result = (0, mathjs_1.evaluate)(input.expression);
            console.log(`🧮 Resultado: ${result}`);
            return { result };
        }
        catch (error) {
            console.error("❌ Erro no Operation Calculator Tool:", error.message);
            return { error: error.message };
        }
    });
}, { name: "Operation Calculator Tool", run_type: "tool" });
/**
 * Ferramenta para análise de performance
 * Calcula métricas de performance baseadas nos dados operacionais
 */
exports.operationPerformanceAnalysisTool = (0, traceable_1.traceable)(function operationPerformanceAnalysisTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("📈 Operation Performance Analysis Tool:", input);
        try {
            const startDate = ((_a = input.filters) === null || _a === void 0 ? void 0 : _a.startDate) || input.filters;
            const endDate = ((_b = input.filters) === null || _b === void 0 ? void 0 : _b.endDate) || input.filters;
            const qdrantFilter = createRangeFilter(startDate, endDate);
            const retriever = vectorStore.asRetriever({
                k: 1000,
                filter: qdrantFilter
            });
            const results = yield retriever._getRelevantDocuments("métricas de performance");
            let totalExecutions = 0;
            let totalSuccesses = 0;
            let totalFails = 0;
            let totalExecutionTime = 0;
            let count = 0;
            for (const doc of results) {
                const data = doc.metadata;
                totalExecutions += data.total || 0;
                totalSuccesses += data.successes || 0;
                totalFails += data.fails || 0;
                totalExecutionTime += data.averageExecutionTime || 0;
                count += 1;
            }
            const successRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;
            const failRate = totalExecutions > 0 ? (totalFails / totalExecutions) * 100 : 0;
            const avgExecutionTime = count > 0 ? totalExecutionTime / count : 0;
            const analysis = {
                totalExecutions,
                totalSuccesses,
                totalFails,
                successRate: successRate.toFixed(2) + '%',
                failRate: failRate.toFixed(2) + '%',
                averageExecutionTime: avgExecutionTime.toFixed(2) + 'ms'
            };
            console.log(`📈 Análise de performance concluída:`, analysis);
            return analysis;
        }
        catch (error) {
            console.error("❌ Erro no Operation Performance Analysis Tool:", error.message);
            return { error: error.message };
        }
    });
}, { name: "Operation Performance Analysis Tool", run_type: "tool" });
