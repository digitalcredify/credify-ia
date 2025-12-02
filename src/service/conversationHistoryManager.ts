

import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatConversationService } from '../service/chatConversationService';

export class ConversationHistoryManager {
    private mongoService: ChatConversationService;
    private readonly MAX_CONTEXT_MESSAGES = 10;
    
    constructor(mongoService: ChatConversationService) {
        this.mongoService = mongoService;
    }
    
    
    async getHistoryForLLM(
        userId: string,
        sessionId: string
    ): Promise<BaseMessage[]> {
        try {
            console.log(`📚 [History Manager] Recuperando histórico para LLM...`);
            console.log(`   userId: ${userId}`);
            console.log(`   sessionId: ${sessionId}`);
            
            const mongoMessages = await this.mongoService.getConversationHistory(
                userId,
                sessionId
            );
            
            console.log(`✅ [History Manager] ${mongoMessages.length} mensagens recuperadas do MongoDB`);
            
            
            const langchainMessages = this.convertToLangChainMessages(mongoMessages);
            
            
            return this.filterMessagesForContext(langchainMessages);
            
        } catch (error) {
            console.error('[History Manager] Erro ao recuperar histórico:', error);
            return [];  
        }
    }
    
   
    private convertToLangChainMessages(mongoMessages: any[]): BaseMessage[] {
        return mongoMessages.map(msg => {
            if (msg.role === 'user') {
                return new HumanMessage(msg.content);
            } else {
                return new AIMessage(msg.content);
            }
        });
    }
  
    private filterMessagesForContext(messages: BaseMessage[]): BaseMessage[] {
        if (messages.length <= this.MAX_CONTEXT_MESSAGES) {
            return messages;
        }
        
        console.log(`🔍 [History Manager] Filtrando contexto (${messages.length} → ${this.MAX_CONTEXT_MESSAGES})`);
        return messages.slice(-this.MAX_CONTEXT_MESSAGES);
    }
    
    
    async addMessage(
        userId: string,
        sessionId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<void> {
        try {
            await this.mongoService.addMessage(userId, sessionId, role, content);
            console.log(`✅ [History Manager] Mensagem adicionada (${role})`);
        } catch (error) {
            console.error('[History Manager] Erro ao adicionar mensagem:', error);
            throw error;
        }
    }
    
   
    async getFullHistory(
        userId: string,
        sessionId: string
    ): Promise<BaseMessage[]> {
        const mongoMessages = await this.mongoService.getConversationHistory(
            userId,
            sessionId
        );
        return this.convertToLangChainMessages(mongoMessages);
    }
    
  
    async clearHistory(userId: string, sessionId: string): Promise<void> {
        await this.mongoService.deleteConversation(userId, sessionId);
        console.log(`🗑️ [History Manager] Histórico limpo`);
    }
}