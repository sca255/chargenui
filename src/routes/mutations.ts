import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter } from "../types/character";
import {
  mutateCharacterArchetype,
  type TraitEmbeddingMutationRequest,
} from "../services/character/trait-embeddings";
import { getSavedCard } from "../services/character/card-storage";

export const mutationsRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/characters/mutate",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        character?: RoleplayCharacter;
        characterId?: string;
        addTraits?: string[];
        removeTraits?: string[];
        intensity?: number;
        count?: number;
        provider?: any;
      };

      let char = body.character;
      if (!char && body.characterId) {
        const record = await getSavedCard(body.characterId);
        if (record && record.character) {
          char = record.character;
        }
      }

      if (!char) {
        return Response.json(
          { error: "Character object or valid characterId is required" },
          { status: 400 }
        );
      }

      const mutationReq: TraitEmbeddingMutationRequest = {
        character: char,
        addTraits: Array.isArray(body.addTraits) ? body.addTraits : [],
        removeTraits: Array.isArray(body.removeTraits) ? body.removeTraits : [],
        intensity: typeof body.intensity === "number" ? body.intensity : 1.0,
        count: typeof body.count === "number" ? body.count : 1,
        provider: body.provider,
      };

      try {
        const result = await mutateCharacterArchetype(mutationReq);
        return Response.json(result);
      } catch (err: any) {
        return Response.json(
          { error: err?.message || "Failed to mutate character" },
          { status: 500 }
        );
      }
    },
  },
];
