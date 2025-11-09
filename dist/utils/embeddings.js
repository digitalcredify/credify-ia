"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAiEmbbeding = void 0;
const openai_1 = require("@langchain/openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.API_KEY;
exports.openAiEmbbeding = new openai_1.OpenAIEmbeddings({
    apiKey: apiKey,
    model: 'text-embedding-3-large',
});
