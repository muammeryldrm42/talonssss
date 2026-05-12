// ============================================================
// Example: Custom Plugin
// Shows how to write your own Open Talons plugin from scratch.
// ============================================================

import { definePlugin, defineTool, defineAgent, inputSchema } from "@open-talons/plugin-sdk";

export default definePlugin({
  name: "my-custom-plugin",
  version: "1.0.0",
  author: "your-handle",
  description: "Example custom plugin showing the plugin pattern",
  license: "MIT",

  tools: [
    defineTool({
      name: "hello_world",
      description: "Says hello to the user",
      inputSchema: inputSchema({
        name: { type: "string", description: "Name to greet" },
      }, ["name"]),
      handler: async (input, ctx) => {
        ctx.log(`Greeting ${input.name}`);
        return {
          success: true,
          data: { greeting: `Hello, ${input.name}! 🦅` },
        };
      },
      category: "example",
    }),

    defineTool({
      name: "calculate_percent",
      description: "Calculates what percent X is of Y",
      inputSchema: inputSchema({
        x: { type: "number", description: "Numerator" },
        y: { type: "number", description: "Denominator" },
      }, ["x", "y"]),
      handler: async (input) => {
        const x = input.x as number;
        const y = input.y as number;
        if (y === 0) return { success: false, error: "Division by zero" };
        return {
          success: true,
          data: {
            x, y,
            percent: ((x / y) * 100).toFixed(2) + "%",
          },
        };
      },
      category: "example",
    }),
  ],

  agents: [
    defineAgent({
      mode: "example",
      icon: "🦅",
      name: "Example Agent",
      description: "Demonstrates a custom agent",
      systemPrompt: `You are a friendly Example Agent.
Use hello_world to greet users and calculate_percent for math.
Keep responses brief and helpful.`,
      allowedTools: ["hello_world", "calculate_percent"],
    }),
  ],

  // Optional: run setup on plugin load
  onLoad: async (ctx) => {
    ctx.log("Custom plugin loaded!");
  },
});
