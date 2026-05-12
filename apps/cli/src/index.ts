#!/usr/bin/env node
// ============================================================
// 🦅 Open Talons CLI v2.0 — unified UFO + Open Talons
// 22 plugins, 100+ tools, 12 LLM providers
// ============================================================

import "dotenv/config";
import * as readline from "readline";
import { program } from "commander";
import { createTalons, PROVIDER_INFO, getProvider, ProviderName } from "@open-talons/core";

// All built-in plugins
import bagsfmPlugin from "@open-talons/plugin-bagsfm";
import pumpfunPlugin from "@open-talons/plugin-pumpfun";
import solanaPlugin from "@open-talons/plugin-solana";
import solanaDevPlugin from "@open-talons/plugin-solana-dev";
import baseMemePlugin from "@open-talons/plugin-base-meme";
import cryptoPlugin from "@open-talons/plugin-crypto";
import tradingPlugin from "@open-talons/plugin-trading";
import strategiesPlugin from "@open-talons/plugin-strategies";
import securityPlugin from "@open-talons/plugin-security";
import researchPlugin from "@open-talons/plugin-research";
import defiPlugin from "@open-talons/plugin-defi";
import twitterPlugin from "@open-talons/plugin-twitter";
import onchainPlugin from "@open-talons/plugin-onchain";
import whalePlugin from "@open-talons/plugin-whale";
import githubPlugin from "@open-talons/plugin-github";
import telegramPlugin from "@open-talons/plugin-telegram";
import macroPlugin from "@open-talons/plugin-macro";
import derivativesPlugin from "@open-talons/plugin-derivatives";
import airdropPlugin from "@open-talons/plugin-airdrop";
import memescanPlugin from "@open-talons/plugin-memescan";

// Display
const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  white: (s: string) => `\x1b[37m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  purple: (s: string) => `\x1b[35m${s}${RESET}`,
};

function banner() {
  console.log(c.cyan(c.bold(`
   ____                    _____      _                    
  / __ \\___  ___ ___      /__   \\__ _| | ___  _ __  ___    
 | |  | |  \\/ -_) _ \\ _____ / /\\/ _\` | |/ _ \\| '_ \\/ __|   
 | |__| |   |\\___|  ./|_____/ /\\| (_| | | (_) | | | \\__ \\   
  \\____/|_|        |_|       \\/  \\__,_|_|\\___/|_| |_|___/   
`)));
  console.log(c.dim("       Open-source AI agent framework • Crypto-first • Multi-LLM\n"));
}

program.name("talons").description("🦅 Open Talons CLI v2").version("2.0.0")
  .option("-a, --agent <mode>", "Agent mode", "auto")
  .option("-p, --provider <provider>", "LLM provider")
  .option("--model <model>", "Model name")
  .option("-q, --query <query>", "Single query mode")
  .option("--list-providers", "List LLM providers")
  .option("--list-agents", "List agents")
  .option("--list-tools", "List tools")
  .parse(process.argv);

const opts = program.opts();

// Permission handler for "ask" prompts
async function permissionHandler(req: { toolName: string; level: string; input?: Record<string, unknown> }): Promise<boolean> {
  console.log("\n" + c.amber(`  ⚠ Tool '${req.toolName}' wants to execute (${req.level} permission)`));
  console.log(c.dim(`    Input: ${JSON.stringify(req.input).slice(0, 100)}`));
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(c.amber("    Approve? [y/N] "), (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "y");
    });
  });
}

// Build Talons
const talons = createTalons({
  llm: { provider: opts.provider as ProviderName, model: opts.model },
  permissions: { handler: permissionHandler as any },
})
  .use(bagsfmPlugin).use(pumpfunPlugin).use(solanaPlugin).use(solanaDevPlugin).use(baseMemePlugin)
  .use(cryptoPlugin).use(tradingPlugin).use(strategiesPlugin).use(securityPlugin).use(researchPlugin)
  .use(defiPlugin).use(twitterPlugin).use(onchainPlugin).use(whalePlugin).use(githubPlugin)
  .use(telegramPlugin).use(macroPlugin).use(derivativesPlugin).use(airdropPlugin).use(memescanPlugin);

