// TradeService - Negotiation, escrow, delivery, fee calculation
// This is the CORE business logic of DealClaw

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const logger = require('../middleware/logger');

// Reputation tier → fee rate mapping
const TIER_FEE_RATES = {
  newcomer: 0.10,   // 10%
  trusted: 0.08,    // 8%
  verified: 0.07,   // 7%
  elite: 0.05,      // 5%
};

class TradeService {
  /**
   * Calculate DealClaw fee based on price difference model.
   * Fee = FEE_RATE * (buyer_max - seller_min)
   * Fee rate depends on the SELLER's reputation tier.
   */
  static calculateFee(buyerMax, sellerMin, sellerTier = 'newcomer') {
    const feeRate = TIER_FEE_RATES[sellerTier] || parseFloat(process.env.CLAWCOIN_FEE_RATE || '0.10');
    const minFee = parseFloat(process.env.CLAWCOIN_MIN_FEE || '0.5');
    const priceDifference = buyerMax - sellerMin;

    if (priceDifference <= 0) return minFee;

    const fee = priceDifference * feeRate;
    return Math.max(fee, minFee);
  }

  /**
   * Start or continue a negotiation.
   */
  static async negotiate(agentId, { listing_id, trade_id, action, offer_amount, max_budget, message }) {
    // If no trade_id → new negotiation
    if (!trade_id) {
      return this._startNegotiation(agentId, { listing_id, offer_amount, max_budget, message });
    }
    return this._continueNegotiation(agentId, { trade_id, action, offer_amount, message });
  }

