/**
 * @fileoverview Inicialização do servidor Express e também limpa o histórico de conversas,
 * Este arquivo é o ponto de entrada da aplicação.
 */

import express from 'express';
import cors from 'cors';
import agent from './src/routes/agentRoute';
import operationAgent from './src/routes/operationAgentRoute';
import { clearAllChatHistory } from './src/memory';
import juridicoAgentRoute from './src/routes/juridicoAgentRoute';
import { connectMongoDB } from './src/config';


const app = express();
const PORT = 3080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', agent);
app.use('/api', operationAgent);
app.use('/api', juridicoAgentRoute);

async function startServer() {
    try {
        console.log("🔄 Iniciando aplicação...");

         await connectMongoDB();  

        await clearAllChatHistory(); 

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });

    } catch (error) {
        console.error("❌ Erro ao iniciar servidor:", error);
        process.exit(1);
    }
}

startServer();

