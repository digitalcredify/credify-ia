/**
 * @fileoverview 
 * este arquivo é onde é configurado as credências dos clientes.
 */

import dotenv from 'dotenv';
import OpenAI from "openai";
import { QdrantClient } from '@qdrant/js-client-rest';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";




dotenv.config();

export const apiKeyOpenAi = process.env.API_KEY;
export const qdrantUrl = process.env.QDRANT_URL;
export const qdrantApiKey = process.env.QDRANT_API_KEY;

export const openAIClient = new OpenAI({ apiKey: apiKeyOpenAi });

// cliente qdrant
export const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey,
});

export const openAiEmbbeding = new OpenAIEmbeddings({
    apiKey: apiKeyOpenAi,
    model: 'text-embedding-3-large',
});


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
