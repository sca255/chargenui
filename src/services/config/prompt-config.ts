import * as fs from "node:fs";
import * as path from "node:path";
import type { PromptTemplateConfig, PromptProfileSummary, ImageGenerationConfig } from "../../types/prompt-config";
import type { ProviderConfig } from "../../types/provider";

export const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  systemPrompt:
    "You are an expert Diffusion Prompt Engineer for Stable Diffusion, Illustrious-XL, Flux, Pony XL, and ComfyUI. Your task is to convert this roleplay character profile into an optimized IMAGE GENERATION PROMPT that captures their visual identity.",
  tagRules: `DANBOORU TAG CONVENTIONS:
- Map visual features (hair, eyes, clothing, expression, framing) to standard booru comma tags (e.g. blue_eyes, white_dress, upper_body).
- Use lowercase with underscores for multi-word descriptors.
- Avoid abstract personality descriptions or non-visual text.

NEGATIVE PROMPT CONVENTIONS:
- Default negative filters: worst quality, low quality, blurry, deformed anatomy, extra digits, text, watermark.`,
  models: {
    illustrious: {
      guidance: `TARGET MODEL: ILLUSTRIOUS-XL / ANIMAGINE XL / NOOBAI (BOORU TAG SYSTEM)
- MANDATORY POSITIVE PREFIX: Start with aesthetic quality tags:
  "masterpiece, newest, very aesthetic, absurdres, highres"
- Follow immediately with count & gaze: "1girl, solo, looking_at_viewer" (or "1boy, solo, looking_at_viewer")
- FORMAT: STRICT COMMA-SEPARATED DANBOORU TAGS. Lowercase with underscores for multi-word tags (e.g. silver_hair, long_hair, blue_eyes, white_shirt, pleated_skirt, upper_body, portrait).
- TAG ORDER:
  1. Quality & aesthetic baseline (masterpiece, newest, very aesthetic, absurdres, highres)
  2. Character count & gaze (1girl, solo, looking_at_viewer)
  3. Hair features (color, style, length, bangs)
  4. Eye color & facial traits (pointy_ears, fangs, beauty_mark)
  5. Body physique (slender, curvy, athletic, tall_female)
  6. Wardrobe pieces & accessories (signature outfit)
  7. Expression (slight_smile, neutral_expression, smirk)
  8. Framing (upper_body, portrait for avatar; full_body if specified)
  9. Environment & lighting (simple_background or setting tags)
- PROHIBITIONS:
  - NO natural language prose sentences.
  - NO numbers, measurements, or cup sizes (convert to slender/curvy/large_breasts).
  - NO abstract non-visual personality lore.
- NEGATIVE PROMPT:
  "worst quality, low quality, bad quality, jpeg artifacts, blurry, bad anatomy, bad hands, extra fingers, missing fingers, deformed, malformed, mutated, watermark, signature, text, artist name"`,
      defaultPositivePrefix: "masterpiece, newest, very aesthetic, absurdres, highres, 1girl, solo, looking_at_viewer",
      defaultNegative:
        "worst quality, low quality, bad quality, jpeg artifacts, blurry, bad anatomy, bad hands, extra fingers, missing fingers, deformed, malformed, mutated, watermark, signature, text, artist name",
      recommendedSettings: {
        sampler: "euler_ancestral",
        steps: 28,
        cfg: 6.5,
      },
    },
    pony: {
      guidance: `TARGET MODEL: PONY DIFFUSION V6 / XL (DANBOORU COMMA TAGS & SCORE SYSTEM)
- MUST START with standard Pony score tags:
  "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, source_anime, rating_safe" (or "rating_explicit" for mature/NSFW)
- Follow immediately with count & gaze: "1girl, solo, looking_at_viewer"
- Follow with concise comma-separated Danbooru tags (underscores for multi-word tags): hair color/length, eye color, expression, signature clothing, pose, lighting.
- NEGATIVE PROMPT:
  "score_6, score_5, score_4, source_pony, deformed, bad anatomy, bad hands, text, watermark"`,
      defaultPositivePrefix:
        "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, source_anime, rating_safe, 1girl, solo, looking_at_viewer",
      defaultNegative: "score_6, score_5, score_4, source_pony, deformed, bad anatomy, bad hands, text, watermark",
      recommendedSettings: {
        sampler: "euler_ancestral",
        steps: 25,
        cfg: 7.0,
      },
    },
    flux: {
      guidance: `TARGET MODEL: FLUX.1 / SD 3.5 (NATURAL LANGUAGE PROSE)
- Use rich, descriptive, natural language prose with clear cinematic lighting and tactile fabric/material textures.
- Do NOT use comma tag salad or generic quality spam (avoid 'masterpiece, best quality, 8k').
- Explicitly describe: eye color, hairstyle, facial expression, clothing pieces and fabrics, lighting angle, and subtle background depth.
- NEGATIVE PROMPT: Leave blank or minimal (Flux does not use negative guidance).`,
      defaultPositivePrefix: "",
      defaultNegative: "",
      recommendedSettings: {
        sampler: "euler",
        steps: 24,
        cfg: 3.5,
      },
    },
    sdxl: {
      guidance: `TARGET MODEL: SDXL / STANDARD DIFFUSION
- Combine strong visual descriptors with sensory details. Focus on lighting, composition, facial fidelity, and costume accuracy.
- Clean digital art or cinematic photography aesthetic without tag spam.
- NEGATIVE PROMPT:
  "low quality, bad anatomy, blurry, deformed, extra limbs, bad hands, text, watermark, signature"`,
      defaultPositivePrefix: "masterpiece, 8k, cinematic photo",
      defaultNegative: "low quality, bad anatomy, blurry, deformed, extra limbs, bad hands, text, watermark, signature",
      recommendedSettings: {
        sampler: "dpmpp_2m_karras",
        steps: 30,
        cfg: 7.0,
      },
    },
    midjourney: {
      guidance: `TARGET MODEL: MIDJOURNEY V6
- Write an evocative, cinematic description with artistic composition, lens optics, and lighting.
- Append standard Midjourney flags at the end: "--ar <aspectRatio> --v 6.1 --style raw".`,
      defaultPositivePrefix: "",
      defaultNegative: "",
      recommendedSettings: {
        sampler: "default",
        steps: 30,
        cfg: 6.0,
      },
    },
    general: {
      guidance: `TARGET MODEL: GENERAL DIFFUSION
- Balanced visual prompt emphasizing subject fidelity, clothing textures, ambient lighting, and composition.`,
      defaultPositivePrefix: "masterpiece, 8k",
      defaultNegative: "low quality, bad anatomy, blurry, deformed, watermark",
      recommendedSettings: {
        sampler: "dpmpp_2m_karras",
        steps: 30,
        cfg: 7.0,
      },
    },
  },
  intentDirectives: {
    standard_avatar: `MANDATORY AVATAR DIRECTIVE (CLEAN NORMAL PORTRAIT):
- The user is generating a NORMAL, DIGNIFIED CHARACTER PROFILE PICTURE / AVATAR.
- The character MUST be portrayed standing or seated naturally in their SIGNATURE/REGULAR CLOTHING (e.g. dress, armor, jacket, uniform).
- They must be looking directly toward the viewer with their authentic character expression.
- ABSOLUTELY NO BONDAGE, NO ROPES, NO CHAINS, NO RESTRAINTS, NO GAGS, NO CAPTIVITY, NO EXPLICIT SEXUAL ACTS.
- CRITICAL: Even if the character card mentions BDSM, submission, dominance, or dark themes, those are strictly conversational/roleplay elements—NOT their default avatar! Do NOT put {{char}} in ropes or restraints. Depict them free, intact, and well-dressed.`,
    casual: `CASUAL ATTIRE DIRECTIVE:
- Depict the character in relaxed, everyday casual clothing in an informal setting.
- Clean, comfortable vibe looking toward the camera. No combat gear, no bondage.`,
    action: `ACTION / COMBAT DIRECTIVE:
- Depict the character in an active combat stance with weapons or magic drawn, dynamic lighting.`,
    sensual_kink: `SENSUAL / KINK DIRECTIVE:
- The user has explicitly requested a sensual or power-exchange depiction incorporating their themes.`,
    greeting: `GREETING SCENE / OPENING MESSAGE ILLUSTRATION DIRECTIVE:
- The user is generating an environmental GREETING SCENE illustrating {{char}} in the opening message of the roleplay.
- Base the environment, physical location, character's active pose, emotional state, props, and situation on:
  First Message and Scenario context.
- If the first message explicitly depicts the character in a specific location (e.g. rain-slicked gothic rooftops, royal throne room, dark dungeon, tavern counter, battlefield, laboratory), illustrate THAT exact environment.
- If the first message explicitly describes their physical state or situation (e.g. tied up, resting, battle-damaged, holding smoking revolvers, chained to an altar, lounging seductively), FAITHFULLY illustrate that opening narrative moment.
- Keep {{char}}'s physical hair, eyes, and facial identity from their description.`,
  },
};

