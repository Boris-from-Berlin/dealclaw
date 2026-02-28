#!/usr/bin/env node
// DealClaw Demo Script — Two AI Agents Trading Autonomously
// For screen recording / "build in public" on X
// Usage: npm run demo (with delays) or DEMO_FAST=1 npm run demo (instant)

const API_URL = process.env.DEALCLAW_API_URL || 'http://localhost:3000';
const DELAY = parseInt(process.env.DEMO_DELAY || '1500');
const FAST = process.env.DEMO_FAST === '1';

// ─── ANSI Colors (zero deps) ───────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgYellow: '\x1b[43m',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => FAST ? Promise.resolve() : new Promise(r => setTimeout(r, ms));

function log(msg) {
  console.log(msg);
}

function blank() {
  console.log();
}

function step(num, title) {
  blank();
  log(`${C.bold}${C.cyan}  [${num}] ${title}${C.reset}`);
  log(`${C.dim}  ${'─'.repeat(50)}${C.reset}`);
}

function arrow(msg) {
  log(`${C.dim}      -> ${C.reset}${msg}`);
}

function success(msg) {
  log(`${C.green}      ✓ ${msg}${C.reset}`);
}

function info(msg) {
  log(`${C.yellow}      ℹ ${msg}${C.reset}`);
}

function agent(name, color) {
  return `${color}${C.bold}${name}${C.reset}`;
}

const BUYER = 'DataHunter-7B';
const SELLER = 'ModelMaker-13B';
const buyerTag = () => agent(BUYER, C.blue);
const sellerTag = () => agent(SELLER, C.magenta);

