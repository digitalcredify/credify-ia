

import { BaseMessage, HumanMessage } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { compareProcesses, getProcessDetails, getProcessesByStatus, getProcessesByTribunal, getProcessesByValueRange, getProcessesSummary, getProcessesWithAdvogado, searchProcessesByArea, searchProcessesByDecision, searchProcessesByParty } from "../tools/juridico/Juridicotools";
import { fastModel } from "../config";



const searchProcessesByPartyTool = tool(
    async (input) => {
        const result = await searchProcessesByParty(input);
        return JSON.stringify(result);
    },
    {
        name: "search_processes_by_party",
        description: "Busca processos envolvendo uma parte específica (pessoa ou empresa)",
        schema: z.object({
            partyName: z.string().describe("Nome da parte a buscar"),
            filters: z.object({
                tribunal: z.string().optional().describe("Tribunal específico"),
                area: z.string().optional().describe("Área jurídica"),
                status: z.string().optional().describe("Status do processo")
            }).optional()
        })
    }
);

const getProcessDetailsTool = tool(
    async (input) => {
        const result = await getProcessDetails(input);
        return JSON.stringify(result);
    },
    {
        name: "get_process_details",
        description: "Obtém detalhes completos de um processo específico",
        schema: z.object({
            processNumber: z.string().describe("Número do processo (CNJ)"),
            includeDecisions: z.boolean().optional().describe("Incluir decisões/julgamentos")
        })
    }
);

const searchProcessesByAreaTool = tool(
    async (input) => {
        const result = await searchProcessesByArea(input);
        return JSON.stringify(result);
    },
    {
        name: "search_processes_by_area",
        description: "Busca processos em uma área jurídica específica",
        schema: z.object({
            area: z.string().describe("Área jurídica (ex: TRABALHISTA, CIVIL, CRIMINAL)"),
            filters: z.object({
                tribunal: z.string().optional(),
                status: z.string().optional(),
                valueRange: z.object({
                    min: z.number(),
                    max: z.number()
                }).optional()
            }).optional()
        })
    }
);

const getProcessesByTribunalTool = tool(
    async (input) => {
        const result = await getProcessesByTribunal(input);
        return JSON.stringify(result);
    },
    {
        name: "get_processes_by_tribunal",
        description: "Obtém processos de um tribunal específico",
        schema: z.object({
            tribunal: z.string().describe("Código do tribunal (ex: TRT-20, TRT-15)"),
            filters: z.object({
                area: z.string().optional(),
                status: z.string().optional()
            }).optional()
        })
    }
);

const getProcessesByStatusTool = tool(
    async (input) => {
        const result = await getProcessesByStatus(input);
        return JSON.stringify(result);
    },
    {
        name: "get_processes_by_status",
        description: "Busca processos com um status específico",
        schema: z.object({
            status: z.string().describe("Status do processo (ex: EM TRAMITACAO, ENCERRADO)"),
            filters: z.object({
                area: z.string().optional(),
                tribunal: z.string().optional(),
                valueRange: z.object({
                    min: z.number(),
                    max: z.number()
                }).optional()
            }).optional()
        })
    }
);

const getProcessesByValueRangeTool = tool(
    async (input) => {
        const result = await getProcessesByValueRange(input);
        return JSON.stringify(result);
    },
    {
        name: "get_processes_by_value_range",
        description: "Busca processos dentro de uma faixa de valor",
        schema: z.object({
            minValue: z.number().describe("Valor mínimo em reais"),
            maxValue: z.number().describe("Valor máximo em reais"),
            filters: z.object({
                area: z.string().optional(),
                tribunal: z.string().optional(),
                status: z.string().optional()
            }).optional()
        })
    }
);

const getProcessesWithAdvogadoTool = tool(
    async (input) => {
        const result = await getProcessesWithAdvogado(input);
        return JSON.stringify(result);
    },
    {
        name: "get_processes_with_advogado",
        description: "Busca processos representados por um advogado específico",
        schema: z.object({
            advogadoName: z.string().describe("Nome do advogado"),
            filters: z.object({
                area: z.string().optional(),
                tribunal: z.string().optional(),
                status: z.string().optional()
            }).optional()
        })
    }
);

