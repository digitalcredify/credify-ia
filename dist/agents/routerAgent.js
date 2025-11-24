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
exports.runRouterAgent = void 0;
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const config_1 = require("../config");
const zod_1 = require("zod");
const routerSchema = zod_1.z.object({
    routerName: zod_1.z.enum(["web_agent", "pdf_agent"]).describe("A rota a ser usada. 'web_agent' para perguntas e respostas. 'pdf_agent' para pedidos de relatórios ou sumário em PDF"),
    reasoning: zod_1.z.string().describe("Breve explicação do porquê a rota foi escolhida")
});
const routerPromptTemplate = prompts_1.PromptTemplate.fromTemplate(`
    Você é um agente roteador.
    
    Opções de Rota:
    1. "web_agent": Perguntas sobre dados
    2. "pdf_agent": Quando por exemplo o usuário pedir: "PDF", "gerar PDF", "exportar para PDF"
    
    Pergunta do Usuário: {pergunta}
    
    
    Responda APENAS com JSON:
    {{"routeName": "web_agent" | "pdf_agent", "reasoning": "..."}}
`);
const runRouterAgent = (pergunta) => __awaiter(void 0, void 0, void 0, function* () {
    const routerAgent = routerPromptTemplate.pipe(config_1.fastModel).pipe(new output_parsers_1.JsonOutputParser);
    try {
        const result = yield routerAgent.invoke({ pergunta });
        const validatedResult = routerSchema.parse(result);
        console.log(`Roteador: Decisão = ${validatedResult.routerName}. Razão = ${validatedResult.reasoning}`);
        return validatedResult;
    }
    catch (error) {
        console.error("Erro ao parsear ou validar a rota:", error);
        return { routerName: "web_agent", reasoning: "Tivemos um erro inesperado, tente novamente mais tarde." };
    }
});
exports.runRouterAgent = runRouterAgent;
