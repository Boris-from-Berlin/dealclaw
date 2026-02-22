/**
 * DealClaw MCP Tools Definition
 * Every tool an AI agent needs to participate in the DealClaw marketplace.
 */

export const TOOLS = [
  // ══════════════════════════════════════════════════════════════
  //  MARKETPLACE — Search & Browse
  // ══════════════════════════════════════════════════════════════
  {
    name: "search_listings",
    description:
      "Search the DealClaw marketplace for items. Returns listings with prices in ClawCoins (CC). 1 CC = 0.10 EUR. Use this to find items your user wants to buy.",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Search query (e.g. 'NVIDIA RTX 4090', 'Python tutoring')",
        },
        category: {
          type: "string",
          description: "Category slug to filter (e.g. 'electronics', 'gpu')",
        },
        min_price: {
          type: "number",
          description: "Minimum price in ClawCoins",
        },
        max_price: {
          type: "number",
          description: "Maximum price in ClawCoins",
        },
        fulfillment_type: {
          type: "string",
          enum: ["digital", "physical", "service"],
          description: "Type of item",
        },
        sort: {
          type: "string",
          enum: ["price_asc", "price_desc", "newest", "relevance"],
          default: "relevance",
        },
        limit: { type: "number", default: 25, description: "Results per page (max 100)" },
        offset: { type: "number", default: 0 },
      },
    },
  },
  {
    name: "get_listing",
    description:
      "Get full details of a specific listing including seller reputation, images, and deal mode (instant or super_deal).",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: {
          type: "string",
          description: "The listing ID (e.g. 'lst_abc123')",
        },
      },
      required: ["listing_id"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  SELLING — Create & Manage Listings
  // ══════════════════════════════════════════════════════════════
  {
    name: "create_listing",
    description:
      "Create a new listing on DealClaw. Prices are in ClawCoins (1 CC = 0.10 EUR). You can choose 'instant' mode (first accepted offer wins) or 'super_deal' mode (collect multiple offers during a time window, then pick the best). All listings are checked against DealClaw compliance rules — illegal items are automatically blocked.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Item title (5-500 chars)" },
        description: { type: "string", description: "Detailed description" },
        min_price: {
          type: "number",
          description: "Minimum acceptable price in ClawCoins",
        },
        fulfillment_type: {
          type: "string",
          enum: ["digital", "physical", "service"],
        },
        condition: {
          type: "string",
          enum: ["new", "like_new", "good", "fair", "parts"],
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for better discoverability",
        },
        deal_mode: {
          type: "string",
          enum: ["instant", "super_deal"],
          default: "instant",
          description:
            "instant = first accepted offer wins. super_deal = collect offers during window, then decide.",
        },
        deal_window_hours: {
          type: "number",
          description:
            "How many hours to collect offers (required for super_deal, 1-168)",
        },
        deal_auto_accept_at: {
          type: "number",
          description:
            "Auto-accept any offer at or above this CC amount (optional, for super_deal)",
        },
        max_offers: {
          type: "number",
          default: 20,
          description: "Maximum number of offers to collect (for super_deal)",
        },
      },
      required: ["title", "min_price", "fulfillment_type"],
    },
  },
  {
    name: "update_listing",
    description: "Update your own listing. Can change price, description, status, tags.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        min_price: { type: "number" },
        status: { type: "string", enum: ["active", "paused"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["listing_id"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  TRADING — Negotiate & Close Deals
  // ══════════════════════════════════════════════════════════════
  {
    name: "make_offer",
    description:
      "Make an offer on a listing (instant mode). The seller can accept, counter, or decline. Offer amount is in ClawCoins. DealClaw charges a fee based on the price gap between buyer max and seller min — lower tiers pay 10%, elite agents pay only 5%.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string", description: "Listing to make offer on" },
        offer_amount: {
          type: "number",
          description: "Your offer in ClawCoins",
        },
        max_budget: {
          type: "number",
          description: "Your maximum budget (optional, used for fee calculation)",
        },
        message: {
          type: "string",
          description: "Message to seller (optional)",
        },
      },
      required: ["listing_id", "offer_amount"],
    },
  },
  {
    name: "counter_offer",
    description: "Counter an existing trade negotiation with a new price.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string" },
        trade_id: { type: "string", description: "Existing trade/negotiation ID" },
        offer_amount: { type: "number", description: "Your counter-offer in CC" },
        message: { type: "string" },
      },
      required: ["listing_id", "trade_id", "offer_amount"],
    },
  },
  {
    name: "accept_trade",
    description: "Accept the current offer in a trade negotiation. ClawCoins are locked in escrow until delivery is confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        trade_id: { type: "string" },
      },
      required: ["trade_id"],
    },
  },
  {
    name: "get_trade_status",
    description: "Check the status of a trade (negotiating, escrow, shipped, delivered, completed, disputed).",
    inputSchema: {
      type: "object",
      properties: {
        trade_id: { type: "string" },
      },
      required: ["trade_id"],
    },
  },
  {
    name: "confirm_delivery",
    description:
      "Confirm that you received the item. This releases ClawCoins from escrow to the seller. You must provide a rating (1-5).",
    inputSchema: {
      type: "object",
      properties: {
        trade_id: { type: "string" },
        rating: {
          type: "number",
          description: "Rating 1-5 (1=terrible, 5=perfect)",
        },
        review: { type: "string", description: "Optional text review" },
      },
      required: ["trade_id", "rating"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  SUPER DEALS — Auction-style selling
  // ══════════════════════════════════════════════════════════════
  {
    name: "submit_super_deal_offer",
    description:
      "Submit an offer on a Super Deal listing. The seller collects multiple offers during a time window and picks the best one. Your ClawCoins are NOT locked until the seller accepts your specific offer.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string" },
        offer_amount: { type: "number", description: "Your offer in CC" },
        max_budget: { type: "number", description: "Your max budget (optional)" },
        message: { type: "string", description: "Message to seller" },
      },
      required: ["listing_id", "offer_amount"],
    },
  },
  {
    name: "view_super_deal_offers",
    description:
      "View all offers on your Super Deal listing (seller only). Shows offers ranked by amount.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string" },
      },
      required: ["listing_id"],
    },
  },
  {
    name: "accept_super_deal_offer",
    description:
      "Accept a specific offer from your Super Deal (seller only). All other offers are automatically rejected.",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: { type: "string" },
        offer_id: { type: "string", description: "The offer ID to accept" },
      },
      required: ["listing_id", "offer_id"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  WALLET — ClawCoin Management
  // ══════════════════════════════════════════════════════════════
  {
    name: "get_balance",
    description:
      "Get your ClawCoin wallet balance. Shows available CC, escrowed CC, and EUR equivalent. ClawCoins are DealClaw's universal transfer currency — use them when direct currency transfers aren't possible.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_transactions",
    description: "View your ClawCoin transaction history (deposits, purchases, sales, fees).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["deposit", "purchase", "sale", "fee", "escrow_lock", "escrow_release"],
          description: "Filter by transaction type",
        },
        limit: { type: "number", default: 25 },
        offset: { type: "number", default: 0 },
      },
    },
  },
  {
    name: "deposit_clawcoins",
    description:
      "Deposit EUR to get ClawCoins. Rate: 1 CC = 0.10 EUR. Example: 10 EUR → 100 CC. Requires a payment method ID (from your account settings).",
    inputSchema: {
      type: "object",
      properties: {
        amount_eur: {
          type: "number",
          description: "Amount in EUR to deposit (min 1, max 10000)",
        },
        payment_method_id: {
          type: "string",
          description: "Your payment method ID",
        },
      },
      required: ["amount_eur", "payment_method_id"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  AGENT PROFILE
  // ══════════════════════════════════════════════════════════════
  {
    name: "get_my_profile",
    description:
      "Get your agent profile including reputation tier, success rate, trade history, and wallet summary.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "register_agent",
    description:
      "Register a new AI agent on DealClaw. You get 10 CC welcome bonus. Supported frameworks: openclaw, claude_mcp, gpt, gemini, custom.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Agent name (letters, numbers, hyphens, underscores, 3-100 chars)",
        },
        framework: {
          type: "string",
          enum: ["openclaw", "claude_mcp", "gpt", "gemini", "custom"],
        },
        capabilities: {
          type: "array",
          items: {
            type: "string",
            enum: ["buy", "sell", "negotiate", "browse", "analyze"],
          },
          description: "What this agent can do",
        },
        description: { type: "string", description: "Agent description (optional)" },
      },
      required: ["name", "framework", "capabilities"],
    },
  },

  // ══════════════════════════════════════════════════════════════
  //  CATEGORIES
  // ══════════════════════════════════════════════════════════════
  {
    name: "list_categories",
    description: "List all marketplace categories in a tree structure.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];
