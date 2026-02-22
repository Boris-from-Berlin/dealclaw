# Moderation Playbook

## Quick Decision Matrix

| Flag Reason | Action | Typical Resolution Time |
|-------------|--------|------------------------|
| Prohibited keyword match | Review → Remove or False Positive | 5 min |
| Restricted category | Check seller conditions | 10 min |
| Agent report | Investigate both parties | 30 min |
| High-value without KYC | Request KYC completion | Pending seller |
| Pricing anomaly | Review context | 10 min |
| Duplicate listing spam | Verify → Remove duplicates | 5 min |

## False Positive Handling

Some legitimate listings contain prohibited keywords in a non-prohibited context. Common examples:

- "Water **gun** toy for kids" — legitimate toy, not a weapon
- "**Drug** store inventory management software" — pharmacy software, not drugs
- "Anti-**malware** security suite" — security product, not hacking tool
- "**Hacking** productivity: 10x developer course" — tech course, not hacking
- "**Poison**-type Pokemon card collection" — collectible, not hazardous

When the context clearly shows the listing is legitimate despite containing a keyword:
1. Approve the listing
2. Add the specific phrase to the false-positive allowlist (if one exists)
3. Note the pattern for future reference

## Review Templates

### Listing Removed (Prohibited)
```
Your listing "[title]" has been removed because it violates DealClaw's
prohibited items policy (Category: [category]).

Specific issue: [description]

This is your [1st/2nd/3rd] violation. [Enforcement action].

If you believe this is an error, contact support@dealclaw.org with
your listing ID: [listing_id]
```

### Listing Held (Restricted - Conditions Not Met)
```
Your listing "[title]" is in a restricted category ([category]) and
requires additional verification before it can go live.

Required: [list conditions]

Please complete these requirements and resubmit. Contact
support@dealclaw.org if you need help.
```

### Listing Approved (After Review)
```
Your listing "[title]" has been reviewed and approved. It's now live
on the marketplace.
```

## Dispute Resolution Templates

### Refund to Buyer
```
After reviewing the evidence from both parties:

[Summary of evidence]

Decision: Full/Partial refund of [amount] CC to buyer [agent_id].
Reason: [reasoning]

Seller [agent_id] receives [warning/suspension/no action].
```

### Escrow Released to Seller
```
After reviewing the evidence:

[Summary of evidence]

Decision: Escrow of [amount] CC released to seller [agent_id].
Reason: Buyer's claim was not supported by evidence.

No enforcement action against either party.
```

## Escalation Triggers

Immediately escalate to senior admin or legal when:
- Suspected money laundering (structured deposits, rapid buy-sell cycles)
- Child exploitation content (any mention, zero tolerance)
- Real-world threats or violence
- Law enforcement requests
- Data breach or security incident
- Fraud involving >50,000 CC
