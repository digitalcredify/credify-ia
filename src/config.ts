/**
 * @fileoverview 
 * este arquivo é onde é configurado as credências dos clientes.
 */

import dotenv from 'dotenv';
import OpenAI from "openai";
import { QdrantClient } from '@qdrant/js-client-rest';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { traceable } from "langsmith/traceable";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { Db, MongoClient } from 'mongodb';





dotenv.config();


const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'credify_ia';


if (!MONGODB_URI) {
    throw new Error('❌ MONGODB_URI não está definida no arquivo .env');
}

let mongoClient: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongoDB(): Promise<Db> {
    try {
        if (db) {
            console.log('✅ [MongoDB] Usando conexão existente');
            return db;
        }

        console.log('🔄 [MongoDB] Conectando ao MongoDB...');
        
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        
        db = mongoClient.db(MONGODB_DATABASE);
        
        // Testar conexão
        await db.admin().ping();
        
        console.log(`✅ [MongoDB] Conectado com sucesso ao banco: ${MONGODB_DATABASE}`);
        
        return db;
    } catch (error) {
        console.error('❌ [MongoDB] Erro ao conectar:', error);
        throw error;
    }
}

export async function disconnectMongoDB(): Promise<void> {
    try {
        if (mongoClient) {
            await mongoClient.close();
            console.log('✅ [MongoDB] Desconectado com sucesso');
            mongoClient = null;
            db = null;
        }
    } catch (error) {
        console.error('❌ [MongoDB] Erro ao desconectar:', error);
        throw error;
    }
}

export function getDatabase(): Db {
    if (!db) {
        throw new Error('❌ MongoDB não está conectado. Chame connectMongoDB() primeiro.');
    }
    return db;
}

export default db;




export const apiKeyOpenAi = process.env.API_KEY;
export const qdrantUrl = process.env.QDRANT_URL;
export const qdrantApiKey = process.env.QDRANT_API_KEY;

export const openAiEmbbeding = new OpenAIEmbeddings({
    apiKey: apiKeyOpenAi,
    model: 'text-embedding-3-small',
});


export const openAIClient = new OpenAI({ apiKey: apiKeyOpenAi });

export const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
});





// verifica se a collection ja existe
export async function collectionExists(collectionName:string){

    try {
        await qdrantClient.getCollection(collectionName);
        return true;
        
    } catch (error) {
        return false
    }

}

// cria coleção
export async function createCollecion(collectionName:string) {
    try {
        await qdrantClient.createCollection(collectionName, {
            vectors: {
                size:1536,
                distance:"Cosine"
            }
        })
        
        console.log(`[Qdrant] ✅ Coleção ${collectionName} criada com sucesso.`);  

    } catch (error:any) {
        
        if(error.message &&  error.message.includes("already exists")){

            console.log(`[Qdrant] A coleção ${collectionName} já existe.`);
        }
        else{
            throw error;
        }
        
    }
    
}

export const addDocuments = traceable(
     async function addDocuments(vectorStore: QdrantVectorStore, documents: Document[]) {
        await vectorStore.addDocuments(documents);
    }
    , { name: "Adicionando documentos - Operações", run_type: "adding_documents" }
)




export const fastModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    apiKey: apiKeyOpenAi
});

export const balancedModel = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    apiKey: apiKeyOpenAi
});

export const advancedModel = new ChatOpenAI({
    model: "gpt-5",
    apiKey: apiKeyOpenAi
});

export const ENABLE_STREAMING = process.env.ENABLE_STREAMING !== 'false'; // habilita streaming assim por enquanto
export const QDRANT_COLLECTION_NAME = "credify_ia_collection";
export const OPENAI_MODEL = "gpt-5-2025-08-07";


// habilita langsmith
if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log("✅ LangSmith tracing habilitado");
}
