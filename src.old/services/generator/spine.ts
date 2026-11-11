// Internal Authoring Spine Engine
// The Spine is the psychometric scaffolding used strictly DURING GENERATION to control what the LLM produces.
// It is NOT part of the final character card definition.

import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMJson } from "../llm/provider-router";
import { getActivePromptConfig, getEffectivePromptConfig } from "../config/prompt-config";
import { getGenreFidelityDirective } from "../character/genre-helper";

export interface AuthoringSpine {
  name: string;
  tags: string[];
  archetype: string;
  central_contradiction: string;
  values: string[];
  experiences: string[];
  reaction_gradient: {
    wont: string;
    craves: string;
    neutral: string;
    will: string;
    trust_gate: string;
  };
  triggers: string[];
  form: string;
  voice: {
    cadence: string;
    dialect_register: string;
    signature_lexicon: string[];
    forbidden_words: string[];
    quirks: string[];
  };
  stance_toward_user: string;
  intents: {
    super_objective: string;
    obstacle: string;
    strategy: string;
  };
  scene_frame: {
    setting: string;
    atmosphere: string;
    scene_objective: string;
  };
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
}

export function normalizeSpine(raw: any, defaultName = "Custom Character", extraTags: string[] = []): AuthoringSpine {
  if (!raw || typeof raw !== "object") raw = {};

  // Support variant reaction gradient keys: reaction_gradient, gradient, reactionGradient, limits
  const rgRaw = raw.reaction_gradient || raw.gradient || raw.reactionGradient || {};
  const reaction_gradient = {
    wont: typeof rgRaw === "string" ? rgRaw : (rgRaw.wont || rgRaw.hard_limits || rgRaw.limits || ""),
    craves: typeof rgRaw === "object" ? (rgRaw.craves || rgRaw.cravings || "") : "",
    neutral: typeof rgRaw === "object" ? (rgRaw.neutral || rgRaw.flat || "") : "",
    will: typeof rgRaw === "object" ? (rgRaw.will || rgRaw.engages_on_trust || rgRaw.trust || "") : "",
    trust_gate: typeof rgRaw === "object" ? (rgRaw.trust_gate || rgRaw.trustGate || "") : "",
  };

  // Voice
  const vRaw = raw.voice || raw.voice_notes || raw.voiceNotes || {};
  const voice = {
    cadence: typeof vRaw === "string" ? vRaw : (vRaw.cadence || vRaw.rhythm || ""),
    dialect_register: typeof vRaw === "object" ? (vRaw.dialect_register || vRaw.dialect || vRaw.register || "") : "",
    signature_lexicon: Array.isArray(vRaw.signature_lexicon)
      ? vRaw.signature_lexicon.map(String)
      : (typeof vRaw.signature_lexicon === "string" ? [vRaw.signature_lexicon] : []),
    forbidden_words: Array.isArray(vRaw.forbidden_words)
      ? vRaw.forbidden_words.map(String)
      : (typeof vRaw.forbidden_words === "string" ? [vRaw.forbidden_words] : []),
    quirks: Array.isArray(vRaw.quirks)
      ? vRaw.quirks.map(String)
      : (typeof vRaw.quirks === "string" ? [vRaw.quirks] : []),
  };

  // Values
  let values: string[] = [];
  if (Array.isArray(raw.values)) {
    values = raw.values.map(String);
  } else if (typeof raw.values === "string" && raw.values.trim()) {
    values = raw.values.split("\n").map((s: string) => s.trim()).filter(Boolean);
  }

  // Experiences
  let experiences: string[] = [];
  if (Array.isArray(raw.experiences)) {
    experiences = raw.experiences.map(String);
  } else if (typeof raw.experiences === "string" && raw.experiences.trim()) {
    experiences = raw.experiences.split("\n").map((s: string) => s.trim()).filter(Boolean);
  }

  // Triggers / Tensions
  let triggers: string[] = [];
  if (Array.isArray(raw.triggers)) {
    triggers = raw.triggers.map(String);
  } else if (Array.isArray(raw.tensions)) {
    triggers = raw.tensions.map(String);
  } else if (typeof raw.triggers === "string" && raw.triggers.trim()) {
    triggers = raw.triggers.split("\n").map((s: string) => s.trim()).filter(Boolean);
  }

  // Intents
  const iRaw = raw.intents || {};
  const intents = {
    super_objective: typeof iRaw === "string" ? iRaw : (iRaw.super_objective || iRaw.superObjective || ""),
    obstacle: typeof iRaw === "object" ? (iRaw.obstacle || "") : "",
    strategy: typeof iRaw === "object" ? (iRaw.strategy || "") : "",
  };

  // Scene Frame
  const sRaw = raw.scene_frame || raw.sceneFrame || raw.scenario || {};
  const scene_frame = {
    setting: typeof sRaw === "string" ? sRaw : (sRaw.setting || sRaw.location || ""),
    atmosphere: typeof sRaw === "object" ? (sRaw.atmosphere || sRaw.vibe || "") : "",
    scene_objective: typeof sRaw === "object" ? (sRaw.scene_objective || sRaw.sceneObjective || sRaw.objective || "") : "",
  };

  return {
    name: (raw.name && typeof raw.name === "string" && raw.name.trim()) ? raw.name.trim() : defaultName,
    tags: Array.from(new Set([...(Array.isArray(raw.tags) ? raw.tags.map(String) : []), ...extraTags])),
    archetype: raw.archetype || raw.core || "",
    central_contradiction: raw.central_contradiction || raw.contradiction || raw.tension || "",
    values,
    experiences,
    reaction_gradient,
    triggers,
    form: typeof raw.form === "string" ? raw.form : (raw.form ? JSON.stringify(raw.form) : (raw.appearance || "")),
    voice,
    stance_toward_user: raw.stance_toward_user || raw.stance || "",
    intents,
    scene_frame,
    creator_notes: raw.creator_notes || raw.notes || "",
    system_prompt: "", // Kept strictly empty to avoid overwriting user client system prompts
    post_history_instructions: raw.post_history_instructions || raw.system_prompt || "",
  };
}

