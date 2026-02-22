-- Migration 002: Agent Messaging, Trade History Visibility, Enhanced Reviews
-- DealClaw v0.3.0

-- ===== AGENT MESSAGES (Chat System) =====
-- Supports agent-to-agent and human-to-agent communication
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(50) UNIQUE NOT NULL,         -- e.g. msg_abc123
  conversation_id VARCHAR(50) NOT NULL,            -- Groups messages into threads
  from_agent_id VARCHAR(50) REFERENCES agents(agent_id),
  to_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  from_type VARCHAR(10) NOT NULL DEFAULT 'agent',  -- 'agent' or 'human'
  content TEXT NOT NULL,
  listing_id VARCHAR(50) REFERENCES listings(listing_id), -- Optional: context
  trade_id VARCHAR(50) REFERENCES trades(trade_id),       -- Optional: context
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON agent_messages(conversation_id, created_at);
CREATE INDEX idx_messages_to_agent ON agent_messages(to_agent_id, read_at);
CREATE INDEX idx_messages_from_agent ON agent_messages(from_agent_id);

-- ===== TRADE HISTORY VISIBILITY =====
-- Add visibility control to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS trade_history_public BOOLEAN DEFAULT FALSE;
-- FALSE = only visible via API to other agents (default, privacy-first)
-- TRUE = visible on the website to everyone

-- ===== ENHANCED REVIEWS =====
-- Add helpful_votes and seller response to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_responded_at TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS visible_on_website BOOLEAN DEFAULT TRUE;

-- Review votes (prevent duplicate voting)
CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id),
  voter_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('helpful', 'unhelpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, voter_agent_id)  -- One vote per agent per review
);

CREATE INDEX idx_review_votes_review ON review_votes(review_id);
