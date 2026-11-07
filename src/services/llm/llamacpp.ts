import http from "node:http";
import https from "node:https";
import type { ProviderConfig, ChatMessage, LLMCompletionOptions } from "../../types/provider";

interface OpenAIChoice {
  index: number;
  message?: {
    role: string;
    content: string;
  };
  finish_reason?: string;
}

interface OpenAIChatResponse {
  id?: string;
  choices?: OpenAIChoice[];
  error?: {
    message: string;
    type?: string;
    code?: string | number;
  };
}

const DEFAULT_TIMEOUT_MINUTES = 60; // 60 minutes default for massive local GGUF models & deep reasoning
const DEFAULT_MAX_TOKENS = 16_384;

function getRequestTimeoutMs(): number {
  const configuredMinutes = Number.parseFloat(process.env.LLAMACPP_TIMEOUT_MINUTES || "");
  const timeoutMinutes =
    Number.isFinite(configuredMinutes) && configuredMinutes > 0 ? configuredMinutes : DEFAULT_TIMEOUT_MINUTES;
  return timeoutMinutes * 60 * 1000;
}

/**
 * Executes a resilient HTTP POST to llama-server without arbitrary runtime socket timeouts.
 * Keeps socket alive and enables TCP keep-alive probes.
 */
function rawHttpPost(
  targetUrl: string,
  headers: Record<string, string>,
  bodyObj: Record<string, any>,
  timeoutMs: number
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const postData = JSON.stringify(bodyObj);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      ...headers,
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(postData)),
      "Connection": "keep-alive",
    };

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: reqHeaders,
        timeout: timeoutMs,
      },
      (res) => {
        let responseData = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 200, text: responseData });
        });
      }
    );

    // Set TCP Keep-Alive to avoid OS / socket silent drop during long thinking / reasoning loops
    req.setNoDelay(true);
    req.setSocketKeepAlive(true, 15000);

    req.on("timeout", () => {
      req.destroy(new Error(`llama-server request timed out after ${(timeoutMs / 60000).toFixed(1)}m`));
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * llama.cpp server OpenAI-compatible chat completions client.
 * Calls llama-server's /v1/chat/completions endpoint.
 *
 * Why this is superior to the legacy /completion endpoint:
 * llama-server automatically parses and evaluates the exact Jinja chat template
 * stored inside the GGUF model metadata (Gemma, Llama 3, Qwen 2.5, ChatML, Mistral,
 * Command-R, DeepSeek, etc.) without requiring brittle client-side token formatting.
 */
export async function callLlamaCpp(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  let baseUrl = config.baseUrl || process.env.LLAMACPP_BASE_URL || "http://127.0.0.1:8080";
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Auto-normalize base URL to include /v1
  const v1Base = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  const url = `${v1Base}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey && config.apiKey.trim()) {
    headers["Authorization"] = "Bearer " + config.apiKey;
  }

  // llama-server binds directly to its loaded GGUF; model string can be the configured model or "default"
  const model = config.model || "default";

  // Local models (like Gemma 2, Llama 3) perform best at 0.65 - 0.75 temperature
  const temperature = options.temperature ?? config.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? config.maxTokens ?? DEFAULT_MAX_TOKENS;

  const body: Record<string, any> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  if (config.topP !== undefined) {
    body.top_p = config.topP;
  }

  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const timeoutMs = getRequestTimeoutMs();
  const startTime = Date.now();
  let resText = "";
  let resStatus = 200;

  try {
    const rawRes = await rawHttpPost(url, headers, body, timeoutMs);
    resStatus = rawRes.status;
    resText = rawRes.text;
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime;
    const elapsedMinutes = (elapsedMs / 60000).toFixed(1);
    const errorMessage = String(err?.message || "").toLowerCase();
    const isTimeout =
      err?.name === "TimeoutError" ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("etimedout");

    if (isTimeout) {
      throw new Error(
        `llama-server request timed out after ${elapsedMinutes}m (configured limit: ${timeoutMs / 60000}m) at ${url}. ` +
          "The server may still be generating; increase LLAMACPP_TIMEOUT_MINUTES if needed."
      );
    }
    throw new Error(
      `Failed to connect to llama-server at ${url} (${err.message}). Is llama-server running? Try launching it with: llama-server -m <model.gguf> --port 5001`
    );
  }

  if (resStatus < 200 || resStatus >= 300) {
    let parsedMessage = resText;
    try {
      const errJson = JSON.parse(resText);
      if (errJson?.error?.message) {
        parsedMessage = errJson.error.message;
      }
    } catch {
      // Keep resText as is
    }
    throw new Error(`llama-server API error [${resStatus} from ${url}]: ${parsedMessage}`);
  }

  let data: OpenAIChatResponse;
  try {
    data = JSON.parse(resText) as OpenAIChatResponse;
  } catch (err: any) {
    throw new Error(`Failed to parse JSON response from llama-server: ${err.message}. Raw text: ${resText.slice(0, 300)}`);
  }

  if (data.error) {
    throw new Error(`llama-server error: ${data.error.message}`);
  }

  const reply = data.choices?.[0]?.message?.content;
  if (reply === undefined || reply === null) {
    throw new Error(`llama-server returned no completion content in choices[0].message. Response: ${JSON.stringify(data)}`);
  }

  return reply;
}
