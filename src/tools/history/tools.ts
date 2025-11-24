import { qdrantClient, openAiEmbbeding, QDRANT_COLLECTION_NAME } from "../../config";
import { QdrantVectorStore } from "@langchain/qdrant";
import { traceable } from "langsmith/traceable";
import { evaluate } from 'mathjs';

const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
    client: qdrantClient,
    collectionName: QDRANT_COLLECTION_NAME,
});


function createMonthFilter(month: string) {
    return {
        must: [
            { key: "metadata.month", match: { value: month } }
        ]
    };
}


export const specificQueryTool = traceable(
    async function specificQueryTool(input: { query: string, filters: any }) {
        console.log("🔍 Specific Query Tool (Qdrant):", input);
        
        try {
            const month = input.filters?.month || input.filters;
            const qdrantFilter = createMonthFilter(month);
            
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: qdrantFilter
            });

            const results = await retriever._getRelevantDocuments(input.query);
            
            console.log(`🔍 Specific Query: ${results.length} documentos encontrados`);
            console.log(`💰 Valores já estão em reais (convertidos no ingest)`);
            
            return results.map(doc => ({ 
                document: doc, 
                score: null 
            }));
            
        } catch (error: any) {
            console.error("❌ Erro no Specific Query Tool:", error.message);
            return [];
        }
    },
    { name: "Specific Query Tool (Qdrant)", run_type: "retriever" }
);


export const aggregateTool = traceable(
    async function aggregateTool(input: { query: string, filters: any, groupBy: string }) {
        console.log("📊 Aggregate Tool (Qdrant):", input);

        try {
            const month = input.filters?.month || input.filters;
            const qdrantFilter = createMonthFilter(month);
            
            const retriever = vectorStore.asRetriever({
                k: 500,
                filter: qdrantFilter
            });
            
            const results = await retriever._getRelevantDocuments(input.query);
            
            console.log(`📊 Aggregate Tool: ${results.length} documentos recuperados para agregação`);

            const grouped: { [key: string]: any } = {};
            
            for (const doc of results) {
                const data = doc.metadata;

                let groupKey: string;
                const groupByField = input.groupBy;

                if (groupByField === "representative") {
                    groupKey = data.representative?.name || "Sem representante";
                } else if (groupByField === "company") {
                    groupKey = data.company?.name || "Sem empresa";
                } else if (groupByField === "organization") {
                    groupKey = data.organization?.name || "Sem organização";
                } else if (groupByField === "plan") {
                    groupKey = data.plan?.name || "Sem plano";
                } else if (groupByField === "company_type") {
                    groupKey = data.company?.type || "Sem tipo";
                } else if (groupByField === "revenue") {
                    groupKey = data.revenue?.name || "Sem revenue";
                } else {
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

                const valueWithDiscount = data.totals?.totalValueWithDiscountInReais || 0;
                const sourcesCost = data.totals?.totalSourcesCostInReais || 0;
                
                grouped[groupKey].totalConsumptions += data.totals?.totalConsumptions || 0;
                grouped[groupKey].totalValueInReais += data.totals?.totalValueInReais || 0;
                grouped[groupKey].totalValueWithDiscountInReais += valueWithDiscount;
                grouped[groupKey].totalSourcesCostInReais += sourcesCost;
                grouped[groupKey].lucro += (valueWithDiscount - sourcesCost);
                grouped[groupKey].count += 1;
            }

            const aggregated = Object.values(grouped).sort((a: any, b: any) => 
                b.totalValueWithDiscountInReais - a.totalValueWithDiscountInReais
            );

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
            
        } catch (error: any) {
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
    },
    { name: "Aggregate Tool (Qdrant)", run_type: "tool" }
);



export const hybridSearchTool = traceable(
    async function hybridSearchTool(input: { query: string, filters: any }) {
        console.log("🔀 Hybrid Search Tool (Qdrant):", input);

        try {
            const month = input.filters?.month || input.filters;
            const qdrantFilter = createMonthFilter(month);
            
            const retriever = vectorStore.asRetriever({
                k: 200,
                filter: qdrantFilter
            });

            const results = await retriever._getRelevantDocuments(input.query);
            
            console.log(`🔀 Hybrid Search: ${results.length} documentos encontrados`);
            console.log(`💰 Valores já estão em reais (convertidos no ingest)`);
            
            return results.map(doc => ({ 
                document: doc, 
                score: null 
            }));
            
        } catch (error: any) {
            console.error("❌ Erro no Hybrid Search Tool:", error.message);
            return [];
        }
    },
    { name: "Hybrid Search Tool (Qdrant)", run_type: "retriever" }
);


export function calculatorTool(userInput: any) {
    try {
        const result = evaluate(userInput);
        return String(result);
    } catch (error) {
        return `Error: ${error}`;
    }
}
