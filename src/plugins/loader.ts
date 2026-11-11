import * as fs from "node:fs";
import * as path from "node:path";
import type { CharGenPlugin, PluginMeta, PluginType, PluginLanguage } from "./api";
import { pluginRegistry } from "./registry";
import { BUILTIN_PLUGINS } from "./builtin";
import { executeJsPlugin, executeLuaPlugin } from "./runner";

const PLUGINS_DIR = path.resolve(process.cwd(), "plugins", "installed");

/**
 * Parses header comments from a script file:
 * -- @id: my_plugin
 * -- @name: My Plugin
 * -- @type: enhancer
 * -- @version: 1.0.0
 * -- @description: Some description
 */
function parseScriptHeaders(
  content: string,
  lang: "js" | "lua"
): Partial<PluginMeta> {
  const meta: Partial<PluginMeta> = {};
  const lines = content.split("\n").slice(0, 30);
  const commentPrefix = lang === "lua" ? /^--\s*@(\w+):\s*(.*)$/ : /^\/\/\s*@(\w+):\s*(.*)$/;

  for (const line of lines) {
    const match = line.trim().match(commentPrefix);
    if (match) {
      const key = match[1].toLowerCase();
      const val = match[2].trim();
      if (key === "id") meta.id = val;
      if (key === "name") meta.name = val;
      if (key === "type") meta.type = val as PluginType;
      if (key === "version") meta.version = val;
      if (key === "description") meta.description = val;
      if (key === "author") meta.author = val;
    }
  }

  return meta;
}

/**
 * Creates a CharGenPlugin wrapper around an external JavaScript file.
 */
function createJsPluginWrapper(filePath: string, fileContent: string): CharGenPlugin {
  const fileName = path.basename(filePath);
  const parsedHeader = parseScriptHeaders(fileContent, "js");
  const id = parsedHeader.id || `js_${fileName.replace(/\.js$/, "")}`;

  const meta: PluginMeta = {
    id,
    name: parsedHeader.name || fileName.replace(/\.js$/, ""),
    version: parsedHeader.version || "1.0.0",
    description: parsedHeader.description || `Custom JavaScript plugin from ${fileName}`,
    author: parsedHeader.author || "User",
    type: parsedHeader.type || "enhancer",
    language: "javascript",
    enabled: true,
    isBuiltin: false,
    filePath,
  };

  return {
    meta,
    onEnhance: async (char, opts) => executeJsPlugin(fileContent, "onEnhance", [char, opts]),
    onGenerate: async (ctx) => executeJsPlugin(fileContent, "onGenerate", [ctx]),
    onExport: async (char, format) => executeJsPlugin(fileContent, "onExport", [char, format]),
    onValidate: async (char) => executeJsPlugin(fileContent, "onValidate", [char]),
    onImport: async (raw, format) => executeJsPlugin(fileContent, "onImport", [raw, format]),
    onPipeline: async (ctx) => executeJsPlugin(fileContent, "onPipeline", [ctx]),
  };
}

/**
 * Creates a CharGenPlugin wrapper around an external Lua file.
 */
function createLuaPluginWrapper(filePath: string, fileContent: string): CharGenPlugin {
  const fileName = path.basename(filePath);
  const parsedHeader = parseScriptHeaders(fileContent, "lua");
  const id = parsedHeader.id || `lua_${fileName.replace(/\.lua$/, "")}`;

  const meta: PluginMeta = {
    id,
    name: parsedHeader.name || fileName.replace(/\.lua$/, ""),
    version: parsedHeader.version || "1.0.0",
    description: parsedHeader.description || `Custom Lua plugin from ${fileName}`,
    author: parsedHeader.author || "User",
    type: parsedHeader.type || "enhancer",
    language: "lua",
    enabled: true,
    isBuiltin: false,
    filePath,
  };

  return {
    meta,
    onEnhance: async (char, opts) => executeLuaPlugin(filePath, "onEnhance", { character: char, options: opts }),
    onGenerate: async (ctx) => executeLuaPlugin(filePath, "onGenerate", { context: ctx }),
    onExport: async (char, format) => executeLuaPlugin(filePath, "onExport", { character: char, format }),
    onValidate: async (char) => executeLuaPlugin(filePath, "onValidate", { character: char }),
    onImport: async (raw, format) => executeLuaPlugin(filePath, "onImport", { fileContent: raw, format }),
    onPipeline: async (ctx) => executeLuaPlugin(filePath, "onPipeline", { context: ctx }),
  };
}

/**
 * Discovers and registers all builtin and installed plugins from disk.
 */
export function initializePlugins(): void {
  // 1. Register Builtins
  for (const builtin of BUILTIN_PLUGINS) {
    pluginRegistry.register(builtin);
  }

  // 2. Discover from plugins/installed/
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    return;
  }

  try {
    const files = fs.readdirSync(PLUGINS_DIR);
    for (const f of files) {
      const fullPath = path.join(PLUGINS_DIR, f);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      if (f.endsWith(".js")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const plugin = createJsPluginWrapper(fullPath, content);
        pluginRegistry.register(plugin);
      } else if (f.endsWith(".lua")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const plugin = createLuaPluginWrapper(fullPath, content);
        pluginRegistry.register(plugin);
      }
    }
  } catch (err) {
    console.warn("[PluginLoader] Failed to read plugins directory:", err);
  }
}
