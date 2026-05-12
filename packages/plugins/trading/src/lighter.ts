// ============================================================
// 🛸 Terminal of UFO — Lighter DEX + Cross-Exchange Tools
// ============================================================

import axios from "axios";
import { ToolResult } from "@open-talons/plugin-sdk";

const LIGHTER_API = "https://mainnet.zklighter.elliot.ai/api/v1";

// ── Lighter Public Data ───────────────────────────────────────────────────────

export async function lighterMarkets(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LIGHTER_API}/orderBookDetails`, { timeout: 10000 });
    const markets = (r.data?.order_book_details || []).map((m: {
      market_id: number; symbol: string; last_trade_price: string;
      daily_volume_quote_token: string; daily_price_change: string;
      open_interest_base: string; funding_rate: string;
    }) => ({
      marketId: m.market_id,
      symbol: m.symbol,
      lastPrice: parseFloat(m.last_trade_price),
      change24h: parseFloat(m.daily_price_change).toFixed(2) + "%",
      volume24h: parseFloat(m.daily_volume_quote_token),
      openInterest: parseFloat(m.open_interest_base),
      fundingRate: (parseFloat(m.funding_rate) * 100).toFixed(4) + "%",
    }));
    return { success: true, data: { totalMarkets: markets.length, markets } };
  } catch (e: unknown) {
    return { success: false, error: `Lighter markets: ${e instanceof Error ? e.message : e}` };
  }
}

export async function lighterOrderBook(symbol: string): Promise<ToolResult> {
  try {
    const marketsR = await axios.get(`${LIGHTER_API}/orderBookDetails`, { timeout: 10000 });
    const market = marketsR.data?.order_book_details?.find(
      (m: { symbol: string }) => m.symbol.toUpperCase() === symbol.toUpperCase()
    );
    if (!market) return { success: false, error: `${symbol} not found on Lighter` };

    const obR = await axios.get(`${LIGHTER_API}/orderBookOrders`, {
      params: { market_id: market.market_id, limit: 10 },
      timeout: 10000,
    });

    const bids = (obR.data?.bids || []).slice(0, 10).map((b: { price: string; remaining_base_amount: string }) => ({
      price: parseFloat(b.price), size: parseFloat(b.remaining_base_amount),
    }));
    const asks = (obR.data?.asks || []).slice(0, 10).map((a: { price: string; remaining_base_amount: string }) => ({
      price: parseFloat(a.price), size: parseFloat(a.remaining_base_amount),
    }));

    return {
      success: true,
      data: {
        symbol: market.symbol,
        marketId: market.market_id,
        topBid: bids[0]?.price,
        topAsk: asks[0]?.price,
        spread: bids[0] && asks[0] ? (asks[0].price - bids[0].price).toFixed(4) : null,
        bids: bids.slice(0, 5),
        asks: asks.slice(0, 5),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Lighter orderbook: ${e instanceof Error ? e.message : e}` };
  }
}

export async function lighterAccount(address: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LIGHTER_API}/account`, {
      params: { by: "l1_address", value: address },
      timeout: 10000,
    });

    const acc = r.data?.accounts?.[0];
    if (!acc) return { success: false, error: "Account not found on Lighter" };

    return {
      success: true,
      data: {
        accountIndex: acc.index,
        l1Address: acc.l1_address,
        collateral: parseFloat(acc.collateral || "0"),
        availableBalance: parseFloat(acc.available_balance || "0"),
        totalPnL: parseFloat(acc.total_pnl || "0"),
        openPositions: (acc.positions || []).filter((p: { size: string }) => parseFloat(p.size) !== 0).map((p: {
          market_id: number; symbol: string; size: string; avg_entry_price: string;
          unrealized_pnl: string; mark_price: string;
        }) => ({
          symbol: p.symbol,
          size: parseFloat(p.size),
          side: parseFloat(p.size) > 0 ? "LONG" : "SHORT",
          entryPrice: parseFloat(p.avg_entry_price),
          markPrice: parseFloat(p.mark_price),
          unrealizedPnL: parseFloat(p.unrealized_pnl),
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Lighter account: ${e instanceof Error ? e.message : e}` };
  }
}

export async function lighterPlaceOrder(_params: {
  symbol: string; isBuy: boolean; size: number; price?: number;
}): Promise<ToolResult> {
  const liveMode = process.env.LIGHTER_LIVE_TRADING === "true";
  if (!liveMode) {
    return {
      success: true,
      data: {
        dryRun: true,
        message: "DRY_RUN mode. Set LIGHTER_LIVE_TRADING=true in .env to enable.",
        params: _params,
      },
    };
  }
  return {
    success: false,
    error: "Lighter live trading requires lighter-python or zk-proof signing. SDK setup needed.",
  };
}

// ── Cross-Exchange Funding Arb ────────────────────────────────────────────────

