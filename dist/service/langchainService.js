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
Object.defineProperty(exports, "__esModule", { value: true });
require("cheerio");
const google_genai_1 = require("@langchain/google-genai");
const google_vertexai_1 = require("@langchain/google-vertexai");
const qdrant_1 = require("@langchain/qdrant");
const hub_1 = require("langchain/hub");
const langgraph_1 = require("@langchain/langgraph");
const StateAnnotation = langgraph_1.Annotation.Root({
    question: (langgraph_1.Annotation),
    context: (langgraph_1.Annotation),
    answer: (langgraph_1.Annotation),
});
const runAgent = (pergunta) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(pergunta);
        const LANGSMITH_TRACING = "true";
        const LANGSMITH_API_KEY = "...";
        const apiKey = 'AIzaSyALejF1m8nZDGqdPeXb0UkS15eMaU2GxNU';
        const CREDENTIALS = 'credentials.json';
        // 1 -> LLM -> Configurar LLM
        const llm = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            temperature: 0.1,
            apiKey: apiKey
        });
        //2 -> Embedding model -> Definir modelo de Embbedding.
        const embeddings = new google_vertexai_1.VertexAIEmbeddings({
            model: "text-embedding-004"
        });
        // 3) Conectar -> Conectar ao vector store ja existente.
        const url = 'https://1ca3a0cf-f1d1-4081-832c-b294faa02302.europe-west3-0.gcp.cloud.qdrant.io:6333';
        const apiKeyVector = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.K9vdzQd1iDbrViATVmfv1E0qbCoEAIDNbnOQiMwynzo';
        const vectorStore = yield qdrant_1.QdrantVectorStore.fromExistingCollection(embeddings, {
            url: url,
            apiKey: apiKeyVector,
            collectionName: "credify-teste",
        });
        // 4) Retrieve -> Definir nó de recuperação (busca de documentos relevante)
        const retrieve = (state) => __awaiter(void 0, void 0, void 0, function* () {
            const retrievedDocs = yield vectorStore.similaritySearch(state.question, 4);
            return { context: retrievedDocs };
        });
        // 5) generate -> Nó que gera a resposta final com base no retrieve.
        const generate = (state) => __awaiter(void 0, void 0, void 0, function* () {
            const promptTemplate = yield (0, hub_1.pull)('rlm/rag-prompt');
            const docsContent = state.context.map(doc => doc.pageContent).join("\n---\n");
            const messages = yield promptTemplate.invoke({
                question: state.question,
                context: docsContent
            });
            const response = yield llm.invoke(messages);
            return { answer: response.content };
        });
        const graph = new langgraph_1.StateGraph(StateAnnotation)
            .addNode("retrieve", retrieve)
            .addNode("generate", generate)
            .addEdge("__start__", "retrieve")
            .addEdge("retrieve", "generate")
            .addEdge("generate", "__end__")
            .compile();
        const result = yield graph.invoke({ question: pergunta });
        return result.answer;
    }
    catch (error) {
        console.error("Erro ao contactar a IA:", error);
        throw new Error("Falha ao processar a pergunta com a IA.");
    }
});
exports.default = runAgent;
