"use strict";
/**
 * @fileoverview Inicialização do servidor Express e também limpa o histórico de conversas,
 * Este arquivo é o ponto de entrada da aplicação.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const agentRoute_1 = __importDefault(require("./src/routes/agentRoute"));
const operationAgentRoute_1 = __importDefault(require("./src/routes/operationAgentRoute"));
const memory_1 = require("./src/memory");
const juridicoAgentRoute_1 = __importDefault(require("./src/routes/juridicoAgentRoute"));
const config_1 = require("./config");
const app = (0, express_1.default)();
const PORT = 3080;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', agentRoute_1.default);
app.use('/api', operationAgentRoute_1.default);
app.use('/api', juridicoAgentRoute_1.default);
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔄 Iniciando aplicação...");
            yield (0, config_1.connectMongoDB)();
            yield (0, memory_1.clearAllChatHistory)(); // limpa o histórico ao iniciar
            app.listen(PORT, () => {
                console.log(`🚀 Servidor rodando na porta ${PORT}`);
            });
        }
        catch (error) {
            console.error("❌ Erro ao iniciar servidor:", error);
            process.exit(1);
        }
    });
}
startServer();
