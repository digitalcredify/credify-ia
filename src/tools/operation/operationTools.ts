/**
 * @fileoverview 
 * Ferramentas (tools) específicas para consulta de dados operacionais no Qdrant
 * Similar ao tools.ts, mas adaptado para a estrutura de dados operacionais
 */

import { QdrantVectorStore } from "@langchain/qdrant";
import { traceable } from "langsmith/traceable";
import { evaluate } from 'mathjs';
import { openAiEmbbeding, qdrantClient } from "../../config";
import { QDRANT_OPERATION_COLLECTION_NAME } from "../../scripts/operations/ingest-operation-data";

const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
    client: qdrantClient,
    collectionName: QDRANT_OPERATION_COLLECTION_NAME,
});

/**
 * Cria filtro para range de datas e opcionalmente horas
 */
function createRangeFilter(startDate: string, endDate: string, startHour?: any, endHour?: any) {
    const filters: any = {
        must: [
            { key: "metadata.startDate", match: { value: startDate } },
            { key: "metadata.endDate", match: { value: endDate } }
        ]
    };
    
    // Se startHour e endHour forem fornecidos, adiciona ao filtro
    if (startHour !== undefined && endHour !== undefined) {
        filters.must.push({ key: "metadata.hour", range: { gte: startHour, lte: endHour } });
    }
    
    return filters;
}

/**
 * Ferramenta de busca específica para dados operacionais
 */
export const operationSpecificQueryTool = traceable(
    async function operationSpecificQueryTool(input: { query: string, filters: any }) {
        console.log("🔍 Operation Specific Query Tool (Qdrant):", input);
        
        try {
            const startDate = input.filters?.startDate || input.filters;
            const endDate = input.filters?.endDate || input.filters;
            const startHour = input.filters?.startHour;
            const endHour = input.filters?.endHour;
            const qdrantFilter = createRangeFilter(startDate, endDate, startHour, endHour);
            
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: qdrantFilter
            });

            const results = await retriever._getRelevantDocuments(input.query);
            
            console.log(`🔍 Operation Specific Query: ${results.length} documentos encontrados`);
            
            return results.map(doc => ({ 
                document: doc, 
                score: null 
            }));
            
        } catch (error: any) {
            console.error("❌ Erro no Operation Specific Query Tool:", error.message);
            return [];
        }
    },
    { name: "Operation Specific Query Tool (Qdrant)", run_type: "retriever" }
);

/**
 * Ferramenta de agregação para dados operacionais
 */
export const operationAggregateTool = traceable(
    async function operationAggregateTool(input: { query: string, filters: any, groupBy: string }) {
        console.log("📊 Operation Aggregate Tool (Qdrant):", input);

        try {
            const startDate = input.filters?.startDate || input.filters;
            const endDate = input.filters?.endDate || input.filters;
            const startHour = input.filters?.startHour;
            const endHour = input.filters?.endHour;
            const qdrantFilter = createRangeFilter(startDate, endDate, startHour, endHour);
            
            const retriever = vectorStore.asRetriever({
                k: 500,
                filter: qdrantFilter
            });
            
            const results = await retriever._getRelevantDocuments(input.query);
            
            console.log(`📊 Operation Aggregate Tool: ${results.length} documentos recuperados para agregação`);

            const grouped: { [key: string]: any } = {};
            
            for (const doc of results) {
                const data = doc.metadata;

                let groupKey: string;
                const groupByField = input.groupBy;

                if (groupByField === "product") {
                    groupKey = data.productName || "Sem produto";
                } else if (groupByField === "application") {
                    groupKey = data.applicationName || "Sem aplicação";
                } else if (groupByField === "user") {
                    groupKey = data.userLogin || "Sem usuário";
                } else if (groupByField === "company") {
                    groupKey = data.companyName || "Sem empresa";
                } else if (groupByField === "hour") {
                    groupKey = data.hour || "Sem hora";
                } else if (groupByField === "date") {
                    groupKey = data.date || "Sem data";
                } else if (groupByField === "type") {
                    groupKey = data.type || "Sem tipo";
                } else {
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

        } catch (error: any) {
            console.error("❌ Erro no Operation Aggregate Tool:", error.message);
            return [];
        }
    },
    { name: "Operation Aggregate Tool (Qdrant)", run_type: "retriever" }
);

/**
 * Ferramenta de busca híbrida para dados operacionais
 */
export const operationHybridSearchTool = traceable(
    async function operationHybridSearchTool(input: { query: string, filters: any }) {
        console.log("🔎 Operation Hybrid Search Tool (Qdrant):", input);

        try {
            const startDate = input.filters?.startDate || input.filters;
            const endDate = input.filters?.endDate || input.filters;
            const startHour = input.filters?.startHour;
            const endHour = input.filters?.endHour;
            const qdrantFilter = createRangeFilter(startDate, endDate, startHour, endHour);

            const retriever = vectorStore.asRetriever({
                k: 100,
                filter: qdrantFilter
            });

            const results = await retriever._getRelevantDocuments(input.query);

            console.log(`🔎 Operation Hybrid Search: ${results.length} documentos encontrados`);

            return results.map(doc => ({
                document: doc,
                score: null
            }));

        } catch (error: any) {
            console.error("❌ Erro no Operation Hybrid Search Tool:", error.message);
            return [];
        }
    },
    { name: "Operation Hybrid Search Tool (Qdrant)", run_type: "retriever" }
);

/**
 * Ferramenta de calculadora (reutilizada do tools.ts)
 */
export const operationCalculatorTool = traceable(
    async function operationCalculatorTool(input: { expression: string }) {
        console.log("🧮 Operation Calculator Tool:", input);

        try {
            const result = evaluate(input.expression);
            console.log(`🧮 Resultado: ${result}`);
            return { result };

        } catch (error: any) {
            console.error("❌ Erro no Operation Calculator Tool:", error.message);
            return { error: error.message };
        }
    },
    { name: "Operation Calculator Tool", run_type: "tool" }
);

/**
 * Ferramenta para análise de performance
 * Calcula métricas de performance baseadas nos dados operacionais
 */
export const operationPerformanceAnalysisTool = traceable(
    async function operationPerformanceAnalysisTool(input: { filters: any }) {
        console.log("📈 Operation Performance Analysis Tool:", input);

        try {
            const startDate = input.filters?.startDate || input.filters;
            const endDate = input.filters?.endDate || input.filters;
            const startHour = input.filters?.startHour;
            const endHour = input.filters?.endHour;
            const qdrantFilter = createRangeFilter(startDate, endDate, startHour, endHour);

            const retriever = vectorStore.asRetriever({
                k: 1000,
                filter: qdrantFilter
            });

            const results = await retriever._getRelevantDocuments("métricas de performance");

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

        } catch (error: any) {
            console.error("❌ Erro no Operation Performance Analysis Tool:", error.message);
            return { error: error.message };
        }
    },
    { name: "Operation Performance Analysis Tool", run_type: "tool" }
);
