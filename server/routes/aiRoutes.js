import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { generateEventWithAI, getAIEventRecommendations } from '../controllers/aiController.js';

const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'AI request limit reached. Try again later.' } });

// AI App Engineering REST endpoints
router.post('/generate-event', authenticate, aiLimiter, generateEventWithAI);
router.post('/recommend', authenticate, aiLimiter, getAIEventRecommendations);

export default router;
