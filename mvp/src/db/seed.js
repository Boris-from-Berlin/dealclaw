#!/usr/bin/env node
// Database seeder for DealClaw (SQLite)
// Seeds initial categories and a test user/agent for development
// Usage: node src/db/seed.js

require('dotenv').config();
const { query, transaction } = require('./index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  console.log('Seeding DealClaw database (SQLite)...');

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
      console.log(`  ${SEED_CATEGORIES.length} categories seeded`);

      // Create test user
      const passwordHash = await bcrypt.hash('testpassword123', 10);
      const { rows: [testUser] } = await client.query(`
        INSERT INTO users (email, password_hash, display_name, country, kyc_verified)
        VALUES ('test@dealclaw.org', $1, 'Test User', 'DE', 1)
        ON CONFLICT (email) DO UPDATE SET display_name = 'Test User'
        RETURNING id
      `, [passwordHash]);
      console.log(`  Test user created (id: ${testUser.id})`);

      // Create test wallet with 1000 CC
      await client.query(`
        INSERT INTO wallets (user_id, available_balance, locked_balance)
        VALUES ($1, 1000, 0)
        ON CONFLICT (user_id) DO NOTHING
      `, [testUser.id]);
      console.log('  Test wallet created (1000 CC)');

      // Create test agent with a known API key
      const agentId = 'agt_testbot001';
      const jwtSecret = process.env.JWT_SECRET || 'dealclaw-dev-secret';
      const token = jwt.sign({ agent_id: agentId, name: 'TestBot', framework: 'openclaw' }, jwtSecret, { expiresIn: '365d' });
      const apiKey = `dealclaw_${token}`;
      const apiKeyHash = await bcrypt.hash(apiKey, 10);

      await client.query(`
        INSERT INTO agents (agent_id, name, description, framework, capabilities, api_key_hash, user_id, reputation_score, tier)
        VALUES ($1, 'TestBot', 'A test agent for development', 'openclaw', $2, $3, $4, 50, 'trusted')
        ON CONFLICT (agent_id) DO NOTHING
      `, [agentId, JSON.stringify(['buy', 'sell', 'negotiate']), apiKeyHash, testUser.id]);
      console.log(`  Test agent created (${agentId})`);
      console.log(`  Test API key: ${apiKey.slice(0, 30)}...`);

      // Seed some test listings
      const listings = [
        { id: 'lst_demo_gpu01', title: 'NVIDIA RTX 4090 24GB', desc: 'High-end GPU, barely used. Original packaging.', price: 870, cat: 'hardware/gpus', condition: 'like_new', tags: ['gpu', 'nvidia', 'rtx4090'] },
        { id: 'lst_demo_mac01', title: 'MacBook Pro M3 Max 16"', desc: 'Top-spec with 36GB RAM, 1TB SSD. Pristine.', price: 1800, cat: 'hardware/devices', condition: 'like_new', tags: ['laptop', 'apple', 'macbook'] },
        { id: 'lst_demo_api01', title: 'GPT-4 API Credits (1M tokens)', desc: 'Unused OpenAI API credits, transferable.', price: 250, cat: 'digital-goods/software', condition: 'new', tags: ['api', 'openai', 'gpt4'], fulfillment: 'digital' },
        { id: 'lst_demo_srv01', title: 'Code Review Service (10h)', desc: 'Senior dev code review. Python, TypeScript, Rust.', price: 150, cat: 'ai-services/code-review', condition: 'new', tags: ['code-review', 'consulting'], fulfillment: 'service' },
        { id: 'lst_demo_dat01', title: 'EU E-Commerce Dataset 2025', desc: '500K product listings with prices and descriptions.', price: 95, cat: 'digital-goods/datasets', condition: 'new', tags: ['dataset', 'ecommerce', 'europe'], fulfillment: 'digital' },
      ];

      for (const l of listings) {
        await client.query(`
          INSERT INTO listings (listing_id, agent_id, title, description, min_price, display_price,
                                category_slug, fulfillment_type, condition, tags, status)
          VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, 'active')
          ON CONFLICT (listing_id) DO NOTHING
        `, [l.id, agentId, l.title, l.desc, l.price, l.cat, l.fulfillment || 'physical', l.condition, JSON.stringify(l.tags)]);
      }
      console.log(`  ${listings.length} test listings seeded`);

      // Update category listing counts
      for (const l of listings) {
        await client.query('UPDATE categories SET listing_count = listing_count + 1 WHERE slug = $1', [l.cat]);
      }
    });

    console.log('\nSeeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seed();
