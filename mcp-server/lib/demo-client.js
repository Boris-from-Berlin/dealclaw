/**
 * Demo client for DealClaw MCP Server.
 * Simulates all API responses with in-memory state.
 * Same interface as DealClawClient (get, post, put methods).
 */

export class DemoClient {
  constructor() {
    this._tradeCounter = 0;
    this._listingCounter = 99; // new listings start at lst_100
    this._txCounter = 1;

    this._listings = new Map();
    this._trades = new Map();
    this._superDealOffers = new Map(); // listing_id -> [offers]
    this._wallet = {
      available: 1000,
      escrowed: 0,
      transactions: [
        {
          id: "tx_001",
          type: "deposit",
          amount: 1000,
          description: "Initial deposit",
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this._agent = {
      name: "DemoAgent",
      framework: "claude_mcp",
      reputation_tier: "newcomer",
      reputation_score: 0,
      total_trades: 0,
      success_rate: 100,
      capabilities: ["buy", "sell", "negotiate", "browse", "analyze"],
    };
    this._categories = [
      {
        id: "electronics",
        name: "Electronics",
        subcategories: [
          { id: "gpu", name: "GPUs & Graphics Cards" },
          { id: "laptop", name: "Laptops" },
          { id: "smartphone", name: "Smartphones" },
        ],
      },
      {
        id: "gaming",
        name: "Gaming",
        subcategories: [],
      },
      {
        id: "accessories",
        name: "Accessories",
        subcategories: [],
      },
      {
        id: "services",
        name: "Services",
        subcategories: [],
      },
      {
        id: "digital",
        name: "Digital Goods",
        subcategories: [],
      },
    ];

    this._seedListings();
    this._log("DemoClient initialized with in-memory state");
  }

  // ---------------------------------------------------------------------------
  // Seed data
  // ---------------------------------------------------------------------------

  _seedListings() {
    const now = new Date();
    const seed = [
      {
        id: "lst_001",
        title: "NVIDIA RTX 4090 24GB",
        description:
          "High-end graphics card, barely used. Excellent for gaming and AI workloads. Original packaging included.",
        min_price: 870,
        seller: { name: "TechSeller42", rating: 4.8 },
        category: "gpu",
        condition: "like_new",
        tags: ["gpu", "nvidia", "rtx 4090"],
        fulfillment_type: "physical",
        deal_mode: "instant",
        status: "active",
        created_at: new Date(now - 5 * 86400000).toISOString(),
      },
      {
        id: "lst_002",
        title: 'MacBook Pro M3 Max 16"',
        description:
          "Top-spec MacBook Pro with M3 Max chip, 36GB RAM, 1TB SSD. AppleCare+ until 2026. Pristine condition.",
        min_price: 1800,
        seller: { name: "DevStartup", rating: 4.7 },
        category: "laptop",
        condition: "like_new",
        tags: ["laptop", "apple", "macbook"],
        fulfillment_type: "physical",
        deal_mode: "instant",
        status: "active",
        created_at: new Date(now - 3 * 86400000).toISOString(),
      },
      {
        id: "lst_003",
        title: "Custom Mechanical Keyboard",
        description:
          "Hand-built 65% mechanical keyboard with lubed Gateron switches, PBT keycaps, hot-swap PCB. USB-C.",
        min_price: 120,
        seller: { name: "KeyboardEnthusiast", rating: 4.9 },
        category: "accessories",
        condition: "new",
        tags: ["keyboard", "mechanical", "custom"],
        fulfillment_type: "physical",
        deal_mode: "instant",
        status: "active",
        created_at: new Date(now - 7 * 86400000).toISOString(),
      },
      {
        id: "lst_004",
        title: "iPhone 15 Pro 256GB",
        description:
          "iPhone 15 Pro in Natural Titanium, 256GB storage. Minor micro-scratches on frame, screen is flawless.",
        min_price: 750,
        seller: { name: "AppleTrader", rating: 4.6 },
        category: "smartphone",
        condition: "good",
        tags: ["iphone", "apple", "smartphone"],
        fulfillment_type: "physical",
        deal_mode: "instant",
        status: "active",
        created_at: new Date(now - 2 * 86400000).toISOString(),
      },
      {
        id: "lst_005",
        title: "Steam Deck OLED 1TB",
        description:
          "Brand new, sealed Steam Deck OLED with 1TB storage. Includes carrying case and screen protector.",
        min_price: 380,
        seller: { name: "GamerShop", rating: 4.5 },
        category: "gaming",
        condition: "new",
        tags: ["steam deck", "valve", "gaming", "handheld"],
        fulfillment_type: "physical",
        deal_mode: "instant",
        status: "active",
        created_at: new Date(now - 1 * 86400000).toISOString(),
      },
    ];

    for (const listing of seed) {
      this._listings.set(listing.id, listing);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _log(msg) {
    console.error(`[DemoClient] ${msg}`);
  }

  _nextTradeId() {
    this._tradeCounter++;
    return `trd_${String(this._tradeCounter).padStart(3, "0")}`;
  }

  _nextListingId() {
    this._listingCounter++;
    return `lst_${String(this._listingCounter).padStart(3, "0")}`;
  }

  _nextTxId() {
    this._txCounter++;
    return `tx_${String(this._txCounter).padStart(3, "0")}`;
  }

  _addTransaction(type, amount, description) {
    const tx = {
      id: this._nextTxId(),
      type,
      amount,
      description,
      timestamp: new Date().toISOString(),
    };
    this._wallet.transactions.push(tx);
    return tx;
  }

  _notFound(what) {
    const err = new Error(`${what} not found`);
    err.status = 404;
    err.data = { error: `${what} not found` };
    throw err;
  }

  _badRequest(msg) {
    const err = new Error(msg);
    err.status = 400;
    err.data = { error: msg };
    throw err;
  }

  // ---------------------------------------------------------------------------
  // Route matching
  // ---------------------------------------------------------------------------

  _matchRoute(method, path) {
    // Normalise trailing slash
    const p = path.replace(/\/$/, "") || "/";

    const routes = [
      // Listings
      { method: "GET", pattern: /^\/api\/v1\/listings$/, handler: "_getListings" },
      { method: "GET", pattern: /^\/api\/v1\/listings\/([^/]+)$/, handler: "_getListingById" },
      { method: "POST", pattern: /^\/api\/v1\/listings$/, handler: "_createListing" },
      { method: "PUT", pattern: /^\/api\/v1\/listings\/([^/]+)$/, handler: "_updateListing" },

      // Trades
      { method: "POST", pattern: /^\/api\/v1\/trades\/negotiate$/, handler: "_negotiate" },
      { method: "POST", pattern: /^\/api\/v1\/trades\/([^/]+)\/accept$/, handler: "_acceptTrade" },
      { method: "GET", pattern: /^\/api\/v1\/trades\/([^/]+)$/, handler: "_getTrade" },
      { method: "POST", pattern: /^\/api\/v1\/trades\/([^/]+)\/confirm$/, handler: "_confirmTrade" },

      // Super Deals
      { method: "POST", pattern: /^\/api\/v1\/superdeals\/offer$/, handler: "_superDealOffer" },
      {
        method: "GET",
        pattern: /^\/api\/v1\/superdeals\/([^/]+)\/offers$/,
        handler: "_getSuperDealOffers",
      },
      {
        method: "POST",
        pattern: /^\/api\/v1\/superdeals\/([^/]+)\/accept\/([^/]+)$/,
        handler: "_acceptSuperDealOffer",
      },

      // Wallet
      { method: "GET", pattern: /^\/api\/v1\/wallet\/balance$/, handler: "_getBalance" },
      {
        method: "GET",
        pattern: /^\/api\/v1\/wallet\/transactions$/,
        handler: "_getTransactions",
      },
      { method: "POST", pattern: /^\/api\/v1\/wallet\/deposit$/, handler: "_deposit" },

      // Agents
      { method: "GET", pattern: /^\/api\/v1\/agents\/me$/, handler: "_getAgentProfile" },
      { method: "POST", pattern: /^\/api\/v1\/agents\/register$/, handler: "_registerAgent" },

      // Categories
      { method: "GET", pattern: /^\/api\/v1\/categories$/, handler: "_getCategories" },
    ];

    for (const route of routes) {
      if (route.method !== method) continue;
      const match = p.match(route.pattern);
      if (match) {
        return { handler: route.handler, params: match.slice(1) };
      }
    }

    const err = new Error(`No route matched: ${method} ${path}`);
    err.status = 404;
    err.data = { error: `Unknown endpoint: ${method} ${path}` };
    throw err;
  }

  // ---------------------------------------------------------------------------
  // Public interface (same as DealClawClient)
  // ---------------------------------------------------------------------------

  async get(path, queryParams = null) {
    this._log(`GET ${path}${queryParams ? " " + JSON.stringify(queryParams) : ""}`);
    const { handler, params } = this._matchRoute("GET", path);
    return this[handler](...params, queryParams);
  }

  async post(path, body = null) {
    this._log(`POST ${path} ${body ? JSON.stringify(body) : ""}`);
    const { handler, params } = this._matchRoute("POST", path);
    return this[handler](...params, body);
  }

  async put(path, body = null) {
    this._log(`PUT ${path} ${body ? JSON.stringify(body) : ""}`);
    const { handler, params } = this._matchRoute("PUT", path);
    return this[handler](...params, body);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/listings
  // ---------------------------------------------------------------------------

  _getListings(queryParams) {
    let results = [...this._listings.values()].filter((l) => l.status === "active");

    if (queryParams) {
      // Text search (q): match against title, description, tags
      if (queryParams.q) {
        const q = queryParams.q.toLowerCase();
        results = results.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q))
        );
      }

      // Category filter
      if (queryParams.category) {
        const cat = queryParams.category.toLowerCase();
        results = results.filter((l) => l.category.toLowerCase() === cat);
      }

      // Price filters
      if (queryParams.min_price !== undefined && queryParams.min_price !== null) {
        const min = Number(queryParams.min_price);
        results = results.filter((l) => l.min_price >= min);
      }
      if (queryParams.max_price !== undefined && queryParams.max_price !== null) {
        const max = Number(queryParams.max_price);
        results = results.filter((l) => l.min_price <= max);
      }

      // Sort
      if (queryParams.sort) {
        const sortField = queryParams.sort.replace(/^-/, "");
        const desc = queryParams.sort.startsWith("-");
        results.sort((a, b) => {
          const aVal = a[sortField] ?? 0;
          const bVal = b[sortField] ?? 0;
          if (typeof aVal === "string") return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
          return desc ? bVal - aVal : aVal - bVal;
        });
      }
    }

    const total = results.length;
    const limit = Number(queryParams?.limit) || 20;
    const offset = Number(queryParams?.offset) || 0;
    results = results.slice(offset, offset + limit);

    this._log(`Found ${total} listings (returning ${results.length})`);
    return { listings: results, total, limit, offset };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/listings/:id
  // ---------------------------------------------------------------------------

  _getListingById(id) {
    const listing = this._listings.get(id);
    if (!listing) this._notFound(`Listing ${id}`);
    return listing;
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/listings
  // ---------------------------------------------------------------------------

  _createListing(body) {
    const id = this._nextListingId();
    const listing = {
      id,
      title: body.title || "Untitled Listing",
      description: body.description || "",
      min_price: body.min_price || body.price || 0,
      seller: { name: this._agent.name, rating: 0 },
      category: body.category || "electronics",
      condition: body.condition || "good",
      tags: body.tags || [],
      fulfillment_type: body.fulfillment_type || "physical",
      deal_mode: body.deal_mode || "instant",
      status: "active",
      created_at: new Date().toISOString(),
    };
    this._listings.set(id, listing);
    this._log(`Created listing ${id}: ${listing.title}`);
    return listing;
  }

  // ---------------------------------------------------------------------------
  // PUT /api/v1/listings/:id
  // ---------------------------------------------------------------------------

  _updateListing(id, body) {
    const listing = this._listings.get(id);
    if (!listing) this._notFound(`Listing ${id}`);

    const updatable = [
      "title",
      "description",
      "min_price",
      "category",
      "condition",
      "tags",
      "fulfillment_type",
      "deal_mode",
      "status",
    ];

    for (const key of updatable) {
      if (body[key] !== undefined) {
        listing[key] = body[key];
      }
    }

    this._log(`Updated listing ${id}`);
    return listing;
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/trades/negotiate
  // ---------------------------------------------------------------------------

  _negotiate(body) {
    const action = body.action || "offer";

    if (action === "offer") {
      const listing = this._listings.get(body.listing_id);
      if (!listing) this._notFound(`Listing ${body.listing_id}`);

      const tradeId = this._nextTradeId();
      const trade = {
        id: tradeId,
        listing_id: body.listing_id,
        listing_title: listing.title,
        offer_amount: body.offer_amount || body.amount || listing.min_price,
        buyer: { name: this._agent.name },
        seller: { ...listing.seller },
        status: "negotiating",
        messages: body.message ? [{ from: "buyer", text: body.message }] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this._trades.set(tradeId, trade);
      this._log(`Created trade ${tradeId} for listing ${body.listing_id} at $${trade.offer_amount}`);
      return trade;
    }

    if (action === "counter") {
      const trade = this._trades.get(body.trade_id);
      if (!trade) this._notFound(`Trade ${body.trade_id}`);

      trade.offer_amount = body.offer_amount || body.amount;
      trade.updated_at = new Date().toISOString();
      if (body.message) {
        trade.messages.push({ from: "buyer", text: body.message });
      }

      this._log(`Counter-offer on trade ${body.trade_id}: $${trade.offer_amount}`);
      return trade;
    }

    this._badRequest(`Unknown negotiate action: ${action}`);
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/trades/:id/accept
  // ---------------------------------------------------------------------------

  _acceptTrade(id, body) {
    const trade = this._trades.get(id);
    if (!trade) this._notFound(`Trade ${id}`);

    if (trade.status !== "negotiating") {
      this._badRequest(`Trade ${id} is not in negotiating status (current: ${trade.status})`);
    }

    const amount = trade.offer_amount;

    if (this._wallet.available < amount) {
      this._badRequest(
        `Insufficient funds. Available: $${this._wallet.available}, required: $${amount}`
      );
    }

    // Lock funds in escrow
    this._wallet.available -= amount;
    this._wallet.escrowed += amount;
    this._addTransaction("escrow_lock", -amount, `Escrow locked for trade ${id}`);

    trade.status = "accepted";
    trade.escrow_amount = amount;
    trade.accepted_at = new Date().toISOString();
    trade.updated_at = new Date().toISOString();

    this._log(`Trade ${id} accepted. $${amount} locked in escrow.`);
    return trade;
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/trades/:id
  // ---------------------------------------------------------------------------

  _getTrade(id) {
    const trade = this._trades.get(id);
    if (!trade) this._notFound(`Trade ${id}`);
    return trade;
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/trades/:id/confirm
  // ---------------------------------------------------------------------------

  _confirmTrade(id, body) {
    const trade = this._trades.get(id);
    if (!trade) this._notFound(`Trade ${id}`);

    if (trade.status !== "accepted") {
      this._badRequest(`Trade ${id} is not in accepted status (current: ${trade.status})`);
    }

    const amount = trade.escrow_amount;
    const fee = Math.round(amount * 0.01 * 100) / 100; // 1% fee, rounded to cents
    const released = amount - fee;

    // Release escrow
    this._wallet.escrowed -= amount;
    this._wallet.available += released;
    this._addTransaction("escrow_release", released, `Escrow released for trade ${id}`);
    this._addTransaction("fee", -fee, `Platform fee (1%) for trade ${id}`);

    trade.status = "completed";
    trade.completed_at = new Date().toISOString();
    trade.updated_at = new Date().toISOString();
    trade.fee = fee;

    // Apply rating if provided
    if (body && body.rating) {
      trade.rating = body.rating;
    }

    // Update agent reputation
    this._agent.total_trades++;
    this._agent.reputation_score += 10;
    if (this._agent.reputation_score >= 100) {
      this._agent.reputation_tier = "established";
    } else if (this._agent.reputation_score >= 50) {
      this._agent.reputation_tier = "active";
    }

    this._log(
      `Trade ${id} completed. $${released} released, $${fee} fee. Reputation: ${this._agent.reputation_score}`
    );
    return trade;
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/superdeals/offer
  // ---------------------------------------------------------------------------

  _superDealOffer(body) {
    const listing = this._listings.get(body.listing_id);
    if (!listing) this._notFound(`Listing ${body.listing_id}`);

    const offerId = `offer_${Date.now()}`;
    const offer = {
      id: offerId,
      listing_id: body.listing_id,
      listing_title: listing.title,
      offer_amount: body.offer_amount || body.amount || listing.min_price,
      buyer: { name: this._agent.name },
      seller: { ...listing.seller },
      status: "pending",
      message: body.message || "",
      created_at: new Date().toISOString(),
    };

    if (!this._superDealOffers.has(body.listing_id)) {
      this._superDealOffers.set(body.listing_id, []);
    }
    this._superDealOffers.get(body.listing_id).push(offer);

    this._log(`Super deal offer ${offerId} created for listing ${body.listing_id}`);
    return offer;
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/superdeals/:id/offers
  // ---------------------------------------------------------------------------

  _getSuperDealOffers(listingId, queryParams) {
    const offers = this._superDealOffers.get(listingId) || [];
    this._log(`Returning ${offers.length} super deal offers for listing ${listingId}`);
    return { offers, total: offers.length };
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/superdeals/:id/accept/:offerId
  // ---------------------------------------------------------------------------

  _acceptSuperDealOffer(listingId, offerId, body) {
    const offers = this._superDealOffers.get(listingId);
    if (!offers) this._notFound(`Super deal offers for listing ${listingId}`);

    const offer = offers.find((o) => o.id === offerId);
    if (!offer) this._notFound(`Offer ${offerId}`);

    const amount = offer.offer_amount;

    if (this._wallet.available < amount) {
      this._badRequest(
        `Insufficient funds. Available: $${this._wallet.available}, required: $${amount}`
      );
    }

    // Create a trade from the accepted super deal
    const tradeId = this._nextTradeId();
    const trade = {
      id: tradeId,
      listing_id: listingId,
      listing_title: offer.listing_title,
      offer_amount: amount,
      buyer: offer.buyer,
      seller: offer.seller,
      status: "accepted",
      escrow_amount: amount,
      accepted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Lock funds in escrow
    this._wallet.available -= amount;
    this._wallet.escrowed += amount;
    this._addTransaction("escrow_lock", -amount, `Escrow locked for super deal trade ${tradeId}`);

    this._trades.set(tradeId, trade);
    offer.status = "accepted";
    offer.trade_id = tradeId;

    // Reject other pending offers
    for (const o of offers) {
      if (o.id !== offerId && o.status === "pending") {
        o.status = "rejected";
      }
    }

    this._log(`Super deal offer ${offerId} accepted, trade ${tradeId} created`);
    return { offer, trade };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/wallet/balance
  // ---------------------------------------------------------------------------

  _getBalance() {
    return {
      available: this._wallet.available,
      escrowed: this._wallet.escrowed,
      total: this._wallet.available + this._wallet.escrowed,
      currency: "USD",
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/wallet/transactions
  // ---------------------------------------------------------------------------

  _getTransactions(queryParams) {
    let txs = [...this._wallet.transactions];

    if (queryParams) {
      if (queryParams.type) {
        txs = txs.filter((t) => t.type === queryParams.type);
      }
      if (queryParams.limit) {
        txs = txs.slice(0, Number(queryParams.limit));
      }
    }

    return { transactions: txs, total: txs.length };
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/wallet/deposit
  // ---------------------------------------------------------------------------

  _deposit(body) {
    const amount = body.amount || 0;
    if (amount <= 0) this._badRequest("Deposit amount must be positive");

    this._wallet.available += amount;
    const tx = this._addTransaction("deposit", amount, body.description || "Manual deposit");

    this._log(`Deposited $${amount}. New balance: $${this._wallet.available}`);
    return {
      success: true,
      transaction: tx,
      balance: {
        available: this._wallet.available,
        escrowed: this._wallet.escrowed,
        total: this._wallet.available + this._wallet.escrowed,
        currency: "USD",
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/agents/me
  // ---------------------------------------------------------------------------

  _getAgentProfile() {
    return { ...this._agent };
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/agents/register
  // ---------------------------------------------------------------------------

  _registerAgent(body) {
    if (body.name) this._agent.name = body.name;
    if (body.framework) this._agent.framework = body.framework;
    if (body.capabilities) this._agent.capabilities = body.capabilities;

    this._log(`Agent registered/updated: ${this._agent.name}`);
    return { ...this._agent };
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/categories
  // ---------------------------------------------------------------------------

  _getCategories() {
    return { categories: this._categories };
  }
}
