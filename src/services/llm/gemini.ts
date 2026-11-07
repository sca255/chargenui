import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";

export async function callGemini(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key! We don't provide free AI. Go to Settings (⚙️) and enter your own Google Gemini API key or set GEMINI_API_KEY in .env.");
  }

  const model = (config.model || "gemini-2.5-flash").replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Extract system message
  let systemInstructionText = "";
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemInstructionText += (typeof m.content === "string" ? m.content : JSON.stringify(m.content)) + "\n\n";
      continue;
    }

    const parts: Array<Record<string, unknown>> = [];
    if (typeof m.content === "string") {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p.type === "text") {
          parts.push({ text: p.text });
        } else if (p.type === "image_url") {
          const urlStr = p.image_url.url;
          if (urlStr.startsWith("data:")) {
            const matches = urlStr.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inline_data: {
                  mime_type: matches[1],
                  data: matches[2],
                },
              });
            }
          }
        }
      }
    }

    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  // Safety settings: BLOCK_NONE for completely uncensored creative synthesis
  const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
  ];

  const body: Record<string, unknown> = {
    contents,
    safetySettings,
    generationConfig: {
      temperature: options.temperature ?? config.temperature ?? 0.85,
      maxOutputTokens: options.maxTokens ?? config.maxTokens ?? 8192,
    },
  };

  if (systemInstructionText.trim()) {
    body.system_instruction = {
      parts: [{ text: systemInstructionText.trim() }],
    };
  }

  if (options.jsonMode) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as any;
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No response candidate returned by Gemini API. Check prompt or token limit.");
  }

  const partText = candidate.content?.parts?.map((p: any) => p.text || "").join("") || "";
  return partText;
}
