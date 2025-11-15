import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import OpenAI from "openai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

dotenv.config();
export const apiKeyOpenAi = process.env.API_KEY;

export const MONGODB_URI = process.env.MONGODB_URI ?? '';
export const mongoClient = new MongoClient(MONGODB_URI)

export const agentDb = mongoClient.db("eduardo");
export const vectorCollection = agentDb.collection("mongo_agent");
export const memoryCollection  = agentDb.collection("chat_history");
export const openAiEmbbeding = new OpenAIEmbeddings({apiKey: apiKeyOpenAi,model: 'text-embedding-3-large',});
export const openAIClient = new OpenAI({ apiKey: apiKeyOpenAi,});
export const VOYAGE_MODEL = "voyage-3-large";
export const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
export const OPENAI_MODEL = "gpt-5-2025-08-07";
export const ENABLE_STREAMING = process.env.ENABLE_STREAMING !== 'false'; 


let isMongoConnected = false;

if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log("✅ LangSmith tracing habilitado");
}

export async function ensureMongoConnection() {
    if (!isMongoConnected) {
        try {
            await mongoClient.connect();
            isMongoConnected = true;
            console.log("✅ MongoDB conectado com sucesso!");
            
            mongoClient.on('close', () => {
                isMongoConnected = false;
                console.log("⚠️ MongoDB desconectado");
            });
            
        } catch (error) {
            console.error("❌ Erro ao conectar MongoDB:", error);
            throw error;
        }
    }
}


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

export async function closeMongoConnection() {
    if (isMongoConnected) {
        await mongoClient.close();
        isMongoConnected = false;
        console.log("MongoDB desconectado.");
    }
}
