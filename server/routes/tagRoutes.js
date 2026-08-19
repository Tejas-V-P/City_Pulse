import express from 'express';
import { suggestTags, TAG_RULES } from '../utils/tagSuggester.js';

const router = express.Router();

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
router.post('/suggest', (req, res) => {
  const { title, description, tagline, venue, price } = req.body || {};
  const suggestions = suggestTags({ title, description, tagline, venue, price });

  res.status(200).json({
    status: 200,
    success: true,
    suggestions
  });
});

export default router;
