import { serve } from "bun";
import { Buffer } from "node:buffer";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import * as net from "node:net";

import type { RoleplayCharacter, TavernCardV2 } from "./types/character";
import type {
  GenerateCharacterRequest,
  ScanImageRequest,
  EnhanceCharacterRequest,
  WeaverInterviewQuestionsRequest,
  WeaverForgeRequest,
} from "./types/harness";
import type { ProviderConfig } from "./types/provider";
import { generateCharacterCard } from "./services/generator/quick-spark";
import { synthesizeSpineFromCharacter } from "./services/generator/spine";
import {
  generateWeaverInterviewQuestions,
  rerollWeaverQuestionOptions,
  generateCharacterWithWeaverInterview,
} from "./services/generator/weaver-interview";
import { generateCharacterFromImage } from "./services/vision/image-to-card";
import { processEnhanceRequest } from "./services/enhancer/index";
import { auditCharacterCard } from "./services/enhancer/diagnostic";
import {
  forkCharacterMultiverse,
  MULTIVERSE_UNIVERSES,
  type MultiverseForkRequest,
} from "./services/enhancer/multiverse-forker";
import {
  generateWorldNodes,
  type GenerateWorldNodesRequest,
} from "./services/enhancer/world-nodes";
import {
  generateAndStampVoiceSpec,
  type VoiceSpecRequest,
} from "./services/audio/tts-stamping";
import {
  parseLorebookInput,
  summarizeLorebook,
  generateLorebookCompanion,
} from "./services/lorebook/lorebook-companion";
import type { GenerateCompanionFromLorebookRequest } from "./types/harness";
import {
  incorporatePromptWithLlm,
  type IncorporatePromptRequest,
} from "./services/enhancer/prompt-incorporator";
import {
  executeAgentModify,
  executeAgentCompact,
  type AgentModifyRequest,
  type AgentCompactRequest,
} from "./services/agent/agent-harness";
import { executeReimagine, type ReimagineRequest } from "./services/agent/reimagine";
import {
  parseCharacterFromInput,
  characterToCardV2,
  characterToCardV3,
  cardV2ToCharacter,
  cardV3ToCharacter,
} from "./services/character/card-parser";
import {
  writePngCharaCard,
  createBlankPngBuffer,
  extractCardFromPngBuffer,
} from "./services/character/png-card";
import { createCharxArchive } from "./services/character/charx-container";
import { generateProceduralPngAvatar } from "./services/character/procedural-avatar";
import { retrieveCharacterLore } from "./services/search/web-search";
import { executeMcpToolCall, type McpServerConfig } from "./services/mcp/client";
import {
  getActivePromptConfig,
  listPromptProfiles,
  setActiveProfile,
  saveCustomPromptConfig,
  resetToDefault,
} from "./services/config/prompt-config";
import {
  listSavedCards,
  getSavedCard,
  saveCardRecord,
  deleteSavedCard,
  duplicateSavedCard,
  saveAutosaveDraft,
  getAutosaveDraft,
  clearAutosaveDraft,
} from "./services/character/card-storage";
import {
  listHouseholds,
  getHousehold,
  saveHousehold,
  deleteHousehold,
} from "./services/character/household-storage";
import { generateGroupEncounter } from "./services/character/household-encounter";
import type { HouseholdRecord, GenerateEncounterRequest } from "./types/household";
import { generateScenarioMatrix } from "./services/enhancer/scenario-matrix";
import { generateImagePrompt, extractVisualIdentityWithLLM } from "./services/image/prompt-generator";
import {
  listPromptQueue,
  addToPromptQueue,
  updatePromptQueueItem,
  removeFromPromptQueue,
  clearPromptQueue,
  attachImageToQueueItem,
  exportPromptQueue,
} from "./services/image/prompt-queue";
import {
  analyzeComfyWorkflow,
  checkComfyConnection,
  dispatchQueueItemToComfy,
  exportComfyBatchFile,
} from "./services/image/comfyui-client";
import { serverIpc, PRESET_THEMES } from "./services/ipc/server-ipc";
import {
  getAllEras,
  getEraById,
  searchErasSemantic,
  getEraCategories,
  searchEraCategories,
  createUserEra,
  deleteUserEra,
  listExtensionFiles,
  saveExtensionFile,
  deleteExtensionFile,
  validateEraCompliance,
  resolveEraInfo,
  formatEraPromptSnippet,
} from "./services/eras/eras-service";
import { executeEraAgentTurn } from "./services/eras/era-agent";
import type { ImagePromptRequest, ImagePromptQueueItem } from "./types/image-prompt";
import {
  getLlmCacheStats,
  setLlmCacheEnabled,
  clearLlmCache,
} from "./services/llm/llm-cache";

const PORT = parseInt(process.env.PORT || "3333", 10);
const PUBLIC_DIR = path.join(import.meta.dir, "public");
const eraAgentRuns = new Map<string, { aborted: boolean; queued: string[] }>();

