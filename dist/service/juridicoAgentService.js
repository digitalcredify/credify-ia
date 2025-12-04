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
exports.juridicoAgentService = void 0;
const routerAgent_1 = require("../agents/routerAgent");
const runJuridicoWebAgent_1 = require("../agents/juridico/runJuridicoWebAgent");
const pdfAgent_1 = require("../agents/pdfAgent");
const juridicoAgentService = (pergunta, document, name, userId, sessionId, historyManager, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Juridico Service] Iniciando processamento...");
        const routerDecision = yield (0, routerAgent_1.runRouterAgent)(pergunta);
        switch (routerDecision.routerName) {
            case 'web_agent':
                console.log("[Juridico Service] Roteando para Jurídico Web Agent");
                return yield (0, runJuridicoWebAgent_1.runJuridicoWebAgent)(pergunta, document, name, userId, sessionId, historyManager, onChunk);
            case 'pdf_agent':
                console.log('[Juridico Service] Roteando para Jurídico PDF Agent');
                const pdfResult = yield (0, pdfAgent_1.runPdfAgent)(sessionId, userId, pergunta); // ← Adicione userId
                if (pdfResult.error) {
                    return pdfResult.message;
                }
                return JSON.stringify({
                    message: "PDF gerado com sucesso!",
                    pdf: {
                        base64: pdfResult.base64,
                        filename: pdfResult.filename,
                        mimeType: pdfResult.mimeType
                    }
                });
            default:
                console.log("[Juridico Service] Rota não reconhecida, usando Jurídico Web Agent como fallback");
                return yield (0, runJuridicoWebAgent_1.runJuridicoWebAgent)(pergunta, name, document, userId, sessionId, historyManager, onChunk);
        }
    }
    catch (error) {
        console.error("[Juridico Service] Erro:", error);
        throw error;
    }
});
exports.juridicoAgentService = juridicoAgentService;
