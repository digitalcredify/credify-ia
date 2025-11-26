
import { traceable } from "langsmith/traceable";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { advancedModel, balancedModel, fastModel } from "../../config";
import { operationAggregateTool, operationPerformanceAnalysisTool, operationSpecificQueryTool } from "../../tools/operation/operationTools";

async function generateResponseOpenAI(
    messages: any,
    modelType: "advanced" | "balanced" | "fast" = "advanced",
    onChunk?: (chunk: string) => void
): Promise<string> {
    try {
        const langchainMessages = messages.map((msg: any) => {
            if (msg.role === "system") return new SystemMessage(msg.content);
            if (msg.role === "user") return new HumanMessage(msg.content);
            if (msg.role === "assistant") return new AIMessage(msg.content);
            return new HumanMessage(msg.content);
        });

        let selectedModel;
        if (modelType === "advanced") {
            selectedModel = advancedModel;
        } else if (modelType === "balanced") {
            selectedModel = balancedModel;
        } else {
            selectedModel = fastModel;
        }

        if (onChunk) {
            const stream = await selectedModel.stream(langchainMessages);
            let fullResponse = "";

            for await (const chunk of stream) {
                const content = String(chunk.content || "");

                if (content) {
                    onChunk(content);
                }

                fullResponse += content;
            }

            return fullResponse;
        } else {
            const response = await selectedModel.invoke(langchainMessages);
            return String(response.content);
        }

    } catch (error) {
        console.error("Error in OpenAiChatCompletion:", error);
        throw error;
    }
}


const selectAndExecuteTools = traceable(
    async function selectAndExecuteTools(
        pergunta: string,
        startDate: string,
        endDate: string,
        startHour?: any,
        endHour?: any
    ): Promise<any[]> {
        console.log("[Operation Planning] Selecionando ferramentas...");

        const filters: any = { startDate, endDate };
        if (startHour !== undefined && endHour !== undefined) {
            filters.startHour = startHour;
            filters.endHour = endHour;
        }
        const results: any[] = [];

        const perguntaLower = pergunta.toLowerCase();

        if (
            perguntaLower.includes("total") ||
            perguntaLower.includes("ranking") ||
            perguntaLower.includes("top") ||
            perguntaLower.includes("agrupa") ||
            perguntaLower.includes("por produto") ||
            perguntaLower.includes("por empresa") ||
            perguntaLower.includes("por usuário") ||
            perguntaLower.includes("por aplicação") ||
            perguntaLower.includes("por hora")
        ) {
            console.log("[Operation Planning] Usando Aggregate Tool");

            let groupBy = "product"; 

            if (perguntaLower.includes("produto")) groupBy = "product";
            else if (perguntaLower.includes("empresa")) groupBy = "company";
            else if (perguntaLower.includes("usuário") || perguntaLower.includes("usuario")) groupBy = "user";
            else if (perguntaLower.includes("aplicação") || perguntaLower.includes("aplicacao")) groupBy = "application";
            else if (perguntaLower.includes("hora")) groupBy = "hour";
            else if (perguntaLower.includes("data") || perguntaLower.includes("dia")) groupBy = "date";

            const aggregateResult = await operationAggregateTool({
                query: pergunta,
                filters,
                groupBy
            });

            results.push({
                tool: "aggregate",
                data: aggregateResult
            });
        }

        if (
            perguntaLower.includes("performance") ||
            perguntaLower.includes("taxa de sucesso") ||
            perguntaLower.includes("taxa de falha") ||
            perguntaLower.includes("tempo médio") ||
            perguntaLower.includes("média de execução")
        ) {
            console.log("[Operation Planning] Usando Performance Analysis Tool");

            const performanceResult = await operationPerformanceAnalysisTool({ filters });

            results.push({
                tool: "performance",
                data: performanceResult
            });
        }

        if (
            perguntaLower.includes("calcul") ||
            perguntaLower.includes("soma") ||
            perguntaLower.includes("subtrai") ||
            perguntaLower.includes("multiplica") ||
            perguntaLower.includes("divide")
        ) {
            console.log("[Operation Planning] Calculator Tool pode ser necessário");
        }

        if (results.length === 0 || perguntaLower.includes("qual") || perguntaLower.includes("quais")) {
            console.log("[Operation Planning] Usando Specific Query Tool");

            const specificResult = await operationSpecificQueryTool({
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
    },
    { name: "Select and Execute Operation Tools", run_type: "chain" }
);


export const generateOperationResponse = traceable(
    async function generateOperationResponse(
        startDate: string,
        endDate: string,
        startHour: any,
        endHour: any,
        pergunta: string,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        try {
            console.log("[Operation Planning] Gerando resposta...");

            const toolResults = await selectAndExecuteTools(pergunta, startDate, endDate, startHour, endHour);

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

            const response = await generateResponseOpenAI(messages, "advanced", onChunk);

            console.log("[Operation Planning] Resposta gerada com sucesso");
            return response;

        } catch (error) {
            console.error("[Operation Planning] Erro ao gerar resposta:", error);
            throw error;
        }
    },
    { name: "Generate Operation Response", run_type: "chain" }
);
