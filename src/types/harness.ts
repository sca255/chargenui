import type { RoleplayCharacter, CharacterBook } from "./character";
import type { ProviderConfig } from "./provider";

// Request to generate character from scratch / concept
export interface GenerateCharacterRequest {
  concept: string; // The user's creative prompt / concept / trope
  genre?: string; // e.g. Fantasy, Cyberpunk, Modern Dark, Sci-Fi, Slice of Life, Romance, Horror
  themes?: string[]; // Multi-theme & trope tags (e.g. BDSM, Power Exchange, Slow Burn, Tsundere)
  nsfw?: boolean; // Enable explicit mature/NSFW details
  intensity?: "subtle" | "balanced" | "extreme" | "unhinged";
  tone?: string; // e.g. "gritty psychological", "flirty teasing", "cold yandere", "morally gray anti-hero"
  format?: "prose" | "boostyle" | "wxx" | "markdown";
  retrievedLore?: string; // Injected web search / canon fandom research
  enableWebSearch?: boolean; // Automatically query web/fandom before generating
  searchQuery?: string; // Custom search query
  includeLorebook?: boolean; // Explicitly opt-in to generate embedded SillyTavern world info / lorebook
  era?: string; // Historical era or temporal setting constraints (e.g., Plantagenet England, Sengoku Japan, Victorian)
  steeringInstructions?: string; // Optional director's notes or steering influence to guide the reroll/forge
  botMode?: "single" | "multi_character" | "rpg_world"; // Single character, multi-character cast, or RPG world/GM bot
  storyArc?: string; // Narrative trajectory / arc guidance to steer greetings and scenario
  minAltGreetings?: number; // Minimum number of alternate greetings to generate (defaults to 3)
  provider: ProviderConfig;
}

// Weaver Guided Interview Workshop Types
export interface WeaverInterviewQuestion {
  id: string; // e.g. "contradiction", "crucible", "dynamic", "boundaries"
  category: string; // e.g. "Central Contradiction", "Backstory Crucible", "Stance & Dynamic", "Boundaries & Cravings"
  question: string; // Probing question formulated by Weaver
  options: string[]; // 3 distinct creative options tailored to the concept
  recommendedOptionIndex: number; // Weaver's top pick
}

export interface WeaverInterviewQuestionsRequest {
  concept: string;
  genre?: string;
  themes?: string[];
  tone?: string;
  nsfw?: boolean;
  era?: string;
  influence?: string; // Optional steering direction to influence all questions
  botMode?: "single" | "multi_character" | "rpg_world"; // Single character, multi-character cast, or RPG world/GM bot
  existingQuestions?: WeaverInterviewQuestion[]; // Questions already in the interview (for ask-more)
  provider: ProviderConfig;
}

export interface WeaverInterviewQuestionsResponse {
  questions: WeaverInterviewQuestion[];
  preliminaryVision: string;
}

export interface WeaverInterviewAnswer {
  questionId: string;
  category: string;
  question: string;
  selectedAnswer: string;
}

export interface WeaverForgeRequest extends GenerateCharacterRequest {
  interviewAnswers?: WeaverInterviewAnswer[];
  includeLorebook?: boolean;
}

// Lorebook Companion Creator Types
export type CompanionRole =
  | "guide"
  | "scholar"
  | "bodyguard"
  | "defector"
  | "scoundrel"
  | "bound_familiar"
  | "rival"
  | "custom";

export type UserRelation =
  | "stranger"
  | "amnesiac"
  | "heir"
  | "contractor"
  | "fugitive"
  | "custom";

export interface GenerateCompanionFromLorebookRequest {
  lorebook: CharacterBook | string; // CharacterBook object or JSON string / raw text
  lorebookName?: string;
  companionRole?: CompanionRole;
  customRole?: string;
  userRelation?: UserRelation;
  customRelation?: string;
  companionGender?: "female" | "male" | "nonbinary" | "any";
  companionName?: string;
  tone?: string;
  nsfw?: boolean;
  era?: string;
  format?: "prose" | "boostyle" | "wxx" | "markdown";
  steeringInstructions?: string;
  provider: ProviderConfig;
}

export interface LorebookSummary {
  name: string;
  description: string;
  entryCount: number;
  totalTokensApprox: number;
  keyTerms: string[];
  factions: string[];
  locations: string[];
  summaryText: string;
}

export interface GenerateCompanionResponse {
  character: RoleplayCharacter;
  summary: string;
  lorebookSummary: LorebookSummary;
}

// Request to scan an image with a vision model
export interface ScanImageRequest {
  imageBase64: string; // Base64 data URL or pure base64
  mimeType?: string; // image/png, image/jpeg, image/webp
  promptHints?: string; // Optional user hints (e.g., "she is a cold vampire countess", "cyberpunk bounty hunter")
  nsfw?: boolean;
  provider: ProviderConfig;
}

