/**
 * @fileoverview 
 * este arquivo atua como um roteador inteligente, ele decide qual agente especealizado utilizar.
 * Web Agent: acionado quando é feita perguntas sobre dados.
 * PDF Agent: acionado quando o usuário pede explicitamente por um pdf.
 */


import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage } from "langchain";
import { z } from "zod";
import { runWebAgent } from "../agents/webAgent";
import { runPdfAgent } from "../agents/pdfAgent";
import { fastModel } from "../config";

// define um molde para o json retornado pelo roteador.
const routerSchema = 

        // define que deve ser um objeto
        z.object({ 
        
            // define a propriedade routerName
            routeName: 
                z.enum(["web_agent", "pdf_agent"]) // enum de string
                .describe("A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumários em PDF."), // metadado não necessário, útil apenas para documentação
            
            // explica do porque o agente foi escolhido.
            reasoning: 
                z.string(). // define como obrigatório.
                describe("Breve explicação do porquê esta rota foi escolhida")
        })

// prompt que instrui o modelo llm
const routerPromptTemplate = PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando por exemplo o usuário pedir: "PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    
    Responda APENAS com JSON:
    {{"routeName": "web_agent" | "pdf_agent", "reasoning": "..."}}
`);


// essa função executa o roteamento.
const runClassifyAgent = async (pergunta: string) => {
    console.log("Roteador: Classificando pergunta...");

    /** cria uma cadeia de "chains" do langchain
     * chain 1: o prompt é passado para o modelo
     * chain 2: a saida do modelo é convertida em um obsjon json
    */
    const routerAgent = routerPromptTemplate.pipe(fastModel).pipe(new JsonOutputParser())

    try {

        // invoka a resposta do llm com base na pergunta
        const result = await routerAgent.invoke({ pergunta })

        // valida se a resposta do llm ta no padrão definido ali em cima 
        const validatedResult = routerSchema.parse(result)

        console.log(`Roteador: Decisão = ${validatedResult.routeName}. Razão = ${validatedResult.reasoning}`);
        return validatedResult;

    } catch (error) {
        console.error("Erro ao parsear ou validar a rota:", error);
        return { routeName: "web_agent", reasoning: "Tivemos um erro inesperado, tente novamente mais tarde." };

    }

}


// função que chama o determinado agente.
const agentService = async (
    pergunta: string, 
    jsonData: any, 
    targetMonth: string,
    onChunk?: (chunk: string) => void  
) => {

    const routeDecision = await runClassifyAgent(pergunta) // retorna a decisão do agente

    // dependendo da resposta do agente classificador vai acionar um outro agente.
    switch (routeDecision.routeName) {
        case 'web_agent':
            
            return await runWebAgent(pergunta, jsonData, targetMonth, onChunk) // agente chatbot
        
        // case "pdf_agent":
            
        //     return await runPdfAgent(targetMonth, pergunta); // agente gerador de pdf

        default:
            return {
                messages: [new HumanMessage("Desculpe, não consegui entender sua solicitação.")]
            };
    }

}

export default agentService;
