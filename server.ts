import express from 'express';
import agent from './src/routes/agentRoute';
import cors from 'cors';
import { ensureMongoConnection, closeMongoConnection } from './src/config';
import { clearAllChatHistory } from './src/memory';  
import agentRouteStreaming from './src/routes/agentRoute_streaming';


const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());
app.use('/api', agent);
app.use('/api', agentRouteStreaming);

async function startServer() {
    try {
        console.log("🔄 Iniciando aplicação...");
        
        
        await ensureMongoConnection();
        
        
        await clearAllChatHistory();
        
        
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
