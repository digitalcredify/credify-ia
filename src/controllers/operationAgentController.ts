/**
 * @fileoverview 
 * recebe a requisição, valida os dados de entrada, decide se é com ou sem streaming e chama o operationAgentService
 * oq é streaming?: envia a resposta em chunks (pedaços de texto), igual ao chatGPT
 */

import { Request, Response } from 'express';
import { ENABLE_STREAMING } from '../config';
import agentService from 'src/service/agentService';


export const operationAgentController = async (req: Request, res: Response) => {

    try {

        const { pergunta, jsonData, startDate, endDate, startHour, endHour } = req.body;


        if (!pergunta || !jsonData || !startDate || !endDate || !startHour || !endHour) {

            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, jsonData, startDate, endDate, startHour, endHour"
            })
        }

        // fluxo  com streaming.
        if (ENABLE_STREAMING) {

            /**
             * configuranção de cabecalhos HTTP para um conexão Server-sant Events(SSE)
             * SSE: mantém a conexão aberta para que o servidor possa enviar múltipos eventos.
            */
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // envia o cabeçalho IMEDIATAMENTE para o cliente.
            res.flushHeaders();

            let fullResponse = "";

            // callBack. será chamada pelo Service tpda vez que o llm gerar um novo chunk.
            const chunk = (chunk: string) => {
                fullResponse += chunk
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
                res.write(sseMessage);
            }

            try {
                // await operationAgentService(pergunta, jsonData, startDate, endDate, startHour, endHour, chunk)

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
                // const response = await operationAgentService(pergunta, jsonData, startDate, endDate, startHour, endHour)

                res.status(200).json({
                    success: true,
                    response: 'response'
                })


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

    }
}