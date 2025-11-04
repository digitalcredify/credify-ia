import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";





// arquivo com variaveis de ambiente e que conecta aplicações a serviços..
// Ex: Banco de dados, openAI

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

let isMongoConnected = false;

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


export async function closeMongoConnection() {
    if (isMongoConnected) {
        await mongoClient.close();
        isMongoConnected = false;
        console.log("MongoDB desconectado.");
    }
}











