import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";
import { searchTweets, getTwitterProfile, getCryptoTwitterSentiment } from "./tools";

export default definePlugin({
  name: "@open-talons/plugin-twitter",
  version: "1.0.0",
  author: "Talons Protocol",
  description: "Twitter/X — sentiment, profiles, search",
  license: "MIT",
  tools: [
    defineTool({ name: "twitter_search", description: "Search tweets", inputSchema: inputSchema({ query: { type: "string", description: "Query" }, limit: { type: "number", description: "Count" } }, ["query"]), handler: async (i) => searchTweets(i.query as string, (i.limit as number) || 10), category: "social", permission: "external" }),
    defineTool({ name: "twitter_profile", description: "Get user profile", inputSchema: inputSchema({ username: { type: "string", description: "Username" } }, ["username"]), handler: async (i) => getTwitterProfile(i.username as string), category: "social", permission: "external" }),
    defineTool({ name: "crypto_twitter_sentiment", description: "Twitter sentiment for crypto", inputSchema: inputSchema({ coin: { type: "string", description: "Coin" } }, ["coin"]), handler: async (i) => getCryptoTwitterSentiment(i.coin as string), category: "social", permission: "external" }),
  ],
  agents: [defineAgent({ mode: "twitter", icon: "🐦", name: "Twitter Agent", systemPrompt: "🐦 Open Talons Twitter/X Agent. Find tweets, profiles, sentiment.", allowedTools: ["twitter_search", "twitter_profile", "crypto_twitter_sentiment"] })],
});
