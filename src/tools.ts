import { vectorCollection } from "./config";
import { getEmbedding } from "./scripts/ingest-data";
import { evaluate } from 'mathjs'; 

// esse arquivo define as ferramentas que o agente pode usar para dar respostas as perguntas.

export async function vectorSearchTool(input:{query: string, filters:any}) {

    console.log("vector search input:", input)

    // gera o embedding apenar para a parte semãntica da consulta.
    const queryEmbedding = await getEmbedding(input.query)

    // pipeline de busca hibrida
    const pipeline = [
        {
            $vectorSearch:{
                index: "vector_index",
                queryVector: queryEmbedding,
                path:"embedding",
                // exact:true,
                limit:500,
                numCandidates: 500,

                // pré filtro busca vetorial
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
            // Converte o objeto JSON de volta para string para o LLM ler
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