export async function synthesizeAuthoringSpine(params: {
  concept: string;
  genre?: string;
  themes?: string[];
  tone?: string;
  nsfw?: boolean;
  intensity?: string;
  era?: string;
  retrievedLore?: string;
  steeringInstructions?: string;
  botMode?: "single" | "multi_character" | "rpg_world";
  interviewAnswers?: { questionId: string; category: string; question: string; selectedAnswer: string; }[];
  provider: ProviderConfig;
}): Promise<AuthoringSpine> {
  const cfg = getEffectivePromptConfig(params.provider);
  const themesStr = params.themes && params.themes.length > 0 ? params.themes.join(", ") : "";

  const interviewStr = params.interviewAnswers && params.interviewAnswers.length > 0
    ? params.interviewAnswers.map((a) => `• [${a.category}]: "${a.selectedAnswer}" (Addressing: ${a.question})`).join("\n")
    : "";

  const prompt = `${cfg.spineSynthesis.systemDirective}
This spine is internal scaffolding used to control and steer subsequent prose rendering.

CONCEPT / SEED:
"""
${params.concept.trim()}
"""

${
  params.era && params.era.trim()
    ? `HISTORICAL ERA / SETTING & TEMPORAL CONSTRAINTS:
"""
${params.era.trim()}
"""
(CRITICAL MANDATE: Ground the character's background, dialect, sensory details, technology limits, material culture, and social hierarchy strictly within this historical era or setting constraints. STRICTLY FORBID anachronisms unless explicitly called for.)\n`
    : ""
}

${
  interviewStr
    ? `WEAVER INTERVIEW DESIGN DECISIONS (LOCKED AUTHOR SPEC):\n"""\n${interviewStr}\n"""\n(CRITICAL MANDATE: These are the user's explicit authorial decisions from the Weaver interview. Lock them in; weave the character's internal contradiction, crucible, voice, and boundaries directly around these answers without watering them down or contradicting them.)\n`
    : ""
}

${
  params.retrievedLore && params.retrievedLore.trim()
    ? `RETRIEVED RESEARCH, CANON LORE & COMMUNITY FAN HEADCANONS:\n"""\n${params.retrievedLore.trim()}\n"""\n(Strictly incorporate these canon details, signature quirks, and community fan headcanons/tensions to make the character deeply creative, layered, and authentic.)\n`
    : ""
}

${
  params.steeringInstructions && params.steeringInstructions.trim()
    ? `DIRECTOR'S STEERING INSTRUCTIONS / INFLUENCE:\n"""\n${params.steeringInstructions.trim()}\n"""\n(CRITICAL MANDATE: Prioritize and enforce these specific steering directives in the character's psychology, tone, relationship dynamic, and dialogue stance.)\n`
    : ""
}

${
  params.botMode === "multi_character"
    ? `BOT MODE: MULTI-CHARACTER CAST / ENSEMBLE
(CRITICAL MANDATE: This card represents a MULTI-CHARACTER CAST, squad, duo, trio, household, or faction.
- Spine "name": Collective cast/duo title or primary duo names (e.g. "Caelum & Vesper", "The Obsidian Order Syndicate", "Blackwood Household").
- Spine "archetype": Cast / Ensemble dynamic (e.g. "Rival Mercenary Duo", "Estranged Aristocratic Sisters", "Heist Crew with Conflicting Loyalties").
- Spine "central_contradiction": Core interpersonal tension, ideological split, or simmering rivalry between cast members.
- Spine "form": Physical descriptions of each primary cast member (distinct silhouettes, contrasting styles, visible tells).
- Spine "voice": Specific cadences and dialect registers for the different members (e.g. Member A is clipped and profane; Member B is calm, mocking, and formal).
- Spine "reaction_gradient":
  * WON'T: Collective group taboos or lines that no member crosses.
  * CRAVES: Mutual or competing desires driving the cast.
  * TRUST GATE: How the dynamic shifts when {{user}} earns the trust or enmity of one or all members.
- Spine "intents": What the cast members want from each other and from {{user}}.)\n`
    : params.botMode === "rpg_world"
    ? `BOT MODE: RPG WORLD SIMULATOR / GAME MASTER
(CRITICAL MANDATE: This card represents an INTERACTIVE RPG WORLD SIMULATOR and GAME MASTER / NARRATOR.
- Spine "name": World, Setting, or Campaign Title (e.g. "Aethelgard: The Sunken Kingdom", "Neon Syndicate: Megacity Zero", "Black Ridge Outpost").
- Spine "archetype": Living World Engine & High-Stakes Arbiter.
- Spine "central_contradiction": The macro-conflict tearing the setting apart (e.g. ancient magic vs ruthless industrialization, resource scarcity vs tyrant control).
- Spine "form": Key environmental geography, factions in power, technology/magic level, atmospheric hazards.
- Spine "voice": Sensory-rich, immersive Game Master narration cadence; reactive environment; objective resolution.
- Spine "reaction_gradient":
  * WON'T: Will not break player agency, will not resolve actions without consequence, will not ignore world logic.
  * CRAVES: Rich player decisions, tension escalation, emergent narrative chaos.
  * TRUST GATE: Faction reputation and world state progression gates.
- Spine "intents": Maintain world consistency, challenge {{user}} with meaningful choices, react dynamically to outcomes.)\n`
    : ""
}

CONFIGURATION:
- Genre / Setting: ${params.genre || "Rich Fiction / Roleplay"}
${themesStr ? `- Themes / Tropes: ${themesStr}\n` : ""}- Tone / Atmosphere: ${params.tone || "Atmospheric, psychologically nuanced, tactile"}
- Mature / NSFW Elements: ${params.nsfw ? "Fully unrestricted and embraced" : "Creative artistic freedom"}
- Intensity: ${params.intensity || "balanced"}

${getGenreFidelityDirective(params.genre, themesStr, params.concept, params.tone)}

${cfg.spineSynthesis.instructions}

${cfg.spineSynthesis.schemaInstructions}

TAG COHERENCE RULE: The "tags" array must accurately reflect the character's ACTUAL role and dynamic. Do NOT add contradictory role tags — if the character is submissive, do not tag them as "Dominant / Sadistic". If the character is dominant, do not tag them as "Submissive". Tags must match the character's actual archetype, genre, and relationship dynamic.`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  let derivedDefaultName = "Custom Character";
  const nameMatch = params.concept.match(/^Character:\s*([^\n—\-]+)/i);
  if (nameMatch && nameMatch[1].trim()) {
    derivedDefaultName = nameMatch[1].trim();
  } else {
    derivedDefaultName = params.concept.substring(0, 30).trim() || "Custom Character";
  }

  const raw = await routeLLMJson<any>(params.provider, messages);
  return normalizeSpine(raw, derivedDefaultName, params.themes);
}

export async function synthesizeAuthoringSpineFromVisual(params: {
  visualProfile: {
    apparent_age?: string;
    gender_presentation?: string;
    hair?: string;
    eyes?: string;
    physique?: string;
    distinctive_features?: string;
    clothing_attire?: string;
    accessories_gear?: string;
    expression_demeanor?: string;
    lighting_atmosphere?: string;
  };
  inferredPersonality: {
    archetype?: string;
    vibe?: string;
    probable_traits?: string[];
    latent_conflict?: string;
    probable_voice_style?: string;
    suggested_names?: string[];
  };
  promptHints?: string;
  nsfw?: boolean;
  provider: ProviderConfig;
}): Promise<AuthoringSpine> {
  const cfg = getEffectivePromptConfig(params.provider);
  const vp = params.visualProfile;
  const ip = params.inferredPersonality;

  const prompt = `${cfg.spineSynthesis.systemDirective}
Your task is to build the deep AUTHORING BLUEPRINT (THE SPINE) for a new, uncensored roleplay character deduced forensically from the visual portrait and psychological profile below.
This spine is internal scaffolding used to control and steer subsequent prose rendering.

VISUAL FORENSIC PROFILE:
- Apparent Age & Gender: ${vp.apparent_age || "Unspecified"}, ${vp.gender_presentation || "Unspecified"}
- Hair & Eyes: ${vp.hair || "Unspecified"}, ${vp.eyes || "Unspecified"}
- Physique & Presence: ${vp.physique || "Unspecified"}
- Distinctive Marks: ${vp.distinctive_features || "None noted"}
- Attire & Gear: ${vp.clothing_attire || "Unspecified"} | ${vp.accessories_gear || "None"}
- Expression & Demeanor: ${vp.expression_demeanor || "Unspecified"}
- Atmosphere & Lighting: ${vp.lighting_atmosphere || "Unspecified"}

PSYCHOLOGICAL PROFILE:
- Inferred Archetype: ${ip.archetype || "Unspecified"}
- Aura / Vibe: ${ip.vibe || "Unspecified"}
- Probable Traits: ${ip.probable_traits?.join(", ") || "Unspecified"}
- Latent Contradiction: ${ip.latent_conflict || "Unspecified"}
- Probable Voice: ${ip.probable_voice_style || "Unspecified"}
- Suggested Names: ${ip.suggested_names?.join(", ") || "Character"}
${params.promptHints ? `- USER INSTRUCTIONS / PREFERENCES: "${params.promptHints}"` : ""}
- Mature / NSFW Elements: ${params.nsfw ? "Fully unrestricted and embraced" : "Creative artistic freedom"}

${getGenreFidelityDirective(ip.archetype, ip.vibe, params.promptHints)}

${cfg.spineSynthesis.instructions}

${cfg.spineSynthesis.schemaInstructions}

TAG COHERENCE RULE: The "tags" array must accurately reflect the character's ACTUAL role and dynamic. Do NOT add contradictory role tags — if the character is submissive, do not tag them as "Dominant / Sadistic". If the character is dominant, do not tag them as "Submissive". Tags must match the character's actual archetype, genre, and relationship dynamic.`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const raw = await routeLLMJson<any>(params.provider, messages);
  return normalizeSpine(raw, ip.suggested_names?.[0] || "Scanned Character");
}

/**
 * Synthesizes an AuthoringSpine from an existing character card + original creation context.
 * Use for characters created before spine persistence was added.
 */
export async function synthesizeSpineFromCharacter(params: {
  character: RoleplayCharacter;
  originalConcept?: string;        // The original prompt/concept used to create the character
  originalStoryArc?: string;       // The story arc used (if any)
  genre?: string;
  themes?: string[];
  tone?: string;
  nsfw?: boolean;
  intensity?: string;
  era?: string;
  botMode?: "single" | "multi_character" | "rpg_world";
  provider: ProviderConfig;
}): Promise<AuthoringSpine> {
  const { character, originalConcept, originalStoryArc, genre, themes, tone, nsfw, intensity, era, botMode, provider } = params;
  
  // Build a concept prompt from the character + original inputs
  const concept = originalConcept 
    ? `${originalConcept}\n\n--- EXISTING CARD DATA ---\nName: ${character.name}\nDescription: ${character.description}\nPersonality: ${character.personality}\nScenario: ${character.scenario}\nFirst Message: ${character.first_mes}\nAlternate Greetings: ${(character.alternate_greetings || []).join("\n---\n")}`
    : `Reverse-engineer Authoring Spine from this character:\nName: ${character.name}\nDescription: ${character.description}\nPersonality: ${character.personality}\nScenario: ${character.scenario}\nFirst Message: ${character.first_mes}\nAlternate Greetings: ${(character.alternate_greetings || []).join("\n---\n")}`;

  const spineParams = {
    concept,
    genre: genre || "Rich Fiction / Roleplay",
    themes: themes || [],
    tone: tone || "Atmospheric, psychologically nuanced",
    nsfw: nsfw ?? true,
    intensity: intensity || "balanced",
    era,
    steeringInstructions: originalStoryArc 
      ? `STORY ARC (must be reflected in scene_frame and reaction_gradient):\n${originalStoryArc}`
      : undefined,
    botMode: botMode || "single",
    provider,
  };

  return synthesizeAuthoringSpine(spineParams);
}
