import type { RequestHandler } from "../utils/router";
import type { ImagePromptRequest, ImagePromptQueueItem } from "../types/image-prompt";
import * as fs from "node:fs";
import { sendComfyClientRPC } from "../utils/comfy-client";
import {
  listPromptQueue,
  addToPromptQueue,
  stageOrReplacePromptQueueItem,
  updatePromptQueueItem,
  removeFromPromptQueue,
  clearPromptQueue,
  attachImageToQueueItem,
  exportPromptQueue,
} from "../services/image/prompt-queue";
import { generateImagePrompt, extractVisualIdentityWithLLM } from "../services/image/prompt-generator";
import { decideChoice } from "../services/decision/decision-service";
import { COMFYCLIENT_SOCKET } from "../config/constants";

export const imagePromptRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/image-prompts/extract-tags",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: any; provider?: any };
      const visualIdentity = await extractVisualIdentityWithLLM(body.character, body.provider);
      return Response.json({ visualIdentity });
    },
  },
  {
    method: "POST",
    path: "/api/image-prompts/generate",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as ImagePromptRequest;
      const result = await generateImagePrompt(body);
      return Response.json({ result });
    },
  },
  {
    method: "GET",
    path: "/api/image-prompts/queue",
    handler: async () => {
      if (fs.existsSync(COMFYCLIENT_SOCKET)) {
        try {
          const comfyList = await sendComfyClientRPC("list_prompts", {}, 2000);
          if (comfyList && Array.isArray(comfyList.items) && comfyList.items.length > 0) {
            return Response.json({ queue: comfyList.items });
          }
        } catch (err) {
          console.warn("ComfyClient list_prompts failed, falling back to local queue:", err);
        }
      }
      const queue = await listPromptQueue();
      return Response.json({ queue });
    },
  },
  {
    method: "POST",
    path: "/api/image-prompts/smart-requeue-check",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        character: any;
        field: string;
        oldValue: string;
        newValue: string;
        greetingIndex?: number;
        hasExistingImage: boolean;
        provider?: any;
        decisionConfig?: any;
      };

      // Strict User Mandate: If the greeting or avatar did NOT already have an image, DO NOT auto-synthesize or re-queue.
      if (!body.hasExistingImage) {
        return Response.json({ requeued: false, reason: "No existing image associated with target." });
      }

      // Check with Decision Model if significant visual change occurred
      let isSignificant = true;
      if (body.decisionConfig && body.decisionConfig.provider !== "disabled") {
        try {
          const evalRes = await decideChoice({
            state: `Target Field: ${body.field}\nPrevious Value: "${body.oldValue || ""}"\nNew Value: "${body.newValue || ""}"`,
            schema: {
              visual_change: ["significant_visual_change", "cosmetic_or_narrative_only"],
            },
            config: body.decisionConfig,
          });
          isSignificant = evalRes.decision.visual_change === "significant_visual_change";
        } catch (err) {
          console.warn("Visual change decision check error:", err);
          isSignificant = true;
        }
      }

      if (!isSignificant) {
        return Response.json({ requeued: false, reason: "Visual change was cosmetic or narrative only." });
      }

      // Synthesize prompt and stage (replace in-place) without auto-running generation
      const purpose = typeof body.greetingIndex === "number" ? "greeting" : "avatar";
      const promptRes = await generateImagePrompt({
        character: body.character,
        targetModel: "flux",
        artStyle: "anime",
        imagePurpose: purpose,
        greetingIndex: body.greetingIndex,
        provider: body.provider,
      });

      const stagedItem = await stageOrReplacePromptQueueItem({
        characterId: body.character.id,
        characterName: body.character.name || "Unnamed",
        imagePurpose: purpose,
        greetingIndex: body.greetingIndex,
        prompt: promptRes.positivePrompt,
        positivePrompt: promptRes.positivePrompt,
        negativePrompt: promptRes.negativePrompt,
        targetModel: "flux",
        artStyle: "anime",
        status: "queued",
      });

      return Response.json({ requeued: true, item: stagedItem });
    },
  },
  {
    method: "POST",
    path: "/api/image-prompts/queue",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as any;
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

      if (fs.existsSync(COMFYCLIENT_SOCKET)) {
        try {
          const res = await sendComfyClientRPC("save_prompt", itemPayload);
          return Response.json({ item: res || itemPayload });
        } catch (_) {
          // Fallback to local storage
        }
      }

      const item = await addToPromptQueue(itemPayload);
      return Response.json({ item });
    },
  },
  {
    method: "POST",
    path: "/api/image-prompts/queue/:id/attach-image",
    handler: async (req, params) => {
      const body = (await req.json().catch(() => ({})))  as { avatarDataUrl: string; updateSavedCard?: boolean; imageType?: "avatar" | "greeting" | "greeting_bg" };
      const item = await attachImageToQueueItem(params.id, body.avatarDataUrl, body.updateSavedCard !== false, body.imageType || "avatar");
      if (!item) return Response.json({ error: "Queue item not found" }, { status: 404 });
      return Response.json({ item });
    },
  },
  {
    method: "PUT",
    path: "/api/image-prompts/queue/:id",
    handler: async (req, params) => {
      const body = (await req.json().catch(() => ({}))) as Partial<ImagePromptQueueItem>;
      if (fs.existsSync(COMFYCLIENT_SOCKET)) {
        try {
          const res = await sendComfyClientRPC("save_prompt", { ...body, id: params.id });
          if (res) return Response.json({ item: res });
        } catch (err) {
          console.warn("ComfyClient save_prompt failed:", err);
        }
      }
      const item = await updatePromptQueueItem(params.id, body);
      if (!item) return Response.json({ error: "Queue item not found" }, { status: 404 });
      return Response.json({ item });
    },
  },
  {
    method: "DELETE",
    path: "/api/image-prompts/queue/:id",
    handler: async (req, params) => {
      if (fs.existsSync(COMFYCLIENT_SOCKET)) {
        try {
          const res = await sendComfyClientRPC("delete_prompt", { id: params.id });
          return Response.json({ success: !!res?.deleted });
        } catch (_) {}
      }
      const success = await removeFromPromptQueue(params.id);
      return Response.json({ success });
    },
  },
  {
    method: "DELETE",
    path: "/api/image-prompts/queue",
    handler: async (req) => {
      const url = new URL(req.url);
      const completedOnly = url.searchParams.get("completedOnly") === "true";
      if (fs.existsSync(COMFYCLIENT_SOCKET)) {
        try {
          const res = await sendComfyClientRPC("clear_queue", { completedOnly });
          return Response.json({ removedCount: res?.cleared || 0 });
        } catch (_) {}
      }
      const removedCount = await clearPromptQueue(completedOnly);
      return Response.json({ removedCount });
    },
  },
  {
    method: "GET",
    path: "/api/image-prompts/export",
    handler: async (req) => {
      const url = new URL(req.url);
      const format = (url.searchParams.get("format") || "json") as "json" | "text" | "comfy_batch";
      const exported = await exportPromptQueue(format);
      const contentType = format === "text" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
      const ext = format === "text" ? "txt" : "json";
      return new Response(exported, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="comfyui_prompts_${Date.now()}.${ext}"`,
        },
      });
    },
  },
];