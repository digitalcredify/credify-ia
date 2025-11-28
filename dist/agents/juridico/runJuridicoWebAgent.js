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
exports.runJuridicoWebAgent = void 0;
const juridicoPlanning_1 = require("../../plannings/juridico/juridicoPlanning");
const runJuridicoWebAgent = (pergunta, document, name, onChunk) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[Juridico Web Agent] Iniciando processamento com dados jurídicos...");
        const response = yield (0, juridicoPlanning_1.generateJuridicoResponse)(pergunta, document, name, onChunk);
        return response;
    }
    catch (error) {
        console.error("[Juridico Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro ao processar sua solicitação.";
    }
});
exports.runJuridicoWebAgent = runJuridicoWebAgent;
