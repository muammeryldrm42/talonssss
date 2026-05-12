// ============================================================
// 🦅 @open-talons/plugin-trading
// Hyperliquid + Lighter perp DEX tools
// ============================================================

import { definePlugin, defineTool, defineAgent, inputSchema, ToolResult } from "@open-talons/plugin-sdk";
import axios from "axios";

const HL_API = "https://api.hyperliquid.xyz";
const LIGHTER_API = "https://mainnet.zklighter.elliot.ai/api/v1";

// ── Hyperliquid ───────────────────────────────────────────────────────────────

async function hlPrice(coin: string): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "allMids" }, { timeout: 8000 });
    const mids = r.data || {};
    const symbol = coin.toUpperCase();
    if (!mids[symbol]) return { success: false, error: `${symbol} not found` };

    const ctxR = await axios.post(`${HL_API}/info`, { type: "metaAndAssetCtxs" }, { timeout: 8000 });
    const universe = ctxR.data?.[0]?.universe || [];
    const ctxs = ctxR.data?.[1] || [];
    const idx = universe.findIndex((a: any) => a.name === symbol);
    const ctx = idx >= 0 ? ctxs[idx] : null;

    return {
      success: true,
      data: {
        symbol,
        midPrice: parseFloat(mids[symbol]),
        markPrice: ctx?.markPx ? parseFloat(ctx.markPx) : null,
        funding: ctx?.funding ? `${(parseFloat(ctx.funding) * 100).toFixed(4)}%` : null,
        openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) : null,
        dayVolume: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : null,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function hlAccount(address: string): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "clearinghouseState", user: address }, { timeout: 10000 });
    const ms = r.data?.marginSummary;
    const positions = (r.data?.assetPositions || []).map((p: any) => ({
      coin: p.position.coin, size: parseFloat(p.position.szi),
      side: parseFloat(p.position.szi) > 0 ? "LONG" : "SHORT",
      entryPrice: parseFloat(p.position.entryPx),
      unrealizedPnl: parseFloat(p.position.unrealizedPnl),
      roe: (parseFloat(p.position.returnOnEquity) * 100).toFixed(2) + "%",
    }));
    return {
      success: true,
      data: {
        address,
        accountValue: parseFloat(ms?.accountValue || "0"),
        totalMarginUsed: parseFloat(ms?.totalMarginUsed || "0"),
        withdrawable: parseFloat(r.data?.withdrawable || "0"),
        openPositions: positions.length, positions,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function hlFundingRates(): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "metaAndAssetCtxs" }, { timeout: 10000 });
    const universe = r.data?.[0]?.universe || [];
    const ctxs = r.data?.[1] || [];
    const funding = universe.map((u: any, i: number) => ({
      symbol: u.name,
      funding: ctxs[i]?.funding ? parseFloat(ctxs[i].funding) * 100 : 0,
      markPrice: ctxs[i]?.markPx ? parseFloat(ctxs[i].markPx) : 0,
    })).filter((f: any) => f.funding !== 0);
    const sorted = [...funding].sort((a: any, b: any) => Math.abs(b.funding) - Math.abs(a.funding));
    return {
      success: true,
      data: {
        totalAssets: funding.length,
        topNegative: sorted.filter((f: any) => f.funding < 0).slice(0, 5).map((f: any) => ({ ...f, funding: f.funding.toFixed(4) + "%" })),
        topPositive: sorted.filter((f: any) => f.funding > 0).slice(0, 5).map((f: any) => ({ ...f, funding: f.funding.toFixed(4) + "%" })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function hlPlaceOrder(params: { coin: string; isBuy: boolean; size: number; limitPrice?: number }): Promise<ToolResult> {
  const liveMode = process.env.HL_LIVE_TRADING === "true";
  if (!liveMode) {
    return {
      success: true,
      data: {
        dryRun: true,
        action: "DRY_RUN — order NOT submitted",
        wouldExecute: { ...params, side: params.isBuy ? "BUY" : "SELL" },
        toEnableLive: "Set HL_LIVE_TRADING=true (BE VERY CAREFUL)",
      },
    };
  }
  return { success: false, error: "Live trading requires SDK setup. See docs." };
}

// ── Lighter ───────────────────────────────────────────────────────────────────

async function lighterMarkets(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LIGHTER_API}/orderBookDetails`, { timeout: 10000 });
    const markets = (r.data?.order_book_details || []).map((m: any) => ({
      marketId: m.market_id, symbol: m.symbol,
      lastPrice: parseFloat(m.last_trade_price),
      change24h: parseFloat(m.daily_price_change).toFixed(2) + "%",
      volume24h: parseFloat(m.daily_volume_quote_token),
      fundingRate: (parseFloat(m.funding_rate) * 100).toFixed(4) + "%",
    }));
    return { success: true, data: { totalMarkets: markets.length, markets } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function compareFunding(symbol: string): Promise<ToolResult> {
  try {
    const sym = symbol.toUpperCase().replace("USDT", "").replace("PERP", "");
    const [hlR, binanceR] = await Promise.allSettled([
      axios.post(`${HL_API}/info`, { type: "metaAndAssetCtxs" }, { timeout: 8000 }),
      axios.get("https://fapi.binance.com/fapi/v1/premiumIndex", { params: { symbol: sym + "USDT" }, timeout: 8000 }),
    ]);
    const result: any = {};
    if (hlR.status === "fulfilled") {
      const universe = (hlR.value as any).data?.[0]?.universe || [];
      const ctxs = (hlR.value as any).data?.[1] || [];
      const idx = universe.findIndex((u: any) => u.name === sym);
      if (idx >= 0 && ctxs[idx]) {
        result.hyperliquid = { funding: (parseFloat(ctxs[idx].funding) * 100).toFixed(4) + "%", markPrice: parseFloat(ctxs[idx].markPx) };
      }
    }
    if (binanceR.status === "fulfilled") {
      result.binance = {
        funding: (parseFloat((binanceR.value as any).data.lastFundingRate) * 100).toFixed(4) + "%",
        markPrice: parseFloat((binanceR.value as any).data.markPrice),
      };
    }
    return { success: true, data: { symbol: sym, exchanges: result } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@open-talons/plugin-trading",
  version: "1.0.0",
  author: "Talons Protocol",
  description: "Perp DEX trading (Hyperliquid + Lighter)",
  license: "MIT",
  tools: [
    defineTool({ name: "hl_price", description: "Hyperliquid market price + funding + OI", inputSchema: inputSchema({ coin: { type: "string", description: "BTC, ETH, SOL etc" } }, ["coin"]), handler: async (i) => hlPrice(i.coin as string), category: "trading", permission: "read" }),
    defineTool({ name: "hl_account", description: "Hyperliquid account positions + PnL", inputSchema: inputSchema({ address: { type: "string", description: "EVM address" } }, ["address"]), handler: async (i) => hlAccount(i.address as string), category: "trading", permission: "read" }),
    defineTool({ name: "hl_funding_rates", description: "Hyperliquid all funding rates — find arbs", inputSchema: inputSchema({}), handler: async () => hlFundingRates(), category: "trading", permission: "read" }),
    defineTool({ name: "hl_place_order", description: "Place Hyperliquid order. DRY_RUN by default.", inputSchema: inputSchema({ coin: { type: "string", description: "Coin" }, is_buy: { type: "boolean", description: "Buy?" }, size: { type: "number", description: "Size" }, limit_price: { type: "number", description: "Optional limit price" } }, ["coin", "is_buy", "size"]), handler: async (i) => hlPlaceOrder({ coin: i.coin as string, isBuy: i.is_buy as boolean, size: i.size as number, limitPrice: i.limit_price as number }), category: "trading", permission: "execute" }),
    defineTool({ name: "lighter_markets", description: "Lighter DEX all markets", inputSchema: inputSchema({}), handler: async () => lighterMarkets(), category: "trading", permission: "read" }),
    defineTool({ name: "compare_funding", description: "Compare funding rates across HL, Lighter, Binance", inputSchema: inputSchema({ symbol: { type: "string", description: "Coin symbol" } }, ["symbol"]), handler: async (i) => compareFunding(i.symbol as string), category: "trading", permission: "read" }),
  ],
  agents: [
    defineAgent({
      mode: "trading",
      icon: "📊",
      name: "Trading Agent",
      systemPrompt: `📊 Open Talons Trading Agent — PERP TRADING SPECIALIST.
- hl_price + hl_funding_rates for Hyperliquid
- lighter_markets + compare_funding for cross-exchange arbitrage
- hl_place_order is DRY_RUN by default
- Always show risk: leverage, liquidation price, fees
⚠️ Not financial advice.`,
      allowedTools: ["hl_price", "hl_account", "hl_funding_rates", "hl_place_order", "lighter_markets", "compare_funding"],
    }),
  ],
});
