import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage } from "langchain";
import { z } from "zod";
import { middleModel } from "../utils/models";
import { runWebAgent } from "../agents/webAgent";
import { runPdfAgent } from "../agents/pdfAgent";

const routerSchema = z.object({
    routeName: z.enum(["web_agent", "pdf_agent"]).describe("A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumários em PDF."),
    reasoning: z.string().describe("Breve explicação do porquê esta rota foi escolhida")
})

const routerPromptTemplate = PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando o usuário pedir "PDF", "relatório em PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    
    Responda APENAS com JSON:
    {{"routeName": "web_agent" | "pdf_agent", "reasoning": "..."}}
`);

const classifyRequest = async (pergunta: string) => {
    console.log("Roteador: Classificando pergunta...");

    const routerAgent = routerPromptTemplate.pipe(middleModel).pipe(new JsonOutputParser())

    try {
        const result = await routerAgent.invoke({ pergunta })

        const validatedResult = routerSchema.parse(result)

        console.log(`Roteador: Decisão = ${validatedResult.routeName}. Razão = ${validatedResult.reasoning}`);
        return validatedResult;

    } catch (error) {
        console.error("Erro ao parsear ou validar a rota:", error);
        return { routeName: "web_agent", reasoning: "Erro no roteamento, usando fallback para Q&A." };

    }

}


const agentService = async (
    pergunta: string, 
    jsonData: any, 
    targetMonth: string,
    onChunk?: (chunk: string) => void  
) => {

    const routeDecision = await classifyRequest(pergunta)

    switch (routeDecision.routeName) {
        case 'web_agent':
            
            return await runWebAgent(pergunta, jsonData, targetMonth, onChunk)
        
        case "pdf_agent":
            
            return await runPdfAgent(targetMonth, pergunta);

        default:
            return {
                messages: [new HumanMessage("Desculpe, não consegui entender sua solicitação.")]
            };
    }

}

export default agentService;
