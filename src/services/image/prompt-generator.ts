import type {
  ImagePromptRequest,
  ImagePromptResult,
  ImageTargetModel,
  ImageArtStyle,
  ImageShotType,
  PortraitIntent,
  ImagePromptPurpose,
  VisualIdentity,
} from "../../types/image-prompt";
import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { getImageGenerationConfig } from "../config/prompt-config";

function getDimensionsForRatio(ratio: string): { width: number; height: number } {
  switch (ratio) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "16:9":
      return { width: 1216, height: 832 };
    case "9:16":
      return { width: 768, height: 1344 };
    case "4:5":
      return { width: 896, height: 1152 };
    case "2:3":
    default:
      return { width: 832, height: 1216 };
  }
}

function getSettingsForModel(model: ImageTargetModel): { sampler: string; steps: number; cfg: number } {
  switch (model) {
    case "anima":
      return { sampler: "euler", steps: 25, cfg: 5.0 };
    case "flux":
      return { sampler: "euler", steps: 24, cfg: 3.5 };
    case "pony":
      return { sampler: "euler_ancestral", steps: 25, cfg: 7.0 };
    case "illustrious":
      return { sampler: "euler_ancestral", steps: 28, cfg: 6.5 };
    case "midjourney":
      return { sampler: "default", steps: 30, cfg: 6.0 };
    case "sdxl":
    default:
      return { sampler: "dpmpp_2m_karras", steps: 30, cfg: 7.0 };
  }
}

/**
 * Extracts the physical appearance section from character description (Tagged bundle [FORM] or Appearance header).
 */
