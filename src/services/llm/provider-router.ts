import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";
import { callGemini } from "./gemini";
import { callOpenAICompat } from "./openai-compat";
import { callAnthropic } from "./anthropic";
import { callLlamaCpp } from "./llamacpp";
import { safeParseJson } from "./json-repair";
import { getCachedResponse, setCachedResponse } from "./llm-cache";

/**
 * Strips markdown code fences from JSON output and runs multi-pass resilient recovery.
 */
export function extractCleanJson(raw: string): any {
  return safeParseJson(raw);
}

export async function routeLLMCompletion(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  if (!config || config.type === "none" || !config.type) {
    throw new Error(
      "🤡 Did you seriously think we were running a free AI charity? You haven't configured any provider or API key! We are not offering free AI tokens. Go open Settings (⚙️) and enter your own API key (Gemini, OpenRouter, Anthropic, OpenAI) or hook up local llama.cpp / Ollama!"
    );
  }

  // 1. Check persistent response cache (instant hit on retry / server restart)
  const cached = getCachedResponse(config, messages, options);
  if (cached !== null) {
    console.log(`[LLMCache] ⚡ Cache HIT for ${config.type}:${config.model || "default"} (${messages.length} msgs)`);
    return cached;
  }

  let result: string;
  switch (config.type) {
    case "gemini":
      result = await callGemini(config, messages, options);
      break;
    case "anthropic":
      result = await callAnthropic(config, messages, options);
      break;
    case "llamacpp":
      result = await callLlamaCpp(config, messages, options);
      break;
    case "openrouter":
    case "ollama":
    case "openai":
    default:
      result = await callOpenAICompat(config, messages, options);
      break;
  }

  // 2. Persist newly fetched result to cache
  if (result && result.trim()) {
    setCachedResponse(config, messages, options, result);
  }

  return result;
}

export async function routeLLMJson<T = any>(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<T> {
  const raw = await routeLLMCompletion(config, messages, { ...options, jsonMode: true });
  return extractCleanJson(raw) as T;
}

export interface CallProviderWithJsonRepairParams {
  provider: ProviderConfig;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Convenience helper wrapping routeLLMJson with system/user prompt formatting and standard options.
 */
export async function callProviderWithJsonRepair<T = any>(
  params: CallProviderWithJsonRepairParams
): Promise<{ data: T; raw?: string }> {
  const messages: ChatMessage[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.userPrompt });

  const data = await routeLLMJson<T>(params.provider, messages, {
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });

  return { data };
}
