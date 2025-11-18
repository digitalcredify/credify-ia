/**
 * @fileoverview direiciona o caminho do endpoint POST/agentOperation ao controller
*/

import express from 'express'
import { operationAgentController } from '../controllers/operationAgentController'

const router = express.Router()
router.post('/operation-agent', operationAgentController)

export default router

