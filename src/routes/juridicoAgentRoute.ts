

import express from 'express';
import { 
    juridicoAgentController, 
    juridicoIngestController, 
    juridicoIngestDetailedController
} from '../controllers/juridicoAgentController';

const router = express.Router();


router.post('/juridico-ingest', juridicoIngestController);


router.post('/juridico-chat', juridicoAgentController);


router.post('/juridico-ingest-detailed', juridicoIngestDetailedController);

export default router;
