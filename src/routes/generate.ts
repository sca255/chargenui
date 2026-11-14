import type { RequestHandler } from "../utils/router";
import type {
  GenerateCharacterRequest,
  WeaverInterviewQuestionsRequest,
  WeaverForgeRequest,
} from "../types/harness";
import type { ProviderConfig } from "../types/provider";
import type { RoleplayCharacter } from "../types/character";
import {
  generateCharacterCard,
} from "../services/generator/quick-spark";
import { generateCharacterBatch } from "../services/generator/batch-spark";
import { synthesizeSpineFromCharacter } from "../services/generator/spine";
import {
  generateWeaverInterviewQuestions,
  rerollWeaverQuestionOptions,
  generateCharacterWithWeaverInterview,
  evaluateWeaverAnswerRelevance,
  autoPickWeaverOptionWithJev,
} from "../services/generator/weaver-interview";

export const generateRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/generate",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as GenerateCharacterRequest;
      const character = await generateCharacterCard(body);
      return Response.json({ character });
    },
  },
  {
    method: "POST",
    path: "/api/generate/batch",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as any;
      const batchResult = await generateCharacterBatch(body);
      return Response.json(batchResult);
    },
  },
  {
    method: "POST",
    path: "/api/weaver/interview-questions",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as WeaverInterviewQuestionsRequest;
      const result = await generateWeaverInterviewQuestions(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/weaver/reroll-options",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as any;
      const result = await rerollWeaverQuestionOptions(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/weaver/check-answer",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as any;
      const result = await evaluateWeaverAnswerRelevance(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/weaver/auto-pick-jev",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as any;
      const result = await autoPickWeaverOptionWithJev(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/weaver/forge",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as WeaverForgeRequest;
      const character = await generateCharacterWithWeaverInterview(body);
      return Response.json({ character });
    },
  },
  {
    method: "POST",
    path: "/api/spine/synthesize",
    handler: async (req) => {
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
      const body = (await req.json().catch(() => ({})))  as SynthesizeSpineRequest;
      const spine = await synthesizeSpineFromCharacter(body);

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

      return Response.json({ character: updatedChar, spine });
    },
  },
];