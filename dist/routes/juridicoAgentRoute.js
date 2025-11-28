"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const juridicoAgentController_1 = require("../controllers/juridicoAgentController");
const router = express_1.default.Router();
router.post('/juridico-ingest', juridicoAgentController_1.juridicoIngestController);
router.post('/juridico-chat', juridicoAgentController_1.juridicoAgentController);
exports.default = router;
