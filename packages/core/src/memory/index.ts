// ============================================================
// 🦅 @open-talons/core — Memory System
// ============================================================

import * as fs from "fs";
import * as path from "path";
import { MemoryItem } from "../types";

export class MemoryManager {
  private items: MemoryItem[] = [];
  private filePath: string;
  private maxItems: number;
  private enabled: boolean;

  constructor(options: { file?: string; maxItems?: number; enabled?: boolean } = {}) {
    this.filePath = options.file || ".talons_memory.json";
    this.maxItems = options.maxItems || 100;
    this.enabled = options.enabled ?? true;
    this.load();
  }

  private load(): void {
    if (!this.enabled || !fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      this.items = JSON.parse(raw);
    } catch {
      this.items = [];
    }
  }

  private save(): void {
    if (!this.enabled) return;
    try {
      const dir = path.dirname(this.filePath);
      if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2));
    } catch {
      /* fail silently */
    }
  }

  add(type: string, prompt: string, response: string, tags: string[] = [], toolsUsed: string[] = []): void {
    if (!this.enabled) return;
    const item: MemoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type,
      prompt: prompt.slice(0, 500),
      response: response.slice(0, 500),
      tags,
      toolsUsed,
    };
    this.items.unshift(item);
    if (this.items.length > this.maxItems) this.items = this.items.slice(0, this.maxItems);
    this.save();
  }

  search(query: string, limit = 5): MemoryItem[] {
    const q = query.toLowerCase();
    return this.items
      .filter((i) =>
        i.prompt.toLowerCase().includes(q) ||
        i.response.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, limit);
  }

  buildContext(query: string): string {
    if (!this.enabled || this.items.length === 0) return "";
    const relevant = this.search(query, 3);
    if (!relevant.length) return "";
    const context = relevant.map((i) =>
      `[${i.type} | ${new Date(i.timestamp).toISOString().split("T")[0]}] ${i.prompt} → ${i.response.slice(0, 150)}`
    ).join("\n");
    return `\n\n<memory>Previous related context:\n${context}\n</memory>`;
  }

  clear(): void {
    this.items = [];
    this.save();
  }

  getStats() {
    const byType: Record<string, number> = {};
    for (const i of this.items) byType[i.type] = (byType[i.type] || 0) + 1;
    return { total: this.items.length, byType, maxItems: this.maxItems };
  }

  getAll(): MemoryItem[] {
    return [...this.items];
  }
}
