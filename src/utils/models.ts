import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();
const apiKey = process.env.API_KEY;

export const basicModel = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: apiKey
})

export const middleModel = new ChatOpenAI({
    model: "gpt-4o",
    apiKey: apiKey
});
export const advancedModel = new ChatOpenAI({
    model: "gpt-5",
    apiKey: apiKey,
  
});
