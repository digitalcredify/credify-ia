"use strict";
/**
 * @fileoverview
 * recebe a requisição, valida os dados de entrada, decide se é com ou sem streaming e chama o operationAgentService
 * oq é streaming?: envia a resposta em chunks (pedaços de texto), igual ao chatGPT
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
exports.operationAgentController = void 0;
const config_1 = require("../config");
const operationAgentService_1 = require("../service/operationAgentService");
const operationAgentController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pergunta, jsonData, startDate, endDate, startHour, endHour } = req.body;
        if (!pergunta || !jsonData || !startDate || !endDate) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, jsonData, startDate, endDate"
            });
        }
        console.log(`📝 Pergunta recebida: "${pergunta}"`);
        console.log(`📅 Range: ${startDate} a ${endDate}`);
        console.log(`🔄 Streaming: ${config_1.ENABLE_STREAMING ? 'HABILITADO' : 'DESABILITADO'}`);
        // fluxo  com streaming.
        if (config_1.ENABLE_STREAMING) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.flushHeaders();
            let fullResponse = "";
            const chunk = (chunk) => {
                fullResponse += chunk;
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
                res.write(sseMessage);
            };
            try {
                yield (0, operationAgentService_1.operationAgentService)(pergunta, jsonData, startDate, endDate, startHour, endHour, chunk);
                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`); // fim do streaming
                res.end();
            }
            catch (error) {
                console.error("[Controller] Erro ao gerar resposta:", error);
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end();
            }
        }
        else {
            try {
                const response = yield (0, operationAgentService_1.operationAgentService)(pergunta, jsonData, startDate, endDate, startHour, endHour);
                res.status(200).json({
                    success: true,
                    response: response
                });
            }
            catch (error) {
                console.error("[Controller] Erro na variável de streaming:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: error instanceof Error ? error.message : "Erro interno do servidor"
                    });
                }
            }
        }
    }
    catch (error) {
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }
    }
});
exports.operationAgentController = operationAgentController;
