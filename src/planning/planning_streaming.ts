import { traceable } from "langsmith/traceable";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { advancedModel, balancedModel, fastModel } from "../config";
import { storeChatMessage, retrieverSessionHistory } from "../memory";
import { specificQueryTool, aggregateTool, hybridSearchTool, calculatorTool } from "../tools";


// ===== OpenAiChatCompleiton COM STREAMING (CORRIGIDO) =====
export const OpenAiChatCompleiton = traceable(
    async function OpenAiChatCompleiton(
        messages: any,
        modelType: "advanced" | "balanced" | "fast" = "advanced",
        onChunk?: (chunk: string) => void  // ← Callback para streaming (opcional)
    ): Promise<string> {
        try {
            const langchainMessages = messages.map((msg: any) => {
                if (msg.role === "system") return new SystemMessage(msg.content);
                if (msg.role === "user") return new HumanMessage(msg.content);
                if (msg.role === "assistant") return new AIMessage(msg.content);
                return new HumanMessage(msg.content); 
            });

            // Seleciona o modelo
            let selectedModel;
            if (modelType === "advanced") {
                selectedModel = advancedModel;
            } else if (modelType === "balanced") {
                selectedModel = balancedModel;
            } else {
                selectedModel = fastModel;
            }

            // ✅ SE TEM CALLBACK: USA STREAMING
            if (onChunk) {
                const stream = await selectedModel.stream(langchainMessages);
                let fullResponse = "";
                
                for await (const chunk of stream) {
                    const content = String(chunk.content || "");
                    
                    // ✅ CORREÇÃO: Envia apenas o NOVO conteúdo, não o acumulado
                    if (content) {
                        onChunk(content);  // ← Envia apenas este chunk
                    }
                    
                    fullResponse += content;  // ← Acumula localmente
                }

                return fullResponse;
            } 
            // ❌ SE NÃO TEM CALLBACK: USA INVOKE (sem streaming)
            else {
                const response = await selectedModel.invoke(langchainMessages);
                return String(response.content);
            }

        } catch (error) {
            console.error("Error in OpenAiChatCompletion:", error);
            throw error;
        }
    },
    {
        name: "OpenAI Chat Completion",
        run_type: "llm",
        metadata: {
            provider: "OpenAI"
        }
    }
) as (messages: any, modelType?: "advanced" | "balanced" | "fast", onChunk?: (chunk: string) => void) => Promise<string>;

// ===== toolSelector (MANTÉM ORIGINAL) =====
export const toolSelector = traceable(
    async function toolSelector(
        userInput: any, 
        sessionHistory: any[] = []
    ): Promise<{ tool: string; input: any }> {

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

        const messages = [
            { role: "system", content: systemPrompt },
            ...sessionHistory,
            { role: "user", content: userInput }
        ]

        try {
            // ✅ USA GPT-4o (BALANCEADO) - SEM STREAMING (mais rápido)
            const response = await OpenAiChatCompleiton(messages, "balanced");
            let toolCall;

            try {
                toolCall = JSON.parse(response);
            } catch (parseError) {
                console.warn("⚠️ Erro ao parsear JSON. Usando fallback...");
                return { 
                    tool: "hybrid_search_tool", 
                    input: { query: userInput, filters: {} } 
                };
            }

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

        } catch (error) {
            console.error("❌ Erro no toolSelector:", error);
            return { 
                tool: "hybrid_search_tool", 
                input: { query: userInput, filters: {} } 
            };
        }

    },
    {
        name: "Tool Selector",
        run_type: "chain",
        metadata: {
            purpose: "Route user query to appropriate tool",
            model: "gpt-4o"
        }
    }
) as (userInput: any, sessionHistory?: any[]) => Promise<{ tool: string; input: any }>;

// ===== getLlmResponse COM STREAMING =====
const getLlmResponse = traceable(
    async function getLlmResponse(
        messages: any, 
        systemMessageContent: any,
        modelType: "advanced" | "balanced" | "fast" = "advanced",
        onChunk?: (chunk: string) => void  // ← Callback para streaming (opcional)
    ): Promise<string> {
        const fullMessages = [
            { role: "system", content: systemMessageContent },
            ...messages
        ];

        // ✅ Passa o callback para OpenAiChatCompleiton
        const response = await OpenAiChatCompleiton(fullMessages, modelType, onChunk);
        return response;
    },
    {
        name: "Get LLM Response",
        run_type: "chain",
        metadata: {
            purpose: "Generate final response with system prompt"
        }
    }
) as (messages: any, systemMessageContent: any, modelType?: "advanced" | "balanced" | "fast", onChunk?: (chunk: string) => void) => Promise<string>;

