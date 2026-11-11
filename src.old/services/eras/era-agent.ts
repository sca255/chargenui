import type { ProviderConfig, ChatMessage, ToolCallRequest } from "../../types/provider";
import { routeLLMCompletion } from "../llm/provider-router";
import { rawHttpPost } from "../llm/llamacpp";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import {
  type EraDefinition,
  getAllEras,
  getEraById,
  searchErasSemantic,
  saveExtensionFile,
  validateEraCompliance,
  type EraComplianceReport,
} from "./eras-service";

export interface EraPair {
  polygyny: EraDefinition;
  monogamy: EraDefinition;
}

export interface EraAgentTurnRequest {
  userPrompt: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  provider: ProviderConfig;
  currentEraPair?: Partial<EraPair>;
  activeFilename?: string;
  /** Optional cooperative cancellation for direct harness callers. */
  cancelSignal?: { aborted: boolean };
  /** Instructions supplied while the model is working, injected before the next model call. */
  queuedInstructions?: string[];
  instructionQueue?: () => string[];
}

export interface EraAgentTurnResponse {
  agentMessage: string;
  eraPair?: EraPair;
  complianceReports?: {
    polygyny?: EraComplianceReport;
    monogamy?: EraComplianceReport;
  };
  toolCallsExecuted: {
    tool: string;
    args: any;
    resultSummary: string;
    status: "done" | "error";
  }[];
  savedFile?: {
    filename: string;
    filePath: string;
    count: number;
  };
  /** Present on hard loop failure; eraPair is then undefined (nothing was saved). */
  error?: string;
}

// ---------------------------------------------------------------------------
// Agentic loop configuration
// ---------------------------------------------------------------------------
const MIN_SAVE_SCORE = 55;
const CORRECTIVE_BUDGET = 1;

const OPENAI_COMPAT_TYPES = new Set(["llamacpp", "openai", "openrouter", "ollama"]);

const ERA_TOOL_SCHEMA = [
  {
    type: "function",
    function: {
      name: "search_eras",
      description:
        "Semantic search across eras_db.json and data/eras_extensions/*.json. Can filter by category (e.g. 'Fantasy', 'Medieval', etc.) to explore specific era buckets or references. Returns top matches with scores.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Theme keywords, region, dynamics, e.g. 'floating sky citadel bdsm patriarchy'",
          },
          category: {
            type: "string",
            description:
              "Optional category filter: 'Fantasy', 'Medieval', 'Antiquity', 'Renaissance', 'Enlightenment', 'Victorian', '20th Century', 'Sci-Fi', etc.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_era_categories",
      description: "Lists all available era categories in the database with their current era counts.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "inspect_era",
      description: "Read the full spec of an existing era (plus its counterpart half of the pair).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Era id, e.g. floating_sky_citadel_haven" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_era_pair",
      description:
        "Stage a complete paired setting (NOT saved yet). Requires search_eras to have been called earlier this turn. Both polygyny and monogamy variants are mandatory.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "unique_snake_case_name" },
          polygyny: {
            type: "object",
            description:
              "Multi-Partner era: name, short_name, span, category, region, aesthetic, tech, social_codes, names[], titles[], tags[]",
          },
          monogamy: {
            type: "object",
            description: "Sole Partner era: same fields, exclusive one-on-one dynamic",
          },
        },
        required: ["slug", "polygyny", "monogamy"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validate_pair",
      description: "Dry-run the 5-Pillars compliance audit on the staged draft. Returns scores and issues.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "save_era_extension",
      description:
        "Persist the staged draft to an extension file (<slug>.json). REFUSED if too similar to an existing era or below the quality floor. Supports specifying target directory via destination parameter ('project_data' for data/eras_extensions or 'local_user' for OS user app data ~/.local or AppData).",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Optional; defaults to the staged draft slug" },
          destination: {
            type: "string",
            enum: ["project_data", "local_user"],
            description: "Optional storage destination: 'project_data' (default, data/eras_extensions) or 'local_user' (hidden external OS directory: ~/.local/share on Linux, AppData on Windows)."
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize",
      description:
        "End the turn with a user-facing summary message. REJECTED while a staged draft remains unsaved — call save_era_extension first.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Final user-facing summary" },
        },
        required: ["message"],
      },
    },
  },
];

