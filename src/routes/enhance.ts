import type { RequestHandler } from "../utils/router";
import type { EnhanceCharacterRequest } from "../types/harness";
import type { RoleplayCharacter } from "../types/character";
import type { GenerateWorldNodesRequest } from "../services/enhancer/world-nodes";
import type { MultiverseForkRequest } from "../services/enhancer/multiverse-forker";
import type { VoiceSpecRequest } from "../services/audio/tts-stamping";
import type { IncorporatePromptRequest } from "../services/enhancer/prompt-incorporator";
import type { GenerateCompanionFromLorebookRequest } from "../types/harness";
import {
  processEnhanceRequest,
} from "../services/enhancer/index";
import { evaluateCharacterWithJudge } from "../services/enhancer/evaluator";
import { auditCharacterCard } from "../services/enhancer/diagnostic";
import {
  forkCharacterMultiverse,
  MULTIVERSE_UNIVERSES,
} from "../services/enhancer/multiverse-forker";
import {
  generateWorldNodes,
} from "../services/enhancer/world-nodes";
import {
  generateAndStampVoiceSpec,
} from "../services/audio/tts-stamping";
import {
  incorporatePromptWithLlm,
} from "../services/enhancer/prompt-incorporator";
import {
  parseLorebookInput,
  summarizeLorebook,
  generateLorebookCompanion,
} from "../services/lorebook/lorebook-companion";
import { generateScenarioMatrix } from "../services/enhancer/scenario-matrix";

export const enhanceRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/enhance",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as EnhanceCharacterRequest;
      const result = await processEnhanceRequest(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/audit",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter };
      const result = auditCharacterCard(body.character);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/character/judge",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as { character: RoleplayCharacter; provider: any };
      const report = await evaluateCharacterWithJudge(body.character, body.provider);
      return Response.json(report);
    },
  },
  {
    method: "GET",
    path: "/api/multiverse/universes",
    handler: async () => Response.json({ universes: MULTIVERSE_UNIVERSES }),
  },
  {
    method: "POST",
    path: "/api/multiverse/fork",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as MultiverseForkRequest;
      const result = await forkCharacterMultiverse(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/lorebook/analyze",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { lorebook: any; name?: string };
      const book = parseLorebookInput(body.lorebook, body.name || "World Lorebook");
      const summary = summarizeLorebook(book);
      return Response.json({ book, summary });
    },
  },
  {
    method: "POST",
    path: "/api/lorebook/generate-companion",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as GenerateCompanionFromLorebookRequest;
      const result = await generateLorebookCompanion(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/lorebook/generate-nodes",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as GenerateWorldNodesRequest;
      const result = await generateWorldNodes(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/voice/spec",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as VoiceSpecRequest;
      const result = await generateAndStampVoiceSpec(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/incorporate-prompt",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as IncorporatePromptRequest;
      const result = await incorporatePromptWithLlm(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/scenario-matrix",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
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
            const { retrieveCharacterLore } = await import("../services/search/web-search");
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
      return Response.json(matrix);
    },
  },
];