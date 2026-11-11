import * as fs from "node:fs";
import * as path from "node:path";
import type { CharGenPlugin, PluginMeta } from "./api";
import { executeJsPlugin, executeLuaPlugin } from "./runner";

const PLUGINS_DATA_FILE = path.resolve(process.cwd(), "data", "plugins_state.json");
const INSTALLED_DIR = path.resolve(process.cwd(), "plugins", "installed");

export class PluginRegistry {
  private plugins: Map<string, CharGenPlugin> = new Map();
  private state: Record<string, { enabled: boolean; config?: Record<string, unknown> }> = {};

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(PLUGINS_DATA_FILE)) {
        const raw = fs.readFileSync(PLUGINS_DATA_FILE, "utf-8");
        this.state = JSON.parse(raw) || {};
      }
    } catch {
      this.state = {};
    }
  }

  private saveState(): void {
    try {
      const dataDir = path.dirname(PLUGINS_DATA_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(PLUGINS_DATA_FILE, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.warn("[PluginRegistry] Failed to save plugins state:", err);
    }
  }

  public register(plugin: CharGenPlugin): void {
    const id = plugin.meta.id;
    // Apply persisted state if exists
    if (this.state[id] !== undefined) {
      plugin.meta.enabled = this.state[id].enabled;
    }
    this.plugins.set(id, plugin);
  }

  public unregister(id: string): void {
    this.plugins.delete(id);
  }

  public getPlugin(id: string): CharGenPlugin | undefined {
    return this.plugins.get(id);
  }

  public getAll(): CharGenPlugin[] {
    return Array.from(this.plugins.values());
  }

  public listMeta(): PluginMeta[] {
    return Array.from(this.plugins.values()).map((p) => ({ ...p.meta }));
  }

  public setEnabled(id: string, enabled: boolean): boolean {
    const p = this.plugins.get(id);
    if (!p) return false;
    p.meta.enabled = enabled;
    this.state[id] = {
      ...(this.state[id] || {}),
      enabled,
    };
    this.saveState();
    return true;
  }

  public getPluginsByType(type: string, onlyEnabled: boolean = true): CharGenPlugin[] {
    return Array.from(this.plugins.values()).filter(
      (p) => p.meta.type === type && (!onlyEnabled || p.meta.enabled)
    );
  }
}

export const pluginRegistry = new PluginRegistry();