// Info commands
if (opts.listProviders) {
  console.log("\n  🦅 LLM Providers:\n");
  (Object.keys(PROVIDER_INFO) as ProviderName[]).forEach((p) => {
    const info = PROVIDER_INFO[p];
    const available = getProvider(p).isAvailable();
    console.log(`  ${available ? c.green("●") : c.dim("○")} ${c.cyan(p.padEnd(12))} ${c.white(info.name.padEnd(30))} ${c.dim(info.pricing)}`);
    if (!available) console.log(`     ${c.dim("→ " + info.envKey)}`);
  });
  console.log();
  process.exit(0);
}

if (opts.listAgents) {
  console.log("\n  🦅 Available Agents (" + talons.listAgents().length + "):\n");
  for (const agent of talons.listAgents()) {
    console.log(`  ${agent.icon || "🛸"} ${c.cyan(agent.mode.padEnd(14))} ${c.white(agent.name || "")}`);
  }
  console.log();
  process.exit(0);
}

if (opts.listTools) {
  console.log("\n  🦅 Tools (" + talons.listTools().length + " total):\n");
  for (const tool of talons.listTools()) {
    console.log(`  ${c.cyan(tool.name.padEnd(28))} ${c.dim(tool.description.slice(0, 60))}`);
  }
  console.log();
  process.exit(0);
}

// Check provider availability
const llm = talons.getDefaultLLM();
const llmProvider = getProvider(llm.provider);
if (!llmProvider.isAvailable()) {
  console.error("\n" + c.red(`  ✗ Provider ${llm.provider} not configured.\n`));
  console.log(c.dim("  Set one in .env:\n"));
  console.log(c.amber("    ANTHROPIC_API_KEY    (Claude — best)"));
  console.log(c.amber("    GEMINI_API_KEY       (free)"));
  console.log(c.amber("    GROQ_API_KEY         (free + fast)"));
  console.log(c.amber("    DEEPSEEK_API_KEY     (cheap)"));
  console.log(c.dim("\n  Or run 'talons --list-providers' for all options\n"));
  process.exit(1);
}

const ICONS: Record<string, string> = {
  auto: "🛸", chat: "🤖", research: "🔍", crypto: "📈", trading: "📊",
  bagsfm: "🎒", pumpfun: "🚀", solana: "☀️", soldev: "🛠", base: "🔷",
  defi: "🏦", security: "🛡", onchain: "⛓", whale: "🐋", twitter: "🐦",
  github: "🐙", telegram: "📱", macro: "🔮", derivatives: "📉",
  airdrop: "🪂", memescan: "🐸", quant: "🧮",
};