// ===== generateResponse COM STREAMING =====
export const generateResponse = traceable(
    async function generateResponse(
        sessionId: any, 
        userInput: any,
        onChunk?: (chunk: string) => void  // ← Callback para streaming (opcional)
    ): Promise<string> {
        
        await storeChatMessage(sessionId, "user", userInput);
        const sessionHistory: any[] = await retrieverSessionHistory(sessionId);
        const llmInput = [...sessionHistory];
        const { tool, input: toolInput } = await toolSelector(userInput, sessionHistory);
        console.log("🔧 Tool selecionada:", tool);

        let response;

        // ===== TOOL 1: specific_query_tool (USA GPT-5) =====
        if (tool === "specific_query_tool") {
            console.log("🔍 Executando specific_query_tool...");
            
            const finalFilters = { "month": sessionId };
            const finalToolInput = { 
                query: toolInput.query || userInput, 
                filters: finalFilters 
            };
            
            const contextResults = await specificQueryTool(finalToolInput);
            const context = contextResults
                .map((doc:any) => doc.document?.pageContent || JSON.stringify(doc))
                .join('\n---\n');
            
            const systemMessageContent = `
                Você é um analista financeiro. Responda usando o contexto.
                
                REGRA CRÍTICA: Campos "InCents" têm 4 casas decimais.
                SEMPRE DIVIDA POR 10.000 para converter para Reais.
                
                Use Markdown com títulos, negrito, tabelas.
                
                Contexto:
                ${context}`.trim();
            
            // ✅ USA GPT-5 (ALTA PRECISÃO) + STREAMING
            response = await getLlmResponse(llmInput, systemMessageContent, "advanced", onChunk);
        }
        
        // ===== TOOL 2: aggregate_tool (USA GPT-4o) =====
        else if (tool === "aggregate_tool") {
            console.log("📊 Executando aggregate_tool...");
            
            const finalFilters = { "month": sessionId };
            const finalToolInput = { 
                query: toolInput.query || userInput, 
                filters: finalFilters,
                groupBy: toolInput.groupBy || "company"
            };
            
            const contextResults = await aggregateTool(finalToolInput);
            const contextData = JSON.parse(contextResults[0].document.pageContent);
            const context = JSON.stringify(contextData, null, 2);
            
            const systemMessageContent = `
                Você é um analista financeiro. Os dados JÁ ESTÃO AGREGADOS.
                NÃO precisa somar novamente! Apenas formate.
                
                REGRA CRÍTICA: Campos "InCents" têm 4 casas decimais.
                SEMPRE DIVIDA POR 10.000 para converter para Reais.
                
                Use Markdown com tabela. Ordene por receita líquida.
                
                Contexto (já agregado):
                ${context}`.trim();
            
            // ✅ USA GPT-4o (BALANCEADO - formatação simples) + STREAMING
            response = await getLlmResponse(llmInput, systemMessageContent, "balanced", onChunk);
        }
        
        // ===== TOOL 3: hybrid_search_tool (USA GPT-5) =====
        else if (tool === "hybrid_search_tool") {
            console.log("🔀 Executando hybrid_search_tool...");
            
            const finalFilters = { "month": sessionId };
            const finalToolInput = { 
                query: toolInput.query || userInput, 
                filters: finalFilters 
            };
            
            const contextResults = await hybridSearchTool(finalToolInput);
            const context = contextResults
                .map((doc:any) => doc.document?.pageContent || JSON.stringify(doc))
                .join('\n---\n');
            
            const systemMessageContent = `
                Você é um analista financeiro. Faça uma análise abrangente.
                
                REGRA CRÍTICA: Campos "InCents" têm 4 casas decimais.
                SEMPRE DIVIDA POR 10.000 para converter para Reais.
                
                Use Markdown com títulos, tabelas, listas.
                
                Contexto:
                ${context}`.trim();
            
            // ✅ USA GPT-5 (ALTA INTELIGÊNCIA) + STREAMING
            response = await getLlmResponse(llmInput, systemMessageContent, "advanced", onChunk);
        }
        
        // ===== TOOL 4: calculator_tool =====
        else if (tool === "calculator_tool") {
            console.log("🧮 Executando calculator_tool...");
            response = calculatorTool(toolInput);
            
            // Envia resposta de uma vez (não é LLM)
            if (onChunk) {
                onChunk(response);
            }
        }
        
        // ===== TOOL 5: none (USA GPT-4o-mini) =====
        else {
            console.log("💬 Nenhuma tool necessária (cumprimento)");
            
            const systemMessageContent = `
                Você é um assistente prestativo. Seja cordial.
                Use Markdown se necessário.
            `.trim();
            
            // ✅ USA GPT-4o-mini (RÁPIDO) + STREAMING
            response = await getLlmResponse(llmInput, systemMessageContent, "fast", onChunk);
        }

        await storeChatMessage(sessionId, "system", response);
        return response;

    },
    {
        name: "Generate Response",
        run_type: "chain",
        metadata: {
            purpose: "Main orchestration with optimized model selection and streaming"
        }
    }
) as (sessionId: any, userInput: any, onChunk?: (chunk: string) => void) => Promise<string>;
