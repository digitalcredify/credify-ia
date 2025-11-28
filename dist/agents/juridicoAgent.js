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
exports.runJuridicoAgent = void 0;
const langchain_1 = require("langchain");
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const Juridicotools_1 = require("../tools/juridico/Juridicotools");
const config_1 = require("../config");
const searchProcessesByPartyTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.searchProcessesByParty)(input);
    return JSON.stringify(result);
}), {
    name: "search_processes_by_party",
    description: "Busca processos envolvendo uma parte específica (pessoa ou empresa)",
    schema: zod_1.z.object({
        partyName: zod_1.z.string().describe("Nome da parte a buscar"),
        filters: zod_1.z.object({
            tribunal: zod_1.z.string().optional().describe("Tribunal específico"),
            area: zod_1.z.string().optional().describe("Área jurídica"),
            status: zod_1.z.string().optional().describe("Status do processo")
        }).optional()
    })
});
const getProcessDetailsTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessDetails)(input);
    return JSON.stringify(result);
}), {
    name: "get_process_details",
    description: "Obtém detalhes completos de um processo específico",
    schema: zod_1.z.object({
        processNumber: zod_1.z.string().describe("Número do processo (CNJ)"),
        includeDecisions: zod_1.z.boolean().optional().describe("Incluir decisões/julgamentos")
    })
});
const searchProcessesByAreaTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.searchProcessesByArea)(input);
    return JSON.stringify(result);
}), {
    name: "search_processes_by_area",
    description: "Busca processos em uma área jurídica específica",
    schema: zod_1.z.object({
        area: zod_1.z.string().describe("Área jurídica (ex: TRABALHISTA, CIVIL, CRIMINAL)"),
        filters: zod_1.z.object({
            tribunal: zod_1.z.string().optional(),
            status: zod_1.z.string().optional(),
            valueRange: zod_1.z.object({
                min: zod_1.z.number(),
                max: zod_1.z.number()
            }).optional()
        }).optional()
    })
});
const getProcessesByTribunalTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessesByTribunal)(input);
    return JSON.stringify(result);
}), {
    name: "get_processes_by_tribunal",
    description: "Obtém processos de um tribunal específico",
    schema: zod_1.z.object({
        tribunal: zod_1.z.string().describe("Código do tribunal (ex: TRT-20, TRT-15)"),
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            status: zod_1.z.string().optional()
        }).optional()
    })
});
const getProcessesByStatusTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessesByStatus)(input);
    return JSON.stringify(result);
}), {
    name: "get_processes_by_status",
    description: "Busca processos com um status específico",
    schema: zod_1.z.object({
        status: zod_1.z.string().describe("Status do processo (ex: EM TRAMITACAO, ENCERRADO)"),
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            tribunal: zod_1.z.string().optional(),
            valueRange: zod_1.z.object({
                min: zod_1.z.number(),
                max: zod_1.z.number()
            }).optional()
        }).optional()
    })
});
const getProcessesByValueRangeTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessesByValueRange)(input);
    return JSON.stringify(result);
}), {
    name: "get_processes_by_value_range",
    description: "Busca processos dentro de uma faixa de valor",
    schema: zod_1.z.object({
        minValue: zod_1.z.number().describe("Valor mínimo em reais"),
        maxValue: zod_1.z.number().describe("Valor máximo em reais"),
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            tribunal: zod_1.z.string().optional(),
            status: zod_1.z.string().optional()
        }).optional()
    })
});
const getProcessesWithAdvogadoTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessesWithAdvogado)(input);
    return JSON.stringify(result);
}), {
    name: "get_processes_with_advogado",
    description: "Busca processos representados por um advogado específico",
    schema: zod_1.z.object({
        advogadoName: zod_1.z.string().describe("Nome do advogado"),
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            tribunal: zod_1.z.string().optional(),
            status: zod_1.z.string().optional()
        }).optional()
    })
});
const getProcessesSummaryTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.getProcessesSummary)(input);
    return JSON.stringify(result);
}), {
    name: "get_processes_summary",
    description: "Obtém um resumo estatístico de todos os processos",
    schema: zod_1.z.object({
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            tribunal: zod_1.z.string().optional(),
            status: zod_1.z.string().optional()
        }).optional()
    })
});
const searchProcessesByDecisionTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.searchProcessesByDecision)(input);
    return JSON.stringify(result);
}), {
    name: "search_processes_by_decision",
    description: "Busca processos com um tipo de decisão específico",
    schema: zod_1.z.object({
        decisionType: zod_1.z.string().describe("Tipo de decisão (ex: ACORDO, EXTINTA, CONDENADO)"),
        filters: zod_1.z.object({
            area: zod_1.z.string().optional(),
            tribunal: zod_1.z.string().optional()
        }).optional()
    })
});
const compareProcessesTool = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, Juridicotools_1.compareProcesses)(input);
    return JSON.stringify(result);
}), {
    name: "compare_processes",
    description: "Compara características de múltiplos processos",
    schema: zod_1.z.object({
        processNumbers: zod_1.z.array(zod_1.z.string()).describe("Lista de números de processos para comparar")
    })
});
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
const runJuridicoAgent = (pergunta, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d;
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
        const agent = (0, prebuilt_1.createReactAgent)({
            llm: config_1.fastModel,
            tools: tools,
            prompt: JURIDICO_AGENT_PROMPT
        });
        const input = {
            messages: [new langchain_1.HumanMessage(pergunta)]
        };
        let fullResponse = "";
        if (onChunk) {
            const stream = yield agent.stream(input);
            try {
                for (var _e = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _e = true) {
                    _c = stream_1_1.value;
                    _e = false;
                    const chunk = _c;
                    if (((_d = chunk.agent) === null || _d === void 0 ? void 0 : _d.messages) && Array.isArray(chunk.agent.messages)) {
                        const messages = chunk.agent.messages;
                        const firstMessage = messages[0];
                        if ((firstMessage === null || firstMessage === void 0 ? void 0 : firstMessage.content) && typeof firstMessage.content === "string") {
                            const content = firstMessage.content;
                            fullResponse += content;
                            onChunk(content);
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_e && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            const result = yield agent.invoke(input);
            const lastMessage = result.messages[result.messages.length - 1];
            if (typeof lastMessage.content === "string") {
                fullResponse = lastMessage.content;
            }
            else {
                fullResponse = JSON.stringify(lastMessage.content);
            }
        }
        console.log("[Juridico Agent] ✅ Resposta gerada com sucesso");
        return fullResponse;
    }
    catch (error) {
        console.error("[Juridico Agent] ❌ Erro:", error);
        throw error;
    }
});
exports.runJuridicoAgent = runJuridicoAgent;
