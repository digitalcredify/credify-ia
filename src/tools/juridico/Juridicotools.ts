import { HumanMessage, SystemMessage } from "langchain";
import { traceable } from "langsmith/traceable";
import { balancedModel, openAiEmbbeding, qdrantClient } from "../../config";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { QdrantVectorStore } from "@langchain/qdrant";

const QDRANT_JURIDICO_COLLECTION_NAME = 'credify_juridico_collection'


interface JuridicoToolDefinition {
    name: string,
    description: string,
    keywords: string[]
}

interface AnalysisResult {
    type: string;
    data: any;
    summary: string;
}

const vectorStore = new QdrantVectorStore(openAiEmbbeding, {
    client: qdrantClient,
    collectionName: QDRANT_JURIDICO_COLLECTION_NAME,
});

const JURIDICO_TOOLS: JuridicoToolDefinition[] = [
    {
        name: "processAnalysis",
        description: "Analisa detalhes de processos específicos: número CNJ, status, valor da causa, tribunal, área, classe processual, data de distribuição",
        keywords: ["processo", "número cnj", "status", "valor da causa", "tribunal", "classe processual", "distribuição", "grau do processo"]
    },
    {
        name: "partiesAnalysis",
        description: "Analisa as partes envolvidas nos processos: autores, réus, polos, advogados, documentos (CPF/CNPJ)",
        keywords: ["partes", "autor", "réu", "polo", "advogado", "representante", "documento", "cpf", "cnpj", "quem é"]
    },
    {
        name: "decisionsAnalysis",
        description: "Analisa decisões e julgamentos: histórico de decisões, última decisão, tipos de julgamento, datas de julgamento",
        keywords: ["decisão", "julgamento", "sentença", "acórdão", "apelação", "recurso", "histórico de decisões", "última decisão", "resultado"]
    },
    {
        name: "riskAnalysis",
        description: "Análise de risco: quantidade total de processos, valor total em risco, processos por status, processos ativos vs encerrados",
        keywords: ["risco", "total de processos", "valor total", "exposição", "quantidade", "quantos processos", "quanto em risco", "análise de risco"]
    },
    {
        name: "comparativeAnalysis",
        description: "Análise comparativa: processos por tribunal, por área, por UF, por classe processual, distribuição de processos",
        keywords: ["comparativo", "por tribunal", "por área", "por uf", "distribuição", "ranking", "qual tribunal", "qual área", "qual classe"]
    },
    {
        name: "targetProfileAnalysis",
        description: "Análise do perfil do alvo: dados cadastrais, histórico geral, padrão de envolvimento em processos",
        keywords: ["perfil", "dados cadastrais", "nome", "documento", "histórico geral", "quem é", "informações sobre"]
    },
    {
        name: "timelineAnalysis",
        description: "Análise temporal: processos por período, evolução ao longo do tempo, processos mais antigos, processos mais recentes",
        keywords: ["timeline", "período", "data", "quando", "ao longo do tempo", "evolução", "mais antigo", "mais recente", "por ano", "por mês"]
    },
    {
        name: "specificQuery",
        description: "Busca específica: para perguntas que não se encaixam nas categorias acima ou requerem busca customizada",
        keywords: ["qual", "quais", "onde", "como", "por quê", "detalhes", "informações"]
    }
];






function createJuridicoFilter(document?: string, name?: string) {
    const filters: any = {
        must: []
    };

    if (document !== undefined) {
        filters.must.push({
            key: "metadata.document",
            match: { value: document }
        });
    }

    if (name !== undefined) {
        filters.must.push({
            key: "metadata.name",
            match: { value: name }
        });
    }

    return filters.must.length > 0 ? filters : undefined;
}


