"use strict";
/**
 * @fileoverview direiciona o caminho do endpoint POST/agentOperation ao controller
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const operationAgentController_1 = require("../controllers/operationAgentController");
const router = express_1.default.Router();
router.post('/operation-agent', operationAgentController_1.operationAgentController);
exports.default = router;
