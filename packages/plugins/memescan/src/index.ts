import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";
import { searchMemeTokens, getTrendingMemeTokens, getMemeTokenSignals, getNewMemeTokens } from "./tools";

export default definePlugin({
  name: "@open-talons/plugin-memescan", version: "1.0.0", author: "Talons Protocol",
  description: "Multi-chain meme scanner with 0-100 signal scoring", license: "MIT",
  tools: [
    defineTool({ name: "meme_search", description: "Search meme tokens by name/symbol", inputSchema: inputSchema({ query: { type: "string", description: "Query" } }, ["query"]), handler: async (i) => searchMemeTokens(i.query as string), category: "memes" }),
    defineTool({ name: "meme_trending", description: "Trending meme tokens", inputSchema: inputSchema({ chain: { type: "string", description: "solana|ethereum|base|all" } }), handler: async (i) => getTrendingMemeTokens((i.chain as any) || "all"), category: "memes" }),
    defineTool({ name: "meme_signals", description: "0-100 signal score for a meme token", inputSchema: inputSchema({ token: { type: "string", description: "Symbol or contract" } }, ["token"]), handler: async (i) => getMemeTokenSignals(i.token as string), category: "memes" }),
    defineTool({ name: "meme_new", description: "Newly launched meme tokens", inputSchema: inputSchema({ chain: { type: "string", description: "Chain" }, max_age_hours: { type: "number", description: "Max age" } }), handler: async (i) => getNewMemeTokens((i.chain as any) || "solana", (i.max_age_hours as number) || 24), category: "memes" }),
  ],
  agents: [defineAgent({ mode: "memescan", icon: "🐸", name: "Meme Scanner", systemPrompt: "🐸 Open Talons Meme Scanner — multi-chain meme discovery. ALWAYS use token_security from plugin-security before recommending.", allowedTools: ["meme_search", "meme_trending", "meme_signals", "meme_new"] })],
});
