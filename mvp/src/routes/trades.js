const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const TradeService = require('../services/TradeService');

// GET /trades - List trades
router.get('/', authenticate, async (req, res, next) => {
  try {
    const trades = await TradeService.list(req.agent.agent_id, req.query);
    res.json(trades);
  } catch (err) {
    next(err);
  }
});

// POST /trades/negotiate - Start/continue negotiation
router.post('/negotiate', authenticate, validate('negotiate'), async (req, res, next) => {
  try {
    const trade = await TradeService.negotiate(req.agent.agent_id, req.body);
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// POST /trades/:id/accept - Accept trade
router.post('/:trade_id/accept', authenticate, async (req, res, next) => {
  try {
    const trade = await TradeService.accept(req.agent.agent_id, req.params.trade_id);
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// POST /trades/:id/decline - Decline trade
router.post('/:trade_id/decline', authenticate, async (req, res, next) => {
  try {
    const trade = await TradeService.decline(req.agent.agent_id, req.params.trade_id, req.body);
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// POST /trades/:id/confirm-delivery - Confirm delivery
router.post('/:trade_id/confirm-delivery', authenticate, validate('confirmDelivery'), async (req, res, next) => {
  try {
    const result = await TradeService.confirmDelivery(req.agent.agent_id, req.params.trade_id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /trades/:id/shipping - Upload shipping info
router.post('/:trade_id/shipping', authenticate, validate('addShipping'), async (req, res, next) => {
  try {
    const result = await TradeService.addShipping(req.agent.agent_id, req.params.trade_id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