export async function compareFundingRates(symbol: string): Promise<ToolResult> {
  try {
    const sym = symbol.toUpperCase().replace("USDT", "").replace("PERP", "");

    const [hlR, ltR, binanceR] = await Promise.allSettled([
      axios.post("https://api.hyperliquid.xyz/info", { type: "metaAndAssetCtxs" }, { timeout: 8000 }),
      axios.get(`${LIGHTER_API}/orderBookDetails`, { timeout: 8000 }),
      axios.get("https://fapi.binance.com/fapi/v1/premiumIndex", {
        params: { symbol: sym + "USDT" }, timeout: 8000,
      }),
    ]);

    const result: Record<string, { funding: string; markPrice: number } | string> = {};

    // Hyperliquid
    if (hlR.status === "fulfilled") {
      const universe = hlR.value.data?.[0]?.universe || [];
      const ctxs = hlR.value.data?.[1] || [];
      const idx = universe.findIndex((u: { name: string }) => u.name === sym);
      if (idx >= 0 && ctxs[idx]) {
        result.hyperliquid = {
          funding: (parseFloat(ctxs[idx].funding) * 100).toFixed(4) + "%",
          markPrice: parseFloat(ctxs[idx].markPx),
        };
      } else { result.hyperliquid = "Not listed"; }
    }

    // Lighter
    if (ltR.status === "fulfilled") {
      const ltMarket = ltR.value.data?.order_book_details?.find(
        (m: { symbol: string }) => m.symbol.toUpperCase().includes(sym)
      );
      if (ltMarket) {
        result.lighter = {
          funding: (parseFloat(ltMarket.funding_rate) * 100).toFixed(4) + "%",
          markPrice: parseFloat(ltMarket.last_trade_price),
        };
      } else { result.lighter = "Not listed"; }
    }

    // Binance
    if (binanceR.status === "fulfilled") {
      result.binance = {
        funding: (parseFloat(binanceR.value.data.lastFundingRate) * 100).toFixed(4) + "%",
        markPrice: parseFloat(binanceR.value.data.markPrice),
      };
    }

    // Find arb opportunity
    const validRates: { exchange: string; funding: number }[] = [];
    Object.entries(result).forEach(([ex, d]) => {
      if (typeof d === "object") validRates.push({ exchange: ex, funding: parseFloat((d as { funding: string }).funding) });
    });

    let arbSuggestion = "No clear arb opportunity";
    if (validRates.length >= 2) {
      const sorted = [...validRates].sort((a, b) => a.funding - b.funding);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];
      const spread = Math.abs(highest.funding - lowest.funding);

      if (spread > 0.01) {
        arbSuggestion = `📊 Arb spread: ${spread.toFixed(4)}% — LONG on ${lowest.exchange} (${lowest.funding.toFixed(4)}%) + SHORT on ${highest.exchange} (${highest.funding.toFixed(4)}%) = delta neutral, collect funding spread`;
      }
    }

    return {
      success: true,
      data: { symbol: sym, exchanges: result, arbitrageSuggestion: arbSuggestion },
    };
  } catch (e: unknown) {
    return { success: false, error: `Funding compare: ${e instanceof Error ? e.message : e}` };
  }
}

export async function bestExecution(symbol: string, size: number, isBuy: boolean): Promise<ToolResult> {
  try {
    const sym = symbol.toUpperCase().replace("USDT", "");

    const [hlObR, ltObR] = await Promise.allSettled([
      axios.post("https://api.hyperliquid.xyz/info", { type: "l2Book", coin: sym }, { timeout: 8000 }),
      lighterOrderBook(sym),
    ]);

    const exchanges: { name: string; topPrice: number; avgFillPrice?: number; slippage?: string }[] = [];

    if (hlObR.status === "fulfilled") {
      const levels = hlObR.value.data?.levels;
      const side = isBuy ? levels?.[1] : levels?.[0];
      if (side && side.length) {
        const top = parseFloat(side[0].px);
        // Simulate fill
        let remaining = size, totalCost = 0;
        for (const level of side) {
          const sz = parseFloat(level.sz);
          const px = parseFloat(level.px);
          if (remaining <= sz) { totalCost += remaining * px; remaining = 0; break; }
          totalCost += sz * px; remaining -= sz;
        }
        if (remaining === 0) {
          const avg = totalCost / size;
          exchanges.push({
            name: "Hyperliquid", topPrice: top,
            avgFillPrice: avg,
            slippage: (((avg - top) / top) * 100).toFixed(4) + "%",
          });
        }
      }
    }

    if (ltObR.status === "fulfilled" && ltObR.value.success) {
      const ob = ltObR.value.data as { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] };
      const side = isBuy ? ob.asks : ob.bids;
      if (side?.length) {
        const top = side[0].price;
        let remaining = size, totalCost = 0;
        for (const level of side) {
          if (remaining <= level.size) { totalCost += remaining * level.price; remaining = 0; break; }
          totalCost += level.size * level.price; remaining -= level.size;
        }
        if (remaining === 0) {
          const avg = totalCost / size;
          exchanges.push({
            name: "Lighter", topPrice: top,
            avgFillPrice: avg,
            slippage: (((avg - top) / top) * 100).toFixed(4) + "%",
          });
        }
      }
    }

    const best = exchanges.length
      ? exchanges.sort((a, b) =>
          isBuy ? (a.avgFillPrice || 0) - (b.avgFillPrice || 0) : (b.avgFillPrice || 0) - (a.avgFillPrice || 0)
        )[0]
      : null;

    return {
      success: true,
      data: {
        symbol: sym, side: isBuy ? "BUY" : "SELL", size,
        exchanges,
        bestExecution: best ? `${best.name} at avg $${best.avgFillPrice?.toFixed(4)} (${best.slippage} slippage)` : "Insufficient depth",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Best execution: ${e instanceof Error ? e.message : e}` };
  }
}