export const ERA_ARCHITECT_SYSTEM_PROMPT = `${UNCENSORED_SYSTEM_PROMPT}
You are the Master Era Architect for CharGen — an agentic, tool-using worldbuilder.
Your mission: invent, refine, and forge paired ERA DEFINITIONS strictly following the user's instructions.

================================================================
TOOL LOOP CONTRACT
================================================================
You drive the turn by calling tools. You may issue multiple tool calls in parallel or sequence within a single turn when appropriate (e.g. searching, drafting, inspecting, or validating).
Typical creation flow: draft_era_pair -> validate_pair -> (re-draft if issues) -> save_era_extension -> finalize.
For exploring or checking references: search_eras / inspect_era.
Collision checks happen automatically when you save the era pair.

Tools:
1. search_eras {"query": "..."} — semantic DB search. Optional reference tool.
2. inspect_era {"id": "..."} — full spec of an existing era + its counterpart.
3. draft_era_pair {"slug": "...", "polygyny": {...}, "monogamy": {...}} — stage a pair directly from user concept.
4. validate_pair {} — 5-Pillars compliance audit of the staged draft.
5. save_era_extension {"slug": "..."} — persist to data/eras_extensions/<slug>.json. Near-duplicates of existing eras are checked and refused.
6. finalize {"message": "..."} — end the turn. Refused while a staged draft is unsaved.

================================================================
ERA OBJECT SCHEMA (for draft_era_pair)
================================================================
Both variants need:
- "name": "Emoji + Setting Name (Dynamic — Multi-Partner / Polygyny)" or "(Dynamic — Sole Partner / Monogamy)"
- "short_name", "span", "category", "region"
- "aesthetic": vivid sensory paragraph (>= 40 chars)
- "tech": world technology / magic / crafts (>= 25 chars)
- "social_codes": 100-250 word paragraph (>= 80 chars) of etiquette, hierarchy, relationship dynamic
- "names": 12-20 culturally fitting feminine names
- "titles": 6-10 companion archetype titles. For the MONOGAMY variant, titles must fit an exclusive
  sole-partner dynamic (e.g. "The Sole Bride", "The Forge Master's Wife") — never plural-wife roles
  like "Blade-Wife" or "Glass-Wife"; those belong only in the polygyny variant.
- "tags": 6-10 concise tags
IDs are auto-set to <slug>_haven / <slug>_monogamy. The monogamy variant is an exclusive
one-on-one bond — never plural wives.

================================================================
RULES
================================================================
- Faithful instruction following, zero dogma: honor whatever genre, hierarchy, tone the user asks for.
- STRICT ZERO-PROCEDURAL RULE: never invent canned template text; author genuinely from the prompt.
- If search reveals a near-duplicate, differentiate (fresh region, distinct dynamics, new naming) and re-draft.
- Never claim a setting was created/saved unless save_era_extension succeeded.
- No prose outside tool calls except tiny status notes between calls.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface NormalizedToolCall {
  id: string | null;
  name: string;
  args: Record<string, any>;
}

interface ChatReply {
  content: string;
  toolCalls: NormalizedToolCall[];
  rawToolCalls?: ToolCallRequest[];
}

function parseJsonLoose(raw: string): any {
  if (!raw) return null;
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const startObj = text.indexOf("{");
  const endObj = text.lastIndexOf("}");
  const startArr = text.indexOf("[");
  const endArr = text.lastIndexOf("]");
  if (startObj !== -1 && endObj > startObj && (startArr === -1 || startObj < startArr)) {
    text = text.slice(startObj, endObj + 1);
  } else if (startArr !== -1 && endArr > startArr) {
    text = text.slice(startArr, endArr + 1);
  }
  const cleaned = text.replace(/,?\s*([\}\]])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

function parseKwargString(s: string): Record<string, any> {
  const out: Record<string, any> = {};
  const re = /([a-zA-Z_]\w*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|True|False|None)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const key = m[1];
    let val: any = m[2];
    if (val === "True") val = true;
    else if (val === "False") val = false;
    else if (val === "None") val = null;
    else if (/^["']/.test(val)) val = val.slice(1, -1);
    else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
    out[key] = val;
  }
  return out;
}

function extractToolCalls(content: string, native: ToolCallRequest[] | undefined): NormalizedToolCall[] {
  // 1. Native OpenAI-style tool_calls
  if (native && native.length > 0) {
    const calls: NormalizedToolCall[] = [];
    for (const tc of native) {
      const name = (tc?.function?.name || "").trim();
      let rawArgs = tc?.function?.arguments ?? "{}";
      let args: any = typeof rawArgs === "object" ? rawArgs : parseJsonLoose(String(rawArgs));
      if (name && args && typeof args === "object") {
        calls.push({ id: tc.id || null, name, args });
      }
    }
    if (calls.length > 0) return calls;
  }

  // Native-only by default: only parse XML tags if explicitly opted-in via environment variable
  if (!process.env.ERA_AGENT_ALLOW_TAG_FALLBACK) {
    return [];
  }

  const text = content || "";
  const calls: NormalizedToolCall[] = [];

  const tagRe = /<tool:([a-zA-Z_]\w*)(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/tool:\1>)/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text)) !== null) {
    const name = m[1];
    const attrs = (m[2] || "").trim();
    const body = (m[3] || "").trim();
    let args: Record<string, any> = {};
    if (body) {
      const parsed = parseJsonLoose(body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
      else if (parsed !== null) args = { value: parsed };
    } else if (attrs) {
      args = parseKwargString(attrs);
    }
    calls.push({ id: null, name, args });
  }
  if (calls.length > 0) return calls;

  // 3. Pythonic LFM2.5-style shim: <|tool_call_start|>[fn(k="v")]<|tool_call_end|>
  const pyRe = /<\|tool_call_start\|>\s*\[?\s*([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\]?<\|tool_call_end\|>/gi;
  while ((m = pyRe.exec(text)) !== null) {
    calls.push({ id: null, name: m[1], args: parseKwargString(m[2]) });
  }
  return calls;
}

function stripToolArtifacts(content: string): string {
  return (content || "")
    .replace(/<tool:[^>]+>[\s\S]*?<\/tool:\w+>/gi, "")
    .replace(/<tool:[^>]+\/?>/gi, "")
    .replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, "")
    .trim();
}

function cleanSlug(slug: string): string {
  return (String(slug || "custom_era").toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/^_+|_+$/g, "")) || "custom_era";
}

function baseSlug(eraId: string): string {
  const eid = String(eraId || "").toLowerCase();
  for (const suffix of ["_haven", "_monogamy", "_polygyny", "_estate"]) {
    if (eid.endsWith(suffix)) return eid.slice(0, -suffix.length);
  }
  return eid;
}

const DYNAMIC_STOPWORDS = new Set([
  "the", "and", "age", "era", "setting", "dynamic", "variant", "multi", "partner",
  "partners", "sole", "wife", "wives", "wife's", "polygyny", "monogamy", "haven",
  "seclusion", "sanctuary", "bride", "brides", "household", "mode", "version",
  "multiwife", "multihusband",
]);

function contentTokens(name: string): Set<string> {
  const words = String(name || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return new Set(words.filter((w) => w.length > 2 && !DYNAMIC_STOPWORDS.has(w)));
}

function findSimilarityConflict(poly: EraDefinition, slug: string): string | null {
  const slugL = cleanSlug(slug);
  const nameTokens = contentTokens(poly?.name || "");
  const query = [String(poly?.name || ""), String(poly?.region || ""), ...((poly?.tags || []) as string[]).slice(0, 6)]
    .join(" ")
    .trim();

  let matches: EraDefinition[] = [];
  try {
    matches = searchErasSemantic(query) || [];
  } catch {
    matches = [];
  }

  let best: EraDefinition | null = null;
  let bestScore = 0;
  for (const cand of matches.slice(0, 10)) {
    const candId = String(cand?.id || "");
    if (cleanSlug(baseSlug(candId)) === slugL) {
      return (
        `Existing era '${cand.name}' (\`${candId}\`) uses the same base slug as your draft ` +
        `(\`${slugL}\`). Choose a fresh slug/setting.`
      );
    }
    const ct = contentTokens(cand?.name || "");
    if (nameTokens.size > 0 && ct.size > 0) {
      let inter = 0;
      for (const t of nameTokens) if (ct.has(t)) inter++;
      const union = new Set([...nameTokens, ...ct]).size;
      const jaccard = inter / Math.max(1, union);
      if (jaccard > bestScore) {
        bestScore = jaccard;
        best = cand;
      }
    }
  }

  if (best && bestScore >= 0.55) {
    return (
      `Too similar to existing era '${best.name}' (\`${best.id}\`) (name overlap ${Math.round(bestScore * 100)}%). ` +
      `Differentiate region, naming, and social dynamics, then re-draft with a fresh slug.`
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// LLM transport (hybrid native tool_calls + tag fallback)
// ---------------------------------------------------------------------------
function resolveOpenAICompatEndpoint(config: ProviderConfig): { url: string; apiKey: string } {
  let baseUrl = config.baseUrl;
  let apiKey = config.apiKey;

  if (config.type === "openrouter") {
    baseUrl = baseUrl || "https://openrouter.ai/api/v1";
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  } else if (config.type === "ollama") {
    baseUrl = baseUrl || "http://localhost:11434/v1";
    apiKey = apiKey || "ollama";
  } else if (config.type === "llamacpp") {
    baseUrl = baseUrl || "http://127.0.0.1:8080/v1";
    apiKey = apiKey || "not-needed";
  } else {
    baseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  baseUrl = (baseUrl || "").replace(/\/+$/, "");
  return { url: `${baseUrl}/chat/completions`, apiKey: apiKey || "" };
}

async function postOpenAICompatWithTools(
  config: ProviderConfig,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; useTools: boolean }
): Promise<ChatReply> {
  const { url, apiKey } = resolveOpenAICompatEndpoint(config);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = "Bearer " + apiKey;
  if (config.type === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/chargenui/chargenui";
    headers["X-Title"] = "CharGen Harness";
  }

  const body: Record<string, unknown> = {
    model: config.model || "llama-server",
    messages,
    temperature: options.temperature ?? config.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? config.maxTokens ?? 5000,
  };
  if (options.useTools) body.tools = ERA_TOOL_SCHEMA;

  // 30 minute timeout (1,800,000 ms) via lower-level streaming HTTP request with TCP keep-alive
  const timeoutMs = 30 * 60 * 1000;
  const rawRes = await rawHttpPost(url, headers, body, timeoutMs);

  if (rawRes.status < 200 || rawRes.status >= 300) {
    if (options.useTools && (rawRes.status === 400 || rawRes.status === 422)) {
      return postOpenAICompatWithTools(config, messages, { ...options, useTools: false });
    }
    throw new Error(`LLM returned HTTP ${rawRes.status}: ${rawRes.text.slice(0, 300)}`);
  }

  const data = JSON.parse(rawRes.text) as any;
  const msg = data?.choices?.[0]?.message || {};
  const rawToolCalls: ToolCallRequest[] | undefined = Array.isArray(msg.tool_calls) ? msg.tool_calls : undefined;
  const visibleContent = typeof msg.content === "string" ? msg.content : "";
  const reasoningContent = typeof msg.reasoning_content === "string" ? msg.reasoning_content : "";
  const content = visibleContent || (rawToolCalls && rawToolCalls.length > 0 ? "" : reasoningContent);
  return { content, toolCalls: extractToolCalls(content, rawToolCalls), rawToolCalls };
}

async function postChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<ChatReply> {
  if (OPENAI_COMPAT_TYPES.has(config.type)) {
    return postOpenAICompatWithTools(config, messages, { temperature, maxTokens, useTools: true });
  }
  // Gemini / Anthropic / unknown: tag protocol via the existing router.
  const raw = await routeLLMCompletion(config, messages, { temperature, maxTokens });
  const content = typeof raw === "string" ? raw : String(raw || "");
  return { content, toolCalls: extractToolCalls(content, undefined) };
}

// ---------------------------------------------------------------------------
// Agent turn
// ---------------------------------------------------------------------------
interface LoopState {
  draft: { slug: string; poly: EraDefinition; mono: EraDefinition } | null;
  searched: boolean;
  saved: { slug: string; filename: string; filePath: string; count: number } | null;
  finalizeMessage: string | null;
  compliance: { polygyny?: EraComplianceReport; monogamy?: EraComplianceReport };
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  state: LoopState,
  execLog: EraAgentTurnResponse["toolCallsExecuted"],
  minSaveScore: number
): { result: string; ok: boolean } {
  let result: string;
  let ok: boolean;

  switch (name) {
    case "search_eras": {
      const query = String(args?.query || "").trim();
      const catFilter = String(args?.category || "").trim() || "All";
      if (!query && catFilter === "All") {
        result = JSON.stringify({ ok: false, error: "query or category is required" });
        ok = false;
        break;
      }
      let matches: EraDefinition[] = [];
      try {
        matches = searchErasSemantic(query, catFilter) || [];
      } catch (e) {
        result = JSON.stringify({ ok: false, error: `search failed: ${(e as Error).message}` });
        ok = false;
        break;
      }
      state.searched = true;
      const top = matches.slice(0, 8);
      if (top.length === 0) {
        result = JSON.stringify({
          ok: true,
          matches: 0,
          note: `No similar eras found in '${catFilter}'. Your concept is distinct — safe to draft.`,
        });
      } else {
        const out = top.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          region: c.region,
          score: (c as any).relevance_score,
          tags: (c.tags || []).slice(0, 8),
          source: c.is_extension ? "extension" : "eras_db.json",
        }));
        result = JSON.stringify({ ok: true, matches: top.length, results: out });
      }
      ok = true;
      break;
    }

    case "list_era_categories": {
      try {
        const { searchEraCategories } = await import("./eras-service");
        const cats = searchEraCategories("");
        state.searched = true;
        result = JSON.stringify({ ok: true, categories: cats });
        ok = true;
      } catch (e) {
        result = JSON.stringify({ ok: false, error: `Failed to list categories: ${(e as Error).message}` });
        ok = false;
      }
      break;
    }

    case "inspect_era": {
      const eraId = String(args?.id || "").trim();
      if (!eraId) {
        result = JSON.stringify({ ok: false, error: "id is required" });
        ok = false;
        break;
      }
      const era = getEraById(eraId);
      if (!era) {
        result = JSON.stringify({ ok: false, error: `era '${eraId}' not found` });
        ok = false;
        break;
      }
      state.searched = true;
      const brief = (e: EraDefinition) => ({
        id: e.id,
        name: e.name,
        region: e.region,
        span: e.span,
        category: e.category,
        aesthetic: String(e.aesthetic || "").slice(0, 400),
        tech: String(e.tech || "").slice(0, 300),
        social_codes: String(e.social_codes || "").slice(0, 600),
        tags: e.tags || [],
      });
      let counterpart: EraDefinition | null = null;
      if (eraId.endsWith("_haven")) counterpart = getEraById(eraId.slice(0, -"_haven".length) + "_monogamy");
      else if (eraId.endsWith("_monogamy")) counterpart = getEraById(eraId.slice(0, -"_monogamy".length) + "_haven");
      const payload: Record<string, any> = { ok: true, era: brief(era) };
      if (counterpart) payload.counterpart = brief(counterpart);
      result = JSON.stringify(payload);
      ok = true;
      break;
    }

    case "draft_era_pair": {
      const slug = cleanSlug(args?.slug || "");
      const polyRaw = args?.polygyny;
      const monoRaw = args?.monogamy;
      if (!slug) {
        result = JSON.stringify({ ok: false, error: "slug is required" });
        ok = false;
        break;
      }
      if (!polyRaw || typeof polyRaw !== "object" || !monoRaw || typeof monoRaw !== "object") {
        result = JSON.stringify({ ok: false, error: "both 'polygyny' and 'monogamy' must be era objects" });
        ok = false;
        break;
      }
      const polyAny = polyRaw as any;
      const monoAny = monoRaw as any;
      if (!String(polyAny?.name || "").trim() || !String(monoAny?.name || "").trim()) {
        result = JSON.stringify({ ok: false, error: "both polygyny.name and monogamy.name are required" });
        ok = false;
        break;
      }
      if (!String(polyAny?.social_codes || "").trim() || !String(monoAny?.social_codes || "").trim()) {
        result = JSON.stringify({
          ok: false,
          error: "both polygyny.social_codes and monogamy.social_codes are required (100-250 word paragraphs)",
        });
        ok = false;
        break;
      }

      const poly = { ...polyAny } as EraDefinition;
      const mono = { ...monoAny } as EraDefinition;
      poly.id = `${slug}_haven`;
      mono.id = `${slug}_monogamy`;
      for (const key of ["span", "category", "region", "tech"] as const) {
        if (!mono[key] && poly[key]) (mono as any)[key] = (poly as any)[key];
      }
      state.draft = { slug, poly, mono };
      const polyAudit = validateEraCompliance(poly, mono);
      const monoAudit = validateEraCompliance(mono, poly);
      state.compliance = { polygyny: polyAudit, monogamy: monoAudit };
      result = JSON.stringify({
        ok: true,
        staged: `${poly.id} + ${mono.id}`,
        scores: { polygyny: polyAudit.score, monogamy: monoAudit.score },
        next: "Call validate_pair for details, then save_era_extension.",
      });
      ok = true;
      break;
    }

    case "validate_pair": {
      if (!state.draft) {
        result = JSON.stringify({ ok: false, error: "No staged draft. Call draft_era_pair first." });
        ok = false;
        break;
      }
      const polyAudit = validateEraCompliance(state.draft.poly, state.draft.mono);
      const monoAudit = validateEraCompliance(state.draft.mono, state.draft.poly);
      state.compliance = { polygyny: polyAudit, monogamy: monoAudit };
      const scores = [polyAudit.score || 0, monoAudit.score || 0];
      const below = scores.some((s) => s < minSaveScore);
      result = JSON.stringify({
        ok: true,
        polygyny: { score: polyAudit.score, issues: polyAudit.issues, warnings: polyAudit.warnings },
        monogamy: { score: monoAudit.score, issues: monoAudit.issues, warnings: monoAudit.warnings },
        save_threshold: minSaveScore,
        below_threshold: below,
        next: "Fix issues by re-drafting if below threshold, then save_era_extension.",
      });
      ok = true;
      break;
    }

    case "save_era_extension": {
      if (!state.draft) {
        result = JSON.stringify({
          ok: false,
          error: "No staged draft. Call draft_era_pair first.",
        });
        ok = false;
        break;
      }
      const requestedSlug = args?.slug ? cleanSlug(args.slug) : null;
      if (requestedSlug && requestedSlug !== state.draft.slug) {
        result = JSON.stringify({
          ok: false,
          error: `Slug mismatch: staged draft is for '${state.draft.slug}', but save requested '${requestedSlug}'. You cannot save stale era content under a different slug. Call draft_era_pair with the new slug and its unique content first.`,
        });
        ok = false;
        break;
      }
      const slug = state.draft.slug;
      const poly = { ...state.draft.poly } as EraDefinition;
      const mono = { ...state.draft.mono } as EraDefinition;
      poly.id = `${slug}_haven`;
      mono.id = `${slug}_monogamy`;

      const conflict = findSimilarityConflict(poly, slug);
      if (conflict) {
        result = JSON.stringify({ ok: false, error: `Similarity gate: ${conflict}` });
        ok = false;
        break;
      }

      const polyAudit = validateEraCompliance(poly, mono);
      const monoAudit = validateEraCompliance(mono, poly);
      state.compliance = { polygyny: polyAudit, monogamy: monoAudit };
      const scores = [polyAudit.score || 0, monoAudit.score || 0];
      if (Math.min(...scores) < minSaveScore) {
        result = JSON.stringify({
          ok: false,
          error:
            `Quality floor not met (scores ${scores[0]}% / ${scores[1]}%, minimum ${minSaveScore}%). ` +
            `Issues: ${[...polyAudit.issues, ...monoAudit.issues].join("; ")}. ` +
            "Fix via draft_era_pair re-draft, then save again.",
        });
        ok = false;
        break;
      }

      const dest = String(call.args.destination || "project_data");
      try {
        const saved = saveExtensionFile(`${slug}.json`, {
          era_pair: { [poly.id]: poly, [mono.id]: mono },
        }, dest);
        state.draft = null;
        state.saved = {
          slug,
          filename: `${slug}.json`,
          filePath: saved.filePath,
          count: saved.count,
          destination: saved.destination,
        };
        result = JSON.stringify({
          ok: true,
          path: saved.filePath,
          destination: saved.destination,
          scores: { polygyny: scores[0], monogamy: scores[1] },
          next: "Call finalize with a user-facing summary.",
        });
        ok = true;
      } catch (e) {
        result = JSON.stringify({ ok: false, error: `file write failed: ${(e as Error).message}` });
        ok = false;
      }
      break;
    }

    case "finalize": {
      if (state.draft && !state.saved) {
        result = JSON.stringify({
          ok: false,
          error:
            "You have an unsaved staged draft. Call save_era_extension first, or re-draft. " +
            "finalize is refused to prevent unsaved claims.",
        });
        ok = false;
        break;
      }
      state.finalizeMessage = String(args?.message || "").trim() || "Done.";
      result = JSON.stringify({ ok: true, finalizing: true });
      ok = true;
      break;
    }

    default: {
      result = JSON.stringify({
        ok: false,
        error: `Unknown tool '${name}'. Valid tools: search_eras, inspect_era, draft_era_pair, validate_pair, save_era_extension, finalize`,
      });
      ok = false;
    }
  }

  execLog.push({ tool: name, args, resultSummary: result.length > 400 ? result.slice(0, 397) + "..." : result, status: ok ? "done" : "error" });
  return { result, ok };
}

