#!/usr/bin/env node
// Database migration for DealClaw (SQLite)
// Schema is auto-initialized on first require of db/index.js.
// This script confirms the schema is ready.

require('dotenv').config();
const { healthCheck } = require('./index');

async function migrate() {
  console.log('DealClaw database migration (SQLite)');
  const status = await healthCheck();
  console.log(`  Status: ${status.status}`);
  console.log(`  Time: ${status.timestamp}`);
  console.log('\nSchema is auto-initialized on startup.');
  console.log('Run `npm run db:seed` to populate test data.');
}

migrate();