const getProcessesSummaryTool = tool(
    async (input) => {
        const result = await getProcessesSummary(input);
        return JSON.stringify(result);
    },
    {
        name: "get_processes_summary",
        description: "Obtém um resumo estatístico de todos os processos",
        schema: z.object({
            filters: z.object({
                area: z.string().optional(),
                tribunal: z.string().optional(),
                status: z.string().optional()
            }).optional()
        })
    }
);

const searchProcessesByDecisionTool = tool(
    async (input) => {
        const result = await searchProcessesByDecision(input);
        return JSON.stringify(result);
    },
    {
        name: "search_processes_by_decision",
        description: "Busca processos com um tipo de decisão específico",
        schema: z.object({
            decisionType: z.string().describe("Tipo de decisão (ex: ACORDO, EXTINTA, CONDENADO)"),
            filters: z.object({
                area: z.string().optional(),
                tribunal: z.string().optional()
            }).optional()
        })
    }
);

const compareProcessesTool = tool(
    async (input) => {
        const result = await compareProcesses(input);
        return JSON.stringify(result);
    },
    {
        name: "compare_processes",
        description: "Compara características de múltiplos processos",
        schema: z.object({
            processNumbers: z.array(z.string()).describe("Lista de números de processos para comparar")
        })
    }
);



const JURIDICO_AGENT_PROMPT = `Você é um assistente jurídico especializado em análise de processos.

Você tem acesso às seguintes ferramentas:
1. search_processes_by_party - Buscar processos por parte envolvida
2. get_process_details - Detalhes completos de um processo
3. search_processes_by_area - Processos por área jurídica
4. get_processes_by_tribunal - Processos de um tribunal
5. get_processes_by_status - Processos por status
6. get_processes_by_value_range - Processos por faixa de valor
7. get_processes_with_advogado - Processos por advogado
8. get_processes_summary - Resumo estatístico
9. search_processes_by_decision - Processos por tipo de decisão
10. compare_processes - Comparar múltiplos processos

Quando o usuário fizer uma pergunta:
1. Identifique qual ferramenta é mais apropriada
2. Use a ferramenta com os parâmetros corretos
3. Analise o resultado
4. Forneça uma resposta clara e estruturada em português

Sempre seja preciso e cite números de processos, valores e datas quando relevante.
Se não conseguir encontrar informações, seja honesto sobre isso.`;



export const runJuridicoAgent = async (
    pergunta: string,
    onChunk?: (chunk: string) => void
) => {

    try {
        const tools = [
            searchProcessesByPartyTool,
            getProcessDetailsTool,
            searchProcessesByAreaTool,
            getProcessesByTribunalTool,
            getProcessesByStatusTool,
            getProcessesByValueRangeTool,
            getProcessesWithAdvogadoTool,
            getProcessesSummaryTool,
            searchProcessesByDecisionTool,
            compareProcessesTool
        ];

        const agent = createReactAgent({
            llm: fastModel,
            tools: tools,
            prompt: JURIDICO_AGENT_PROMPT
        });

        const input = {
            messages: [new HumanMessage(pergunta)]
        };

        let fullResponse = "";

       if (onChunk) {
            const stream = await agent.stream(input);
            
            for await (const chunk of stream) {
                if (chunk.agent?.messages && Array.isArray(chunk.agent.messages)) {
                    const messages = chunk.agent.messages as BaseMessage[];
                    const firstMessage = messages[0];
                    
                    if (firstMessage?.content && typeof firstMessage.content === "string") {
                        const content = firstMessage.content;
                        fullResponse += content;
                        onChunk(content);
                    }
                }
            }
        } else {
            const result = await agent.invoke(input);
            
            const lastMessage = result.messages[result.messages.length - 1];
            
            if (typeof lastMessage.content === "string") {
                fullResponse = lastMessage.content;
            } else {
                fullResponse = JSON.stringify(lastMessage.content);
            }
        }

        console.log("[Juridico Agent] ✅ Resposta gerada com sucesso");
        return fullResponse;

    } catch (error) {
        console.error("[Juridico Agent] ❌ Erro:", error);
        throw error;
    }
};
