"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOperationResponse = void 0;
const traceable_1 = require("langsmith/traceable");
const messages_1 = require("@langchain/core/messages");
const config_1 = require("../../config");
const operationTools_1 = require("../../tools/operation/operationTools");
function generateResponseOpenAI(messages_2) {
    return __awaiter(this, arguments, void 0, function* (messages, modelType = "advanced", onChunk) {
        var _a, e_1, _b, _c;
        try {
            const langchainMessages = messages.map((msg) => {
                if (msg.role === "system")
                    return new messages_1.SystemMessage(msg.content);
                if (msg.role === "user")
                    return new messages_1.HumanMessage(msg.content);
                if (msg.role === "assistant")
                    return new messages_1.AIMessage(msg.content);
                return new messages_1.HumanMessage(msg.content);
            });
            let selectedModel;
            if (modelType === "advanced") {
                selectedModel = config_1.advancedModel;
            }
            else if (modelType === "balanced") {
                selectedModel = config_1.balancedModel;
            }
            else {
                selectedModel = config_1.fastModel;
            }
            if (onChunk) {
                const stream = yield selectedModel.stream(langchainMessages);
                let fullResponse = "";
                try {
                    for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                        _c = stream_1_1.value;
                        _d = false;
                        const chunk = _c;
                        const content = String(chunk.content || "");
                        if (content) {
                            onChunk(content);
                        }
                        fullResponse += content;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return fullResponse;
            }
            else {
                const response = yield selectedModel.invoke(langchainMessages);
                return String(response.content);
            }
        }
        catch (error) {
            console.error("Error in OpenAiChatCompletion:", error);
            throw error;
        }
    });
}
const selectAndExecuteTools = (0, traceable_1.traceable)(function selectAndExecuteTools(pergunta, startDate, endDate, startHour, endHour) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[Operation Planning] Selecionando ferramentas...");
        const filters = { startDate, endDate };
        if (startHour !== undefined && endHour !== undefined) {
            filters.startHour = startHour;
            filters.endHour = endHour;
        }
        const results = [];
        const perguntaLower = pergunta.toLowerCase();
        if (perguntaLower.includes("total") ||
            perguntaLower.includes("ranking") ||
            perguntaLower.includes("top") ||
            perguntaLower.includes("agrupa") ||
            perguntaLower.includes("por produto") ||
            perguntaLower.includes("por empresa") ||
            perguntaLower.includes("por usuário") ||
            perguntaLower.includes("por aplicação") ||
            perguntaLower.includes("por hora")) {
            console.log("[Operation Planning] Usando Aggregate Tool");
            let groupBy = "product";
            if (perguntaLower.includes("produto"))
                groupBy = "product";
            else if (perguntaLower.includes("empresa"))
                groupBy = "company";
            else if (perguntaLower.includes("usuário") || perguntaLower.includes("usuario"))
                groupBy = "user";
            else if (perguntaLower.includes("aplicação") || perguntaLower.includes("aplicacao"))
                groupBy = "application";
            else if (perguntaLower.includes("hora"))
                groupBy = "hour";
            else if (perguntaLower.includes("data") || perguntaLower.includes("dia"))
                groupBy = "date";
            const aggregateResult = yield (0, operationTools_1.operationAggregateTool)({
                query: pergunta,
                filters,
                groupBy
            });
            results.push({
                tool: "aggregate",
                data: aggregateResult
            });
        }
        if (perguntaLower.includes("performance") ||
            perguntaLower.includes("taxa de sucesso") ||
            perguntaLower.includes("taxa de falha") ||
            perguntaLower.includes("tempo médio") ||
            perguntaLower.includes("média de execução")) {
            console.log("[Operation Planning] Usando Performance Analysis Tool");
            const performanceResult = yield (0, operationTools_1.operationPerformanceAnalysisTool)({ filters });
            results.push({
                tool: "performance",
                data: performanceResult
            });
        }
        if (perguntaLower.includes("calcul") ||
            perguntaLower.includes("soma") ||
            perguntaLower.includes("subtrai") ||
            perguntaLower.includes("multiplica") ||
            perguntaLower.includes("divide")) {
            console.log("[Operation Planning] Calculator Tool pode ser necessário");
        }
        if (results.length === 0 || perguntaLower.includes("qual") || perguntaLower.includes("quais")) {
            console.log("[Operation Planning] Usando Specific Query Tool");
            const specificResult = yield (0, operationTools_1.operationSpecificQueryTool)({
                query: pergunta,
                filters
            });
            results.push({
                tool: "specific",
                data: specificResult
            });
        }
        console.log(`[Operation Planning] ${results.length} ferramentas executadas`);
        return results;
    });
}, { name: "Select and Execute Operation Tools", run_type: "chain" });
exports.generateOperationResponse = (0, traceable_1.traceable)(function generateOperationResponse(startDate, endDate, startHour, endHour, pergunta, onChunk) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[Operation Planning] Gerando resposta...");
            const toolResults = yield selectAndExecuteTools(pergunta, startDate, endDate, startHour, endHour);
            let context = `Período analisado: ${startDate} a ${endDate}`;
            if (startHour !== undefined && endHour !== undefined) {
                context += ` (${startHour}h - ${endHour}h)`;
            }
            context += `\n\n`;
            for (const result of toolResults) {
                if (result.tool === "aggregate") {
                    context += "Dados agregados:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }
                else if (result.tool === "performance") {
                    context += "Análise de performance:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }
                else if (result.tool === "specific") {
                    context += "Dados específicos encontrados:\n";
                    const docs = result.data.slice(0, 10); // Limita a 10 documentos
                    for (const doc of docs) {
                        context += doc.document.pageContent + "\n\n";
                    }
                }
            }
            const systemPrompt = `Você é um assistente especializado em análise de dados operacionais da Credify.

Sua função é responder perguntas sobre métricas de performance, execuções, sucessos, falhas, produtos, aplicações, usuários e empresas.

Diretrizes:
1. Seja preciso e objetivo nas respostas
2. Use os dados fornecidos no contexto para embasar suas respostas
3. Apresente números e percentuais quando relevante
4. Organize informações em tabelas quando apropriado
5. Destaque insights importantes
6. Se não houver dados suficientes, seja honesto sobre as limitações
7. Sempre mencione o período analisado quando relevante
8. Use formatação Markdown para melhor legibilidade

Contexto dos dados:
${context}`;
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: pergunta }
            ];
            const response = yield generateResponseOpenAI(messages, "advanced", onChunk);
            console.log("[Operation Planning] Resposta gerada com sucesso");
            return response;
        }
        catch (error) {
            console.error("[Operation Planning] Erro ao gerar resposta:", error);
            throw error;
        }
    });
}, { name: "Generate Operation Response", run_type: "chain" });
