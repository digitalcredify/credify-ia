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

        if (ENABLE_STREAMING) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            res.flushHeaders();

            let fullResponse = "";

            // ✅ Callback para streaming
            const onChunk = (chunk: string) => {
                fullResponse += chunk;
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
                res.write(sseMessage);
            };

            try {
                await agentService(pergunta, jsonData, targetMonth, onChunk);

                res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
                res.end();

                console.log(`✅ Resposta enviada com sucesso (${fullResponse.length} caracteres)`);

            } catch (error) {
                console.error("❌ Erro ao gerar resposta:", error);
                
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end();
            }
        } else {
            // ✅ Modo NÃO-STREAMING: Resposta JSON tradicional
            try {
                const response = await agentService(pergunta, jsonData, targetMonth);

                res.status(200).json({
                    success: true,
                    response: response
                });

                // console.log(`✅ Resposta enviada com sucesso (${response.length} caracteres)`);

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
