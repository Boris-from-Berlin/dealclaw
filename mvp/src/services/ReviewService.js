// ReviewService — Enhanced reviews with seller responses, helpful votes, visibility control

const { query } = require('../db');
const logger = require('../middleware/logger');

class ReviewService {
  /**
   * Get public reviews for an agent (visible on website).
   * Only shows reviews where visible_on_website = true.
   */
  static async getPublicReviews(agentId, { limit = 25, offset = 0 } = {}) {
    const { rows } = await query(`
      SELECT r.trade_id, r.reviewer_agent_id, a.name AS reviewer_name, a.tier AS reviewer_tier,
             r.rating, r.review_text, r.helpful_count, r.unhelpful_count,
             r.seller_response, r.seller_responded_at, r.created_at
      FROM reviews r
      JOIN agents a ON r.reviewer_agent_id = a.agent_id
      WHERE r.reviewed_agent_id = $1 AND r.visible_on_website = true
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [agentId, limit, offset]);

    // Also get summary stats
    const { rows: [stats] } = await query(`
      SELECT COUNT(*) as total_reviews,
             ROUND(AVG(rating), 1) as avg_rating,
             COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
             COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
             COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
             COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
             COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE reviewed_agent_id = $1 AND visible_on_website = true
    `, [agentId]);

    return {
      agent_id: agentId,
      summary: {
        total_reviews: parseInt(stats.total_reviews),
        avg_rating: parseFloat(stats.avg_rating) || 0,
        distribution: {
          5: parseInt(stats.five_star),
          4: parseInt(stats.four_star),
          3: parseInt(stats.three_star),
          2: parseInt(stats.two_star),
          1: parseInt(stats.one_star),
        },
      },
      reviews: rows,
    };
  }

  /**
   * Get agent trade stats (for API/agent consumption only, not public website).
   * This is the "invisible" trade history Boris wants.
   */
  static async getAgentStats(agentId) {
    const { rows: [agent] } = await query(`
      SELECT total_trades, successful_trades, tier, reputation_score, trade_history_public
      FROM agents WHERE agent_id = $1
    `, [agentId]);

    if (!agent) {
      const err = new Error('Agent not found');
      err.status = 404;
      throw err;
    }

    const { rows: [reviewStats] } = await query(`
      SELECT COUNT(*) as review_count, ROUND(AVG(rating), 2) as avg_rating
      FROM reviews WHERE reviewed_agent_id = $1
    `, [agentId]);

    return {
      agent_id: agentId,
      tier: agent.tier,
      reputation_score: agent.reputation_score,
      total_trades: agent.total_trades,
      successful_trades: agent.successful_trades,
      success_rate: agent.total_trades > 0
        ? Math.round((agent.successful_trades / agent.total_trades) * 100)
        : null,
      review_count: parseInt(reviewStats.review_count),
      avg_rating: parseFloat(reviewStats.avg_rating) || 0,
      trade_history_public: agent.trade_history_public,
      // This data is ONLY delivered via API to other agents.
      // Not shown on website unless trade_history_public = true.
      _visibility: 'agent_only',
    };
  }

  /**
   * Seller responds to a review.
   */
  static async respondToReview(sellerAgentId, tradeId, responseText) {
    // Verify this is the seller's review
    const { rows } = await query(`
      SELECT r.id FROM reviews r
      WHERE r.trade_id = $1 AND r.reviewed_agent_id = $2
    `, [tradeId, sellerAgentId]);

    if (rows.length === 0) {
      const err = new Error('Review not found or you are not the reviewed seller');
      err.status = 404;
      throw err;
    }

    // Check if already responded
    const { rows: existing } = await query(
      'SELECT seller_response FROM reviews WHERE trade_id = $1',
      [tradeId]
    );
    if (existing[0]?.seller_response) {
      const err = new Error('You have already responded to this review');
      err.status = 409;
      throw err;
    }

    await query(`
      UPDATE reviews SET seller_response = $1, seller_responded_at = NOW()
      WHERE trade_id = $2
    `, [responseText, tradeId]);

    logger.info('Seller responded to review', { seller: sellerAgentId, trade: tradeId });
    return { trade_id: tradeId, seller_response: responseText };
  }

  /**
   * Vote a review as helpful or unhelpful.
   */
  static async voteReview(voterAgentId, tradeId, vote) {
    // Get review ID
    const { rows: reviews } = await query(
      'SELECT id, reviewer_agent_id, reviewed_agent_id FROM reviews WHERE trade_id = $1',
      [tradeId]
    );
    if (reviews.length === 0) {
      const err = new Error('Review not found');
      err.status = 404;
      throw err;
    }

    const review = reviews[0];

    // Can't vote on your own review
    if (review.reviewer_agent_id === voterAgentId || review.reviewed_agent_id === voterAgentId) {
      const err = new Error('Cannot vote on reviews you are involved in');
      err.status = 403;
      throw err;
    }

    // Upsert vote
    try {
      await query(`
        INSERT INTO review_votes (review_id, voter_agent_id, vote)
        VALUES ($1, $2, $3)
        ON CONFLICT (review_id, voter_agent_id)
        DO UPDATE SET vote = $3
      `, [review.id, voterAgentId, vote]);
    } catch (err) {
      if (err.code === '23505') {
        // Already voted — update instead (handled by ON CONFLICT above)
      } else throw err;
    }

    // Recalculate counts
    const { rows: [counts] } = await query(`
      SELECT
        COUNT(CASE WHEN vote = 'helpful' THEN 1 END) as helpful,
        COUNT(CASE WHEN vote = 'unhelpful' THEN 1 END) as unhelpful
      FROM review_votes WHERE review_id = $1
    `, [review.id]);

    await query(`
      UPDATE reviews SET helpful_count = $1, unhelpful_count = $2 WHERE id = $3
    `, [counts.helpful, counts.unhelpful, review.id]);

    return { trade_id: tradeId, vote, helpful_count: parseInt(counts.helpful), unhelpful_count: parseInt(counts.unhelpful) };
  }

  /**
   * Toggle trade history visibility for an agent.
   */
  static async setTradeHistoryVisibility(agentId, isPublic) {
    await query(
      'UPDATE agents SET trade_history_public = $1 WHERE agent_id = $2',
      [isPublic, agentId]
    );
    return { agent_id: agentId, trade_history_public: isPublic };
  }
}

module.exports = ReviewService;
