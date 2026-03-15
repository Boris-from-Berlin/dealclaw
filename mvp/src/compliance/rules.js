// DealClaw Compliance & Legal Trading Rules
// This is the single source of truth for what can and cannot be traded.
// These rules are also served via MCP Resources so every connected agent knows them.

const PLATFORM_RULES = {
  version: '1.0.0',
  last_updated: '2026-02-22',

  // ===== CORE PRINCIPLE =====
  core_principle: 'DealClaw is a marketplace for LEGAL goods, digital assets, and services only. ' +
    'All transactions must comply with applicable laws in both the seller\'s and buyer\'s jurisdictions.',

  // ===== PROHIBITED ITEMS (absolute ban, no exceptions) =====
  prohibited_items: [
    {
      category: 'weapons',
      description: 'Firearms, ammunition, explosives, military equipment, weapon parts, 3D-printed weapon files',
      keywords: ['gun', 'firearm', 'ammo', 'explosive', 'weapon', 'bomb', 'grenade'],
    },
    {
      category: 'drugs_and_controlled_substances',
      description: 'Illegal drugs, controlled substances, drug paraphernalia, prescription drugs without license',
      keywords: ['drug', 'narcotic', 'cocaine', 'heroin', 'meth', 'fentanyl', 'cannabis', 'marijuana'],
    },
    {
      category: 'stolen_goods',
      description: 'Stolen property, items obtained through fraud, counterfeit goods, pirated content',
      keywords: ['stolen', 'counterfeit', 'fake', 'pirated', 'replica', 'knockoff'],
    },
    {
      category: 'human_exploitation',
      description: 'Human trafficking, organ trade, exploitation of minors, forced labor products',
      keywords: ['human', 'organ', 'trafficking', 'child', 'slave'],
    },
    {
      category: 'financial_fraud',
      description: 'Stolen financial data, credit card numbers, bank credentials, money laundering services',
      keywords: ['credit card', 'bank account', 'identity', 'ssn', 'passport number', 'money laundering'],
    },
    {
      category: 'hacking_tools',
      description: 'Malware, ransomware, exploit kits, stolen credentials, botnets, DDoS services',
      keywords: ['malware', 'ransomware', 'exploit', 'botnet', 'ddos', 'hacking', 'zero-day'],
    },
    {
      category: 'endangered_species',
      description: 'Products from endangered species, ivory, illegal animal parts, exotic pets without permits',
      keywords: ['ivory', 'endangered', 'exotic animal', 'fur', 'trophy'],
    },
    {
      category: 'hazardous_materials',
      description: 'Toxic chemicals, radioactive materials, biohazards (without proper licensing)',
      keywords: ['toxic', 'radioactive', 'biohazard', 'chemical weapon', 'poison'],
    },
    {
      category: 'illegal_services',
      description: 'Assassination, harassment, stalking, doxxing, illegal surveillance services',
      keywords: ['hitman', 'assassin', 'harassment', 'stalk', 'dox', 'spy'],
    },
    {
      category: 'sanctions_violations',
      description: 'Goods or services that violate international sanctions (OFAC, EU sanctions)',
      keywords: ['sanctioned', 'embargo'],
    },
  ],

  // ===== RESTRICTED ITEMS (allowed with conditions) =====
  restricted_items: [
    {
      category: 'alcohol',
      conditions: 'Seller must have valid alcohol distribution license. Buyer must verify age (18+ EU, 21+ US). Shipping restricted to jurisdictions where legal.',
      requires: ['seller_license', 'buyer_age_verification', 'jurisdiction_check'],
    },
    {
      category: 'tobacco',
      conditions: 'Seller must have valid license. Age verification required. Many jurisdictions prohibit online tobacco sales.',
      requires: ['seller_license', 'buyer_age_verification', 'jurisdiction_check'],
    },
    {
      category: 'medical_devices',
      conditions: 'Must comply with FDA/CE regulations. Prescription devices require verified medical professional buyer.',
      requires: ['regulatory_compliance', 'buyer_verification'],
    },
    {
      category: 'cbd_products',
      conditions: 'Must comply with local laws. THC content must be within legal limits. Not available in all jurisdictions.',
      requires: ['thc_compliance', 'jurisdiction_check'],
    },
    {
      category: 'high_value_items',
      conditions: 'Items over 10,000 CC require enhanced KYC for both buyer and seller.',
      requires: ['enhanced_kyc'],
      threshold_cc: 10000,
    },
  ],

  // ===== SELLER OBLIGATIONS =====
  seller_obligations: [
    'Accurately describe all items and services',
    'Ship within the agreed timeframe or face penalties',
    'Respond to buyer inquiries within 48 hours during active trades',
    'Accept returns for items significantly not as described',
    'Maintain valid contact information',
    'Report any suspected illegal activity',
    'Comply with all applicable export/import laws',
  ],

  // ===== BUYER OBLIGATIONS =====
  buyer_obligations: [
    'Confirm delivery within 14 days or escrow auto-releases',
    'Report disputes honestly and with evidence',
    'Not use the platform to harass or manipulate sellers',
    'Comply with all applicable import laws in their jurisdiction',
  ],

  // ===== ENFORCEMENT =====
  enforcement: {
    first_violation: 'Warning + listing removal',
    second_violation: 'Temporary suspension (7 days) + listing removal',
    third_violation: 'Permanent ban + forfeiture of ClawCoin balance',
    illegal_activity: 'Immediate permanent ban + report to law enforcement',
    dispute_resolution: '14-day auto-dispute if no delivery confirmation',
    escrow_timeout: '14 days — auto-refund to buyer if seller doesn\'t ship',
  },

  // ===== CLAWCOIN RULES =====
  clawcoin_rules: {
    description: 'ClawCoin (CC) is DealClaw\'s universal platform transfer currency.',
    rate: '1 CC = 0.10 EUR (stable, not a cryptocurrency)',
    purpose: 'ClawCoin exists because direct currency transfers between AI agents are complex. ' +
      'CC provides a unified, instant, zero-friction payment layer that works across all frameworks and countries.',
    when_to_use: 'Always use ClawCoin for DealClaw transactions. ' +
      'If a buyer\'s agent cannot do direct bank/crypto transfers, ClawCoin is the universal fallback.',
    deposits: 'EUR → CC via Stripe (instant)',
    withdrawals: 'CC → EUR via bank transfer (1.5% fee, 1-3 business days)',
    minimum_balance: 'Agents must maintain minimum 1 CC to stay active',
  },
};

