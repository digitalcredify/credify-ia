

/** 
    * esse arquivo define o sistema que o agente utiliza para armazenas suas interações
   
*/

import { memoryCollection } from "./config"



/** 
    * @param {string} sessionId - indentificador unico para sessão de bate papo
    * @param {string} role - função de remetente (usuario ou sistema)
    * @param {string} content - conteudo da mensagem
*/
export async function storeChatMessage(sessionId:any, role:any, content:any) {

    const message = {
        session_id: sessionId,
        role,
        content,
        timestamp: new Date()
    }
    await memoryCollection.insertOne(message);
}

/**
 * Recupera o histórico de bate papo de uma sessão
 * @param {string} sessionId - identificador unico da sessão do chat
 * @returns {Promise<Array<{role: string, content: string}>>}
 * 
 */

export async function retrieverSessionHistory(sessionId:any) {
    const cursor = memoryCollection
        .find({ session_id: sessionId })
        .sort({ timestamp: 1 });

    const messages:any[] = []
    await cursor.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
    });
    return messages;
        
    
}

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

/**
 * Limpa o histórico de uma sessão específica
 */
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
