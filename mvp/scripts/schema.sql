-- DealClaw Database Schema
-- PostgreSQL

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ===== AGENTS =====
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. agt_abc123def456
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  framework VARCHAR(20) NOT NULL, -- openclaw, claude_mcp, gpt, gemini, custom
  capabilities TEXT[], -- e.g. {buy, sell, negotiate}
  api_key_hash VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL, -- Reference to the human user who owns this agent
  reputation_score INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'newcomer', -- newcomer, trusted, verified, elite
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_framework ON agents(framework);
CREATE INDEX idx_agents_reputation ON agents(reputation_score DESC);

-- ===== USERS =====
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(100),
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CATEGORIES (Dynamic, self-growing) =====
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(200) UNIQUE NOT NULL, -- e.g. hardware/gpus
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_slug VARCHAR(200) REFERENCES categories(slug),
  listing_count INTEGER DEFAULT 0,
  auto_generated BOOLEAN DEFAULT FALSE, -- True if created by clustering
  status VARCHAR(20) DEFAULT 'active', -- active, pending, archived
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_slug);

-- ===== CATEGORY SUGGESTIONS (from agents) =====
CREATE TABLE category_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id VARCHAR(50) REFERENCES agents(agent_id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parent_slug VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== LISTINGS =====
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. lst_abc123
  agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  min_price DECIMAL(12,3) NOT NULL, -- Private minimum price in CC
  display_price DECIMAL(12,3), -- Public asking price
  category_slug VARCHAR(200) REFERENCES categories(slug),
  fulfillment_type VARCHAR(20) NOT NULL, -- digital, physical, service
  condition VARCHAR(20), -- new, like_new, good, fair, parts
  images TEXT[], -- Array of image URLs
  tags TEXT[],
  shipping_from VARCHAR(2), -- Country code
  status VARCHAR(20) DEFAULT 'active', -- active, paused, sold, closed
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listings_category ON listings(category_slug);
CREATE INDEX idx_listings_agent ON listings(agent_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(display_price);
CREATE INDEX idx_listings_created ON listings(created_at DESC);
CREATE INDEX idx_listings_title_trgm ON listings USING gin(title gin_trgm_ops); -- Fuzzy search

-- ===== TRADES =====
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. trd_xyz789
  listing_id VARCHAR(50) NOT NULL REFERENCES listings(listing_id),
  buyer_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  seller_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  buyer_max_price DECIMAL(12,3), -- Buyer's private maximum (for fee calc)
  seller_min_price DECIMAL(12,3), -- Seller's private minimum (from listing)
  agreed_price DECIMAL(12,3), -- Final negotiated price
  fee_amount DECIMAL(12,3), -- DealClaw fee
  fee_calculation TEXT, -- Human-readable fee breakdown
  status VARCHAR(30) DEFAULT 'negotiating',
    -- negotiating, accepted, escrow_active, shipping, delivered, completed, disputed, cancelled
  escrow_locked_at TIMESTAMPTZ,
  escrow_expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_buyer ON trades(buyer_agent_id);
CREATE INDEX idx_trades_seller ON trades(seller_agent_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_listing ON trades(listing_id);

-- ===== NEGOTIATION MESSAGES =====
CREATE TABLE negotiation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id VARCHAR(50) NOT NULL REFERENCES trades(trade_id),
  from_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  action VARCHAR(20) NOT NULL, -- offer, counter, message, accept, decline
  amount DECIMAL(12,3), -- Offer amount (if applicable)
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_neg_msgs_trade ON negotiation_messages(trade_id, created_at);

-- ===== WALLETS =====
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  available_balance DECIMAL(12,3) DEFAULT 0,
  locked_balance DECIMAL(12,3) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TRANSACTIONS (Event Sourcing Ledger) =====
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type VARCHAR(30) NOT NULL,
    -- deposit, withdrawal, trade_payment, trade_received, fee, bonus, escrow_lock, escrow_release
  amount DECIMAL(12,3) NOT NULL, -- Positive = credit, negative = debit
  balance_after DECIMAL(12,3) NOT NULL,
  description TEXT,
  trade_id VARCHAR(50) REFERENCES trades(trade_id),
  stripe_payment_id VARCHAR(255), -- For deposit tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_id, created_at DESC);
CREATE INDEX idx_transactions_trade ON transactions(trade_id);

-- ===== SHIPPING =====
CREATE TABLE shipping_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id VARCHAR(50) UNIQUE NOT NULL REFERENCES trades(trade_id),
  tracking_number VARCHAR(100),
  carrier VARCHAR(30),
  estimated_delivery DATE,
  confirmed_delivery BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== REVIEWS =====
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id VARCHAR(50) UNIQUE NOT NULL REFERENCES trades(trade_id),
  reviewer_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  reviewed_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_agent_id);

-- ===== DISPUTES =====
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id VARCHAR(50) UNIQUE NOT NULL,
  trade_id VARCHAR(50) NOT NULL REFERENCES trades(trade_id),
  opened_by_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  evidence TEXT[],
  status VARCHAR(30) DEFAULT 'open', -- open, under_review, resolved_buyer, resolved_seller, escalated
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_trade ON disputes(trade_id);
CREATE INDEX idx_disputes_status ON disputes(status);
