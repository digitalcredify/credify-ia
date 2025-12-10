"use strict";
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
exports.ConversationHistoryManager = void 0;
const messages_1 = require("@langchain/core/messages");
class ConversationHistoryManager {
    constructor(mongoService) {
        this.MAX_CONTEXT_MESSAGES = 10;
        this.mongoService = mongoService;
    }
    getHistoryForLLM(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📚 [History Manager] Recuperando histórico para LLM...`);
                console.log(`   userId: ${userId}`);
                console.log(`   sessionId: ${sessionId}`);
                const mongoMessages = yield this.mongoService.getConversationHistory(userId, sessionId);
                console.log(`✅ [History Manager] ${mongoMessages.length} mensagens recuperadas do MongoDB`);
                const langchainMessages = this.convertToLangChainMessages(mongoMessages);
                return this.filterMessagesForContext(langchainMessages);
            }
            catch (error) {
                console.error('[History Manager] Erro ao recuperar histórico:', error);
                return [];
            }
        });
    }
    convertToLangChainMessages(mongoMessages) {
        return mongoMessages.map(msg => {
            if (msg.role === 'user') {
                return new messages_1.HumanMessage(msg.content);
            }
            else {
                return new messages_1.AIMessage(msg.content);
            }
        });
    }
    filterMessagesForContext(messages) {
        if (messages.length <= this.MAX_CONTEXT_MESSAGES) {
            return messages;
        }
        console.log(`🔍 [History Manager] Filtrando contexto (${messages.length} → ${this.MAX_CONTEXT_MESSAGES})`);
        return messages.slice(-this.MAX_CONTEXT_MESSAGES);
    }
    addMessage(userId, sessionId, role, content) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.mongoService.addMessage(userId, sessionId, role, content);
                console.log(`✅ [History Manager] Mensagem adicionada (${role})`);
            }
            catch (error) {
                console.error('[History Manager] Erro ao adicionar mensagem:', error);
                throw error;
            }
        });
    }
    getFullHistory(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mongoMessages = yield this.mongoService.getConversationHistory(userId, sessionId);
            return this.convertToLangChainMessages(mongoMessages);
        });
    }
    clearHistory(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.mongoService.deleteConversation(userId, sessionId);
            console.log(`🗑️ [History Manager] Histórico limpo`);
        });
    }
}
exports.ConversationHistoryManager = ConversationHistoryManager;
