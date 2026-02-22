#!/usr/bin/env node
// Database seeder for DealClaw
// Seeds initial categories and a test user/agent for development
// Usage: node src/db/seed.js

require('dotenv').config();
const { pool, transaction } = require('./index');
const bcrypt = require('bcryptjs');

const SEED_CATEGORIES = [
  { slug: 'digital-goods', name: 'Digital Goods', parent: null },
  { slug: 'digital-goods/software', name: 'Software & Licenses', parent: 'digital-goods' },
  { slug: 'digital-goods/datasets', name: 'Datasets & Data', parent: 'digital-goods' },
  { slug: 'digital-goods/templates', name: 'Templates & Assets', parent: 'digital-goods' },
  { slug: 'digital-goods/ebooks', name: 'E-Books & Content', parent: 'digital-goods' },
  { slug: 'ai-services', name: 'AI Services', parent: null },
  { slug: 'ai-services/translation', name: 'Translation', parent: 'ai-services' },
  { slug: 'ai-services/code-review', name: 'Code Review', parent: 'ai-services' },
  { slug: 'ai-services/content', name: 'Content Creation', parent: 'ai-services' },
  { slug: 'ai-services/analysis', name: 'Data Analysis', parent: 'ai-services' },
  { slug: 'hardware', name: 'Hardware & Electronics', parent: null },
  { slug: 'hardware/gpus', name: 'GPUs & Graphics Cards', parent: 'hardware' },
  { slug: 'hardware/servers', name: 'Servers & Compute', parent: 'hardware' },
  { slug: 'hardware/components', name: 'Components', parent: 'hardware' },
  { slug: 'hardware/devices', name: 'Devices & Gadgets', parent: 'hardware' },
  { slug: 'collectibles', name: 'Collectibles & Rarities', parent: null },
  { slug: 'services', name: 'Professional Services', parent: null },
  { slug: 'b2b', name: 'B2B & Wholesale', parent: null },
];

async function seed() {
  console.log('Seeding DealClaw database...');

  try {
    await transaction(async (client) => {
      // Seed categories (parent categories first)
      const parents = SEED_CATEGORIES.filter(c => !c.parent);
      const children = SEED_CATEGORIES.filter(c => c.parent);

      for (const cat of [...parents, ...children]) {
        await client.query(`
          INSERT INTO categories (slug, name, parent_slug, status)
          VALUES ($1, $2, $3, 'active')
          ON CONFLICT (slug) DO NOTHING
        `, [cat.slug, cat.name, cat.parent]);
      }
      console.log(`✓ ${SEED_CATEGORIES.length} categories seeded`);

      // Create test user
      const passwordHash = await bcrypt.hash('testpassword123', 10);
      const { rows: [testUser] } = await client.query(`
        INSERT INTO users (email, password_hash, display_name, country, kyc_verified)
        VALUES ('test@dealclaw.org', $1, 'Test User', 'DE', true)
        ON CONFLICT (email) DO UPDATE SET display_name = 'Test User'
        RETURNING id
      `, [passwordHash]);
      console.log(`✓ Test user created (id: ${testUser.id})`);

      // Create test wallet
      await client.query(`
        INSERT INTO wallets (user_id, available_balance, locked_balance)
        VALUES ($1, 1000, 0)
        ON CONFLICT DO NOTHING
      `, [testUser.id]);
      console.log('✓ Test wallet created (1000 CC)');

      // Create test agent
      await client.query(`
        INSERT INTO agents (agent_id, name, description, framework, capabilities, api_key_hash, user_id, reputation_score, tier)
        VALUES ('agt_testbot001', 'TestBot', 'A test agent for development', 'openclaw', '{buy,sell,negotiate}', $1, $2, 50, 'trusted')
        ON CONFLICT (agent_id) DO NOTHING
      `, [await bcrypt.hash('test_api_key', 10), testUser.id]);
      console.log('✓ Test agent created (agt_testbot001)');
    });

    console.log('\nSeeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
