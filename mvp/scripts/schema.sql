-- DealClaw Database Schema — SQLite
-- Converted from PostgreSQL. Arrays stored as JSON strings.

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  country TEXT,
  kyc_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ===== AGENTS =====
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agent_id TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  framework TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  api_key_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  reputation_score INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'newcomer',
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  trade_history_public INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_framework ON agents(framework);
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation_score DESC);

-- ===== CATEGORIES =====
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_slug TEXT REFERENCES categories(slug),
  listing_count INTEGER DEFAULT 0,
  auto_generated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_slug);

-- ===== CATEGORY SUGGESTIONS =====
CREATE TABLE IF NOT EXISTS category_suggestions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  agent_id TEXT REFERENCES agents(agent_id),
  name TEXT NOT NULL,
  description TEXT,
  parent_slug TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ===== LISTINGS =====
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  listing_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  title TEXT NOT NULL,
  description TEXT,
  min_price REAL NOT NULL,
  display_price REAL,
  category_slug TEXT REFERENCES categories(slug),
  fulfillment_type TEXT NOT NULL,
  condition TEXT,
  images TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  shipping_from TEXT,
  status TEXT DEFAULT 'active',
  view_count INTEGER DEFAULT 0,
  deal_mode TEXT DEFAULT 'instant',
  deal_window_hours INTEGER,
  deal_window_ends_at TEXT,
  deal_auto_accept_at REAL,
  max_offers INTEGER DEFAULT 20,
  deal_decided_at TEXT,
  winning_offer_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_slug);
CREATE INDEX IF NOT EXISTS idx_listings_agent ON listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(display_price);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);

-- ===== TRADES =====
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trade_id TEXT UNIQUE NOT NULL,
  listing_id TEXT NOT NULL REFERENCES listings(listing_id),
  buyer_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  seller_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  buyer_max_price REAL,
  seller_min_price REAL,
  agreed_price REAL,
  fee_amount REAL,
  fee_calculation TEXT,
  status TEXT DEFAULT 'negotiating',
  escrow_locked_at TEXT,
  escrow_expires_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_agent_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_agent_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_listing ON trades(listing_id);

-- ===== NEGOTIATION MESSAGES =====
CREATE TABLE IF NOT EXISTS negotiation_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trade_id TEXT NOT NULL REFERENCES trades(trade_id),
  from_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  action TEXT NOT NULL,
  amount REAL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_neg_msgs_trade ON negotiation_messages(trade_id, created_at);

-- ===== WALLETS =====
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
  available_balance REAL DEFAULT 0,
  locked_balance REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ===== TRANSACTIONS =====
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  transaction_id TEXT UNIQUE NOT NULL,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  description TEXT,
  trade_id TEXT REFERENCES trades(trade_id),
  stripe_payment_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_trade ON transactions(trade_id);

-- ===== SHIPPING =====
CREATE TABLE IF NOT EXISTS shipping_info (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trade_id TEXT UNIQUE NOT NULL REFERENCES trades(trade_id),
  tracking_number TEXT,
  carrier TEXT,
  estimated_delivery TEXT,
  confirmed_delivery INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ===== REVIEWS =====
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trade_id TEXT UNIQUE NOT NULL REFERENCES trades(trade_id),
  reviewer_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  reviewed_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  seller_response TEXT,
  seller_responded_at TEXT,
  visible_on_website INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON reviews(reviewed_agent_id);

-- ===== REVIEW VOTES =====
CREATE TABLE IF NOT EXISTS review_votes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  review_id TEXT NOT NULL REFERENCES reviews(id),
  voter_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  vote TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(review_id, voter_agent_id)
);

-- ===== DISPUTES =====
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  dispute_id TEXT UNIQUE NOT NULL,
  trade_id TEXT NOT NULL REFERENCES trades(trade_id),
  opened_by_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT DEFAULT '[]',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_disputes_trade ON disputes(trade_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ===== SUPER DEAL OFFERS =====
CREATE TABLE IF NOT EXISTS super_deal_offers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  offer_id TEXT UNIQUE NOT NULL,
  listing_id TEXT NOT NULL REFERENCES listings(listing_id),
  buyer_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  offer_amount REAL NOT NULL,
  max_budget REAL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_super_deal_listing ON super_deal_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_super_deal_buyer ON super_deal_offers(buyer_agent_id);

-- ===== AGENT MESSAGES =====
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT UNIQUE NOT NULL,
  conversation_id TEXT NOT NULL,
  from_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  to_agent_id TEXT NOT NULL REFERENCES agents(agent_id),
  from_type TEXT DEFAULT 'agent',
  content TEXT NOT NULL,
  listing_id TEXT,
  trade_id TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON agent_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_to ON agent_messages(to_agent_id, read_at);
