// ============================================================
// 🦅 @open-talons/core — Talons workspace (v2)
// ============================================================

import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { ProviderName, PluginDefinition, TaskOptions, WorkspaceContext, PermissionHandler } from "../types";
import { PluginRegistry } from "../plugins/registry";
import { MemoryManager } from "../memory";
import { PermissionManager } from "../permissions/manager";
import { Task } from "./task";

export interface TalonsOptions {
  llm?: { provider?: ProviderName; model?: string };
  plugins?: (PluginDefinition | string)[];
  workspace?: { id?: string; path?: string };
  memory?: { enabled?: boolean; maxItems?: number; file?: string };
  permissions?: { handler?: PermissionHandler };
}

export class Talons {
  private registry: PluginRegistry;
  private memory?: MemoryManager;
  private workspace: WorkspaceContext;
  private defaultLLM: { provider: ProviderName; model?: string };
  private permissionManager: PermissionManager;
  private _pendingPlugins: string[] = [];

  constructor(options: TalonsOptions = {}) {
    this.registry = new PluginRegistry();
    this.defaultLLM = {
      provider: options.llm?.provider || (process.env.LLM_PROVIDER as ProviderName) || "anthropic",
      model: options.llm?.model,
    };

    const wsId = options.workspace?.id || "default";
    const wsPath = options.workspace?.path || path.join(os.homedir(), ".open-talons", wsId);
    if (!fs.existsSync(wsPath)) fs.mkdirSync(wsPath, { recursive: true });
    this.workspace = { id: wsId, path: wsPath, data: {} };

    if (options.memory?.enabled !== false) {
      this.memory = new MemoryManager({
        file: options.memory?.file || path.join(wsPath, "memory.json"),
        maxItems: options.memory?.maxItems || 100,
        enabled: options.memory?.enabled ?? true,
      });
    }

    this.permissionManager = new PermissionManager({ handler: options.permissions?.handler });

    for (const p of options.plugins || []) {
      if (typeof p === "string") this._pendingPlugins.push(p);
      else this.registry.register(p);
    }
  }

  async loadPlugins(): Promise<void> {
    for (const name of this._pendingPlugins) await this.registry.loadPackage(name);
    this._pendingPlugins = [];
  }

  use(plugin: PluginDefinition): this {
    this.registry.register(plugin);
    return this;
  }

  task(opts: TaskOptions): Task {
    return new Task(opts, {
      registry: this.registry,
      memory: this.memory,
      workspace: this.workspace,
      defaultLLM: this.defaultLLM,
      permissions: this.permissionManager,
      talons: this,
    });
  }

  async run(opts: TaskOptions): Promise<string> {
    const task = this.task(opts);
    const result = await task.run();
    if (!result.success) throw new Error(result.error || "Task failed");
    return result.output;
  }

  listPlugins() { return this.registry.listPlugins(); }
  listAgents() { return this.registry.listAgents(); }
  listTools() { return this.registry.listTools(); }
  listSkills() { return this.registry.listSkills(); }
  listCommands() { return this.registry.listCommands(); }
  getRegistry() { return this.registry; }
  getMemory() { return this.memory; }
  getWorkspace() { return this.workspace; }
  getDefaultLLM() { return this.defaultLLM; }
  getPermissions() { return this.permissionManager; }

  setLLM(provider: ProviderName, model?: string) {
    this.defaultLLM = { provider, model };
  }

  async runCommand(input: string, output: (msg: string) => void): Promise<boolean> {
    return this.registry.commands.tryExecute(input, this, output);
  }
}

export function createTalons(opts: TalonsOptions = {}): Talons {
  return new Talons(opts);
}
