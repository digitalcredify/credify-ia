

import express from 'express';
import { 
    juridicoAgentController, 
    juridicoIngestController 
} from '../controllers/juridicoAgentController';

const router = express.Router();


router.post('/juridico-ingest', juridicoIngestController);


router.post('/juridico-chat', juridicoAgentController);

export default router;
