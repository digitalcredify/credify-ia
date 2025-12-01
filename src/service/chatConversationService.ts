// src/service/chatConversationService.ts

import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tokens?: number;
}

interface ChatConversation {
    _id?: ObjectId;
    userId: string;
    sessionId: string;
    document: string;
    name: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        tags?: string[];
    };
}

export class ChatConversationService {
    private db: Db;
    private collection: Collection<ChatConversation>;
    private readonly COLLECTION_NAME = 'chat_conversations';
    private readonly CONVERSATION_TTL_DAYS = 90;
    
    constructor(db: Db) {
        this.db = db;
        this.collection = db.collection(this.COLLECTION_NAME);
    }
    
    /**
     * Inicializa os índices da collection
     */
    async initializeIndexes(): Promise<void> {
        try {
            console.log('[ChatConversationService] Criando índices...');
            
            // Índice composto: userId + sessionId (ÚNICO)
            await this.collection.createIndex(
                { userId: 1, sessionId: 1 },
                { unique: true }
            );
            console.log('✅ Índice único criado: { userId, sessionId }');
            
            // Índice para buscar conversas de um usuário ordenadas por data
            await this.collection.createIndex(
                { userId: 1, createdAt: -1 }
            );
            console.log('✅ Índice criado: { userId, createdAt }');
            
            // Índice para buscar por sessionId
            await this.collection.createIndex(
                { sessionId: 1 }
            );
            console.log('✅ Índice criado: { sessionId }');
            
            // Índice TTL: Expira conversas após 90 dias
            await this.collection.createIndex(
                { expiresAt: 1 },
                { expireAfterSeconds: 0 }
            );
            console.log('✅ Índice TTL criado: { expiresAt }');
            
            console.log('[ChatConversationService] Índices criados com sucesso');
        } catch (error: any) {
            if (error.code === 85) {
                // Índice já existe com diferentes opções
                console.warn('[ChatConversationService] ⚠️ Índices já existem');
            } else {
                throw error;
            }
        }
    }
    
   
      async generateUniqueSessionId(): Promise<string> {
        let sessionId: string = uuidv4();
        let exists = true;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
        
        // Tenta gerar um UUID que não exista
        while (exists && attempts < MAX_ATTEMPTS) {
            sessionId = uuidv4();
            const found = await this.collection.findOne({ sessionId });
            exists = !!found;
            attempts++;
        }
        
        if (exists) {
            throw new Error('Falha ao gerar sessionId único após múltiplas tentativas');
        }
        
        return sessionId;
    }
    
    /**
     * Cria uma nova conversa
     */
    async createConversation(
        userId: string,
        document: string,
        name: string,
        metadata?: any
    ): Promise<string> {
        try {
            const sessionId = await this.generateUniqueSessionId();
            const now = new Date();
            const expiresAt = new Date(
                now.getTime() + this.CONVERSATION_TTL_DAYS * 24 * 60 * 60 * 1000
            );
            
            const conversation: ChatConversation = {
                userId,
                sessionId,
                document,
                name,
                messages: [],
                createdAt: now,
                updatedAt: now,
                expiresAt,
                metadata
            };
            
            const result = await this.collection.insertOne(conversation as any);
            
            console.log(`✅ [ChatConversationService] Conversa criada: ${sessionId}`);
            console.log(`   Usuário: ${userId}`);
            console.log(`   Documento: ${document}`);
            console.log(`   Nome: ${name}`);
            
            return sessionId;
        } catch (error: any) {
            if (error.code === 11000) {
                // Duplicata de índice único, tenta novamente
                console.warn(`⚠️ [ChatConversationService] Duplicata detectada, tentando novamente...`);
                return this.createConversation(userId, document, name, metadata);
            }
            console.error('[ChatConversationService] Erro ao criar conversa:', error);
            throw error;
        }
    }
    
    /**
     * Adiciona uma mensagem à conversa
     */
    async addMessage(
        userId: string,
        sessionId: string,
        role: 'user' | 'assistant',
        content: string,
        tokens?: number
    ): Promise<void> {
        try {
            const message: ChatMessage = {
                role,
                content,
                timestamp: new Date(),
                tokens
            };
            
            const result = await this.collection.updateOne(
                { userId, sessionId },
                {
                    $push: { messages: message },
                    $set: { updatedAt: new Date() }
                }
            );
            
            if (result.matchedCount === 0) {
                throw new Error(`Conversa não encontrada: ${sessionId}`);
            }
            
            console.log(`✅ [ChatConversationService] Mensagem adicionada (${role})`);
        } catch (error) {
            console.error('[ChatConversationService] Erro ao adicionar mensagem:', error);
            throw error;
        }
    }
    
    /**
     * Recupera o histórico de uma conversa
     */
    async getConversationHistory(
        userId: string,
        sessionId: string
    ): Promise<ChatMessage[]> {
        try {
            const conversation = await this.collection.findOne(
                { userId, sessionId },
                { projection: { messages: 1 } }
            );
            
            if (!conversation) {
                console.warn(`⚠️ [ChatConversationService] Conversa não encontrada: ${sessionId}`);
                return [];
            }
            
            console.log(`✅ [ChatConversationService] Histórico recuperado: ${conversation.messages?.length || 0} mensagens`);
            return conversation.messages || [];
        } catch (error) {
            console.error('[ChatConversationService] Erro ao recuperar histórico:', error);
            throw error;
        }
    }
    
