"use strict";
/**
 * @fileoverview
 * este arquivo é onde é configurado as credências dos clientes.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_MODEL = exports.QDRANT_COLLECTION_NAME = exports.ENABLE_STREAMING = exports.advancedModel = exports.balancedModel = exports.fastModel = exports.openAiEmbbeding = exports.qdrantClient = exports.openAIClient = exports.qdrantApiKey = exports.qdrantUrl = exports.apiKeyOpenAi = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const js_client_rest_1 = require("@qdrant/js-client-rest");
const openai_2 = require("@langchain/openai");
dotenv_1.default.config();
exports.apiKeyOpenAi = process.env.API_KEY;
exports.qdrantUrl = process.env.QDRANT_URL;
exports.qdrantApiKey = process.env.QDRANT_API_KEY;
exports.openAIClient = new openai_1.default({ apiKey: exports.apiKeyOpenAi });
// cliente qdrant
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: exports.qdrantUrl,
    apiKey: exports.qdrantApiKey,
});
exports.openAiEmbbeding = new openai_2.OpenAIEmbeddings({
    apiKey: exports.apiKeyOpenAi,
    model: 'text-embedding-3-large',
});
exports.fastModel = new openai_2.ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    apiKey: exports.apiKeyOpenAi
});
exports.balancedModel = new openai_2.ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    apiKey: exports.apiKeyOpenAi
});
exports.advancedModel = new openai_2.ChatOpenAI({
    model: "gpt-5",
    apiKey: exports.apiKeyOpenAi
});
exports.ENABLE_STREAMING = process.env.ENABLE_STREAMING !== 'false'; // habilita streaming assim por enquanto
exports.QDRANT_COLLECTION_NAME = "credify_ia_collection";
exports.OPENAI_MODEL = "gpt-5-2025-08-07";
// habilita langsmith
if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log("✅ LangSmith tracing habilitado");
}
