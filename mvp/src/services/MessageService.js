// MessageService — Agent-to-Agent and Human-to-Agent messaging
// Supports trade-context conversations and general inquiries

const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const logger = require('../middleware/logger');

class MessageService {
  /**
   * Send a message to another agent.
   * Can be in context of a listing or trade, or standalone.
   */
  static async send({ from_agent_id, to_agent_id, content, listing_id, trade_id, from_type = 'agent' }) {
    // Validate recipient exists and is active
    const recipient = await query(
      'SELECT agent_id, status FROM agents WHERE agent_id = $1',
      [to_agent_id]
    );
    if (recipient.rows.length === 0) {
      const err = new Error('Recipient agent not found');
      err.status = 404;
      throw err;
    }
    if (recipient.rows[0].status !== 'active') {
      const err = new Error('Recipient agent is not active');
      err.status = 403;
      throw err;
    }

    // Don't message yourself
    if (from_agent_id === to_agent_id) {
      const err = new Error('Cannot send a message to yourself');
      err.status = 400;
      throw err;
    }

    // Build conversation_id: deterministic for the same pair + context
    const conversationId = this._buildConversationId(from_agent_id, to_agent_id, listing_id, trade_id);

    const messageId = `msg_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    const { rows: [message] } = await query(`
      INSERT INTO agent_messages (message_id, conversation_id, from_agent_id, to_agent_id, from_type, content, listing_id, trade_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING message_id, conversation_id, created_at
    `, [messageId, conversationId, from_agent_id, to_agent_id, from_type, content, listing_id || null, trade_id || null]);

    logger.info('Message sent', { message_id: messageId, from: from_agent_id, to: to_agent_id });

    return {
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      from_agent_id,
      to_agent_id,
      content,
      created_at: message.created_at,
    };
  }

  /**
   * Get conversations for an agent (inbox).
   */
  static async getConversations(agentId, { limit = 25, offset = 0 } = {}) {
    const { rows } = await query(`
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        CASE WHEN from_agent_id = $1 THEN to_agent_id ELSE from_agent_id END AS other_agent_id,
        content AS last_message,
        created_at AS last_message_at,
        listing_id,
        trade_id,
        CASE WHEN to_agent_id = $1 AND read_at IS NULL THEN true ELSE false END AS has_unread
      FROM agent_messages
      WHERE from_agent_id = $1 OR to_agent_id = $1
      ORDER BY conversation_id, created_at DESC
      LIMIT $2 OFFSET $3
    `, [agentId, limit, offset]);

    // Count unread per conversation
    const { rows: unreadCounts } = await query(`
      SELECT conversation_id, COUNT(*) as unread
      FROM agent_messages
      WHERE to_agent_id = $1 AND read_at IS NULL
      GROUP BY conversation_id
    `, [agentId]);

    const unreadMap = {};
    for (const row of unreadCounts) {
      unreadMap[row.conversation_id] = parseInt(row.unread);
    }

    return rows.map(r => ({
      ...r,
      unread_count: unreadMap[r.conversation_id] || 0,
    }));
  }

  /**
   * Get messages in a conversation.
   */
  static async getMessages(agentId, conversationId, { limit = 50, offset = 0 } = {}) {
    // Verify the agent is part of this conversation
    const check = await query(`
      SELECT 1 FROM agent_messages
      WHERE conversation_id = $1 AND (from_agent_id = $2 OR to_agent_id = $2)
      LIMIT 1
    `, [conversationId, agentId]);

    if (check.rows.length === 0) {
      const err = new Error('Conversation not found');
      err.status = 404;
      throw err;
    }

    // Mark messages as read
    await query(`
      UPDATE agent_messages SET read_at = NOW()
      WHERE conversation_id = $1 AND to_agent_id = $2 AND read_at IS NULL
    `, [conversationId, agentId]);

    // Fetch messages
    const { rows } = await query(`
      SELECT message_id, from_agent_id, to_agent_id, from_type, content,
             listing_id, trade_id, read_at, created_at
      FROM agent_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);

    return { conversation_id: conversationId, messages: rows };
  }

  /**
   * Get unread count for an agent.
   */
  static async getUnreadCount(agentId) {
    const { rows: [{ count }] } = await query(
      'SELECT COUNT(*) FROM agent_messages WHERE to_agent_id = $1 AND read_at IS NULL',
      [agentId]
    );
    return parseInt(count);
  }

  /**
   * Contact a seller about a listing (creates or continues conversation).
   */
  static async contactSeller(buyerAgentId, listingId, content) {
    // Get the seller's agent_id from the listing
    const { rows } = await query(
      'SELECT agent_id FROM listings WHERE listing_id = $1 AND status = $2',
      [listingId, 'active']
    );
    if (rows.length === 0) {
      const err = new Error('Listing not found or not active');
      err.status = 404;
      throw err;
    }

    return this.send({
      from_agent_id: buyerAgentId,
      to_agent_id: rows[0].agent_id,
      content,
      listing_id: listingId,
    });
  }

  /**
   * Build a deterministic conversation ID for a pair of agents + optional context.
   */
  static _buildConversationId(agentA, agentB, listingId, tradeId) {
    // Sort agent IDs so the same pair always gets the same conversation
    const sorted = [agentA, agentB].sort();
    const context = tradeId || listingId || 'general';
    return `conv_${sorted[0]}_${sorted[1]}_${context}`.slice(0, 50);
  }
}

module.exports = MessageService;
