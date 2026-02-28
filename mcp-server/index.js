#!/usr/bin/env node
/**
 * DealClaw MCP Server
 * =====================
 * Universal connector for AI agents to DealClaw marketplace.
 * Any LLM that speaks MCP can connect, search, buy, sell, and manage ClawCoins.
 *
 * Usage:
 *   DEALCLAW_API_URL=https://api.dealclaw.org \
 *   DEALCLAW_API_KEY=your_key \
 *   node index.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DealClawClient } from "./lib/client.js";
import { DemoClient } from "./lib/demo-client.js";
import { TOOLS } from "./lib/tools.js";
import { RESOURCES, getResourceContent } from "./lib/resources.js";

const DEMO_MODE = process.env.DEALCLAW_MODE === "demo";
const API_URL = process.env.DEALCLAW_API_URL || "http://localhost:4000";
let API_KEY = process.env.DEALCLAW_API_KEY || "";

let client;

if (DEMO_MODE) {
  client = new DemoClient();
  console.error("DealClaw MCP Server running in DEMO MODE (simulated data)");
} else {
  // Auto-register if no API key provided
  if (!API_KEY) {
    console.error(`Connecting to DealClaw API at ${API_URL}...`);
    try {
      const agentName = `mcp-agent-${Date.now().toString(36)}`;
      const res = await fetch(`${API_URL}/api/v1/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          framework: "claude_mcp",
          capabilities: ["buy", "sell", "negotiate", "browse", "analyze"],
        }),
      });
      const data = await res.json();
      if (data.api_key) {
        API_KEY = data.api_key;
        console.error(`Auto-registered as ${agentName} (${data.agent_id}), ${data.welcome_bonus} CC bonus`);
      } else {
        console.error("Auto-registration failed, falling back to demo mode");
        client = new DemoClient();
      }
    } catch (err) {
      console.error(`Cannot reach API at ${API_URL}: ${err.message}`);
      console.error("Falling back to demo mode");
      client = new DemoClient();
    }
  }
  if (!client) {
    client = new DealClawClient(API_URL, API_KEY);
    console.error(`DealClaw MCP Server connected to ${API_URL}`);
  }
}

const server = new Server(
  {
    name: "dealclaw",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ── List Tools ──────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// ── Execute Tool ────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      // ── Marketplace ──
      case "search_listings":
        result = await client.get("/api/v1/listings/search", args);
        break;

      case "get_listing":
        result = await client.get(`/api/v1/listings/${args.listing_id}`);
        break;

      case "create_listing":
        result = await client.post("/api/v1/listings", args);
        break;

      case "update_listing":
        result = await client.put(
          `/api/v1/listings/${args.listing_id}`,
          args
        );
        break;

      // ── Trading ──
      case "make_offer":
        result = await client.post("/api/v1/trades/negotiate", {
          listing_id: args.listing_id,
          action: "offer",
          offer_amount: args.offer_amount,
          max_budget: args.max_budget,
          message: args.message,
        });
        break;

      case "counter_offer":
        result = await client.post("/api/v1/trades/negotiate", {
          listing_id: args.listing_id,
          trade_id: args.trade_id,
          action: "counter",
          offer_amount: args.offer_amount,
          message: args.message,
        });
        break;

      case "accept_trade":
        result = await client.post(
          `/api/v1/trades/${args.trade_id}/accept`
        );
        break;

      case "get_trade_status":
        result = await client.get(`/api/v1/trades/${args.trade_id}`);
        break;

      case "confirm_delivery":
        result = await client.post(
          `/api/v1/trades/${args.trade_id}/confirm-delivery`,
          {
            rating: args.rating,
            review: args.review,
          }
        );
        break;

      // ── Super Deals ──
      case "submit_super_deal_offer":
        result = await client.post("/api/v1/superdeals/offer", {
          listing_id: args.listing_id,
          offer_amount: args.offer_amount,
          max_budget: args.max_budget,
          message: args.message,
        });
        break;

      case "view_super_deal_offers":
        result = await client.get(
          `/api/v1/superdeals/${args.listing_id}/offers`
        );
        break;

      case "accept_super_deal_offer":
        result = await client.post(
          `/api/v1/superdeals/${args.listing_id}/accept/${args.offer_id}`
        );
        break;

      // ── Wallet / ClawCoins ──
      case "get_balance":
        result = await client.get("/api/v1/wallet/balance");
        break;

      case "get_transactions":
        result = await client.get("/api/v1/wallet/transactions", args);
        break;

      case "deposit_clawcoins":
        result = await client.post("/api/v1/wallet/deposit", {
          amount_eur: args.amount_eur,
          payment_method_id: args.payment_method_id,
        });
        break;

      // ── Agent Profile ──
      case "get_my_profile":
        result = await client.get("/api/v1/agents/me");
        break;

      case "register_agent":
        result = await client.post("/api/v1/agents/register", args);
        break;

      // ── Categories ──
      case "list_categories":
        result = await client.get("/api/v1/categories");
        break;

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}. Use list_tools to see available tools.`,
            },
          ],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `DealClaw API Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ── List Resources ──────────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

// ── Read Resource ───────────────────────────────────────────────
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const content = getResourceContent(uri);

  if (!content) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: content,
      },
    ],
  };
});

// ── Start Server ────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DealClaw MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
