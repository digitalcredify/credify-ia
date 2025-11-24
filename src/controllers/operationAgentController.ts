/**
 * @fileoverview 
 * recebe a requisição, valida os dados de entrada, decide se é com ou sem streaming e chama o operationAgentService
 * oq é streaming?: envia a resposta em chunks (pedaços de texto), igual ao chatGPT
 */

import { Request, Response } from 'express';
import { ENABLE_STREAMING } from '../config';
import { operationAgentService } from '../service/operationAgentService';


export const operationAgentController = async (req: Request, res: Response) => {

    try {

        const { pergunta, jsonData, startDate, endDate, startHour, endHour } = req.body;

        if (!pergunta || !jsonData || !startDate || !endDate) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, jsonData, startDate, endDate"
            });
        }

        console.log(`📝 Pergunta recebida: "${pergunta}"`);
        console.log(`📅 Range: ${startDate} a ${endDate}`);
        console.log(`🔄 Streaming: ${ENABLE_STREAMING ? 'HABILITADO' : 'DESABILITADO'}`);

        // fluxo  com streaming.
        if (ENABLE_STREAMING) {

          
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            res.flushHeaders();

            let fullResponse = "";

            const chunk = (chunk: string) => {
                fullResponse += chunk
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
                res.write(sseMessage);
            }

            try {
                await operationAgentService(pergunta, jsonData, startDate, endDate, startHour, endHour, chunk)

                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`); // fim do streaming
                res.end()

            } catch (error) {
                console.error("[Controller] Erro ao gerar resposta:", error);

                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end()

            }
        }
        else {

            try {
                const response = await operationAgentService(pergunta, jsonData, startDate, endDate, startHour, endHour);

                res.status(200).json({
                    success: true,
                    response: response
                });


            } catch (error) {
                console.error("[Controller] Erro na variável de streaming:", error);


                if (!res.headersSent) {
                    res.status(500).json({
                        error: error instanceof Error ? error.message : "Erro interno do servidor"
                    });
                }

            }
        }







    } catch (error) {
         if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }

    }
}


