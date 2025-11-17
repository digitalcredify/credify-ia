"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @fileoverview direiciona o caminho do endpoint POST/agent ao controller
 *
 */
const express_1 = __importDefault(require("express"));
const agentController_1 = require("../controllers/agentController");
const router = express_1.default.Router();
router.post('/agent', agentController_1.agentController);
exports.default = router;
