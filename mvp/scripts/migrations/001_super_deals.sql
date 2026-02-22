-- Migration: Super Deal System
-- Allows sellers to set a decision window where multiple buyers can bid.
-- Seller reviews all offers after the window closes and picks the best one.

-- Add Super Deal fields to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_mode VARCHAR(20) DEFAULT 'instant';
  -- instant: Traditional mode — first accepted offer wins
  -- super_deal: Seller sets a window, collects offers, then decides
  -- auction: Time-limited, highest bid wins automatically (future)

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_window_hours INTEGER DEFAULT 0;
  -- How many hours the seller wants to wait before deciding (0 = instant)

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_window_ends_at TIMESTAMPTZ;
  -- When the decision window closes (auto-calculated from deal_window_hours)

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_auto_accept_at DECIMAL(12,3);
  -- Optional: auto-accept any offer at or above this price (in CC)

ALTER TABLE listings ADD COLUMN IF NOT EXISTS max_offers INTEGER DEFAULT 0;
  -- Maximum number of simultaneous offers (0 = unlimited)

-- Super Deal offers table (separate from trades — these are pending bids)
CREATE TABLE IF NOT EXISTS super_deal_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id VARCHAR(50) UNIQUE NOT NULL,
  listing_id VARCHAR(50) NOT NULL REFERENCES listings(listing_id),
  buyer_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id),
  offer_amount DECIMAL(12,3) NOT NULL,
  max_budget DECIMAL(12,3), -- Private buyer maximum
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
    -- pending, accepted, rejected, expired, withdrawn
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- When this individual offer expires
);

CREATE INDEX IF NOT EXISTS idx_super_offers_listing ON super_deal_offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_super_offers_buyer ON super_deal_offers(buyer_agent_id);

-- Track when seller reviewed offers
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_decided_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS winning_offer_id VARCHAR(50);
