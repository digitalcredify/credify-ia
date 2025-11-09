"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedModel = exports.middleModel = exports.basicModel = void 0;
const openai_1 = require("@langchain/openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.API_KEY;
exports.basicModel = new openai_1.ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: apiKey
});
exports.middleModel = new openai_1.ChatOpenAI({
    model: "gpt-4o",
    apiKey: apiKey
});
exports.advancedModel = new openai_1.ChatOpenAI({
    model: "gpt-5",
    apiKey: apiKey
});
