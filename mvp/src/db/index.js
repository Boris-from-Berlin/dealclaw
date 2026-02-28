// Database layer for DealClaw — SQLite via better-sqlite3
// Drop-in replacement for the old PostgreSQL pool.
// Exports the same query(text, params) and transaction(callback) interface.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../middleware/logger');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'dealclaw.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

logger.info(`SQLite database at ${DB_PATH}`);

/**
 * Convert PostgreSQL parameterized query ($1, $2, ...) to SQLite (?, ?, ...).
 * Handles parameter reuse ($5 appearing twice → duplicates the value in params).
 * Also translates common PG functions to SQLite equivalents.
 */
function pgToSqlite(sql, params = []) {
  // Collect $N references in order, then expand the params array
  const refs = [];
  let s = sql.replace(/\$(\d+)/g, (_, num) => {
    refs.push(parseInt(num) - 1); // 0-indexed
    return '?';
  });
  const expandedParams = refs.length > 0 ? refs.map(idx => params[idx]) : params;

  // NOW() → datetime('now')
  s = s.replace(/\bNOW\(\)/gi, "datetime('now')");
  // ILIKE → LIKE (SQLite LIKE is case-insensitive for ASCII)
  s = s.replace(/\bILIKE\b/gi, 'LIKE');
  // GREATEST(a, b) → MAX(a, b) (SQLite)
  s = s.replace(/\bGREATEST\b/gi, 'MAX');

  return { sql: s, params: expandedParams };
}

/**
 * Execute a SQL query. Returns { rows, rowCount } like pg.
 * @param {string} text - SQL (can use $1, $2 params — auto-converted)
 * @param {Array} params - Bind values
 */
async function query(text, params = []) {
  const converted = pgToSqlite(text, params);
  const sql = converted.sql;
  const sqlParams = converted.params;
  const start = Date.now();

  try {
    const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sql);
    const hasReturning = /\bRETURNING\b/i.test(sql);

    let rows, rowCount;

    if (isSelect || hasReturning) {
      const stmt = db.prepare(sql);
      rows = stmt.all(...sqlParams);
      // Alias COUNT(*) → count for pg compatibility
      for (const row of rows) {
        if ('COUNT(*)' in row) row.count = row['COUNT(*)'];
      }
      rowCount = rows.length;
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...sqlParams);
      rows = [];
      rowCount = info.changes;
    }

    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn('Slow query', { sql: sql.slice(0, 100), duration, rowCount });
    }

    return { rows, rowCount };
  } catch (err) {
    logger.error('Query error', { sql: sql.slice(0, 100), error: err.message });
    throw err;
  }
}

/**
 * Run multiple queries inside a SQLite transaction.
 * The callback receives a client object with a .query() method (same interface as pg).
 * @param {Function} callback - async function(client)
 */
async function transaction(callback) {
  const client = {
    query: async (text, params = []) => {
      const converted = pgToSqlite(text, params);
      const sql = converted.sql;
      const sqlParams = converted.params;
      const isSelect = /^\s*(SELECT|WITH)/i.test(sql);
      const hasReturning = /\bRETURNING\b/i.test(sql);

      if (isSelect || hasReturning) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...sqlParams);
        for (const row of rows) {
          if ('COUNT(*)' in row) row.count = row['COUNT(*)'];
        }
        return { rows, rowCount: rows.length };
      } else {
        const stmt = db.prepare(sql);
        const info = stmt.run(...sqlParams);
        return { rows: [], rowCount: info.changes };
      }
    }
  };

  db.exec('BEGIN');
  try {
    const result = await callback(client);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Health check — just confirm the DB file is readable.
 */
async function healthCheck() {
  try {
    const row = db.prepare("SELECT datetime('now') AS now").get();
    return { status: 'ok', timestamp: row.now };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

/**
 * Initialize all tables (idempotent — uses IF NOT EXISTS).
 */
function initSchema() {
  const schemaPath = path.join(__dirname, '..', '..', 'scripts', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    logger.info('Database schema initialized');
  }
}

// Auto-init on first require
initSchema();

module.exports = { db, query, transaction, healthCheck };
