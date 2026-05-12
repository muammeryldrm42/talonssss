// ============================================================
// 🛸 Terminal of UFO — DeFi Analysis Tool (DefiLlama)
// No API key required — all public endpoints
// ============================================================

import axios from "axios";
import { ToolResult } from "@open-talons/plugin-sdk";

const LLAMA = "https://api.llama.fi";
const YIELDS = "https://yields.llama.fi";

// ── Protocols ─────────────────────────────────────────────────────────────────

export async function getTopDeFiProtocols(limit = 15): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/protocols`, { timeout: 12000 });
    const protocols = r.data
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, limit)
      .map((p: {
        name: string; tvl: number; chain: string; category: string;
        change_1d: number; change_7d: number; chains: string[]; url: string;
      }, i: number) => ({
        rank: i + 1,
        name: p.name,
        tvl: formatUSD(p.tvl),
        tvlRaw: p.tvl,
        chain: p.chain,
        category: p.category,
        change1d: (p.change_1d || 0).toFixed(2) + "%",
        change7d: (p.change_7d || 0).toFixed(2) + "%",
        chains: p.chains?.slice(0, 4),
        url: p.url,
      }));

    const totalTVL = r.data.reduce((a: number, p: { tvl: number }) => a + (p.tvl || 0), 0);

    return {
      success: true,
      data: { totalDeFiTVL: formatUSD(totalTVL), protocols },
    };
  } catch (e: unknown) {
    return { success: false, error: `DeFi protocols: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getProtocolDetails(protocolSlug: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/protocol/${protocolSlug}`, { timeout: 12000 });
    const p = r.data;

    // Get recent TVL history
    const tvlHistory = (p.tvl || []).slice(-14).map((t: { date: number; totalLiquidityUSD: number }) => ({
      date: new Date(t.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      tvl: formatUSD(t.totalLiquidityUSD),
    }));

    return {
      success: true,
      data: {
        name: p.name,
        description: p.description?.slice(0, 300),
        category: p.category,
        chains: p.chains?.slice(0, 8),
        currentTVL: formatUSD(p.currentChainTvls ? Object.values(p.currentChainTvls).reduce((a: number, v) => a + (v as number), 0) : 0),
        change1d: (p.change_1d || 0).toFixed(2) + "%",
        change7d: (p.change_7d || 0).toFixed(2) + "%",
        tvlHistory: tvlHistory.slice(-7),
        twitter: p.twitter,
        website: p.url,
        github: p.github,
        audit: p.audit_links,
        forkedFrom: p.forkedFrom,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Protocol details: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getChainTVL(chain?: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/v2/chains`, { timeout: 12000 });
    const chains = r.data
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl);

    if (chain) {
      const found = chains.find((c: { name: string }) =>
        c.name.toLowerCase() === chain.toLowerCase()
      );
      if (!found) return { success: false, error: `Chain "${chain}" not found` };
      return {
        success: true,
        data: {
          chain: found.name,
          tvl: formatUSD(found.tvl),
          protocols: found.protocols,
          change1d: (found.change_1d || 0).toFixed(2) + "%",
          change7d: (found.change_7d || 0).toFixed(2) + "%",
        },
      };
    }

    return {
      success: true,
      data: {
        topChains: chains.slice(0, 12).map((c: {
          name: string; tvl: number; protocols: number;
          change_1d: number; change_7d: number;
        }, i: number) => ({
          rank: i + 1,
          chain: c.name,
          tvl: formatUSD(c.tvl),
          protocols: c.protocols,
          change1d: (c.change_1d || 0).toFixed(2) + "%",
          change7d: (c.change_7d || 0).toFixed(2) + "%",
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Chain TVL: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getTopYieldFarms(chain?: string, minApy = 5, limit = 15): Promise<ToolResult> {
  try {
    const r = await axios.get(`${YIELDS}/pools`, { timeout: 15000 });
    let pools = r.data.data || [];

    if (chain) {
      pools = pools.filter((p: { chain: string }) =>
        p.chain.toLowerCase() === chain.toLowerCase()
      );
    }

    const filtered = pools
      .filter((p: { apy: number; tvlUsd: number; status: string }) =>
        p.apy >= minApy && p.tvlUsd > 100000 && p.status !== "OLD"
      )
      .sort((a: { tvlUsd: number }, b: { tvlUsd: number }) => b.tvlUsd - a.tvlUsd)
      .slice(0, limit)
      .map((p: {
        project: string; chain: string; symbol: string; apy: number;
        apyBase: number; apyReward: number; tvlUsd: number;
        ilRisk: string; exposure: string; poolMeta: string;
      }) => ({
        project: p.project,
        chain: p.chain,
        pool: p.symbol,
        apy: p.apy?.toFixed(2) + "%",
        apyBase: p.apyBase?.toFixed(2) + "%",
        apyReward: p.apyReward?.toFixed(2) + "%",
        tvl: formatUSD(p.tvlUsd),
        ilRisk: p.ilRisk,
        exposure: p.exposure,
        meta: p.poolMeta,
      }));

    return { success: true, data: { chain: chain || "All chains", minApy: minApy + "%", pools: filtered } };
  } catch (e: unknown) {
    return { success: false, error: `Yield farms: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getDeFiNews(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://defillama.com/news", { timeout: 10000 });
    // DefiLlama doesn't have a public news API, use RSS
    const rssR = await axios.get("https://rss.app/feeds/defi-news.xml", { timeout: 8000 });
    return { success: true, data: { note: "Use search_news tool with topic 'DeFi' for latest news" } };
  } catch {
    return { success: true, data: { note: "Use search_news tool with topic 'DeFi TVL protocol' for latest news" } };
  }
}

// ── Stablecoins ───────────────────────────────────────────────────────────────

export async function getStablecoinStats(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/stablecoins?includePrices=true`, { timeout: 12000 });
    const stables = r.data.peggedAssets || [];

    const top = stables
      .sort((a: { circulating: { peggedUSD: number } }, b: { circulating: { peggedUSD: number } }) =>
        (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0)
      )
      .slice(0, 10)
      .map((s: {
        name: string; symbol: string; pegType: string; pegMechanism: string;
        circulating: { peggedUSD: number }; price: number; chains: string[];
      }) => ({
        name: s.name,
        symbol: s.symbol,
        pegType: s.pegType,
        mechanism: s.pegMechanism,
        marketCap: formatUSD(s.circulating?.peggedUSD || 0),
        price: s.price?.toFixed(4),
        chains: s.chains?.length,
      }));

    const totalMcap = stables.reduce(
      (a: number, s: { circulating: { peggedUSD: number } }) => a + (s.circulating?.peggedUSD || 0), 0
    );

    return {
      success: true,
      data: { totalStablecoinMcap: formatUSD(totalMcap), topStablecoins: top },
    };
  } catch (e: unknown) {
    return { success: false, error: `Stablecoins: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSD(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
