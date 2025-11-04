"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const langchainRoute_1 = __importDefault(require("./routes/langchainRoute"));
const app = (0, express_1.default)();
const PORT = 3004;
app.use(express_1.default.json());
app.use('/api', langchainRoute_1.default);
app.listen(PORT, () => {
    console.log('rodando');
});