/** Executes a JSON-RPC 2.0 call over the ComfyClient Unix domain socket. */
function sendComfyClientRPC(method: string, params: Record<string, any> = {}, timeoutMs = 8000): Promise<any> {
  const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(socketPath)) {
      return reject(new Error(`ComfyClient socket not active at ${socketPath}`));
    }
    const client = net.connect(socketPath);
    let buf = "";
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("ComfyClient IPC timeout"));
    }, timeoutMs);

    client.on("connect", () => {
      const reqMsg = JSON.stringify({
        jsonrpc: "2.0",
        id: `rpc_${Date.now()}`,
        method,
        params,
      }) + "\n";
      client.write(reqMsg);
    });

    client.on("data", (chunk) => {
      buf += chunk.toString();
      if (buf.includes("\n")) {
        clearTimeout(timer);
        client.end();
        try {
          const parsed = JSON.parse(buf.trim());
          if (parsed.error) {
            reject(new Error(parsed.error.message || "ComfyClient RPC error"));
          } else {
            resolve(parsed.result);
          }
        } catch (err) {
          reject(err);
        }
      }
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Push a single item to comfyclient over IPC via save_prompt.
 *  Silently no-ops if comfyclient is offline. */
function pushToComfyClientIPC(item: Record<string, any>): void {
  const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
  if (!fs.existsSync(socketPath)) return;
  let name = item.name;
  if (!name) {
    const charName = item.characterName || "Character";
    const purpose = item.imagePurpose || "avatar";
    const purposeLabel =
      purpose === "greeting_bg" ? "Chat BG" :
      purpose === "greeting" ? "Greeting Scene" :
      purpose === "scenario_avatar" ? "Scenario Profile" :
      "Avatar";
    const shortId = item.id ? String(item.id).replace(/^ipq_\d+_?/, "").slice(0, 5) : "";
    name = shortId ? `${charName} - ${purposeLabel} (${shortId})` : `${charName} - ${purposeLabel}`;
  }
  sendComfyClientRPC("save_prompt", { ...item, name, id: item.id }).catch(() => {});
}

console.log(`🚀 Starting CharGen Harness on port ${PORT}...`);

const server = serve({
  port: PORT,
  hostname: "0.0.0.0",
  idleTimeout: 0, // Disable connection idle timeout for heavy local LLM inference
  async fetch(req, serverInstance) {
    const url = new URL(req.url);
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // WebSocket Upgrade for IPC
    if (url.pathname === "/api/ipc/ws" || url.pathname === "/ws") {
      const upgraded = (serverInstance as any).upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400, headers: corsHeaders });
    }

    // API Routes
    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/health") {
          return Response.json({ status: "ok", uptime: process.uptime() }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/env-keys") {
          return Response.json(
            {
              hasGemini: !!process.env.GEMINI_API_KEY,
              hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
              hasOpenAI: !!process.env.OPENAI_API_KEY,
              hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
            },
            { headers: corsHeaders }
          );
        }

        // Generate Character from concept/prompt
        if (url.pathname === "/api/generate" && method === "POST") {
          const body = (await req.json()) as GenerateCharacterRequest;
          const character = await generateCharacterCard(body);
          return Response.json({ character }, { headers: corsHeaders });
        }

        // Weaver Guided Interview Questions
        if (url.pathname === "/api/weaver/interview-questions" && method === "POST") {
          const body = (await req.json()) as WeaverInterviewQuestionsRequest;
          const result = await generateWeaverInterviewQuestions(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Weaver Reroll Options for a specific Question
        if (url.pathname === "/api/weaver/reroll-options" && method === "POST") {
          const body = (await req.json()) as any;
          const result = await rerollWeaverQuestionOptions(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Weaver Guided Forge with Interview Answers
        if (url.pathname === "/api/weaver/forge" && method === "POST") {
          const body = (await req.json()) as WeaverForgeRequest;
          const character = await generateCharacterWithWeaverInterview(body);
          return Response.json({ character }, { headers: corsHeaders });
        }

        // Synthesize Authoring Spine for existing character (retroactive)
        if (url.pathname === "/api/spine/synthesize" && method === "POST") {
          interface SynthesizeSpineRequest {
            character: RoleplayCharacter;
            originalConcept?: string;
            originalStoryArc?: string;
            genre?: string;
            themes?: string[];
            tone?: string;
            nsfw?: boolean;
            intensity?: string;
            era?: string;
            botMode?: "single" | "multi_character" | "rpg_world";
            provider: ProviderConfig;
          }
          const body = (await req.json()) as SynthesizeSpineRequest;
          console.log("[API] Spine synthesis requested for:", body.character?.name, "provider:", body.provider?.type);
          const spine = await synthesizeSpineFromCharacter(body);
          console.log("[API] Spine synthesized for:", body.character?.name, "hasSpine:", !!spine);
          
          const updatedChar: RoleplayCharacter = {
            ...body.character,
            extensions: {
              ...(body.character.extensions || {}),
              "chargenui:authoringSpine": spine,
              "chargenui:creationInputs": {
                concept: body.originalConcept,
                genre: body.genre,
                themes: body.themes,
                tone: body.tone,
                nsfw: body.nsfw,
                intensity: body.intensity,
                era: body.era,
                botMode: body.botMode,
                storyArc: body.originalStoryArc,
              },
            },
          };
          
          return Response.json({ character: updatedChar, spine }, { headers: corsHeaders });
        }

        // Analyze / Parse Lorebook (for Companion creator or Lore tools)
        if (url.pathname === "/api/lorebook/analyze" && method === "POST") {
          const body = (await req.json()) as { lorebook: any; name?: string };
          const book = parseLorebookInput(body.lorebook, body.name || "World Lorebook");
          const summary = summarizeLorebook(book);
          return Response.json({ book, summary }, { headers: corsHeaders });
        }

        // Generate Companion Character from Lorebook
        if (url.pathname === "/api/lorebook/generate-companion" && method === "POST") {
          const body = (await req.json()) as GenerateCompanionFromLorebookRequest;
          const result = await generateLorebookCompanion(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Scan Image with Vision model
        if (url.pathname === "/api/scan-image" && method === "POST") {
          const body = (await req.json()) as ScanImageRequest;
          const result = await generateCharacterFromImage(
            body.imageBase64,
            body.provider,
            body.promptHints,
            body.nsfw
          );
          return Response.json(result, { headers: corsHeaders });
        }

        // Batch Multi-Image Vision Scan
        if (url.pathname === "/api/scan-image/batch" && method === "POST") {
          const body = (await req.json()) as {
            images: { id?: string; name?: string; imageBase64: string }[];
            provider: ProviderConfig;
            promptHints?: string;
            nsfw?: boolean;
            saveToLibrary?: boolean;
          };

          if (!body?.images || !Array.isArray(body.images) || body.images.length === 0) {
            return Response.json({ error: "At least one image is required" }, { status: 400, headers: corsHeaders });
          }

          const results = [];
          for (const img of body.images) {
            try {
              const res = await generateCharacterFromImage(
                img.imageBase64,
                body.provider,
                body.promptHints,
                body.nsfw
              );
              if (body.saveToLibrary && res.character) {
                const savedMeta = await saveCardRecord(res.character, img.imageBase64);
                results.push({ success: true, name: img.name, result: res, savedMeta });
              } else {
                results.push({ success: true, name: img.name, result: res });
              }
            } catch (err: any) {
              results.push({ success: false, name: img.name, error: err?.message || "Scan failed" });
            }
          }
          return Response.json({ count: results.length, results }, { headers: corsHeaders });
        }

        // Enhance Character
        if (url.pathname === "/api/enhance" && method === "POST") {
          const body = (await req.json()) as EnhanceCharacterRequest;
          const result = await processEnhanceRequest(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Card Diagnostic Audit
        if (url.pathname === "/api/audit" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter };
          const result = auditCharacterCard(body.character);
          return Response.json(result, { headers: corsHeaders });
        }

        // Multiverse AU Forker
        if (url.pathname === "/api/multiverse/universes" && method === "GET") {
          return Response.json({ universes: MULTIVERSE_UNIVERSES }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/multiverse/fork" && method === "POST") {
          const body = (await req.json()) as MultiverseForkRequest;
          const result = await forkCharacterMultiverse(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Deep Lorebook World Nodes Synthesizer
        if (url.pathname === "/api/lorebook/generate-nodes" && method === "POST") {
          const body = (await req.json()) as GenerateWorldNodesRequest;
          const result = await generateWorldNodes(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // TTS Voice Spec & Qwen3-TTS Stamping
        if (url.pathname === "/api/voice/spec" && method === "POST") {
          const body = (await req.json()) as VoiceSpecRequest;
          const result = await generateAndStampVoiceSpec(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Incorporate System Prompt / Directives into post_history, description, or both using LLM
        if (url.pathname === "/api/incorporate-prompt" && method === "POST") {
          const body = (await req.json()) as IncorporatePromptRequest;
          const result = await incorporatePromptWithLlm(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Agent Mode: Interactive AI Co-Writer and Card Modifier
        if (url.pathname === "/api/agent/modify" && method === "POST") {
          const body = (await req.json()) as AgentModifyRequest;
          const result = await executeAgentModify(body);
          return Response.json(result, { headers: corsHeaders });
        }

        if (url.pathname === "/api/agent/compact" && method === "POST") {
          const body = (await req.json()) as AgentCompactRequest;
          const result = await executeAgentCompact(body);
          return Response.json(result, { headers: corsHeaders });
        }

        if (url.pathname === "/api/agent/reimagine" && method === "POST") {
          const body = (await req.json()) as ReimagineRequest;
          if (!body.character || !body.provider || !["redesign", "inspire"].includes(body.mode)) {
            return Response.json({ error: "character, provider, and mode are required" }, { status: 400, headers: corsHeaders });
          }
          const result = await executeReimagine(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // Parse card from raw text, JSON, or uploaded file
        if (url.pathname === "/api/parse-card" && method === "POST") {
          const contentType = req.headers.get("content-type") || "";

          if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            if (!file) {
              return Response.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });
            }
            const arrayBuffer = await file.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            const parsed = parseCharacterFromInput(uint8, file.name);
            return Response.json(parsed, { headers: corsHeaders });
          } else {
            const body = (await req.json()) as { data: string; filename?: string };
            let raw: Uint8Array | string = body.data;
            if (body.data.startsWith("data:image/")) {
              const b64 = body.data.replace(/^data:[^;]+;base64,/, "");
              raw = new Uint8Array(Buffer.from(b64, "base64"));
            }
            const parsed = parseCharacterFromInput(raw, body.filename);
            return Response.json(parsed, { headers: corsHeaders });
          }
        }

        // Web Search / Lore Retrieval
        if (url.pathname === "/api/search-lore" && method === "POST") {
          const body = (await req.json()) as {
            query: string;
            providerType?: "duckduckgo" | "tavily" | "brave" | "searxng";
            apiKey?: string;
            searxngUrl?: string;
            includeHeadcanons?: boolean;
            provider?: any;
          };
          if (!body.apiKey) {
            if (body.providerType === "tavily" && process.env.TAVILY_API_KEY) {
              body.apiKey = process.env.TAVILY_API_KEY;
            } else if (body.providerType === "brave" && process.env.BRAVE_API_KEY) {
              body.apiKey = process.env.BRAVE_API_KEY;
            }
          }
          if (!body.searxngUrl && process.env.SEARXNG_URL) {
            body.searxngUrl = process.env.SEARXNG_URL;
          }
          const result = await retrieveCharacterLore(body);
          return Response.json(result, { headers: corsHeaders });
        }

        // MCP Tool Call
        if (url.pathname === "/api/mcp-call" && method === "POST") {
          const body = (await req.json()) as {
            server: McpServerConfig;
            toolName: string;
            toolArgs: Record<string, unknown>;
          };
          const output = await executeMcpToolCall(body.server, body.toolName, body.toolArgs);
          return Response.json({ output }, { headers: corsHeaders });
        }

        // Export Character as PNG Card (Dual V2 & V3 spec embedded)
        if (url.pathname === "/api/export-png" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter; avatarDataUrl?: string };
          const cardV2 = characterToCardV2(body.character);
          const cardV3 = characterToCardV3(body.character);

          let basePng: Uint8Array;
          if (body.avatarDataUrl && body.avatarDataUrl.startsWith("data:image/png;base64,")) {
            const b64 = body.avatarDataUrl.replace(/^data:image\/png;base64,/, "");
            basePng = new Uint8Array(Buffer.from(b64, "base64"));
          } else if (body.character.avatar && body.character.avatar.startsWith("data:image/png;base64,")) {
            const b64 = body.character.avatar.replace(/^data:image\/png;base64,/, "");
            basePng = new Uint8Array(Buffer.from(b64, "base64"));
          } else {
            basePng = generateProceduralPngAvatar(body.character);
          }

          const embeddedPng = writePngCharaCard(basePng, cardV2, cardV3);
          return new Response(embeddedPng, {
            headers: {
              ...corsHeaders,
              "Content-Type": "image/png",
              "Content-Disposition": `attachment; filename="${encodeURIComponent(body.character.name || "character")}.png"`,
            },
          });
        }

        // Export Character as .charx (Character Card V3 / Lumiverse XCHAR container format)
        if (url.pathname === "/api/export-charx" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter; avatarDataUrl?: string };
          let avatarPngBytes: Uint8Array | undefined;
          const avatarUrl = body.avatarDataUrl || body.character.avatar;
          if (avatarUrl && avatarUrl.startsWith("data:image/png;base64,")) {
            const b64 = avatarUrl.replace(/^data:image\/png;base64,/, "");
            avatarPngBytes = new Uint8Array(Buffer.from(b64, "base64"));
          } else {
            avatarPngBytes = generateProceduralPngAvatar(body.character);
          }

          const charxZip = createCharxArchive(body.character, avatarPngBytes);
          return new Response(charxZip, {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${encodeURIComponent(body.character.name || "character")}.charx"`,
            },
          });
        }

        // LLM Response Cache Endpoints
        if (url.pathname === "/api/llm/cache" && method === "GET") {
          return Response.json(getLlmCacheStats(), { headers: corsHeaders });
        }

        if (url.pathname === "/api/llm/cache/toggle" && method === "POST") {
          const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
          if (typeof body.enabled === "boolean") {
            setLlmCacheEnabled(body.enabled);
          }
          return Response.json(getLlmCacheStats(), { headers: corsHeaders });
        }

        if (url.pathname === "/api/llm/cache/clear" && method === "POST") {
          const result = clearLlmCache();
          return Response.json({ success: true, ...result, ...getLlmCacheStats() }, { headers: corsHeaders });
        }

        // Prompt Configuration Endpoints
        if (url.pathname === "/api/prompts" && method === "GET") {
          return Response.json({
            profiles: listPromptProfiles(),
            activeProfile: getActivePromptConfig().id,
            config: getActivePromptConfig(),
          }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/prompts/select" && method === "POST") {
          const body = (await req.json()) as { profileId: string };
          const config = setActiveProfile(body.profileId);
          return Response.json({
            profiles: listPromptProfiles(),
            activeProfile: config.id,
            config,
          }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/prompts/save" && method === "POST") {
          const body = (await req.json()) as { config: any };
          const config = saveCustomPromptConfig(body.config);
          return Response.json({
            profiles: listPromptProfiles(),
            activeProfile: config.id,
            config,
          }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/prompts/reset" && method === "POST") {
          const config = resetToDefault();
          return Response.json({
            profiles: listPromptProfiles(),
            activeProfile: config.id,
            config,
          }, { headers: corsHeaders });
        }

        // --- Card Library / Multi-Deck Endpoints ---
        if (url.pathname === "/api/cards" && method === "GET") {
          const cards = await listSavedCards();
          return Response.json({ cards }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/cards/") && url.pathname.endsWith("/duplicate") && method === "POST") {
          const id = url.pathname.replace(/^\/api\/cards\//, "").replace(/\/duplicate$/, "");
          const body = (await req.json().catch(() => ({}))) as { suffix?: string };
          const duplicated = await duplicateSavedCard(id, body.suffix);
          return Response.json(duplicated, { headers: corsHeaders });
        }

        // Autosave Card Slot Endpoints
        if (url.pathname === "/api/cards/autosave" && method === "GET") {
          const draft = await getAutosaveDraft();
          return Response.json({ draft }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/cards/autosave" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter; avatarBase64?: string };
          if (!body?.character) {
            return Response.json({ error: "Character data is required" }, { status: 400, headers: corsHeaders });
          }
          const saved = await saveAutosaveDraft(body.character, body.avatarBase64);
          return Response.json({ success: true, draft: saved }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/cards/autosave" && method === "DELETE") {
          const ok = await clearAutosaveDraft();
          return Response.json({ success: ok }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/cards/") && method === "GET") {
          const id = url.pathname.replace(/^\/api\/cards\//, "");
          const record = await getSavedCard(id);
          if (!record) return new Response("Card not found", { status: 404, headers: corsHeaders });
          return Response.json(record, { headers: corsHeaders });
        }

        if (url.pathname === "/api/cards" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter; avatarBase64?: string; id?: string };
          const meta = await saveCardRecord(body.character, body.avatarBase64, body.id);
          return Response.json(meta, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/cards/") && method === "DELETE") {
          const id = url.pathname.replace(/^\/api\/cards\//, "");
          const ok = await deleteSavedCard(id);
          return Response.json({ success: ok }, { headers: corsHeaders });
        }

        // --- Custom Household & Court Binder Endpoints ---
        if (url.pathname === "/api/households" && method === "GET") {
          const households = await listHouseholds();
          return Response.json({ households }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/households" && method === "POST") {
          const body = (await req.json()) as Partial<HouseholdRecord> & { name: string };
          if (!body?.name?.trim()) {
            return Response.json({ error: "Household name is required" }, { status: 400, headers: corsHeaders });
          }
          const saved = await saveHousehold(body);
          return Response.json({ success: true, household: saved }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/households/") && url.pathname.endsWith("/encounter") && method === "POST") {
          const id = url.pathname.replace(/^\/api\/households\//, "").replace(/\/encounter$/, "");
          const household = await getHousehold(id);
          if (!household) {
            return Response.json({ error: "Household not found" }, { status: 404, headers: corsHeaders });
          }
          const body = (await req.json().catch(() => ({}))) as GenerateEncounterRequest & { provider?: any };
          const result = await generateGroupEncounter(
            household,
            body.participatingCardIds,
            body.scenarioGoal,
            body.provider,
            Boolean(body.saveToAlternateGreetings)
          );
          return Response.json({ success: true, encounter: result }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/households/") && method === "GET") {
          const id = url.pathname.replace(/^\/api\/households\//, "");
          const household = await getHousehold(id);
          if (!household) {
            return Response.json({ error: "Household not found" }, { status: 404, headers: corsHeaders });
          }
          return Response.json({ household }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/households/") && method === "DELETE") {
          const id = url.pathname.replace(/^\/api\/households\//, "");
          const ok = await deleteHousehold(id);
          return Response.json({ success: ok }, { headers: corsHeaders });
        }

        // --- Scenario Matrix Endpoint ---
        if (url.pathname === "/api/scenario-matrix" && method === "POST") {
          const body = (await req.json()) as {
            character: RoleplayCharacter;
            provider: any;
            customSteering?: string;
            searchOptions?: {
              enableWebSearch?: boolean;
              searchQuery?: string;
              retrievedLore?: string;
              includeHeadcanons?: boolean;
              searchProviderType?: "duckduckgo" | "tavily" | "brave" | "searxng";
              searchApiKey?: string;
              searxngUrl?: string;
            };
          };

          let lore = body.searchOptions?.retrievedLore;
          if (body.searchOptions?.enableWebSearch && !lore) {
            const query = body.searchOptions.searchQuery?.trim() || body.character.name;
            if (query) {
              try {
                const loreRes = await retrieveCharacterLore({
                  query,
                  providerType: body.searchOptions.searchProviderType,
                  apiKey: body.searchOptions.searchApiKey,
                  searxngUrl: body.searchOptions.searxngUrl,
                  includeHeadcanons: body.searchOptions.includeHeadcanons !== false,
                  provider: body.provider,
                });
                lore = loreRes.condensedLore;
              } catch (err: any) {
                console.warn("Scenario matrix web search failed:", err.message);
              }
            }
          }

          const matrix = await generateScenarioMatrix(body.character, body.provider, body.customSteering, lore);
          return Response.json(matrix, { headers: corsHeaders });
        }

        // --- Image Generation Prompt & Offline Queue Endpoints ---
        if (url.pathname === "/api/image-prompts/extract-tags" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter; provider?: any };
          const visualIdentity = await extractVisualIdentityWithLLM(body.character, body.provider);
          return Response.json({ visualIdentity }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/image-prompts/generate" && method === "POST") {
          const body = (await req.json()) as ImagePromptRequest;
          const result = await generateImagePrompt(body);
          return Response.json({ result }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/image-prompts/queue" && method === "GET") {
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          if (fs.existsSync(socketPath)) {
            try {
              const comfyList = await sendComfyClientRPC("list_prompts", {}, 2000);
              if (comfyList && Array.isArray(comfyList.items) && comfyList.items.length > 0) {
                return Response.json({ queue: comfyList.items }, { headers: corsHeaders });
              }
            } catch (_) {}
          }
          const queue = await listPromptQueue();
          return Response.json({ queue }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/image-prompts/queue" && method === "POST") {
          const body = (await req.json()) as any;
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          const itemId = body.id || `ipq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const effectivePrompt = body.prompt || body.positivePrompt || "";
          const itemPayload = {
            ...body,
            id: itemId,
            prompt: effectivePrompt,
            positivePrompt: effectivePrompt,
            characterName: body.characterName || "Unnamed Character",
            imagePurpose: body.imagePurpose || "avatar",
            status: body.status || "queued",
            createdAt: body.createdAt || new Date().toISOString(),
          };

          // Let ComfyClient manage the prompt over IPC when active (it persists to disk)
          if (fs.existsSync(socketPath)) {
            try {
              const res = await sendComfyClientRPC("save_prompt", itemPayload);
              return Response.json({ item: res || itemPayload }, { headers: corsHeaders });
            } catch (_) {
              // Fallback to local storage if IPC communication fails
            }
          }

          // Fallback if ComfyClient is offline
          const item = await addToPromptQueue(body);
          return Response.json({ item }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/image-prompts/queue/") && url.pathname.endsWith("/attach-image") && method === "POST") {
          const id = url.pathname.replace(/^\/api\/image-prompts\/queue\//, "").replace(/\/attach-image$/, "");
          const body = (await req.json()) as { avatarDataUrl: string; updateSavedCard?: boolean; imageType?: "avatar" | "greeting" | "greeting_bg" };
          const item = await attachImageToQueueItem(id, body.avatarDataUrl, body.updateSavedCard !== false, body.imageType || "avatar");
          if (!item) return new Response("Queue item not found", { status: 404, headers: corsHeaders });
          return Response.json({ item }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/image-prompts/queue/") && method === "PUT") {
          const id = url.pathname.replace(/^\/api\/image-prompts\/queue\//, "");
          const body = (await req.json()) as Partial<ImagePromptQueueItem>;
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          if (fs.existsSync(socketPath)) {
            try {
              const res = await sendComfyClientRPC("save_prompt", { ...body, id });
              return Response.json({ item: res }, { headers: corsHeaders });
            } catch (_) {}
          }
          const item = await updatePromptQueueItem(id, body);
          if (!item) return new Response("Queue item not found", { status: 404, headers: corsHeaders });
          return Response.json({ item }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/image-prompts/queue/") && method === "DELETE") {
          const id = url.pathname.replace(/^\/api\/image-prompts\/queue\//, "");
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          if (fs.existsSync(socketPath)) {
            try {
              const res = await sendComfyClientRPC("delete_prompt", { id });
              return Response.json({ success: !!res?.deleted }, { headers: corsHeaders });
            } catch (_) {}
          }
          const success = await removeFromPromptQueue(id);
          return Response.json({ success }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/image-prompts/queue" && method === "DELETE") {
          const completedOnly = url.searchParams.get("completedOnly") === "true";
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          if (fs.existsSync(socketPath)) {
            try {
              const res = await sendComfyClientRPC("clear_queue", { completedOnly });
              return Response.json({ removedCount: res?.cleared || 0 }, { headers: corsHeaders });
            } catch (_) {}
          }
          const removedCount = await clearPromptQueue(completedOnly);
          return Response.json({ removedCount }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/image-prompts/export" && method === "GET") {
          const format = (url.searchParams.get("format") || "json") as "json" | "text" | "comfy_batch";
          const exported = await exportPromptQueue(format);
          const contentType = format === "text" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
          const ext = format === "text" ? "txt" : "json";
          return new Response(exported, {
            headers: {
              ...corsHeaders,
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="comfyui_prompts_${Date.now()}.${ext}"`,
            },
          });
        }

        // --- ComfyClient Unix Domain Socket IPC Check ---
        if (url.pathname === "/api/comfyui/status" && method === "GET") {
          const socketPath = url.searchParams.get("socket") || process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          const exists = fs.existsSync(socketPath);
          return Response.json(
            {
              ok: exists,
              socketPath,
              message: exists ? "ComfyClient socket detected" : "Socket file not found at " + socketPath,
              server: "comfyclient",
            },
            { headers: corsHeaders }
          );
        }

        // --- ComfyClient Settings over IPC ---
        if (url.pathname === "/api/comfyui/settings" && method === "GET") {
          try {
            const settings = await sendComfyClientRPC("get_settings", {});
            return Response.json({ ok: true, settings }, { headers: corsHeaders });
          } catch (err: any) {
            return Response.json({ ok: false, error: err.message }, { headers: corsHeaders });
          }
        }

        if (url.pathname === "/api/comfyui/settings" && method === "POST") {
          try {
            const body = await req.json();
            const settings = await sendComfyClientRPC("set_settings", body);
            return Response.json({ ok: true, settings }, { headers: corsHeaders });
          } catch (err: any) {
            return Response.json({ ok: false, error: err.message }, { headers: corsHeaders });
          }
        }

        // --- ComfyClient Unix Domain Socket Trigger (Run Prompt / Run All / Dispatch) ---
        if (url.pathname === "/api/comfyui/trigger" && method === "POST") {
          const socketPath = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
          const body = (await req.json().catch(() => ({}))) as {
            promptName?: string;
            runAll?: boolean;
            items?: Array<Record<string, any>>;
          };

          if (!fs.existsSync(socketPath)) {
            return Response.json(
              {
                ok: false,
                socketActive: false,
                error: `ComfyClient socket not active at ${socketPath}. Start ComfyClient via ./comfyclient/run.sh to process generations.`,
              },
              { headers: corsHeaders }
            );
          }

          let itemsToDispatch = body.items;
          if (!itemsToDispatch || itemsToDispatch.length === 0) {
            const diskQueue = await listPromptQueue();
            if (body.promptName) {
              itemsToDispatch = diskQueue.filter((i) => i.id === body.promptName || i.name === body.promptName);
            } else {
              itemsToDispatch = diskQueue.filter((i) => i.status !== "completed");
            }
          }

          try {
            const result = await sendComfyClientRPC("dispatch_prompt", {
              items: itemsToDispatch && itemsToDispatch.length > 0 ? itemsToDispatch : undefined,
              id: body.promptName,
              name: body.promptName,
              auto_run: true,
            });
            return Response.json({ ok: true, socketActive: true, result }, { headers: corsHeaders });
          } catch (err: any) {
            return Response.json({ ok: false, socketActive: false, error: err.message }, { status: 500, headers: corsHeaders });
          }
        }

        if (url.pathname === "/api/comfyui/analyze" && method === "POST") {
          const body = (await req.json()) as { workflow: any };
          const analysis = analyzeComfyWorkflow(body.workflow);
          return Response.json(analysis, { headers: corsHeaders });
        }

        if (url.pathname === "/api/comfyui/dispatch" && method === "POST") {
          const body = (await req.json()) as {
            comfyUrl?: string;
            workflow: Record<string, any>;
            positiveNodeId: string;
            positiveField?: string;
            negativeNodeId?: string;
            negativeField?: string;
            randomizeSeed?: boolean;
            seedNodeId?: string;
            queueItemIds?: string[];
          };

          const comfyUrl = body.comfyUrl || "http://127.0.0.1:8188";
          const allItems = await listPromptQueue();
          const targetItems =
            body.queueItemIds && body.queueItemIds.length > 0
              ? allItems.filter((i) => body.queueItemIds!.includes(i.id))
              : allItems.filter((i) => i.status === "queued");

          if (targetItems.length === 0) {
            return Response.json(
              { results: [], message: "No queued items to process" },
              { headers: corsHeaders }
            );
          }

          const results = [];
          for (const item of targetItems) {
            try {
              const res = await dispatchQueueItemToComfy(comfyUrl, item, {
                workflow: body.workflow,
                positiveNodeId: body.positiveNodeId,
                positiveField: body.positiveField,
                negativeNodeId: body.negativeNodeId,
                negativeField: body.negativeField,
                randomizeSeed: body.randomizeSeed,
                seedNodeId: body.seedNodeId,
              });
              results.push(res);
            } catch (err: any) {
              results.push({
                queueItemId: item.id,
                promptId: "",
                status: "error",
                imageUrls: [],
                error: err?.message || "Execution error",
              });
            }
          }

          return Response.json({ results }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/comfyui/export-batch" && method === "POST") {
          const body = (await req.json()) as {
            workflow: Record<string, any>;
            positiveNodeId: string;
            positiveField?: string;
            negativeNodeId?: string;
            negativeField?: string;
            randomizeSeed?: boolean;
            seedNodeId?: string;
            queueItemIds?: string[];
          };

          const allItems = await listPromptQueue();
          const targetItems =
            body.queueItemIds && body.queueItemIds.length > 0
              ? allItems.filter((i) => body.queueItemIds!.includes(i.id))
              : allItems;

          const batchJson = exportComfyBatchFile(targetItems, {
            workflow: body.workflow,
            positiveNodeId: body.positiveNodeId,
            positiveField: body.positiveField,
            negativeNodeId: body.negativeNodeId,
            negativeField: body.negativeField,
            randomizeSeed: body.randomizeSeed,
            seedNodeId: body.seedNodeId,
          });

          return new Response(batchJson, {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="comfyui_batch_${Date.now()}.json"`,
            },
          });
        }

        // ==================== IPC (Inter-Process Communication) ====================
        if (url.pathname === "/api/ipc/status" || url.pathname === "/api/ipc/info") {
          return Response.json(serverIpc.getStatus(), { headers: corsHeaders });
        }

        if ((url.pathname === "/api/ipc/suggest-concept" || url.pathname === "/api/ipc/idea") && method === "POST") {
          const body = await req.json();
          const result = await serverIpc.submitConcept(body);
          return Response.json(result, { headers: corsHeaders });
        }

        if (url.pathname === "/api/ipc/last-idea" && method === "GET") {
          return Response.json({ idea: serverIpc.getLastIdea() }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/ipc/ideas" && method === "GET") {
          return Response.json({ ideas: serverIpc.getRecentIdeas() }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/ipc/active-card" && method === "GET") {
          return Response.json({ character: serverIpc.getActiveCharacter() }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/ipc/active-card" && method === "POST") {
          const body = (await req.json()) as { character: RoleplayCharacter };
          if (body?.character) {
            serverIpc.setActiveCharacter(body.character);
          }
          return Response.json({ success: true, character: serverIpc.getActiveCharacter() }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/ipc/themes" && method === "GET") {
          return Response.json({ themes: PRESET_THEMES }, { headers: corsHeaders });
        }

        // ==================== Historical & Fantasy Eras Catalog ====================
        if (url.pathname === "/api/eras" && method === "GET") {
          const all = getAllEras(true);
          const eras = Object.values(all);
          const categories = Array.from(new Set(eras.map((e) => e.category).filter(Boolean)));
          const regions = Array.from(new Set(eras.map((e) => e.region).filter(Boolean)));
          return Response.json({ eras, total: eras.length, categories, regions }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/resolve" && method === "GET") {
          const q = url.searchParams.get("q") || "";
          const era = resolveEraInfo(q);
          const promptSnippet = era ? formatEraPromptSnippet(era) : (q ? formatEraPromptSnippet(q) : "");
          return Response.json({ era: era || null, promptSnippet }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/search" && method === "GET") {
          const q = url.searchParams.get("q") || "";
          const category = url.searchParams.get("category") || "All";
          const region = url.searchParams.get("region") || "All";
          const onlyUser = url.searchParams.get("onlyUser") === "true";
          const results = searchErasSemantic(q, category, region, onlyUser);
          return Response.json({ results, total: results.length }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/categories" && method === "GET") {
          const q = url.searchParams.get("q") || "";
          const categories = searchEraCategories(q);
          return Response.json({ categories, total: categories.length }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/user" && method === "POST") {
          const body = await req.json();
          const created = createUserEra(body);
          return Response.json({ success: true, era: created }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/eras/user/") && method === "DELETE") {
          const id = url.pathname.replace(/^\/api\/eras\/user\//, "");
          const ok = deleteUserEra(id);
          return Response.json({ success: ok }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/eras/id/") && method === "GET") {
          const id = decodeURIComponent(url.pathname.replace(/^\/api\/eras\/id\//, ""));
          const era = getEraById(id);
          return Response.json({ era: era || null }, { headers: corsHeaders });
        }

        // ==================== Modular Extension Files Management ====================
        if (url.pathname === "/api/eras/extensions" && method === "GET") {
          const files = listExtensionFiles();
          return Response.json({ files, total: files.length }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/extensions/save" && method === "POST") {
          const body = await req.json();
          const { filename, content, destination } = body;
          if (!filename || !content) {
            return Response.json({ error: "Missing filename or content" }, { status: 400, headers: corsHeaders });
          }
          const saved = saveExtensionFile(filename, content, destination);
          return Response.json({ success: true, saved }, { headers: corsHeaders });
        }

        if (url.pathname.startsWith("/api/eras/extensions/") && method === "DELETE") {
          const filename = url.pathname.replace(/^\/api\/eras\/extensions\//, "");
          const destination = url.searchParams.get("destination") || undefined;
          const ok = deleteExtensionFile(filename, destination);
          return Response.json({ success: ok }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/validate" && method === "POST") {
          const body = await req.json();
          const { era, pairEra } = body;
          if (!era) {
            return Response.json({ error: "Missing era object" }, { status: 400, headers: corsHeaders });
          }
          const report = validateEraCompliance(era, pairEra);
          return Response.json({ success: true, report }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/agent/chat" && method === "POST") {
          const body = await req.json();
          const runId = String(body.runId || crypto.randomUUID());
          const cancelSignal = { aborted: false, queued: [] as string[] };
          eraAgentRuns.set(runId, cancelSignal);
          try {
            const result = await executeEraAgentTurn({
              ...body,
              cancelSignal,
              instructionQueue: () => cancelSignal.queued.splice(0),
            });
            return Response.json({ ...result, runId }, { headers: corsHeaders });
          } finally {
            eraAgentRuns.delete(runId);
          }
        }

        if (url.pathname === "/api/eras/agent/cancel" && method === "POST") {
          const body = await req.json();
          const runId = String(body.runId || "");
          const signal = eraAgentRuns.get(runId);
          if (signal) signal.aborted = true;
          return Response.json({ success: Boolean(signal), cancelled: Boolean(signal) }, { headers: corsHeaders });
        }

        if (url.pathname === "/api/eras/agent/queue" && method === "POST") {
          const body = await req.json();
          const runId = String(body.runId || "");
          const instruction = String(body.instruction || "").trim();
          const signal = eraAgentRuns.get(runId);
          if (!signal || !instruction) {
            return Response.json({ success: false }, { status: 400, headers: corsHeaders });
          }
          signal.queued.push(instruction);
          return Response.json({ success: true, queued: signal.queued.length }, { headers: corsHeaders });
        }

        return Response.json({ error: "Endpoint not found" }, { status: 404, headers: corsHeaders });
      } catch (err) {
        console.error("API error:", err);
        return Response.json(
          { error: (err as Error).message || "Internal server error" },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (url.pathname === "/scripts/comfyui_batch_runner.py") {
      const scriptPath = path.join(process.cwd(), "scripts", "comfyui_batch_runner.py");
      if (fs.existsSync(scriptPath)) {
        return new Response(Bun.file(scriptPath), {
          headers: {
            "Content-Type": "text/x-python; charset=utf-8",
            "Content-Disposition": 'attachment; filename="comfyui_batch_runner.py"',
          },
        });
      }
    }

    // Static Frontend Serving
    let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }

    const file = Bun.file(filePath);
    return new Response(file);
  },
  websocket: {
    open(ws) {
      serverIpc.registerClient(ws);
    },
    message(ws, message) {
      serverIpc.handleMessage(ws, message);
    },
    close(ws) {
      serverIpc.unregisterClient(ws);
    },
  },
});

console.log(`✨ CharGen Harness is running at: http://localhost:${server.port}`);

// Dual-bind IPC: Start Unix Domain Socket server for local side apps & daemons
const ipcSocketPath = process.env.CHARGEN_IPC_SOCKET || path.join(os.tmpdir(), "chargenui-ipc.sock");
serverIpc.startUnixServer(ipcSocketPath);

// Clean up Unix socket on process termination
const handleShutdown = () => {
  serverIpc.stopUnixServer();
  process.exit(0);
};
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

console.log(`🔌 Dual-bind IPC active: HTTP/WS on :${server.port} + Unix Socket at: ${serverIpc.getSocketPath()}`);
