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
exports.operationAgentService = void 0;
const routerAgent_1 = require("../agents/routerAgent");
const operationWebAgent_1 = require("../agents/operations/operationWebAgent");
const operationAgentService = (pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Operation Agent Service] Iniciando processamento...");
        console.log(`[Operation Agent Service] Pergunta: "${pergunta}"`);
        console.log(`[Operation Agent Service] Range: ${startDate} a ${endDate}`);
        if (startHour !== undefined && endHour !== undefined) {
            console.log(`[Operation Agent Service] Horas: ${startHour}h a ${endHour}h`);
        }
        const routeDecision = yield (0, routerAgent_1.runRouterAgent)(pergunta);
        switch (routeDecision.routerName) {
            case 'web_agent':
                console.log("[Operation Agent Service] Roteando para Operation Web Agent");
                return yield (0, operationWebAgent_1.runOperationWebAgent)(pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk);
            // case "pdf_agent":
            //     console.log("[Operation Agent Service] Roteando para PDF Agent");
            //     const sessionId = `operation_${startDate}_${endDate}`;
            //     return await runPdfAgent(sessionId, pergunta);
            default:
                console.log("[Operation Agent Service] Rota não reconhecida, usando Web Agent como fallback");
                return yield (0, operationWebAgent_1.runOperationWebAgent)(pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk);
        }
    }
    catch (error) {
        console.error("[Operation Agent Service] Erro:", error);
        throw error;
    }
});
exports.operationAgentService = operationAgentService;
