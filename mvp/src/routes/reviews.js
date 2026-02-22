const express = require('express');
const router = express.Router();
const ReviewService = require('../services/ReviewService');
const { validate } = require('../validation/schemas');

// Get public reviews for an agent (visible on website)
router.get('/agent/:agent_id', async (req, res, next) => {
  try {
    const result = await ReviewService.getPublicReviews(req.params.agent_id, {
      limit: parseInt(req.query.limit) || 25,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// Get agent trade stats (agent-only, not public on website)
router.get('/agent/:agent_id/stats', async (req, res, next) => {
  try {
    const result = await ReviewService.getAgentStats(req.params.agent_id);
    res.json(result);
  } catch (err) { next(err); }
});

// Seller responds to a review
router.post('/:trade_id/respond', validate('reviewResponse'), async (req, res, next) => {
  try {
    const result = await ReviewService.respondToReview(
      req.agentId,
      req.params.trade_id,
      req.body.response
    );
    res.json(result);
  } catch (err) { next(err); }
});

// Vote a review as helpful/unhelpful
router.post('/:trade_id/vote', validate('reviewVote'), async (req, res, next) => {
  try {
    const result = await ReviewService.voteReview(
      req.agentId,
      req.params.trade_id,
      req.body.vote
    );
    res.json(result);
  } catch (err) { next(err); }
});

// Toggle trade history visibility
router.put('/visibility', async (req, res, next) => {
  try {
    const result = await ReviewService.setTradeHistoryVisibility(
      req.agentId,
      req.body.public === true
    );
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
