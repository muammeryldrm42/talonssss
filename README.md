<div align="center">

# 🦅 Open Talons

**Open-source AI agent framework with first-class crypto support.**

100+ tools • 22 agents • 12 LLM providers

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E=18-blue.svg)](#)
[![pnpm](https://img.shields.io/badge/pnpm-monorepo-orange.svg)](#)

Built by [Talons Protocol](https://github.com/muammeryldrm42)

</div>

---

## 🎯 What is Open Talons?

A modular monorepo AI agent framework — the OpenCode of crypto agents. **Bring your own LLM. Bring your own plugins. Bring your own agents.**

12 LLM providers (Claude, OpenAI, Gemini, Grok, DeepSeek, Mistral, Groq, Together, OpenRouter, **Ollama (local)**, **LM Studio (local)**, Perplexity). Swap with one command.

First release ships with a complete **crypto agent suite** (Bags.fm, Pump.fun, Solana, Trading, etc.) ported from Terminal of UFO, refactored into 20 reusable plugins. Framework is general-purpose.

---

## ⚡ 22 Agents

| Agent | Icon | Specialty |
|-------|------|-----------|
| bagsfm | 🎒 | **Bags.fm Solana memecoin launchpad** (creator fees) |
| pumpfun | 🚀 | **Pump.fun bonding curve + Raydium migrations** |
| solana | ☀️ | Jupiter, Raydium, Orca, LSTs, Drift, Kamino, Helius |
| soldev | 🛠 | Anchor IDL, Token-2022, cNFT, compute units |
| base | 🔷 | Clanker, Virtuals AI agents, Aerodrome |
| crypto | 📈 | Prices, TA, fear & greed |
| trading | 📊 | Hyperliquid + Lighter perp DEX (DRY_RUN default) |
| quant | 🧮 | Strategy backtesting (EMA, RSI, MACD, BB) |
| security | 🛡 | GoPlus, RugCheck (Solana), phishing |
| research | 🔍 | Web search, RSS, news |
| defi | 🏦 | DefiLlama TVL, yields, stablecoins |
| twitter | 🐦 | X sentiment, profiles |
| onchain | ⛓ | ETH/Base/Solana wallets |
| whale | 🐋 | Whale alerts, smart money flow |
| github | 🐙 | Repos, issues, PRs |
| telegram | 📱 | Bot integration |
| macro | 🔮 | DXY, yields, indices, forex |
| derivatives | 📉 | OI, liquidations, L/S |
| airdrop | 🪂 | Airdrop radar, eligibility |
| memescan | 🐸 | Multi-chain meme discovery |
| auto | 🛸 | All 100+ tools auto |

---

## 🚀 Quick Start

```bash
git clone https://github.com/muammeryldrm42/open-talons
cd open-talons
pnpm install
pnpm build

cp .env.example .env  # set at least ONE LLM key
pnpm dev
```

**Cheapest (free) setup:**
```
GEMINI_API_KEY=...    # 15 RPM free
GROQ_API_KEY=...      # free + fast
HELIUS_API_KEY=...    # Solana, free 100k credits/day
```

Or local: `ollama serve` → `OLLAMA_HOST=http://localhost:11434`

---

## 💻 Usage

```bash
# Interactive
talons --agent bagsfm

# Switch LLM mid-session
/llm groq llama-3.3-70b-versatile
/llm ollama llama3.2

# One-shot
talons --agent solana --query "TPS + Raydium top pools"

# As library
import { createTalons } from "@open-talons/core";
import bagsfmPlugin from "@open-talons/plugin-bagsfm";
const t = createTalons({ llm: { provider: "anthropic" } }).use(bagsfmPlugin);
await t.run({ agent: "bagsfm", prompt: "trending tokens" });
```

---

## 🔌 Write Your Own Plugin

```typescript
import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";

export default definePlugin({
  name: "my-plugin",
  version: "1.0.0",
  tools: [
    defineTool({
      name: "my_tool",
      description: "Does something useful",
      inputSchema: inputSchema({ q: { type: "string", description: "Query" } }, ["q"]),
      handler: async ({ q }) => ({ success: true, data: { result: q } }),
    }),
  ],
  agents: [defineAgent({ mode: "myagent", icon: "🎯", systemPrompt: "...", allowedTools: ["my_tool"] })],
});
```

---

## 📦 Repo Layout

```
open-talons/
├── apps/
│   ├── cli/                  # 🦅 Interactive REPL
│   └── website/              # Marketing site (Next.js)
├── packages/
│   ├── core/                 # Runtime, providers, plugins, skills, perms
│   ├── plugin-sdk/           # For plugin authors
│   └── plugins/
│       ├── bagsfm/  pumpfun/  solana/  solana-dev/  base-meme/
│       ├── crypto/  trading/  strategies/  security/  research/  defi/
│       ├── twitter/  onchain/  whale/  github/  telegram/
│       └── macro/  derivatives/  airdrop/  memescan/
├── examples/
└── docs/
```

---

## 🛡 Safety

- **All trading defaults to DRY_RUN** — set `HL_LIVE_TRADING=true` only when ready
- **Permission system** — tools tagged `write`/`execute`/`trade` prompt before running
- **Private keys local** — only `.env`
- **Memory local** — `~/.open-talons/<ws>/memory.json`

---

## 🛣 Roadmap

- [x] Multi-LLM core
- [x] Plugin SDK + 20 crypto plugins
- [x] Permission + Skills system
- [x] Slash commands
- [x] CLI
- [ ] Sub-agent orchestrator
- [ ] Streaming responses
- [ ] MCP integration
- [ ] Web dashboard
- [ ] General-purpose plugins (filesystem, shell, image gen, voice)
- [ ] VSCode extension
- [ ] Plugin marketplace

---

## 📜 License

MIT — see [LICENSE](LICENSE).

Built with ❤️ by [@muammeryldrm42](https://github.com/muammeryldrm42) under Talons Protocol 🦅

*"Cömertlik bizim markamız."*
