// ============================================================
// Example: Programmatic Usage
// Use Open Talons as a library in your own Node.js apps.
// ============================================================

import { createTalons } from "@open-talons/core";
import bagsfmPlugin from "@open-talons/plugin-bagsfm";
import solanaPlugin from "@open-talons/plugin-solana";
import securityPlugin from "@open-talons/plugin-security";

async function main() {
  // Initialize Talons with chosen plugins
  const talons = createTalons({
    llm: { provider: "anthropic", model: "claude-opus-4-5" },
    // Or use a free provider:
    // llm: { provider: "groq", model: "llama-3.3-70b-versatile" },
    // Or local Ollama:
    // llm: { provider: "ollama", model: "llama3.2" },
  })
    .use(bagsfmPlugin)
    .use(solanaPlugin)
    .use(securityPlugin);

  // Run a task with the bagsfm agent
  const task = talons.task({
    agent: "bagsfm",
    prompt: "Find trending Bags.fm tokens in the last hour and analyze the top 3 for safety",
  });

  // Subscribe to events
  task.on("tool_call", ({ name, input }) => {
    console.log(`🔧 Calling: ${name}`, input);
  });
  task.on("tool_result", ({ name, result }) => {
    console.log(`${result.success ? "✓" : "✗"} ${name}`);
  });
  task.on("message", (msg) => {
    console.log("💬", msg);
  });

  // Run and get result
  const result = await task.run();
  console.log("\n✅ Task complete!");
  console.log("Output:", result.output);
  console.log("Tool calls:", result.toolCalls.length);
  console.log("Tokens used:", result.usage);
}

main().catch(console.error);
