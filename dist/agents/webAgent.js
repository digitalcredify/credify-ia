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
exports.runWebAgent = void 0;
const ingest_data_1 = require("../scripts/ingest-data");
const planning_1 = require("../planning");
const dateUtils_1 = require("../utils/dateUtils");
const runWebAgent = (pergunta, jsonData, targetMonth, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Não é mais necessário conectar ao MongoDB, o Qdrant é gerenciado automaticamente
        console.log("[Web Agent] Iniciando processamento com Qdrant...");
        const isCurrentMonthFlag = (0, dateUtils_1.isCurrentMonth)(targetMonth);
        if (isCurrentMonthFlag) {
            console.log(`[Web Agent] ⚠️ Mês atual detectado (${targetMonth})`);
            console.log(`[Web Agent] 🔄 Reingerindo dados (dados dinâmicos)...`);
            yield (0, ingest_data_1.ingestData)(jsonData, targetMonth);
            // createVectorIndex não é mais necessário, o QdrantVectorStore cria a coleção automaticamente
            console.log(`[Web Agent] ✅ Reingestão concluída`);
        }
        else {
            const dataExists = yield (0, ingest_data_1.checkIfDataExists)(targetMonth);
            if (!dataExists) {
                console.log(`[Web Agent] Iniciando ingestão para ${targetMonth}...`);
                yield (0, ingest_data_1.ingestData)(jsonData, targetMonth);
            }
            else {
                console.log(`[Web Agent] Dados para ${targetMonth} já existem.`);
            }
        }
        // Gera a resposta usando os dados do Qdrant
        const response = yield (0, planning_1.generateResponse)(targetMonth, pergunta, onChunk);
        return response;
    }
    catch (error) {
        console.error("[Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro.";
    }
});
exports.runWebAgent = runWebAgent;
