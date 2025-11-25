import express from 'express';
import { juridicoIngestController } from '../controllers/juridicoAgentController';

const router = express.Router();

router.post('/juridico-ingest', juridicoIngestController);

export default router;