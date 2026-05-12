// ============================================================
// 🦅 @open-talons/plugin-bagsfm
// Bags.fm — Solana memecoin launchpad with creator fee-sharing
// ============================================================

import { definePlugin, defineTool, defineAgent, inputSchema, ToolResult } from "@open-talons/plugin-sdk";
import axios from "axios";

const DEXSCREENER = "https://api.dexscreener.com";
const SOLANA_RPC = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

// ── Tool implementations ──────────────────────────────────────────────────────

async function bagsSearchTokens(query: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/latest/dex/search`, { params: { q: query }, timeout: 10000 });
    const pairs = (r.data?.pairs || [])
      .filter((p: any) => p.chainId === "solana" && (p.dexId?.includes("meteora") || p.dexId?.includes("bags")))
      .slice(0, 15);
    return {
      success: true,
      data: {
        query,
        results: pairs.map((p: any) => ({
          name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
          priceUSD: parseFloat(p.priceUsd || "0"),
          marketCap: p.marketCap || p.fdv,
          liquidity: p.liquidity?.usd,
          volume24h: p.volume?.h24,
          change24h: p.priceChange?.h24?.toFixed(2) + "%",
          ageHours: p.pairCreatedAt ? ((Date.now() - p.pairCreatedAt) / 3600000).toFixed(1) : null,
          dexUrl: p.url,
        })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsTokenAnalysis(contractAddress: string): Promise<ToolResult> {
  try {
    const dexR = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${contractAddress}`, { timeout: 10000 });
    const pair = dexR.data?.[0];
    if (!pair) return { success: false, error: "Token not found" };

    const liquidity = pair.liquidity?.usd || 0;
    const volume24h = pair.volume?.h24 || 0;
    const buys = pair.txns?.h24?.buys || 0;
    const sells = pair.txns?.h24?.sells || 0;
    const buyPressure = buys + sells > 0 ? (buys / (buys + sells)) * 100 : 50;
    const change24h = pair.priceChange?.h24 || 0;
    const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : 0;
    const volLiqRatio = liquidity > 0 ? volume24h / liquidity : 0;

    let score = 50;
    const signals: string[] = [];
    const risks: string[] = [];

    if (liquidity > 100000) { score += 10; signals.push(`💧 Strong liquidity: $${liquidity.toLocaleString()}`); }
    else if (liquidity > 30000) { score += 5; signals.push(`💧 Decent liquidity`); }
    else { score -= 10; risks.push(`⚠️ Low liquidity: $${liquidity.toLocaleString()}`); }

    if (volLiqRatio > 5) { score += 15; signals.push(`🔥 Volume/liq: ${volLiqRatio.toFixed(1)}x`); }
    if (buyPressure > 60) { score += 12; signals.push(`🟢 Buy pressure ${buyPressure.toFixed(1)}%`); }
    else if (buyPressure < 40) { score -= 8; risks.push(`🔴 Sell pressure`); }
    if (change24h > 100) { score += 15; signals.push(`🚀 +${change24h.toFixed(1)}% 24h`); }
    else if (change24h < -50) { score -= 12; risks.push(`📉 ${change24h.toFixed(1)}% 24h`); }
    if (ageHours < 1) { score += 5; signals.push(`🆕 Brand new`); }

    score = Math.max(0, Math.min(100, score));
    const verdict = score >= 75 ? "🟢 STRONG" : score >= 60 ? "🟡 INTERESTING" : score >= 40 ? "⚪ NEUTRAL" : "🔴 AVOID";

    return {
      success: true,
      data: {
        token: { name: pair.baseToken.name, symbol: pair.baseToken.symbol, contract: contractAddress, dex: pair.dexId },
        price: { usd: parseFloat(pair.priceUsd || "0"), marketCap: pair.marketCap, change24h: change24h.toFixed(2) + "%" },
        liquidity: { usd: liquidity },
        volume: { h24: volume24h, volLiqRatio: volLiqRatio.toFixed(2) + "x" },
        activity: { buys24h: buys, sells24h: sells, buyPressure: buyPressure.toFixed(1) + "%", ageHours: ageHours.toFixed(2) },
        analysis: { score: `${Math.round(score)}/100`, verdict, signals, risks, dexUrl: pair.url },
        warning: "⚠️ Bags.fm = creator fee memecoins on Solana. High risk. DYOR.",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsTrending(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/token-boosts/latest/v1`, { timeout: 10000 });
    const boosts = (r.data || []).filter((b: any) => b.chainId === "solana").slice(0, 30);
    const enriched = await Promise.allSettled(
      boosts.map((b: any) => axios.get(`${DEXSCREENER}/tokens/v1/solana/${b.tokenAddress}`, { timeout: 8000 }))
    );
    const tokens = enriched
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value.data?.[0])
      .filter((p) => p && (p.dexId?.includes("meteora") || p.dexId?.includes("bags")))
      .slice(0, 15)
      .map((p: any) => ({
        name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
        priceUSD: parseFloat(p.priceUsd || "0"), marketCap: p.marketCap,
        volume24h: p.volume?.h24, liquidity: p.liquidity?.usd,
        change24h: p.priceChange?.h24?.toFixed(2) + "%", dexUrl: p.url,
      }));
    return { success: true, data: { trending: tokens } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsNewLaunches(maxAgeHours: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/token-profiles/latest/v1`, { timeout: 10000 });
    const profiles = (r.data || []).filter((p: any) => p.chainId === "solana").slice(0, 30);
    const pairs = await Promise.allSettled(
      profiles.map((p: any) => axios.get(`${DEXSCREENER}/tokens/v1/solana/${p.tokenAddress}`, { timeout: 8000 }))
    );
    const cutoff = Date.now() - maxAgeHours * 3600000;
    const fresh = pairs
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value.data?.[0])
      .filter((p) => p && p.pairCreatedAt > cutoff)
      .filter((p) => p.dexId?.includes("meteora") || p.dexId?.includes("bags"))
      .slice(0, 15)
      .map((p: any) => ({
        name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
        priceUSD: parseFloat(p.priceUsd || "0"), liquidity: p.liquidity?.usd,
        ageMinutes: ((Date.now() - p.pairCreatedAt) / 60000).toFixed(0), dexUrl: p.url,
      }));
    return { success: true, data: { maxAgeHours, count: fresh.length, launches: fresh } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsCreatorAnalysis(creatorAddress: string): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) {
    return { success: false, error: "HELIUS_API_KEY required" };
  }
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "searchAssets",
      params: { creatorAddress, page: 1, limit: 50, displayOptions: { showFungible: true } },
    }, { timeout: 12000 });
    const tokens = r.data?.result?.items || [];
    return {
      success: true,
      data: {
        creator: creatorAddress,
        totalTokensCreated: tokens.length,
        riskAssessment: tokens.length > 20 ? "🔴 HIGH RISK — serial creator"
                       : tokens.length > 5 ? "🟡 MODERATE"
                       : tokens.length > 0 ? "🟢 OK"
                       : "⚪ No tokens found",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default definePlugin({
  name: "@open-talons/plugin-bagsfm",
  version: "1.0.0",
  author: "Talons Protocol",
  description: "Bags.fm Solana memecoin launchpad tools",
  license: "MIT",

  tools: [
    defineTool({
      name: "bags_search",
      description: "Search Bags.fm / Meteora memecoin tokens by name or symbol on Solana.",
      inputSchema: inputSchema({ query: { type: "string", description: "Token name or symbol" } }, ["query"]),
      handler: async (input) => bagsSearchTokens(input.query as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_trending",
      description: "Trending tokens on Bags.fm and Meteora pools.",
      inputSchema: inputSchema({ timeframe: { type: "string", description: "1h, 6h, or 24h" } }),
      handler: async () => bagsTrending(),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_token_analysis",
      description: "Deep Bags.fm token analysis with 0-100 score, liquidity, buy/sell pressure, signals, risks.",
      inputSchema: inputSchema({ contract_address: { type: "string", description: "Solana mint address" } }, ["contract_address"]),
      handler: async (input) => bagsTokenAnalysis(input.contract_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_new_launches",
      description: "Newly launched Bags.fm tokens in last N hours.",
      inputSchema: inputSchema({ max_age_hours: { type: "number", description: "Max age in hours" } }),
      handler: async (input) => bagsNewLaunches((input.max_age_hours as number) || 6),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_creator_analysis",
      description: "Analyze a Bags.fm creator wallet — history of tokens, rug pattern detection.",
      inputSchema: inputSchema({ creator_address: { type: "string", description: "Solana wallet" } }, ["creator_address"]),
      handler: async (input) => bagsCreatorAnalysis(input.creator_address as string),
      category: "solana-memes",
    }),
  ],

  agents: [
    defineAgent({
      mode: "bagsfm",
      icon: "🎒",
      name: "Bags.fm Specialist",
      description: "Solana memecoin specialist for Bags.fm launchpad",
      systemPrompt: `🎒 You are Open Talons Bags.fm Specialist — an expert on the Bags.fm Solana memecoin launchpad.

Your tools:
- bags_search: find tokens by name/symbol
- bags_trending: hottest tokens right now
- bags_token_analysis: 0-100 scoring with liquidity, buy/sell pressure, signals, risks
- bags_new_launches: fresh launches (last N hours)
- bags_creator_analysis: evaluate token creator (rug history check)

Always:
- Use bags_token_analysis before recommending any token
- Combine with bags_creator_analysis for creator risk
- Show liquidity, volume/liq ratio, buy pressure, age
- ⚠️ Bags.fm = creator fee sharing memecoins. High risk, often short-lived. DYOR.

Be direct, structured, and honest about risks.`,
      allowedTools: ["bags_search", "bags_trending", "bags_token_analysis", "bags_new_launches", "bags_creator_analysis"],
    }),
  ],
});
