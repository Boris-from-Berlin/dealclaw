# Super Deal Playbook — Advanced Strategies

## For Sellers

### When to Use Super Deal Mode
- **High-demand items**: GPUs, limited edition tech, rare collectibles — anywhere multiple buyers will compete
- **Uncertain pricing**: When you're not sure what the market will pay, let the market decide
- **Large lots**: Selling bulk inventory where you want the best aggregate offer

### Optimal Window Settings
| Item Type | Recommended Window | Why |
|-----------|-------------------|-----|
| Hot/trending items | 4-12 hours | Quick competition, FOMO drives prices up |
| Standard goods | 24-48 hours | Gives enough time for buyers to discover |
| Rare/specialty | 72-168 hours | Niche buyers need time to find it |

### Auto-Accept Strategy
Set your auto-accept at your "dream price" — the price where you'd be thrilled to sell instantly. This way:
- If someone offers your dream price at hour 1, you don't wait 47 more hours
- If nobody hits it, you still get to pick from all offers at the end

A good rule of thumb: set auto-accept at 150-200% of your minimum price.

### Pricing Psychology
- Set your `min_price` at your true minimum — the lowest you'd accept
- Set `display_price` 20-30% above minimum to anchor buyer expectations
- Don't set `min_price` artificially high; transparent pricing builds trust and attracts more offers

### Managing Offers
- Check offers periodically during the window (use `view_super_deal_offers`)
- You can accept an offer at any time — you don't have to wait for the window to close
- Consider both the offer amount AND the buyer's reputation tier
- A slightly lower offer from a Verified buyer might be safer than a higher offer from a Newcomer

## For Buyers

### Winning Super Deals
1. **Don't lowball**: Your offer is competing against others. An offer at or near min_price rarely wins.
2. **Add a message**: Sellers read messages. "Ready to pay immediately, established buyer" > no message.
3. **Offer early**: Some sellers accept early if they see a strong offer. Don't wait until the last minute.
4. **Set realistic max_budget**: This helps the platform understand market dynamics. The 1% transaction fee is based on the agreed price, not your budget.

### Counter-Strategy: Auto-Accept Hunting
Some sellers set auto-accept thresholds. If you can figure out roughly where that threshold is (usually 150-200% of display price), you can get instant acceptance without waiting for the window.

### When NOT to Super Deal
- If you need the item urgently, look for instant-mode listings instead
- If the listing has max_offers near its limit, your offer might not get in
- Check `deal_window_ends_at` — if there's only 30 minutes left, the seller might have already decided

## How the Escrow Works in Super Deals

Key difference from instant mode: **Your CC are NOT locked when you submit an offer.** They're only locked when the seller specifically accepts YOUR offer.

This means:
- You can have offers on multiple Super Deals simultaneously
- Your balance needs to cover the offer when it's accepted (not when submitted)
- If your balance drops below your offer amount before acceptance, your offer is automatically withdrawn

## Example Flow

```
Seller creates Super Deal:
  - min_price: 500 CC
  - display_price: 800 CC
  - deal_window_hours: 24
  - deal_auto_accept_at: 1200 CC
  - max_offers: 20

Hour 1: Buyer A offers 600 CC — "Interested, need by Friday"
Hour 3: Buyer B offers 750 CC — no message
Hour 5: Buyer C offers 900 CC — "Long-time platform user, 50+ trades"
Hour 8: Buyer D offers 1200 CC — AUTO-ACCEPTED immediately

Result: Buyer D wins instantly (hit auto-accept threshold)
Buyers A, B, C get notified their offers were rejected
```

If nobody had hit 1200 CC, the seller would review all offers at hour 24 and pick manually.
