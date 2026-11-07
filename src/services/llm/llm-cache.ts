import * as path from "node:path";
import * as fs from "node:fs";
import { createHash } from "node:crypto";
import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "llm-response-cache.json");

interface CacheEntry {
  response: string;
  timestamp: string;
  providerType: string;
  model?: string;
  promptPreview: string;
}

let memoryCache: Record<string, CacheEntry> | null = null;
let useCacheEnabled: boolean = true;

function ensureCacheLoaded(): Record<string, CacheEntry> {
  if (memoryCache !== null) return memoryCache;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      memoryCache = JSON.parse(raw);
    } else {
      memoryCache = {};
    }
  } catch (e) {
    console.warn("[LLMCache] Failed reading cache file, starting fresh:", e);
    memoryCache = {};
  }
  return memoryCache!;
}

function persistCache(): void {
  if (!memoryCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2), "utf-8");
  } catch (e) {
    console.warn("[LLMCache] Failed persisting cache:", e);
  }
}

/**
 * Computes a deterministic SHA256 key for provider, messages, and options.
 */
export function computeCacheKey(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): string {
  const normMessages = messages.map((m) => ({
    role: m.role,
    content: (m.content || "").trim(),
  }));

  const keyPayload = {
    providerType: config.type,
    model: config.model || "",
    jsonMode: Boolean(options.jsonMode),
    temperature: options.temperature != null ? Number(options.temperature.toFixed(2)) : undefined,
    messages: normMessages,
  };

  return createHash("sha256").update(JSON.stringify(keyPayload)).digest("hex");
}

export function isLlmCacheEnabled(): boolean {
  return useCacheEnabled;
}

export function setLlmCacheEnabled(enabled: boolean): void {
  useCacheEnabled = Boolean(enabled);
}

export function getCachedResponse(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): string | null {
  if (!useCacheEnabled) return null;
  const cache = ensureCacheLoaded();
  const key = computeCacheKey(config, messages, options);
  const entry = cache[key];
  if (entry && typeof entry.response === "string") {
    return entry.response;
  }
  return null;
}

export function setCachedResponse(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions,
  response: string
): void {
  if (!response || !response.trim()) return;
  const cache = ensureCacheLoaded();
  const key = computeCacheKey(config, messages, options);

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const promptPreview = lastUserMsg?.content
    ? (lastUserMsg.content.slice(0, 100) + (lastUserMsg.content.length > 100 ? "..." : ""))
    : "Prompt";

  cache[key] = {
    response,
    timestamp: new Date().toISOString(),
    providerType: config.type,
    model: config.model,
    promptPreview,
  };

  persistCache();
}

export function clearLlmCache(): { cleared: number } {
  ensureCacheLoaded();
  const count = Object.keys(memoryCache || {}).length;
  memoryCache = {};
  persistCache();
  return { cleared: count };
}

export function getLlmCacheStats(): {
  enabled: boolean;
  totalEntries: number;
  cacheFile: string;
} {
  const cache = ensureCacheLoaded();
  return {
    enabled: useCacheEnabled,
    totalEntries: Object.keys(cache).length,
    cacheFile: CACHE_FILE,
  };
}
