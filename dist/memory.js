"use strict";
/**
    * esse arquivo define o sistema que o agente utiliza para armazenas suas interações
   
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
exports.storeChatMessage = storeChatMessage;
exports.retrieverSessionHistory = retrieverSessionHistory;
exports.clearAllChatHistory = clearAllChatHistory;
exports.clearSessionHistory = clearSessionHistory;
const config_1 = require("./config");
function storeChatMessage(sessionId, role, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            session_id: sessionId,
            role,
            content,
            timestamp: new Date()
        };
        yield config_1.memoryCollection.insertOne(message);
    });
}
function retrieverSessionHistory(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = config_1.memoryCollection
            .find({ session_id: sessionId })
            .sort({ timestamp: 1 });
        const messages = [];
        yield cursor.forEach(msg => {
            messages.push({ role: msg.role, content: msg.content });
        });
        return messages;
    });
}
function clearAllChatHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[Memory] 🗑️ Limpando histórico de chat...");
            const result = yield config_1.memoryCollection.deleteMany({});
            console.log(`[Memory] ✅ Histórico limpo: ${result.deletedCount} mensagens removidas`);
            return result.deletedCount;
        }
        catch (error) {
            console.error("[Memory] ❌ Erro ao limpar histórico:", error);
            throw error;
        }
    });
}
function clearSessionHistory(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[Memory] 🗑️ Limpando histórico da sessão: ${sessionId}`);
            const result = yield config_1.memoryCollection.deleteMany({ session_id: sessionId });
            console.log(`[Memory] ✅ Histórico da sessão limpo: ${result.deletedCount} mensagens removidas`);
            return result.deletedCount;
        }
        catch (error) {
            console.error("[Memory] ❌ Erro ao limpar histórico da sessão:", error);
            throw error;
        }
    });
}
