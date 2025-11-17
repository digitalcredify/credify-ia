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
const mathjs_1 = require("mathjs");
const traceable_1 = require("langsmith/traceable");
const qdrant_1 = require("@langchain/qdrant");
const config_1 = require("./config");
// iniciar o vectorStore
const vectorStore = new qdrant_1.QdrantVectorStore(config_1.openAiEmbbeding, {
    client: config_1.qdrantClient,
    collectionName: config_1.QDRANT_COLLECTION_NAME,
});
// tool de busca especifica
exports.specificQueryTool = (0, traceable_1.traceable)(function specificQueryTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🔍 Specific Query Tool (Qdrant):", input);
        const retriever = vectorStore.asRetriever({
            k: 50, // busca os 50 documentos mais relevantes
            filter: {
                must: [
                    { key: "month", match: { value: input.filters.month } }
                ]
            }
        });
        const results = yield retriever._getRelevantDocuments(input.query);
        return results.map(doc => ({ document: doc, score: null })); // Qdrant retriever não retorna score por padrão
    });
}, { name: "Specific Query Tool (Qdrant)", run_type: "retriever" });
// tool de agrgação
exports.aggregateTool = (0, traceable_1.traceable)(function aggregateTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        console.log("📊 Aggregate Tool (Qdrant):", input);
        const retriever = vectorStore.asRetriever({
            k: 500,
            filter: {
                must: [
                    { key: "month", match: { value: input.filters.month } }
                ]
            }
        });
        const results = yield retriever._getRelevantDocuments(input.query);
        // separando os dados
        const grouped = {};
        for (const doc of results) {
            const data = doc.metadata;
            let groupKey;
            const groupByField = input.groupBy;
            // lógica para extrair a chave de agrupamento dos metadados
            if (groupByField === "representative")
                groupKey = ((_a = data.representative) === null || _a === void 0 ? void 0 : _a.name) || "Sem representante";
            else if (groupByField === "company")
                groupKey = ((_b = data.company) === null || _b === void 0 ? void 0 : _b.name) || "Sem empresa";
            else if (groupByField === "organization")
                groupKey = ((_c = data.organization) === null || _c === void 0 ? void 0 : _c.name) || "Sem organização";
            else if (groupByField === "plan")
                groupKey = ((_d = data.plan) === null || _d === void 0 ? void 0 : _d.name) || "Sem plano";
            else if (groupByField === "company_type")
                groupKey = ((_e = data.company) === null || _e === void 0 ? void 0 : _e.type) || "Sem tipo";
            else
                groupKey = "Grupo Desconhecido";
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
            // agregando os dados
            grouped[groupKey].totalConsumptions += ((_f = data.totals) === null || _f === void 0 ? void 0 : _f.totalConsumptions) || 0;
            grouped[groupKey].totalValueInCents += ((_g = data.totals) === null || _g === void 0 ? void 0 : _g.totalValueInCents) || 0;
            grouped[groupKey].totalValueWithDiscountInCents += ((_h = data.totals) === null || _h === void 0 ? void 0 : _h.totalValueWithDiscountInCents) || 0;
            grouped[groupKey].totalSourcesCostInCents += ((_j = data.totals) === null || _j === void 0 ? void 0 : _j.totalSourcesCostInCents) || 0;
            grouped[groupKey].count += 1;
        }
        //ordenando
        const aggregated = Object.values(grouped).sort((a, b) => b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents);
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
    });
}, { name: "Aggregate Tool (Qdrant)", run_type: "tool" });
// busca hibrida
exports.hybridSearchTool = (0, traceable_1.traceable)(function hybridSearchTool(input) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🔀 Hybrid Search Tool (Qdrant):", input);
        const retriever = vectorStore.asRetriever({
            k: 200,
            filter: {
                must: [
                    { key: "month", match: { value: input.filters.month } }
                ]
            }
        });
        const results = yield retriever._getRelevantDocuments(input.query);
        return results.map(doc => ({ document: doc, score: null }));
    });
}, { name: "Hybrid Search Tool (Qdrant)", run_type: "retriever" });
// calcyladora -> a melhorar
function calculatorTool(userInput) {
    try {
        const result = (0, mathjs_1.evaluate)(userInput);
        return String(result);
    }
    catch (error) {
        return `Error: ${error}`;
    }
}
// export const vectorSearchTool = traceable(
//     async function vectorSearchTool(input: { query: string, filters: any }) {
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     // exact:true,
//                     limit: 500,
//                     numCandidates: 500,
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     // embedding: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ]
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         return results;
//     },
//     { name: "Vector Search Tool", run_type: "retriever" }
// );
// export function calculatorTool(userInput: any) {
//     try {
//         const result = evaluate(userInput);
//         return String(result);
//     } catch (error) {
//         return `Error: ${error}`;
//     }
// }
// // ===== FERRAMENTA 1: Busca Específica (Poucos Documentos) =====
// export const specificQueryTool = traceable(
//     async function specificQueryTool(input: { query: string, filters: any }) {
//         console.log("🔍 Specific Query Tool:", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 100,
//                     limit: 50,  
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         return results.map(doc => ({
//             document: { pageContent: JSON.stringify(doc.document) },
//             score: doc.score
//         }));
//     },
//     {
//         name: "Specific Query Tool",
//         run_type: "retriever",
//         metadata: {
//             purpose: "Recupera informações especificas "
//         }
//     }
// ) as (input: { query: string, filters: any }) => Promise<any[]>;
// // ===== FERRAMENTA 2: Agregação por Representante =====
// export const aggregateByRepresentativeTool = traceable(
//     async function aggregateByRepresentativeTool(input: { query: string, filters: any }) {
//         console.log("📊 Aggregate By Representative Tool:", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 1000,
//                     limit: 500, 
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         const grouped: { [key: string]: any } = {};
//         for (const doc of results) {
//             const data = doc.document;
//             const repName = data.representative?.name || "Sem representante";
//             if (!grouped[repName]) {
//                 grouped[repName] = {
//                     name: repName,
//                     totalConsumptions: 0,
//                     totalValueInCents: 0,
//                     totalValueWithDiscountInCents: 0,
//                     totalSourcesCostInCents: 0
//                 };
//             }
//             grouped[repName].totalConsumptions += data.totalConsumptions || 0;
//             grouped[repName].totalValueInCents += data.totalValueInCents || 0;
//             grouped[repName].totalValueWithDiscountInCents += data.totalValueWithDiscountInCents || 0;
//             grouped[repName].totalSourcesCostInCents += data.totalSourcesCostInCents || 0;
//         }
//         const aggregated = Object.values(grouped).sort((a: any, b: any) => 
//             b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
//         );
//         console.log(`📊 Agregado: ${aggregated.length} representantes (de ${results.length} documentos)`);
//         return [{
//             document: { pageContent: JSON.stringify(aggregated) },
//             score: 1.0,
//             aggregated: true  
//         }];
//     },
//     {
//         name: "Aggregate By Representative Tool",
//         run_type: "tool",
//         metadata: {
//             purpose: "Agrega por representante antes enviar ao llm"
//         }
//     }
// ) as (input: { query: string, filters: any }) => Promise<any[]>;
// // ===== FERRAMENTA 3: Agregação por Empresa =====
// export const aggregateByCompanyTool = traceable(
//     async function aggregateByCompanyTool(input: { query: string, filters: any }) {
//         console.log("🏢 Aggregate By Company Tool:", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 1000,
//                     limit: 500,
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         const grouped: { [key: string]: any } = {};
//         for (const doc of results) {
//             const data = doc.document;
//             const companyName = data.company?.name || "Sem empresa";
//             if (!grouped[companyName]) {
//                 grouped[companyName] = {
//                     name: companyName,
//                     type: data.company?.type,
//                     totalConsumptions: 0,
//                     totalValueInCents: 0,
//                     totalValueWithDiscountInCents: 0,
//                     totalSourcesCostInCents: 0
//                 };
//             }
//             grouped[companyName].totalConsumptions += data.totalConsumptions || 0;
//             grouped[companyName].totalValueInCents += data.totalValueInCents || 0;
//             grouped[companyName].totalValueWithDiscountInCents += data.totalValueWithDiscountInCents || 0;
//             grouped[companyName].totalSourcesCostInCents += data.totalSourcesCostInCents || 0;
//         }
//         const aggregated = Object.values(grouped).sort((a: any, b: any) => 
//             b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
//         );
//         console.log(`🏢 Agregado: ${aggregated.length} empresas (de ${results.length} documentos)`);
//         return [{
//             document: { pageContent: JSON.stringify(aggregated) },
//             score: 1.0,
//             aggregated: true
//         }];
//     },
//     {
//         name: "Aggregate By Company Tool",
//         run_type: "tool",
//         metadata: {
//             purpose: "agrega por empresa antes de enviar ao llm."
//         }
//     }
// ) as (input: { query: string, filters: any }) => Promise<any[]>;
// // ===== FERRAMENTA 4: Busca Geral (Muitos Documentos) =====
// export const generalQueryTool = traceable(
//     async function generalQueryTool(input: { query: string, filters: any }) {
//         console.log("🌐 General Query Tool:", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 1000,
//                     limit: 500,  
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         return results.map(doc => ({
//             document: { pageContent: JSON.stringify(doc.document) },
//             score: doc.score
//         }));
//     },
//     {
//         name: "General Query Tool",
//         run_type: "retriever",
//         metadata: {
//             purpose: "Pega todas as informações."
//         }
//     }
// ) as (input: { query: string, filters: any }) => Promise<any[]>;
// export const aggregateTool = traceable(
//     async function aggregateTool(input: { query: string, filters: any, groupBy: string }) {
//         console.log("📊 Aggregate Tool:", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 1000,
//                     limit: 500,
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         const grouped: { [key: string]: any } = {};
//         for (const doc of results) {
//             const data = doc.document;
//             let groupKey;
//             if (input.groupBy === "representative") {
//                 groupKey = data.representative?.name || "Sem representante";
//             } else if (input.groupBy === "company") {
//                 groupKey = data.company?.name || "Sem empresa";
//             } else if (input.groupBy === "organization") {
//                 groupKey = data.organization?.name || "Sem organização";
//             } else if (input.groupBy === "revenue") {
//                 groupKey = data.revenue?.name || "Sem revenue";
//             } else if (input.groupBy === "plan") {
//                 groupKey = data.plan?.name || "Sem plano";
//             } else if (input.groupBy === "company_type") {
//                 groupKey = data.company?.type || "Sem tipo";
//             } else {
//                 groupKey = data.company?.name || "Sem empresa";
//             }
//             if (!grouped[groupKey]) {
//                 grouped[groupKey] = {
//                     name: groupKey,
//                     totalConsumptions: 0,
//                     totalValueInCents: 0,
//                     totalValueWithDiscountInCents: 0,
//                     totalSourcesCostInCents: 0,
//                     count: 0  
//                 };
//             }
//             grouped[groupKey].totalConsumptions += data.totals.totalConsumptions || 0;
//             grouped[groupKey].totalValueInCents += data.totals.totalValueInCents || 0;
//             grouped[groupKey].totalValueWithDiscountInCents += data.totals.totalValueWithDiscountInCents || 0;
//             grouped[groupKey].totalSourcesCostInCents += data.totals.totalSourcesCostInCents || 0;
//             grouped[groupKey].count += 1;
//         }
//         const aggregated = Object.values(grouped).sort((a: any, b: any) => 
//             b.totalValueWithDiscountInCents - a.totalValueWithDiscountInCents
//         );
//         console.log(`📊 Agregado por ${input.groupBy}: ${aggregated.length} grupos (de ${results.length} documentos)`);
//         return [{
//             document: { 
//                 pageContent: JSON.stringify({
//                     groupBy: input.groupBy,
//                     data: aggregated
//                 })
//             },
//             score: 1.0,
//             aggregated: true
//         }];
//     },
//     {
//         name: "Aggregate Tool",
//         run_type: "tool",
//         metadata: {
//             purpose: "Aggregate data by any field dynamically"
//         }
//     }
// ) as (input: { query: string, filters: any, groupBy: string }) => Promise<any[]>;
// // ===== FERRAMENTA 5: Busca hibrida  =====
// export const hybridSearchTool = traceable(
//     async function hybridSearchTool(input: { query: string, filters: any }) {
//         console.log("🔀 Hybrid Search Tool (Fallback):", input);
//         const queryEmbedding = await getEmbedding(input.query);
//         const pipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index",
//                     queryVector: queryEmbedding,
//                     path: "embedding",
//                     numCandidates: 400,
//                     limit: 200,  
//                     filter: input.filters
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     document: "$$ROOT",
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             },
//             {
//                 $unset: "document.embedding"
//             }
//         ];
//         const results = await vectorCollection.aggregate(pipeline).toArray();
//         return results.map(doc => ({
//             document: { pageContent: JSON.stringify(doc.document) },
//             score: doc.score
//         }));
//     },
//     {
//         name: "Hybrid Search Tool",
//         run_type: "retriever",
//         metadata: {
//             purpose: "Fallback tool for ambiguous queries (200 docs)"
//         }
//     }
// ) as (input: { query: string, filters: any }) => Promise<any[]>;
