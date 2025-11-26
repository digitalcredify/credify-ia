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




export const runJuridicoToolRoutingAgent = traceable(

    async function runJuridicoToolRoutingAgent(pergunta: string,document:string, name:string):
        Promise<any> {

        const parser = new JsonOutputParser();
        const systemPrompt = `
            Você é um agente especealizado em direcionar perguntas sobre processos judiciais para as ferramentas corretas.

            Ferramentas disponíveis:
            ${JURIDICO_TOOLS.map(tool => `- ${tool.name}: ${tool.description}`).join("\n")}

            Sua tarefa é:
                1. Analisar a pergunta semanticamente
                2. Identificar qual(is) ferramenta(s) melhor responde(m) à pergunta
                4. Retornar um JSON com a estrutura: { "tool":"nome_tool", "reasoning": "explicação" }

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

            // return fallbackJuridicoToolRouting(pergunta);

        }
    },
    { name: "Juridico tool - Roteador", run_type: "chain" }

)

export const juridicoPartiesAnalysisTool = traceable(
    async function juridicoPartiesAnalysis(input: {query:string, filters:any}) {
        console.log("[Juridico Parties Analysis] análisando com a ferramenta de partes 📊")

        try {
            
            const retriever = vectorStore.asRetriever({
                k:50,
                filter:input.filters
            })

            const results = await retriever._getRelevantDocuments(input.query)

            console.log(`🔍 [Juridico Parties Analysis]: ${results.length} documentos encontrados`);

            return results.map(doc => ({
                document:doc,
                score:null
            }))


        } catch (error:any) {
            console.error("❌ Erro no Operation Specific Query Tool:", error.message);
            return []
        }
    },
    {name: "Juridico Parties Analysis (Tool)", run_type: "retriever"}
)

// function fallbackJuridicoToolRouting(pergunta: string): IJuridicoToolRoutingResult {
//     const perguntaLower = pergunta.toLowerCase();
//     const tools: string[] = [];
//     const filters: any = {};

//     // Verifica se deve usar processAnalysis
//     if (
//         perguntaLower.includes("processo") ||
//         perguntaLower.includes("número cnj") ||
//         perguntaLower.includes("status") ||
//         perguntaLower.includes("valor da causa") ||
//         perguntaLower.includes("tribunal") ||
//         perguntaLower.includes("classe processual")
//     ) {
//         tools.push("processAnalysis");
//     }

//     // Verifica se deve usar partiesAnalysis
//     if (
//         perguntaLower.includes("partes") ||
//         perguntaLower.includes("autor") ||
//         perguntaLower.includes("réu") ||
//         perguntaLower.includes("polo") ||
//         perguntaLower.includes("advogado") ||
//         perguntaLower.includes("representante")
//     ) {
//         tools.push("partiesAnalysis");
//     }

//     // Verifica se deve usar decisionsAnalysis
//     if (
//         perguntaLower.includes("decisão") ||
//         perguntaLower.includes("julgamento") ||
//         perguntaLower.includes("sentença") ||
//         perguntaLower.includes("acórdão") ||
//         perguntaLower.includes("apelação") ||
//         perguntaLower.includes("resultado")
//     ) {
//         tools.push("decisionsAnalysis");
//     }

//     // Verifica se deve usar riskAnalysis
//     if (
//         perguntaLower.includes("risco") ||
//         perguntaLower.includes("total de processos") ||
//         perguntaLower.includes("valor total") ||
//         perguntaLower.includes("exposição") ||
//         perguntaLower.includes("quantos processos")
//     ) {
//         tools.push("riskAnalysis");
//     }

//     // Verifica se deve usar comparativeAnalysis
//     if (
//         perguntaLower.includes("comparativo") ||
//         perguntaLower.includes("por tribunal") ||
//         perguntaLower.includes("por área") ||
//         perguntaLower.includes("distribuição") ||
//         perguntaLower.includes("ranking")
//     ) {
//         tools.push("comparativeAnalysis");
//     }

//     // Verifica se deve usar timelineAnalysis
//     if (
//         perguntaLower.includes("timeline") ||
//         perguntaLower.includes("período") ||
//         perguntaLower.includes("evolução") ||
//         perguntaLower.includes("ao longo do tempo") ||
//         perguntaLower.includes("mais antigo") ||
//         perguntaLower.includes("mais recente")
//     ) {
//         tools.push("timelineAnalysis");
//     }

//     // Verifica se deve usar targetProfileAnalysis
//     if (
//         perguntaLower.includes("perfil") ||
//         perguntaLower.includes("dados cadastrais") ||
//         perguntaLower.includes("histórico geral")
//     ) {
//         tools.push("targetProfileAnalysis");
//     }

//     // Se nenhuma ferramenta foi selecionada, usa specificQuery
//     if (tools.length === 0) {
//         tools.push("specificQuery");
//     }

//     return {
//         tools,
//         filters: Object.keys(filters).length > 0 ? filters : undefined,
//         reasoning: "Direcionamento via fallback (heurística simples)"
//     };
// }






export { JURIDICO_TOOLS };



