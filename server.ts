import express from 'express';
import agent from './src/routes/agentRoute';
import cors from 'cors';
import { ensureMongoConnection, closeMongoConnection } from './src/config';
import { clearAllChatHistory } from './src/memory';  // ✅ ADICIONAR

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());
app.use('/api', agent);

async function startServer() {
    try {
        console.log("🔄 Iniciando aplicação...");
        
        // 1. Conecta ao MongoDB
        await ensureMongoConnection();
        
        // 2. ✅ Limpa histórico de chat
        await clearAllChatHistory();
        
        // 3. Inicia o servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
        
    } catch (error) {
        console.error("❌ Erro ao iniciar servidor:", error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log("\n⏹️ Encerrando aplicação...");
    await closeMongoConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log("\n⏹️ Encerrando aplicação...");
    await closeMongoConnection();
    process.exit(0);
});

startServer();
