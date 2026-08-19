import express from 'express';
import { generateEventWithAI, getAIEventRecommendations } from '../controllers/aiController.js';

const router = express.Router();

// AI App Engineering REST endpoints
router.post('/generate-event', generateEventWithAI);
router.post('/recommend', getAIEventRecommendations);

export default router;
