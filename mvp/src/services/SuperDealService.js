// SuperDealService - Advanced deal system where sellers control the timing
//
// How Super Deals work:
// 1. Seller creates a listing with deal_mode='super_deal' and deal_window_hours (e.g., 24, 48, 168)
// 2. Multiple buyer agents can submit offers during the window
// 3. Seller's agent sees all offers in real-time
// 4. After the window closes, seller picks the best offer (or auto-accept triggers)
// 5. Losing offers are rejected, winning offer moves to normal trade flow (escrow etc.)
//
// Optional: Seller sets deal_auto_accept_at price — any offer >= that price is instantly accepted

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const logger = require('../middleware/logger');

class SuperDealService {
  /**
   * Submit an offer on a Super Deal listing.
   * Unlike instant trades, this doesn't start a negotiation — it queues the offer.
   */
  static async submitOffer(buyerAgentId, { listing_id, offer_amount, max_budget, message }) {
    // Get listing and verify it's a super deal
    const { rows: [listing] } = await query(
      "SELECT * FROM listings WHERE listing_id = $1 AND status = 'active'",
      [listing_id]
    );

    if (!listing) {
      const err = new Error('Listing not found or not active');
      err.status = 404;
      throw err;
    }

    if (listing.deal_mode !== 'super_deal') {
      const err = new Error('This listing is not a Super Deal. Use the regular /trades/negotiate endpoint.');
      err.status = 400;
      throw err;
    }

    // Can't bid on your own listing
    if (listing.agent_id === buyerAgentId) {
      const err = new Error('Cannot bid on your own listing');
      err.status = 400;
      throw err;
    }

    // Check if deal window is still open
    if (listing.deal_window_ends_at && new Date(listing.deal_window_ends_at) < new Date()) {
      const err = new Error('The deal window has closed. No more offers accepted.');
      err.status = 400;
      throw err;
    }

    // Check max offers limit
    if (listing.max_offers > 0) {
      const { rows: [count] } = await query(
        "SELECT COUNT(*) FROM super_deal_offers WHERE listing_id = $1 AND status = 'pending'",
        [listing_id]
      );
      if (parseInt(count.count) >= listing.max_offers) {
        const err = new Error(`Maximum offers (${listing.max_offers}) reached for this listing.`);
        err.status = 400;
        throw err;
      }
    }

    // Check buyer has enough balance
    const { rows: [wallet] } = await query(`
      SELECT w.available_balance FROM wallets w
      JOIN users u ON w.user_id = u.id
      JOIN agents a ON a.user_id = u.id
      WHERE a.agent_id = $1
    `, [buyerAgentId]);

    if (!wallet || parseFloat(wallet.available_balance) < offer_amount) {
      const err = new Error('Insufficient ClawCoin balance for this offer');
      err.status = 400;
      throw err;
    }

    // Check for duplicate offer from same agent
    const { rows: existing } = await query(
      "SELECT 1 FROM super_deal_offers WHERE listing_id = $1 AND buyer_agent_id = $2 AND status = 'pending'",
      [listing_id, buyerAgentId]
    );
    if (existing.length > 0) {
      const err = new Error('You already have a pending offer on this listing. Withdraw it first to submit a new one.');
      err.status = 409;
      throw err;
    }

    const offerId = `sdo_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    await query(`
      INSERT INTO super_deal_offers (offer_id, listing_id, buyer_agent_id, offer_amount, max_budget, message, status, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
    `, [
      offerId, listing_id, buyerAgentId, offer_amount,
      max_budget || offer_amount, message || null,
      listing.deal_window_ends_at || null,
    ]);

    logger.info('Super Deal offer submitted', { offer_id: offerId, listing_id, buyer: buyerAgentId, amount: offer_amount });

    // Check auto-accept
    if (listing.deal_auto_accept_at && offer_amount >= parseFloat(listing.deal_auto_accept_at)) {
      logger.info('Auto-accept triggered', { offer_id: offerId, auto_accept_at: listing.deal_auto_accept_at });
      return this.acceptOffer(listing.agent_id, listing_id, offerId);
    }

    return {
      offer_id: offerId,
      listing_id,
      offer_amount,
      status: 'pending',
      deal_window_ends_at: listing.deal_window_ends_at,
      message: listing.deal_window_ends_at
        ? `Offer submitted. Seller will decide after ${new Date(listing.deal_window_ends_at).toISOString()}`
        : 'Offer submitted. Seller will decide when ready.',
      position: await this._getOfferPosition(listing_id, offer_amount),
    };
  }

  /**
   * Get all pending offers for a listing (seller view).
   */
  static async getOffers(sellerAgentId, listingId) {
    // Verify seller owns this listing
    const { rows: [listing] } = await query(
      'SELECT agent_id, deal_mode, deal_window_ends_at, deal_auto_accept_at FROM listings WHERE listing_id = $1',
      [listingId]
    );

    if (!listing) {
      const err = new Error('Listing not found');
      err.status = 404;
      throw err;
    }
    if (listing.agent_id !== sellerAgentId) {
      const err = new Error('Only the seller can view offers');
      err.status = 403;
      throw err;
    }

    const { rows: offers } = await query(`
      SELECT o.offer_id, o.buyer_agent_id, o.offer_amount, o.message, o.status, o.created_at,
             a.name as buyer_name, a.reputation_score, a.tier as buyer_tier
      FROM super_deal_offers o
      JOIN agents a ON o.buyer_agent_id = a.agent_id
      WHERE o.listing_id = $1
      ORDER BY o.offer_amount DESC, o.created_at ASC
    `, [listingId]);

    const windowOpen = !listing.deal_window_ends_at || new Date(listing.deal_window_ends_at) > new Date();

    return {
      listing_id: listingId,
      deal_mode: listing.deal_mode,
      window_open: windowOpen,
      window_ends_at: listing.deal_window_ends_at,
      auto_accept_at: listing.deal_auto_accept_at ? parseFloat(listing.deal_auto_accept_at) : null,
      total_offers: offers.length,
      pending_offers: offers.filter(o => o.status === 'pending').length,
      offers: offers.map(o => ({
        offer_id: o.offer_id,
        buyer: {
          agent_id: o.buyer_agent_id,
          name: o.buyer_name,
          reputation: o.reputation_score,
          tier: o.buyer_tier,
        },
        amount: parseFloat(o.offer_amount),
        message: o.message,
        status: o.status,
        submitted_at: o.created_at,
      })),
    };
  }

  /**
   * Seller accepts a specific offer → rejects all others → starts trade.
   */
  static async acceptOffer(sellerAgentId, listingId, offerId) {
    return transaction(async (client) => {
      // Verify ownership
      const { rows: [listing] } = await client.query(
        'SELECT agent_id FROM listings WHERE listing_id = $1', [listingId]
      );
      if (!listing || listing.agent_id !== sellerAgentId) {
        const err = new Error('Not authorized');
        err.status = 403;
        throw err;
      }

      // Get the winning offer
      const { rows: [offer] } = await client.query(
        "SELECT * FROM super_deal_offers WHERE offer_id = $1 AND status = 'pending'",
        [offerId]
      );
      if (!offer) {
        const err = new Error('Offer not found or already processed');
        err.status = 404;
        throw err;
      }

      // Accept this offer
      await client.query(
        "UPDATE super_deal_offers SET status = 'accepted' WHERE offer_id = $1",
        [offerId]
      );

      // Reject all other pending offers
      const { rowCount: rejectedCount } = await client.query(
        "UPDATE super_deal_offers SET status = 'rejected' WHERE listing_id = $1 AND offer_id != $2 AND status = 'pending'",
        [listingId, offerId]
      );

      // Update listing
      await client.query(
        "UPDATE listings SET deal_decided_at = NOW(), winning_offer_id = $1, status = 'sold', updated_at = NOW() WHERE listing_id = $2",
        [offerId, listingId]
      );

      // Create a trade from this offer (enters normal escrow flow)
      const tradeId = `trd_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const { rows: [listingDetails] } = await client.query(
        'SELECT min_price FROM listings WHERE listing_id = $1', [listingId]
      );

      await client.query(`
        INSERT INTO trades (trade_id, listing_id, buyer_agent_id, seller_agent_id,
                            buyer_max_price, seller_min_price, agreed_price, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'escrow_active')
      `, [
        tradeId, listingId, offer.buyer_agent_id, sellerAgentId,
        offer.max_budget || offer.offer_amount,
        listingDetails.min_price,
        offer.offer_amount,
      ]);

      // Lock buyer funds in escrow
      await client.query(`
        UPDATE wallets SET
          available_balance = available_balance - $1,
          escrowed_balance = escrowed_balance + $1,
          updated_at = NOW()
        FROM users u
        JOIN agents a ON a.user_id = u.id
        WHERE wallets.user_id = u.id AND a.agent_id = $2
          AND wallets.available_balance >= $1
      `, [offer.offer_amount, offer.buyer_agent_id]);

      // Record the escrow transaction
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, description)
        SELECT $1, w.wallet_id, 'escrow_lock', $2, $3
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $4
      `, [
        'txn_' + uuidv4().replace(/-/g, '').slice(0, 12),
        -parseFloat(offer.offer_amount),
        'Escrow locked for Super Deal trade ' + tradeId,
        offer.buyer_agent_id,
      ]);

      logger.info('Super Deal decided', {
        listing_id: listingId,
        winning_offer: offerId,
        rejected_count: rejectedCount,
        trade_id: tradeId,
      });

      return {
        trade_id: tradeId,
        listing_id: listingId,
        winning_offer_id: offerId,
        agreed_price: parseFloat(offer.offer_amount),
        buyer_agent_id: offer.buyer_agent_id,
        rejected_offers: rejectedCount,
        status: 'escrow_active',
        message: `Deal accepted! Trade ${tradeId} created. Escrow flow begins.`,
      };
    });
  }

  /**
   * Buyer withdraws their offer (before seller decides).
   */
  static async withdrawOffer(buyerAgentId, offerId) {
    const { rows: [offer] } = await query(
      "SELECT * FROM super_deal_offers WHERE offer_id = $1 AND status = 'pending'",
      [offerId]
    );

    if (!offer) {
      const err = new Error('Offer not found or already processed');
      err.status = 404;
      throw err;
    }
    if (offer.buyer_agent_id !== buyerAgentId) {
      const err = new Error('Not authorized');
      err.status = 403;
      throw err;
    }

    await query(
      "UPDATE super_deal_offers SET status = 'withdrawn' WHERE offer_id = $1",
      [offerId]
    );

    return { offer_id: offerId, status: 'withdrawn', message: 'Offer withdrawn successfully.' };
  }

  /**
   * Get the buyer's position (rank by amount).
   */
  static async _getOfferPosition(listingId, amount) {
    const { rows: [result] } = await query(`
      SELECT COUNT(*) as higher_offers FROM super_deal_offers
      WHERE listing_id = $1 AND status = 'pending' AND offer_amount > $2
    `, [listingId, amount]);

    const position = parseInt(result.higher_offers) + 1;
    return { rank: position, note: position === 1 ? 'You have the highest offer!' : `${position - 1} offer(s) above yours.` };
  }
}

module.exports = SuperDealService;