function extractPhysicalForm(desc: string): string {
  if (!desc) return "";
  // Check for Weaver [FORM] section
  const formMatch = desc.match(/\[FORM\]([\s\S]*?)(?=\[(?:CORE|ARC|TENSIONS|INTENT|NEGATIVE SPACE|GRADIENT)\]|$)/i);
  if (formMatch && formMatch[1].trim()) {
    return formMatch[1].trim();
  }

  // Check for markdown ### Appearance section
  const mdMatch = desc.match(/###\s*Appearance([\s\S]*?)(?=###|$)/i);
  if (mdMatch && mdMatch[1].trim()) {
    return mdMatch[1].trim();
  }

  return desc.slice(0, 800);
}

interface ExtractedVisualTags {
  genderTag: string;
  ageTag: string;
  ageLabel: string;
  ageProse: string;
  hairTags: string[];
  eyeTags: string[];
  featureTags: string[];
  buildTags: string[];
  clothingTags: string[];
  expressionTag: string;
}

/**
 * Deterministically parses visual attributes from character description/form
 * directly aligned with Weaver's Booru tag extraction architecture.
 */
function extractDeterministicTags(desc: string, name: string): ExtractedVisualTags {
  const text = (desc + " " + name).toLowerCase();

  // Gender detection
  const isMale =
    /\b(he|him|his|man|male|boy|prince|king|guy|husband|father|brother)\b/i.test(text) &&
    !/\b(she|her|hers|woman|female|girl|princess|queen|wife|mother|sister)\b/i.test(text);
  const genderTag = isMale ? "1boy" : "1girl";

  // Age detection & Life Stage anchoring
  let numericalAge: number | undefined;
  const numMatch =
    text.match(/\b(?:age|aged)\s*[:=]?\s*(\d{1,3})\b/) ||
    text.match(/\b(\d{1,3})[- ]*(?:years?[- ]*old|y[\/.]?o)\b/) ||
    text.match(/\bin\s+(?:her|his|their)\s+(\d0)s\b/);

  if (numMatch && numMatch[1]) {
    const val = parseInt(numMatch[1], 10);
    if (!isNaN(val) && val > 0 && val < 200) {
      numericalAge = val;
    }
  }

  // Word-based decade matching (in her twenties, in his sixties, etc.)
  if (numericalAge === undefined) {
    if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*twenties\b/i.test(text)) numericalAge = 25;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*thirties\b/i.test(text)) numericalAge = 35;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*forties\b/i.test(text)) numericalAge = 45;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*fifties\b/i.test(text)) numericalAge = 55;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*sixties\b/i.test(text)) numericalAge = 65;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*seventies\b/i.test(text)) numericalAge = 75;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*eighties\b/i.test(text)) numericalAge = 85;
    else if (/\bin\s+(?:her|his|their)\s+(?:early|mid|late)?\s*nineties\b/i.test(text)) numericalAge = 95;
  }

  const isElderlySemantic = /\b(elderly|old lady|old woman|old man|grandmother|grandma|granny|crone|geriatric|senior citizen|aged woman|aged man|wrinkles|wrinkled skin|crow's feet|silver-haired elder|octogenarian|septuagenarian|nonagenarian|frail elder|old age)\b/i.test(text);
  const isMatureSemantic = /\b(middle[- ]aged|mature woman|mature female|mature man|mature male|matriarch|milf|dilf|cougar|motherly|fatherly|matron|matronly)\b/i.test(text);

  let ageTag = "";
  let ageLabel = "";
  let ageProse = "";

  if ((numericalAge !== undefined && numericalAge >= 58) || (numericalAge === undefined && isElderlySemantic)) {
    const ageNumStr = numericalAge ? ` (${numericalAge} years old)` : "";
    if (isMale) {
      ageTag = "elderly_man, old_man, wrinkles";
      ageLabel = `Elderly man${ageNumStr} — authentic facial wrinkles, senior facial structure, aged features`;
      ageProse = `an elderly man${ageNumStr} with authentic facial wrinkles and senior features`;
    } else {
      ageTag = "elderly_woman, old_woman, wrinkles";
      ageLabel = `Elderly woman / old lady${ageNumStr} — authentic facial wrinkles, grandmotherly/senior facial structure, aged features`;
      ageProse = `an elderly woman${ageNumStr} with authentic facial wrinkles and senior features`;
    }
  } else if ((numericalAge !== undefined && numericalAge >= 38) || isMatureSemantic) {
    const ageNumStr = numericalAge ? ` (${numericalAge} years old)` : "";
    if (isMale) {
      ageTag = "mature_male, middle-aged_male";
      ageLabel = `Mature / middle-aged man${ageNumStr}`;
      ageProse = `a mature middle-aged man${ageNumStr}`;
    } else {
      ageTag = "mature_female, middle-aged_woman";
      ageLabel = `Mature / middle-aged woman${ageNumStr}`;
      ageProse = `a mature middle-aged woman${ageNumStr}`;
    }
  } else if (numericalAge !== undefined && numericalAge >= 20) {
    if (numericalAge >= 28) {
      ageTag = isMale ? "adult_male, 30yo" : "adult_woman, 30yo";
      ageLabel = `Adult (${numericalAge} years old)`;
      ageProse = isMale ? `a ${numericalAge}-year-old adult man` : `a ${numericalAge}-year-old adult woman`;
    } else {
      ageTag = isMale ? "young_man, 20yo" : "young_woman, 20yo";
      ageLabel = `Young adult (${numericalAge} years old)`;
      ageProse = isMale ? `a young man (${numericalAge}yo)` : `a young woman (${numericalAge}yo)`;
    }
  } else if (numericalAge !== undefined) {
    ageTag = isMale ? "young_man, 18yo" : "young_woman, 18yo";
    ageLabel = `Young adult (${numericalAge} years old)`;
    ageProse = isMale ? `an 18-year-old young man` : `an 18-year-old young woman`;
  }
  // If no age is explicitly stated or detected, leave ageTag/ageLabel empty rather than inventing one.

  const hairTags: string[] = [];
  const hairColors = [
    "silver",
    "white",
    "black",
    "blonde",
    "blond",
    "brown",
    "blue",
    "red",
    "pink",
    "purple",
    "green",
    "orange",
    "grey",
    "gray",
    "dark",
    "light blue",
    "cyan",
    "crimson",
    "golden",
  ];
  for (const color of hairColors) {
    const norm = color.replace(" ", "_");
    if (
      new RegExp(`\\b${color}\\s+(?:colored\\s+)?hair\\b`, "i").test(text) ||
      new RegExp(`\\bhair\\s*:\\s*[^,\\n]*\\b${color}\\b`, "i").test(text)
    ) {
      hairTags.push(`${norm}_hair`);
      break;
    }
  }

  const hairStyles: Array<[string, string]> = [
    ["long hair", "long_hair"],
    ["short hair", "short_hair"],
    ["medium hair", "medium_hair"],
    ["ponytail", "ponytail"],
    ["twintails", "twintails"],
    ["twin tails", "twintails"],
    ["braid", "braid"],
    ["bob cut", "bob_cut"],
    ["bangs", "bangs"],
    ["ahoge", "ahoge"],
    ["messy hair", "messy_hair"],
    ["wavy hair", "wavy_hair"],
    ["curly hair", "curly_hair"],
  ];
  for (const [pattern, tag] of hairStyles) {
    if (new RegExp(`\\b${pattern}\\b`, "i").test(text) && !hairTags.includes(tag)) {
      hairTags.push(tag);
    }
  }

  const eyeTags: string[] = [];
  const eyeColors = [
    "blue",
    "red",
    "green",
    "amber",
    "golden",
    "gold",
    "brown",
    "purple",
    "violet",
    "hazel",
    "yellow",
    "grey",
    "gray",
    "crimson",
  ];
  for (const color of eyeColors) {
    const norm = color.replace(" ", "_");
    if (
      new RegExp(`\\b${color}\\s+(?:colored\\s+)?eyes\\b`, "i").test(text) ||
      new RegExp(`\\beyes?\\s*:\\s*[^,\\n]*\\b${color}\\b`, "i").test(text)
    ) {
      eyeTags.push(`${norm}_eyes`);
      break;
    }
  }

  const featureTags: string[] = [];
  const featurePatterns: Array<[string, string]> = [
    ["cat ears", "cat_ears"],
    ["fox ears", "fox_ears"],
    ["animal ears", "animal_ears"],
    ["pointy ears", "pointy_ears"],
    ["elf ears", "pointy_ears"],
    ["horns", "horns"],
    ["cat tail", "cat_tail"],
    ["tail", "tail"],
    ["wings", "wings"],
    ["fangs", "fangs"],
    ["fang", "fangs"],
    ["glasses", "glasses"],
    ["freckles", "freckles"],
    ["pale skin", "pale_skin"],
    ["tan", "tan"],
    ["dark skin", "dark_skin"],
    ["beauty mark", "beauty_mark"],
    ["scar", "scar"],
  ];
  for (const [pattern, tag] of featurePatterns) {
    if (new RegExp(`\\b${pattern}\\b`, "i").test(text) && !featureTags.includes(tag)) {
      featureTags.push(tag);
    }
  }

  const buildTags: string[] = [];
  const buildPatterns: Array<[string, string]> = [
    ["slender", "slender"],
    ["petite", "petite"],
    ["curvy", "curvy"],
    ["athletic", "athletic"],
    ["tall", isMale ? "tall_male" : "tall_female"],
    ["large breasts", "large_breasts"],
    ["medium breasts", "medium_breasts"],
    ["flat chest", "flat_chest"],
  ];
  for (const [pattern, tag] of buildPatterns) {
    if (new RegExp(`\\b${pattern}\\b`, "i").test(text) && !buildTags.includes(tag)) {
      buildTags.push(tag);
    }
  }

  const clothingTags: string[] = [];
  const clothingPatterns: Array<[string, string]> = [
    ["black jacket", "black_jacket"],
    ["jacket", "jacket"],
    ["coat", "coat"],
    ["trench coat", "trench_coat"],
    ["white shirt", "white_shirt"],
    ["collared shirt", "collared_shirt"],
    ["shirt", "shirt"],
    ["suit", "suit"],
    ["dress", "dress"],
    ["black dress", "black_dress"],
    ["white dress", "white_dress"],
    ["skirt", "skirt"],
    ["pleated skirt", "pleated_skirt"],
    ["thighhighs", "thighhighs"],
    ["boots", "boots"],
    ["gloves", "gloves"],
    ["uniform", "uniform"],
    ["armor", "armor"],
    ["hoodie", "hoodie"],
    ["sweater", "sweater"],
    ["ribbon", "ribbon"],
    ["tie", "tie"],
    ["choker", "choker"],
  ];
  for (const [pattern, tag] of clothingPatterns) {
    if (new RegExp(`\\b${pattern}\\b`, "i").test(text) && !clothingTags.includes(tag)) {
      clothingTags.push(tag);
      if (clothingTags.length >= 4) break;
    }
  }

  let expressionTag = "slight_smile";
  if (/\b(angry|glare|furious|wrath)\b/i.test(text)) expressionTag = "glare, serious";
  else if (/\b(smirk|teasing|playful|cunning)\b/i.test(text)) expressionTag = "smirk";
  else if (/\b(cold|stoic|calm|serious|reserved)\b/i.test(text)) expressionTag = "neutral_expression";
  else if (/\b(shy|timid|blush|embarrassed)\b/i.test(text)) expressionTag = "blush, shy";

  return {
    genderTag,
    ageTag,
    ageLabel,
    ageProse,
    hairTags,
    eyeTags,
    featureTags,
    buildTags,
    clothingTags,
    expressionTag,
  };
}

