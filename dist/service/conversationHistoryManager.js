"use strict";
// src/services/conversationHistoryManager.ts
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
const messages_1 = require("@langchain/core/messages"); // ✅ Corrigido
class ConversationHistoryManager {
    constructor(mongoService, cacheManager) {
        this.MAX_CONTEXT_MESSAGES = 10; // Mensagens para enviar ao LLM
        this.mongoService = mongoService;
        this.cacheManager = cacheManager;
    }
    /**
     * Recupera histórico com estratégia de 3 camadas
     * 1. Memória (rápido)
     * 2. MongoDB (completo)
     * 3. Filtra para LLM (otimizado)
     */
    getHistoryForLLM(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`📚 [History Manager] Recuperando histórico para LLM...`);
            // CAMADA 1: Tentar cache em memória
            let messages = this.cacheManager.getConversation(userId, sessionId);
            if (messages) {
                console.log(`⚡ [History Manager] Histórico do cache (${messages.length} mensagens)`);
                return this.filterMessagesForContext(messages);
            }
            // CAMADA 2: Recuperar do MongoDB
            console.log(`🔄 [History Manager] Recuperando do MongoDB...`);
            const mongoMessages = yield this.mongoService.getConversationHistory(userId, sessionId);
            // Converter para formato LangChain
            const langchainMessages = this.convertToLangChainMessages(mongoMessages);
            // CAMADA 3: Armazenar em cache para próximas requisições
            this.cacheManager.setConversation(userId, sessionId, langchainMessages);
            console.log(`✅ [History Manager] Histórico recuperado (${langchainMessages.length} mensagens)`);
            return this.filterMessagesForContext(langchainMessages);
        });
    }
    /**
     * Converte mensagens do MongoDB para formato LangChain
     */
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
    /**
     * Filtra mensagens para otimizar context window
     * Estratégia: Últimas N mensagens + resumo de mensagens antigas
     */
    filterMessagesForContext(messages) {
        if (messages.length <= this.MAX_CONTEXT_MESSAGES) {
            return messages;
        }
        console.log(`🔍 [History Manager] Filtrando contexto (${messages.length} → ${this.MAX_CONTEXT_MESSAGES})`);
        // Manter últimas N mensagens
        const recentMessages = messages.slice(-this.MAX_CONTEXT_MESSAGES);
        return recentMessages;
    }
    /**
     * Adiciona nova mensagem ao histórico (memória + MongoDB)
     */
    addMessage(userId, sessionId, role, content) {
        return __awaiter(this, void 0, void 0, function* () {
            // Converter para formato LangChain
            const message = role === 'user'
                ? new messages_1.HumanMessage(content)
                : new messages_1.AIMessage(content);
            // Armazenar em cache
            this.cacheManager.addMessageToCache(userId, sessionId, message);
            // Armazenar em MongoDB
            yield this.mongoService.addMessage(userId, sessionId, role, content);
            console.log(`✅ [History Manager] Mensagem armazenada (${role})`);
        });
    }
    /**
     * Recupera histórico completo (para UI, sem filtro)
     */
    getFullHistory(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mongoMessages = yield this.mongoService.getConversationHistory(userId, sessionId);
            return this.convertToLangChainMessages(mongoMessages);
        });
    }
    /**
     * Limpa histórico
     */
    clearHistory(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cacheManager.clearConversation(userId, sessionId);
            yield this.mongoService.deleteConversation(userId, sessionId);
            console.log(`🗑️ [History Manager] Histórico limpo`);
        });
    }
}
exports.ConversationHistoryManager = ConversationHistoryManager;