/**
 * Executes one agentic Era Architect turn.
 * Every message runs through the same tool loop — read-only Q&A vs forging a new
 * paired setting emerges from the model's own tool choices. Hard-invariants
 * (search-before-draft, similarity gate, unsaved-draft finalize rejection) are
 * enforced by the tool executors. On failure the response carries `error` and
 * no eraPair (nothing was saved).
 */
export async function executeEraAgentTurn(
  request: EraAgentTurnRequest
): Promise<EraAgentTurnResponse> {
  const toolCallsExecuted: EraAgentTurnResponse["toolCallsExecuted"] = [];
  const state: LoopState = {
    draft: null,
    searched: false,
    saved: null,
    finalizeMessage: null,
    compliance: {},
  };

  const fail = (message: string): EraAgentTurnResponse => ({
    agentMessage: `⚠️ **Era Architect Error**: ${message}`,
    toolCallsExecuted,
    error: message,
  });

  const messages: ChatMessage[] = [{ role: "system", content: ERA_ARCHITECT_SYSTEM_PROMPT }];

  if (request.chatHistory && request.chatHistory.length > 0) {
    for (const h of request.chatHistory.slice(-6)) {
      if ((h.role === "user" || h.role === "assistant") && h.content) {
        messages.push({ role: h.role, content: String(h.content).slice(0, 4000) });
      }
    }
  }

  let userContent = `USER REQUEST:\n"${request.userPrompt.trim()}"`;
  if (request.currentEraPair?.polygyny || request.currentEraPair?.monogamy) {
    userContent =
      "CURRENT ACTIVE ERA DRAFT (for refinement context):\n" +
      JSON.stringify(request.currentEraPair, null, 2).slice(0, 6000) +
      "\n\n" +
      userContent;
  }

  // If the user explicitly mentions an existing era by name or ID, provide only that specific era definition
  try {
    const lowerPrompt = request.userPrompt.toLowerCase();
    const all = getAllEras(true);
    const mentionedEra = Object.values(all).find((e) => {
      const cleanId = e.id.toLowerCase().replace(/_haven$|_monogamy$|_estate$|_polygyny$/, "");
      return cleanId.length > 3 && (lowerPrompt.includes(cleanId) || lowerPrompt.includes(e.id.toLowerCase()));
    });

    if (mentionedEra) {
      userContent =
        `[REFERENCED ERA: "${mentionedEra.name}" (${mentionedEra.id})]\n` +
        `Region: ${mentionedEra.region} | Span: ${mentionedEra.span}\n` +
        `Aesthetic: ${String(mentionedEra.aesthetic || "").slice(0, 200)}...\n\n` +
        userContent;
    }
  } catch {
    // Reference check is best-effort
  }

  messages.push({ role: "user", content: userContent });

  let correctiveLeft = CORRECTIVE_BUDGET;
  let proseExitLeft = 1;
  let finalText = "";
  const seenKeys = new Set<string>();
  const queuedInstructions = [...(request.queuedInstructions || [])];
  const isCancelled = () => Boolean(request.cancelSignal?.aborted);
  const injectQueuedInstructions = () => {
    if (request.instructionQueue) queuedInstructions.push(...(request.instructionQueue() || []));
    while (queuedInstructions.length > 0) {
      const instruction = String(queuedInstructions.shift() || "").trim();
      if (instruction) {
        messages.push({ role: "user", content: `NEW USER INSTRUCTION (while working):\n${instruction}` });
      }
    }
  };

  try {
    while (true) {
      if (isCancelled()) return fail("Cancelled by user. No completion was claimed.");
      injectQueuedInstructions();
      const reply = await postChat(request.provider, messages, 0.7, 5000);
      if (isCancelled()) return fail("Cancelled by user. No completion was claimed.");
      const calls = reply.toolCalls;

      if (calls.length === 0) {
        const clean = stripToolArtifacts(reply.content);
        if (state.finalizeMessage !== null) {
          finalText = state.finalizeMessage;
          break;
        }
        if (state.draft && !state.saved) {
          if (correctiveLeft > 0) {
            correctiveLeft--;
            messages.push({ role: "assistant", content: reply.content || "(no tool call)" });
            messages.push({
              role: "user",
              content:
                "CORRECTION: You ended without a tool call while a staged draft is unsaved. " +
                "You MUST call save_era_extension now (or re-draft via draft_era_pair). " +
                "finalize is only allowed after a successful save.",
            });
            continue;
          }
          return fail("Model failed to save the staged draft after corrective retry. No file was written.");
        }
        // Prose exit without finalize: allow one correction — the turn contract
        // requires finalize for Q&A endings and continued tool flow for creation.
        if (state.saved) {
          // File was already persisted to disk; treat assistant's prose as final text
          finalText = reply.content || "Turn completed.";
          break;
        }

        if (proseExitLeft > 0) {
          proseExitLeft--;
          messages.push({ role: "assistant", content: reply.content || "(no tool call)" });
          messages.push({
            role: "user",
            content:
              "CORRECTION: You ended the turn without calling finalize. " +
              "If you were answering a question, restate your answer and end with finalize {\"message\": \"...\"}. " +
              "If the user asked you to CREATE a setting, nothing has been created yet — continue the flow: " +
              "draft_era_pair, then validate_pair, then save_era_extension, then finalize.",
          });
          continue;
        }
        return fail("Model ended the turn with prose but never called finalize. No file was written.");
      }

      if (reply.rawToolCalls && reply.rawToolCalls.length > 0) {
        messages.push({ role: "assistant", content: reply.content || "", tool_calls: reply.rawToolCalls });
      } else {
        messages.push({ role: "assistant", content: reply.content || "(tool call)" });
      }

      for (const call of calls) {
        if (isCancelled()) return fail("Cancelled by user. No further tools were executed.");
        const stateScope =
          call.name === "draft_era_pair" || call.name === "save_era_extension" || call.name === "validate_pair"
            ? state.draft?.slug || ""
            : "";
        const key = `${call.name}|${stateScope}|${JSON.stringify(call.args)}`;
        let result: string;
        let ok: boolean;
        if (seenKeys.has(key)) {
          result = JSON.stringify({
            ok: false,
            error: `Duplicate identical ${call.name} call skipped. Proceed with a different step.`,
          });
          ok = false;
          toolCallsExecuted.push({
            tool: call.name,
            args: call.args,
            resultSummary: result,
            status: "error",
          });
        } else {
          ({ result, ok } = await executeTool(call.name, call.args, state, toolCallsExecuted, MIN_SAVE_SCORE));
          if (ok) seenKeys.add(key);
        }

        if (call.id) {
          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        } else {
          messages.push({ role: "user", content: `<tool_result name="${call.name}">\n${result}\n</tool_result>` });
        }
      }

      if (state.finalizeMessage !== null) {
        finalText = state.finalizeMessage;
        break;
      }

    }
  } catch (e) {
    return fail((e as Error).message || String(e));
  }

  // Loop exhausted without finalize or a clean prose end (e.g. corrective retry
  // consumed the final iteration). Never report success silently.
  if (state.finalizeMessage === null && finalText === "") {
    const stagedNote = state.draft
      ? ` A draft "${state.draft.slug}" is staged but unsaved — no file was written.`
      : " No file was written.";
    return fail(`Agentic loop ended without finalize.${stagedNote}`);
  }

  if (state.saved) {
    const locDesc = state.saved.destination === "local_user" ? "user data folder (~/.local or AppData)" : "data/eras_extensions/";
    const savedNote = `\n\n📁 Verified and saved to \`${state.saved.filename}\` (${locDesc}). Both Idea Generator and Main Harness can now load it.`;
    finalText = (finalText || "Saved.") + savedNote;
  }

  let eraPair: EraPair | undefined = undefined;
  if (state.saved && state.draft) {
    eraPair = { polygyny: state.draft.poly, monogamy: state.draft.mono };
  }

  return {
    agentMessage: finalText || "Turn completed.",
    eraPair,
    complianceReports: state.compliance,
    toolCallsExecuted,
    savedFile: state.saved
      ? { filename: state.saved.filename, filePath: state.saved.filePath, count: state.saved.count }
      : undefined,
  };
}
