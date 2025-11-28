"use strict";
/**
 * @fileoverview
 * este arquivo é onde é configurado as credências dos clientes.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_MODEL = exports.QDRANT_COLLECTION_NAME = exports.ENABLE_STREAMING = exports.advancedModel = exports.balancedModel = exports.fastModel = exports.addDocuments = exports.qdrantClient = exports.openAIClient = exports.openAiEmbbeding = exports.qdrantApiKey = exports.qdrantUrl = exports.apiKeyOpenAi = void 0;
exports.collectionExists = collectionExists;
exports.createCollecion = createCollecion;
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const js_client_rest_1 = require("@qdrant/js-client-rest");
const openai_2 = require("@langchain/openai");
const traceable_1 = require("langsmith/traceable");
dotenv_1.default.config();
exports.apiKeyOpenAi = process.env.API_KEY;
exports.qdrantUrl = process.env.QDRANT_URL;
exports.qdrantApiKey = process.env.QDRANT_API_KEY;
exports.openAiEmbbeding = new openai_2.OpenAIEmbeddings({
    apiKey: exports.apiKeyOpenAi,
    model: 'text-embedding-3-small',
});
exports.openAIClient = new openai_1.default({ apiKey: exports.apiKeyOpenAi });
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: exports.qdrantUrl,
    apiKey: exports.qdrantApiKey,
});
// verifica se a collection ja existe
function collectionExists(collectionName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.qdrantClient.getCollection(collectionName);
            return true;
        }
        catch (error) {
            return false;
        }
    });
}
// cria coleção
function createCollecion(collectionName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1536,
                    distance: "Cosine"
                }
            });
            console.log(`[Qdrant] ✅ Coleção ${collectionName} criada com sucesso.`);
        }
        catch (error) {
            if (error.message && error.message.includes("already exists")) {
                console.log(`[Qdrant] A coleção ${collectionName} já existe.`);
            }
            else {
                throw error;
            }
        }
    });
}
exports.addDocuments = (0, traceable_1.traceable)(function addDocuments(vectorStore, documents) {
    return __awaiter(this, void 0, void 0, function* () {
        yield vectorStore.addDocuments(documents);
    });
}, { name: "Adicionando documentos - Operações", run_type: "adding_documents" });
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
