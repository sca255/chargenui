import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter } from "../types/character";
import {
  listSavedCards,
  getSavedCard,
  saveCardRecord,
  deleteSavedCard,
  duplicateSavedCard,
  saveAutosaveDraft,
  getAutosaveDraft,
  clearAutosaveDraft,
} from "../services/character/card-storage";
import {
  getEmbedding,
  cosineSimilarity,
  buildCharacterDnaText,
  type SemanticSearchResult,
} from "../services/character/embeddings";
import { getAvifImage, getCachedAvifPath } from "../services/image/avif-cache";

export const cardsRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/cards/:id/avatar",
    handler: async (req, params) => {
      // 1. Try prewarmed AVIF disk cache
      const avifBuf = await getAvifImage(params.id);
      if (avifBuf) {
        return new Response(avifBuf, {
          headers: {
            "Content-Type": "image/avif",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600"
          }
        });
      }

      // 2. On-demand read from saved card
      const record = await getSavedCard(params.id);
      const b64 = record?.avatarBase64 || record?.character?.avatar;
      if (!b64 || typeof b64 !== "string") {
        return new Response("Not found", { status: 404 });
      }

      const clean = b64.includes(",") ? b64.split(",", 1)[1] : b64;
      const rawBuf = Buffer.from(clean, "base64");
      return new Response(rawBuf, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
  },
  {
    method: "GET",
    path: "/api/cards",
    handler: async () => {
      const cards = await listSavedCards();
      return Response.json({ cards });
    },
  },
  {
    method: "POST",
    path: "/api/cards",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter; avatarBase64?: string; id?: string };
      const meta = await saveCardRecord(body.character, body.avatarBase64, body.id);
      return Response.json(meta);
    },
  },
  {
    method: "GET",
    path: "/api/cards/autosave",
    handler: async () => {
      const draft = await getAutosaveDraft();
      return Response.json({ draft });
    },
  },
  {
    method: "POST",
    path: "/api/cards/autosave",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter; avatarBase64?: string };
      if (!body?.character) {
        return Response.json({ error: "Character data is required" }, { status: 400 });
      }
      const saved = await saveAutosaveDraft(body.character, body.avatarBase64);
      return Response.json({ success: true, draft: saved });
    },
  },
  {
    method: "DELETE",
    path: "/api/cards/autosave",
    handler: async () => {
      const ok = await clearAutosaveDraft();
      return Response.json({ success: ok });
    },
  },
  {
    method: "GET",
    path: "/api/cards/:id",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record) return Response.json({ error: "Card not found" }, { status: 404 });
      return Response.json(record);
    },
  },
  {
    method: "DELETE",
    path: "/api/cards/:id",
    handler: async (req, params) => {
      const ok = await deleteSavedCard(params.id);
      return Response.json({ success: ok });
    },
  },
  {
    method: "POST",
    path: "/api/cards/search-semantic",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        query: string;
        threshold?: number;
        limit?: number;
      };
      const query = (body.query || "").trim();
      if (!query) {
        return Response.json({ results: [] });
      }

      const queryVector = await getEmbedding(query);
      const metas = await listSavedCards();
      const results: SemanticSearchResult[] = [];

      for (const meta of metas) {
        const full = await getSavedCard(meta.id);
        if (!full || !full.character) continue;

        let charVector = full.character.extensions?.chargenui?.embedding;
        if (!charVector || !Array.isArray(charVector) || charVector.length !== queryVector.length) {
          const dnaText = buildCharacterDnaText(full.character);
          charVector = await getEmbedding(dnaText);
          if (!full.character.extensions) full.character.extensions = {};
          if (!full.character.extensions.chargenui) {
            full.character.extensions.chargenui = { schemaVersion: 3 };
          }
          full.character.extensions.chargenui.embedding = charVector;
          await saveCardRecord(full.character, full.avatarBase64, full.id);
        }

        const similarity = cosineSimilarity(queryVector, charVector);
        const threshold = body.threshold ?? 0.15;
        if (similarity >= threshold) {
          results.push({
            cardId: full.id,
            name: full.character.name,
            similarity: Math.round(similarity * 100) / 100,
            matchSnippet: (full.character.personality || full.character.description || "").slice(0, 160),
            tags: full.character.tags || [],
          });
        }
      }

      results.sort((a, b) => b.similarity - a.similarity);
      const limit = body.limit || 10;
      return Response.json({ results: results.slice(0, limit) });
    },
  },
  {
    method: "POST",
    path: "/api/cards/:id/duplicate",
    handler: async (req, params) => {
      const body = (await req.json().catch(() => ({}))) as { suffix?: string };
      const duplicated = await duplicateSavedCard(params.id, body.suffix);
      return Response.json(duplicated);
    },
  },
];