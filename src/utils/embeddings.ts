import { OpenAIEmbeddings } from "@langchain/openai";
import dotenv from 'dotenv';


dotenv.config();
const apiKey = process.env.API_KEY;

export const openAiEmbbeding = new OpenAIEmbeddings({
    apiKey: apiKey,
    model: 'text-embedding-3-small',
});