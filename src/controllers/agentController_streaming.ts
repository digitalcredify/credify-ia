import { Request, Response } from 'express';
import { generateResponse } from '../planning/planning_streaming';

export const agentControllerStreaming = async (req: Request, res: Response) => {
    try {
        const { pergunta, jsonData, targetMonth } = req.body;

        if (!pergunta || !jsonData || !targetMonth) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, jsonData, targetMonth"
            });
        }

        console.log(`📝 Pergunta recebida: "${pergunta}"`);
        console.log(`📅 Mês alvo: ${targetMonth}`);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*'); 

        res.flushHeaders();

        let fullResponse = "";

        const onChunk = (chunk: string) => {
            fullResponse += chunk;
            const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
            res.write(sseMessage);
        };

        try {
            // ✅ Chama generateResponse com streaming
            await generateResponse(
                targetMonth,
                pergunta,
                onChunk
            );

            // ✅ Envia mensagem final indicando conclusão
            res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
            res.end();

            console.log(`✅ Resposta enviada com sucesso (${fullResponse.length} caracteres)`);

        } catch (error) {
            console.error("❌ Erro ao gerar resposta:", error);

            // Envia erro via SSE
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error("❌ Erro no agentController:", error);

        // Se ainda não enviou headers, envia erro JSON normal
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : "Erro interno do servidor"
            });
        }
    }
};
