import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";

export async function callOpenAICompat(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  let baseUrl = config.baseUrl;
  let apiKey = config.apiKey;

  if (config.type === "openrouter") {
    baseUrl = baseUrl || "https://openrouter.ai/api/v1";
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OpenRouter API Key! We don't provide free AI. Enter your OpenRouter key in Settings (⚙️).");
    }
  } else if (config.type === "ollama") {
    baseUrl = baseUrl || "http://localhost:11434/v1";
    apiKey = apiKey || "ollama";
  } else if (config.type === "llamacpp") {
    baseUrl = baseUrl || "http://127.0.0.1:8080/v1";
    apiKey = apiKey || "not-needed";
  } else {
    // OpenAI or custom
    baseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    apiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey && !baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
      throw new Error("Missing OpenAI API Key! We don't provide free AI. Enter your API key in Settings (⚙️).");
    }
  }

  // Trim trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}),
  };

  if (config.type === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/chargenui/chargenui";
    headers["X-Title"] = "CharGen Harness";
  }

  const model = config.model || (config.type === "ollama" ? "llama3" : "gpt-4o-mini");

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? config.temperature ?? 0.85,
    max_tokens: options.maxTokens ?? config.maxTokens ?? 4096,
  };

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI-compatible API error (${res.status} from ${url}): ${errText}`);
  }

  const data = (await res.json()) as any;
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("No completion content returned by API.");
  }

  return reply;
}
