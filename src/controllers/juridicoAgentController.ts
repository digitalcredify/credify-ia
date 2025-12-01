/**
 * @fileoverview
 * Controller para o agente jurídico
 * Recebe requisições de chat jurídico e as processa
 */

import { Request, Response } from 'express';

import { ENABLE_STREAMING, getDatabase } from '../config';
import { ingestJuridicoData } from '../scripts/juridico/ingest-juridico-data';
import { juridicoAgentService } from '../service/juridicoAgentService';
import { ingestJuridicoDetailedData } from '../scripts/juridico/ingest-juridico-detailed-data';
import { ChatConversationService } from '../service/chatConversationService';
import { ConversationCacheManager } from '../service/cacheManager';
import { ConversationHistoryManager } from '../service/conversationHistoryManager';


const mongoDb = getDatabase();  
const mongoService = new ChatConversationService(mongoDb);
const cacheManager = new ConversationCacheManager();
const historyManager = new ConversationHistoryManager(mongoService, cacheManager);

export const juridicoAgentController = async (req: Request, res: Response) => {
    try {
        const { pergunta, document, name, sessionId, userId } = req.body;
        
        
        if (!pergunta || !document || !name || !userId) {
            return res.status(400).json({
                error: "Campos obrigatórios: pergunta, documento, nome e usuário autenticado"
            });
        }
        
        console.log(`📝 [Juridico Controller] Pergunta recebida: "${pergunta}"`);
        console.log(`🔐 [Juridico Controller] Usuário: ${userId}`);
        
        // Se não houver sessionId, criar uma nova conversa
        let finalSessionId = sessionId;
        if (!finalSessionId) {
            finalSessionId = await mongoService.createConversation(
                userId,
                document,
                name
            );
            console.log(`✨ [Juridico Controller] Nova conversa criada: ${finalSessionId}`);
        }
        
        // Fluxo com streaming
        if (ENABLE_STREAMING) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.flushHeaders()
            let fullResponse = "";
            const chunk = (chunk: string) => {
                fullResponse += chunk
                const sseMessage = `data: ${JSON.stringify({ fullResponse })}\n\n`;
                res.write(sseMessage);
            }
            try {
                await juridicoAgentService(
                    pergunta, 
                    document, 
                    name,
                    userId,  // ← NOVO
                    finalSessionId,  // ← NOVO
                    historyManager,  // ← NOVO
                    chunk
                )
                res.write(`data: ${JSON.stringify({ done: true, fullResponse, sessionId: finalSessionId })}\n\n`);
                res.end()
            } catch (error) {
                console.error("[Jurídico Controller] Erro ao gerar resposta:", error);
                const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
                res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
                res.end()
            }
        }
        else {
            try {
                const response = await juridicoAgentService(
                    pergunta, 
                    document, 
                    name,
                    userId,  // ← NOVO
                    finalSessionId,  // ← NOVO
                    historyManager  // ← NOVO
                );
                res.status(200).json({
                    success: true,
                    response: response,
                    sessionId: finalSessionId
                })
            } catch (error) {
                console.error("[Juridico Controller] Erro na variável de streaming:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: error instanceof Error ? error.message : "Erro interno do servidor"
                    })
                }
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

export const juridicoIngestController = async (req: Request, res: Response) => {
    try {
        const { jsonData, document, name, sessionId, isDetailed } = req.body;

        if (!jsonData || !document || !name) {
            return res.status(400).json({
                error: "JSON ou documento ou pergunta é obrigatório."
            });
        }


        const result = await ingestJuridicoData(jsonData, document, name, sessionId, isDetailed);

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

export const juridicoIngestDetailedController = async (req: Request, res: Response) => {

    try {

        const { jsonData, name, document, sessionId, processId } = req.body

        if (!jsonData || !name || !document || !sessionId || !processId) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios ausentes'
            });
        }

        const result = await ingestJuridicoDetailedData(jsonData, document, name, sessionId, processId)

        console.log(`✅ [API Detailed] Ingestão concluída com sucesso`)

        return res.status(200).json({
            success: true,
            sessionId: result.sessionId,
            processId: result.processId,
            count: result.count,
            message: 'Dados detalhados ingeridos com sucesso'
        });


    } catch (error: any) {
        console.error('❌ [API Detailed] Erro na ingestão:', error);

        return res.status(500).json({
            success: false,
            error: 'Erro ao processar ingestão de dados detalhados',
            details: error.message
        });


    }

}