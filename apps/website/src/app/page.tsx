"use client";

import { useState } from "react";
import {
  Github, Terminal, Zap, Cpu, Shield, Network, Code,
  Sparkles, Bot, ArrowRight, Copy, Check, Play, Star, Globe,
} from "lucide-react";

const AGENTS = [
  { icon: "🎒", mode: "bagsfm", name: "Bags.fm Specialist", desc: "Solana memecoin launchpad — creator fee tokens" },
  { icon: "🚀", mode: "pumpfun", name: "Pump.fun Tracker", desc: "Bonding curve memes + Raydium migrations" },
  { icon: "☀️", mode: "solana", name: "Solana Ecosystem", desc: "Jupiter, Raydium, Orca, LSTs, Drift, Kamino" },
  { icon: "🛠", mode: "soldev", name: "Solana Developer", desc: "Anchor IDL, Token-2022, cNFT, compute units" },
  { icon: "🔷", mode: "base", name: "Base Network", desc: "Clanker, Virtuals, Aerodrome" },
  { icon: "📈", mode: "crypto", name: "Crypto Markets", desc: "Prices, TA, fear & greed, trending" },
  { icon: "📊", mode: "trading", name: "Perp Trading", desc: "Hyperliquid + Lighter perp DEX (DRY_RUN)" },
  { icon: "🧮", mode: "quant", name: "Quant Lab", desc: "Strategy backtesting (EMA, RSI, MACD, BB)" },
  { icon: "🛡", mode: "security", name: "Token Security", desc: "GoPlus, RugCheck, phishing detection" },
  { icon: "🔍", mode: "research", name: "Web Researcher", desc: "Web search, RSS, news aggregation" },
  { icon: "🏦", mode: "defi", name: "DeFi Explorer", desc: "DefiLlama TVL, yields, stablecoins" },
  { icon: "🐦", mode: "twitter", name: "X Sentiment", desc: "Twitter sentiment & profile analysis" },
  { icon: "⛓", mode: "onchain", name: "On-Chain Detective", desc: "Multi-chain wallet & token analysis" },
  { icon: "🐋", mode: "whale", name: "Whale Tracker", desc: "Smart money flow, large transfers" },
  { icon: "🐙", mode: "github", name: "GitHub Suite", desc: "Repos, issues, PRs, code search" },
  { icon: "📱", mode: "telegram", name: "Telegram Bot", desc: "Send alerts, reports, notifications" },
  { icon: "🔮", mode: "macro", name: "Macro Lens", desc: "DXY, yields, indices, forex" },
  { icon: "📉", mode: "derivatives", name: "Derivatives", desc: "OI, liquidations, L/S ratio" },
  { icon: "🪂", mode: "airdrop", name: "Airdrop Hunter", desc: "Active airdrops, wallet eligibility" },
  { icon: "🐸", mode: "memescan", name: "Meme Scanner", desc: "Multi-chain meme discovery & scoring" },
  { icon: "🎨", mode: "nft", name: "NFT Agent", desc: "Floor prices, trending collections" },
  { icon: "🛸", mode: "auto", name: "Auto Pilot", desc: "All 100+ tools, agent picks automatically" },
];

const PROVIDERS = [
  { name: "Anthropic Claude", icon: "🟣", tag: "Best tool use", free: false },
  { name: "OpenAI GPT-4 / o1", icon: "🟢", tag: "All-around", free: false },
  { name: "Google Gemini", icon: "🔵", tag: "Free tier 15 RPM", free: true },
  { name: "xAI Grok", icon: "⚫", tag: "OpenAI-compatible", free: false },
  { name: "DeepSeek R1 / V3", icon: "🟡", tag: "10× cheaper", free: false },
  { name: "Mistral AI", icon: "🔴", tag: "European", free: false },
  { name: "Groq", icon: "⚡", tag: "FREE + blazing fast", free: true },
  { name: "Together AI", icon: "🟠", tag: "Open models", free: false },
  { name: "OpenRouter", icon: "🌐", tag: "1 key = 200+ models", free: false },
  { name: "Ollama", icon: "🦙", tag: "FREE + LOCAL", free: true },
  { name: "LM Studio", icon: "🖥", tag: "FREE + LOCAL", free: true },
  { name: "Perplexity", icon: "🔍", tag: "Built-in web", free: false },
];

const FEATURES = [
  { icon: Network, title: "12 LLM Providers", desc: "Bring your own LLM. Claude, OpenAI, Gemini, Grok, DeepSeek, Mistral, Groq, OpenRouter, Ollama local, LM Studio, Perplexity. Swap with one command." },
  { icon: Bot, title: "22 Specialized Agents", desc: "Crypto-first agents out of the box. Each with their own system prompt, tool set, and personality. Or write your own." },
  { icon: Code, title: "Plugin SDK", desc: "Write your own plugin in 30 lines. definePlugin / defineTool / defineAgent helpers. TypeScript types throughout." },
  { icon: Shield, title: "Permission System", desc: "allow_always / ask / deny per tool. Trading and write ops prompt before execution. Private keys never leave your machine." },
  { icon: Cpu, title: "Skills + Memory", desc: "OpenCode-style SKILL.md modularity. Per-workspace memory persisted locally. Resume sessions, build context over time." },
  { icon: Sparkles, title: "100% Open Source", desc: "MIT license. Self-hostable. Auditable. No vendor lock-in. Community plugin marketplace coming soon." },
];

