"use strict";
/**
 * @fileoverview
 * este arquivo gerencia a conversa do chatBot.
 * á completar
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieverSessionHistory = exports.storeChatMessage = void 0;
exports.clearAllChatHistory = clearAllChatHistory;
exports.clearSessionHistory = clearSessionHistory;
const traceable_1 = require("langsmith/traceable");
// armazena histórico (agora em memoria)
const chatHistories = {};
// ???
exports.storeChatMessage = (0, traceable_1.traceable)(function storeChatMessage(sessionId, role, content) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!chatHistories[sessionId]) {
            chatHistories[sessionId] = [];
        }
        chatHistories[sessionId].push({
            role: role,
            content: content,
            timestamp: new Date()
        });
    });
}, { name: "Histórico de mensagens do chat", run_type: "tool" });
// recupera o histórico de mensagens
exports.retrieverSessionHistory = (0, traceable_1.traceable)(function retrieverSessionHistory(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const history = chatHistories[sessionId] || [];
        return history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    });
}, { name: "Recupera Histórico de mensagens", run_type: "retriever" });
// limpa o historico de mensagem
function clearAllChatHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[Memory] 🗑️ Limpando histórico de chat em memória...");
            const count = Object.keys(chatHistories).length;
            for (const key in chatHistories) {
                delete chatHistories[key];
            }
            console.log(`[Memory] ✅ Histórico limpo: ${count} sessões removidas`);
            return count;
        }
        catch (error) {
            console.error("[Memory] ❌ Erro ao limpar histórico:", error);
            throw error;
        }
    });
}
// limpa a seção.
function clearSessionHistory(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Memory] 🗑️ Limpando histórico da sessão em memória: ${sessionId}`);
            if (chatHistories[sessionId]) {
                const count = chatHistories[sessionId].length;
                delete chatHistories[sessionId];
                console.log(`[Memory] ✅ Histórico da sessão limpo: ${count} mensagens removidas`);
                return count;
            }
            return 0;
        }
        catch (error) {
            console.error("[Memory] ❌ Erro ao limpar histórico da sessão:", error);
            throw error;
        }
    });
}
