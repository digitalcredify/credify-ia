
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { fastModel } from "../config";
import { z } from "zod";
import { traceable } from "langsmith/traceable";


const routerSchema = z.object({

    routerName: z.enum(["web_agent", "pdf_agent"]).describe(
        "A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumário em PDF"
    ),
    reasoning: z.string().describe(
        "Breve explicação do porquê a rota foi escolhida"
    )
})

const routerPromptTemplate = PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando por exemplo o usuário pedir: "PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    Responda APENAS com JSON:
    {{ "routerName": "web_agent" | "pdf_agent", "reasoning": "..." }}
`
)

export const runRouterAgent = traceable(
    async function runRouterAgent(pergunta: string) {
        const routerAgent = routerPromptTemplate.pipe(fastModel).pipe(new JsonOutputParser)

        try {

            const result = await routerAgent.invoke({ pergunta })
            const validatedResult = routerSchema.parse(result)

            console.log(`Roteador: Decisão = ${validatedResult.routerName}. Razão = ${validatedResult.reasoning}`);

            return validatedResult
        } catch (error) {
            console.error("Erro ao parsear ou validar a rota:", error);

            return { routerName: "web_agent", reasoning: "Tivemos um erro inesperado, tente novamente mais tarde." };

        }

    }

)
