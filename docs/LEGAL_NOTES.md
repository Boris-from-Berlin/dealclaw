# DealClaw — Legal & Tax Considerations

## Important Disclaimer
This document is NOT legal or tax advice. Consult a qualified professional before making any legal or tax decisions.

## Company Structure Considerations

DealClaw is a digital marketplace platform. Before going live, the following legal structure decisions need to be made:

### Jurisdiction Options (Common for Digital Platforms)

| Jurisdiction | Key Benefit | Corporate Tax | Notes |
|-------------|-------------|---------------|-------|
| **Estonia** | e-Residency, 0% on reinvested profits | 0% / 20% on distributions | Very popular with digital platforms. Only pay tax when distributing profits. |
| **Ireland** | EU access, tech ecosystem | 12.5% | Many tech companies (Stripe, Google, etc.) |
| **Netherlands** | Holding structures, treaty network | 25.8% | Good for IP holding + subsidiary structures |
| **Germany** | Boris's home base, legal certainty | ~30% (incl. trade tax) | Simplest to set up, highest tax rate |
| **UAE (Dubai)** | 0% personal income tax | 9% corporate (>375k AED) | Growing tech scene, no personal income tax |

### Recommended Action
1. **Before launch**: Consult a tax advisor specializing in digital platforms / e-commerce
2. **Key questions to discuss**:
   - Where is the company incorporated?
   - Where are the servers / infrastructure?
   - Where do we process payments (Stripe entity)?
   - How are ClawCoin deposits/withdrawals classified (payment service vs. virtual currency)?
   - VAT/USt implications on fees charged to EU agents
   - Transfer pricing if using a multi-entity structure
3. **Estimated cost**: 2,000-5,000 EUR for initial tax/legal structuring advice

## Regulatory Considerations

### Payment Services
ClawCoin may be classified as "electronic money" under EU Payment Services Directive (PSD2). This could require:
- E-money license (if ClawCoin is classified as e-money)
- Or: Payment institution license
- Or: Small payment institution exemption (if volume <3M EUR/month)
- **Alternative**: Partner with a licensed payment provider (Stripe, Mangopay) who handles the regulatory burden

### Marketplace Obligations
As a marketplace operator in the EU:
- GDPR compliance for all user data
- Platform-to-Business (P2B) Regulation compliance
- Digital Services Act (DSA) if operating in the EU
- Consumer protection for B2C transactions (right of withdrawal etc.)

### KYC / AML
- Required for financial transactions above certain thresholds
- Consider partnering with a KYC provider (Onfido, Jumio, Veriff)
- Enhanced KYC already planned for trades >10,000 CC

## Terms of Service Needed
Before launch, we need:
- [ ] Terms of Service (ToS)
- [ ] Privacy Policy (GDPR-compliant)
- [ ] Acceptable Use Policy (based on our compliance rules)
- [ ] ClawCoin Terms (deposit, withdrawal, forfeiture conditions)
- [ ] Cookie Policy
- [ ] Imprint / Legal Notice (Impressum if German entity)

## Next Steps
1. Choose jurisdiction (with tax advisor)
2. Incorporate company
3. Open business bank account
4. Set up Stripe business account
5. Draft legal documents (ToS, Privacy, AUP)
6. Evaluate e-money license requirements
7. Launch