/**
 * Passes the whole card except example messages, greetings, and post history to the AI.
 */
export function sanitizeCardForVisualExtraction(card: Partial<RoleplayCharacter>): Record<string, any> {
  const sanitized: Record<string, any> = { ...card };
  delete sanitized.first_mes;
  delete sanitized.alternate_greetings;
  delete sanitized.group_only_greetings;
  delete sanitized.mes_example;
  delete sanitized.post_history_instructions;
  return sanitized;
}

/**
 * Extracts character visual identity using configured LLM provider,
 * passing all card details except example messages, greetings, and post history.
 * Falls back safely to deterministic tag extraction if LLM is unavailable or fails.
 */
export async function extractVisualIdentityWithLLM(
  card: Partial<RoleplayCharacter>,
  provider?: ProviderConfig
): Promise<VisualIdentity> {
  const charName = card.name || "Character";
  const desc = card.description || "";
  const deterministic = extractDeterministicTags(desc, charName);

  const fallbackIdentity: VisualIdentity = {
    gender: deterministic.genderTag || "1girl",
    age: deterministic.ageLabel || (deterministic.ageTag ? deterministic.ageTag.replace(/_/g, " ") : "Adult"),
    hair: deterministic.hairTags.join(", "),
    eyes: deterministic.eyeTags.join(", "),
    features: deterministic.featureTags.join(", "),
    build: deterministic.buildTags.join(", "),
    clothing: deterministic.clothingTags.join(", "),
    tags: [
      deterministic.genderTag,
      deterministic.ageTag,
      ...deterministic.hairTags,
      ...deterministic.eyeTags,
      ...deterministic.featureTags,
      ...deterministic.buildTags,
      ...deterministic.clothingTags,
    ].filter(Boolean),
  };

  if (!provider) {
    return fallbackIdentity;
  }

  try {
    const sanitized = sanitizeCardForVisualExtraction(card);
    const loreSnippet = sanitized.character_book?.entries?.length
      ? sanitized.character_book.entries
          .slice(0, 10)
          .map((e: any) => `[${(e.keys || []).join(", ")}]: ${e.content}`)
          .join("\n")
      : "";

    const userContent = `Analyze the following character profile and extract their canonical VISUAL IDENTITY and Danbooru tags.
These visual tags will be locked into the character's card extensions to guarantee visual consistency across all AI image generations.

CHARACTER PROFILE:
- Name: ${sanitized.name || "Unknown"}
${sanitized.description ? `- Description:\n${sanitized.description.slice(0, 3000)}` : ""}
${sanitized.personality ? `- Personality:\n${sanitized.personality.slice(0, 1500)}` : ""}
${sanitized.scenario ? `- Scenario:\n${sanitized.scenario.slice(0, 1200)}` : ""}
${sanitized.system_prompt ? `- System Prompt / Directives:\n${sanitized.system_prompt.slice(0, 1000)}` : ""}
${sanitized.creator_notes ? `- Creator Notes:\n${sanitized.creator_notes.slice(0, 800)}` : ""}
${Array.isArray(sanitized.tags) && sanitized.tags.length ? `- Tags: ${sanitized.tags.join(", ")}` : ""}
${loreSnippet ? `- Lorebook / World Info:\n${loreSnippet.slice(0, 1500)}` : ""}

CRITICAL EXTRACTION RULES:
1. AGE & LIFE STAGE FIDELITY (MANDATORY):
   - Scrutinize the character's age, life stage, and physical maturity.
   - If the character is elderly, grandmotherly, or senior (e.g. 60+, 70+, 80+), you MUST specify an elderly label and include tags like 'elderly_woman, old_woman, wrinkles' or 'elderly_man, old_man, wrinkles'. NEVER de-age an old person into a 20-something!
   - If middle-aged or mature (e.g. 40s, 50s, matriarch), use 'mature_female' or 'mature_male'.
   - If young adult (18-35), specify appropriate young adult tags.
2. DANBOORU / DIFFUSION TAG CONVENTIONS:
   - Use standard Danbooru snake_case tags (e.g., 1girl, 1boy, silver_hair, twin_braids, crimson_eyes, fangs, pale_skin, pointed_ears, glasses, etc.).
3. Return STRICT JSON with this schema:
{
  "gender": "1girl" or "1boy" or "other",
  "age": "Descriptive age/life stage label, e.g. Elderly woman (72 years old), authentic facial wrinkles",
  "hair": "comma-separated hair color & style tags, e.g. silver_hair, long_hair, twin_braids, bangs",
  "eyes": "comma-separated eye tags, e.g. crimson_eyes",
  "features": "comma-separated distinctive facial/body features, e.g. wrinkles, pale_skin, fangs, glasses",
  "build": "comma-separated body build tags, e.g. slender, petite or muscular, broad_shoulders",
  "clothing": "signature outfit / aesthetic palette tags, e.g. gothic_dress, choker, black_attire",
  "tags": ["1girl", "elderly_woman", "wrinkles", "silver_hair", "long_hair", "twin_braids", "crimson_eyes", "fangs", "pale_skin", "gothic_dress"]
}`;

    const messages = [
      {
        role: "system" as const,
        content: "You are an expert anime, visual media, and diffusion model character profiler and Danbooru tag engineer. You output only strict JSON.",
      },
      { role: "user" as const, content: userContent },
    ];

    const raw = await routeLLMJson<any>(provider, messages);

    if (raw && typeof raw === "object") {
      const rawTags = Array.isArray(raw.tags)
        ? raw.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof raw.tags === "string"
        ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      const result: VisualIdentity = {
        gender: typeof raw.gender === "string" && raw.gender.trim() ? raw.gender.trim() : fallbackIdentity.gender,
        age: typeof raw.age === "string" && raw.age.trim() ? raw.age.trim() : fallbackIdentity.age,
        hair: typeof raw.hair === "string" && raw.hair.trim() ? raw.hair.trim() : fallbackIdentity.hair,
        eyes: typeof raw.eyes === "string" && raw.eyes.trim() ? raw.eyes.trim() : fallbackIdentity.eyes,
        features: typeof raw.features === "string" && raw.features.trim() ? raw.features.trim() : fallbackIdentity.features,
        build: typeof raw.build === "string" && raw.build.trim() ? raw.build.trim() : fallbackIdentity.build,
        clothing: typeof raw.clothing === "string" && raw.clothing.trim() ? raw.clothing.trim() : fallbackIdentity.clothing,
        tags: rawTags.length > 0 ? rawTags : fallbackIdentity.tags,
      };
      return result;
    }
    return fallbackIdentity;
  } catch (err: any) {
    console.warn("LLM visual identity extraction error, falling back to deterministic tags:", err?.message || err);
    return fallbackIdentity;
  }
}

