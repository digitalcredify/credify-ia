import { traceable } from "langsmith/traceable";
import {
    juridicoComparativeAnalysisTool,
    juridicoDecisionsAnalysisTool,
    juridicoPartiesAnalysisTool,
    juridicoProcessAnalysisTool,
    juridicoSpecificQueryTool,
    juridicoTargetProfileAnalysisTool,
    juridicoTimelineAnalysisTool,
    runJuridicoToolRoutingAgent
} from "../../tools/juridico/Juridicotools";
import { content } from "pdfkit/js/page";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { advancedModel, balancedModel, fastModel } from "../../config";
import { match } from "assert";
import { ConversationHistoryManager } from "../../service/conversationHistoryManager";


const createJuridicoFilter = (document: string, name: string,) => {
    return {
        must: [
            {
                key: "metadata.document",
                match: { value: document }
            },
            {
                key: "metadata.name",
                match: { value: name }
            }
        ]
    }
}

const selectAndExecuteTools = traceable(
    async function selectAndExecuteTools(
        pergunta: string,
        document: string,
        name: string): Promise<any[]> {

        console.log("[Juridico Planning] Selecionando ferramentas com agente inteligente...");

        const tool = await runJuridicoToolRoutingAgent(pergunta, document, name)

        const qdrantFilter = createJuridicoFilter(document, name)

        const results: any[] = []

        // ==================== PARTIES ANALYSIS ====================
        if (tool.tool === 'partiesAnalysis') {
            console.log('[Juridico Planning] Usando PartiesAnalysis')

            const resultPartiesAnalysis = await juridicoPartiesAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultPartiesAnalysis
            })
        }

        // ==================== PROCESS ANALYSIS ====================
        if (tool.tool === 'processAnalysis') {
            console.log('[Juridico Planning] Usando ProcessAnalysis')

            const resultProcessAnalysis = await juridicoProcessAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultProcessAnalysis
            })
        }

        // ==================== DECISIONS ANALYSIS ====================
        if (tool.tool === 'decisionsAnalysis') {
            console.log('[Juridico Planning] Usando DecisionsAnalysis')

            const resultDecisionsAnalysis = await juridicoDecisionsAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultDecisionsAnalysis
            })
        }

        // ==================== RISK ANALYSIS ====================
        // if (tool.tool === 'riskAnalysis') {
        //     console.log('[Juridico Planning] Usando RiskAnalysis')

        //     const resultRiskAnalysis = await juridicoRiskAnalysisTool({
        //         query: pergunta,
        //         filters: qdrantFilter
        //     })

        //     results.push({
        //         tool: tool.tool,
        //         data: resultRiskAnalysis
        //     })
        // }

        // ==================== COMPARATIVE ANALYSIS ====================
        if (tool.tool === 'comparativeAnalysis') {
            console.log('[Juridico Planning] Usando ComparativeAnalysis')

            const resultComparativeAnalysis = await juridicoComparativeAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultComparativeAnalysis
            })
        }

        // ==================== TARGET PROFILE ANALYSIS ====================
        if (tool.tool === 'targetProfileAnalysis') {
            console.log('[Juridico Planning] Usando TargetProfileAnalysis')

            const resultTargetProfileAnalysis = await juridicoTargetProfileAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultTargetProfileAnalysis
            })
        }

        // ==================== TIMELINE ANALYSIS ====================
        if (tool.tool === 'timelineAnalysis') {
            console.log('[Juridico Planning] Usando TimelineAnalysis')

            const resultTimelineAnalysis = await juridicoTimelineAnalysisTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultTimelineAnalysis
            })
        }

        // ==================== SPECIFIC QUERY ====================
        if (tool.tool === 'specificQuery') {
            console.log('[Juridico Planning] Usando SpecificQuery')

            const resultSpecificQuery = await juridicoSpecificQueryTool({
                query: pergunta,
                filters: qdrantFilter
            })

            results.push({
                tool: tool.tool,
                data: resultSpecificQuery
            })
        }

        console.log(`[Juridico Planning] ${results.length} ferramentas executadas`)

        return results

    }
)

