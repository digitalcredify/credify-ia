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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.langchainController = void 0;
const langchainService_1 = __importDefault(require("../service/langchainService"));
const langchainController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pergunta } = req.body;
        console.log(req.body);
        if (!pergunta) {
            return res.status(400).json({
                erro: "É obrigatório enviar uma pergunta"
            });
        }
        const resposta = yield (0, langchainService_1.default)(pergunta);
        res.json({ resposta });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            erro: "Erro ao processar sua pergunta"
        });
    }
});
exports.langchainController = langchainController;
