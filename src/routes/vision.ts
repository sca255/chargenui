import type { RequestHandler } from "../utils/router";
import type { ScanImageRequest } from "../types/harness";
import type { ProviderConfig } from "../types/provider";
import { generateCharacterFromImage } from "../services/vision/image-to-card";
import { generateVisionIdeas } from "../services/vision/vision-ideas";
import { deconstructImageWithVision } from "../services/vision/deconstruct";
import { generateWeaverInterviewQuestions } from "../services/generator/weaver-interview";

export const visionRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/scan-image",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as ScanImageRequest;
      const result = await generateCharacterFromImage(
        body.imageBase64,
        body.provider,
        body.promptHints,
        body.nsfw
      );
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/scan-image/batch",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
        images: { id?: string; name?: string; imageBase64: string }[];
        provider: ProviderConfig;
        promptHints?: string;
        nsfw?: boolean;
        saveToLibrary?: boolean;
      };

      if (!body?.images || !Array.isArray(body.images) || body.images.length === 0) {
        return Response.json({ error: "At least one image is required" }, { status: 400 });
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
            const { saveCardRecord } = await import("../services/character/card-storage");
            const savedMeta = await saveCardRecord(res.character, img.imageBase64);
            results.push({ success: true, name: img.name, result: res, savedMeta });
          } else {
            results.push({ success: true, name: img.name, result: res });
          }
        } catch (err: any) {
          results.push({ success: false, name: img.name, error: err?.message || "Scan failed" });
        }
      }
      return Response.json({ count: results.length, results });
    },
  },
  {
    method: "POST",
    path: "/api/vision/ideas",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        imageBase64: string;
        provider: ProviderConfig;
        promptHints?: string;
      };
      if (!body.imageBase64) {
        return Response.json({ error: "Missing imageBase64 in request" }, { status: 400 });
      }
      const response = await generateVisionIdeas(body.imageBase64, body.provider, body.promptHints);
      return Response.json(response);
    },
  },
  {
    method: "POST",
    path: "/api/vision/weaver-interview",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        imageBase64: string;
        provider: ProviderConfig;
        concept?: string;
        genre?: string;
        tone?: string;
        nsfw?: boolean;
      };
      if (!body.imageBase64) {
        return Response.json({ error: "Missing imageBase64 in request" }, { status: 400 });
      }

      // Step 1: Deconstruct image
      const deconstruction = await deconstructImageWithVision(body.imageBase64, body.provider, body.concept);
      const vp = deconstruction.visual_profile;
      const ip = deconstruction.inferred_personality;

      const visualContext = `${vp.apparent_age || ""} ${vp.gender_presentation || ""}, ${vp.hair || ""}, ${vp.eyes || ""}, ${vp.clothing_attire || ""}. Demeanor: ${vp.expression_demeanor || ""}. Contradiction: ${ip.latent_conflict || ""}.`;
      const combinedConcept = body.concept
        ? `${body.concept}\n\n[Visual Appearance & Archetype]: ${visualContext}`
        : `Character based on image: ${visualContext}`;

      // Step 2: Generate Weaver Interview Questions seeded by visual evidence
      const interview = await generateWeaverInterviewQuestions({
        concept: combinedConcept,
        genre: body.genre,
        tone: body.tone,
        nsfw: body.nsfw,
        provider: body.provider,
      });

      return Response.json({
        ...interview,
        visualProfile: vp,
        inferredPersonality: ip,
      });
    },
  },
];