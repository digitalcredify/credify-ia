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
const fs_1 = require("fs");
const documents_1 = require("@langchain/core/documents");
const textsplitters_1 = require("@langchain/textsplitters");
const google_vertexai_1 = require("@langchain/google-vertexai");
const qdrant_1 = require("@langchain/qdrant");
const runIngestion = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1 -> carregar json
        const filtePath = './dados.json';
        const fileContent = yield fs_1.promises.readFile(filtePath, 'utf-8');
        const data = JSON.parse(fileContent);
        const response = data.data;
        // 2 -> transforma cada item do json em objeto Document Langchain
        const docs = response.map((item) => {
            const userDetails = item.users.map((user) => `[
                    Usuário ID: ${user.id}, 
                    Nome usuário: ${user.name}, 
                    Documento (usuário): ${user.document}, 
                    Totais Consolidados (usuário) - Tickets: ${user.totals.totalTickets}, 
                    Valor Total em Centavos (usuário): ${user.totals.totalValueInCents}, 
                    Custo Total das Fontes/Insumos em Centavos (usuário): ${user.totals.totalSourcesCostInCents}, 
                    Custo com desconto operacional aplicado em centavos (usuário): ${user.totals.totalValueWithDiscountInCents}
                ]`).join('\n');
            const pageContent = `
                CLiente/Empresa ID: ${item.company.id}, 
                Nome da Cliente/Empresa: ${item.company.name}, 
                Documento Cliente/empresa: ${item.company.document}, 
                Tipo Cliente/Empresa: ${item.company.type}, 
                Plano: ${item.plan.name}, 
                Faturamento Mínimo em Centavos: ${item.plan.minimumBillingValueInCents}, 
                Totais Consolidados - Tickets: ${item.totals.totalTickets}, 
                Valor Total em Centavos: ${item.totals.totalValueInCents}, 
                Custo Total das Fontes/Insumos em Centavos: ${item.totals.totalSourcesCostInCents}, 
                Custo com desconto operacional aplicado: ${item.totals.totalValueWithDiscountInCents},
                Detalhes de Usuários: ${userDetails} 
            `;
            return new documents_1.Document({
                pageContent: pageContent,
                metadata: {
                    source: 'dados.json',
                    id: item.company.id
                }
            });
        });
        // 3 -> Chunks: Divide os documentos em pedaços menores (chunks)
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });
        const allSplits = yield splitter.splitDocuments(docs);
        // 4 -> geração de embeddings => transforma chunk em vetores
        const embeddings = new google_vertexai_1.VertexAIEmbeddings({
            model: "text-embedding-004"
        });
        const url = 'https://1ca3a0cf-f1d1-4081-832c-b294faa02302.europe-west3-0.gcp.cloud.qdrant.io:6333';
        const apiKeyVector = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.K9vdzQd1iDbrViATVmfv1E0qbCoEAIDNbnOQiMwynzo';
        const vectorStore = yield qdrant_1.QdrantVectorStore.fromExistingCollection(embeddings, {
            url: url,
            apiKey: apiKeyVector,
            collectionName: "credify-teste",
        });
        console.log(vectorStore);
    }
    catch (error) {
        console.log("Ocorreu um erro:", error);
    }
});
runIngestion();
