"use strict";
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_MODEL = exports.VOYAGE_API_KEY = exports.VOYAGE_MODEL = exports.openAIClient = exports.openAiEmbbeding = exports.memoryCollection = exports.vectorCollection = exports.agentDb = exports.mongoClient = exports.MONGODB_URI = exports.apiKeyOpenAi = void 0;
exports.ensureMongoConnection = ensureMongoConnection;
exports.closeMongoConnection = closeMongoConnection;
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
const openai_1 = __importDefault(require("openai"));
const openai_2 = require("@langchain/openai");
dotenv_1.default.config();
exports.apiKeyOpenAi = process.env.API_KEY;
exports.MONGODB_URI = (_a = process.env.MONGODB_URI) !== null && _a !== void 0 ? _a : '';
exports.mongoClient = new mongodb_1.MongoClient(exports.MONGODB_URI);
exports.agentDb = exports.mongoClient.db("eduardo");
exports.vectorCollection = exports.agentDb.collection("mongo_agent");
exports.memoryCollection = exports.agentDb.collection("chat_history");
exports.openAiEmbbeding = new openai_2.OpenAIEmbeddings({ apiKey: exports.apiKeyOpenAi, model: 'text-embedding-3-large', });
exports.openAIClient = new openai_1.default({ apiKey: exports.apiKeyOpenAi, });
exports.VOYAGE_MODEL = "voyage-3-large";
exports.VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
exports.OPENAI_MODEL = "gpt-5-2025-08-07";
let isMongoConnected = false;
function ensureMongoConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isMongoConnected) {
            try {
                yield exports.mongoClient.connect();
                isMongoConnected = true;
                console.log("✅ MongoDB conectado com sucesso!");
                exports.mongoClient.on('close', () => {
                    isMongoConnected = false;
                    console.log("⚠️ MongoDB desconectado");
                });
            }
            catch (error) {
                console.error("❌ Erro ao conectar MongoDB:", error);
                throw error;
            }
        }
    });
}
function closeMongoConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isMongoConnected) {
            yield exports.mongoClient.close();
            isMongoConnected = false;
            console.log("MongoDB desconectado.");
        }
    });
}