// Result of vision deconstruction
export interface VisionScanResult {
  visual_profile: {
    gender_presentation?: string;
    apparent_age?: string;
    hair?: string;
    eyes?: string;
    physique?: string;
    distinctive_features?: string;
    clothing_attire?: string;
    accessories_gear?: string;
    expression_demeanor?: string;
    lighting_atmosphere?: string;
    art_style?: string;
  };
  inferred_personality: {
    archetype?: string;
    vibe?: string;
    probable_traits?: string[];
    suggested_names?: string[];
    latent_conflict?: string;
  };
  character: RoleplayCharacter;
  pngCardBase64?: string; // The original image re-encoded with the character card embedded!
}

// Diagnostics / Weakness audit of an existing character
export interface PsychometricRadarScores {
  idiolect: number; // 0 to 100 (cadence variety, contractions, ban of clichés)
  boundaries: number; // 0 to 100 (clear reaction gradient, won't, craves, neutral, trust gate)
  sensory: number; // 0 to 100 (physical textures, sound, scent, lighting in staging)
  playability: number; // 0 to 100 (actionable hooks, zero user puppeteering, dynamic staging)
  antiPurpleProse: number; // 0 to 100 (resistance to AI melodrama and Spock jargon)
  tokenDensity: number; // 0 to 100 (substantive information without filler token bloat)
}

export interface CharacterDiagnostic {
  score: number; // 0 to 100
  grade?: "S" | "A" | "B" | "C" | "D";
  radarScores?: PsychometricRadarScores;
  tokenCount: number;
  weaknesses: Array<{
    area: "description" | "personality" | "first_mes" | "dialogue" | "tension" | "gradient" | "purple_prose";
    issue: string;
    recommendation: string;
  }>;
  strengths: string[];
  summary: string;
}

// Enhancement options for fine-grained AI steering
export interface EnhanceOptions {
  targetFormat?: "prose" | "boostyle" | "wxx" | "markdown";
  toneShift?: string; // e.g. "darker", "more sensual", "more unhinged", "stoic", "witty"
  altGreetingThemes?: string[]; // e.g. ["Hostile Confrontation", "Late Night Intimacy", "Crisis"]
  targetTokenBudget?: number;
  lorebookDepth?: "compact" | "detailed";
  lorebookTopics?: string; // Priority entities/topics to cover in lorebook
  nsfw?: boolean;
  steeringInstructions?: string; // Global or specific Director's steering instructions
  focusAreas?: string[]; // Specific focus areas for persona deepening
  voiceStyle?: string; // Specific speech register / cadence
  scenarioPrompt?: string; // Specific scene setup steering for first message / greetings

  // Optional Web Lore & Canon Search for Full Overhaul & Specific Polishing
  enableWebSearch?: boolean;
  searchQuery?: string;
  retrievedLore?: string;
  includeHeadcanons?: boolean;
  searchProviderType?: "duckduckgo" | "tavily" | "brave" | "searxng";
  searchApiKey?: string;
  searxngUrl?: string;

  // Style Transfer options
  styleTargetFormat?: "prose" | "boostyle" | "wxx" | "ali_chat";
  literaryRegister?: "victorian_gothic" | "gritty_noir" | "cyber_street" | "light_novel" | "pulp_fantasy" | "erotic_romance" | "custom";
  customRegisterDescription?: string;
}

// LLM as Judge Types
export interface JudgeEvaluationDimension {
  name: string;
  score: number; // 1 to 10
  critique: string;
}

export interface JudgeEvaluationReport {
  overallScore: number; // 1 to 100
  rpReadinessGrade: "S" | "A" | "B" | "C" | "D";
  dimensions: {
    psychologicalConsistency: JudgeEvaluationDimension;
    dialogueNaturalness: JudgeEvaluationDimension;
    userAgencyCompliance: JudgeEvaluationDimension;
    scenarioFriction: JudgeEvaluationDimension;
    sensoryImmediacy: JudgeEvaluationDimension;
  };
  verdict: string;
  actionableTweaks: string[];
}

// Batch Generation Types
export interface BatchGenerationRequest extends GenerateCharacterRequest {
  count: number; // 2 to 5 variants
  variationAxis?: "archetype" | "tone" | "backstory_crucible" | "relationship_stance" | "intensity";
}

export interface BatchGenerationResult {
  variants: Array<{
    variantIndex: number;
    variationTitle: string;
    divergencePitch: string;
    character: RoleplayCharacter;
  }>;
}

// Enhancement request
export interface EnhanceCharacterRequest {
  character: RoleplayCharacter;
  mode:
    | "audit_only"
    | "deepen_persona"
    | "polish_voice"
    | "punch_first_mes"
    | "alternate_greetings"
    | "format_optimize"
    | "generate_lorebook"
    | "tone_shift"
    | "style_transfer"
    | "judge_eval"
    | "full_overhaul"
    | "regenerate_with_spine"
    | "continue_arc";
  options?: EnhanceOptions;
  provider: ProviderConfig;
}

// Response from enhancement
export interface EnhanceCharacterResponse {
  character: RoleplayCharacter;
  diagnosticBefore?: CharacterDiagnostic;
  diagnosticAfter?: CharacterDiagnostic;
  judgeReport?: JudgeEvaluationReport;
  changesSummary: string[];
  addedAlternateGreetings?: string[];
  generatedLorebook?: CharacterBook;
}

// Re-export Image Prompt Generator and Queue Types
export * from "./image-prompt";

