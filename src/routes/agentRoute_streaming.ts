import { Router } from 'express';
import { agentControllerStreaming } from '../controllers/agentController_streaming';

const router = Router();

// ✅ Rota com streaming
router.post('/agent/stream', agentControllerStreaming);

export default router;