  /**
   * Start a new trade/negotiation on a listing.
   */
  static async _startNegotiation(buyerAgentId, { listing_id, offer_amount, max_budget, message }) {
    // Get listing details
    const { rows: [listing] } = await query(
      'SELECT listing_id, agent_id, min_price, title FROM listings WHERE listing_id = $1 AND status = $2',
      [listing_id, 'active']
    );
    if (!listing) {
      const err = new Error('Listing not found or not active');
      err.status = 404;
      throw err;
    }

    // Can't buy your own listing
    if (listing.agent_id === buyerAgentId) {
      const err = new Error('Cannot negotiate on your own listing');
      err.status = 400;
      throw err;
    }

    // Check buyer has enough balance
    const { rows: [buyerWallet] } = await query(`
      SELECT w.available_balance FROM wallets w
      JOIN users u ON w.user_id = u.id
      JOIN agents a ON a.user_id = u.id
      WHERE a.agent_id = $1
    `, [buyerAgentId]);

    if (!buyerWallet || parseFloat(buyerWallet.available_balance) < offer_amount) {
      const err = new Error('Insufficient ClawCoin balance for this offer');
      err.status = 400;
      throw err;
    }

    const tradeId = `trd_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    return transaction(async (client) => {
      // Create trade record
      await client.query(`
        INSERT INTO trades (trade_id, listing_id, buyer_agent_id, seller_agent_id,
                            buyer_max_price, seller_min_price, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'negotiating')
      `, [tradeId, listing_id, buyerAgentId, listing.agent_id, max_budget || offer_amount, listing.min_price]);

      // Record first negotiation message (the offer)
      await client.query(`
        INSERT INTO negotiation_messages (trade_id, from_agent_id, action, amount, message)
        VALUES ($1, $2, 'offer', $3, $4)
      `, [tradeId, buyerAgentId, offer_amount, message || null]);

      // Charge micro-fee for negotiation message (0.01 CC)
      const microFee = parseFloat(process.env.NEGOTIATION_MICRO_FEE || '0.01');

      logger.info('Trade started', { trade_id: tradeId, listing_id, buyer: buyerAgentId, seller: listing.agent_id });

      return {
        trade_id: tradeId,
        listing_id,
        listing_title: listing.title,
        status: 'negotiating',
        current_offer: offer_amount,
        buyer_agent_id: buyerAgentId,
        seller_agent_id: listing.agent_id,
        negotiation_fee_charged: microFee,
        created_at: new Date().toISOString(),
      };
    });
  }

  /**
   * Continue an existing negotiation (counter-offer, message, etc.).
   */
  static async _continueNegotiation(agentId, { trade_id, action, offer_amount, message }) {
    const { rows: [trade] } = await query(
      'SELECT * FROM trades WHERE trade_id = $1', [trade_id]
    );
    if (!trade) {
      const err = new Error('Trade not found');
      err.status = 404;
      throw err;
    }
    if (trade.status !== 'negotiating') {
      const err = new Error(`Trade is not in negotiating state (current: ${trade.status})`);
      err.status = 400;
      throw err;
    }

    // Verify agent is part of this trade
    if (trade.buyer_agent_id !== agentId && trade.seller_agent_id !== agentId) {
      const err = new Error('Not authorized for this trade');
      err.status = 403;
      throw err;
    }

    // Record the negotiation message
    await query(`
      INSERT INTO negotiation_messages (trade_id, from_agent_id, action, amount, message)
      VALUES ($1, $2, $3, $4, $5)
    `, [trade_id, agentId, action, offer_amount || null, message || null]);

    // Get negotiation history
    const { rows: messages } = await query(
      'SELECT from_agent_id, action, amount, message, created_at FROM negotiation_messages WHERE trade_id = $1 ORDER BY created_at ASC',
      [trade_id]
    );

    return {
      trade_id,
      status: 'negotiating',
      current_offer: offer_amount || messages[messages.length - 1]?.amount,
      negotiation_round: messages.length,
      history: messages.map(m => ({
        from: m.from_agent_id,
        action: m.action,
        amount: m.amount ? parseFloat(m.amount) : null,
        message: m.message,
        at: m.created_at,
      })),
    };
  }

  /**
   * Accept a trade → lock escrow.
   */
  static async accept(agentId, tradeId) {
    const { rows: [trade] } = await query('SELECT * FROM trades WHERE trade_id = $1', [tradeId]);
    if (!trade) { const err = new Error('Trade not found'); err.status = 404; throw err; }
    if (trade.status !== 'negotiating') { const err = new Error('Trade not in negotiating state'); err.status = 400; throw err; }

    // Both buyer and seller can accept
    if (trade.buyer_agent_id !== agentId && trade.seller_agent_id !== agentId) {
      const err = new Error('Not authorized'); err.status = 403; throw err;
    }

    // Get the last offer amount
    const { rows: [lastOffer] } = await query(
      "SELECT amount FROM negotiation_messages WHERE trade_id = $1 AND amount IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [tradeId]
    );
    const agreedPrice = lastOffer ? parseFloat(lastOffer.amount) : parseFloat(trade.buyer_max_price);

    // Get seller tier for fee calculation
    const { rows: [seller] } = await query('SELECT tier FROM agents WHERE agent_id = $1', [trade.seller_agent_id]);
    const fee = this.calculateFee(parseFloat(trade.buyer_max_price), parseFloat(trade.seller_min_price), seller?.tier);

    const escrowExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days

    return transaction(async (client) => {
      // Lock buyer's ClawCoins in escrow
      const { rows: [buyerWallet] } = await client.query(`
        SELECT w.id, w.available_balance FROM wallets w
        JOIN users u ON w.user_id = u.id
        JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [trade.buyer_agent_id]);

      if (!buyerWallet || parseFloat(buyerWallet.available_balance) < agreedPrice) {
        const err = new Error('Buyer has insufficient balance for escrow');
        err.status = 400;
        throw err;
      }

      // Move from available to locked
      await client.query(
        'UPDATE wallets SET available_balance = available_balance - $1, locked_balance = locked_balance + $1, updated_at = NOW() WHERE id = $2',
        [agreedPrice, buyerWallet.id]
      );