export const juridicoProcessAnalysisTool = traceable(
    async function juridicoProcessAnalysisTool(input: {query: string, filters:any}) {
        console.log("[Juridico Process Analysis] Analisando detalhes de processos 📋")

        try {
            const retriever = vectorStore.asRetriever({
                k:50,
                filter:input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)
            console.log(`🔍 [Juridico Process Analysis]: ${results.length} processos encontrados`);

            return results.map(doc => ({
                document:doc,
                score:null
            }))


        } catch (error:any) {
            console.error("❌ Erro no juridicoProcessAnalysisTool:", error.message);
            return []
        }        
    },
    { name: "Juridico Process Analysis (Tool)", run_type: "retriever" }
)


export const juridicoPartiesAnalysisTool = traceable(
    async function juridicoPartiesAnalysisTool(input: {query:string, filters:any}) {

        console.log("[Juridico Parties Analysis] Analisando partes envolvidas 👥")

        try {
            const retriever = vectorStore.asRetriever({
                k:50,
                filter:input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Parties Analysis]: ${results.length} documentos encontrados`);

            return results.map(doc => ({
                document: doc,
                score: null
            }))


            
        } catch (error:any) {
            console.error("❌ Erro no juridicoPartiesAnalysisTool:", error.message);
            return []
        }
        
    },
    { name: "Juridico Parties Analysis (Tool)", run_type: "retriever" }
)

export const juridicoDecisionsAnalysisTool = traceable(
    async function juridicoDecisionsAnalysis(input: { query: string, filters: any }) {
        console.log("[Juridico Decisions Analysis] Analisando decisões e julgamentos ⚖️")

        try {
            const retriever = vectorStore.asRetriever({
                k: 50,
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Decisions Analysis]: ${results.length} decisões encontradas`);

            return results.map(doc => ({
                document: doc,
                score: null
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoDecisionsAnalysisTool:", error.message);
            return []
        }
    },
    { name: "Juridico Decisions Analysis (Tool)", run_type: "retriever" }
)

export const juridicoRiskAnalysisTool = traceable(
    async function juridicoRiskAnalysis(input: { query: string, filters: any }) {
        console.log("[Juridico Risk Analysis] Analisando riscos legais 📊")

        try {
            const retriever = vectorStore.asRetriever({
                k: 1000, 
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Risk Analysis]: ${results.length} processos analisados`);

            
            let totalValue = 0;
            let activeProcesses = 0;
            let closedProcesses = 0;
            const tribunalCount: { [key: string]: number } = {};
            const areaCount: { [key: string]: number } = {};

            results.forEach(doc => {
                const metadata = doc.metadata;
                
                
                if (metadata?.value) {
                    totalValue += metadata.value;
                }

                
                if (metadata?.status === 'Ativo' || metadata?.status === 'Em andamento') {
                    activeProcesses++;
                } else {
                    closedProcesses++;
                }

                
                if (metadata?.tribunal) {
                    tribunalCount[metadata.tribunal] = (tribunalCount[metadata.tribunal] || 0) + 1;
                }

                
                if (metadata?.area) {
                    areaCount[metadata.area] = (areaCount[metadata.area] || 0) + 1;
                }
            });

            const riskSummary = {
                totalProcesses: results.length,
                totalValue,
                activeProcesses,
                closedProcesses,
                tribunalDistribution: tribunalCount,
                areaDistribution: areaCount,
                averageValuePerProcess: results.length > 0 ? totalValue / results.length : 0
            };

            return results.map(doc => ({
                document: doc,
                score: null,
                riskMetrics: riskSummary
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoRiskAnalysisTool:", error.message);
            return []
        }
    },
    { name: "Juridico Risk Analysis (Tool)", run_type: "retriever" }
)

export const juridicoComparativeAnalysisTool = traceable(
    async function juridicoComparativeAnalysis(input: { query: string, filters: any }) {
        console.log("[Juridico Comparative Analysis] Analisando distribuição de processos 📈")

        try {
            const retriever = vectorStore.asRetriever({
                k: 1000,
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Comparative Analysis]: ${results.length} processos comparados`);

            
            const byTribunal: { [key: string]: { count: number; value: number } } = {};
            const byArea: { [key: string]: { count: number; value: number } } = {};
            const byUF: { [key: string]: { count: number; value: number } } = {};
            const byClass: { [key: string]: { count: number; value: number } } = {};

            results.forEach(doc => {
                const metadata = doc.metadata;

                
                if (metadata?.tribunal) {
                    if (!byTribunal[metadata.tribunal]) {
                        byTribunal[metadata.tribunal] = { count: 0, value: 0 };
                    }
                    byTribunal[metadata.tribunal].count++;
                    byTribunal[metadata.tribunal].value += metadata.value || 0;
                }

                
                if (metadata?.area) {
                    if (!byArea[metadata.area]) {
                        byArea[metadata.area] = { count: 0, value: 0 };
                    }
                    byArea[metadata.area].count++;
                    byArea[metadata.area].value += metadata.value || 0;
                }

                
                if (metadata?.uf) {
                    if (!byUF[metadata.uf]) {
                        byUF[metadata.uf] = { count: 0, value: 0 };
                    }
                    byUF[metadata.uf].count++;
                    byUF[metadata.uf].value += metadata.value || 0;
                }

                
                const pageContent = doc.pageContent || '';
                const classMatch = pageContent.match(/Classe Processual: ([^\n]+)/);
                if (classMatch) {
                    const processClass = classMatch[1].trim();
                    if (!byClass[processClass]) {
                        byClass[processClass] = { count: 0, value: 0 };
                    }
                    byClass[processClass].count++;
                    byClass[processClass].value += metadata?.value || 0;
                }
            });

            const comparativeData = {
                byTribunal,
                byArea,
                byUF,
                byClass
            };

            return results.map(doc => ({
                document: doc,
                score: null,
                comparativeMetrics: comparativeData
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoComparativeAnalysisTool:", error.message);
            return []
        }
    },
    { name: "Juridico Comparative Analysis (Tool)", run_type: "retriever" }
)

export const juridicoTargetProfileAnalysisTool = traceable(
    async function juridicoTargetProfileAnalysis(input: { query: string, filters: any }) {
        console.log("[Juridico Target Profile Analysis] Analisando perfil do alvo 🎯")

        try {
            const retriever = vectorStore.asRetriever({
                k: 1000,
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Target Profile Analysis]: ${results.length} registros analisados`);

            
            let asAuthor = 0;
            let asDefendant = 0;
            const lawyerFrequency: { [key: string]: number } = {};
            const processAreas: { [key: string]: number } = {};

            results.forEach(doc => {
                const pageContent = doc.pageContent || '';

                
                if (pageContent.includes('Polo: Ativo')) {
                    asAuthor++;
                } else if (pageContent.includes('Polo: Passivo')) {
                    asDefendant++;
                }

                
                const lawyerMatch = pageContent.match(/Advogados: ([^\n]+)/g);
                if (lawyerMatch) {
                    lawyerMatch.forEach(match => {
                        const lawyers = match.replace('Advogados: ', '').split(',');
                        lawyers.forEach(lawyer => {
                            const lawyerName = lawyer.trim();
                            if (lawyerName && lawyerName !== 'N/A') {
                                lawyerFrequency[lawyerName] = (lawyerFrequency[lawyerName] || 0) + 1;
                            }
                        });
                    });
                }

                
                const areaMatch = pageContent.match(/Área: ([^\n]+)/);
                if (areaMatch) {
                    const area = areaMatch[1].trim();
                    processAreas[area] = (processAreas[area] || 0) + 1;
                }
            });

            const profileData = {
                totalProcesses: results.length,
                asAuthor,
                asDefendant,
                authorPercentage: results.length > 0 ? ((asAuthor / results.length) * 100).toFixed(2) + '%' : '0%',
                defendantPercentage: results.length > 0 ? ((asDefendant / results.length) * 100).toFixed(2) + '%' : '0%',
                frequentLawyers: Object.entries(lawyerFrequency)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {}),
                processAreas
            };

            return results.map(doc => ({
                document: doc,
                score: null,
                profileMetrics: profileData
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoTargetProfileAnalysisTool:", error.message);
            return []
        }
    },
    { name: "Juridico Target Profile Analysis (Tool)", run_type: "retriever" }
)

export const juridicoTimelineAnalysisTool = traceable(
    async function juridicoTimelineAnalysis(input: { query: string, filters: any }) {
        console.log("[Juridico Timeline Analysis] Analisando evolução temporal ⏱️")

        try {
            const retriever = vectorStore.asRetriever({
                k: 1000,
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Timeline Analysis]: ${results.length} processos analisados`);

            
            const byYear: { [key: string]: number } = {};
            let oldestDate = new Date();
            let newestDate = new Date(0);

            results.forEach(doc => {
                const pageContent = doc.pageContent || '';
                const dateMatch = pageContent.match(/Data de Distribuição.*?: ([^\n]+)/);
                
                if (dateMatch) {
                    const dateStr = dateMatch[1].trim();
                    try {
                        const date = new Date(dateStr);
                        const year = date.getFullYear().toString();
                        byYear[year] = (byYear[year] || 0) + 1;

                        if (date < oldestDate) oldestDate = date;
                        if (date > newestDate) newestDate = date;
                    } catch (e) {
                        
                    }
                }
            });

            const timelineData = {
                totalProcesses: results.length,
                oldestProcess: oldestDate.getFullYear() !== new Date().getFullYear() ? oldestDate.toISOString().split('T')[0] : 'N/A',
                newestProcess: newestDate.getFullYear() !== 1970 ? newestDate.toISOString().split('T')[0] : 'N/A',
                processesByYear: byYear,
                timespan: Object.keys(byYear).length > 0 ? `${Math.min(...Object.keys(byYear).map(Number))} - ${Math.max(...Object.keys(byYear).map(Number))}` : 'N/A'
            };

            return results.map(doc => ({
                document: doc,
                score: null,
                timelineMetrics: timelineData
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoTimelineAnalysisTool:", error.message);
            return []
        }
    },
    { name: "Juridico Timeline Analysis (Tool)", run_type: "retriever" }
)

export const juridicoSpecificQueryTool = traceable(
    async function juridicoSpecificQuery(input: { query: string, filters: any }) {
        console.log("[Juridico Specific Query] Executando busca customizada 🔎")

        try {
            const retriever = vectorStore.asRetriever({
                k: 100,
                filter: input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Specific Query]: ${results.length} resultados encontrados`);

            return results.map(doc => ({
                document: doc,
                score: null
            }))

        } catch (error: any) {
            console.error("❌ Erro no juridicoSpecificQueryTool:", error.message);
            return []
        }
    },
    { name: "Juridico Specific Query (Tool)", run_type: "retriever" }
)

export const runJuridicoToolRoutingAgent = traceable(
    async function runJuridicoToolRoutingAgent(pergunta: string, document: string, name: string):
        Promise<any> {

        const parser = new JsonOutputParser();
        const systemPrompt = `
            Você é um agente especializado em direcionar perguntas sobre processos judiciais para as ferramentas corretas.

            Ferramentas disponíveis:
            ${JURIDICO_TOOLS.map(tool => `- ${tool.name}: ${tool.description}`).join("\n")}

            Sua tarefa é:
                1. Analisar a pergunta semanticamente
                2. Identificar qual(is) ferramenta(s) melhor responde(m) à pergunta
                3. Retornar um JSON com a estrutura: { "tool":"nome_tool", "reasoning": "explicação" }

            Regras:
                - Se pergunta é sobre detalhes de um processo específico → processAnalysis
                - Se pergunta é sobre partes, advogados, polos → partiesAnalysis
                - Se pergunta é sobre decisões, julgamentos, sentenças → decisionsAnalysis
                - Se pergunta é sobre quantidade total, valor total, risco → riskAnalysis
                - Se pergunta é sobre comparação entre processos (por tribunal, área, etc) → comparativeAnalysis
                - Se pergunta é sobre o alvo (pessoa/empresa) em geral → targetProfileAnalysis
                - Se pergunta é sobre datas, períodos, evolução temporal → timelineAnalysis
                - Se não se encaixa em nenhuma → specificQuery
                - Pode retornar múltiplas ferramentas se a pergunta exigir

            Responda APENAS com o JSON, sem explicações adicionais.`;

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(pergunta)
        ]

        try {
            const chain = balancedModel.pipe(parser)
            const response = await chain.invoke(messages);
            
            return response

        } catch (error) {
            console.error("[Juridico Tool Routing] Erro ao processar resposta do modelo:", error);
            console.log("[Juridico Tool Routing] Usando fallback com heurística simples");
            return { tool: "specificQuery", reasoning: "Fallback para busca específica" };
        }
    },
    { name: "Juridico tool - Roteador", run_type: "chain" }
)










export { JURIDICO_TOOLS };



