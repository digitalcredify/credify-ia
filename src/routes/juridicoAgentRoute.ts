/**
 * @fileoverview
 * Rotas para o agente jurídico
 */

import express from 'express';
import { 
    juridicoAgentController, 
    juridicoIngestController 
} from '../controllers/juridicoAgentController';

const router = express.Router();

/**
 * POST /juridico-ingest
 * Ingestão de dados jurídicos (endpoint separado para dados volumosos)
 * 
 * Body:
 * {
 *   "jsonData": { ... dados da API jurídica ... }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "uuid",
 *   "count": 100,
 *   "message": "100 documentos jurídicos ingeridos com sucesso."
 * }
 */
router.post('/juridico-ingest', juridicoIngestController);

/**
 * POST /juridico-chat
 * Chat com o agente jurídico (consultas sobre processos)
 * 
 * Body:
 * {
 *   "pergunta": "Quais processos envolvem a SENDAS DISTRIBUIDORA?"
 * }
 * 
 * Response (sem streaming):
 * {
 *   "success": true,
 *   "response": "Encontrei 5 processos envolvendo a SENDAS DISTRIBUIDORA..."
 * }
 * 
 * Response (com streaming):
 * Server-Sent Events com chunks da resposta
 */
router.post('/juridico-chat', juridicoAgentController);

export default router;