function resolveProjectRoot(): string {
  // If running from project root, process.cwd()/config exists
  if (fs.existsSync(path.resolve(process.cwd(), "config", "prompts.default.json"))) {
    return process.cwd();
  }
  // Fallback using import.meta.dir relative path (/src/services/config -> ../../..)
  const metaDir = typeof import.meta.dir === "string" ? import.meta.dir : path.dirname(__filename);
  const upRoot = path.resolve(metaDir, "../../..");
  if (fs.existsSync(path.resolve(upRoot, "config", "prompts.default.json"))) {
    return upRoot;
  }
  return process.cwd();
}

const PROJECT_ROOT = resolveProjectRoot();
const CONFIG_DIR = path.resolve(PROJECT_ROOT, "config");
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.default.json");
const LOCAL_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.local.json");
const LOCAL_BDSM_MALEDOM_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.local-maledom-bdsm.json");
const EVOLVED_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.evolved.private.json");
const PRIVATE_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.private.json");
const WEAVER_CONFIG_PATH = path.join(CONFIG_DIR, "weaver-prompts.json");
const CUSTOM_CONFIG_PATH = path.join(CONFIG_DIR, "prompts.custom.json");
const ACTIVE_PROFILE_FILE = path.join(CONFIG_DIR, ".active-profile");

