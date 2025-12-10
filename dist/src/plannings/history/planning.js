"use strict";
/**
 * @fileoverview
 * este arquivo é o mais complexo do sistema, possui varias funcionalidades.
 * 1 - Seleção e execução de ferramentas
 * 2- geração de r4esposta final.
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = exports.runToolSelectorAgent = exports.generateResponseOpenAI = void 0;
const traceable_1 = require("langsmith/traceable");
const messages_1 = require("@langchain/core/messages");
const config_1 = require("../../config");
const memory_1 = require("../../memory");
const tools_1 = require("../../tools/history/tools");
// essa função gera a resposta da pergunta
exports.generateResponseOpenAI = (0, traceable_1.traceable)(function OpenAiChatCompleiton(messages_2) {
    return __awaiter(this, arguments, void 0, function* (messages, // historico de mensagem
    modelType = "advanced", // modelos pre definidos (com a intenção de diminuir a latência)
    onChunk // streaming
    ) {
        var _a, e_1, _b, _c;
        try {
            /**
             * Indentifica o papel da mensagem
             * Converte as mensagens em formato langchain
             * Qualquer coisa fora do padrão é mensagen di tipo HumanMessage, para garantir que nada quebre
             */
            const langchainMessages = messages.map((msg) => {
                if (msg.role === "system")
                    return new messages_1.SystemMessage(msg.content);
                if (msg.role === "user")
                    return new messages_1.HumanMessage(msg.content);
                if (msg.role === "assistant")
                    return new messages_1.AIMessage(msg.content);
                return new messages_1.HumanMessage(msg.content);
            });
            // define o modelo
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
            // caso seja o streaming esteja ativado, vai fazer o streaming
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
                // invoka a resposta do llm
                const response = yield selectedModel.invoke(langchainMessages);
                return String(response.content);
            }
        }
        catch (error) {
            console.error("Error in OpenAiChatCompletion:", error);
            throw error;
        }
    });
}, {
    name: "Generate Responde OpenAI",
    run_type: "llm",
    metadata: {
        provider: "OpenAI"
    }
});
// essa função é um agente que pega o input do usuário e com base nele determina qual a tool mais adequada.
exports.runToolSelectorAgent = (0, traceable_1.traceable)(function toolSelector(userInput_1) {
    return __awaiter(this, arguments, void 0, function* (userInput, // input do usuario
    sessionHistory = [] // historico da conversa
    ) {
        // prompt de instrução do sistema.
        const systemPrompt = `
            Você é um roteador de tarefas inteligente. Analise a INTENÇÃO da pergunta, não apenas as palavras exatas.

            ### Ferramentas Disponíveis

                1. **specific_query_tool**: Busca informações específicas sobre UMA entidade.
        
                    **Quando usar:**
                    - Pergunta menciona nome específico de empresa, representante, organização, etc.
                    - Usuário quer saber sobre UM item específico
                    - Funciona para QUALQUER propriedade: documento, plano, tipo, revenue, etc.
        
                    **Exemplos (não limitado a estes):**
                        - "Qual o documento da iFood?"
                        - "Me fale o plano da SEM PARAR"
                        - "Qual o tipo da CREDIFY?"
                        - "Qual a organização do SEGUNDO CARTÓRIO?"
                        - "Qual o revenue da iFood?"
        
                    **Variações aceitas:**
                        - "iFood tem qual documento?" → ✅ Mesma intenção
                        - "Me mostre o plano da SEM PARAR" → ✅ Mesma intenção
        
                    **Retorno:**
                    {"tool": "specific_query_tool", "input": {"query": "...", "filters": {}}}

                2. **aggregate_tool**: Agrega dados por QUALQUER campo.
        
                    **Quando usar:**
                        - Pergunta pede comparação, ranking ou total de MÚLTIPLOS itens
                        - Usuário quer ver dados agrupados
                        - Funciona para: representative, company, organization, revenue, plan, company_type, etc.
        
                    **Exemplos (não limitado a estes):**
                        - "Desempenho por representante" → groupBy: "representative"
                        - "Desempenho por empresa" → groupBy: "company"
                        - "Agregue por organização" → groupBy: "organization"
                        - "Total por revenue" → groupBy: "revenue"
                        - "Agrupe por plano" → groupBy: "plan"
                        - "Empresas por tipo" → groupBy: "company_type"

                        **Variações aceitas:**
                        - "Mostre cada representante" → ✅ groupBy: "representative"
                        - "Ranking de vendedores" → ✅ groupBy: "representative"
                        - "Compare as empresas" → ✅ groupBy: "company"
        
                    **Retorno:**
                    {"tool": "aggregate_tool", "input": {"query": "...", "filters": {}, "groupBy": "representative"}}
        
                    **⚠️ IMPORTANTE:** Você DEVE especificar o campo "groupBy" no input!

                3. **hybrid_search_tool**: Busca híbrida (fallback).
        
                    **Quando usar:**
                    - Pergunta é ambígua, complexa ou não se encaixa claramente nas outras tools
                    - Você não tem certeza qual tool usar
        
                    **Exemplos:**
                    - "Me explique como funciona..."
                    - "Análise detalhada de..."
                    - "Me fale sobre esses dados"
        
                    **Retorno:**
                    {"tool": "hybrid_search_tool", "input": {"query": "...", "filters": {}}}

                4. **none**: APENAS para cumprimentos e agradecimentos.
        
                    **Quando usar:**
                    - "oi", "olá", "bom dia"
                    - "obrigado", "valeu", "até logo"
        
                    **Retorno:**
                    {"tool": "none", "input": "..."}

            ### ⚠️ REGRAS CRÍTICAS:
                1. **Analise a INTENÇÃO**, não as palavras exatas
                2. **Os exemplos são ilustrativos**, não limitantes
                3. **Para agregação, SEMPRE especifique "groupBy"**
                4. **SE VOCÊ NÃO TEM CERTEZA** qual tool usar, escolha **hybrid_search_tool**
                5. **Formato JSON:** Retorne APENAS o JSON da ferramenta

            ### Exemplos Completos

            **Exemplo 1: Específica**
                Histórico: []
                Usuário: "Qual o documento da iFood?"
                Retorno:
                {"tool": "specific_query_tool", "input": {"query": "documento da iFood", "filters": {}}}

            **Exemplo 2: Agregação por Representante**
                Histórico: []
                Usuário: "desempenho por representante"
                Retorno:
                {"tool": "aggregate_tool", "input": {"query": "desempenho de todos os representantes", "filters": {}, "groupBy": "representative"}}

            **Exemplo 3: Agregação por Plano**
                Histórico: []
                Usuário: "agrupe por plano"
                Retorno:
                {"tool": "aggregate_tool", "input": {"query": "dados agrupados por plano", "filters": {}, "groupBy": "plan"}}

            **Exemplo 4: Agregação por Tipo de Empresa**
                Histórico: []
                Usuário: "compare empresas master e unique"
                Retorno:
                {"tool": "aggregate_tool", "input": {"query": "comparação entre tipos de empresa", "filters": {}, "groupBy": "company_type"}}

            **Exemplo 5: Ambígua (Fallback)**
                Histórico: []
                Usuário: "me explique como funciona"
                Retorno:
                {"tool": "hybrid_search_tool", "input": {"query": "explicação sobre funcionamento", "filters": {}}}

            **Exemplo 6: Cumprimento**
                Histórico: [ ... ]
                Usuário: "muito obrigado"
                Retorno:
                {"tool": "none", "input": "muito obrigado"}

    `.trim();
        // monta o histórico completo da conversa que sera enviada ao sistema.
        const messages = [
            { role: "system", content: systemPrompt },
            ...sessionHistory,
            { role: "user", content: userInput }
        ];
        try {
            // envia as mensagens para o llm e retorna a resposta
            const response = yield (0, exports.generateResponseOpenAI)(messages, "balanced");
            let toolCall;
            try {
                // converte a resposta para json
                toolCall = JSON.parse(response);
            }
            catch (parseError) {
                console.warn("⚠️ Erro ao parsear JSON. Usando fallback...");
                // caso haja alguma falha utiliza a ferramenta hybrid (generica)
                return {
                    tool: "hybrid_search_tool",
                    input: { query: userInput, filters: {} }
                };
            }
            // ferramentas validas
            const validTools = [
                "specific_query_tool",
                "aggregate_tool",
                "hybrid_search_tool",
                "none"
            ];
            if (!toolCall || !toolCall.tool || !validTools.includes(toolCall.tool)) {
                console.warn("⚠️ Tool inválida. Usando fallback.");
                return {
                    tool: "hybrid_search_tool",
                    input: { query: userInput, filters: {} }
                };
            }
            if (!toolCall.input) {
                toolCall.input = { query: userInput, filters: {} };
            }
            if (toolCall.tool === "aggregate_tool" && !toolCall.input.groupBy) {
                toolCall.input.groupBy = "company";
            }
            console.log("✅ Tool selecionada:", toolCall.tool);
            return {
                tool: toolCall.tool,
                input: toolCall.input
            };
        }
        catch (error) {
            console.error("❌ Erro no toolSelector:", error);
            return {
                tool: "hybrid_search_tool",
                input: { query: userInput, filters: {} }
            };
        }
    });
}, {
    name: "Tool Selector",
    run_type: "chain",
    metadata: {
        purpose: "Route user query to appropriate tool",
        model: "gpt-4o"
    }
});
const getLlmResponse = (0, traceable_1.traceable)(function getLlmResponse(messages_2, systemMessageContent_1) {
    return __awaiter(this, arguments, void 0, function* (messages, systemMessageContent, modelType = "advanced", onChunk) {
        const fullMessages = [
            { role: "system", content: systemMessageContent },
            ...messages
        ];
        const response = yield (0, exports.generateResponseOpenAI)(fullMessages, modelType, onChunk);
        return response;
    });
}, {
    name: "Get LLM Response",
    run_type: "chain",
    metadata: {
        purpose: "Generate final response with system prompt"
    }
});
/**
 * Função principal que orquestra todo o processo. Ela é responsável por:
 */
