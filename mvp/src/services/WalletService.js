// WalletService - ClawCoin balance, escrow, transactions
// Full PostgreSQL implementation with event-sourcing ledger

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const logger = require('../middleware/logger');

class WalletService {
  /**
   * Get wallet balance for an agent.
   */
  static async getBalance(agentId) {
    const { rows } = await query(`
      SELECT w.available_balance, w.locked_balance
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      JOIN agents a ON a.user_id = u.id
      WHERE a.agent_id = $1
    `, [agentId]);

    if (rows.length === 0) {
      const err = new Error('Wallet not found');
      err.status = 404;
      throw err;
    }

    const w = rows[0];
    const available = parseFloat(w.available_balance);
    const locked = parseFloat(w.locked_balance);

    return {
      available,
      locked,
      total: available + locked,
      currency: 'CC',
      eur_equivalent: {
        available: available * parseFloat(process.env.CLAWCOIN_RATE_EUR || '0.10'),
        total: (available + locked) * parseFloat(process.env.CLAWCOIN_RATE_EUR || '0.10'),
      },
    };
  }

  /**
   * Get transaction history for an agent.
   */
  static async getTransactions(agentId, params) {
    const limit = parseInt(params.limit) || 25;
    const offset = parseInt(params.offset) || 0;

    const { rows: walletRows } = await query(`
      SELECT w.id FROM wallets w
      JOIN users u ON w.user_id = u.id
      JOIN agents a ON a.user_id = u.id
      WHERE a.agent_id = $1
    `, [agentId]);

    if (walletRows.length === 0) {
      return { transactions: [], total: 0 };
    }

    const walletId = walletRows[0].id;

    const conditions = ['t.wallet_id = $1'];
    const values = [walletId];
    let idx = 2;

    if (params.type) {
      conditions.push(`t.type = $${idx}`);
      values.push(params.type);
      idx++;
    }

    const where = conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM transactions t WHERE ${where}`, values);
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await query(`
      SELECT t.transaction_id, t.type, t.amount, t.balance_after, t.description, t.trade_id, t.created_at
      FROM transactions t
      WHERE ${where}
      ORDER BY t.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    return {
      transactions: rows.map(r => ({
        transaction_id: r.transaction_id,
        type: r.type,
        amount: parseFloat(r.amount),
        balance_after: parseFloat(r.balance_after),
        description: r.description,
        trade_id: r.trade_id,
        created_at: r.created_at,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Deposit ClawCoins (convert EUR → CC via Stripe).
   * For MVP: simplified without actual Stripe integration.
   */
  static async deposit(agentId, amountEur, paymentMethodId) {
    const ccRate = parseFloat(process.env.CLAWCOIN_RATE_EUR || '0.10');
    const ccAmount = amountEur / ccRate; // e.g., 10 EUR → 100 CC

    return transaction(async (client) => {
      const { rows: [wallet] } = await client.query(`
        SELECT w.id, w.available_balance FROM wallets w
        JOIN users u ON w.user_id = u.id
        JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [agentId]);

      if (!wallet) {
        const err = new Error('Wallet not found');
        err.status = 404;
        throw err;
      }

      const newBalance = parseFloat(wallet.available_balance) + ccAmount;

      await client.query(
        'UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, wallet.id]
      );

      const txnId = `txn_dep_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description)
        VALUES ($1, $2, 'deposit', $3, $4, $5)
      `, [txnId, wallet.id, ccAmount, newBalance, `Deposit: ${amountEur} EUR → ${ccAmount} CC`]);

      logger.info('Deposit processed', { agent_id: agentId, eur: amountEur, cc: ccAmount });

      return {
        transaction_id: txnId,
        deposited: { eur: amountEur, cc: ccAmount },
        new_balance: newBalance,
        rate: `1 CC = ${ccRate} EUR`,
      };
    });
  }

  /**
   * Lock ClawCoins in escrow for a trade.
   */
  static async lockEscrow(agentId, tradeId, amount) {
    return transaction(async (client) => {
      const { rows: [wallet] } = await client.query(`
        SELECT w.id, w.available_balance FROM wallets w
        JOIN users u ON w.user_id = u.id
        JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [agentId]);

      if (!wallet || parseFloat(wallet.available_balance) < amount) {
        const err = new Error('Insufficient balance');
        err.status = 400;
        throw err;
      }

      await client.query(
        'UPDATE wallets SET available_balance = available_balance - $1, locked_balance = locked_balance + $1, updated_at = NOW() WHERE id = $2',
        [amount, wallet.id]
      );

      const newBalance = parseFloat(wallet.available_balance) - amount;
      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description, trade_id)
        VALUES ($1, $2, 'escrow_lock', $3, $4, $5, $6)
      `, [`txn_lock_${tradeId}`, wallet.id, -amount, newBalance, `Escrow locked for ${tradeId}`, tradeId]);

      return { locked: amount, new_available: newBalance };
    });
  }

  /**
   * Release escrow: pay seller and collect fee.
   */
  static async releaseEscrow(tradeId, sellerAgentId, sellerAmount, feeAmount) {
    return transaction(async (client) => {
      // Credit seller
      const { rows: [sellerWallet] } = await client.query(`
        SELECT w.id, w.available_balance FROM wallets w
        JOIN users u ON w.user_id = u.id
        JOIN agents a ON a.user_id = u.id
        WHERE a.agent_id = $1
      `, [sellerAgentId]);

      const newBalance = parseFloat(sellerWallet.available_balance) + sellerAmount;
      await client.query(
        'UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, sellerWallet.id]
      );

      await client.query(`
        INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description, trade_id)
        VALUES ($1, $2, 'trade_received', $3, $4, $5, $6)
      `, [`txn_pay_${tradeId}`, sellerWallet.id, sellerAmount, newBalance, `Payment received (after ${feeAmount} CC fee)`, tradeId]);

      return { seller_received: sellerAmount, fee_collected: feeAmount };
    });
  }
}

module.exports = WalletService;
