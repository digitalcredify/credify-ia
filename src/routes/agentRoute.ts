import express from 'express'
import { agentController } from '../controllers/agentController'

const router = express.Router()
router.post('/agent', agentController)

export default router