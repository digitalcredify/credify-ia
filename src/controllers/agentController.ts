/**
 * @fileoverview 
 * recebe a requisição, valida os dados de entrada, decide se é com ou sem streaming e chama o agentService
 * oq é streaming?: envia a resposta em chunks (pedaços de texto), igual ao chatGPT
 */

import { Request, Response } from 'express';
import agentService from '../service/agentService';
import { ENABLE_STREAMING } from '../config';

export const agentController = async (req: Request, res: Response) => {
    try {
        const { pergunta, jsonData, targetMonth } = req.body;

        if (!pergunta || !jsonData || !targetMonth) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, jsonData, targetMonth"
            });
        }

        console.log(`📝 Pergunta recebida: "${pergunta}"`);
        console.log(`📅 Mês alvo: ${targetMonth}`);
        console.log(`🔄 Streaming: ${ENABLE_STREAMING ? 'HABILITADO' : 'DESABILITADO'}`);


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

            // callBack. será chamada pelo agentService tpda vez que o llm gerar um novo chunk.
            const onChunk = (chunk: string) => {

                fullResponse += chunk; // adiciona um novo pedaço pedaço a resposta final.

                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`; // formata para o padrão SSE já convertido em JSON.

                res.write(sseMessage); // envia o evento SSE parcial para o cliente sem finalizar a conexão, permitindo transmitir dados em tempo real.
            };

            try {
                await agentService(pergunta, jsonData, targetMonth, onChunk); 

                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`); // avisa para o cliente que o streaming acabou.
                res.end(); // fecha a conexão

                console.log(`✅ Resposta enviada com sucesso (${fullResponse.length} caracteres)`);

            } catch (error) {
                console.error("❌ Erro ao gerar resposta:", error);
                
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end();
            }
        } 
        else { 
            
            // fluxo sem streaming
            try {
                const response = await agentService(pergunta, jsonData, targetMonth); // chama o agentService sem o chunk

                // envia a resposta para o cliente
                res.status(200).json({
                    success: true,
                    response: response
                });


            } catch (error) {
                console.error("❌ Erro ao gerar resposta:", error);
                
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            }
        }

    } catch (error) {
        console.error("❌ Erro no agentController:", error);
        
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }
    }
};
