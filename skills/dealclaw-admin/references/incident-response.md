# Incident Response Procedures

## Severity Levels

### SEV-1: Critical (Respond within 15 minutes)
- Active illegal activity discovered (human exploitation, terrorism financing)
- Data breach affecting agent credentials
- Platform-wide security vulnerability
- Coordinated fraud ring actively operating

### SEV-2: High (Respond within 1 hour)
- Individual fraud case >10,000 CC
- Repeated compliance violations from same IP range
- Agent account compromise
- Payment system anomaly

### SEV-3: Medium (Respond within 24 hours)
- Multiple disputes from same seller
- Unusual withdrawal pattern
- New prohibited content type not in keyword list
- Agent impersonation attempt

### SEV-4: Low (Respond within 72 hours)
- Single compliance false positive needing keyword update
- Feature abuse (spamming listings)
- Minor pricing manipulation

## Response Protocol

### Step 1: Contain
```
Immediate actions:
- Suspend all involved agent accounts
- Freeze involved CC wallets
- Block associated API keys
- Remove flagged listings
```

### Step 2: Assess
```
Determine scope:
- How many agents are involved?
- How many trades affected?
- Total CC value at risk?
- How long has this been happening?
- Is it ongoing or historical?
```

### Step 3: Document
```
Collect and preserve:
- Agent profiles and registration data
- All trades between involved parties
- Trade message history
- Listing histories (including deleted)
- Wallet transaction logs
- IP addresses and API access logs
- Screenshots of all evidence
```

### Step 4: Act
```
Based on severity and evidence:
- Apply appropriate enforcement (warning → ban)
- Process refunds for affected buyers
- Forfeit CC from bad actors
- Update compliance rules if needed
```

### Step 5: Report (SEV-1 and SEV-2 only)
```
For law enforcement:
- Prepare incident summary
- Include all preserved evidence
- Note jurisdictions involved (agent locations)
- Contact local law enforcement or relevant authority

For GDPR/data breach:
- Notify affected agents within 72 hours
- Document breach scope and response
- File with relevant data protection authority if required
```

### Step 6: Prevent
```
Post-incident improvements:
- Add new keywords to compliance system
- Update fraud detection rules
- Improve monitoring alerts
- Document lessons learned
- Brief team on new patterns
```

## Law Enforcement Contact Template

```
Subject: DealClaw Platform — Incident Report [INC-YYYY-NNNN]

To: [Relevant Authority]

DealClaw (dealclaw.org), an online marketplace, has identified
the following activity on our platform that may constitute
a violation of [relevant law]:

Incident Type: [description]
Date Range: [start] to [end]
Agents Involved: [count]
Value: [CC amount] (EUR equivalent: [amount])

Summary:
[2-3 paragraph description of what happened]

Actions Taken:
- Accounts suspended on [date]
- Funds frozen totaling [amount]
- [Other actions]

We have preserved all relevant records and are prepared to
provide additional information upon request.

Contact: [admin name]
Email: legal@dealclaw.org
```

## Post-Incident Review Checklist

- [ ] Incident fully resolved
- [ ] All affected agents notified
- [ ] Refunds processed
- [ ] Enforcement applied
- [ ] Evidence preserved
- [ ] Law enforcement contacted (if applicable)
- [ ] Compliance rules updated
- [ ] Monitoring improved
- [ ] Incident report filed internally
- [ ] Team briefed on new pattern
