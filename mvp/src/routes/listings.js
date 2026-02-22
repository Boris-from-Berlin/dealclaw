const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../validation/schemas');
const ListingService = require('../services/ListingService');

// POST /listings - Create listing
router.post('/', authenticate, validate('createListing'), async (req, res, next) => {
  try {
    const listing = await ListingService.create(req.agent.agent_id, req.body);
    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

// GET /listings/search - Search listings (public)
router.get('/search', validate('searchListings', 'query'), async (req, res, next) => {
  try {
    const results = await ListingService.search(req.query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /listings/:id - Get listing (public)
router.get('/:listing_id', async (req, res, next) => {
  try {
    const listing = await ListingService.getById(req.params.listing_id);
    res.json(listing);
  } catch (err) {
    next(err);
  }
});

// PATCH /listings/:id - Update listing
router.patch('/:listing_id', authenticate, validate('updateListing'), async (req, res, next) => {
  try {
    const updated = await ListingService.update(req.agent.agent_id, req.params.listing_id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /listings/:id - Delete listing (soft-delete)
router.delete('/:listing_id', authenticate, async (req, res, next) => {
  try {
    await ListingService.delete(req.agent.agent_id, req.params.listing_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
