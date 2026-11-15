// Decision Model Client & Provider Integration
// Supports Cloudflare Workers AI Clef, TypeSafe AI Jev, and custom HTTP OpenAI-compatible Decision endpoints.

import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";

export type DecisionProviderType = "disabled" | "cloudflare" | "jev" | "custom_http";
export type DecisionFallbackAction = "llm" | "cancel_step" | "pass_through";

export interface DecisionConfig {
  provider: DecisionProviderType;
  endpoint?: string;
  apiKey?: string;
  modelName?: string;
  fallbackAction?: DecisionFallbackAction;
  llmProvider?: ProviderConfig;
}

export interface DecideChoiceParams {
  state: string;
  schema: Record<string, string[]>;
  config?: DecisionConfig;
  llmProvider?: ProviderConfig;
}

export interface DecideChoiceResult {
  decision: Record<string, string>;
  probabilities?: Record<string, Record<string, number>>;
  raw?: any;
  fallbackUsed?: boolean;
}

export interface DecideScoreParams {
  statement: string;
  text: string;
  config?: DecisionConfig;
  llmProvider?: ProviderConfig;
}

export interface DecideScoreResult {
  score: number; // 0.0 to 1.0
  confidence?: number;
  raw?: any;
  fallbackUsed?: boolean;
}

function resolveDecisionConfig(custom?: DecisionConfig): DecisionConfig {
  if (custom && custom.provider) return custom;
  
  const envProvider = (process.env.DECISION_MODEL_PROVIDER as DecisionProviderType) || "disabled";
  return {
    provider: envProvider,
    endpoint: process.env.DECISION_MODEL_ENDPOINT,
    apiKey: process.env.DECISION_MODEL_API_KEY,
    modelName: process.env.DECISION_MODEL_NAME,
  };
}

/**
 * Executes a discrete typed choice evaluation against state.
 * Gracefully falls back if decision provider is not configured or network/API is inaccessible.
 */
export async function decideChoice(params: DecideChoiceParams): Promise<DecideChoiceResult> {
  const cfg = resolveDecisionConfig(params.config);
  
  // Safe default fallback generator
  const createFallback = () => {
    const fallbackDecision: Record<string, string> = {};
    for (const [key, options] of Object.entries(params.schema)) {
      fallbackDecision[key] = options[0] || "";
    }
    return { decision: fallbackDecision };
  };

  const handleFailure = async (reason: string): Promise<DecideChoiceResult> => {
    const action = cfg?.fallbackAction || "llm";
    const effectiveLLM = params.llmProvider || cfg?.llmProvider;

    if (action === "cancel_step") {
      throw new Error(`[Decision Service Inaccessible] Operation canceled per fallback settings: ${reason}`);
    }

    if (action === "llm" && effectiveLLM && effectiveLLM.type !== "none") {
      console.log(`[Decision Service] Inaccessible. Falling back to primary LLM (${effectiveLLM.model || effectiveLLM.type}) for decision...`);
      try {
        const schemaDesc = Object.entries(params.schema)
          .map(([k, opts]) => `"${k}": One of ${JSON.stringify(opts)}`)
          .join(",\n");
        const prompt = `You are a strict decision evaluator. Evaluate the following context state against the required schema keys.
CONTEXT STATE:
"""
${params.state}
"""

REQUIRED STRICT JSON OUTPUT SCHEMA:
{
${schemaDesc}
}
Output valid JSON only.`;

        const llmResult = await routeLLMJson<any>(effectiveLLM, [
          { role: "system", content: "You are a deterministic decision parser. Output only valid JSON." },
          { role: "user", content: prompt },
        ]);

        return normalizeChoiceResponse(llmResult, params.schema);
      } catch (llmErr) {
        console.warn(`[Decision Service] Primary LLM fallback decision failed:`, llmErr);
      }
    }

    // Default pass-through fallback
    return createFallback();
  };

  if (!cfg || cfg.provider === "disabled") {
    return createFallback();
  }

  try {
    const endpoint = getEndpointUrl(cfg);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cfg.apiKey) {
      headers["Authorization"] = `Bearer ${cfg.apiKey}`;
    }

    const activeModel = await resolveModelName(cfg);
    // Build standard System One questions payload
    const questionsPayload: Record<string, any> = {};
    for (const [key, options] of Object.entries(params.schema)) {
      const criteria: Record<string, string> = {};
      for (const opt of options) {
        criteria[opt] = opt;
      }
      questionsPayload[key] = {
        type: "choice",
        instructions: `Select the most accurate category for ${key}`,
        criteria,
      };
    }

    const payload: Record<string, any> = {
      model: activeModel,
      state: params.state,
      questions: questionsPayload,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s network timeout

    console.log(`[Decision Service] Sending choice request to ${endpoint} with model: ${payload.model}`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Decision Service] API returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return handleFailure(`HTTP ${res.status}`);
    }

    const data = await res.json() as any;
    return normalizeChoiceResponse(data, params.schema);
  } catch (err: any) {
    console.warn(`[Decision Service] Inaccessible or network error (${err?.message || err}). Triggering configured fallback.`);
    return handleFailure(err?.message || String(err));
  }
}

