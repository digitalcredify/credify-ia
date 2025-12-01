// src/services/conversationHistoryManager.ts

import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";  // ✅ Corrigido
import { ConversationCacheManager } from './cacheManager';
import { ChatConversationService } from "./chatConversationService";

export class ConversationHistoryManager {
    private mongoService: ChatConversationService;
    private cacheManager: ConversationCacheManager;
    private readonly MAX_CONTEXT_MESSAGES = 10; // Mensagens para enviar ao LLM
    
    constructor(
        mongoService: ChatConversationService,
        cacheManager: ConversationCacheManager
    ) {
        this.mongoService = mongoService;
        this.cacheManager = cacheManager;
    }
    
    /**
     * Recupera histórico com estratégia de 3 camadas
     * 1. Memória (rápido)
     * 2. MongoDB (completo)
     * 3. Filtra para LLM (otimizado)
     */
    async getHistoryForLLM(
        userId: string,
        sessionId: string
    ): Promise<BaseMessage[]> {  // ✅ Corrigido
        console.log(`📚 [History Manager] Recuperando histórico para LLM...`);
        
        // CAMADA 1: Tentar cache em memória
        let messages = this.cacheManager.getConversation(userId, sessionId);
        
        if (messages) {
            console.log(`⚡ [History Manager] Histórico do cache (${messages.length} mensagens)`);
            return this.filterMessagesForContext(messages);
        }
        
        // CAMADA 2: Recuperar do MongoDB
        console.log(`🔄 [History Manager] Recuperando do MongoDB...`);
        const mongoMessages = await this.mongoService.getConversationHistory(
            userId,
            sessionId
        );
        
        // Converter para formato LangChain
        const langchainMessages = this.convertToLangChainMessages(mongoMessages);
        
        // CAMADA 3: Armazenar em cache para próximas requisições
        this.cacheManager.setConversation(userId, sessionId, langchainMessages);
        
        console.log(`✅ [History Manager] Histórico recuperado (${langchainMessages.length} mensagens)`);
        
        return this.filterMessagesForContext(langchainMessages);
    }
    
    /**
     * Converte mensagens do MongoDB para formato LangChain
     */
    private convertToLangChainMessages(mongoMessages: any[]): BaseMessage[] {  // ✅ Corrigido
        return mongoMessages.map(msg => {
            if (msg.role === 'user') {
                return new HumanMessage(msg.content);
            } else {
                return new AIMessage(msg.content);
            }
        });
    }
    
    /**
     * Filtra mensagens para otimizar context window
     * Estratégia: Últimas N mensagens + resumo de mensagens antigas
     */
    private filterMessagesForContext(messages: BaseMessage[]): BaseMessage[] {  // ✅ Corrigido
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
    async addMessage(
        userId: string,
        sessionId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<void> {
        // Converter para formato LangChain
        const message = role === 'user'
            ? new HumanMessage(content)
            : new AIMessage(content);
        
        // Armazenar em cache
        this.cacheManager.addMessageToCache(userId, sessionId, message);
        
        // Armazenar em MongoDB
        await this.mongoService.addMessage(userId, sessionId, role, content);
        
        console.log(`✅ [History Manager] Mensagem armazenada (${role})`);
    }
    
    /**
     * Recupera histórico completo (para UI, sem filtro)
     */
    async getFullHistory(
        userId: string,
        sessionId: string
    ): Promise<BaseMessage[]> {  // ✅ Corrigido
        const mongoMessages = await this.mongoService.getConversationHistory(
            userId,
            sessionId
        );
        
        return this.convertToLangChainMessages(mongoMessages);
    }
    
    /**
     * Limpa histórico
     */
    async clearHistory(userId: string, sessionId: string): Promise<void> {
        this.cacheManager.clearConversation(userId, sessionId);
        await this.mongoService.deleteConversation(userId, sessionId);
        console.log(`🗑️ [History Manager] Histórico limpo`);
    }
}