exports.generateResponse = (0, traceable_1.traceable)(function generateResponse(sessionId, // sessão do chat do usuario
userInput, // pergunta do usuario
onChunk // streaming
) {
    return __awaiter(this, void 0, void 0, function* () {
        // armazena a pergunta do usuáiro no histórico de seção.
        yield (0, memory_1.storeChatMessage)(sessionId, "user", userInput);
        // recupera todo o histórico da conversa, para entender o contexto
        const sessionHistory = yield (0, memory_1.retrieverSessionHistory)(sessionId);
        const llmInput = [...sessionHistory];
        // retorno da função que seleciona a ferramenta
        const { tool, input: toolInput } = yield (0, exports.runToolSelectorAgent)(userInput, sessionHistory);
        console.log("🔧 Tool selecionada:", tool);
        let response;
        if (tool === "specific_query_tool") {
            console.log("🔍 Executando specific_query_tool...");
            const finalFilters = { "month": sessionId };
            const finalToolInput = {
                query: toolInput.query || userInput,
                filters: finalFilters
            };
            const contextResults = yield (0, tools_1.specificQueryTool)(finalToolInput);
            const context = contextResults
                .map((doc) => { var _a; return ((_a = doc.document) === null || _a === void 0 ? void 0 : _a.pageContent) || JSON.stringify(doc); })
                .join('\n---\n');
            const systemMessageContent = `
Você é um analista financeiro experiente. Responda usando o contexto fornecido.

**FORMATAÇÃO MONETÁRIA:**
- Os valores JÁ ESTÃO EM REAIS (não precisa converter)
- Campos como "totalValueInReais", "totalValueWithDiscountInReais" já estão prontos
- Use o padrão brasileiro: ponto (.) para separador de milhares, vírgula (,) para decimais
- Exemplo: 11893.2337 → R$ 11.893,2337
- Exemplo: 316852.5000 → R$ 316.852,5000
- SEMPRE mostre exatamente 4 casas decimais após a vírgula
- NUNCA use vírgula para separador de milhares

### 🧩 POLÍTICA DE FORMATAÇÃO DE RESPOSTAS (OBRIGATÓRIA)

Todas as respostas devem ser formatadas em **Markdown**, SEM EXCEÇÃO.

**Regras de Formatação:**
1. **Títulos:** Use \`##\` para títulos principais e \`###\` para subtítulos.
2. **Negrito:** Use \`**texto**\` para destacar partes importantes.
3. **Tabelas:** Sempre que houver comparação, agregação ou múltiplos itens (empresas, representantes, meses, etc.), use tabelas Markdown no formato:

   | Campo | Valor |
   |--------|--------|
   | Exemplo | R$ 1.234,56 |

4. **Código Inline:** Use crases \`texto\` para IDs, nomes técnicos, ou campos JSON.
5. **Separadores:** Use \`---\` para separar blocos de informação.
6. **Listas:** Use listas numeradas ou com marcadores para explicar passos, métricas ou observações.
7. **Emojis (opcional):** Pode usar ícones (📊, 💰, ⚙️) para dar contexto visual.
8. **Proibido:** Não retornar texto puro sem Markdown.
- Seja conciso mas informativo


Contexto:
${context}`.trim();
            response = yield getLlmResponse(llmInput, systemMessageContent, "fast", onChunk);
        }
        else if (tool === "aggregate_tool") {
            console.log("📊 Executando aggregate_tool...");
            const finalFilters = { "month": sessionId };
            const finalToolInput = {
                query: toolInput.query || userInput,
                filters: finalFilters,
                groupBy: toolInput.groupBy || "company"
            };
            const contextResults = yield (0, tools_1.aggregateTool)(finalToolInput);
            const contextData = JSON.parse(contextResults[0].document.pageContent);
            const context = JSON.stringify(contextData, null, 2);
            const systemMessageContent = `
Você é um analista financeiro experiente. Os dados fornecidos JÁ ESTÃO AGREGADOS.
NÃO precisa somar ou agrupar novamente! Apenas formate e analise.

**FORMATAÇÃO MONETÁRIA:**
- Os valores JÁ ESTÃO EM REAIS (não precisa converter)
- Campos como "totalValueInReais", "totalValueWithDiscountInReais" já estão prontos
- Use o padrão brasileiro: ponto (.) para separador de milhares, vírgula (,) para decimais
- Exemplo: 11893.2337 → R$ 11.893,2337
- Exemplo: 316852.5000 → R$ 316.852,5000
- SEMPRE mostre exatamente 4 casas decimais após a vírgula
- NUNCA use vírgula para separador de milhares

### 🧩 POLÍTICA DE FORMATAÇÃO DE RESPOSTAS (OBRIGATÓRIA)

Todas as respostas devem ser formatadas em **Markdown**, SEM EXCEÇÃO.

**Regras de Formatação:**
1. **Títulos:** Use \`##\` para títulos principais e \`###\` para subtítulos.
2. **Negrito:** Use \`**texto**\` para destacar partes importantes.
3. **Tabelas:** Sempre que houver comparação, agregação ou múltiplos itens (empresas, representantes, meses, etc.), use tabelas Markdown no formato:

   | Campo | Valor |
   |--------|--------|
   | Exemplo | R$ 1.234,56 |

4. **Código Inline:** Use crases \`texto\` para IDs, nomes técnicos, ou campos JSON.
5. **Separadores:** Use \`---\` para separar blocos de informação.
6. **Listas:** Use listas numeradas ou com marcadores para explicar passos, métricas ou observações.
7. **Emojis (opcional):** Pode usar ícones (📊, 💰, ⚙️) para dar contexto visual.
8. **Proibido:** Não retornar texto puro sem Markdown.
- Seja conciso mas informativo

Contexto (já agregado por ${toolInput.groupBy}):
${context}`.trim();
            response = yield getLlmResponse(llmInput, systemMessageContent, "fast", onChunk);
        }
        else if (tool === "hybrid_search_tool") {
            console.log("🔀 Executando hybrid_search_tool...");
            const finalFilters = { "month": sessionId };
            const finalToolInput = {
                query: toolInput.query || userInput,
                filters: finalFilters
            };
            const contextResults = yield (0, tools_1.hybridSearchTool)(finalToolInput);
            const context = contextResults
                .map((doc) => { var _a; return ((_a = doc.document) === null || _a === void 0 ? void 0 : _a.pageContent) || JSON.stringify(doc); })
                .join('\n---\n');
            const systemMessageContent = `
Você é um analista financeiro experiente. Faça uma análise abrangente e detalhada.

**FORMATAÇÃO MONETÁRIA:**
- Os valores JÁ ESTÃO EM REAIS (não precisa converter)
- Campos como "totalValueInReais", "totalValueWithDiscountInReais" já estão prontos
- Use o padrão brasileiro: ponto (.) para separador de milhares, vírgula (,) para decimais
- Exemplo: 11893.2337 → R$ 11.893,2337
- Exemplo: 316852.5000 → R$ 316.852,5000
- SEMPRE mostre exatamente 4 casas decimais após a vírgula
- NUNCA use vírgula para separador de milhares

### 🧩 POLÍTICA DE FORMATAÇÃO DE RESPOSTAS (OBRIGATÓRIA)

Todas as respostas devem ser formatadas em **Markdown**, SEM EXCEÇÃO.

**Regras de Formatação:**
1. **Títulos:** Use \`##\` para títulos principais e \`###\` para subtítulos.
2. **Negrito:** Use \`**texto**\` para destacar partes importantes.
3. **Tabelas:** Sempre que houver comparação, agregação ou múltiplos itens (empresas, representantes, meses, etc.), use tabelas Markdown no formato:

   | Campo | Valor |
   |--------|--------|
   | Exemplo | R$ 1.234,56 |

4. **Código Inline:** Use crases \`texto\` para IDs, nomes técnicos, ou campos JSON.
5. **Separadores:** Use \`---\` para separar blocos de informação.
6. **Listas:** Use listas numeradas ou com marcadores para explicar passos, métricas ou observações.
7. **Emojis (opcional):** Pode usar ícones (📊, 💰, ⚙️) para dar contexto visual.
8. **Proibido:** Não retornar texto puro sem Markdown.
- Seja direto mas completo

Contexto:
${context}`.trim();
            response = yield getLlmResponse(llmInput, systemMessageContent, "fast", onChunk);
        }
        else if (tool === "calculator_tool") {
            console.log("🧮 Executando calculator_tool...");
            response = (0, tools_1.calculatorTool)(toolInput);
            if (onChunk) {
                onChunk(response);
            }
        }
        else {
            console.log("💬 Nenhuma tool necessária (cumprimento)");
            const systemMessageContent = `
                Você é um assistente prestativo. Seja cordial.
                Use Markdown se necessário.
            `.trim();
            response = yield getLlmResponse(llmInput, systemMessageContent, "fast", onChunk);
        }
        yield (0, memory_1.storeChatMessage)(sessionId, "system", response);
        return response;
    });
}, {
    name: "Generate Response - novo",
    run_type: "chain",
    metadata: {
        purpose: "Main orchestration with optimized model selection and streaming"
    }
});