const CODE_EXAMPLES = {
  cli: `# Run the interactive CLI
$ talons --agent bagsfm

  [🎒 bagsfm | claude-opus-4-5] › find trending Solana memes last hour

  ⚙ bags_trending
  ✓ bags_trending
  ⚙ bags_token_analysis
  ✓ bags_token_analysis
  ...`,
  switch: `# Switch LLM mid-session
/llm groq llama-3.3-70b-versatile     # blazing fast & free
/llm ollama llama3.2                  # totally local
/llm openrouter anthropic/claude-opus # via OpenRouter
/llm gemini gemini-2.0-flash-exp      # free tier`,
  library: `import { createTalons } from "@open-talons/core";
import bagsfmPlugin from "@open-talons/plugin-bagsfm";
import securityPlugin from "@open-talons/plugin-security";

const talons = createTalons({
  llm: { provider: "anthropic" },
}).use(bagsfmPlugin).use(securityPlugin);

const task = talons.task({
  agent: "bagsfm",
  prompt: "Find top 3 trending bags + check their safety",
});

task.on("tool_call", ({ name }) => console.log(\`→ \${name}\`));
const result = await task.run();`,
  plugin: `import { definePlugin, defineTool, defineAgent } from "@open-talons/plugin-sdk";

export default definePlugin({
  name: "my-plugin",
  version: "1.0.0",
  tools: [
    defineTool({
      name: "my_tool",
      description: "Does something useful",
      inputSchema: { type: "object", properties: {
        query: { type: "string" }
      }, required: ["query"] },
      handler: async ({ query }) => {
        return { success: true, data: { result: query } };
      },
    }),
  ],
  agents: [defineAgent({
    mode: "myagent",
    icon: "🎯",
    systemPrompt: "You are a custom agent...",
    allowedTools: ["my_tool"],
  })],
});`,
};