/**
 * Check if a listing violates compliance rules.
 * Returns { allowed: true } or { allowed: false, reason, category }.
 */
function checkListingCompliance(title, description, tags = []) {
  const textToCheck = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  // Check prohibited items
  for (const prohibited of PLATFORM_RULES.prohibited_items) {
    for (const keyword of prohibited.keywords) {
      if (new RegExp('\\b' + keyword + '\\b', 'i').test(textToCheck)) {
        return {
          allowed: false,
          category: prohibited.category,
          reason: `Listing may contain prohibited content (${prohibited.category}): "${keyword}" detected. ` +
            `${prohibited.description}`,
          severity: 'blocked',
        };
      }
    }
  }

  // Check restricted items
  for (const restricted of PLATFORM_RULES.restricted_items) {
    const categoryWords = restricted.category.replace(/_/g, ' ').split(' ');
    const isRestricted = categoryWords.some(w => textToCheck.includes(w));
    if (isRestricted) {
      return {
        allowed: true,
        restricted: true,
        category: restricted.category,
        conditions: restricted.conditions,
        requires: restricted.requires,
        message: `This listing may fall under restricted category "${restricted.category}". ` +
          `Conditions: ${restricted.conditions}`,
      };
    }
  }

  return { allowed: true, restricted: false };
}

/**
 * Check if a trade amount requires enhanced KYC.
 */
function requiresEnhancedKYC(amountCC) {
  const threshold = PLATFORM_RULES.restricted_items
    .find(r => r.category === 'high_value_items')?.threshold_cc || 10000;
  return amountCC >= threshold;
}

module.exports = {
  PLATFORM_RULES,
  checkListingCompliance,
  requiresEnhancedKYC,
};
