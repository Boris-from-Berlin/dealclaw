const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const CategoryService = require('../services/CategoryService');

// GET /categories - List all categories (public)
router.get('/', async (req, res, next) => {
  try {
    const categories = await CategoryService.listAll();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// POST /categories/suggest - Suggest new category
router.post('/suggest', authenticate, validate('suggestCategory'), async (req, res, next) => {
  try {
    const result = await CategoryService.suggest(req.agent.agent_id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
