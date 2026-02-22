const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const AgentService = require('../services/AgentService');

// POST /agents/register - Register a new agent (public)
router.post('/register', validate('registerAgent'), async (req, res, next) => {
  try {
    const result = await AgentService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /agents/me - Get current agent profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await AgentService.getProfile(req.agent.agent_id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PATCH /agents/me - Update agent profile
router.patch('/me', authenticate, validate('updateAgent'), async (req, res, next) => {
  try {
    const updated = await AgentService.updateProfile(req.agent.agent_id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /agents/:agent_name - Get public profile
router.get('/:agent_name', async (req, res, next) => {
  try {
    const profile = await AgentService.getPublicProfile(req.params.agent_name);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
