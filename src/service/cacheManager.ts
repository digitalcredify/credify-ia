
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

interface ConversationCache {
    userId: string;
    sessionId: string;
    messages: BaseMessage[]; 
    lastUpdated: Date;
    expiresAt: Date;
}

export class ConversationCacheManager {
    private cache: Map<string, ConversationCache> = new Map();
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
    private readonly MAX_MESSAGES_IN_CACHE = 20;
    
  
    private getCacheKey(userId: string, sessionId: string): string {
        return `${userId}:${sessionId}`;
    }

    setConversation(
        userId: string,
        sessionId: string,
        messages: BaseMessage[]  
    ): void {
        const key = this.getCacheKey(userId, sessionId);
        const now = new Date();
        
        const cachedMessages = messages.slice(-this.MAX_MESSAGES_IN_CACHE);
        
        this.cache.set(key, {
            userId,
            sessionId,
            messages: cachedMessages,
            lastUpdated: now,
            expiresAt: new Date(now.getTime() + this.CACHE_TTL)
        });
        
        console.log(`✅ [Cache] Conversa em cache: ${key} (${cachedMessages.length} mensagens)`);
    }
    
    getConversation(userId: string, sessionId: string): BaseMessage[] | null {  
        const key = this.getCacheKey(userId, sessionId);
        const cached = this.cache.get(key);
        
        if (!cached) {
            return null;
        }
        
        if (new Date() > cached.expiresAt) {
            this.cache.delete(key);
            console.log(`🗑️ [Cache] Conversa expirada: ${key}`);
            return null;
        }
        
        console.log(`⚡ [Cache] Conversa recuperada do cache: ${key}`);
        return cached.messages;
    }
    
  
    addMessageToCache(
        userId: string,
        sessionId: string,
        message: BaseMessage 
    ): void {
        const key = this.getCacheKey(userId, sessionId);
        const cached = this.cache.get(key);
        
        if (!cached) {
            this.setConversation(userId, sessionId, [message]);
            return;
        }
        
        cached.messages.push(message);
        
        if (cached.messages.length > this.MAX_MESSAGES_IN_CACHE) {
            cached.messages = cached.messages.slice(-this.MAX_MESSAGES_IN_CACHE);
        }
        
        cached.lastUpdated = new Date();
        cached.expiresAt = new Date(Date.now() + this.CACHE_TTL);
    }
    
  
    clearConversation(userId: string, sessionId: string): void {
        const key = this.getCacheKey(userId, sessionId);
        this.cache.delete(key);
        console.log(`🗑️ [Cache] Conversa limpa: ${key}`);
    }
    
   
    clearExpiredCache(): number {
        let cleared = 0;
        const now = new Date();
        
        for (const [key, cached] of this.cache.entries()) {
            if (now > cached.expiresAt) {
                this.cache.delete(key);
                cleared++;
            }
        }
        
        console.log(`🗑️ [Cache] ${cleared} conversas expiradas removidas`);
        return cleared;
    }
    
    
    getStats() {
        return {
            totalConversations: this.cache.size,
            totalMessages: Array.from(this.cache.values()).reduce(
                (sum, conv) => sum + conv.messages.length,
                0
            )
        };
    }
}

export const cacheManager = new ConversationCacheManager();