let cachedConfig: PromptTemplateConfig | null = null;
let currentProfileId: string = "default";

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`[PromptConfig] Failed to read ${filePath}:`, err);
  }
  return null;
}

function writeJsonFile(filePath: string, data: any): void {
  ensureConfigDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function initPromptConfig(): void {
  ensureConfigDir();

  // Read saved active profile id if present
  if (fs.existsSync(ACTIVE_PROFILE_FILE)) {
    try {
      currentProfileId = fs.readFileSync(ACTIVE_PROFILE_FILE, "utf-8").trim();
    } catch {}
  } else {
    // Prefer evolved private profile if available, then classic private, then default
    if (fs.existsSync(EVOLVED_CONFIG_PATH)) {
      currentProfileId = "weaver_evolved";
    } else if (fs.existsSync(PRIVATE_CONFIG_PATH) || fs.existsSync(WEAVER_CONFIG_PATH)) {
      currentProfileId = "weaver";
    } else {
      currentProfileId = "default";
    }
  }

  loadActiveConfig();
}

function loadActiveConfig(): PromptTemplateConfig {
  let loaded: PromptTemplateConfig | null = null;

  if (currentProfileId === "custom") {
    loaded = readJsonFile<PromptTemplateConfig>(CUSTOM_CONFIG_PATH);
  } else if (currentProfileId === "local_maledom_bdsm") {
    loaded = readJsonFile<PromptTemplateConfig>(LOCAL_BDSM_MALEDOM_CONFIG_PATH);
  } else if (currentProfileId === "local_playable" || currentProfileId === "local") {
    loaded = readJsonFile<PromptTemplateConfig>(LOCAL_CONFIG_PATH);
  } else if (currentProfileId === "weaver_evolved") {
    loaded = readJsonFile<PromptTemplateConfig>(EVOLVED_CONFIG_PATH);
  } else if (currentProfileId === "weaver" || currentProfileId === "private") {
    loaded = readJsonFile<PromptTemplateConfig>(PRIVATE_CONFIG_PATH) || readJsonFile<PromptTemplateConfig>(WEAVER_CONFIG_PATH);
  }

  if (!loaded && currentProfileId === "default") {
    loaded = readJsonFile<PromptTemplateConfig>(DEFAULT_CONFIG_PATH);
  }

  // Dynamic profile lookup for any custom prompts.*.json files
  if (!loaded && currentProfileId) {
    const directPath = path.join(CONFIG_DIR, `${currentProfileId}.json`);
    const prefixPath = path.join(CONFIG_DIR, `prompts.${currentProfileId}.json`);
    loaded = readJsonFile<PromptTemplateConfig>(directPath) || readJsonFile<PromptTemplateConfig>(prefixPath);
  }

  // Fallbacks if selected profile missing
  if (!loaded) {
    loaded = readJsonFile<PromptTemplateConfig>(LOCAL_CONFIG_PATH);
  }
  if (!loaded) {
    loaded = readJsonFile<PromptTemplateConfig>(EVOLVED_CONFIG_PATH);
  }
  if (!loaded) {
    loaded = readJsonFile<PromptTemplateConfig>(PRIVATE_CONFIG_PATH) || readJsonFile<PromptTemplateConfig>(WEAVER_CONFIG_PATH);
  }
  if (!loaded) {
    loaded = readJsonFile<PromptTemplateConfig>(DEFAULT_CONFIG_PATH);
  }

  if (!loaded) {
    throw new Error("No prompt configuration files found in config/ directory!");
  }

  cachedConfig = loaded;
  return cachedConfig;
}

export function getActivePromptConfig(): PromptTemplateConfig {
  if (!cachedConfig) {
    initPromptConfig();
  }
  return cachedConfig!;
}

export function isLocalModelArchitecture(provider?: ProviderConfig): boolean {
  if (!provider) return false;
  if (provider.type === "llamacpp" || provider.type === "ollama") return true;

  // Check if baseUrl points to a local endpoint (e.g. LM Studio, llama-server, Ollama, vLLM, TextGen)
  const baseUrlLower = (provider.baseUrl || "").toLowerCase();
  if (
    baseUrlLower.includes("localhost") ||
    baseUrlLower.includes("127.0.0.1") ||
    baseUrlLower.includes("0.0.0.0") ||
    baseUrlLower.includes(":11434") ||
    baseUrlLower.includes(":8080") ||
    baseUrlLower.includes(":1234") ||
    baseUrlLower.includes(":5000") ||
    baseUrlLower.includes(":5001")
  ) {
    return true;
  }

  const modelLower = (provider.model || "").toLowerCase();
  const localKeywords = [
    "llama",
    "qwen",
    "mistral",
    "mixtral",
    "gemma",
    "phi",
    "stheno",
    "fimbulvetr",
    "noromaid",
    "lumimaid",
    "wizardlm",
    "solar",
    "yi-",
    "deepseek",
    "command-r",
    "minicpm",
    "nemotron",
    "smollm",
    "glm",
    "hermes",
    "gguf",
    "exl2",
    "awq",
    "gptq",
  ];
  return localKeywords.some((kw) => modelLower.includes(kw));
}

/**
 * Returns the effective prompt configuration.
 * If the provider is a local model (llama.cpp, ollama, local quant, Gemma 4, etc.)
 * and the profile is either default or unset, it automatically serves the high-performance
 * Playable RP profile tuned specifically for local model architectures.
 */
export function getEffectivePromptConfig(provider?: ProviderConfig): PromptTemplateConfig {
  const active = getActivePromptConfig();
  if (currentProfileId === "local_maledom_bdsm" || currentProfileId === "local_playable" || currentProfileId === "local") {
    return active;
  }
  if (provider && isLocalModelArchitecture(provider)) {
    // If user is running a local model and hasn't explicitly locked custom, serve local_playable
    if (active.id === "default" || active.id === "local_playable") {
      const localCfg = readJsonFile<PromptTemplateConfig>(LOCAL_CONFIG_PATH);
      if (localCfg) return localCfg;
    }
  }
  return active;
}

export function listPromptProfiles(): PromptProfileSummary[] {
  ensureConfigDir();
  const profiles: PromptProfileSummary[] = [];

  // Playable RP (Local Models - Male Dom & BDSM Target)
  const localBdsmCfg = readJsonFile<PromptTemplateConfig>(LOCAL_BDSM_MALEDOM_CONFIG_PATH);
  if (localBdsmCfg) {
    profiles.push({
      id: "local_maledom_bdsm",
      name: localBdsmCfg.name || "Playable RP — Male Dom & BDSM (Tuned for Local Models)",
      description: localBdsmCfg.description || "Direct, concrete prompts tuned for local models with explicit male dominance, patriarchal authority, chastisement/discipline protocols, and deep surrender.",
      isPrivate: false,
      isCurrent: currentProfileId === "local_maledom_bdsm",
    });
  }

  // Playable RP (Local Models & Fast Roleplay)
  const localCfg = readJsonFile<PromptTemplateConfig>(LOCAL_CONFIG_PATH);
  if (localCfg) {
    profiles.push({
      id: "local_playable",
      name: localCfg.name || "Playable RP (Tuned for Local Models & Fast Roleplay)",
      description: localCfg.description || "Direct, concrete, playability-first prompts tuned for local models (llama.cpp, Ollama, Llama 3, Qwen 2.5, Mistral)",
      isPrivate: false,
      isCurrent: currentProfileId === "local_playable" || currentProfileId === "local",
    });
  }

  // Weaver Evolved (Private - Recommended)
  const evolved = readJsonFile<PromptTemplateConfig>(EVOLVED_CONFIG_PATH);
  if (evolved) {
    profiles.push({
      id: "weaver_evolved",
      name: evolved.name || "Weaver Evolved (Natural Living Persona)",
      description: evolved.description || "Next-gen natural living persona engine",
      isPrivate: true,
      isCurrent: currentProfileId === "weaver_evolved",
    });
  }

  // Classic Weaver (Private)
  const priv = readJsonFile<PromptTemplateConfig>(PRIVATE_CONFIG_PATH) || readJsonFile<PromptTemplateConfig>(WEAVER_CONFIG_PATH);
  if (priv) {
    profiles.push({
      id: "weaver",
      name: priv.name || "Weaver Classic (Private)",
      description: priv.description || "Authentic authoring prompts (git-ignored)",
      isPrivate: true,
      isCurrent: currentProfileId === "weaver" || currentProfileId === "private",
    });
  }

  // Default
  const def = readJsonFile<PromptTemplateConfig>(DEFAULT_CONFIG_PATH);
  if (def) {
    profiles.push({
      id: "default",
      name: def.name || "CharGen Default",
      description: def.description || "Default prompt configuration",
      isPrivate: false,
      isCurrent: currentProfileId === "default",
    });
  }

  // Custom User Profile
  const custom = readJsonFile<PromptTemplateConfig>(CUSTOM_CONFIG_PATH);
  if (custom) {
    profiles.push({
      id: "custom",
      name: custom.name || "Custom Overrides",
      description: custom.description || "User-customized prompts (git-ignored)",
      isPrivate: true,
      isCurrent: currentProfileId === "custom",
    });
  }

  // Scan all other JSON files in config/ directory dynamically (e.g. prompts.*.json)
  const allFiles = fs.readdirSync(CONFIG_DIR);
  for (const f of allFiles) {
    if (!f.endsWith(".json")) continue;
    if (
      f === "prompts.default.json" ||
      f === "prompts.local.json" ||
      f === "prompts.local-maledom-bdsm.json" ||
      f === "prompts.evolved.private.json" ||
      f === "prompts.private.json" ||
      f === "weaver-prompts.json" ||
      f === "prompts.custom.json"
    ) {
      continue;
    }
    const fullPath = path.join(CONFIG_DIR, f);
    const parsed = readJsonFile<PromptTemplateConfig>(fullPath);
    if (parsed && (parsed.id || parsed.name)) {
      const pId = parsed.id || f.replace(/\.json$/, "");
      if (!profiles.some((p) => p.id === pId)) {
        profiles.push({
          id: pId,
          name: parsed.name || f.replace(/\.json$/, "").replace(/^prompts\./, ""),
          description: parsed.description || `Custom preset from ${f}`,
          isPrivate: !!parsed.isPrivate,
          isCurrent: currentProfileId === pId,
          version: parsed.version || 1,
          parentId: parsed.parentId,
          tags: parsed.tags || [],
        });
      }
    }
  }

  return profiles;
}

/**
 * Fork an existing prompt profile to create a new versioned template.
 */
export function forkPromptProfile(
  sourceProfileId: string,
  overrides?: { name?: string; description?: string; changelogEntry?: string; tags?: string[] }
): PromptTemplateConfig {
  ensureConfigDir();
  const source = getActivePromptConfig();
  const currentVer = source.version || 1;
  const newVer = currentVer + 1;
  const safeBaseName = (overrides?.name || source.name || "Custom").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const newId = `profile_${safeBaseName}_v${newVer}_${Date.now().toString(36)}`;
  
  const existingChangelog = Array.isArray(source.changelog) ? [...source.changelog] : [];
  if (overrides?.changelogEntry) {
    existingChangelog.push(`v${newVer}: ${overrides.changelogEntry} (${new Date().toISOString().split("T")[0]})`);
  } else {
    existingChangelog.push(`v${newVer}: Forked from ${source.id || sourceProfileId} at ${new Date().toISOString().split("T")[0]}`);
  }

  const forked: PromptTemplateConfig = {
    ...source,
    id: newId,
    name: overrides?.name || `${source.name} (v${newVer})`,
    description: overrides?.description || source.description,
    version: newVer,
    parentId: source.id || sourceProfileId,
    changelog: existingChangelog,
    tags: overrides?.tags || source.tags || [],
    isPrivate: true,
  };

  const savePath = path.join(CONFIG_DIR, `prompts.${newId}.json`);
  writeJsonFile(savePath, forked);
  return setActiveProfile(newId);
}

export function setActiveProfile(id: string): PromptTemplateConfig {
  ensureConfigDir();
  currentProfileId = id;
  fs.writeFileSync(ACTIVE_PROFILE_FILE, id, "utf-8");
  return loadActiveConfig();
}

export function saveCustomPromptConfig(updated: Partial<PromptTemplateConfig>): PromptTemplateConfig {
  ensureConfigDir();
  const base = getActivePromptConfig();
  const merged: PromptTemplateConfig = {
    ...base,
    ...updated,
    id: "custom",
    name: updated.name || "Custom Overrides",
    description: updated.description || "User-customized prompts (git-ignored)",
    isPrivate: true,
    spineSynthesis: {
      ...base.spineSynthesis,
      ...(updated.spineSynthesis || {}),
    },
    fieldRenderers: {
      ...base.fieldRenderers,
      ...(updated.fieldRenderers || {}),
      description: {
        ...base.fieldRenderers.description,
        ...(updated.fieldRenderers?.description || {}),
      },
      personality: {
        ...base.fieldRenderers.personality,
        ...(updated.fieldRenderers?.personality || {}),
      },
      scenarioAndFirstMes: {
        ...base.fieldRenderers.scenarioAndFirstMes,
        ...(updated.fieldRenderers?.scenarioAndFirstMes || {}),
      },
      aliChatAndAlts: {
        ...base.fieldRenderers.aliChatAndAlts,
        ...(updated.fieldRenderers?.aliChatAndAlts || {}),
      },
    },
    imageGeneration: {
      ...base.imageGeneration,
      ...(updated.imageGeneration || {}),
      models: {
        ...(base.imageGeneration?.models || DEFAULT_IMAGE_GENERATION_CONFIG.models),
        ...(updated.imageGeneration?.models || {}),
      },
      intentDirectives: {
        ...(base.imageGeneration?.intentDirectives || DEFAULT_IMAGE_GENERATION_CONFIG.intentDirectives),
        ...(updated.imageGeneration?.intentDirectives || {}),
      },
    },
  };

  writeJsonFile(CUSTOM_CONFIG_PATH, merged);
  currentProfileId = "custom";
  fs.writeFileSync(ACTIVE_PROFILE_FILE, "custom", "utf-8");
  cachedConfig = merged;
  return merged;
}

export function resetToDefault(): PromptTemplateConfig {
  return setActiveProfile("default");
}

export function getImageGenerationConfig(provider?: ProviderConfig): ImageGenerationConfig {
  const active = getEffectivePromptConfig(provider);
  if (active.imageGeneration?.models?.illustrious) {
    return active.imageGeneration;
  }
  return DEFAULT_IMAGE_GENERATION_CONFIG;
}
