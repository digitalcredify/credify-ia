

/** 
    * esse arquivo define o sistema que o agente utiliza para armazenas suas interações
   
*/

import { memoryCollection } from "./config"
import { traceable } from "langsmith/traceable";



export const storeChatMessage = traceable(
    async function storeChatMessage(sessionId: string, role: string, content: string) {
        await memoryCollection.insertOne({
            session_id: sessionId,
            role: role,
            content: content,
            timestamp: new Date()
        });
    },
    { name: "Store Chat Message", run_type: "tool" }
);


export const retrieverSessionHistory = traceable(
    async function retrieverSessionHistory(sessionId: string) {
        const history = await memoryCollection
            .find({ session_id: sessionId })
            .sort({ timestamp: 1 })
            .toArray();
        
        return history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    },
    { name: "Retrieve Session History", run_type: "retriever" }
);

export async function clearAllChatHistory() {
    try {
        console.log("[Memory] 🗑️ Limpando histórico de chat...");
        
        const result = await memoryCollection.deleteMany({});
        
        console.log(`[Memory] ✅ Histórico limpo: ${result.deletedCount} mensagens removidas`);
        
        return result.deletedCount;
        
    } catch (error) {
        console.error("[Memory] ❌ Erro ao limpar histórico:", error);
        throw error;
    }
}

export async function clearSessionHistory(sessionId: string) {
    try {
        console.log(`[Memory] 🗑️ Limpando histórico da sessão: ${sessionId}`);
        
        const result = await memoryCollection.deleteMany({ session_id: sessionId });
        
        console.log(`[Memory] ✅ Histórico da sessão limpo: ${result.deletedCount} mensagens removidas`);
        
        return result.deletedCount;
        
    } catch (error) {
        console.error("[Memory] ❌ Erro ao limpar histórico da sessão:", error);
        throw error;
    }
}
