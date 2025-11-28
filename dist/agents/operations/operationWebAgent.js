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
exports.runOperationWebAgent = void 0;
const operationPlanning_1 = require("../../plannings/operation/operationPlanning");
const ingest_operation_data_1 = require("../../scripts/operations/ingest-operation-data");
const runOperationWebAgent = (pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Operation Web Agent] Iniciando processamento com Qdrant...");
        console.log(`[Operation Web Agent] Range solicitado: ${startDate} a ${endDate}`);
        if (startHour !== undefined && endHour !== undefined) {
            console.log(`[Operation Web Agent] Filtro de horas: ${startHour}h a ${endHour}h`);
        }
        const rangeExists = yield (0, ingest_operation_data_1.checkIfRangeExists)(startDate, endDate, startHour, endHour);
        if (rangeExists) {
            console.log(`[Operation Web Agent] ✅ Range já existe no Qdrant, usando dados existentes.`);
        }
        else {
            console.log(`[Operation Web Agent] 🔄 Range não encontrado, iniciando ingestão...`);
            yield (0, ingest_operation_data_1.ingestOperationData)(jsonData, startDate, endDate, startHour, endHour);
            console.log(`[Operation Web Agent] ✅ Ingestão concluída`);
        }
        const response = yield (0, operationPlanning_1.generateOperationResponse)(startDate, endDate, startHour, endHour, pergunta, onChunk);
        return response;
    }
    catch (error) {
        console.error("[Operation Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro ao processar sua solicitação.";
    }
});
exports.runOperationWebAgent = runOperationWebAgent;