    /**
     * Recupera todas as conversas de um usuário
     */
    async getUserConversations(
        userId: string,
        limit: number = 50
    ): Promise<any[]> {
        try {
            const conversations = await this.collection
                .find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .project({
                    sessionId: 1,
                    document: 1,
                    name: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    messageCount: { $size: '$messages' }
                })
                .toArray();
            
            console.log(`✅ [ChatConversationService] ${conversations.length} conversas recuperadas para usuário: ${userId}`);
            return conversations;
        } catch (error) {
            console.error('[ChatConversationService] Erro ao recuperar conversas do usuário:', error);
            throw error;
        }
    }
    
    /**
     * Recupera uma conversa completa
     */
    async getConversation(
        userId: string,
        sessionId: string
    ): Promise<ChatConversation | null> {
        try {
            const conversation = await this.collection.findOne({
                userId,
                sessionId
            });
            
            if (!conversation) {
                console.warn(`⚠️ [ChatConversationService] Conversa não encontrada: ${sessionId}`);
                return null;
            }
            
            console.log(`✅ [ChatConversationService] Conversa recuperada: ${sessionId}`);
            return conversation;
        } catch (error) {
            console.error('[ChatConversationService] Erro ao recuperar conversa:', error);
            throw error;
        }
    }
    
    /**
     * Deleta uma conversa
     */
    async deleteConversation(userId: string, sessionId: string): Promise<void> {
        try {
            const result = await this.collection.deleteOne({
                userId,
                sessionId
            });
            
            if (result.deletedCount === 0) {
                throw new Error(`Conversa não encontrada: ${sessionId}`);
            }
            
            console.log(`✅ [ChatConversationService] Conversa deletada: ${sessionId}`);
        } catch (error) {
            console.error('[ChatConversationService] Erro ao deletar conversa:', error);
            throw error;
        }
    }
    
    /**
     * Atualiza metadados de uma conversa
     */
    async updateConversationMetadata(
        userId: string,
        sessionId: string,
        metadata: any
    ): Promise<void> {
        try {
            const result = await this.collection.updateOne(
                { userId, sessionId },
                {
                    $set: {
                        metadata,
                        updatedAt: new Date()
                    }
                }
            );
            
            if (result.matchedCount === 0) {
                throw new Error(`Conversa não encontrada: ${sessionId}`);
            }
            
            console.log(`✅ [ChatConversationService] Metadados atualizados: ${sessionId}`);
        } catch (error) {
            console.error('[ChatConversationService] Erro ao atualizar metadados:', error);
            throw error;
        }
    }
    
    /**
     * Limpa conversas expiradas (pode ser rodado via cron)
     */
    async cleanupExpiredConversations(): Promise<number> {
        try {
            const result = await this.collection.deleteMany({
                expiresAt: { $lt: new Date() }
            });
            
            console.log(`🗑️ [ChatConversationService] ${result.deletedCount} conversas expiradas removidas`);
            return result.deletedCount;
        } catch (error) {
            console.error('[ChatConversationService] Erro ao limpar conversas expiradas:', error);
            throw error;
        }
    }
    
    /**
     * Recupera estatísticas de conversas
     */
    async getStatistics(): Promise<any> {
        try {
            const stats = await this.collection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalConversations: { $sum: 1 },
                        totalMessages: { $sum: { $size: '$messages' } },
                        totalUsers: { $addToSet: '$userId' },
                        avgMessagesPerConversation: {
                            $avg: { $size: '$messages' }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalConversations: 1,
                        totalMessages: 1,
                        totalUsers: { $size: '$totalUsers' },
                        avgMessagesPerConversation: {
                            $round: ['$avgMessagesPerConversation', 2]
                        }
                    }
                }
            ]).toArray();
            
            return stats[0] || {
                totalConversations: 0,
                totalMessages: 0,
                totalUsers: 0,
                avgMessagesPerConversation: 0
            };
        } catch (error) {
            console.error('[ChatConversationService] Erro ao recuperar estatísticas:', error);
            throw error;
        }
    }
    
    /**
     * Recupera conversas de um usuário por período
     */
    async getConversationsByDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any[]> {
        try {
            const conversations = await this.collection
                .find({
                    userId,
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                })
                .sort({ createdAt: -1 })
                .toArray();
            
            console.log(`✅ [ChatConversationService] ${conversations.length} conversas encontradas no período`);
            return conversations;
        } catch (error) {
            console.error('[ChatConversationService] Erro ao recuperar conversas por período:', error);
            throw error;
        }
    }
    
    /**
     * Exporta conversa em formato JSON
     */
    async exportConversation(
        userId: string,
        sessionId: string
    ): Promise<string> {
        try {
            const conversation = await this.getConversation(userId, sessionId);
            
            if (!conversation) {
                throw new Error(`Conversa não encontrada: ${sessionId}`);
            }
            
            return JSON.stringify(conversation, null, 2);
        } catch (error) {
            console.error('[ChatConversationService] Erro ao exportar conversa:', error);
            throw error;
        }
    }
}
