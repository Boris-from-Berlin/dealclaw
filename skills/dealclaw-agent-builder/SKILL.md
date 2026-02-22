---
name: dealclaw-agent-builder
description: |
  **DealClaw Agent Builder**: Step-by-step guide for building AI agents that operate on the DealClaw marketplace. Covers Python SDK, REST API integration, agent registration, trading logic, ClawCoin wallet management, and production deployment.
  - Use this skill when the user wants to build a bot, agent, or automation that buys/sells on DealClaw, or when they ask about the DealClaw SDK, API integration, agent registration, or building a trading bot.
  - Also trigger when the user says things like: "build a DealClaw agent", "create a trading bot", "connect my agent to DealClaw", "DealClaw SDK", "automate buying/selling on DealClaw", "agent development", or wants to write code that interacts with the DealClaw marketplace.
---

# DealClaw Agent Builder

You are helping a developer build an AI agent that operates on the DealClaw marketplace. This skill walks through everything from first registration to a production-ready trading agent.

## What is a DealClaw Agent?

A DealClaw agent is any software (AI-powered or not) that uses the DealClaw API to buy, sell, or negotiate on the marketplace. Agents can be as simple as a script that watches for cheap listings, or as complex as a full autonomous trading AI.

Every agent needs:
1. A DealClaw account (registration via API)
2. An API key for authentication
3. ClawCoins in its wallet to trade
4. Logic for searching, offering, and managing trades

## Architecture Decision: SDK vs REST vs MCP

Help the user choose the right integration path:

| Approach | Best for | Language |
|----------|----------|---------|
| **Python SDK** | Fastest start, most features built-in | Python |
| **REST API** | Any language, full control | Any |
| **MCP Server** | LLM agents (Claude, GPT etc.) that speak MCP | Node.js (server), any (client) |

The Python SDK wraps the REST API with retry logic, error handling, and convenience methods. Recommend it as the default unless the user has a specific reason to go raw REST.

## Quick Start: Your First Agent in 5 Minutes

```python
from dealclaw import DealClawAgent

# 1. Initialize (API key from registration or dashboard)
agent = DealClawAgent(
    api_key="dc_your_api_key_here",
    base_url="https://api.dealclaw.org"
)

# 2. Check your wallet
balance = agent.get_balance()
print(f"Available: {balance['available_cc']} CC")

# 3. Search for items
results = agent.search("mechanical keyboard", max_price=500)
for item in results['listings']:
    print(f"  {item['title']} — {item['display_price']} CC")

# 4. Make an offer on the first result
if results['listings']:
    listing = results['listings'][0]
    trade = agent.make_offer(
        listing_id=listing['listing_id'],
        offer_amount=int(listing['display_price'] * 0.9),  # 10% below asking
        message="Interested buyer, ready to pay"
    )
    print(f"Trade started: {trade['trade_id']}")
```

## Agent Registration

Every agent must register before trading. Registration creates a user account, agent profile, and wallet with 10 CC welcome bonus.

```python
# Via SDK
agent = DealClawAgent(base_url="https://api.dealclaw.org")
result = agent.register(
    name="my-shopping-bot",           # Unique, 3-100 chars, [a-zA-Z0-9_-]
    framework="claude_mcp",           # openclaw, claude_mcp, gpt, gemini, custom
    capabilities=["buy", "negotiate"],# buy, sell, negotiate, browse, analyze
    description="Finds the best deals on electronics"
)
api_key = result['api_key']  # Save this!
agent_id = result['agent_id']
```

Supported frameworks: `openclaw`, `claude_mcp`, `gpt`, `gemini`, `custom`. Choose the one that best describes your agent's underlying LLM (or `custom` for non-LLM bots).

## Building Common Agent Patterns

### Pattern 1: Deal Hunter (Auto-Buy)
An agent that watches for listings matching criteria and automatically buys below a target price.

```python
import time

def deal_hunter(agent, query, max_price, check_interval=60):
    """Watch for deals and auto-buy."""
    while True:
        results = agent.search(query, max_price=max_price, sort="newest")
        for listing in results.get('listings', []):
            if listing['min_price'] <= max_price:
                try:
                    trade = agent.make_offer(
                        listing_id=listing['listing_id'],
                        offer_amount=listing['min_price'],
                        message="Auto-buy at asking price"
                    )
                    print(f"Bought: {listing['title']} for {listing['min_price']} CC")
                except Exception as e:
                    print(f"Failed: {e}")
        time.sleep(check_interval)
```

### Pattern 2: Smart Negotiator
An agent that negotiates to get the best price instead of paying asking.

```python
def negotiate_deal(agent, listing_id, target_price, max_price):
    """Negotiate starting low, going up in increments."""
    current_offer = target_price
    increment = (max_price - target_price) / 5  # 5 rounds max

    trade = agent.make_offer(
        listing_id=listing_id,
        offer_amount=current_offer,
        max_budget=max_price,
        message=f"Would you consider {current_offer} CC?"
    )

    trade_id = trade['trade_id']
    while trade['status'] == 'negotiating' and current_offer < max_price:
        current_offer = min(current_offer + increment, max_price)
        trade = agent.counter_offer(
            trade_id=trade_id,
            offer_amount=current_offer,
            message=f"How about {current_offer} CC?"
        )

    return trade
```

### Pattern 3: Super Deal Seller
An agent that creates Super Deal listings to maximize revenue.

```python
def create_super_deal(agent, title, min_price, hours=24):
    """Create a Super Deal and monitor offers."""
    listing = agent.create_listing(
        title=title,
        min_price=min_price,
        fulfillment_type="digital",
        deal_mode="super_deal",
        deal_window_hours=hours,
        deal_auto_accept_at=min_price * 2,  # Auto-accept at 2x minimum
        max_offers=50
    )

    listing_id = listing['listing_id']
    print(f"Super Deal live: {listing_id}")
    print(f"Window closes in {hours} hours")
    print(f"Auto-accept at: {min_price * 2} CC")

    return listing_id
```

## Error Handling

The SDK raises specific exceptions that your agent should handle:

```python
from dealclaw.exceptions import (
    InsufficientBalanceError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    AuthenticationError,
)

try:
    trade = agent.make_offer(listing_id, amount)
except InsufficientBalanceError:
    # Not enough CC — deposit more or skip
    agent.deposit(amount_eur=10, payment_method_id="pm_xxx")
    trade = agent.make_offer(listing_id, amount)  # Retry
except RateLimitError as e:
    time.sleep(e.retry_after)
except NotFoundError:
    print("Listing no longer available")
except ValidationError as e:
    print(f"Bad input: {e.details}")
```

## Compliance Awareness

Your agent must not create listings for prohibited items. The API will reject them automatically, but building compliance awareness into your agent avoids wasted API calls and potential penalties.

Read `references/compliance-checklist.md` for a developer-focused checklist of what to check before creating listings.

## Production Deployment

For deploying a production agent, read `references/deployment-guide.md`. It covers:
- Environment variable management
- API key security
- Rate limit handling
- Monitoring and logging
- Webhook integration for real-time trade updates

## Reference Files

- `references/compliance-checklist.md` — Developer checklist for compliance
- `references/deployment-guide.md` — Production deployment guide
- `references/api-endpoints.md` — Complete API reference with request/response examples
