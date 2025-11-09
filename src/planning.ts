// esse arquivo incluira vários prompts e chamadas LLM para determinar o fluxo de execução do agente

import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { OPENAI_MODEL, openAIClient } from "./config";
import { retrieverSessionHistory, storeChatMessage } from "./memory";
import { calculatorTool, vectorSearchTool } from "./tools";
import { advancedModel } from "./utils/models";
import { traceable } from "langsmith/traceable";

const MARKDOWN_RESPONSE_POLICY = `
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

Resuma tudo sempre em formato legível e estruturado, com foco em clareza e consistência visual.
`.trim();

export const OpenAiChatCompleiton = traceable(
    async function OpenAiChatCompleiton(messages: any): Promise<string> {
        try {
            const langchainMessages = messages.map((msg: any) => {
                if (msg.role === "system") return new SystemMessage(msg.content);
                if (msg.role === "user") return new HumanMessage(msg.content);
                if (msg.role === "assistant") return new AIMessage(msg.content);
                return new HumanMessage(msg.content); 
            });

            const response = await advancedModel.invoke(langchainMessages);

            return String(response.content);

        } catch (error) {
            console.error("Error in openAIChatCompletion:", error);
            throw error;
        }
    },
    {
        name: "OpenAI Chat Completion",
        run_type: "llm",
        metadata: {
            model: "gpt-5-2025-08-07",
            provider: "OpenAI via LangChain"
        }
    }
) as (messages: any) => Promise<string>;

export const toolSelector = traceable(
    async function toolSelector(
        userInput: any, 
        sessionHistory: any[] = []
    ): Promise<{ tool: string; input: any }> {

        const systemPrompt = `
    Você é um roteador de tarefas inteligente. Sua principal função é analisar a PERGUNTA MAIS RECENTE do usuário e o HISTÓRICO DA CONVERSA para selecionar a ferramenta correta.

    ### Ferramentas Disponíveis
    - **vector_search_tool**: Recupera dados financeiros de empresas (consumo, valores, etc.).
      → Use quando o usuário perguntar sobre:
        • Dados, informações, métricas, análises
        • Empresas, representantes, organizações
        • Receita, custo, consumo, lucro
        • "me fale sobre...", "mostre...", "quais são..."
        • Qualquer pergunta que precise de dados do banco
        

    - **none**: APENAS para cumprimentos e agradecimentos.
      → Use SOMENTE quando o usuário disser:
        • "oi", "olá", "bom dia"
        • "obrigado", "valeu", "até logo"
      → NÃO use para perguntas sobre dados!

    ### ⚠️ REGRA CRÍTICA:
    Se houver QUALQUER menção a dados, empresas, representantes, métricas, análises, ou se o usuário pedir informações sobre "esses dados", "esses números", "essas informações", SEMPRE use "vector_search_tool".

    ### Regras de Roteamento
    1. **Analise o Histórico:** Preste MUITA atenção no histórico. Se a nova pergunta for uma continuação (ex: "e do mario?", "e da outra empresa?"), sua tarefa é manter a MESMA INTENÇÃO da pergunta anterior (ex: "gerar relatório").
    2. **NÃO extraia filtros:** Retorne SEMPRE "filters": {} para vector_search_tool. A busca vetorial semântica é suficiente.
    3. **Formato JSON:** Retorne APENAS o JSON da ferramenta.

    ### Exemplos

    **Exemplo 1: Pergunta Específica**
    Histórico: []
    Usuário: "Qual o total de consumo da CREDIFY?"
    Retorno:
    {"tool": "vector_search_tool", "input": {"query": "total de consumo da CREDIFY", "filters": {}}}

    **Exemplo 2: Pergunta Geral sobre Dados**
    Histórico: []
    Usuário: "me fale sobre esses dados"
    Retorno:
    {"tool": "vector_search_tool", "input": {"query": "análise geral de todos os dados disponíveis", "filters": {}}}

    **Exemplo 3: Pergunta Vaga**
    Histórico: [ { "role": "user", "content": "Me fale sobre o iFood" }, { "role": "assistant", "content": "(Relatório do iFood...)" } ]
    Usuário: "e da SEM PARAR?"
    Retorno:
    {"tool": "vector_search_tool", "input": {"query": "relatório completo da SEM PARAR", "filters": {}}}

    **Exemplo 4: Pergunta de Continuação**
    Histórico: [ { "role": "user", "content": "relatorio do representante pedro maia" }, { "role": "assistant", "content": "(Relatório completo do Pedro Maia...)" } ]
    Usuário: "agora quero do mario monteiro"
    Retorno:
    {"tool": "vector_search_tool", "input": {"query": "relatório completo do representante mario monteiro", "filters": {}}}

    **Exemplo 5: Cumprimento (ÚNICO caso de "none")**
    Histórico: [ ... ]
    Usuário: "muito obrigado"
    Retorno:
    {"tool": "none", "input": "muito obrigado"}


    `.trim();

        const messages = [
            { role: "system", content: systemPrompt },
            ...sessionHistory,
        ]

        try {
            const response = await OpenAiChatCompleiton(messages)
            let toolCall;

            try {
                if (response)
                    toolCall = JSON.parse(response)

            } catch (error) {
                try {
                    toolCall = eval(`(${response})`);
                } catch (error) {
                    return { tool: "none", input: userInput }
                }
            }

            return {
                tool: toolCall.tool || "none",
                input: toolCall.input || userInput
            }

        } catch (error) {
            console.log("error no toolSelector", error)
            return { tool: "none", input: userInput }
        }

    },
    {
        name: "Tool Selector",
        run_type: "chain",
        metadata: {
            purpose: "Route user query to appropriate tool"
        }
    }
) as (userInput: any, sessionHistory?: any[]) => Promise<{ tool: string; input: any }>;

