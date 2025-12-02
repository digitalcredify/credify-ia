import { runRouterAgent } from "../agents/routerAgent";
import { runJuridicoWebAgent } from "../agents/juridico/runJuridicoWebAgent";
import { runPdfAgent } from "../agents/pdfAgent";
import { ConversationHistoryManager } from "./conversationHistoryManager";

export const juridicoAgentService = async (
    pergunta: string,
    document: string,
    name: string,
    userId: string,
    sessionId: string,
    historyManager: ConversationHistoryManager,
    onChunk?: (chunk: string) => void
) => {
    try {
        console.log("[Juridico Service] Iniciando processamento...")

        const routerDecision = await runRouterAgent(pergunta)
        switch (routerDecision.routerName) {
            case 'web_agent':
                console.log("[Juridico Service] Roteando para Jurídico Web Agent")
                return await runJuridicoWebAgent(
                    pergunta,
                    document,
                    name,
                    userId,
                    sessionId,
                    historyManager,
                    onChunk
                )

            case 'pdf_agent':
                console.log('[Juridico Service] Roteando para Jurídico PDF Agent');
                const pdfResult = await runPdfAgent(sessionId, userId, pergunta);  // ← Adicione userId
    
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
                console.log("[Juridico Service] Rota não reconhecida, usando Jurídico Web Agent como fallback")
                return await runJuridicoWebAgent(
                    pergunta,
                    name,
                    document,
                    userId,
                    sessionId,
                    historyManager,
                    onChunk
                )
        }

    } catch (error) {
        console.error("[Juridico Service] Erro:", error);
        throw error;
    }
}