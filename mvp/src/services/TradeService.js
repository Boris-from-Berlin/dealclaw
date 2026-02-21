// TradeService - Negotiation, escrow, delivery, fee calculation
// This is the CORE business logic of DealClaw

class TradeService {
  /**
   * Calculate DealClaw fee based on price difference model:
   * Fee = FEE_RATE * (buyer_max - seller_min)
   * Minimum fee applies if difference is too small.
   */
  static calculateFee(buyerMax, sellerMin) {
    const feeRate = parseFloat(process.env.CLAWCOIN_FEE_RATE || '0.10');
    const minFee = parseFloat(process.env.CLAWCOIN_MIN_FEE || '0.5');
    const priceDifference = buyerMax - sellerMin;

    if (priceDifference <= 0) {
      return minFee; // If no gap, minimum fee applies
    }

    const fee = priceDifference * feeRate;
    return Math.max(fee, minFee);
  }

  static async negotiate(agent_id, { listing_id, trade_id, action, offer_amount, max_budget, message }) {
    // TODO: If no trade_id, create new trade (initial offer)
    // TODO: If trade_id exists, continue negotiation
    // TODO: Validate offer is within agent's user budget
    // TODO: Store negotiation history
    // TODO: Send WebSocket notification to other agent
    // TODO: Charge micro-fee per negotiation message (0.01 CC)

    return {
      trade_id: trade_id || `trd_${Date.now()}`,
      listing_id,
      status: 'negotiating',
      current_offer: offer_amount,
      negotiation_fee_charged: 0.01, // CC
      message: 'TODO: Implement full negotiation logic'
    };
  }

  static async accept(agent_id, trade_id) {
    // TODO: Verify agent is part of this trade
    // TODO: Calculate fee: 10% of (buyer_max - seller_min)
    // TODO: Lock buyer's ClawCoins in escrow
    // TODO: Update trade status to 'escrow_active'
    // TODO: Notify both users

    const buyerMax = 1000; // TODO: Get from trade record
    const sellerMin = 800; // TODO: Get from listing record
    const fee = this.calculateFee(buyerMax, sellerMin);

    return {
      trade_id,
      status: 'escrow_active',
      escrow: { amount: 900, locked_at: new Date().toISOString() },
      fee: {
        amount: fee,
        calculation: `${(parseFloat(process.env.CLAWCOIN_FEE_RATE || 0.10) * 100)}% of (${buyerMax} - ${sellerMin}) = ${fee} CC`
      }
    };
  }

  static async decline(agent_id, trade_id, { reason }) {
    // TODO: Update trade status, notify other agent
    return { trade_id, status: 'cancelled', reason };
  }

  static async confirmDelivery(agent_id, trade_id, { rating, review }) {
    // TODO: Release escrow (minus fee) to seller
    // TODO: Update both agents' reputation scores
    // TODO: Record rating and review
    return {
      trade_id,
      status: 'completed',
      seller_received: 880,
      buyer_paid: 900,
      dealclaw_fee: 20,
      fee_calculation: '10% of price gap (1000 - 800 = 200 CC)'
    };
  }

  static async addShipping(agent_id, trade_id, { tracking_number, carrier, estimated_delivery }) {
    // TODO: Store shipping info, notify buyer
    return { trade_id, shipping: { tracking_number, carrier, estimated_delivery } };
  }

  static async list(agent_id, query) {
    // TODO: Fetch from database with filters
    return { trades: [], total: 0 };
  }
}

module.exports = TradeService;
