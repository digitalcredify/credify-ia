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