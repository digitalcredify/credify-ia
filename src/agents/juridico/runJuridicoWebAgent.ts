import { ConversationHistoryManager } from "../../service/conversationHistoryManager";
import { generateJuridicoResponse } from "../../plannings/juridico/juridicoPlanning";


export const runJuridicoWebAgent = async(
    pergunta:string,
    document:string,
    name:string,
    userId: string,  // ← NOVO
    sessionId: string,  // ← NOVO
    historyManager: ConversationHistoryManager,  // ← NOVO
    onChunk?: (chunk: string) => void    
) => {

    try {
        
        console.log("[Juridico Web Agent] Iniciando processamento com dados jurídicos...");

         const response = await generateJuridicoResponse(
            pergunta,
            document,
            name,
            userId,  // ← NOVO
            sessionId,  // ← NOVO
            historyManager,  // ← NOVO
            onChunk
        );
        return response;

    } catch (error) {
        console.error("[Juridico Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro ao processar sua solicitação.";
        
    }

}