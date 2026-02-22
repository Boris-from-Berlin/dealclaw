// Database connection pool for DealClaw
const { Pool } = require('pg');
const logger = require('../middleware/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Execute a query with automatic connection management.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn('Slow query detected', { text: text.slice(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    logger.error('Database query error', { text: text.slice(0, 100), error: err.message });
    throw err;
  }
}

/**
 * Execute multiple queries in a transaction.
 * @param {Function} callback - async function(client) that runs queries
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check if database is reachable.
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return { status: 'ok', timestamp: result.rows[0].now };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = { pool, query, transaction, healthCheck };
