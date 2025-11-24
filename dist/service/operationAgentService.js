"use strict";
/**
 * @fileoverview
 * este arquivo atua como um roteador inteligente para o Operation Agent
 * Web Agent: acionado quando é feita perguntas sobre dados operacionais
 * PDF Agent: acionado quando o usuário pede explicitamente por um pdf
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
exports.operationAgentService = void 0;
const routerAgent_1 = require("../agents/routerAgent");
const pdfAgent_1 = require("../agents/pdfAgent");
const operationWebAgent_1 = require("../agents/operationWebAgent");
const operationAgentService = (pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Operation Agent Service] Iniciando processamento...");
        console.log(`[Operation Agent Service] Pergunta: "${pergunta}"`);
        console.log(`[Operation Agent Service] Range: ${startDate} a ${endDate}`);
        // Classifica a intenção do usuário
        const routeDecision = yield (0, routerAgent_1.runRouterAgent)(pergunta);
        switch (routeDecision.routerName) {
            case 'web_agent':
                console.log("[Operation Agent Service] Roteando para Operation Web Agent");
                return yield (0, operationWebAgent_1.runOperationWebAgent)(pergunta, jsonData, startDate, endDate, onChunk);
            case "pdf_agent":
                console.log("[Operation Agent Service] Roteando para PDF Agent");
                // Usa uma sessionId baseada no range de datas para o PDF Agent
                const sessionId = `operation_${startDate}_${endDate}`;
                return yield (0, pdfAgent_1.runPdfAgent)(sessionId, pergunta);
            default:
                console.log("[Operation Agent Service] Rota não reconhecida, usando Web Agent como fallback");
                return yield (0, operationWebAgent_1.runOperationWebAgent)(pergunta, jsonData, startDate, endDate, onChunk);
        }
    }
    catch (error) {
        console.error("[Operation Agent Service] Erro:", error);
        throw error;
    }
});
exports.operationAgentService = operationAgentService;