/**
 * Generates an image prompt directly from a character card.
 * Uses preset configurations (prompts.*.json) for model-specific prompts,
 * Danbooru booru tag guidelines, and negative tags.
 */
export async function generateImagePrompt(
  request: ImagePromptRequest
): Promise<ImagePromptResult> {
  const imagePurpose: ImagePromptPurpose = request.imagePurpose || "avatar";
  const targetModel: ImageTargetModel = request.targetModel || "flux";
  const artStyle: ImageArtStyle = request.artStyle || "anime";
  const shotType: ImageShotType = request.shotType || (imagePurpose === "greeting" ? "action_scene" : "card_portrait");
  const portraitIntent: PortraitIntent = request.portraitIntent || "standard_avatar";
  const aspectRatio = request.aspectRatio || (shotType === "card_portrait" ? "2:3" : "1:1");
  const dimensions = getDimensionsForRatio(aspectRatio);

  // Dynamic Prompt Preset resolution
  const imgGenConfig = getImageGenerationConfig(request.provider);
  const modelConfig =
    imgGenConfig.models[targetModel] ||
    imgGenConfig.models.general ||
    imgGenConfig.models.illustrious;

  const recommendedSettings = modelConfig?.recommendedSettings || getSettingsForModel(targetModel);

  const charName = request.character.name || "Character";
  const physicalForm = extractPhysicalForm(request.character.description || "");
  const activeGreetingText = (request.greetingText || request.character.first_mes || "").trim();
  const firstMes = activeGreetingText;
  const scenario = (request.character.scenario || "").trim();
  const isNsfw = !!request.nsfw;

  // Check if character already has user-confirmed visual_identity extension
  const extVisual = (request.character.extensions?.visual_identity || (request.character as any).data?.extensions?.visual_identity) as Partial<VisualIdentity> | undefined;

  let lockedIdentityTags: string[];
  let lockedIdentityBlock: string;

  if (extVisual && (extVisual.tags?.length || extVisual.hair || extVisual.age || extVisual.gender)) {
    const rawTagList: string[] = Array.isArray(extVisual.tags) && extVisual.tags.length > 0
      ? extVisual.tags
      : [
          extVisual.gender,
          extVisual.age,
          extVisual.hair,
          extVisual.eyes,
          extVisual.features,
          extVisual.build,
          extVisual.clothing,
        ].filter(Boolean).flatMap((s) => (typeof s === "string" ? s.split(",").map((t) => t.trim()) : []));

    lockedIdentityTags = Array.from(new Set(rawTagList.filter(Boolean)));

    lockedIdentityBlock = `
CORE CHARACTER VISUAL IDENTITY (CONFIRMED USER-LOCKED CARD EXTENSION — MUST BE PRESERVED ACROSS ALL IMAGES):
- Gender / Subject: ${extVisual.gender || "solo"}
${extVisual.age ? `- Apparent Age & Life Stage: ${extVisual.age} (CRITICAL: Preserve this age faithfully, NEVER de-age or alter age!)` : "- Age / Life Stage: Adult"}
- Hair (Color & Style): ${extVisual.hair || "as described in physical form"}
- Eyes (Color): ${extVisual.eyes || "as described"}
- Body Build / Shape: ${extVisual.build || "as described"}
- Distinctive Traits: ${extVisual.features || "none specified"}
- Signature Wardrobe / Palette: ${extVisual.clothing || "as described"}
- Canonical Identity Tags: ${lockedIdentityTags.join(", ")}
`;
  } else {
    // Extract deterministic visual tags as the locked character identity anchor
    const visualTags = extractDeterministicTags(request.character.description || "", charName);
    lockedIdentityTags = [
      visualTags.genderTag,
      visualTags.ageTag,
      ...visualTags.hairTags,
      ...visualTags.eyeTags,
      ...visualTags.featureTags,
      ...visualTags.buildTags,
      ...visualTags.clothingTags,
    ].filter(Boolean);

    lockedIdentityBlock = `
CORE CHARACTER VISUAL IDENTITY (MANDATORY CONSISTENCY ANCHOR — MUST BE PRESERVED ACROSS ALL IMAGES):
- Gender / Subject: ${visualTags.genderTag}, solo
${visualTags.ageLabel ? `- Apparent Age & Life Stage: ${visualTags.ageLabel} (CRITICAL: Do NOT alter or de-age!)` : ""}
- Hair (Color & Style): ${visualTags.hairTags.map((t) => t.replace(/_/g, " ")).join(", ") || "as described in physical form"}
- Eyes (Color): ${visualTags.eyeTags.map((t) => t.replace(/_/g, " ")).join(", ") || "as described"}
- Body Build / Shape: ${visualTags.buildTags.map((t) => t.replace(/_/g, " ")).join(", ") || "as described"}
- Distinctive Traits: ${visualTags.featureTags.map((t) => t.replace(/_/g, " ")).join(", ") || "none specified"}
- Signature Wardrobe / Palette: ${visualTags.clothingTags.map((t) => t.replace(/_/g, " ")).join(", ") || "as described"}
- Canonical Identity Tags: ${lockedIdentityTags.join(", ")}
`;
  }

  // Model-specific guidance from preset
  let modelGuidance = modelConfig?.guidance || "";
  if (targetModel === "pony") {
    if (!isNsfw) {
      modelGuidance = modelGuidance.replace("rating_explicit", "rating_safe");
    } else {
      modelGuidance = modelGuidance.replace("rating_safe", "rating_explicit");
    }
  }

  // Purpose/Intent directive from preset
  let intentDirective = "";
  if (imagePurpose === "scenario_avatar") {
    intentDirective =
      imgGenConfig.intentDirectives?.scenario_avatar ||
      `UNFILTERED SCENARIO AVATAR DIRECTIVE:
- The user specifically wants an UNFILTERED SCENARIO AVATAR to serve as the character's card profile picture / avatar.
- Instead of a plain portrait or clean studio shot, illustrate {{char}} actively immersed in their defined SCENARIO.
- Base the environment, physical situation, emotional intensity, props, lighting, and action directly on:
  Scenario: "${scenario.slice(0, 1000)}"
  Opening Situation: "${firstMes.slice(0, 600)}"
- KEEP COMPLETELY UNFILTERED & UNCENSORED: If the scenario depicts captivity, battle, intimate romance, power exchange, dark fantasy, or mature situations, do NOT sanitize or soften the visual prompt.
- Framing: Ensure {{char}} remains the central focal subject suitable for a roleplay character card profile, preserving their authentic facial features, hair, and signature traits while highlighting the unfiltered scenario context.`;
  } else if (imagePurpose === "greeting") {
    intentDirective =
      imgGenConfig.intentDirectives?.greeting ||
      `GREETING SCENE / OPENING MESSAGE ILLUSTRATION DIRECTIVE:
- The user is generating an environmental GREETING SCENE illustrating {{char}} in the opening narrative message of the roleplay.
- Base the environment, physical location, character's active pose, emotional state, props, and situation on:
  First Message: "${firstMes.slice(0, 1000)}"
  Scenario: "${scenario.slice(0, 500)}"
- If the first message explicitly depicts the character in a specific location, illustrate THAT exact environment.
- If the first message explicitly describes their physical state or situation, FAITHFULLY illustrate that opening narrative moment.
- MANDATORY CHARACTER IDENTITY CONSISTENCY: Every image generated for this character (avatar, greeting scene, scenario) MUST depict the EXACT SAME PERSON.
  Carry over the exact same hair color, hair style, eye color, signature facial features, body build, and traits from the CORE CHARACTER VISUAL IDENTITY.
  DO NOT alter their hair or eye colors or invent a different person.
  The character is the persistent identity anchor; the opening greeting provides their current pose, environment, and situational action.`;
  } else if (imagePurpose === "greeting_bg") {
    intentDirective =
      `GREETING CHAT BACKGROUND DIRECTIVE:
- The user specifically wants a GREETING CHAT BACKGROUND (wallpaper / backdrop) for the roleplay chat UI during this active greeting.
- This image acts as the ambient setting background behind the dialogue messages, NOT just a foreground character portrait.
- Emphasize rich atmospheric environmental scenery, dramatic wide/cinematic landscape or interior room architecture matching the scene in the greeting:
  Greeting Context: "${firstMes.slice(0, 1000)}"
  Scenario Context: "${scenario.slice(0, 500)}"
- The background should establish the spatial setting, weather, lighting mood, depth of field, and room or location details.
- If the character appears, they should be integrated organically into the broader environmental setting or in mid-to-wide shot without crowding the center, suitable for chat text overlay.`;
  } else if (portraitIntent && imgGenConfig.intentDirectives?.[portraitIntent]) {
    intentDirective = imgGenConfig.intentDirectives[portraitIntent]!;
  }

  const prompt = `${imgGenConfig.systemPrompt || "You are an expert Diffusion Prompt Engineer."}
Your task is to convert this roleplay character profile into an optimized IMAGE GENERATION PROMPT that captures their visual identity.

PURPOSE: ${
    imagePurpose === "greeting"
      ? "Greeting Scene / Opening Narrative Visualizer"
      : imagePurpose === "greeting_bg"
      ? "Greeting Chat Background / Ambient Scenery Backdrop"
      : imagePurpose === "scenario_avatar"
      ? "Unfiltered Scenario Avatar (Active Scenario Scene as Card Profile Picture)"
      : "Character Profile Avatar"
  }

CHARACTER:
- Name: ${charName}
${lockedIdentityBlock}
- Detailed Physical Features & Wardrobe:
${physicalForm}
${(imagePurpose === "greeting" || imagePurpose === "greeting_bg" || imagePurpose === "scenario_avatar") && scenario ? `- Scenario Context:\n${scenario.slice(0, 800)}` : ""}
${(imagePurpose === "greeting" || imagePurpose === "greeting_bg" || imagePurpose === "scenario_avatar") && firstMes ? `- Opening First Message:\n${firstMes.slice(0, 800)}` : ""}

REQUEST PARAMETERS:
- Generation Purpose: ${imagePurpose}
- Portrait Intent: ${portraitIntent}
- Target Model: ${targetModel}
- Art Style: ${artStyle}
- Framing / Shot: ${shotType}
- Aspect Ratio: ${aspectRatio}
- Mature / NSFW Allowed: ${isNsfw ? "Yes" : "No"}
${request.customSteering ? `- User Specific Scene Steering: "${request.customSteering}"` : ""}

${intentDirective}

${modelGuidance}

${imgGenConfig.tagRules ? `\nTAG CONVENTIONS & QUALITY RULES:\n${imgGenConfig.tagRules}\n` : ""}

INSTRUCTIONS:
1. MANDATORY AGE & CHARACTER CONSISTENCY: Faithfully capture {{char}}'s true age and life stage. If {{char}} is an elderly woman or grandmother, depict an authentic elderly woman with visible wrinkles, senior facial structure, and mature posture—NEVER de-age them into a 20-something. If middle-aged/mature, depict an authentically mature adult. Ensure {{char}}'s physical identity (hair, eyes, face, body build, traits) is completely locked and identical across all image purposes. A greeting scene MUST depict the exact same character as their avatar.
2. For avatars, keep default profile pictures clean and normal unless explicitly steered.
3. For greeting scenes, preserve the character's exact appearance while illustrating the location, lighting, pose, and active situation from the opening greeting.
4. For booru/danbooru models (Illustrious, Pony), ALWAYS include the core character visual tags (${lockedIdentityTags.join(", ")}) in the prompt.
5. Output STRICT JSON:
{
  "prompt": "Optimized prompt for target model",
  "negativePrompt": "Negative prompt if relevant"
}`;

  try {
    const messages = [
      {
        role: "system" as const,
        content:
          imgGenConfig.systemPrompt ||
          "You are an expert diffusion prompt engineer who generates precise, high-quality prompts for ComfyUI, Flux, Pony Diffusion, and SDXL.",
      },
      { role: "user" as const, content: prompt },
    ];

    const raw = await routeLLMJson<any>(request.provider, messages);

    const generatedPrompt =
      typeof raw?.prompt === "string" && raw.prompt.trim()
        ? raw.prompt.trim()
        : typeof raw?.positivePrompt === "string" && raw.positivePrompt.trim()
        ? raw.positivePrompt.trim()
        : fallbackPrompt(request, targetModel, artStyle, shotType, portraitIntent, imagePurpose);

    let negativePrompt =
      typeof raw?.negativePrompt === "string" && raw.negativePrompt.trim()
        ? raw.negativePrompt.trim()
        : modelConfig?.defaultNegative || undefined;

    return {
      characterId: request.characterId,
      characterName: charName,
      imagePurpose,
      targetModel,
      artStyle,
      shotType,
      portraitIntent,
      aspectRatio,
      dimensions,
      recommendedSettings,
      prompt: generatedPrompt,
      positivePrompt: generatedPrompt,
      negativePrompt,
    };
  } catch (err: any) {
    console.warn("AI image prompt generation failed, using structured algorithmic fallback:", err?.message);
    const generatedPrompt = fallbackPrompt(request, targetModel, artStyle, shotType, portraitIntent, imagePurpose);
    let negativePrompt = modelConfig?.defaultNegative || undefined;

    return {
      characterId: request.characterId,
      characterName: charName,
      imagePurpose,
      targetModel,
      artStyle,
      shotType,
      portraitIntent,
      aspectRatio,
      dimensions,
      recommendedSettings,
      prompt: generatedPrompt,
      positivePrompt: generatedPrompt,
      negativePrompt,
    };
  }
}

