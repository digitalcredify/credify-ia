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
exports.generateJuridicoResponse = void 0;
const traceable_1 = require("langsmith/traceable");
const Juridicotools_1 = require("../../tools/juridico/Juridicotools");
const messages_1 = require("@langchain/core/messages");
const config_1 = require("../../config");
const createJuridicoFilter = (document, name) => {
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
    };
};
const selectAndExecuteTools = (0, traceable_1.traceable)(function selectAndExecuteTools(pergunta, document, name) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[Juridico Planning] Selecionando ferramentas com agente inteligente...");
        const tool = yield (0, Juridicotools_1.runJuridicoToolRoutingAgent)(pergunta, document, name);
        const qdrantFilter = createJuridicoFilter(document, name);
        const results = [];
        // ==================== PARTIES ANALYSIS ====================
        if (tool.tool === 'partiesAnalysis') {
            console.log('[Juridico Planning] Usando PartiesAnalysis');
            const resultPartiesAnalysis = yield (0, Juridicotools_1.juridicoPartiesAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultPartiesAnalysis
            });
        }
        // ==================== PROCESS ANALYSIS ====================
        if (tool.tool === 'processAnalysis') {
            console.log('[Juridico Planning] Usando ProcessAnalysis');
            const resultProcessAnalysis = yield (0, Juridicotools_1.juridicoProcessAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultProcessAnalysis
            });
        }
        // ==================== DECISIONS ANALYSIS ====================
        if (tool.tool === 'decisionsAnalysis') {
            console.log('[Juridico Planning] Usando DecisionsAnalysis');
            const resultDecisionsAnalysis = yield (0, Juridicotools_1.juridicoDecisionsAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultDecisionsAnalysis
            });
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
            console.log('[Juridico Planning] Usando ComparativeAnalysis');
            const resultComparativeAnalysis = yield (0, Juridicotools_1.juridicoComparativeAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultComparativeAnalysis
            });
        }
        // ==================== TARGET PROFILE ANALYSIS ====================
        if (tool.tool === 'targetProfileAnalysis') {
            console.log('[Juridico Planning] Usando TargetProfileAnalysis');
            const resultTargetProfileAnalysis = yield (0, Juridicotools_1.juridicoTargetProfileAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultTargetProfileAnalysis
            });
        }
        // ==================== TIMELINE ANALYSIS ====================
        if (tool.tool === 'timelineAnalysis') {
            console.log('[Juridico Planning] Usando TimelineAnalysis');
            const resultTimelineAnalysis = yield (0, Juridicotools_1.juridicoTimelineAnalysisTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultTimelineAnalysis
            });
        }
        // ==================== SPECIFIC QUERY ====================
        if (tool.tool === 'specificQuery') {
            console.log('[Juridico Planning] Usando SpecificQuery');
            const resultSpecificQuery = yield (0, Juridicotools_1.juridicoSpecificQueryTool)({
                query: pergunta,
                filters: qdrantFilter
            });
            results.push({
                tool: tool.tool,
                data: resultSpecificQuery
            });
        }
        console.log(`[Juridico Planning] ${results.length} ferramentas executadas`);
        return results;
    });
});
function generateResponseOpenAI(messages_2) {
    return __awaiter(this, arguments, void 0, function* (messages, // ← MODIFICADO: de 'any' para 'BaseMessage[]'
    modelType = "advanced", onChunk) {
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
exports.generateJuridicoResponse = (0, traceable_1.traceable)(function generateJuridicoResponse(pergunta, document, name, userId, // ← NOVO
sessionId, // ← NOVO
historyManager, // ← NOVO
onChunk) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("[Juridico Planning] Gerando resposta para pergunta jurídica...");
            const conversationHistory = yield historyManager.getHistoryForLLM(userId, sessionId);
            console.log(`📚 [Juridico Planning] Histórico: ${conversationHistory.length} mensagens`);
            const toolResults = yield selectAndExecuteTools(pergunta, document, name);
            let context = `
                Documento analisado analisado: ${document}.
                Nome da empresa: ${name}.
            `;
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
                    // Extrai métricas de risco se disponível
                    if (result.data && result.data.length > 0 && result.data[0].riskMetrics) {
                        context += JSON.stringify(result.data[0].riskMetrics, null, 2) + "\n\n";
                    }
                    else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }
                if (result.tool === 'comparativeAnalysis') {
                    context += "=== ANÁLISE COMPARATIVA ===\n";
                    context += "Distribuição de processos por tribunal, área, UF e classe:\n";
                    if (result.data && result.data.length > 0 && result.data[0].comparativeMetrics) {
                        context += JSON.stringify(result.data[0].comparativeMetrics, null, 2) + "\n\n";
                    }
                    else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }
                if (result.tool === 'targetProfileAnalysis') {
                    context += "=== ANÁLISE DE PERFIL ===\n";
                    context += "Perfil do alvo e padrão de envolvimento em processos:\n";
                    if (result.data && result.data.length > 0 && result.data[0].profileMetrics) {
                        context += JSON.stringify(result.data[0].profileMetrics, null, 2) + "\n\n";
                    }
                    else {
                        context += JSON.stringify(result.data, null, 2) + "\n\n";
                    }
                }
                if (result.tool === 'timelineAnalysis') {
                    context += "=== ANÁLISE TEMPORAL ===\n";
                    context += "Evolução temporal dos processos:\n";
                    if (result.data && result.data.length > 0 && result.data[0].timelineMetrics) {
                        context += JSON.stringify(result.data[0].timelineMetrics, null, 2) + "\n\n";
                    }
                    else {
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
            const messages = [
                new messages_1.SystemMessage(systemPrompt),
                ...conversationHistory, // ← Adicione histórico
                new messages_1.HumanMessage(pergunta)
            ];
            const response = yield generateResponseOpenAI(messages, "fast", onChunk);
            console.log("[Juridico Planning] Resposta gerada com sucesso");
            yield historyManager.addMessage(userId, sessionId, 'user', pergunta);
            yield historyManager.addMessage(userId, sessionId, 'assistant', response);
            return response;
        }
        catch (error) {
            console.error("[Juridico Planning] Erro ao gerar resposta:", error);
            throw error;
        }
    });
}, { name: "Gerando Resposta Juridica", run_type: "chain" });