export default function Home() {
  const [activeCode, setActiveCode] = useState<keyof typeof CODE_EXAMPLES>("cli");
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-bg text-white relative overflow-x-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />

      {/* Gradient orbs */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }} />
      <div className="fixed top-1/3 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)" }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-bg/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🦅</div>
            <div>
              <div className="text-lg font-bold gradient-text">Open Talons</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">by Talons Protocol</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="#agents" className="hidden md:block text-sm text-gray-400 hover:text-white transition">Agents</a>
            <a href="#providers" className="hidden md:block text-sm text-gray-400 hover:text-white transition">LLMs</a>
            <a href="#docs" className="hidden md:block text-sm text-gray-400 hover:text-white transition">Docs</a>
            <a href="https://github.com/muammeryldrm42/talonssss" target="_blank" rel="noreferrer"
               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-panel border border-border hover:border-accent transition text-sm">
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
              <span className="text-xs text-gray-500">⭐</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-panel border border-border text-xs text-gray-400">
          <span className="text-accent">●</span> v2.0 now live · 22 agents · 12 LLM providers · MIT licensed
        </div>

        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight animate-fade-in">
          <span className="gradient-text">Open Talons</span>
        </h1>

        <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light max-w-3xl mx-auto leading-relaxed">
          The <span className="gradient-text font-semibold">OpenCode</span> of crypto agents.
        </p>

        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Open-source AI agent framework with first-class crypto support.
          100+ tools, 22 agents, 12 LLM providers.
          Bring your own LLM. Bring your own plugins.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a href="https://github.com/muammeryldrm42/talonssss" target="_blank" rel="noreferrer"
             className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-accent text-white font-semibold hover:scale-105 transition">
            <Github className="w-5 h-5" /> View on GitHub <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#quickstart"
             className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-panel border border-border hover:border-accent transition font-semibold">
            <Terminal className="w-5 h-5" /> Quick Start
          </a>
        </div>

        {/* Quick start command */}
        <div className="max-w-2xl mx-auto glass rounded-xl p-1 font-mono text-sm text-left relative group">
          <button onClick={() => copy("npx @open-talons/cli")}
                  className="absolute top-3 right-3 p-2 rounded-md bg-bg/50 hover:bg-bg opacity-0 group-hover:opacity-100 transition">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
          <div className="px-5 py-4">
            <span className="text-gray-600">$ </span>
            <span className="text-accent2">npx</span>{" "}
            <span className="text-white">@open-talons/cli</span>
            <span className="text-accent ml-2">--agent bagsfm</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Why <span className="gradient-text">Open Talons</span>?
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          A modular monorepo framework. Production-ready. Crypto-first.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 transition">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents grid */}
      <section id="agents" className="max-w-7xl mx-auto px-6 py-20 relative">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          <span className="gradient-text">22</span> Specialized Agents
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          Each agent has its own system prompt, tool set, and personality. Mix and match.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AGENTS.map((a, i) => (
            <div key={a.mode} className="glass rounded-xl p-5 transition group cursor-default">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <div className="text-accent font-mono text-sm">@{a.mode}</div>
                  <div className="font-semibold text-sm">{a.name}</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LLM Providers */}
      <section id="providers" className="max-w-7xl mx-auto px-6 py-20 relative">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Bring Your Own <span className="gradient-text">LLM</span>
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          12 providers supported. From free local models to premium cloud APIs. Switch any time.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="glass rounded-xl p-4 flex items-center gap-3 transition">
              <span className="text-3xl">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className={`text-xs ${p.free ? "text-green-400" : "text-gray-500"}`}>
                  {p.free ? "✓ " : ""}{p.tag}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Code examples */}
      <section id="quickstart" className="max-w-6xl mx-auto px-6 py-20 relative">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          <span className="gradient-text">3 lines</span> to get started
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
          CLI, library, plugin — your choice. TypeScript native.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {Object.keys(CODE_EXAMPLES).map((k) => (
            <button key={k} onClick={() => setActiveCode(k as keyof typeof CODE_EXAMPLES)}
                    className={`px-4 py-2 rounded-lg text-sm font-mono transition ${
                      activeCode === k ? "bg-accent text-white" : "bg-panel border border-border text-gray-400 hover:text-white"
                    }`}>
              {k === "cli" && "🖥 CLI"}
              {k === "switch" && "🔄 Switch LLM"}
              {k === "library" && "📦 Library"}
              {k === "plugin" && "🔌 Plugin"}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl overflow-hidden relative group">
          <button onClick={() => copy(CODE_EXAMPLES[activeCode])}
                  className="absolute top-3 right-3 p-2 rounded-md bg-bg/50 hover:bg-bg opacity-0 group-hover:opacity-100 transition z-10">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
          <pre className="overflow-x-auto p-6 text-sm font-mono leading-relaxed">
            <code className="text-gray-300">{CODE_EXAMPLES[activeCode]}</code>
          </pre>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="glass rounded-2xl p-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div><div className="text-5xl font-black gradient-text mb-2">100+</div><div className="text-sm text-gray-500 uppercase tracking-wider">Tools</div></div>
          <div><div className="text-5xl font-black gradient-text mb-2">22</div><div className="text-sm text-gray-500 uppercase tracking-wider">Agents</div></div>
          <div><div className="text-5xl font-black gradient-text mb-2">12</div><div className="text-sm text-gray-500 uppercase tracking-wider">LLM Providers</div></div>
          <div><div className="text-5xl font-black gradient-text mb-2">MIT</div><div className="text-sm text-gray-500 uppercase tracking-wider">Open Source</div></div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-32 text-center relative">
        <h2 className="text-5xl md:text-7xl font-black mb-6">
          Build with <span className="gradient-text">Open Talons</span>
        </h2>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Self-hostable. MIT-licensed. Production-ready. The future of crypto AI agents is open source.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://github.com/muammeryldrm42/talonssss" target="_blank" rel="noreferrer"
             className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-accent text-white font-semibold hover:scale-105 transition">
            <Star className="w-5 h-5" /> Star on GitHub
          </a>
          <a href="https://github.com/muammeryldrm42/talonssss#readme" target="_blank" rel="noreferrer"
             className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-panel border border-border hover:border-accent transition font-semibold">
            <Globe className="w-5 h-5" /> Read the Docs
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-panel/30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🦅</span>
              <span className="font-bold text-lg gradient-text">Open Talons</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Open-source AI agent framework with first-class crypto support.
              Built by Talons Protocol.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Project</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://github.com/muammeryldrm42/talonssss" className="hover:text-white">GitHub</a></li>
              <li><a href="#agents" className="hover:text-white">Agents</a></li>
              <li><a href="#providers" className="hover:text-white">LLM Providers</a></li>
              <li><a href="#quickstart" className="hover:text-white">Quick Start</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Build</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://github.com/muammeryldrm42/talonssss/tree/main/examples" className="hover:text-white">Examples</a></li>
              <li><a href="https://github.com/muammeryldrm42/talonssss/blob/main/CONTRIBUTING.md" className="hover:text-white">Contributing</a></li>
              <li><a href="https://github.com/muammeryldrm42/talonssss/issues" className="hover:text-white">Issues</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-sm">Community</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://github.com/muammeryldrm42" className="hover:text-white">Talons Protocol</a></li>
              <li className="text-gray-600">MIT Licensed</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-gray-600">
          © 2026 Talons Protocol • <span className="gradient-text font-semibold">Cömertlik bizim markamız</span> • Built with 🦅
        </div>
      </footer>
    </main>
  );
}
