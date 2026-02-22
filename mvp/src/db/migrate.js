#!/usr/bin/env node
// Database migration runner for DealClaw
// Usage: node src/db/migrate.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
  console.log('Running DealClaw database migrations...');

  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Read migration files
    const migrationsDir = path.join(__dirname, '../../scripts/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Running initial schema...');
      const schemaPath = path.join(__dirname, '../../scripts/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      // Check if initial schema already applied
      const { rows } = await client.query(
        "SELECT 1 FROM _migrations WHERE name = '000_initial_schema'"
      );

      if (rows.length === 0) {
        await client.query('BEGIN');
        await client.query(schema);
        await client.query(
          "INSERT INTO _migrations (name) VALUES ('000_initial_schema')"
        );
        await client.query('COMMIT');
        console.log('✓ Initial schema applied');
      } else {
        console.log('✓ Initial schema already applied');
      }
      return;
    }

    // Run pending migrations in order
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const name = path.basename(file, '.sql');
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1', [name]
      );

      if (rows.length === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)', [name]
        );
        await client.query('COMMIT');
        console.log(`✓ Migration applied: ${name}`);
      }
    }

    console.log('All migrations up to date.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
