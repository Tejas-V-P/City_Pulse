import express from 'express';
import { generateEventWithAI, getAIEventRecommendations } from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Apply AI rate limiting to prevent API quota exhaustion
router.use(aiLimiter);

// AI REST endpoints
router.post('/generate-event', generateEventWithAI);
router.post('/recommend', getAIEventRecommendations);

export default router;
