import type { CharGenPlugin, AssetGeneratorResult, GeneratedAssetPrompt } from "../api";
import type { RoleplayCharacter } from "../../types/character";

/**
 * Standard ComfyUI workflow template generator for expressions, outfits, and texture atlases.
 */
export function getWorkflowTemplateForAsset(
  assetType: "expression_sheet" | "outfit_variants" | "texture_atlas" | string,
  prompt: string,
  aspectRatio: string = "1:1"
): Record<string, unknown> {
  const isLandscape = aspectRatio === "16:9" || aspectRatio === "3:2";
  const width = isLandscape ? 1280 : aspectRatio === "2:3" ? 832 : 1024;
  const height = isLandscape ? 720 : aspectRatio === "2:3" ? 1248 : 1024;

  return {
    templateType: assetType,
    client: "comfyclient",
    nodes: {
      "1": {
        class_type: "CLIPTextEncode",
        inputs: { text: prompt },
        _meta: { title: `${assetType.toUpperCase()} Positive Prompt` },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: { text: "lowres, bad anatomy, bad hands, cropped, worst quality" },
        _meta: { title: "Negative Prompt" },
      },
      "3": {
        class_type: "EmptyLatentImage",
        inputs: { width, height, batch_size: 1 },
      },
      "4": {
        class_type: "KSampler",
        inputs: {
          seed: Math.floor(Math.random() * 1000000000),
          steps: 25,
          cfg: 7.0,
          sampler_name: "euler_ancestral",
          scheduler: "karras",
        },
      },
    },
  };
}

import { selectPersonalityExpressions, CANONICAL_28_EXPRESSIONS } from "../../services/image/expression-synthesizer";

/**
 * Expression Sheet Plugin (Full 28 Canonical RP Palette + Personality-Driven Selection)
 */
export const expressionSheetPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_asset_expression_sheet",
    name: "Expression Sheet Generator",
    version: "2.0.0",
    description: "Generates prompt items & ComfyUI img2img templates for up to 28 canonical character expressions with neutral-anchored identity consistency.",
    author: "CharGen Core",
    type: "asset_generator",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onGenerateAssets: (char: RoleplayCharacter, opts: { count?: number; personalityOnly?: boolean } = {}) => {
    const count = opts.count ?? 28;
    const selectedExpressions = opts.personalityOnly
      ? selectPersonalityExpressions(char, count)
      : Object.values(CANONICAL_28_EXPRESSIONS).slice(0, count);

    const baseTags = (char.tags || []).slice(0, 8).join(", ");
    const charName = char.name || "Character";
    const assets: GeneratedAssetPrompt[] = selectedExpressions.map((exp) => {
      const prompt = `character portrait of ${charName}, ${exp.positiveDelta}, ${baseTags}, masterpiece, expressive character sprite face, high fidelity`;
      const negativePrompt = `monochrome, lowres, distorted face, multiple heads, poorly drawn eyes, ${exp.negativeDelta}`;
      return {
        id: `asset_exp_${char.id || "c"}_${exp.key}`,
        name: `${charName} - Expression: ${exp.label}`,
        assetType: "expression_sheet",
        label: exp.label,
        prompt,
        negativePrompt,
        aspectRatio: "1:1",
        dimensions: { width: 1024, height: 1024 },
        workflowTemplate: getWorkflowTemplateForAsset("expression_sheet", prompt, "1:1"),
        metadata: {
          expressionKey: exp.key,
          category: exp.category,
          description: exp.description,
          denoise: exp.denoise,
          intensityTier: exp.intensityTier || 1,
        },
      };
    });

    return {
      success: true,
      data: {
        assetType: "expression_sheet",
        assets,
      },
    };
  },
};

/**
 * Outfit Variants Plugin (4 distinct ensemble sets)
 */
