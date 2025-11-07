import { vectorCollection } from "./config";
import { getEmbedding } from "./scripts/ingest-data";
import { evaluate } from 'mathjs'; 


export async function vectorSearchTool(input:{query: string, filters:any}) {

    console.log("vector search input:", input)

    const queryEmbedding = await getEmbedding(input.query)

    const pipeline = [
        {
            $vectorSearch:{
                index: "vector_index",
                queryVector: queryEmbedding,
                path:"embedding",
                // exact:true,
                limit:500,
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

    const cursor = vectorCollection.aggregate(pipeline)
    const results = await cursor.toArray()
    return results.map(r => ({
        document: {
            pageContent: JSON.stringify(r.document) 
        },
        score: r.score
    }));

}

export function calculatorTool(userInput:any){
    try {
        const result = evaluate(userInput);
        return String(result);
        
    } catch (error) {
        return `Error: ${error}`;
    }
}