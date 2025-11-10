import { vectorCollection } from "./config";
import { getEmbedding } from "./scripts/ingest-data";
import { evaluate } from 'mathjs';
import { traceable } from "langsmith/traceable";


export const vectorSearchTool = traceable(
    async function vectorSearchTool(input: { query: string, filters: any }) {
        const queryEmbedding = await getEmbedding(input.query);

        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    // exact:true,
                    limit: 500,
                    numCandidates: 500,

                    filter: input.filters

                }
            },
            {
                $project: {
                    _id: 0,
                    // embedding: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ]
        const results = await vectorCollection.aggregate(pipeline).toArray();
        return results;
    },
    { name: "Vector Search Tool", run_type: "retriever" }
);




export function calculatorTool(userInput: any) {
    try {
        const result = evaluate(userInput);
        return String(result);

    } catch (error) {
        return `Error: ${error}`;
    }
}

// ===== FERRAMENTA 1: Busca Específica (Poucos Documentos) =====
export const specificQueryTool = traceable(
    async function specificQueryTool(input: { query: string, filters: any }) {
        console.log("🔍 Specific Query Tool:", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 100,
                    limit: 50,  
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();
        
        return results.map(doc => ({
            document: { pageContent: JSON.stringify(doc.document) },
            score: doc.score
        }));
    },
    {
        name: "Specific Query Tool",
        run_type: "retriever",
        metadata: {
            purpose: "Recupera informações especificas "
        }
    }
) as (input: { query: string, filters: any }) => Promise<any[]>;


// ===== FERRAMENTA 2: Agregação por Representante =====
export const aggregateByRepresentativeTool = traceable(
    async function aggregateByRepresentativeTool(input: { query: string, filters: any }) {
        console.log("📊 Aggregate By Representative Tool:", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 1000,
                    limit: 500, 
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();
        
        const grouped: { [key: string]: any } = {};
        
        for (const doc of results) {
            const data = doc.document;
            const repName = data.representative?.name || "Sem representante";
            
            if (!grouped[repName]) {
                grouped[repName] = {
                    name: repName,
                    totalConsumptions: 0,
                    totalValueInCents: 0,
                    totalValueWithDiscountInCents: 0,
                    totalSourcesCostInCents: 0
                };
            }
            
            grouped[repName].totalConsumptions += data.totalConsumptions || 0;
            grouped[repName].totalValueInCents += data.totalValueInCents || 0;
            grouped[repName].totalValueWithDiscountInCents += data.totalValueWithDiscountInCents || 0;
            grouped[repName].totalSourcesCostInCents += data.totalSourcesCostInCents || 0;
        }
        
        const aggregated = Object.values(grouped).sort((a: any, b: any) => 
            b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
        );
        
        console.log(`📊 Agregado: ${aggregated.length} representantes (de ${results.length} documentos)`);
        
        return [{
            document: { pageContent: JSON.stringify(aggregated) },
            score: 1.0,
            aggregated: true  
        }];
    },
    {
        name: "Aggregate By Representative Tool",
        run_type: "tool",
        metadata: {
            purpose: "Agrega por representante antes enviar ao llm"
        }
    }
) as (input: { query: string, filters: any }) => Promise<any[]>;

// ===== FERRAMENTA 3: Agregação por Empresa =====
export const aggregateByCompanyTool = traceable(
    async function aggregateByCompanyTool(input: { query: string, filters: any }) {
        console.log("🏢 Aggregate By Company Tool:", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 1000,
                    limit: 500,
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();
        
        const grouped: { [key: string]: any } = {};
        
        for (const doc of results) {
            const data = doc.document;
            const companyName = data.company?.name || "Sem empresa";
            
            if (!grouped[companyName]) {
                grouped[companyName] = {
                    name: companyName,
                    type: data.company?.type,
                    totalConsumptions: 0,
                    totalValueInCents: 0,
                    totalValueWithDiscountInCents: 0,
                    totalSourcesCostInCents: 0
                };
            }
            
            grouped[companyName].totalConsumptions += data.totalConsumptions || 0;
            grouped[companyName].totalValueInCents += data.totalValueInCents || 0;
            grouped[companyName].totalValueWithDiscountInCents += data.totalValueWithDiscountInCents || 0;
            grouped[companyName].totalSourcesCostInCents += data.totalSourcesCostInCents || 0;
        }
        
        const aggregated = Object.values(grouped).sort((a: any, b: any) => 
            b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
        );
        
        console.log(`🏢 Agregado: ${aggregated.length} empresas (de ${results.length} documentos)`);
        
        return [{
            document: { pageContent: JSON.stringify(aggregated) },
            score: 1.0,
            aggregated: true
        }];
    },
    {
        name: "Aggregate By Company Tool",
        run_type: "tool",
        metadata: {
            purpose: "agrega por empresa antes de enviar ao llm."
        }
    }
) as (input: { query: string, filters: any }) => Promise<any[]>;

// ===== FERRAMENTA 4: Busca Geral (Muitos Documentos) =====
export const generalQueryTool = traceable(
    async function generalQueryTool(input: { query: string, filters: any }) {
        console.log("🌐 General Query Tool:", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 1000,
                    limit: 500,  
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();
        
        return results.map(doc => ({
            document: { pageContent: JSON.stringify(doc.document) },
            score: doc.score
        }));
    },
    {
        name: "General Query Tool",
        run_type: "retriever",
        metadata: {
            purpose: "Pega todas as informações."
        }
    }
) as (input: { query: string, filters: any }) => Promise<any[]>;


export const aggregateTool = traceable(
    async function aggregateTool(input: { query: string, filters: any, groupBy: string }) {
        console.log("📊 Aggregate Tool:", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 1000,
                    limit: 500,
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();

        
        const grouped: { [key: string]: any } = {};
        
        for (const doc of results) {
            const data = doc.document;

            
            let groupKey;
            if (input.groupBy === "representative") {
                groupKey = data.representative?.name || "Sem representante";
            } else if (input.groupBy === "company") {
                groupKey = data.company?.name || "Sem empresa";
            } else if (input.groupBy === "organization") {
                groupKey = data.organization?.name || "Sem organização";
            } else if (input.groupBy === "revenue") {
                groupKey = data.revenue?.name || "Sem revenue";
            } else if (input.groupBy === "plan") {
                groupKey = data.plan?.name || "Sem plano";
            } else if (input.groupBy === "company_type") {
                groupKey = data.company?.type || "Sem tipo";
            } else {
                groupKey = data.company?.name || "Sem empresa";
            }
            
            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    name: groupKey,
                    totalConsumptions: 0,
                    totalValueInCents: 0,
                    totalValueWithDiscountInCents: 0,
                    totalSourcesCostInCents: 0,
                    count: 0  
                };
            }
            
            grouped[groupKey].totalConsumptions += data.totals.totalConsumptions || 0;
            grouped[groupKey].totalValueInCents += data.totals.totalValueInCents || 0;
            grouped[groupKey].totalValueWithDiscountInCents += data.totals.totalValueWithDiscountInCents || 0;
            grouped[groupKey].totalSourcesCostInCents += data.totals.totalSourcesCostInCents || 0;
            grouped[groupKey].count += 1;
        }
        
        const aggregated = Object.values(grouped).sort((a: any, b: any) => 
            b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
        );
        
        console.log(`📊 Agregado por ${input.groupBy}: ${aggregated.length} grupos (de ${results.length} documentos)`);
        
        return [{
            document: { 
                pageContent: JSON.stringify({
                    groupBy: input.groupBy,
                    data: aggregated
                })
            },
            score: 1.0,
            aggregated: true
        }];
    },
    {
        name: "Aggregate Tool",
        run_type: "tool",
        metadata: {
            purpose: "Aggregate data by any field dynamically"
        }
    }
) as (input: { query: string, filters: any, groupBy: string }) => Promise<any[]>;



// ===== FERRAMENTA 5: Busca hibrida  =====
export const hybridSearchTool = traceable(
    async function hybridSearchTool(input: { query: string, filters: any }) {
        console.log("🔀 Hybrid Search Tool (Fallback):", input);
        
        const queryEmbedding = await getEmbedding(input.query);
        
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 400,
                    limit: 200,  
                    filter: input.filters
                }
            },
            {
                $project: {
                    _id: 0,
                    document: "$$ROOT",
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $unset: "document.embedding"
            }
        ];
        
        const results = await vectorCollection.aggregate(pipeline).toArray();
        
        return results.map(doc => ({
            document: { pageContent: JSON.stringify(doc.document) },
            score: doc.score
        }));
    },
    {
        name: "Hybrid Search Tool",
        run_type: "retriever",
        metadata: {
            purpose: "Fallback tool for ambiguous queries (200 docs)"
        }
    }
) as (input: { query: string, filters: any }) => Promise<any[]>;
