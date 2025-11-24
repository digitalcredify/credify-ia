"use strict";
/**
 * @fileoverview
 * Operation Web Agent - Agente especializado em responder perguntas sobre dados operacionais
 * Similar ao webAgent.ts, mas adaptado para trabalhar com ranges de datas
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOperationWebAgent = void 0;
const operationPlanning_1 = require("src/operationPlanning");
const ingest_operation_data_1 = require("../scripts/ingest-operation-data");
/**
 * Executa o Operation Web Agent
 * @param pergunta - Pergunta do usuário
 * @param jsonData - Dados operacionais do dashboard
 * @param startDate - Data inicial do range
 * @param endDate - Data final do range
 * @param onChunk - Callback para streaming de resposta
 */
const runOperationWebAgent = (pergunta, jsonData, startDate, endDate, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Operation Web Agent] Iniciando processamento com Qdrant...");
        console.log(`[Operation Web Agent] Range solicitado: ${startDate} a ${endDate}`);
        // Verifica se o range solicitado já está contido em algum range existente
        const rangeExists = yield (0, ingest_operation_data_1.checkIfRangeExists)(startDate, endDate);
        if (rangeExists) {
            console.log(`[Operation Web Agent] ✅ Range já existe no Qdrant, usando dados existentes.`);
        }
        else {
            console.log(`[Operation Web Agent] 🔄 Range não encontrado, iniciando ingestão...`);
            yield (0, ingest_operation_data_1.ingestOperationData)(jsonData, startDate, endDate);
            console.log(`[Operation Web Agent] ✅ Ingestão concluída`);
        }
        // Gera a resposta usando os dados do Qdrant
        const response = yield (0, operationPlanning_1.generateOperationResponse)(startDate, endDate, pergunta, onChunk);
        return response;
    }
    catch (error) {
        console.error("[Operation Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro ao processar sua solicitação.";
    }
});
exports.runOperationWebAgent = runOperationWebAgent;