export const outfitVariantsPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_asset_outfit_variants",
    name: "Outfit Variants Generator",
    version: "1.0.0",
    description: "Generates prompts & ComfyUI workflow templates for 4 outfit variations: canonical signature, combat/tactical, casual/domestic, and formal/diplomatic.",
    author: "CharGen Core",
    type: "asset_generator",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onGenerateAssets: (char: RoleplayCharacter, opts = {}) => {
    const sets = [
      {
        id: "canonical",
        label: "Canonical Signature Attire",
        modifier: "wearing standard iconic canonical outfit, detailed garments and signature ornaments",
      },
      {
        id: "combat",
        label: "Combat & Tactical Field Set",
        modifier: "wearing reinforced combat gear, tactical armaments, rugged battle-ready utility attire",
      },
      {
        id: "casual",
        label: "Casual & Domestic Rest Attire",
        modifier: "wearing relaxed domestic leisure wear, loose comfortable everyday garments, untied hair/loose clothing",
      },
      {
        id: "formal",
        label: "Formal & Ceremonial Regalia",
        modifier: "wearing opulent ceremonial evening attire, elegant tailoring, luxurious fabrics, dignified posture",
      },
    ];

    const charName = char.name || "Character";
    const assets: GeneratedAssetPrompt[] = sets.map((set) => {
      const prompt = `full body character concept art of ${charName}, ${set.modifier}, clean solid background, detailed clothing design sheet`;
      return {
        id: `asset_outfit_${char.id || "c"}_${set.id}`,
        name: `${charName} - Outfit: ${set.label}`,
        assetType: "outfit_variant",
        label: set.label,
        prompt,
        negativePrompt: "blurry, cropped, bad proportions, missing limbs, background clutter",
        aspectRatio: "2:3",
        dimensions: { width: 832, height: 1248 },
        workflowTemplate: getWorkflowTemplateForAsset("outfit_variants", prompt, "2:3"),
        metadata: { outfitSet: set.id },
      };
    });

    return {
      success: true,
      data: {
        assetType: "outfit_variants",
        assets,
      },
    };
  },
};

/**
 * Texture Atlas / VTT Token & Prop Pack Plugin
 */
export const textureAtlasPlugin: CharGenPlugin = {
  meta: {
    id: "builtin_asset_texture_atlas",
    name: "Texture Atlas & VTT Pack Generator",
    version: "1.0.0",
    description: "Generates top-down/isometric VTT tokens, emblem insignias, character item props, and battlemap avatar atlases.",
    author: "CharGen Core",
    type: "asset_generator",
    language: "typescript",
    enabled: true,
    isBuiltin: true,
  },
  onGenerateAssets: (char: RoleplayCharacter, opts = {}) => {
    const charName = char.name || "Character";
    const packs = [
      {
        id: "vtt_token",
        label: "Top-Down VTT Round Token",
        prompt: `top-down circular tabletop VTT miniature token of ${charName}, ornate metallic golden border, isolated on black background, game asset sprite`,
        aspectRatio: "1:1",
      },
      {
        id: "emblem_crest",
        label: "Character Crest & Faction Insignia",
        prompt: `heraldic personal emblem crest and sigil representing ${charName}, vector badge illustration, clean graphic icon`,
        aspectRatio: "1:1",
      },
      {
        id: "item_prop_atlas",
        label: "Signature Relic & Gear Prop Atlas",
        prompt: `game asset texture atlas of personal weapons, accessories, and signature trinkets belonging to ${charName}, organized isometric grid layout`,
        aspectRatio: "16:9",
      },
      {
        id: "battlemap_chibi",
        label: "Miniature Sprite Sheet (4-Direction)",
        prompt: `pixel art or clean 2D sprite miniature sheet of ${charName}, four-directional turnarounds, white background`,
        aspectRatio: "1:1",
      },
    ];

    const assets: GeneratedAssetPrompt[] = packs.map((pack) => {
      const isLandscape = pack.aspectRatio === "16:9";
      const dims = isLandscape ? { width: 1280, height: 720 } : { width: 1024, height: 1024 };
      return {
        id: `asset_vtt_${char.id || "c"}_${pack.id}`,
        name: `${charName} - VTT/Atlas: ${pack.label}`,
        assetType: "texture_atlas",
        label: pack.label,
        prompt: pack.prompt,
        negativePrompt: "text watermark, blurry, realistic photograph, ugly messy border",
        aspectRatio: pack.aspectRatio,
        dimensions: dims,
        workflowTemplate: getWorkflowTemplateForAsset("texture_atlas", pack.prompt, pack.aspectRatio),
        metadata: { atlasCategory: pack.id },
      };
    });

    return {
      success: true,
      data: {
        assetType: "texture_atlas",
        assets,
      },
    };
  },
};

export const BUILTIN_ASSET_GENERATOR_PLUGINS = [
  expressionSheetPlugin,
  outfitVariantsPlugin,
  textureAtlasPlugin,
];
