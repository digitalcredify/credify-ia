/**
 * @fileoverview 
 * este arquivo gerencia a conversa do chatBot.
 * á completar
 */



import { traceable } from "langsmith/traceable";


// armazena histórico (agora em memoria)
const chatHistories: Record<string, { role: string; content: string; timestamp: Date }[]> = {};


// ???
export const storeChatMessage = traceable(
    async function storeChatMessage(sessionId: string, role: string, content: string) {
        if (!chatHistories[sessionId]) {
            chatHistories[sessionId] = [];
        }
        chatHistories[sessionId].push({
            role: role,
            content: content,
            timestamp: new Date()
        });
    },
    { name: "Histórico de mensagens do chat", run_type: "tool" }
);


// recupera o histórico de mensagens
export const retrieverSessionHistory = traceable(
    async function retrieverSessionHistory(sessionId: string) {
        const history = chatHistories[sessionId] || [];
        return history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    },
    { name: "Recupera Histórico de mensagens", run_type: "retriever" }
);


// limpa o historico de mensagem
export async function clearAllChatHistory() {
    try {
        console.log("[Memory] 🗑️ Limpando histórico de chat em memória...");
        const count = Object.keys(chatHistories).length;
        for (const key in chatHistories) {
            delete chatHistories[key];
        }
        console.log(`[Memory] ✅ Histórico limpo: ${count} sessões removidas`);
        return count;
    } catch (error) {
        console.error("[Memory] ❌ Erro ao limpar histórico:", error);
        throw error;
    }
}

// limpa a seção.
export async function clearSessionHistory(sessionId: string) {
    try {
        console.log(`[Memory] 🗑️ Limpando histórico da sessão em memória: ${sessionId}`);
        if (chatHistories[sessionId]) {
            const count = chatHistories[sessionId].length;
            delete chatHistories[sessionId];
            console.log(`[Memory] ✅ Histórico da sessão limpo: ${count} mensagens removidas`);
            return count;
        }
        return 0;
    } catch (error) {
        console.error("[Memory] ❌ Erro ao limpar histórico da sessão:", error);
        throw error;
    }
}
