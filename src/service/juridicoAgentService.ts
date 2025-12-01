import { runRouterAgent } from "../agents/routerAgent";
import { runJuridicoWebAgent } from "../agents/juridico/runJuridicoWebAgent";
import { runPdfAgent } from "../agents/pdfAgent";
import { ConversationHistoryManager } from "./conversationHistoryManager";

export const juridicoAgentService = async (
    pergunta: string,
    document: string,
    name: string,
    userId: string,  // ← NOVO
    sessionId: string,  // ← NOVO
    historyManager: ConversationHistoryManager,  // ← NOVO
    onChunk?: (chunk: string) => void
) => {
    try {
        console.log("[Juridico Service] Iniciando processamento...")
        
        const routerDecision = await runRouterAgent(pergunta)
        switch(routerDecision.routerName){
            case 'web_agent':
                console.log("[Juridico Service] Roteando para Jurídico Web Agent")
                return await runJuridicoWebAgent(
                    pergunta,
                    document, 
                    name,
                    userId,  // ← NOVO
                    sessionId,  // ← NOVO
                    historyManager,  // ← NOVO
                    onChunk
                )
            
            case 'pdf_agent':
                console.log('[Juridico Service] Roteando para Jurídico PDF Agent');
                return await runPdfAgent(sessionId, pergunta);
            
            default:
                console.log("[Juridico Service] Rota não reconhecida, usando Jurídico Web Agent como fallback")
                return await runJuridicoWebAgent(
                    pergunta,
                    name,
                    document,
                    userId,  // ← NOVO
                    sessionId,  // ← NOVO
                    historyManager,  // ← NOVO
                    onChunk
                )
        }
        
    } catch (error) {
        console.error("[Juridico Service] Erro:", error);
        throw error;
    }
}