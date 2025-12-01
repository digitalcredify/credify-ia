"use strict";
// src/services/cacheManager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = exports.ConversationCacheManager = void 0;
class ConversationCacheManager {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 30 * 60 * 1000; // 30 minutos
        this.MAX_MESSAGES_IN_CACHE = 20;
    }
    /**
     * Gera chave de cache
     */
    getCacheKey(userId, sessionId) {
        return `${userId}:${sessionId}`;
    }
    /**
     * Armazena conversa em cache
     */
    setConversation(userId, sessionId, messages // ✅ Corrigido
    ) {
        const key = this.getCacheKey(userId, sessionId);
        const now = new Date();
        // Manter apenas as últimas N mensagens em cache
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
    /**
     * Recupera conversa do cache
     */
    getConversation(userId, sessionId) {
        const key = this.getCacheKey(userId, sessionId);
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }
        // Verificar se expirou
        if (new Date() > cached.expiresAt) {
            this.cache.delete(key);
            console.log(`🗑️ [Cache] Conversa expirada: ${key}`);
            return null;
        }
        console.log(`⚡ [Cache] Conversa recuperada do cache: ${key}`);
        return cached.messages;
    }
    /**
     * Adiciona mensagem ao cache
     */
    addMessageToCache(userId, sessionId, message // ✅ Corrigido
    ) {
        const key = this.getCacheKey(userId, sessionId);
        const cached = this.cache.get(key);
        if (!cached) {
            this.setConversation(userId, sessionId, [message]);
            return;
        }
        cached.messages.push(message);
        // Manter limite de mensagens
        if (cached.messages.length > this.MAX_MESSAGES_IN_CACHE) {
            cached.messages = cached.messages.slice(-this.MAX_MESSAGES_IN_CACHE);
        }
        cached.lastUpdated = new Date();
        cached.expiresAt = new Date(Date.now() + this.CACHE_TTL);
    }
    /**
     * Limpa cache de uma conversa
     */
    clearConversation(userId, sessionId) {
        const key = this.getCacheKey(userId, sessionId);
        this.cache.delete(key);
        console.log(`🗑️ [Cache] Conversa limpa: ${key}`);
    }
    /**
     * Limpa todo o cache (executar periodicamente)
     */
    clearExpiredCache() {
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
    /**
     * Retorna estatísticas do cache
     */
    getStats() {
        return {
            totalConversations: this.cache.size,
            totalMessages: Array.from(this.cache.values()).reduce((sum, conv) => sum + conv.messages.length, 0)
        };
    }
}
exports.ConversationCacheManager = ConversationCacheManager;
// Instância global
exports.cacheManager = new ConversationCacheManager();
