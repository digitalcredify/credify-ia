
import { openAIClient, openAiEmbbeding, vectorCollection } from "../config";
import { traceable } from "langsmith/traceable";


const EMBEDDING_DIMENSIONS = 1536;

export const getEmbedding = traceable(
    async function getEmbedding(data: string) {
        const response = await openAIClient.embeddings.create({
            input: data,
            model: 'text-embedding-3-small',
        });
        return response.data[0].embedding;
    },
    { name: "Get Embedding", run_type: "llm" }
);


export const ingestData = traceable(
    async function ingestData(jsonData: any, month: string) {
        console.log('Iniciando ingestão de dados...');

        try {
            const documents = jsonData.data;
            if (!Array.isArray(documents)) {
                throw new Error("O JSON recebido não contém um array 'data'.");
            }

            console.log(`Documentos JSON encontrados: ${documents.length}`);

            const insertDocuments = await Promise.all(documents.map(async (doc: any) => {
                const textToEmbed = `
                Empresa: ${doc.company?.name ?? 'N/A'}
                Plano: ${doc.plan?.name ?? 'N/A'}
                Organização: ${doc.organization?.name ?? 'N/A'}
                Representante: ${doc.representative?.name ?? 'N/A'}
            `;

                const embedding = await getEmbedding(textToEmbed)

                return {
                    ...doc,
                    embedding: embedding,
                    month: month
                }

            }))

            const validDocuments = insertDocuments.filter(d => d.embedding);
            if (validDocuments.length === 0) {
                throw new Error("Nenhum documento foi 'embedado' com sucesso.");
            }

            await vectorCollection.deleteMany({ month: month });
            const result = await vectorCollection.insertMany(validDocuments, { ordered: false });

            console.log(`Documentos JSON inseridos para ${month}: ${result.insertedCount}`);
            return result.insertedCount;

        } catch (error) {
            console.error("Erro de ingestão:", error);
            throw error;
        }
    },
    { name: "Ingest Data", run_type: "tool" }

)



export async function createVectorIndex() {
    try {
        const existingIndex = await vectorCollection.listSearchIndexes().toArray();
        if (existingIndex.some(index => index.name === "vector_index")) {
            console.log("Vector index already exists. Skipping creation.");
            return;
        }

        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
                "fields": [
                    { "type": "vector", "path": "embedding", "numDimensions": EMBEDDING_DIMENSIONS, "similarity": "cosine" },
                    // ADICIONA OS CAMPOS DE FILTRO
                    { "type": "filter", "path": "month" },
                    { "type": "filter", "path": "representative.name" },
                    { "type": "filter", "path": "organization.name" },
                    { "type": "filter", "path": "company.type" },
                    { "type": "filter", "path": "company.name" }
                ]
            }
        };

        const result = await vectorCollection.createSearchIndex(index);
        console.log(`Novo index criado => ${result} `);

        console.log("Verificando se o indice está pronto...");
        let isQueryable = false;
        while (!isQueryable) {
            const cursor = vectorCollection.listSearchIndexes();
            for await (const index of cursor) {
                const i = index as any;
                if (i.name === result) {
                    if (i.queryable) {
                        console.log(`${result} está pronto para consulta.`);
                        isQueryable = true;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
        }
    } catch (error) {
        console.error("Erro ao criar vector Index:", error);
        throw error;
    }
}

export async function checkIfDataExists(month: string) {

    console.log(`Verificando se dados para o mês ${month} já existem...`);

    try {
        const doc = await vectorCollection.findOne({ month: month });

        if (doc) {
            console.log(`Dados para ${month} encontrados.`);
            return true;

        }
        console.log(`Dados para ${month} não encontrados.`);
        return false;

    } catch (error) {
        console.error("Erro ao verificar dados:", error);
        return false;
    }


}