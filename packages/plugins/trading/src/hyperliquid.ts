// ============================================================
// 🛸 Terminal of UFO — Hyperliquid Perp Trading
// API docs: https://hyperliquid.gitbook.io/hyperliquid-docs
// ============================================================

import axios from "axios";
import { ToolResult } from "@open-talons/plugin-sdk";

const HL_API = "https://api.hyperliquid.xyz";

// ── Public Market Data (no auth) ──────────────────────────────────────────────

export async function hlGetMeta(): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "meta" }, { timeout: 10000 });
    const universe = r.data?.universe || [];
    return {
      success: true,
      data: {
        totalAssets: universe.length,
        topAssets: universe.slice(0, 30).map((a: { name: string; maxLeverage: number; szDecimals: number }) => ({
          symbol: a.name,
          maxLeverage: a.maxLeverage,
          decimals: a.szDecimals,
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL meta: ${e instanceof Error ? e.message : e}` };
  }
}

export async function hlGetMarketPrice(coin: string): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "allMids" }, { timeout: 8000 });
    const mids = r.data || {};
    const symbol = coin.toUpperCase();

    if (!mids[symbol]) return { success: false, error: `${symbol} not found on Hyperliquid` };

    // Also get funding + open interest
    const ctxR = await axios.post(`${HL_API}/info`, { type: "metaAndAssetCtxs" }, { timeout: 8000 });
    const ctxs = ctxR.data?.[1] || [];
    const universe = ctxR.data?.[0]?.universe || [];
    const idx = universe.findIndex((a: { name: string }) => a.name === symbol);
    const ctx = idx >= 0 ? ctxs[idx] : null;

    return {
      success: true,
      data: {
        symbol,
        midPrice: parseFloat(mids[symbol]),
        oraclePrice: ctx?.oraclePx ? parseFloat(ctx.oraclePx) : null,
        markPrice: ctx?.markPx ? parseFloat(ctx.markPx) : null,
        funding: ctx?.funding ? `${(parseFloat(ctx.funding) * 100).toFixed(4)}%` : null,
        openInterest: ctx?.openInterest ? parseFloat(ctx.openInterest) : null,
        dayVolume: ctx?.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : null,
        prevDayPrice: ctx?.prevDayPx ? parseFloat(ctx.prevDayPx) : null,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL price: ${e instanceof Error ? e.message : e}` };
  }
}

export async function hlOrderBook(coin: string): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, {
      type: "l2Book", coin: coin.toUpperCase(),
    }, { timeout: 8000 });

    const levels = r.data?.levels;
    if (!levels) return { success: false, error: "No order book data" };

    const bids = levels[0]?.slice(0, 10).map((b: { px: string; sz: string }) => ({
      price: parseFloat(b.px), size: parseFloat(b.sz),
    })) || [];
    const asks = levels[1]?.slice(0, 10).map((a: { px: string; sz: string }) => ({
      price: parseFloat(a.px), size: parseFloat(a.sz),
    })) || [];

    const bidVol = bids.reduce((a: number, b: { size: number }) => a + b.size, 0);
    const askVol = asks.reduce((a: number, b: { size: number }) => a + b.size, 0);
    const imbalance = ((bidVol - askVol) / (bidVol + askVol) * 100).toFixed(2);

    return {
      success: true,
      data: {
        symbol: coin.toUpperCase(),
        topBid: bids[0]?.price,
        topAsk: asks[0]?.price,
        spread: asks[0] && bids[0] ? (asks[0].price - bids[0].price).toFixed(4) : null,
        bidVolume: bidVol.toFixed(4),
        askVolume: askVol.toFixed(4),
        imbalance: `${imbalance}% ${parseFloat(imbalance) > 0 ? "(BUY pressure)" : "(SELL pressure)"}`,
        bids: bids.slice(0, 5),
        asks: asks.slice(0, 5),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL orderbook: ${e instanceof Error ? e.message : e}` };
  }
}

export async function hlAllFundingRates(): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, { type: "metaAndAssetCtxs" }, { timeout: 10000 });
    const universe = r.data?.[0]?.universe || [];
    const ctxs = r.data?.[1] || [];

    const funding = universe.map((u: { name: string }, i: number) => ({
      symbol: u.name,
      funding: ctxs[i]?.funding ? parseFloat(ctxs[i].funding) * 100 : 0,
      openInterest: ctxs[i]?.openInterest ? parseFloat(ctxs[i].openInterest) : 0,
      markPrice: ctxs[i]?.markPx ? parseFloat(ctxs[i].markPx) : 0,
    })).filter((f: { funding: number }) => f.funding !== 0);

    // Sort by funding rate
    const sorted = [...funding].sort((a, b) => Math.abs(b.funding) - Math.abs(a.funding));

    return {
      success: true,
      data: {
        totalAssets: funding.length,
        mostNegativeFunding: sorted.filter((f) => f.funding < 0).slice(0, 5).map((f) => ({
          ...f, funding: f.funding.toFixed(4) + "%",
          opportunity: "Long pays short — potential SHORT entry pays you",
        })),
        mostPositiveFunding: sorted.filter((f) => f.funding > 0).slice(0, 5).map((f) => ({
          ...f, funding: f.funding.toFixed(4) + "%",
          opportunity: "Short pays long — potential LONG entry pays you",
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL funding: ${e instanceof Error ? e.message : e}` };
  }
}

