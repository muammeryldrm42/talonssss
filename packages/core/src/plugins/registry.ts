// ============================================================
// 🦅 @open-talons/core — Plugin Registry (v2 — w/ skills + commands)
// ============================================================

import { PluginDefinition, ToolDefinition, AgentDefinition, ToolContext, SkillDefinition, SlashCommand } from "../types";
import { SkillRegistry } from "../skills/registry";
import { CommandRegistry } from "../commands/registry";

export class PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private agents: Map<string, AgentDefinition> = new Map();
  public readonly skills = new SkillRegistry();
  public readonly commands = new CommandRegistry();

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' already registered`);
    }
    this.plugins.set(plugin.name, plugin);

    for (const tool of plugin.tools || []) {
      if (this.tools.has(tool.name)) {
        console.warn(`Tool '${tool.name}' from ${plugin.name} overrides existing tool`);
      }
      this.tools.set(tool.name, tool);
    }
    for (const agent of plugin.agents || []) this.agents.set(agent.mode, agent);
    for (const skill of plugin.skills || []) this.skills.register(skill);
    for (const cmd of plugin.commands || []) this.commands.register(cmd);
  }

  async loadPackage(packageName: string): Promise<void> {
    try {
      const mod = await import(packageName);
      const plugin = (mod.default || mod) as PluginDefinition;
      if (!plugin?.name) throw new Error(`Plugin ${packageName} has no valid export`);
      this.register(plugin);
    } catch (e: any) {
      throw new Error(`Failed to load plugin ${packageName}: ${e.message}`);
    }
  }

  async initialize(ctx: ToolContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onLoad) {
        try { await plugin.onLoad(ctx); }
        catch (e) { console.warn(`Plugin ${plugin.name} onLoad failed:`, e); }
      }
    }
  }

  getTool(name: string): ToolDefinition | undefined { return this.tools.get(name); }
  getAgent(mode: string): AgentDefinition | undefined { return this.agents.get(mode); }
  listTools(): ToolDefinition[] { return Array.from(this.tools.values()); }
  listAgents(): AgentDefinition[] { return Array.from(this.agents.values()); }
  listPlugins(): PluginDefinition[] { return Array.from(this.plugins.values()); }
  listSkills(): SkillDefinition[] { return this.skills.list(); }
  listCommands(): SlashCommand[] { return this.commands.list(); }

  getToolsForAgent(mode: string): ToolDefinition[] {
    const agent = this.agents.get(mode);
    if (!agent) return [];
    if (agent.allowedTools === "*") return this.listTools();
    return agent.allowedTools.map((n) => this.tools.get(n)).filter((t): t is ToolDefinition => Boolean(t));
  }
}
