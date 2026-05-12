import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";
import { clankerTrending, virtualsAgents, aerodromeTopPools, baseTrending } from "./tools";

export default definePlugin({
  name: "@open-talons/plugin-base-meme", version: "1.0.0", author: "Talons Protocol",
  description: "Base network memes — Clanker, Virtuals AI agents, Aerodrome", license: "MIT",
  tools: [
    defineTool({ name: "clanker_trending", description: "Trending Clanker meme tokens (Farcaster-launched)", inputSchema: inputSchema({}), handler: async () => clankerTrending(), category: "base" }),
    defineTool({ name: "virtuals_agents", description: "Top Virtuals.io AI agent tokens", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => virtualsAgents((i.limit as number) || 20), category: "base" }),
    defineTool({ name: "aerodrome_pools", description: "Aerodrome Finance top pools on Base", inputSchema: inputSchema({}), handler: async () => aerodromeTopPools(), category: "base" }),
    defineTool({ name: "base_trending", description: "Trending tokens on Base network", inputSchema: inputSchema({}), handler: async () => baseTrending(), category: "base" }),
  ],
  agents: [defineAgent({ mode: "base", icon: "🔷", name: "Base Network Agent", systemPrompt: "🔷 Open Talons Base Agent. Clanker memes, Virtuals AI agents, Aerodrome pools.", allowedTools: ["clanker_trending", "virtuals_agents", "aerodrome_pools", "base_trending"] })],
});