      // Record escrow lock transaction
      const newBalance = parseFloat(buyerWallet.available_balance) - agreedPrice;
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description, trade_id)
        VALUES ($1, $2, 'escrow_lock', $3, $4, $5, $6)
      `, [`txn_escrow_${tradeId}`, buyerWallet.id, -agreedPrice, newBalance, `Escrow locked for trade ${tradeId}`, tradeId]);

      // Update trade status
      await client.query(`
        UPDATE trades SET status = 'escrow_active', agreed_price = $1, fee_amount = $2,
          fee_calculation = $3, escrow_locked_at = NOW(), escrow_expires_at = $4, updated_at = NOW()
        WHERE trade_id = $5
      `, [agreedPrice, fee, `${(TIER_FEE_RATES[seller?.tier] || 0.10) * 100}% of (${trade.buyer_max_price} - ${trade.seller_min_price}) = ${fee} CC`, escrowExpires, tradeId]);

      // Record acceptance message
      await client.query(`
        INSERT INTO negotiation_messages (trade_id, from_agent_id, action, amount, message)
        VALUES ($1, $2, 'accept', $3, 'Trade accepted, escrow locked')
      `, [tradeId, agentId, agreedPrice]);

      logger.info('Trade accepted, escrow locked', { trade_id: tradeId, amount: agreedPrice, fee });

      return {
        trade_id: tradeId,
        status: 'escrow_active',
        agreed_price: agreedPrice,
        escrow: {
          amount: agreedPrice,
          locked_at: new Date().toISOString(),
          expires_at: escrowExpires,
        },
        fee: {
          amount: fee,
          rate: `${(TIER_FEE_RATES[seller?.tier] || 0.10) * 100}%`,
          calculation: `(${trade.buyer_max_price} - ${trade.seller_min_price}) × rate = ${fee} CC`,
        },
      };
    });
  }

  /**
   * Decline a trade.
   */
  static async decline(agentId, tradeId, { reason }) {
    const { rows: [trade] } = await query('SELECT * FROM trades WHERE trade_id = $1', [tradeId]);
    if (!trade) { const err = new Error('Trade not found'); err.status = 404; throw err; }
    if (trade.buyer_agent_id !== agentId && trade.seller_agent_id !== agentId) {
      const err = new Error('Not authorized'); err.status = 403; throw err;
    }

    await query("UPDATE trades SET status = 'cancelled', updated_at = NOW() WHERE trade_id = $1", [tradeId]);
    await query(`
      INSERT INTO negotiation_messages (trade_id, from_agent_id, action, message)
      VALUES ($1, $2, 'decline', $3)
    `, [tradeId, agentId, reason || 'Trade declined']);

    logger.info('Trade declined', { trade_id: tradeId, by: agentId, reason });
    return { trade_id: tradeId, status: 'cancelled', reason };
  }

  /**
   * Confirm delivery → release escrow, update reputation.
   */
  static async confirmDelivery(agentId, tradeId, { rating, review }) {
    const { rows: [trade] } = await query('SELECT * FROM trades WHERE trade_id = $1', [tradeId]);
    if (!trade) { const err = new Error('Trade not found'); err.status = 404; throw err; }

    // Only buyer can confirm delivery
    if (trade.buyer_agent_id !== agentId) {
      const err = new Error('Only the buyer can confirm delivery');
      err.status = 403;
      throw err;
    }

    if (!['escrow_active', 'shipping'].includes(trade.status)) {
      const err = new Error(`Cannot confirm delivery in state: ${trade.status}`);
      err.status = 400;
      throw err;
    }

    const agreedPrice = parseFloat(trade.agreed_price);
    const fee = parseFloat(trade.fee_amount);
    const sellerReceives = agreedPrice - fee;

    return transaction(async (client) => {
      // Release escrow: buyer's locked → seller's available (minus fee)
      const { rows: [buyerWallet] } = await client.query(`
        SELECT w.id FROM wallets w JOIN users u ON w.user_id = u.id JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [trade.buyer_agent_id]);

      const { rows: [sellerWallet] } = await client.query(`
        SELECT w.id, w.available_balance FROM wallets w JOIN users u ON w.user_id = u.id JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [trade.seller_agent_id]);

      // Unlock buyer's escrow
      await client.query(
        'UPDATE wallets SET locked_balance = locked_balance - $1, updated_at = NOW() WHERE id = $2',
        [agreedPrice, buyerWallet.id]
      );

      // Credit seller (minus fee)
      await client.query(
        'UPDATE wallets SET available_balance = available_balance + $1, updated_at = NOW() WHERE id = $2',
        [sellerReceives, sellerWallet.id]
      );

      // Record transactions
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description, trade_id)
        VALUES ($1, $2, 'escrow_release', $3, $3, $4, $5)
      `, [`txn_release_buyer_${tradeId}`, buyerWallet.id, 0, `Escrow released for trade ${tradeId}`, tradeId]);

      const sellerNewBalance = parseFloat(sellerWallet.available_balance) + sellerReceives;
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description, trade_id)
        VALUES ($1, $2, 'trade_received', $3, $4, $5, $6)
      `, [`txn_seller_${tradeId}`, sellerWallet.id, sellerReceives, sellerNewBalance, `Payment for trade ${tradeId} (after ${fee} CC fee)`, tradeId]);

      // Update trade status
      await client.query(
        "UPDATE trades SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE trade_id = $1",
        [tradeId]
      );

      // Record review
      await client.query(`
        INSERT INTO reviews (trade_id, reviewer_agent_id, reviewed_agent_id, rating, review_text)
        VALUES ($1, $2, $3, $4, $5)
      `, [tradeId, agentId, trade.seller_agent_id, rating, review || null]);

      // Update agent stats
      await client.query(`
        UPDATE agents SET total_trades = total_trades + 1, successful_trades = successful_trades + 1,
          reputation_score = reputation_score + $1, updated_at = NOW()
        WHERE agent_id IN ($2, $3)
      `, [rating, trade.buyer_agent_id, trade.seller_agent_id]);

      // Auto-promote tier based on successful trades
      for (const aid of [trade.buyer_agent_id, trade.seller_agent_id]) {
        const { rows: [agent] } = await client.query(
          'SELECT successful_trades, reputation_score FROM agents WHERE agent_id = $1', [aid]
        );
        let newTier = 'newcomer';
        if (agent.successful_trades >= 100 && agent.reputation_score >= 400) newTier = 'elite';
        else if (agent.successful_trades >= 50 && agent.reputation_score >= 200) newTier = 'verified';
        else if (agent.successful_trades >= 10 && agent.reputation_score >= 30) newTier = 'trusted';

        await client.query('UPDATE agents SET tier = $1 WHERE agent_id = $2', [newTier, aid]);
      }

      logger.info('Trade completed', { trade_id: tradeId, seller_received: sellerReceives, fee });

      return {
        trade_id: tradeId,
        status: 'completed',
        seller_received: sellerReceives,
        buyer_paid: agreedPrice,
        dealclaw_fee: fee,
        rating,
        review: review || null,
      };
    });
  }

  /**
   * Add shipping info to a trade.
   */
  static async addShipping(agentId, tradeId, { tracking_number, carrier, estimated_delivery }) {
    const { rows: [trade] } = await query('SELECT * FROM trades WHERE trade_id = $1', [tradeId]);
    if (!trade) { const err = new Error('Trade not found'); err.status = 404; throw err; }
    if (trade.seller_agent_id !== agentId) { const err = new Error('Only seller can add shipping'); err.status = 403; throw err; }

    await query(`
      INSERT INTO shipping_info (trade_id, tracking_number, carrier, estimated_delivery)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (trade_id) DO UPDATE SET
        tracking_number = excluded.tracking_number,
        carrier = excluded.carrier,
        estimated_delivery = excluded.estimated_delivery
    `, [tradeId, tracking_number, carrier, estimated_delivery || null]);

    await query("UPDATE trades SET status = 'shipping', updated_at = NOW() WHERE trade_id = $1", [tradeId]);

    return { trade_id: tradeId, status: 'shipping', shipping: { tracking_number, carrier, estimated_delivery } };
  }

  /**
   * List trades for an agent with filters.
   */
  static async list(agentId, queryParams) {
    const conditions = ['(t.buyer_agent_id = $1 OR t.seller_agent_id = $1)'];
    const values = [agentId];
    let idx = 2;

    if (queryParams.status) {
      conditions.push(`t.status = $${idx}`);
      values.push(queryParams.status);
      idx++;
    }

    const limit = parseInt(queryParams.limit) || 25;
    const offset = parseInt(queryParams.offset) || 0;

    const where = conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM trades t WHERE ${where}`, values);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await query(`
      SELECT t.trade_id, t.listing_id, t.buyer_agent_id, t.seller_agent_id,
             t.agreed_price, t.fee_amount, t.status, t.created_at, t.completed_at,
             l.title as listing_title
      FROM trades t
      JOIN listings l ON t.listing_id = l.listing_id
      WHERE ${where}
      ORDER BY t.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    return {
      trades: rows.map(r => ({
        trade_id: r.trade_id,
        listing_id: r.listing_id,
        listing_title: r.listing_title,
        role: r.buyer_agent_id === agentId ? 'buyer' : 'seller',
        counterparty: r.buyer_agent_id === agentId ? r.seller_agent_id : r.buyer_agent_id,
        agreed_price: r.agreed_price ? parseFloat(r.agreed_price) : null,
        fee: r.fee_amount ? parseFloat(r.fee_amount) : null,
        status: r.status,
        created_at: r.created_at,
        completed_at: r.completed_at,
      })),
      total, limit, offset,
    };
  }
}

module.exports = TradeService;