async function generateResponseOpenAI(
    messages: BaseMessage[],  
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

export const generateJuridicoResponse = traceable(
    async function generateJuridicoResponse(
        pergunta: string,
        document: string,
        name: string,
        userId: string,  
        sessionId: string,  
        historyManager: ConversationHistoryManager,  
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        try {
            console.log("[Juridico Planning] Gerando resposta para pergunta jurídica...");

            const conversationHistory = await historyManager.getHistoryForLLM(
                userId,
                sessionId
            );
            console.log(`📚 [Juridico Planning] Histórico: ${conversationHistory.length} mensagens`);

            const toolResults = await selectAndExecuteTools(pergunta, document, name);

            let context = `
                Documento analisado analisado: ${document}.
                Nome da empresa: ${name}.
            `

            context += `\n\n`;

            if (conversationHistory.length > 0) {
                context += `## HISTÓRICO DA CONVERSA:\n`;
                conversationHistory.forEach((msg, index) => {
                    const role = msg._getType() === 'human' ? 'Usuário' : 'Assistente';
                    context += `${index + 1}. **${role}**: ${msg.content}\n`;
                });
                context += `\n\n`;
            }

            for (const result of toolResults) {

                if (result.tool === 'processAnalysis') {
                    context += "=== ANÁLISE DE PROCESSOS ===\n";
                    context += "Detalhes dos processos encontrados:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }

                if (result.tool === 'partiesAnalysis') {
                    context += "=== ANÁLISE DE PARTES ===\n";
                    context += "Informações das partes envolvidas:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }

                if (result.tool === 'decisionsAnalysis') {
                    context += "=== ANÁLISE DE DECISÕES ===\n";
                    context += "Histórico de decisões e julgamentos:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }

                if (result.tool === 'riskAnalysis') {
                    context += "=== ANÁLISE DE RISCO ===\n";
                    context += "Métricas de risco e exposição:\n";

                    if (result.data && result.data.length > 0 && result.data[0].riskMetrics) {
                        context += JSON.stringify(result.data[0].riskMetrics, null, 2) + "\n\n";
                    } else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }

                if (result.tool === 'comparativeAnalysis') {
                    context += "=== ANÁLISE COMPARATIVA ===\n";
                    context += "Distribuição de processos por tribunal, área, UF e classe:\n";

                    if (result.data && result.data.length > 0 && result.data[0].comparativeMetrics) {
                        context += JSON.stringify(result.data[0].comparativeMetrics, null, 2) + "\n\n";
                    } else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }

                if (result.tool === 'targetProfileAnalysis') {
                    context += "=== ANÁLISE DE PERFIL ===\n";
                    context += "Perfil do alvo e padrão de envolvimento em processos:\n";

                    if (result.data && result.data.length > 0 && result.data[0].profileMetrics) {
                        context += JSON.stringify(result.data[0].profileMetrics, null, 2) + "\n\n";
                    } else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }

                if (result.tool === 'timelineAnalysis') {
                    context += "=== ANÁLISE TEMPORAL ===\n";
                    context += "Evolução temporal dos processos:\n";

                    if (result.data && result.data.length > 0 && result.data[0].timelineMetrics) {
                        context += JSON.stringify(result.data[0].timelineMetrics, null, 2) + "\n\n";
                    } else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }

                if (result.tool === 'specificQuery') {
                    context += "=== BUSCA ESPECÍFICA ===\n";
                    context += "Resultados da busca customizada:\n";
                    context += JSON.stringify(result.data, null, 2) + "\n\n";
                }
            }

            const systemPrompt = `
            Você é um especialista em análise jurídica especializado em litigância e compliance. 
            Sua tarefa é analisar dados de processos judiciais e fornecer respostas precisas, 
            estruturadas e acionáveis sobre o perfil processual de pessoas ou empresas.

            ## CONTEXTO ATUAL

            ${context}

            ## ESTRUTURA DOS DADOS DISPONÍVEIS

            Os dados fornecidos contêm informações sobre processos judiciais estruturados da seguinte forma:

            **Para cada processo:**
            - **Identificação**: Número único CNJ, grau do processo (1º/2º grau)
            - **Localização**: Tribunal, UF, área jurídica (Cível, Comercial, Administrativo, etc.)
            - **Classificação**: Classe processual (tipo de ação)
            - **Cronologia**: Data de distribuição (nascimento do processo)
            - **Valor**: Valor da causa em reais
            - **Status**: Situação atual do processo
            - **Partes**: Autores, réus, polos (ativo/passivo), CPF/CNPJ
            - **Representação**: Advogados responsáveis por cada parte
            - **Histórico**: Decisões e julgamentos com datas e tipos

            ## INSTRUÇÕES CRÍTICAS

### 1. LEIA O CONTEXTO FORNECIDO
O contexto acima contém TODOS os dados que você precisa. Ele inclui:
- Identificação do alvo (${name} - ${document})
- Dados estruturados dos processos recuperados
- Informações das partes envolvidas em JSON

**SEMPRE** use os dados do contexto como base. Não faça suposições além do que está fornecido.

### 2. ANÁLISE DE PARTES (Quando a pergunta for sobre partes, advogados, polos)
Os dados de partes incluem:
- Tipo de parte (Pessoa Física, Pessoa Jurídica, etc.)
- Nome completo
- Polo (Ativo = autor/demandante, Passivo = réu/demandado)
- CPF/CNPJ
- Advogados responsáveis

**Ao analisar partes:**
- Identifique se ${name} é autor ou réu em cada processo
- Liste os advogados com seus nomes completos
- Analise se os mesmos advogados aparecem em múltiplos processos (padrão de representação)
- Identifique relacionamentos entre partes (mesmos litigantes em diferentes ações)
- Destaque se há partes recorrentes (aparecem em vários processos)

### 3. ANÁLISE DE PROCESSOS (Quando a pergunta for sobre detalhes específicos)
**Informações disponíveis por processo:**
- Número CNJ (identificador único)
- Grau: 1º grau (primeira instância) ou 2º grau (apelação/recurso)
- Área: Cível, Comercial, Administrativo, Trabalhista, etc.
- Tribunal: Qual tribunal está julgando
- UF: Estado do tribunal
- Classe: Tipo de ação (ex: Ação Ordinária, Execução, etc.)
- Data de Distribuição: Quando o processo foi registrado
- Valor da Causa: Quanto está em disputa (em reais)
- Status: Situação atual (Ativo, Encerrado, Suspenso, etc.)

### 3.1 IDENTIFICADORES: USAR APENAS CNJ

**IMPORTANTE:**
- **Mostrar ao usuário**: Número CNJ (20 dígitos) - ex: 00011654020255190006
- **NÃO mostrar**: _ID (hash interno) - ex: 520fd37b90ce34c596e4ce9b5f5deb0b78a6beeb8fbd26670edf3940cc248774

O _ID é apenas para uso interno do sistema. Sempre cite o CNJ nas respostas.

**Ao analisar processos:**
- Cite sempre o número CNJ e tribunal
- Indique se está em 1º ou 2º grau (importante para entender estágio)
- Mencione o valor em risco
- Explique a classe processual se for relevante
- Indique o status e o que isso significa

### 4. ANÁLISE DE DECISÕES (Quando a pergunta for sobre julgamentos, resultados, histórico)
Os dados incluem:
- Tipo de julgamento (Sentença, Acórdão, Decisão Interlocutória, etc.)
- Data do julgamento
- Ordem de ocorrência (primeira, segunda, última decisão)

**Ao analisar decisões:**
- Liste as decisões em ordem cronológica
- Destaque a última decisão (mais recente)
- Indique se há recursos pendentes
- Analise a tendência (favorável ou desfavorável ao alvo)

### 5. ANÁLISE DE RISCO (Quando a pergunta for sobre exposição, quantidade, valor total)
**Calcule e apresente:**
- Quantidade total de processos
- Valor total em disputa (soma de todos os valores)
- Distribuição por status (quantos ativos, encerrados, suspensos)
- Distribuição por grau (1º vs 2º grau)
- Distribuição por tribunal (qual tem mais processos)
- Distribuição por área (qual área jurídica tem mais processos)
- Valor médio por processo
- Processos com maior valor (top 3)



**Ao avaliar risco:**
- Identifique se há concentração de risco em poucos processos
- Analise se há tendência de aumento/diminuição de processos
- Indique se o alvo é frequentemente autor ou réu
- Destaque processos com valores muito altos

### 6. ESTRUTURA DE RESPOSTA
Organize suas respostas assim:

**Para perguntas simples:**
1. Resposta direta (1-2 linhas)
2. Dados específicos (números, nomes, datas)
3. Contexto adicional se relevante

**Para perguntas complexas:**
1. Resumo executivo (2-3 linhas)
2. Análise detalhada com dados específicos
3. Tabela ou lista se houver múltiplos itens
4. Recomendações ou implicações
5. Ressalvas sobre limitações dos dados

### 7. PRECISÃO E CONFIABILIDADE
- **SEMPRE cite a fonte**: Número CNJ, tribunal, data
- **NUNCA faça suposições** além dos dados fornecidos
- Use expressões como: "De acordo com os dados", "Conforme registrado", "Segundo o processo"
- Se não houver informação, diga claramente: "Não há dados sobre..."
- Se os dados forem incompletos, indique: "Os dados disponíveis mostram..."

### 8. LINGUAGEM
- Tom profissional e objetivo
- Terminologia jurídica correta (CNJ, tribunal, classe processual, polo, grau)
- Evite jargão excessivo; explique conceitos se necessário
- Seja conciso mas completo
- Use números e datas específicas

### 9. LIMITAÇÕES
Sempre que relevante, mencione:
- Se os dados são parciais ou incompletos
- Se há lacunas de informação
- Se a análise requer informações adicionais
- Se há mudanças recentes não refletidas nos dados

### 10. EXEMPLOS DE RESPOSTAS

**Pergunta: "Quem são as partes envolvidas?"**
Resposta esperada:
"De acordo com os dados disponíveis, ${name} figura como [autor/réu] em [X] processos. Os advogados responsáveis são [nomes]. Observa-se que [análise de padrões]. As partes recorrentes são [nomes]."

**Pergunta: "Qual é o risco total?"**
Resposta esperada:
"A exposição total de ${name} é de R$ [valor], distribuída em [X] processos. Destes, [Y] estão ativos e [Z] encerrados. O processo com maior valor é [número CNJ] com R$ [valor] no tribunal [tribunal]. A média por processo é R$ [valor]."

**Pergunta: "Qual foi a última decisão?"**
Resposta esperada:
"No processo [número CNJ], a última decisão foi [tipo] em [data]. O processo está em [status]. Há [recursos pendentes/não há recursos pendentes]."

## FLUXO DE PROCESSAMENTO

1. **Leia o contexto** fornecido acima
2. **Identifique** que tipo de pergunta está sendo feita
3. **Localize** os dados relevantes no contexto
4. **Analise** os dados de acordo com as instruções acima
5. **Estruture** a resposta de forma clara
6. **Cite** sempre as fontes (CNJ, tribunal, datas)
7. **Valide** se respondeu completamente a pergunta
8. **Mencione** limitações se houver

### 🧩 POLÍTICA DE FORMATAÇÃO DE RESPOSTAS (OBRIGATÓRIA)

Todas as respostas devem ser formatadas em **Markdown**, SEM EXCEÇÃO.

**Regras de Formatação:**

1. **Ícone de Cabeçalho :** **SE ACHAR NECESSÁRIO** inicie a resposta com um emoji que represente o contexto, seguido de um título curto.
   - exemplo: 💰 ⚖️ 📊 📅 📋
 

2. **Estilo Minimalista:**
   - Seja direto. Evite frases de preenchimento ("Claro", "Aqui está").
   - Se achar necessário, utilize tabelas para apresentar dados em vez de listas longas de texto.
   - Use listas com marcadores apenas para observações curtas.

3. **Tabelas:** Use para qualquer conjunto de dados (valores, nomes, datas).
   | Campo | Valor |
   |--------|--------|
   | Exemplo | R$ 1.234,56 |

4. **Tipografia:**
   - Use ## para Títulos principais.
   - Use ### para Subtítulos.
   - Use **texto** para destacar valores monetários, nomes de partes e status.
   - Use crases \texto\ para números de processos (CNJ), IDs ou termos técnicos.

5. **Estrutura:**
   - Use --- para separar blocos de informação distintos (ex: separar a tabela da conclusão).

6. **Proibido:** - Não retornar texto puro ("blocão" de texto).
   - Não usar introduções prolixas.

## IMPORTANTE



Você está analisando dados reais de processos judiciais. A precisão é crítica. Os dados fornecidos no contexto acima são sua única fonte de verdade. Use-os completamente e cite-os sempre.

Agora responda à pergunta do usuário com base EXCLUSIVAMENTE nos dados fornecidos no contexto acima.



`;


             const messages: BaseMessage[] = [
                new SystemMessage(systemPrompt),
                ...conversationHistory,  
                new HumanMessage(pergunta)
            ]

            const response = await generateResponseOpenAI(messages, "fast", onChunk)

            console.log("[Juridico Planning] Resposta gerada com sucesso")

            try {
                await historyManager.addMessage(userId, sessionId, 'user', pergunta);
                await historyManager.addMessage(userId, sessionId, 'assistant', response);
                console.log(`✅ [Juridico Planning] Mensagens armazenadas com sucesso`);
            } catch (error) {
                console.warn(`⚠️ [Juridico Planning] Erro ao armazenar mensagens (não crítico):`, error);
            }

            return response


        } catch (error) {
            console.error("[Juridico Planning] Erro ao gerar resposta:", error)
            throw error
        }
    },
    { name: "Gerando Resposta Juridica", run_type: "chain" }

)