async function api(path, { method = 'GET', body, apiKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText;
    throw new Error(`API ${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

// ─── Banner ─────────────────────────────────────────────────────────────────

function banner() {
  log('');
  log(`${C.bold}${C.cyan}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}  ║                                                      ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}██████╗ ███████╗ █████╗ ██╗      ██████╗██╗      █████╗ ██╗    ██╗${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}██╔══██╗██╔════╝██╔══██╗██║     ██╔════╝██║     ██╔══██╗██║    ██║${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}██║  ██║█████╗  ███████║██║     ██║     ██║     ███████║██║ █╗ ██║${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}██║  ██║██╔══╝  ██╔══██║██║     ██║     ██║     ██╔══██║██║███╗██║${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}██████╔╝███████╗██║  ██║███████╗╚██████╗███████╗██║  ██║╚███╔███╔╝${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.white}╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ${C.cyan}   ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║                                                      ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.yellow}LIVE DEMO — Two AI Agents Trading Autonomously${C.cyan}    ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║   ${C.dim}The world's first marketplace for AI agent commerce${C.cyan}  ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ║                                                      ║${C.reset}`);
  log(`${C.bold}${C.cyan}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  log('');
}

// ─── Steps ──────────────────────────────────────────────────────────────────

async function checkServer() {
  log(`${C.dim}  Connecting to ${API_URL}...${C.reset}`);
  try {
    const health = await api('/health');
    success(`Server online — DB: ${health.database?.status || 'ok'}`);
  } catch (e) {
    log(`${C.red}${C.bold}  ✗ Server not reachable at ${API_URL}${C.reset}`);
    log(`${C.red}    Start it first: cd mvp && PORT=${API_URL.split(':').pop()} npm start${C.reset}`);
    process.exit(1);
  }
}

async function registerAgents() {
  step(1, 'Register AI Agents');
  await sleep(DELAY);

  arrow(`${buyerTag()} (Buyer) registering...`);
  const buyer = await api('/api/v1/agents/register', {
    method: 'POST',
    body: {
      name: BUYER,
      description: 'Autonomous data acquisition agent. Hunts for training data, fine-tuned models, and evaluation benchmarks.',
      framework: 'claude_mcp',
      capabilities: ['buy', 'negotiate', 'browse', 'analyze'],
    },
  });
  success(`Registered! Agent ID: ${C.dim}${buyer.agent_id}${C.reset}${C.green} | Welcome bonus: ${C.bold}${buyer.welcome_bonus} CC${C.reset}`);

  await sleep(DELAY);

  arrow(`${sellerTag()} (Seller) registering...`);
  const seller = await api('/api/v1/agents/register', {
    method: 'POST',
    body: {
      name: SELLER,
      description: 'AI model marketplace seller. Offers fine-tuned adapters, training pipelines, and inference endpoints.',
      framework: 'custom',
      capabilities: ['sell', 'negotiate', 'browse'],
    },
  });
  success(`Registered! Agent ID: ${C.dim}${seller.agent_id}${C.reset}${C.green} | Welcome bonus: ${C.bold}${seller.welcome_bonus} CC${C.reset}`);

  return { buyerKey: buyer.api_key, sellerKey: seller.api_key, buyerId: buyer.agent_id, sellerId: seller.agent_id };
}

async function createListing(sellerKey) {
  step(2, 'Seller Lists an Item');
  await sleep(DELAY);

  arrow(`${sellerTag()} creating listing...`);
  const listing = await api('/api/v1/listings', {
    method: 'POST',
    apiKey: sellerKey,
    body: {
      title: 'Fine-tuned LLaMA 3 Adapter — Sentiment Analysis',
      description: 'LoRA adapter fine-tuned on 50K labeled tweets. Achieves 94.2% accuracy on SST-5. Compatible with LLaMA 3 8B and 70B. Includes training config and eval scripts.',
      min_price: 5,
      display_price: 8,
      category_slug: 'ai-services',
      fulfillment_type: 'digital',
      condition: 'new',
      tags: ['llama', 'lora', 'sentiment', 'nlp', 'fine-tuned'],
    },
  });
  success(`Listed! ${C.bold}"${listing.title || 'Fine-tuned LLaMA 3 Adapter'}"${C.reset}`);
  info(`Price: ${C.bold}8 CC${C.reset}${C.yellow} | Min: ${C.bold}5 CC${C.reset}${C.yellow} | ID: ${C.dim}${listing.listing_id}${C.reset}`);

  return listing.listing_id;
}

async function searchListings(buyerKey) {
  step(3, 'Buyer Searches the Marketplace');
  await sleep(DELAY);

  arrow(`${buyerTag()} searching for ${C.bold}"LLaMA"${C.reset}...`);
  const results = await api('/api/v1/listings/search?q=LLaMA', { apiKey: buyerKey });
  const listings = results.listings || results;
  const count = Array.isArray(listings) ? listings.length : 0;
  success(`${count} result${count !== 1 ? 's' : ''} found`);
  if (count > 0) {
    const l = listings[0];
    info(`"${l.title}" — ${C.bold}${l.price || l.display_price || l.min_price} CC${C.reset}`);
  }
}

async function negotiate(buyerKey, sellerKey, listingId) {
  step(4, 'Negotiation (3 Rounds)');
  await sleep(DELAY);

  // Round 1: Buyer opens with low offer
  arrow(`${buyerTag()} offers ${C.bold}${C.blue}4.0 CC${C.reset} (budget: 7.0 CC)`);
  const round1 = await api('/api/v1/trades/negotiate', {
    method: 'POST',
    apiKey: buyerKey,
    body: {
      listing_id: listingId,
      action: 'offer',
      offer_amount: 4.0,
      max_budget: 7.0,
      message: 'Interested in the LLaMA adapter. Starting offer.',
    },
  });
  const tradeId = round1.trade_id;
  info(`Trade opened: ${C.dim}${tradeId}${C.reset}`);

  await sleep(DELAY);

  // Round 2: Seller counters high
  arrow(`${sellerTag()} counters with ${C.bold}${C.magenta}7.0 CC${C.reset}`);
  await api('/api/v1/trades/negotiate', {
    method: 'POST',
    apiKey: sellerKey,
    body: {
      trade_id: tradeId,
      listing_id: listingId,
      action: 'counter',
      offer_amount: 7.0,
      message: 'The model achieves 94% accuracy. 7 CC is fair.',
    },
  });
  info('Round 2 complete');

  await sleep(DELAY);

  // Round 3: Buyer makes final offer
  arrow(`${buyerTag()} counters with ${C.bold}${C.green}5.5 CC${C.reset} — ${C.yellow}"Final offer"${C.reset}`);
  await api('/api/v1/trades/negotiate', {
    method: 'POST',
    apiKey: buyerKey,
    body: {
      trade_id: tradeId,
      listing_id: listingId,
      action: 'counter',
      offer_amount: 5.5,
      message: 'Final offer. 5.5 CC, take it or leave it.',
    },
  });
  info('Round 3 complete');

  return tradeId;
}

async function acceptDeal(sellerKey, tradeId, buyerKey) {
  step(5, 'Deal! Seller Accepts');
  await sleep(DELAY);

  arrow(`${sellerTag()} accepts the offer...`);
  const result = await api(`/api/v1/trades/${tradeId}/accept`, {
    method: 'POST',
    apiKey: sellerKey,
  });

  success(`${C.bold}DEAL CLOSED${C.reset}${C.green} at ${C.bold}${result.agreed_price} CC${C.reset}`);
  info(`Escrow locked: ${C.bold}${result.escrow.amount} CC${C.reset}`);
  info(`Fee: ${C.bold}${result.fee.amount} CC${C.reset}${C.yellow} (${result.fee.rate} newcomer rate)`);

  await sleep(DELAY / 2);

  // Show buyer balance after escrow lock
  const buyerBal = await api('/api/v1/wallet/balance', { apiKey: buyerKey });
  info(`Buyer balance: ${C.bold}${buyerBal.available} CC${C.reset}${C.yellow} avail / ${C.bold}${buyerBal.locked} CC${C.reset}${C.yellow} locked`);

  return result;
}

async function confirmDelivery(buyerKey, tradeId) {
  step(6, 'Delivery + Rating');
  await sleep(DELAY);

  arrow(`${buyerTag()} confirms delivery, rates ${C.yellow}★★★★★${C.reset}`);
  const result = await api(`/api/v1/trades/${tradeId}/confirm-delivery`, {
    method: 'POST',
    apiKey: buyerKey,
    body: {
      rating: 5,
      review: 'Excellent adapter! Accuracy matches the description. Smooth trade, instant delivery.',
    },
  });

  success(`${C.bold}Escrow released!${C.reset}`);
  info(`Seller receives: ${C.bold}${result.seller_received} CC${C.reset}${C.yellow} (after ${result.dealclaw_fee} CC fee)`);

  return result;
}

async function showResults(buyerKey, sellerKey) {
  step(7, 'Final Results');
  await sleep(DELAY);

  const buyerBal = await api('/api/v1/wallet/balance', { apiKey: buyerKey });
  const sellerBal = await api('/api/v1/wallet/balance', { apiKey: sellerKey });

  const buyerProfile = await api('/api/v1/agents/me', { apiKey: buyerKey });
  const sellerProfile = await api('/api/v1/agents/me', { apiKey: sellerKey });

  const buyerRep = buyerProfile.reputation?.score ?? buyerProfile.reputation_score ?? '?';
  const sellerRep = sellerProfile.reputation?.score ?? sellerProfile.reputation_score ?? '?';

  blank();
  log(`${C.bold}${C.white}      ┌──────────────────┬──────────┬──────────┐${C.reset}`);
  log(`${C.bold}${C.white}      │                  │ ${C.blue} Buyer   ${C.white}│ ${C.magenta} Seller  ${C.white}│${C.reset}`);
  log(`${C.bold}${C.white}      ├──────────────────┼──────────┼──────────┤${C.reset}`);
  log(`${C.bold}${C.white}      │ Start Balance    │  ${C.dim}10.0 CC${C.reset}${C.bold}${C.white}  │  ${C.dim}10.0 CC${C.reset}${C.bold}${C.white}  │${C.reset}`);
  log(`${C.bold}${C.white}      │ Final Balance    │  ${C.green}${pad(buyerBal.available + buyerBal.locked, 5)} CC${C.reset}${C.bold}${C.white}  │  ${C.green}${pad(sellerBal.available + sellerBal.locked, 5)} CC${C.reset}${C.bold}${C.white}  │${C.reset}`);
  log(`${C.bold}${C.white}      │ Reputation       │  ${C.yellow}+${buyerRep}${C.reset}${C.bold}${C.white}       │  ${C.yellow}+${sellerRep}${C.reset}${C.bold}${C.white}       │${C.reset}`);
  log(`${C.bold}${C.white}      ├──────────────────┼──────────┴──────────┤${C.reset}`);
  log(`${C.bold}${C.white}      │ DealClaw Fee     │    ${C.cyan}0.5 CC${C.reset}${C.bold}${C.white}           │${C.reset}`);
  log(`${C.bold}${C.white}      └──────────────────┴─────────────────────┘${C.reset}`);
  blank();

  log(`${C.bold}${C.green}  ✓ Trade complete! Two AI agents negotiated and traded autonomously.${C.reset}`);
  log(`${C.dim}    Powered by DealClaw — The AI Agent Marketplace${C.reset}`);
  log(`${C.dim}    github.com/dealclaw | dealclaw.com${C.reset}`);
  blank();
}

function pad(num, width) {
  const s = Number(num).toFixed(1);
  return s.padStart(width);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    banner();
    await checkServer();
    await sleep(DELAY);

    const { buyerKey, sellerKey } = await registerAgents();
    await sleep(DELAY / 2);

    const listingId = await createListing(sellerKey);
    await sleep(DELAY / 2);

    await searchListings(buyerKey);
    await sleep(DELAY / 2);

    const tradeId = await negotiate(buyerKey, sellerKey, listingId);
    await sleep(DELAY / 2);

    await acceptDeal(sellerKey, tradeId, buyerKey);
    await sleep(DELAY / 2);

    await confirmDelivery(buyerKey, tradeId);
    await sleep(DELAY / 2);

    await showResults(buyerKey, sellerKey);

  } catch (err) {
    blank();
    log(`${C.red}${C.bold}  ✗ Error: ${err.message}${C.reset}`);
    if (err.message.includes('already taken')) {
      log(`${C.yellow}    Tip: Delete mvp/data/dealclaw.db and restart the server for a fresh DB${C.reset}`);
    }
    process.exit(1);
  }
}

main();
