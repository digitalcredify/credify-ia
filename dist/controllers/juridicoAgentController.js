"use strict";
/**
 * @fileoverview
 * Controller para o agente jurídico
 * Recebe requisições de chat jurídico e as processa
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
exports.juridicoIngestController = exports.juridicoAgentController = void 0;
const config_1 = require("../config");
const ingest_juridico_data_1 = require("../scripts/juridico/ingest-juridico-data");
const juridicoAgentService_1 = require("../service/juridicoAgentService");
const juridicoAgentController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pergunta, document, name } = req.body;
        if (!pergunta || !document || !name) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, documento e nome"
            });
        }
        console.log(`📝 [Juridico Controller] Pergunta recebida: "${pergunta}"`);
        console.log(`📄 [Juridico Controller] Documento: ${document}`);
        console.log(`🏷️ [Juridico Controller] Nome: ${name}`);
        console.log(`🔄 [Juridico Controller] Streaming: ${config_1.ENABLE_STREAMING ? 'HABILITADO' : 'DESABILITADO'}`);
        // fluxo com streaming
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
                yield (0, juridicoAgentService_1.juridicoAgentService)(pergunta, document, name, chunk);
                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`); // fim do streaming
                res.end();
            }
            catch (error) {
                console.error("[Jurídico Controller] Erro ao gerar resposta:", error);
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end();
            }
        }
        else {
            try {
                const response = yield (0, juridicoAgentService_1.juridicoAgentService)(pergunta, document, name);
                res.status(200).json({
                    success: true,
                    response: response
                });
            }
            catch (error) {
                console.error("[Juridico Controller] Erro na variável de streaming:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: error instanceof Error ? error.message : "Erro interno do servidor"
                    });
                }
            }
        }
    }
    catch (error) {
        console.error("❌ [Juridico Controller] Erro geral:", error);
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }
    }
});
exports.juridicoAgentController = juridicoAgentController;
const juridicoIngestController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jsonData, document, name } = req.body;
        if (!jsonData || !document || !name) {
            return res.status(400).json({
                error: "JSON ou documento ou pergunta é obrigatório."
            });
        }
        const result = yield (0, ingest_juridico_data_1.ingestJuridicoData)(jsonData, document, name);
        res.status(200).json({
            success: true,
            sessionId: result.sessionId,
            count: result.count,
            message: `${result.count} documentos jurídicos ingeridos com sucesso.`
        });
    }
    catch (error) {
        console.error("[Juridico Controller] Erro na ingestão:", error);
        res.status(500).json({
            error: "Erro interno na ingestão jurídica.",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.juridicoIngestController = juridicoIngestController;
