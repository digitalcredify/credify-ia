/**
 * @fileoverview Inicialização do servidor Express e também limpa o histórico de conversas,
 * Este arquivo é o ponto de entrada da aplicação.
 */

import express from 'express';
import cors from 'cors';
import agent from './src/routes/agentRoute';
import operationAgent from './src/routes/operationAgentRoute';
import { clearAllChatHistory } from './src/memory';


const app = express();
const PORT = 3080;

app.use(cors());
app.use(express.json());
app.use('/api', agent);
app.use('/api', operationAgent);

async function startServer() {
    try {
        console.log("🔄 Iniciando aplicação...");

        await clearAllChatHistory(); // limpa o histórico ao iniciar

        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });

    } catch (error) {
        console.error("❌ Erro ao iniciar servidor:", error);
        process.exit(1);
    }
}

startServer();

