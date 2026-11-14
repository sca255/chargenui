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

    const payload: Record<string, any> = {
      state: params.state,
      schema: params.schema,
    };
    if (cfg.modelName) {
      payload.model = cfg.modelName;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s network timeout

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

    const payload: Record<string, any> = {
      state: params.text,
      question: params.statement,
      schema: {
        score: ["true", "false"],
      },
    };
    if (cfg.modelName) {
      payload.model = cfg.modelName;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

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

function getEndpointUrl(cfg: DecisionConfig): string {
  if (cfg.endpoint && cfg.endpoint.trim()) {
    return cfg.endpoint.trim();
  }
  if (cfg.provider === "cloudflare") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/cloudflare/clef-flash`;
  }
  if (cfg.provider === "jev") {
    return "https://api.typesafe.ai/v1/decide";
  }
  return "http://localhost:8000/v1/decide";
}

function normalizeChoiceResponse(data: any, schema: Record<string, string[]>): DecideChoiceResult {
  const decision: Record<string, string> = {};
  const probabilities: Record<string, Record<string, number>> = {};

  const sourceDecision = data?.decision || data?.result || data?.choices || data;
  for (const [key, allowed] of Object.entries(schema)) {
    const rawVal = sourceDecision?.[key];
    if (typeof rawVal === "string" && allowed.includes(rawVal)) {
      decision[key] = rawVal;
    } else {
      decision[key] = allowed[0] || "";
    }
  }

  if (data?.probabilities && typeof data.probabilities === "object") {
    for (const [key, probs] of Object.entries(data.probabilities)) {
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
  
  // If returned probabilities for true/false
  const probs = data?.probabilities?.score || data?.probabilities || {};
  if (typeof probs?.true === "number") {
    return { score: Math.max(0, Math.min(1, probs.true)), raw: data };
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
