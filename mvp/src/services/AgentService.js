// AgentService - Agent registration, profile management, authentication
// Full PostgreSQL implementation

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const logger = require('../middleware/logger');

class AgentService {
  /**
   * Register a new agent and generate API key.
   */
  static async register({ name, description, framework, user_verification, capabilities }) {
    // Check name uniqueness
    const existing = await query('SELECT 1 FROM agents WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      const err = new Error(`Agent name "${name}" is already taken`);
      err.status = 409;
      throw err;
    }

    // For MVP: auto-create a user if no verification provided
    // In production, this would verify OAuth/signed claim
    let userId;
    if (user_verification && user_verification.method === 'api_key') {
      const userResult = await query('SELECT id FROM users WHERE email = $1', [user_verification.token]);
      if (userResult.rows.length === 0) {
        const err = new Error('User verification failed');
        err.status = 401;
        throw err;
      }
      userId = userResult.rows[0].id;
    } else {
      // MVP: create anonymous user placeholder
      const { rows: [newUser] } = await query(
        "INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id",
        [`agent_${uuidv4().slice(0, 8)}@dealclaw.org`, `Owner of ${name}`]
      );
      userId = newUser.id;
    }

    const agentId = `agt_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    // Generate JWT-based API key
    const token = jwt.sign(
      { agent_id: agentId, name, framework },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );
    const apiKey = `dealclaw_${token}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    // Store agent
    await query(`
      INSERT INTO agents (agent_id, name, description, framework, capabilities, api_key_hash, user_id, reputation_score, tier)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'newcomer')
    `, [agentId, name, description || '', framework, capabilities, apiKeyHash, userId]);

    // Create wallet with welcome bonus
    const welcomeBonus = parseFloat(process.env.WELCOME_BONUS_CC || '10');
    const { rows: [wallet] } = await query(
      'INSERT INTO wallets (user_id, available_balance) VALUES ($1, $2) RETURNING id',
      [userId, welcomeBonus]
    );

    // Record welcome bonus transaction
    await query(`
      INSERT INTO transactions (transaction_id, wallet_id, type, amount, balance_after, description)
      VALUES ($1, $2, 'bonus', $3, $3, 'Welcome bonus for new agent registration')
    `, [`txn_welcome_${agentId}`, wallet.id, welcomeBonus]);

    logger.info('Agent registered', { agent_id: agentId, framework, name });

    return {
      agent_id: agentId,
      api_key: apiKey,
      reputation_score: 0,
      tier: 'newcomer',
      welcome_bonus: welcomeBonus,
    };
  }

  /**
   * Get full agent profile (for the agent owner).
   */
  static async getProfile(agentId) {
    const { rows } = await query(`
      SELECT a.agent_id, a.name, a.description, a.framework, a.capabilities,
             a.reputation_score, a.tier, a.total_trades, a.successful_trades,
             a.status, a.created_at, a.updated_at,
             w.available_balance, w.locked_balance
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE a.agent_id = $1
    `, [agentId]);

    if (rows.length === 0) {
      const err = new Error('Agent not found');
      err.status = 404;
      throw err;
    }

    const agent = rows[0];
    return {
      agent_id: agent.agent_id,
      name: agent.name,
      description: agent.description,
      framework: agent.framework,
      capabilities: agent.capabilities,
      reputation: {
        score: agent.reputation_score,
        tier: agent.tier,
        total_trades: agent.total_trades,
        successful_trades: agent.successful_trades,
      },
      wallet: {
        available: parseFloat(agent.available_balance || 0),
        locked: parseFloat(agent.locked_balance || 0),
        total: parseFloat(agent.available_balance || 0) + parseFloat(agent.locked_balance || 0),
      },
      status: agent.status,
      created_at: agent.created_at,
    };
  }

  /**
   * Update agent profile (description, capabilities).
   */
  static async updateProfile(agentId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(updates.description);
    }
    if (updates.capabilities !== undefined) {
      fields.push(`capabilities = $${idx++}`);
      values.push(updates.capabilities);
    }

    if (fields.length === 0) {
      const err = new Error('No valid fields to update');
      err.status = 400;
      throw err;
    }

    fields.push(`updated_at = NOW()`);
    values.push(agentId);

    const { rowCount } = await query(
      `UPDATE agents SET ${fields.join(', ')} WHERE agent_id = $${idx}`,
      values
    );

    if (rowCount === 0) {
      const err = new Error('Agent not found');
      err.status = 404;
      throw err;
    }

    return this.getProfile(agentId);
  }

  /**
   * Get public agent profile (visible to everyone).
   */
  static async getPublicProfile(agentName) {
    const { rows } = await query(`
      SELECT agent_id, name, description, framework, capabilities,
             reputation_score, tier, total_trades, successful_trades,
             trade_history_public, created_at
      FROM agents
      WHERE name = $1 AND status = 'active'
    `, [agentName]);

    if (rows.length === 0) {
      const err = new Error('Agent not found');
      err.status = 404;
      throw err;
    }

    const agent = rows[0];

    // Public profile: tier badge always visible.
    // Trade numbers only visible via API to agents (for trust assessment).
    // Website frontend checks trade_history_public flag to decide visibility.
    return {
      agent_id: agent.agent_id,
      name: agent.name,
      description: agent.description,
      framework: agent.framework,
      capabilities: agent.capabilities,
      reputation: {
        tier: agent.tier,
        total_trades: agent.total_trades,
        success_rate: agent.total_trades > 0
          ? Math.round((agent.successful_trades / agent.total_trades) * 100)
          : null,
      },
      trade_history_public: agent.trade_history_public || false,
      member_since: agent.created_at,
    };
  }
}

module.exports = AgentService;
