// ============================================================
// 🛸 Terminal of UFO — Crypto Analysis Tool (v2)
// ============================================================

import axios from "axios";
import { ToolResult, TechnicalIndicators, TradingSignal } from "@open-talons/plugin-sdk";

const CG = "https://api.coingecko.com/api/v3";
const BN = "https://api.binance.com/api/v3";

function cgH(): Record<string, string> {
  const k = process.env.COINGECKO_API_KEY;
  return k ? { "x-cg-demo-api-key": k } : {};
}

// ── Price ─────────────────────────────────────────────────────────────────────

export async function getCryptoPrice(coinIds: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/coins/markets`, {
      headers: cgH(),
      params: {
        vs_currency: "usd",
        ids: coinIds,
        order: "market_cap_desc",
        per_page: 25,
        sparkline: false,
        price_change_percentage: "1h,24h,7d,30d",
      },
      timeout: 10000,
    });
    return { success: true, data: r.data };
  } catch (e: unknown) {
    return { success: false, error: `Price fetch: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getTopCoins(limit = 20): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/coins/markets`, {
      headers: cgH(),
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: Math.min(limit, 100),
        sparkline: false,
        price_change_percentage: "24h,7d",
      },
      timeout: 10000,
    });
    return { success: true, data: r.data };
  } catch (e: unknown) {
    return { success: false, error: `Top coins: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getTrendingCoins(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/search/trending`, { headers: cgH(), timeout: 10000 });
    const trending = r.data.coins.map((c: {
      item: { name: string; symbol: string; market_cap_rank: number; data: { price: string; price_change_percentage_24h: { usd: number } } }
    }) => ({
      name: c.item.name,
      symbol: c.item.symbol,
      rank: c.item.market_cap_rank,
      price: c.item.data?.price,
      change24h: c.item.data?.price_change_percentage_24h?.usd?.toFixed(2) ?? "N/A",
    }));
    return { success: true, data: trending };
  } catch (e: unknown) {
    return { success: false, error: `Trending: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getGlobalMarket(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/global`, { headers: cgH(), timeout: 10000 });
    const d = r.data.data;
    return {
      success: true,
      data: {
        activeCurrencies: d.active_cryptocurrencies,
        totalMarketCap: d.total_market_cap.usd,
        totalVolume24h: d.total_volume.usd,
        btcDominance: d.market_cap_percentage.btc.toFixed(2) + "%",
        ethDominance: d.market_cap_percentage.eth.toFixed(2) + "%",
        marketCapChange24h: d.market_cap_change_percentage_24h_usd.toFixed(2) + "%",
        updatedAt: new Date(d.updated_at * 1000).toISOString(),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Global market: ${e instanceof Error ? e.message : e}` };
  }
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getCryptoHistory(coinId: string, days = 30): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/coins/${coinId}/market_chart`, {
      headers: cgH(),
      params: { vs_currency: "usd", days, interval: days <= 1 ? "hourly" : "daily" },
      timeout: 12000,
    });

    const prices: [number, number][] = r.data.prices;
    const vols: [number, number][] = r.data.total_volumes;
    const vals = prices.map((p) => p[1]);
    const high = Math.max(...vals);
    const low = Math.min(...vals);
    const current = vals[vals.length - 1];
    const change = ((current - vals[0]) / vals[0]) * 100;

    return {
      success: true,
      data: {
        coinId, days, current, high, low,
        changePct: change.toFixed(2) + "%",
        sma7: sma(vals, 7),
        sma14: sma(vals, 14),
        sma30: sma(vals, 30),
        avgVolume: vols.reduce((a, v) => a + v[1], 0) / vols.length,
        priceHistory: prices.slice(-14).map((p) => ({
          date: new Date(p[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          price: parseFloat(p[1].toFixed(2)),
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `History: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getCoinDetails(coinId: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/coins/${coinId}`, {
      headers: cgH(),
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: true,
        developer_data: false,
      },
      timeout: 12000,
    });
    const c = r.data;
    return {
      success: true,
      data: {
        name: c.name,
        symbol: c.symbol?.toUpperCase(),
        description: c.description?.en?.slice(0, 400),
        categories: c.categories?.slice(0, 5),
        website: c.links?.homepage?.[0],
        twitter: c.links?.twitter_screen_name,
        reddit: c.links?.subreddit_url,
        github: c.links?.repos_url?.github?.[0],
        price: c.market_data?.current_price?.usd,
        marketCap: c.market_data?.market_cap?.usd,
        rank: c.market_cap_rank,
        ath: c.market_data?.ath?.usd,
        athChange: c.market_data?.ath_change_percentage?.usd?.toFixed(2) + "%",
        athDate: c.market_data?.ath_date?.usd,
        atl: c.market_data?.atl?.usd,
        circulatingSupply: c.market_data?.circulating_supply,
        totalSupply: c.market_data?.total_supply,
        maxSupply: c.market_data?.max_supply,
        redditSubscribers: c.community_data?.reddit_subscribers,
        twitterFollowers: c.community_data?.twitter_followers,
        sentimentUp: c.sentiment_votes_up_percentage,
        sentimentDown: c.sentiment_votes_down_percentage,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Coin details: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Binance – full technical analysis ─────────────────────────────────────────

export async function getBinanceAnalysis(symbol: string, interval = "1h", limit = 100): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BN}/klines`, {
      params: { symbol: symbol.toUpperCase(), interval, limit: Math.min(limit, 500) },
      timeout: 12000,
    });

    const raw = r.data;
    const closes = raw.map((k: unknown[]) => parseFloat(k[4] as string));
    const highs = raw.map((k: unknown[]) => parseFloat(k[2] as string));
    const lows = raw.map((k: unknown[]) => parseFloat(k[3] as string));
    const volumes = raw.map((k: unknown[]) => parseFloat(k[5] as string));

    const lastClose = closes[closes.length - 1];
    const indicators = computeIndicators(closes, highs, lows, volumes);

    const recentCandles = raw.slice(-8).map((k: unknown[]) => ({
      time: new Date(k[0] as number).toISOString(),
      open: parseFloat((k[1] as string)),
      high: parseFloat((k[2] as string)),
      low: parseFloat((k[3] as string)),
      close: parseFloat((k[4] as string)),
      volume: parseFloat((k[5] as string)),
    }));

    return {
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        interval,
        lastPrice: lastClose,
        priceChange: ((lastClose - closes[0]) / closes[0] * 100).toFixed(2) + "%",
        indicators,
        recentCandles,
        summary: buildSummary(indicators),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Binance analysis: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getBinanceOrderBook(symbol: string, depth = 10): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BN}/depth`, {
      params: { symbol: symbol.toUpperCase(), limit: depth },
      timeout: 8000,
    });

    const bids: [string, string][] = r.data.bids;
    const asks: [string, string][] = r.data.asks;

    const bidVol = bids.reduce((a, b) => a + parseFloat(b[1]), 0);
    const askVol = asks.reduce((a, a2) => a + parseFloat(a2[1]), 0);
    const imbalance = ((bidVol - askVol) / (bidVol + askVol) * 100).toFixed(2);

    return {
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        topBid: parseFloat(bids[0][0]),
        topAsk: parseFloat(asks[0][0]),
        spread: (parseFloat(asks[0][0]) - parseFloat(bids[0][0])).toFixed(4),
        bidVolume: bidVol.toFixed(4),
        askVolume: askVol.toFixed(4),
        orderBookImbalance: imbalance + "% " + (parseFloat(imbalance) > 0 ? "(BUY PRESSURE)" : "(SELL PRESSURE)"),
        bids: bids.slice(0, 5).map((b) => ({ price: b[0], qty: b[1] })),
        asks: asks.slice(0, 5).map((a) => ({ price: a[0], qty: a[1] })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Order book: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Indicators ────────────────────────────────────────────────────────────────

function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1];
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
  return result;
}

function rsi(data: number[], period = 14): number {
  if (data.length < period + 1) return 50;
  const changes = data.slice(1).map((v, i) => v - data[i]);
  const gains = changes.map((c) => Math.max(c, 0));
  const losses = changes.map((c) => Math.max(-c, 0));
  const avgG = gains.slice(-period).reduce((a, b) => a + b) / period;
  const avgL = losses.slice(-period).reduce((a, b) => a + b) / period;
  return avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
}

function macd(data: number[]): { macd: number; signal: number; histogram: number } {
  if (data.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = ema(data, 12);
  const ema26 = ema(data, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  const last = macdLine[macdLine.length - 1];
  const lastS = signal[signal.length - 1];
  return { macd: last, signal: lastS, histogram: last - lastS };
}

function bollingerBands(data: number[], period = 20, multiplier = 2): { upper: number; mid: number; lower: number } {
  const s = sma(data, period);
  const slice = data.slice(-period);
  const std = Math.sqrt(slice.reduce((a, v) => a + Math.pow(v - s, 2), 0) / period);
  return { upper: s + multiplier * std, mid: s, lower: s - multiplier * std };
}

function atr(highs: number[], lows: number[], closes: number[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return sma(trs, period);
}

function computeIndicators(closes: number[], highs: number[], lows: number[], _volumes: number[]): TechnicalIndicators {
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema9v = ema(closes, 9);
  const bb = bollingerBands(closes, 20);
  const atr14 = atr(highs, lows, closes, 14);
  const last = closes[closes.length - 1];

  const signals: TradingSignal[] = [];

  // RSI signals
  if (rsi14 < 30) signals.push({ indicator: "RSI", signal: "BUY", strength: "STRONG", reason: `RSI ${rsi14.toFixed(1)} — oversold` });
  else if (rsi14 < 40) signals.push({ indicator: "RSI", signal: "BUY", strength: "MODERATE", reason: `RSI ${rsi14.toFixed(1)} — approaching oversold` });
  else if (rsi14 > 70) signals.push({ indicator: "RSI", signal: "SELL", strength: "STRONG", reason: `RSI ${rsi14.toFixed(1)} — overbought` });
  else if (rsi14 > 60) signals.push({ indicator: "RSI", signal: "SELL", strength: "MODERATE", reason: `RSI ${rsi14.toFixed(1)} — approaching overbought` });
  else signals.push({ indicator: "RSI", signal: "NEUTRAL", strength: "WEAK", reason: `RSI ${rsi14.toFixed(1)} — neutral zone` });

  // MACD signals
  if (macdData.histogram > 0 && macdData.macd > macdData.signal)
    signals.push({ indicator: "MACD", signal: "BUY", strength: macdData.histogram > 0.01 * last ? "STRONG" : "MODERATE", reason: "MACD above signal line — bullish crossover" });
  else if (macdData.histogram < 0)
    signals.push({ indicator: "MACD", signal: "SELL", strength: Math.abs(macdData.histogram) > 0.01 * last ? "STRONG" : "MODERATE", reason: "MACD below signal line — bearish" });

  // SMA signals
  if (last > sma20 && last > sma50) signals.push({ indicator: "SMA", signal: "BUY", strength: "MODERATE", reason: "Price above both SMA20 and SMA50 — bullish" });
  else if (last < sma20 && last < sma50) signals.push({ indicator: "SMA", signal: "SELL", strength: "MODERATE", reason: "Price below both SMA20 and SMA50 — bearish" });

  // Bollinger signals
  if (last <= bb.lower) signals.push({ indicator: "Bollinger", signal: "BUY", strength: "STRONG", reason: "Price at/below lower Bollinger Band — oversold bounce possible" });
  else if (last >= bb.upper) signals.push({ indicator: "Bollinger", signal: "SELL", strength: "STRONG", reason: "Price at/above upper Bollinger Band — overbought" });

  const buyCount = signals.filter((s) => s.signal === "BUY").length;
  const sellCount = signals.filter((s) => s.signal === "SELL").length;
  const strongBuys = signals.filter((s) => s.signal === "BUY" && s.strength === "STRONG").length;
  const strongSells = signals.filter((s) => s.signal === "SELL" && s.strength === "STRONG").length;

  let trend: TechnicalIndicators["trend"];
  if (strongBuys >= 2 || (buyCount >= 3 && strongBuys >= 1)) trend = "STRONG_UP";
  else if (buyCount > sellCount) trend = "UP";
  else if (strongSells >= 2 || (sellCount >= 3 && strongSells >= 1)) trend = "STRONG_DOWN";
  else if (sellCount > buyCount) trend = "DOWN";
  else trend = "NEUTRAL";

  return {
    rsi14: parseFloat(rsi14.toFixed(2)),
    macd: parseFloat(macdData.macd.toFixed(4)),
    macdSignal: parseFloat(macdData.signal.toFixed(4)),
    macdHistogram: parseFloat(macdData.histogram.toFixed(4)),
    sma20: parseFloat(sma20.toFixed(2)),
    sma50: parseFloat(sma50.toFixed(2)),
    ema9: parseFloat(ema9v[ema9v.length - 1].toFixed(2)),
    bollingerUpper: parseFloat(bb.upper.toFixed(2)),
    bollingerLower: parseFloat(bb.lower.toFixed(2)),
    bollingerMid: parseFloat(bb.mid.toFixed(2)),
    atr14: parseFloat(atr14.toFixed(4)),
    trend,
    signals,
  };
}

function buildSummary(ind: TechnicalIndicators): string {
  const buySignals = ind.signals.filter((s) => s.signal === "BUY").length;
  const sellSignals = ind.signals.filter((s) => s.signal === "SELL").length;
  const trendEmoji = { STRONG_UP: "🟢🟢", UP: "🟢", NEUTRAL: "⚪", DOWN: "🔴", STRONG_DOWN: "🔴🔴" }[ind.trend];
  return `Overall: ${trendEmoji} ${ind.trend} | BUY signals: ${buySignals} | SELL signals: ${sellSignals} | RSI: ${ind.rsi14} | MACD: ${ind.macdHistogram > 0 ? "+" : ""}${ind.macdHistogram.toFixed(4)}`;
}
