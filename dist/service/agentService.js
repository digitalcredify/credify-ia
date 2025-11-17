"use strict";
/**
 * @fileoverview
 * este arquivo atua como um roteador inteligente, ele decide qual agente especealizado utilizar.
 * Web Agent: acionado quando é feita perguntas sobre dados.
 * PDF Agent: acionado quando o usuário pede explicitamente por um pdf.
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
Object.defineProperty(exports, "__esModule", { value: true });
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const langchain_1 = require("langchain");
const zod_1 = require("zod");
const models_1 = require("../utils/models");
const webAgent_1 = require("../agents/webAgent");
const pdfAgent_1 = require("../agents/pdfAgent");
// define um molde para o json retornado pelo roteador.
const routerSchema = 
// define que deve ser um objeto
zod_1.z.object({
    // define a propriedade routerName
    routeName: zod_1.z.enum(["web_agent", "pdf_agent"]) // enum de string
        .describe("A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumários em PDF."), // metadado não necessário, útil apenas para documentação
    // explica do porque o agente foi escolhido.
    reasoning: zod_1.z.string(). // define como obrigatório.
        describe("Breve explicação do porquê esta rota foi escolhida")
});
// prompt que instrui o modelo llm
const routerPromptTemplate = prompts_1.PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando por exemplo o usuário pedir: "PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    
    Responda APENAS com JSON:
    {{"routeName": "web_agent" | "pdf_agent", "reasoning": "..."}}
`);
// essa função executa o roteamento.
const runClassifyAgent = (pergunta) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Roteador: Classificando pergunta...");
    /** cria uma cadeia de "chains" do langchain
     * chain 1: o prompt é passado para o modelo
     * chain 2: a saida do modelo é convertida em um obsjon json
    */
    const routerAgent = routerPromptTemplate.pipe(models_1.middleModel).pipe(new output_parsers_1.JsonOutputParser());
    try {
        // invoka a resposta do llm com base na pergunta
        const result = yield routerAgent.invoke({ pergunta });
        // valida se a resposta do llm ta no padrão definido ali em cima 
        const validatedResult = routerSchema.parse(result);
        console.log(`Roteador: Decisão = ${validatedResult.routeName}. Razão = ${validatedResult.reasoning}`);
        return validatedResult;
    }
    catch (error) {
        console.error("Erro ao parsear ou validar a rota:", error);
        return { routeName: "web_agent", reasoning: "Tivemos um erro inesperado, tente novamente mais tarde." };
    }
});
// função que chama o determinado agente.
const agentService = (pergunta, jsonData, targetMonth, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    const routeDecision = yield runClassifyAgent(pergunta); // retorna a decisão do agente
    // dependendo da resposta do agente classificador vai acionar um outro agente.
    switch (routeDecision.routeName) {
        case 'web_agent':
            return yield (0, webAgent_1.runWebAgent)(pergunta, jsonData, targetMonth, onChunk); // agente chatbot
        case "pdf_agent":
            return yield (0, pdfAgent_1.runPdfAgent)(targetMonth, pergunta); // agente gerador de pdf
        default:
            return {
                messages: [new langchain_1.HumanMessage("Desculpe, não consegui entender sua solicitação.")]
            };
    }
});
exports.default = agentService;
