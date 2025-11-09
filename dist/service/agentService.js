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
Object.defineProperty(exports, "__esModule", { value: true });
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const langchain_1 = require("langchain");
const zod_1 = require("zod");
const models_1 = require("../utils/models");
const webAgent_1 = require("../agents/webAgent");
const pdfAgent_1 = require("../agents/pdfAgent");
const routerSchema = zod_1.z.object({
    routeName: zod_1.z.enum(["web_agent", "pdf_agent"]).describe("A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumários em PDF."),
    reasoning: zod_1.z.string().describe("Breve explicação do porquê esta rota foi escolhida")
});
const routerPromptTemplate = prompts_1.PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando o usuário pedir "PDF", "relatório em PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    
    Responda APENAS com JSON:
    {{"routeName": "web_agent" | "pdf_agent", "reasoning": "..."}}
`);
const classifyRequest = (pergunta) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Roteador: Classificando pergunta...");
    const routerAgent = routerPromptTemplate.pipe(models_1.middleModel).pipe(new output_parsers_1.JsonOutputParser());
    try {
        const result = yield routerAgent.invoke({ pergunta });
        const validatedResult = routerSchema.parse(result);
        console.log(`Roteador: Decisão = ${validatedResult.routeName}. Razão = ${validatedResult.reasoning}`);
        return validatedResult;
    }
    catch (error) {
        console.error("Erro ao parsear ou validar a rota:", error);
        return { routeName: "web_agent", reasoning: "Erro no roteamento, usando fallback para Q&A." };
    }
});
const agentService = (pergunta, jsonData, targetMonth) => __awaiter(void 0, void 0, void 0, function* () {
    const routeDecision = yield classifyRequest(pergunta);
    switch (routeDecision.routeName) {
        case 'web_agent':
            return yield (0, webAgent_1.runWebAgent)(pergunta, jsonData, targetMonth);
        case "pdf_agent":
            return yield (0, pdfAgent_1.runPdfAgent)(targetMonth, pergunta);
        default:
            return {
                messages: [new langchain_1.HumanMessage("Desculpe, não consegui entender sua solicitação.")]
            };
    }
});
exports.default = agentService;
