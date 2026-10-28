import express from 'express';
import rateLimit from 'express-rate-limit';
import { suggestTags, TAG_RULES } from '../utils/tagSuggester.js';

const router = express.Router();
const suggestionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Tag suggestion limit reached. Try again later.' } });

// GET /api/tags - Get master list of tags grouped by category
router.get('/', (req, res) => {
  const categories = {};
  TAG_RULES.forEach(rule => {
    if (!categories[rule.category]) {
      categories[rule.category] = [];
    }
    categories[rule.category].push(rule.tag);
  });

  res.status(200).json({
    status: 200,
    success: true,
    data: categories
  });
});

// POST /api/tags/suggest - Suggest tags for draft event details
router.post('/suggest', suggestionLimiter, (req, res) => {
  const { title, description, tagline, venue, price } = req.body || {};
  const suggestions = suggestTags({ title, description, tagline, venue, price });

  res.status(200).json({
    status: 200,
    success: true,
    suggestions
  });
});

export default router;