/**
 * Algorithmic fallback to synthesize authentic prompts offline without AI.
 * Uses deterministic visual tag extraction for Danbooru/Booru models (Illustrious, Pony).
 */
function fallbackPrompt(
  request: ImagePromptRequest,
  targetModel: ImageTargetModel,
  artStyle: ImageArtStyle,
  shotType: ImageShotType,
  portraitIntent: PortraitIntent,
  imagePurpose: ImagePromptPurpose = "avatar"
): string {
  const name = request.character.name || "Character";
  const desc = request.character.description || "";
  const extVisual = (request.character.extensions?.visual_identity || (request.character as any).data?.extensions?.visual_identity) as Partial<VisualIdentity> | undefined;

  const visual = (extVisual && (extVisual.tags?.length || extVisual.hair))
    ? {
        genderTag: extVisual.gender || "1girl",
        ageTag: extVisual.age || "",
        ageLabel: extVisual.age || "",
        ageProse: extVisual.age || "",
        hairTags: extVisual.hair ? extVisual.hair.split(",").map((t) => t.trim()).filter(Boolean) : [],
        eyeTags: extVisual.eyes ? extVisual.eyes.split(",").map((t) => t.trim()).filter(Boolean) : [],
        featureTags: extVisual.features ? extVisual.features.split(",").map((t) => t.trim()).filter(Boolean) : [],
        buildTags: extVisual.build ? extVisual.build.split(",").map((t) => t.trim()).filter(Boolean) : [],
        clothingTags: extVisual.clothing ? extVisual.clothing.split(",").map((t) => t.trim()).filter(Boolean) : [],
        expressionTag: "slight_smile",
      }
    : extractDeterministicTags(desc, name);

  const ratingTag = request.nsfw ? "rating_explicit" : "rating_safe";
  const greetingSnippet = (request.character.first_mes || request.character.scenario || "opening scene")
    .replace(/[*_#`\n\r]/g, " ")
    .trim()
    .slice(0, 100);
  const scenarioSnippet = (request.character.scenario || request.character.first_mes || "intense scenario situation")
    .replace(/[*_#`\n\r]/g, " ")
    .trim()
    .slice(0, 120);

  // CIRCLERSTONE LABS ANIMA / COSMOS-PREDICT2 2B FALLBACK (Qwen3 Hybrid: Booru Tags + Natural Language Composition)
  if (targetModel === "anima") {
    const shotTag =
      shotType === "card_portrait"
        ? "upper_body, portrait"
        : shotType === "full_body"
        ? "full_body"
        : shotType === "intimate_close_up"
        ? "close-up, face_focus"
        : "dynamic_pose";

    const qualityPrefix = isNsfw
      ? "masterpiece, best quality, score_7, explicit"
      : "masterpiece, best quality, score_7, safe";

    const tagParts = [
      qualityPrefix,
      visual.genderTag,
      visual.ageTag,
      "solo",
      shotTag,
      visual.expressionTag,
      ...visual.hairTags,
      ...visual.eyeTags,
      ...visual.featureTags,
      ...visual.buildTags,
      ...visual.clothingTags,
    ].filter(Boolean);

    const sceneDesc = imagePurpose === "greeting" || imagePurpose === "greeting_bg" || imagePurpose === "scenario_avatar"
      ? `${greetingSnippet}, atmospheric background, vivid anime lighting`
      : "anime illustration, expressive face, clean composition";

    return `${tagParts.join(", ")}, ${sceneDesc}`;
  }

  // ILLUSTRIOUS-XL / BOORU MODEL FALLBACK
  if (targetModel === "illustrious") {
    const shotTag =
      shotType === "card_portrait"
        ? "upper_body, portrait"
        : shotType === "full_body"
        ? "full_body, standing"
        : shotType === "intimate_close_up"
        ? "close-up, face_focus"
        : "dynamic_pose";

    const parts = [
      "masterpiece, newest, very aesthetic, absurdres, highres",
      visual.genderTag,
      visual.ageTag,
      "solo",
      "looking_at_viewer",
      shotTag,
      visual.expressionTag,
      ...visual.hairTags,
      ...visual.eyeTags,
      ...visual.featureTags,
      ...visual.buildTags,
      ...visual.clothingTags,
      artStyle === "anime" ? "" : `${artStyle} style`,
      imagePurpose === "scenario_avatar"
        ? "vivid_lighting, detailed_scenario_background, intense_atmosphere, dramatic_scene"
        : imagePurpose === "greeting"
        ? "vivid_lighting, detailed_background"
        : "vibrant_lighting, clean_background",
    ].filter(Boolean);

    return parts.join(", ");
  }

  // PONY DIFFUSION V6 XL FALLBACK
  if (targetModel === "pony") {
    const shotTag =
      shotType === "card_portrait"
        ? "upper_body, portrait"
        : shotType === "full_body"
        ? "full_body, standing"
        : shotType === "intimate_close_up"
        ? "close-up, face_focus"
        : "dynamic_pose";

    const parts = [
      `score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, source_anime, ${ratingTag}`,
      visual.genderTag,
      visual.ageTag,
      "solo",
      "looking_at_viewer",
      shotTag,
      visual.expressionTag,
      ...visual.hairTags,
      ...visual.eyeTags,
      ...visual.featureTags,
      ...visual.buildTags,
      ...visual.clothingTags,
      "detailed_face, detailed_eyes",
      imagePurpose === "scenario_avatar"
        ? "narrative_atmosphere, dynamic_lighting, detailed_scenario_background, raw_intense_scene"
        : imagePurpose === "greeting"
        ? "narrative_atmosphere, dynamic_lighting, detailed_background"
        : "atmospheric_lighting, clean_background",
    ].filter(Boolean);

    return parts.join(", ");
  }

  // FLUX.1 / SD 3.5 FALLBACK
  if (targetModel === "flux") {
    const hairDesc = visual.hairTags.map((t) => t.replace(/_/g, " ")).join(", ") || "detailed hair";
    const eyeDesc = visual.eyeTags.map((t) => t.replace(/_/g, " ")).join(", ") || "expressive eyes";
    const clothesDesc = visual.clothingTags.map((t) => t.replace(/_/g, " ")).join(", ") || "signature attire";
    const subjectName = visual.ageProse ? `${name}, ${visual.ageProse}` : name;
    const shotProse =
      shotType === "card_portrait"
        ? "An upper-body portrait"
        : shotType === "full_body"
        ? "A full-body shot"
        : "A cinematic dynamic scene";

    if (imagePurpose === "scenario_avatar") {
      return `${shotProse} of ${subjectName}, featuring ${hairDesc} and ${eyeDesc}, wearing ${clothesDesc}. ${artStyle} aesthetic. Actively depicted in the unfiltered roleplay scenario: ${
        scenarioSnippet || "atmospheric scenario encounter"
      }. Intense environmental lighting, rich cinematic depth of field, sharp character focus, high visual fidelity.`;
    }

    if (imagePurpose === "greeting") {
      return `${shotProse} of ${subjectName}, featuring ${hairDesc} and ${eyeDesc}, wearing ${clothesDesc}. ${artStyle} aesthetic. Ambient setting: ${
        greetingSnippet || "atmospheric narrative encounter"
      }. Subtle volumetric lighting, sharp focus on facial features, high visual fidelity.`;
    }

    if (imagePurpose === "greeting_bg") {
      return `Wide cinematic scenic background for ${artStyle} roleplay. Depicting the atmospheric setting: ${
        greetingSnippet || scenarioSnippet || "evocative setting room and architecture"
      }. Wide-angle establishing shot, scenic background wallpaper, volumetric light beams, rich ambient environmental detail, empty center suitable for text.`;
    }

    return `${shotProse} of ${subjectName}, featuring ${hairDesc} and ${eyeDesc}, wearing ${clothesDesc}. ${artStyle} aesthetic. Natural dignified expression looking at the viewer, soft cinematic depth of field, high visual fidelity.`;
  }

  // SDXL / GENERAL FALLBACK
  const shotDesc =
    shotType === "card_portrait"
      ? "upper body character portrait, looking at viewer"
      : shotType === "full_body"
      ? "full body shot, standing, looking at viewer"
      : "cinematic composition, looking at viewer";

  const hairDesc = visual.hairTags.map((t) => t.replace(/_/g, " ")).join(", ") || "detailed hair";
  const eyeDesc = visual.eyeTags.map((t) => t.replace(/_/g, " ")).join(", ") || "expressive eyes";
  const clothesDesc = visual.clothingTags.map((t) => t.replace(/_/g, " ")).join(", ") || "signature attire";
  const featureDesc = visual.featureTags.map((t) => t.replace(/_/g, " ")).join(", ");
  const subjectName = visual.ageProse ? `${name}, ${visual.ageProse},` : `${name},`;

  if (imagePurpose === "scenario_avatar") {
    return `masterpiece, 8k, cinematic illustration of ${subjectName} ${shotDesc}, featuring ${hairDesc}, ${eyeDesc}${featureDesc ? `, ${featureDesc}` : ""}, wearing ${clothesDesc}, ${artStyle} art style, unfiltered scenario setting: ${
      scenarioSnippet || "intense scenario situation"
    }, evocative environment, dramatic cinematic lighting`;
  }

  if (imagePurpose === "greeting") {
    return `masterpiece, 8k, cinematic illustration of ${subjectName} ${shotDesc}, featuring ${hairDesc}, ${eyeDesc}${featureDesc ? `, ${featureDesc}` : ""}, wearing ${clothesDesc}, ${artStyle} art style, narrative setting: ${
      greetingSnippet || "opening encounter"
    }, dramatic lighting, evocative atmosphere`;
  }

  return `masterpiece, 8k, ${shotDesc} of ${subjectName} featuring ${hairDesc}, ${eyeDesc}${featureDesc ? `, ${featureDesc}` : ""}, wearing ${clothesDesc}, ${artStyle} art style, dramatic cinematic lighting, clean composition`;
}
