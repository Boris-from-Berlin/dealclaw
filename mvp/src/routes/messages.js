const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');
const { validate } = require('../validation/schemas');
const { authenticate } = require('../middleware/auth');

// All message routes require authentication
router.use(authenticate);

// Send a message to another agent
router.post('/send', validate('sendMessage'), async (req, res, next) => {
  try {
    const result = await MessageService.send({
      from_agent_id: req.agent.agent_id,
      ...req.body,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// Contact a seller about a listing
router.post('/contact-seller', validate('contactSeller'), async (req, res, next) => {
  try {
    const result = await MessageService.contactSeller(
      req.agent.agent_id,
      req.body.listing_id,
      req.body.content
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// Get my conversations (inbox)
router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await MessageService.getConversations(req.agent.agent_id, {
      limit: parseInt(req.query.limit) || 25,
      offset: parseInt(req.query.offset) || 0,
    });
    res.json({ conversations });
  } catch (err) { next(err); }
});

// Get messages in a conversation
router.get('/conversations/:conversation_id', async (req, res, next) => {
  try {
    const result = await MessageService.getMessages(
      req.agent.agent_id,
      req.params.conversation_id,
      { limit: parseInt(req.query.limit) || 50, offset: parseInt(req.query.offset) || 0 }
    );
    res.json(result);
  } catch (err) { next(err); }
});

// Get unread count
router.get('/unread', async (req, res, next) => {
  try {
    const count = await MessageService.getUnreadCount(req.agent.agent_id);
    res.json({ unread: count });
  } catch (err) { next(err); }
});

module.exports = router;
