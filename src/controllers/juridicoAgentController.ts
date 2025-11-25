/**
 * @fileoverview
 * Controller para o agente jurídico
 * Recebe requisições de chat jurídico e as processa
 */

import { Request, Response } from 'express';
import juridicoAgentService from '../service/juridicoAgentService';
import { ENABLE_STREAMING } from '../config';
import { ingestJuridicoData } from '../scripts/juridico/ingest-juridico-data';

/**
 * Controller para processar perguntas jurídicas
 * POST /juridico-chat
 */
export const juridicoAgentController = async (req: Request, res: Response) => {
    try {
        const { pergunta } = req.body;

        // Validações
        if (!pergunta) {
            return res.status(400).json({
                error: "Campo obrigatório: pergunta"
            });
        }

        console.log(`📝 [Juridico Controller] Pergunta recebida: "${pergunta}"`);
        console.log(`🔄 [Juridico Controller] Streaming: ${ENABLE_STREAMING ? 'HABILITADO' : 'DESABILITADO'}`);

        // Fluxo com streaming
        if (ENABLE_STREAMING) {
            /**
             * Configuração de cabeçalhos HTTP para Server-Sent Events (SSE)
             * SSE: mantém a conexão aberta para enviar múltiplos eventos
             */
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            // Envia o cabeçalho IMEDIATAMENTE para o cliente
            res.flushHeaders();

            let fullResponse = "";

            /**
             * Callback chamado pelo serviço cada vez que há um novo chunk
             */
            const onChunk = (chunk: string) => {
                fullResponse += chunk;

                // Formata para o padrão SSE
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;

                // Envia o evento SSE parcial sem finalizar a conexão
                res.write(sseMessage);
            };

            try {
                await juridicoAgentService(pergunta, onChunk);

                // Avisa que o streaming acabou
                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
                res.end();

                console.log(`✅ [Juridico Controller] Resposta enviada com sucesso (${fullResponse.length} caracteres)`);

            } catch (error) {
                console.error("❌ [Juridico Controller] Erro ao gerar resposta:", error);
                
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end();
            }
        } 
        else {
            // Fluxo sem streaming
            try {
                const response = await juridicoAgentService(pergunta);

                // Envia a resposta para o cliente
                res.status(200).json({
                    success: true,
                    response: response
                });

            } catch (error) {
                console.error("❌ [Juridico Controller] Erro ao gerar resposta:", error);
                
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            }
        }

    } catch (error) {
        console.error("❌ [Juridico Controller] Erro geral:", error);
        
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }
    }
};

/**
 * Controller para ingestão de dados jurídicos
 * POST /juridico-ingest
 */
export const juridicoIngestController = async (req: Request, res: Response) => {
    try {
        const { jsonData } = req.body;

        if (!jsonData) {
            return res.status(400).json({ 
                error: "JSON de dados é obrigatório." 
            });
        }


        const result = await ingestJuridicoData(jsonData);

        res.status(200).json({
            success: true,
            sessionId: result.sessionId,
            count: result.count,
            message: `${result.count} documentos jurídicos ingeridos com sucesso.`
        });

    } catch (error) {
        console.error("[Juridico Controller] Erro na ingestão:", error);
        res.status(500).json({ 
            error: "Erro interno na ingestão jurídica.",
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
