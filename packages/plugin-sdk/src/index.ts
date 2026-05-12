// ============================================================
// 🦅 @open-talons/plugin-sdk
// Public API for plugin authors. Re-exports core types + helpers.
// ============================================================

import type {
  PluginDefinition, ToolDefinition, AgentDefinition,
  ToolContext, ToolResult, LLMTool, ProviderName,
} from "@open-talons/core";

export type {
  PluginDefinition, ToolDefinition, AgentDefinition,
  ToolContext, ToolResult, LLMTool, ProviderName,
};

export function definePlugin(plugin: PluginDefinition): PluginDefinition {
  return plugin;
}

export function defineTool<TInput extends Record<string, unknown> = Record<string, unknown>>(
  tool: {
    name: string;
    description: string;
    inputSchema: LLMTool["input_schema"];
    handler: (input: TInput, ctx: ToolContext) => Promise<ToolResult>;
    category?: string;
    permission?: "read" | "write" | "execute" | "external" | "trade";
  }
): ToolDefinition {
  return tool as ToolDefinition;
}

export function defineAgent(agent: AgentDefinition): AgentDefinition {
  return agent;
}

export function inputSchema(
  props: Record<string, { type: string; description?: string; enum?: string[]; items?: unknown }>,
  required: string[] = []
): LLMTool["input_schema"] {
  return { type: "object", properties: props, required };
}
