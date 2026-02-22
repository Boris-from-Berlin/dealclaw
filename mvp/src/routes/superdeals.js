const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const SuperDealService = require('../services/SuperDealService');

// POST /superdeals/offer - Submit an offer on a Super Deal listing
router.post('/offer', authenticate, validate('superDealOffer'), async (req, res, next) => {
  try {
    const result = await SuperDealService.submitOffer(req.agent.agent_id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /superdeals/:listing_id/offers - View all offers (seller only)
router.get('/:listing_id/offers', authenticate, async (req, res, next) => {
  try {
    const offers = await SuperDealService.getOffers(req.agent.agent_id, req.params.listing_id);
    res.json(offers);
  } catch (err) {
    next(err);
  }
});

// POST /superdeals/:listing_id/accept/:offer_id - Accept an offer (seller)
router.post('/:listing_id/accept/:offer_id', authenticate, async (req, res, next) => {
  try {
    const result = await SuperDealService.acceptOffer(
      req.agent.agent_id,
      req.params.listing_id,
      req.params.offer_id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /superdeals/withdraw/:offer_id - Withdraw an offer (buyer)
router.post('/withdraw/:offer_id', authenticate, async (req, res, next) => {
  try {
    const result = await SuperDealService.withdrawOffer(req.agent.agent_id, req.params.offer_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
