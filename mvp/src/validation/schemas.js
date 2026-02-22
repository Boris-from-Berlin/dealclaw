// Input validation schemas for DealClaw API
const Joi = require('joi');

const FRAMEWORKS = ['openclaw', 'claude_mcp', 'gpt', 'gemini', 'custom'];
const CAPABILITIES = ['buy', 'sell', 'negotiate', 'browse', 'analyze'];
const FULFILLMENT_TYPES = ['digital', 'physical', 'service'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'parts'];
const TRADE_ACTIONS = ['offer', 'counter', 'message'];

const schemas = {
  // Agent registration
  registerAgent: Joi.object({
    name: Joi.string().min(3).max(100).pattern(/^[a-zA-Z0-9_-]+$/).required()
      .messages({ 'string.pattern.base': 'Agent name can only contain letters, numbers, hyphens, and underscores' }),
    description: Joi.string().max(500).optional(),
    framework: Joi.string().valid(...FRAMEWORKS).required(),
    capabilities: Joi.array().items(Joi.string().valid(...CAPABILITIES)).min(1).required(),
    user_verification: Joi.object({
      method: Joi.string().valid('oauth', 'signed_claim', 'api_key').required(),
      token: Joi.string().required(),
    }).optional(),
  }),

  // Update agent profile
  updateAgent: Joi.object({
    description: Joi.string().max(500).optional(),
    capabilities: Joi.array().items(Joi.string().valid(...CAPABILITIES)).min(1).optional(),
  }).min(1),

  // Create listing (supports instant and super_deal modes)
  createListing: Joi.object({
    title: Joi.string().min(5).max(500).required(),
    description: Joi.string().max(5000).optional(),
    min_price: Joi.number().positive().precision(3).required()
      .messages({ 'number.positive': 'Minimum price must be greater than 0 CC' }),
    display_price: Joi.number().positive().precision(3).optional(),
    category_slug: Joi.string().max(200).optional(),
    fulfillment_type: Joi.string().valid(...FULFILLMENT_TYPES).required(),
    condition: Joi.string().valid(...CONDITIONS).optional(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    shipping_from: Joi.string().length(2).uppercase().optional(),
    // Super Deal fields
    deal_mode: Joi.string().valid('instant', 'super_deal').default('instant'),
    deal_window_hours: Joi.number().integer().min(1).max(168).when('deal_mode', {
      is: 'super_deal',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    deal_auto_accept_at: Joi.number().positive().precision(3).optional(),
    max_offers: Joi.number().integer().min(2).max(100).default(20).optional(),
  }),

  // Update listing
  updateListing: Joi.object({
    title: Joi.string().min(5).max(500).optional(),
    description: Joi.string().max(5000).optional(),
    min_price: Joi.number().positive().precision(3).optional(),
    display_price: Joi.number().positive().precision(3).optional(),
    status: Joi.string().valid('active', 'paused').optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  }).min(1),

  // Search listings
  searchListings: Joi.object({
    q: Joi.string().max(200).optional(),
    category: Joi.string().max(200).optional(),
    min_price: Joi.number().min(0).optional(),
    max_price: Joi.number().positive().optional(),
    fulfillment_type: Joi.string().valid(...FULFILLMENT_TYPES).optional(),
    condition: Joi.string().valid(...CONDITIONS).optional(),
    sort: Joi.string().valid('price_asc', 'price_desc', 'newest', 'relevance').default('newest'),
    limit: Joi.number().integer().min(1).max(100).default(25),
    offset: Joi.number().integer().min(0).default(0),
  }),

  // Negotiate trade
  negotiate: Joi.object({
    listing_id: Joi.string().required(),
    trade_id: Joi.string().optional(), // If continuing existing negotiation
    action: Joi.string().valid(...TRADE_ACTIONS).required(),
    offer_amount: Joi.number().positive().precision(3).when('action', {
      is: Joi.string().valid('offer', 'counter'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    max_budget: Joi.number().positive().precision(3).optional(),
    message: Joi.string().max(1000).optional(),
  }),

  // Confirm delivery
  confirmDelivery: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().max(2000).optional(),
  }),

  // Shipping info
  addShipping: Joi.object({
    tracking_number: Joi.string().max(100).required(),
    carrier: Joi.string().max(30).required(),
    estimated_delivery: Joi.date().iso().optional(),
  }),

  // Category suggestion
  suggestCategory: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).optional(),
    parent_category: Joi.string().max(200).optional(),
  }),

  // Wallet deposit
  deposit: Joi.object({
    amount_eur: Joi.number().positive().min(1).max(10000).required(),
    payment_method_id: Joi.string().required(),
  }),

  // Super Deal offer
  superDealOffer: Joi.object({
    listing_id: Joi.string().required(),
    offer_amount: Joi.number().positive().precision(3).required(),
    max_budget: Joi.number().positive().precision(3).optional(),
    message: Joi.string().max(1000).optional(),
    expires_in_hours: Joi.number().integer().min(1).max(168).optional(),
  }),

  // Send message
  sendMessage: Joi.object({
    to_agent_id: Joi.string().required(),
    content: Joi.string().min(1).max(5000).required(),
    listing_id: Joi.string().optional(),
    trade_id: Joi.string().optional(),
  }),

  // Contact seller about a listing
  contactSeller: Joi.object({
    listing_id: Joi.string().required(),
    content: Joi.string().min(1).max(5000).required(),
  }),

  // Seller response to review
  reviewResponse: Joi.object({
    response: Joi.string().min(1).max(2000).required(),
  }),

  // Vote on a review
  reviewVote: Joi.object({
    vote: Joi.string().valid('helpful', 'unhelpful').required(),
  }),
};

/**
 * Middleware factory for request validation.
 * @param {string} schemaName - Key in the schemas object
 * @param {string} source - 'body', 'query', or 'params'
 */
function validate(schemaName, source = 'body') {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) throw new Error(`Unknown validation schema: ${schemaName}`);

    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req[source] = value; // Replace with validated/sanitized data
    next();
  };
}

module.exports = { schemas, validate };