/**
 * Scores a statement's truth or degree against a given text (0.0 to 1.0).
 * Falls back to primary LLM if configured, cancels step, or passes open.
 */
export async function decideScore(params: DecideScoreParams): Promise<DecideScoreResult> {
  const cfg = resolveDecisionConfig(params.config);

  const handleScoreFailure = async (reason: string): Promise<DecideScoreResult> => {
    const action = cfg?.fallbackAction || "llm";
    const effectiveLLM = params.llmProvider || cfg?.llmProvider;

    if (action === "cancel_step") {
      throw new Error(`[Decision Service Inaccessible] Score check canceled per fallback settings: ${reason}`);
    }

    if (action === "llm" && effectiveLLM && effectiveLLM.type !== "none") {
      console.log(`[Decision Service] Inaccessible. Falling back to primary LLM (${effectiveLLM.model || effectiveLLM.type}) for statement scoring...`);
      try {
        const prompt = `You are a strict calibration evaluator.
STATEMENT TO EVALUATE:
"${params.statement}"

EVALUATION TEXT:
"""
${params.text}
"""

Task: Rate the truth/confidence of the statement against the text on a scale from 0.00 to 1.00.
Output STRICT JSON: { "score": 0.85 }`;

        const llmResult = await routeLLMJson<any>(effectiveLLM, [
          { role: "system", content: "You are a calibration evaluator. Output strict JSON only." },
          { role: "user", content: prompt },
        ]);

        if (typeof llmResult?.score === "number") {
          return { score: Math.max(0, Math.min(1, llmResult.score)), fallbackUsed: true };
        }
      } catch (llmErr) {
        console.warn(`[Decision Service] Primary LLM fallback score failed:`, llmErr);
      }
    }

    // Default pass-through
    return { score: 1.0, fallbackUsed: true };
  };

  if (!cfg || cfg.provider === "disabled") {
    return { score: 1.0 }; // Default pass when disabled
  }

  try {
    const endpoint = getEndpointUrl(cfg);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cfg.apiKey) {
      headers["Authorization"] = `Bearer ${cfg.apiKey}`;
    }

    const activeModel = await resolveModelName(cfg);
    const payload: Record<string, any> = {
      model: activeModel,
      state: params.text,
      questions: {
        score: {
          type: "noul",
          instructions: params.statement,
        },
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    console.log(`[Decision Service] Sending score request to ${endpoint} with model: ${payload.model}`);
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Decision Service] Score API returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return handleScoreFailure(`HTTP ${res.status}`);
    }

    const data = await res.json() as any;
    return normalizeScoreResponse(data);
  } catch (err: any) {
    console.warn(`[Decision Service] Score API inaccessible (${err?.message || err}). Triggering configured fallback.`);
    return handleScoreFailure(err?.message || String(err));
  }
}

// Cache for auto-discovered models per endpoint
const endpointModelCache = new Map<string, string>();

