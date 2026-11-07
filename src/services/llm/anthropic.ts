import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";

export async function callAnthropic(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Anthropic API Key! We don't provide free AI. Enter your Anthropic key in Settings (⚙️).");
  }

  const url = "https://api.anthropic.com/v1/messages";
  const model = config.model || "claude-3-5-sonnet-20241022";

  let systemPrompt = "";
  const anthropicMessages: Array<{ role: string; content: any }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemPrompt += (typeof m.content === "string" ? m.content : JSON.stringify(m.content)) + "\n\n";
      continue;
    }

    if (typeof m.content === "string") {
      anthropicMessages.push({ role: m.role, content: m.content });
    } else if (Array.isArray(m.content)) {
      const parts: any[] = [];
      for (const p of m.content) {
        if (p.type === "text") {
          parts.push({ type: "text", text: p.text });
        } else if (p.type === "image_url") {
          const urlStr = p.image_url.url;
          const match = urlStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            });
          }
        }
      }
      anthropicMessages.push({ role: m.role, content: parts });
    }
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? config.maxTokens ?? 4096,
    temperature: options.temperature ?? config.temperature ?? 0.85,
    messages: anthropicMessages,
  };

  if (systemPrompt.trim()) {
    body.system = systemPrompt.trim();
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as any;
  const text = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("") || "";
  return text;
}