export async function hlGetAccount(address: string): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, {
      type: "clearinghouseState", user: address,
    }, { timeout: 10000 });

    const ms = r.data?.marginSummary;
    const positions = (r.data?.assetPositions || []).map((p: {
      position: { coin: string; szi: string; entryPx: string; positionValue: string; unrealizedPnl: string; returnOnEquity: string; leverage: { value: number } };
    }) => ({
      coin: p.position.coin,
      size: parseFloat(p.position.szi),
      side: parseFloat(p.position.szi) > 0 ? "LONG" : "SHORT",
      entryPrice: parseFloat(p.position.entryPx),
      currentValue: parseFloat(p.position.positionValue),
      unrealizedPnl: parseFloat(p.position.unrealizedPnl),
      roe: (parseFloat(p.position.returnOnEquity) * 100).toFixed(2) + "%",
      leverage: p.position.leverage?.value,
    }));

    return {
      success: true,
      data: {
        address,
        accountValue: parseFloat(ms?.accountValue || "0"),
        totalMarginUsed: parseFloat(ms?.totalMarginUsed || "0"),
        totalNotional: parseFloat(ms?.totalNtlPos || "0"),
        withdrawable: parseFloat(r.data?.withdrawable || "0"),
        openPositions: positions.length,
        positions,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL account: ${e instanceof Error ? e.message : e}` };
  }
}

export async function hlUserFills(address: string, limit = 20): Promise<ToolResult> {
  try {
    const r = await axios.post(`${HL_API}/info`, {
      type: "userFills", user: address,
    }, { timeout: 10000 });

    const fills = (r.data || []).slice(0, limit).map((f: {
      coin: string; px: string; sz: string; side: string; time: number;
      closedPnl: string; dir: string; fee: string;
    }) => ({
      coin: f.coin,
      side: f.side === "B" ? "BUY" : "SELL",
      direction: f.dir,
      price: parseFloat(f.px),
      size: parseFloat(f.sz),
      pnl: parseFloat(f.closedPnl),
      fee: parseFloat(f.fee),
      time: new Date(f.time).toISOString(),
    }));

    const totalPnl = fills.reduce((a: number, f: { pnl: number }) => a + f.pnl, 0);
    const winFills = fills.filter((f: { pnl: number }) => f.pnl > 0).length;

    return {
      success: true,
      data: {
        address,
        recentFills: fills,
        stats: {
          totalFills: fills.length,
          totalPnL: totalPnl.toFixed(2),
          winRate: fills.length > 0 ? ((winFills / fills.length) * 100).toFixed(1) + "%" : "0%",
        },
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `HL fills: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Place Order (DRY_RUN by default) ──────────────────────────────────────────

export async function hlPlaceOrder(params: {
  coin: string;
  isBuy: boolean;
  size: number;
  limitPrice?: number;
  reduceOnly?: boolean;
}): Promise<ToolResult> {
  const liveMode = process.env.HL_LIVE_TRADING === "true";
  const privateKey = process.env.HL_PRIVATE_KEY;

  if (!liveMode) {
    return {
      success: true,
      data: {
        dryRun: true,
        action: "DRY_RUN — order NOT submitted",
        wouldExecute: {
          coin: params.coin,
          side: params.isBuy ? "BUY" : "SELL",
          size: params.size,
          limitPrice: params.limitPrice || "MARKET",
          reduceOnly: params.reduceOnly || false,
        },
        toEnableLive: "Set HL_LIVE_TRADING=true in .env (BE VERY CAREFUL)",
      },
    };
  }

  if (!privateKey) {
    return {
      success: false,
      error: "HL_PRIVATE_KEY required for live trading. NEVER share this. Add to .env.",
    };
  }

  return {
    success: false,
    error: "Live order placement requires @nktkas/hyperliquid SDK setup. Install: npm install @nktkas/hyperliquid. Implementation requires signature via private key.",
  };
}