async function resolveModelName(cfg: DecisionConfig): Promise<string> {
  if (cfg.modelName && cfg.modelName.trim()) {
    return cfg.modelName.trim();
  }

  // 1. Cloudflare Workers AI standard model
  if (cfg.provider === "cloudflare") {
    return "@cf/cloudflare/clef-flash";
  }

  // 2. Official TypeSafe Jev API standard model
  if (cfg.provider === "jev") {
    return "jev-latest";
  }

  // 3. Custom / Local HTTP endpoint: auto-discover from /v1/models if available, or use cached
  const endpoint = getEndpointUrl(cfg);
  if (endpointModelCache.has(endpoint)) {
    return endpointModelCache.get(endpoint)!;
  }

  try {
    const origin = new URL(endpoint).origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${origin}/v1/models`, {
      method: "GET",
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const data = await res.json() as any;
      const modelsList = data?.data || data?.models || (Array.isArray(data) ? data : []);
      if (Array.isArray(modelsList) && modelsList.length > 0) {
        const first = modelsList[0];
        const discoveredId = typeof first === "string" ? first : first?.id || first?.name;
        if (discoveredId) {
          console.log(`[Decision Service] Auto-discovered local decision model: ${discoveredId}`);
          endpointModelCache.set(endpoint, discoveredId);
          return discoveredId;
        }
      }
    }
  } catch (_) {
    // If auto-discovery fails or endpoint doesn't serve /v1/models, fall through to smart fallback
  }

  // If local / custom, default to jevos-v5 (or clef if clef is specified in endpoint URL)
  const defaultLocal = endpoint.toLowerCase().includes("clef") ? "clef" : "jevos-v5";
  endpointModelCache.set(endpoint, defaultLocal);
  return defaultLocal;
}

function getEndpointUrl(cfg: DecisionConfig): string {
  if (cfg.endpoint && cfg.endpoint.trim()) {
    let ep = cfg.endpoint.trim();
    // If user provided base URL without path (e.g. http://localhost:8017 or http://localhost:8017/)
    if (!ep.includes("/v1/") && !ep.endsWith("/systemone")) {
      ep = ep.replace(/\/+$/, "") + "/v1/systemone";
    }
    return ep;
  }
  if (cfg.provider === "cloudflare") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/clef-flash`;
  }
  if (cfg.provider === "jev") {
    return "https://api.typesafe.ai/v1/systemone";
  }
  return "http://localhost:8017/v1/systemone";
}

function normalizeChoiceResponse(data: any, schema: Record<string, string[]>): DecideChoiceResult {
  const decision: Record<string, string> = {};
  const probabilities: Record<string, Record<string, number>> = {};

  // Standard System One returns answers in `answers` or `responses` or `decision`
  const answers = data?.answers || data?.questions || data?.decision || data?.result || data?.choices || data;
  for (const [key, allowed] of Object.entries(schema)) {
    const rawEntry = answers?.[key];
    const rawVal = typeof rawEntry === "string" 
      ? rawEntry 
      : rawEntry?.choice || rawEntry?.value || rawEntry?.answer;

    if (typeof rawVal === "string" && allowed.includes(rawVal)) {
      decision[key] = rawVal;
    } else {
      decision[key] = allowed[0] || "";
    }
  }

  const rawProbs = data?.probabilities || data?.confidence || {};
  if (rawProbs && typeof rawProbs === "object") {
    for (const [key, probs] of Object.entries(rawProbs)) {
      if (typeof probs === "object" && probs !== null) {
        probabilities[key] = probs as Record<string, number>;
      }
    }
  }

  return { decision, probabilities, raw: data };
}

function normalizeScoreResponse(data: any): DecideScoreResult {
  if (typeof data?.score === "number") {
    return { score: Math.max(0, Math.min(1, data.score)), raw: data };
  }

  // Standard System One noul returns `answers.score.probability` or `answers.score.value`
  const scoreAnswer = data?.answers?.score || data?.questions?.score || data?.score;
  if (typeof scoreAnswer?.probability === "number") {
    return { score: Math.max(0, Math.min(1, scoreAnswer.probability)), raw: data };
  }
  if (typeof scoreAnswer?.p_true === "number") {
    return { score: Math.max(0, Math.min(1, scoreAnswer.p_true)), raw: data };
  }
  if (typeof scoreAnswer?.value === "boolean") {
    return { score: scoreAnswer.value ? 1.0 : 0.0, raw: data };
  }
  if (typeof scoreAnswer === "boolean") {
    return { score: scoreAnswer ? 1.0 : 0.0, raw: data };
  }
  
  // If returned probabilities for true/false or noul
  const probs = data?.probabilities?.score || data?.probabilities || {};
  if (typeof probs?.true === "number") {
    return { score: Math.max(0, Math.min(1, probs.true)), raw: data };
  }
  if (typeof probs?.yes === "number") {
    return { score: Math.max(0, Math.min(1, probs.yes)), raw: data };
  }

  // If choice decision was true
  const decisionVal = data?.decision?.score || data?.result?.score;
  if (decisionVal === "true" || decisionVal === true) {
    return { score: 1.0, raw: data };
  }
  if (decisionVal === "false" || decisionVal === false) {
    return { score: 0.0, raw: data };
  }

  return { score: 0.5, raw: data };
}
