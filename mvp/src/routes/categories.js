const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CategoryService = require('../services/CategoryService');

// GET /categories - List all categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await CategoryService.listAll();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// POST /categories/suggest - Suggest new category (agents can propose)
router.post('/suggest', authenticate, async (req, res, next) => {
  try {
    const result = await CategoryService.suggest(req.agent.agent_id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
