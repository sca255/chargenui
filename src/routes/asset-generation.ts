import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter } from "../types/character";
import { pluginRegistry } from "../plugins/registry";
import { getSavedCard } from "../services/character/card-storage";
import { addToPromptQueue } from "../services/image/prompt-queue";
import { pushToComfyClientIPC, sendComfyClientRPC, COMFYCLIENT_SOCKET } from "../utils/comfy-client";
import {
  BUILTIN_ASSET_GENERATOR_PLUGINS,
  getWorkflowTemplateForAsset,
} from "../plugins/builtin/asset-generators";
import * as fs from "node:fs";

export const assetGenerationRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/characters/:id/generate-assets",
    handler: async (req, params) => {
      const record = await getSavedCard(params.id);
      if (!record || !record.character) {
        return Response.json({ error: "Character not found" }, { status: 404 });
      }

      const body = (await req.json().catch(() => ({}))) as {
        assetTypes?: string[]; // e.g. ["expression_sheet", "outfit_variants", "texture_atlas"]
        dispatchToComfyClient?: boolean;
        saveToQueue?: boolean;
      };

      const character = record.character;
      const targetTypes = Array.isArray(body.assetTypes) && body.assetTypes.length > 0
        ? body.assetTypes
        : ["expression_sheet", "outfit_variants", "texture_atlas"];

      const generatedResults: Array<{
        assetType: string;
        pluginId: string;
        assets: any[];
      }> = [];

      // Discover active plugins with onGenerateAssets
      const activePlugins = pluginRegistry.getEnabledPlugins();
      const pluginsToRun = [
        ...BUILTIN_ASSET_GENERATOR_PLUGINS,
        ...activePlugins.filter((p) => typeof p.onGenerateAssets === "function"),
      ];

      // De-duplicate by plugin meta id
      const uniquePlugins = Array.from(
        new Map(pluginsToRun.map((p) => [p.meta.id, p])).values()
      );

      for (const plugin of uniquePlugins) {
        if (!plugin.onGenerateAssets) continue;

        // Check if plugin matches requested asset types
        const matchesType = targetTypes.some((t) =>
          plugin.meta.id.includes(t) || plugin.meta.name.toLowerCase().includes(t.toLowerCase())
        );

        if (targetTypes.length > 0 && !matchesType) continue;

        try {
          const res = await plugin.onGenerateAssets(character);
          if (res.success && res.data) {
            generatedResults.push({
              assetType: res.data.assetType,
              pluginId: plugin.meta.id,
              assets: res.data.assets,
            });
          }
        } catch (err: any) {
          console.warn(`Plugin ${plugin.meta.id} failed asset generation:`, err);
        }
      }

      // Collect all flat prompts
      const allPrompts = generatedResults.flatMap((r) => r.assets);

      // Save to prompt queue and push to comfyclient socket if requested
      const queuedItems: any[] = [];
      const dispatchComfy = body.dispatchToComfyClient !== false;
      const saveQueue = body.saveToQueue !== false;

      if (saveQueue) {
        for (const asset of allPrompts) {
          const itemPayload = {
            characterId: character.id,
            characterName: character.name,
            imagePurpose: asset.assetType as any,
            targetModel: "flux" as const,
            aspectRatio: asset.aspectRatio || "1:1",
            dimensions: asset.dimensions,
            prompt: asset.prompt,
            positivePrompt: asset.prompt,
            negativePrompt: asset.negativePrompt,
            status: "queued" as const,
            workflow: asset.workflowTemplate,
          };

          const queued = await addToPromptQueue(itemPayload);
          queuedItems.push(queued);

          if (dispatchComfy) {
            pushToComfyClientIPC({
              ...queued,
              name: `${character.name} - ${asset.label || asset.name}`,
            });
          }
        }
      }

      return Response.json({
        success: true,
        characterId: character.id,
        characterName: character.name,
        assetPacks: generatedResults,
        totalAssetsGenerated: allPrompts.length,
        queuedToComfyClient: dispatchComfy && fs.existsSync(COMFYCLIENT_SOCKET),
        queuedItemsCount: queuedItems.length,
      });
    },
  },
  {
    method: "GET",
    path: "/api/assets/workflow-templates",
    handler: async (req) => {
      const url = new URL(req.url);
      const assetType = url.searchParams.get("type") || "expression_sheet";
      const samplePrompt = "character concept portrait, masterpiece, high fidelity";
      const template = getWorkflowTemplateForAsset(assetType, samplePrompt);
      return Response.json({ assetType, template });
    },
  },
];