const getLlmResponse = traceable(
    async function getLlmResponse(
        messages: any, 
        systemMessageContet: any
    ): Promise<string> {
        console.log(messages)

        const systemMessage = { role: "system", content: `${systemMessageContet}\n\n${MARKDOWN_RESPONSE_POLICY}` }

        let fullMessages;

        if (messages.some((msg: any) => msg.role === 'system')) {
            fullMessages = [...messages, systemMessage]
        }
        else {
            fullMessages = [systemMessage, ...messages]
        }

        const response = await OpenAiChatCompleiton(fullMessages)
        return response
    },
    {
        name: "Get LLM Response",
        run_type: "chain",
        metadata: {
            purpose: "Generate final response with context"
        }
    }
) as (messages: any, systemMessageContet: any) => Promise<string>;

export const generateResponse = traceable(
    async function generateResponse(
        sessionId: any, 
        userInput: any
    ): Promise<string> {
        await storeChatMessage(sessionId, "user", userInput);
        const sessionHistory: any[] = await retrieverSessionHistory(sessionId);
        const llmInput = [...sessionHistory];
        const { tool, input: toolInput } = await toolSelector(userInput, sessionHistory);
        console.log("Tool selecionada:", tool);

        let response;

        if (tool === "vector_search_tool") {
            const finalFilters = {
                "month": sessionId
            };

            const finalToolInput = {
                query: toolInput.query,
                filters: finalFilters
            };

            const contextResults = await vectorSearchTool(finalToolInput);
            const context = contextResults.map(doc => doc.document?.pageContent || JSON.stringify(doc)).join('\n---\n');

            const systemMessageContent = `
                Você é um analista financeiro sênior. Sua tarefa é usar o contexto JSON fornecido para responder perguntas, calcular métricas financeiras e agregar dados sob demanda.

                ### 1. Dicionário de Campos-Chave (Blocos de Construção)
                (Use estes campos para todos os cálculos)
                * 'totalConsumptions': O **Volume** (número total de transações/consultas).
                * 'totalValueInCents': A **Receita Bruta** (valor total, ANTES de descontos).
                * 'totalValueWithDiscountInCents': A **Receita Pós-Desconto** (base para cálculos de lucro).
                * 'totalSourcesCostInCents': O **Custo Direto** (custo de insumos).
                * 'company.name', 'representative.name', 'organization.name': Campos de agrupamento.

                ### 2. Regra de Formatação Monetária (Obrigatória e Crítica)
                Esta é a regra mais importante. Os campos "InCents" NÃO são centavos comuns. Eles possuem 4 casas decimais de precisão.

                **NÃO FAÇA ISSO (ERRADO):**
                * NUNCA divida o valor por 100.
                * Exemplo ERRADO: O valor '172800' dividido por 100 é 1728,00. **ISSO ESTÁ INCORRETO.**
                * Exemplo ERRADO: O valor '128900000' dividido por 100 é 1289000,00. **ISSO ESTÁ INCORRETO.**

                **FAÇA ISSO (CORRETO):**
                * Você **DEVE OBRIGATORIAMENTE DIVIDIR o valor por 10.000** (dez mil).
                * **Exemplo Correto 1:** O valor '172800' DEVE ser '172800 / 10000' = **17.28**. Formato final: **R$ 17,28**.
                * **Exemplo Correto 2:** O valor '128900000' DEVE ser '128900000 / 10000' = **12890.00**. Formato final: **R$ 12.890,00**.
                * **Exemplo Correto 3:** O valor '513831500' DEVE ser '513831500 / 10000' = **51383.15**. Formato final: **R$ 51.383,15**.
                
                Repito: para converter 'InCents' para Reais, **SEMPRE DIVIDA POR 10.000**.

                ### 3. Regras de Raciocínio e Cálculo
                * **Flexibilidade:** Use seu conhecimento financeiro para combinar os "Blocos de Construção" e calcular métricas (Rentabilidade, Margem de Lucro, Custo por Consumo, etc.).
                * **Agregação:** Se o usuário pedir um total "por representante" ou "geral", você DEVE inspecionar TODOS os documentos JSON no contexto, agrupar e SOMAR os valores.
                * **Exemplos de Cálculo:**
                    * **Receita Líquida (Lucro Bruto):** \`'totalValueWithDiscountInCents' - 'totalSourcesCostInCents'\`
                    * **Rentabilidade (Margem de Custo):** \`('totalSourcesCostInCents' / 'totalValueWithDiscountInCents')\` (Exiba como %)

                ### 4. FORMATAÇÃO DA RESPOSTA (MARKDOWN OBRIGATÓRIO)
                Você DEVE formatar suas respostas usando **Markdown**.

                **Regras de Formatação:**
                1.  **Títulos:** Use \`##\` para títulos principais e \`###\` para subtítulos.
                2.  **Negrito:** Use \`**texto**\` para destacar valores importantes, nomes e totais.
                3.  **Listas:** Use listas numeradas ou com marcadores.
                4.  **Tabelas:** Use tabelas Markdown para comparações de múltiplas empresas ou representantes.
                5.  **Código Inline:** Use \`texto\` (crases) para valores técnicos (CNPJ, IDs).
                6.  **Separação:** Use \`---\` para separar seções.
                7.  **Emojis (Opcional):** Use com moderação (ex: 📊, 💰).

                **Exemplos de Respostas Formatadas:**

                **Exemplo 1 (Valor Único):**
                \`\`\`
                ## 💰 Receita Líquida da Ifood
                
                A receita líquida (Lucro Bruto) da **Ifood** é de **R$ 39.813,55**.
                
                * **Receita Pós-Desconto:** R$ 51.383,15
                * **Custo Direto:** R$ 11.569,60
                \`\`\`

                **Exemplo 2 (Tabela de Agregação):**
                \`\`\`
                ## 📊 Rentabilidade por Representante

                | Representante | Receita Líquida | Custo Direto | Rentabilidade (Margem de Custo) |
                |---------------|-----------------|--------------|---------------------------------|
                | Pedro Maia    | R$ 90.123,45    | R$ 15.123,00 | 16.78%                          |
                | Mario Monteiro| R$ 70.456,12    | R$ 10.456,00 | 14.84%                          |
                
                ---
                O representante **Pedro Maia** possui a maior rentabilidade.
                \`\`\`

                ### 5. Processo de Resposta
                1.  Analise o pedido do usuário (ex: "rentabilidade por representante").
                2.  Localize os objetos JSON relevantes no 'Contexto:' abaixo.
                3.  Aplique as **Regras de Raciocínio e Cálculo** (Seção 3).
                4.  Aplique a **Regra de Formatação Monetária CORRETA (Seção 2)**.
                5.  Formate a resposta final seguindo as **Regras de Formatação Markdown** (Seção 4).
                6.  Se os dados não existirem, diga 'EU NÃO SEI'.

                Contexto:
                ${context}`.trim();

            response = await getLlmResponse(llmInput, systemMessageContent)
        }
        else if (tool === "calculator_tool") {
            response = calculatorTool(toolInput)
        }
        else {
            const systemMessageContent = `
                Você é um assistente prestativo. Responda à solicitação do usuário da melhor forma possível com base no histórico da conversa.

                **FORMATAÇÃO DA RESPOSTA (MARKDOWN OBRIGATÓIO):**
                Você DEVE formatar suas respostas usando **Markdown**.

                **Regras de Formatação:**
                1.  **Títulos:** Use \`##\` para títulos principais e \`###\` para subtítulos.
                2.  **Negrito:** Use \`**texto**\` para destacar partes importantes.
                3.  **Listas:** Use listas numeradas ou com marcadores.
                4.  **Código Inline:** Use \`texto\` (crases) para valores técnicos, se houver.
                5.  **Separação:** Use \`---\` para separar seções.
            `.trim();
            response = await getLlmResponse(llmInput, systemMessageContent)
        }

        await storeChatMessage(sessionId, "system", response)

        return response

    },
    {
        name: "Generate Response",
        run_type: "chain",
        metadata: {
            purpose: "Main orchestration function for RAG"
        }
    }
) as (sessionId: any, userInput: any) => Promise<string>;
