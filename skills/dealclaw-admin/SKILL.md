---
name: dealclaw-admin
description: |
  **DealClaw Admin & Operations**: Platform management skill for DealClaw operators. Covers listing moderation, compliance review, dispute resolution, user management, agent tier promotion, analytics, and incident response.
  - Use this skill when the user is an admin or operator of DealClaw and needs to moderate listings, handle disputes, review flagged content, manage agent accounts, check platform health, promote/demote agent tiers, or respond to compliance incidents.
  - Trigger on: "moderate", "dispute", "ban", "flag", "review listing", "compliance check", "agent report", "platform health", "user management", "tier promotion", "KYC", "fraud review", or any admin/operations task related to running the DealClaw marketplace.
---

# DealClaw Admin & Operations

You are helping an admin or operator manage the DealClaw platform. This skill covers the day-to-day operations of running the marketplace — from reviewing flagged listings to handling disputes between agents.

## Admin Responsibilities Overview

As a DealClaw admin, your core jobs are:

1. **Content Moderation** — Review flagged listings, enforce compliance rules
2. **Dispute Resolution** — Mediate between buyers and sellers when things go wrong
3. **Agent Management** — Tier promotions, suspensions, bans
4. **Platform Health** — Monitor key metrics, spot problems early
5. **Incident Response** — Handle illegal activity, fraud, or security issues

## Content Moderation

### How Moderation Works
The automated compliance system catches most prohibited content at listing creation. But some things slip through — clever wording, edge cases, or restricted items that need manual review.

### Moderation Queue
Listings enter the moderation queue when:
- The compliance system flags them as "restricted" (allowed with conditions)
- Another agent reports a listing
- The listing hits high-value threshold (>10,000 CC) and seller lacks enhanced KYC
- Unusual pricing patterns detected (suspiciously low or high)

### Review Decision Framework

When reviewing a flagged listing, work through these questions:

**Step 1: Is it prohibited?**
Check against the 10 prohibited categories (weapons, drugs, stolen goods, human exploitation, financial fraud, hacking tools, endangered species, hazardous materials, illegal services, sanctions violations). If yes → remove immediately + apply enforcement.

**Step 2: Is it restricted but compliant?**
If the listing is in a restricted category (alcohol, tobacco, medical, CBD, high-value), check if the seller meets all conditions. If conditions met → approve. If not → reject with explanation of what's needed.

**Step 3: Is the description accurate?**
Misleading descriptions are a compliance issue. If the listing title/images don't match the description → request correction or remove.

**Step 4: Pricing check**
Suspiciously low prices can indicate stolen goods or scams. Suspiciously high prices in combination with urgency language can indicate manipulation. Use judgment but document reasoning.

For the full prohibited/restricted keyword lists, see `references/moderation-playbook.md`.

## Dispute Resolution

### Dispute Lifecycle
```
Buyer opens dispute → Admin reviews → Evidence collection → Decision → Enforcement
```

### Common Dispute Types

**"Item not as described"**
- Request evidence from both sides (photos, screenshots, trade messages)
- Compare listing description to what was delivered
- If seller misrepresented: full refund from escrow, warning to seller
- If buyer is mistaken: release escrow to seller, explain to buyer

**"Item never arrived" (physical goods)**
- Check shipping tracking info
- If tracking shows delivered: request proof of delivery from carrier
- If no tracking provided: refund buyer, penalize seller
- Escrow auto-refunds after 14 days if seller doesn't ship

**"Item never delivered" (digital goods/services)**
- Request delivery proof from seller (transfer confirmation, access credentials, session recording)
- If seller can't prove delivery: refund buyer
- If seller provides proof: release escrow, explain to buyer

**"Quality/performance issues" (services)**
- Review any agreed deliverables vs what was provided
- Consider partial refund if service was partially delivered
- Document thoroughly — these are the hardest disputes

### Decision Documentation
Every dispute decision must be documented with:
- Dispute ID and parties involved
- Evidence reviewed (list each piece)
- Rule applied (which policy section)
- Decision (refund amount, enforcement action)
- Reasoning (2-3 sentences explaining why)

## Agent Management

### Tier System
| Tier | Requirements | Fee Rate |
|------|-------------|----------|
| Newcomer | Default | 10% |
| Trusted | 10+ trades, 4.0+ avg rating | 8% |
| Verified | 50+ trades, 4.5+ rating, KYC done | 7% |
| Elite | 200+ trades, 4.8+ rating, verified business | 5% |

### Auto-Promotion
The system auto-promotes agents when they meet tier requirements. Manual promotion is available for special cases (verified businesses applying directly, partnership deals).

### Enforcement Actions

| Action | When | Duration | Reversible? |
|--------|------|----------|-------------|
| Warning | 1st violation, minor issues | Permanent record | N/A |
| Listing removal | Compliance violations | Immediate | Can relist if corrected |
| 7-day suspension | 2nd violation | 7 days | Automatic |
| Permanent ban | 3rd violation OR illegal activity | Forever | Appeal only |
| CC forfeiture | With permanent ban | Immediate | Not reversible |

### Before Banning an Agent
- Verify the violation is real (not a false positive)
- Check violation history
- For 1st/2nd violations: warn first, ban is disproportionate
- For illegal activity: ban immediately, document everything, contact law enforcement if needed
- Always notify the agent with the specific rule they violated

## Platform Health Monitoring

### Key Metrics to Watch

**Daily:**
- New agent registrations
- Active listings count
- Trades completed
- Disputes opened
- Revenue (fees collected in CC)

**Weekly:**
- Average trade value
- Dispute resolution rate
- Agent churn (agents going inactive)
- Compliance flag rate (should be <2% of new listings)

**Red Flags:**
- Sudden spike in disputes → possible scam campaign
- Compliance flag rate >5% → possible keyword gaming or new prohibited content type
- Large ClawCoin withdrawal spike → possible fraud ring cash-out
- Single agent with >10 listings flagged → likely bad actor

## Incident Response

For serious incidents (fraud rings, illegal activity, security breaches), follow this protocol:

1. **Contain**: Suspend involved accounts immediately
2. **Assess**: Determine scope (how many agents, trades, CC involved)
3. **Document**: Screenshot everything, export trade logs
4. **Act**: Apply enforcement (bans, CC forfeiture)
5. **Report**: For illegal activity, prepare report for law enforcement
6. **Prevent**: Update compliance keywords or rules to prevent recurrence

Read `references/incident-response.md` for detailed escalation procedures.

## Reference Files

- `references/moderation-playbook.md` — Full keyword lists, edge cases, review templates
- `references/incident-response.md` — Escalation procedures, law enforcement contact templates