async function main(): Promise<void> {
  banner();
  let mode = opts.agent as string;
  console.log(c.dim(`  Active LLM: `) + c.cyan(llm.provider) + c.dim(" → ") + c.amber(llm.model || llmProvider.defaultModel));
  console.log(c.dim(`  Plugins:    ${talons.listPlugins().length}  •  Tools: ${talons.listTools().length}  •  Agents: ${talons.listAgents().length}`));
  console.log();

  if (opts.query) {
    await runQuery(mode, opts.query);
    process.exit(0);
  }

  // Show agent grid
  console.log(c.bold(c.white("  🦅 22 Agents:\n")));
  const agents = talons.listAgents();
  const cols = 2;
  for (let i = 0; i < agents.length; i += cols) {
    const row = agents.slice(i, i + cols);
    const cells = row.map((a) => `${a.icon || "🛸"} ${c.cyan(("@" + a.mode).padEnd(13))} ${c.dim((a.name || a.mode).padEnd(22))}`);
    console.log("  " + cells.join("  "));
  }
  console.log();
  console.log(c.dim("  Commands: ") + c.amber("/llm /agents /tools /providers /skills /perms /clear exit"));
  console.log(c.dim("  Prefix:   ") + c.amber("@bagsfm @solana @trading @twitter @whale @github ..."));
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (): Promise<string> => new Promise((res) => {
    const icon = ICONS[mode] || "🛸";
    process.stdout.write(c.purple(c.bold(`\n  [${icon} ${mode} | ${talons.getDefaultLLM().provider}] `)) + c.white("› "));
    rl.once("line", (l) => res(l.trim()));
  });

  while (true) {
    let input: string;
    try { input = await ask(); } catch { break; }
    if (!input) continue;

    if (["exit", "quit", "bye"].includes(input.toLowerCase())) {
      console.log("\n" + c.green("  Open Talons signing off. 🦅\n"));
      rl.close();
      process.exit(0);
    }

    // Slash commands
    if (input.startsWith("/llm ")) {
      const parts = input.split(/\s+/);
      const newProvider = parts[1] as ProviderName;
      const newModel = parts[2];
      if (!PROVIDER_INFO[newProvider]) {
        console.log(c.red(`  ✗ Unknown provider: ${newProvider}`));
        continue;
      }
      if (!getProvider(newProvider).isAvailable()) {
        console.log(c.red(`  ✗ ${newProvider} not configured. Set ${PROVIDER_INFO[newProvider].envKey}`));
        continue;
      }
      talons.setLLM(newProvider, newModel);
      console.log(c.green(`  ✓ Now using ${newProvider}${newModel ? " (" + newModel + ")" : ""}`));
      continue;
    }

    if (input === "/agents") {
      console.log("\n  " + c.bold("Agents:"));
      for (const agent of talons.listAgents()) {
        console.log(`  ${agent.icon || "🛸"} ${c.cyan(("@" + agent.mode).padEnd(14))} ${c.dim(agent.name || agent.mode)}`);
      }
      continue;
    }

    if (input === "/tools") {
      console.log("\n  " + c.bold("Tools (" + talons.listTools().length + "):"));
      for (const tool of talons.listTools()) {
        console.log(`  ${c.cyan(tool.name.padEnd(28))}  ${c.dim(tool.description.slice(0, 60))}`);
      }
      continue;
    }

    if (input === "/providers" || input === "/list") {
      (Object.keys(PROVIDER_INFO) as ProviderName[]).forEach((p) => {
        const available = getProvider(p).isAvailable();
        console.log(`  ${available ? c.green("●") : c.dim("○")} ${c.cyan(p.padEnd(12))} ${PROVIDER_INFO[p].name}`);
      });
      continue;
    }

    if (input === "/plugins") {
      console.log("\n  " + c.bold("Plugins (" + talons.listPlugins().length + "):"));
      for (const p of talons.listPlugins()) {
        console.log(`  ${c.cyan(p.name)} ${c.dim("v" + p.version)} — ${c.white(p.description || "")}`);
      }
      continue;
    }

    if (input === "/clear") { console.clear(); banner(); continue; }
    if (input === "/help") {
      console.log(c.dim("\n  /llm /agents /tools /plugins /providers /clear /help exit"));
      console.log(c.dim("  Or use @<agent> prefix: @bagsfm find trending tokens"));
      continue;
    }

    // Agent prefix parsing
    let query = input;
    const allModes = talons.listAgents().map((a) => a.mode).join("|");
    const re = new RegExp(`^@(${allModes})\\s+(.+)`, "i");
    const m = input.match(re);
    if (m) { mode = m[1].toLowerCase(); query = m[2]; }

    await runQuery(mode, query);
  }
}

async function runQuery(mode: string, query: string): Promise<void> {
  console.log("\n" + c.dim("  ────────────────────────────────────────────────"));
  console.log(c.amber("  ◆ ") + c.white(query));
  console.log(c.dim("  ────────────────────────────────────────────────"));

  const spinner = setInterval(() => process.stdout.write(c.dim(".")), 500);
  try {
    const task = talons.task({ agent: mode === "auto" ? undefined : mode, prompt: query });
    task.on("tool_call", (e: any) => {
      process.stdout.write("\n");
      clearInterval(spinner as any);
      console.log(c.cyan("  ⚙ ") + c.dim(`${e.name}`));
    });
    task.on("tool_result", (e: any) => {
      const status = e.result.success ? c.green("✓") : c.red("✗");
      console.log(`  ${status} ${c.dim(e.name)}`);
    });
    const result = await task.run();
    clearInterval(spinner as any);
    process.stdout.write("\n");
    if (result.output) console.log("\n" + c.white(result.output));
    else if (result.error) console.log("\n" + c.red("  ✗ " + result.error));
    if (result.usage) console.log(c.dim(`\n  Tokens: ${result.usage.totalInputTokens} in / ${result.usage.totalOutputTokens} out`));
  } catch (e: any) {
    clearInterval(spinner as any);
    console.log("\n" + c.red("  ✗ " + e.message));
  }
  console.log(c.dim("  ────────────────────────────────────────────────"));
}

main().catch((e) => { console.error(c.red("\n  ✗ " + e.message + "\n")); process.exit(1); });
