import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { normalizeRpMacros } from "../character/macro-engine";
import { getGenreFidelityDirective } from "../character/genre-helper";

export async function deepenCharacterPersona(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  nsfw = false,
  options?: EnhanceOptions
): Promise<Partial<RoleplayCharacter>> {
  const genreDirective = getGenreFidelityDirective(
    (char.tags || []).join(" "),
    char.description,
    char.personality,
    char.scenario,
    options?.steeringInstructions
  );

  let prompt = `You are an elite, uncensored character enhancer.
Take the existing roleplay character below and deeply flesh out their persona, psychological friction, sensory embodiment, and reaction gradient.

EXISTING CHARACTER DATA:
Name: ${char.name}
Description:
${char.description || "(Empty or minimal)"}

Personality:
${char.personality || "(Empty or minimal)"}

Scenario:
${char.scenario || "(Empty or minimal)"}

ENHANCEMENT DIRECTIVES:
1. THE CENTRAL CONTRADICTION: Inject or sharpen a genuine internal friction — two opposing motives or values warring inside them. Ground this in real psychological mechanisms, not generic melodrama.
2. SENSORY & EMBODIED DETAIL: Enhance physical presence, posture, tells, scars, scent, sensory habits, and how their body reacts under pressure.
3. REACTION GRADIENT (GENRE-ALIGNED): Calibrate what leaves them cold/flat, their operational/ethical hard limits, their authentic cravings, and what requires earned trust. NEUTRAL must be mundane matters (paperwork, weather, chores) — NEVER treat romantic affection, flowers, or compliments as "boring or intellectually insulting".
4. GENRE FIDELITY & AUTHENTIC EMOTIONAL DEPTH:
${genreDirective}
5. UNCENSORED DEPTH: ${nsfw ? "Do not hold back on raw, mature, dark, taboo, or intense psychology when relevant, but STRICTLY keep character dynamics faithful to their genre and role." : "Embrace full artistic freedom without preachiness."}
6. ANTI-TROPE: Eliminate cliché phrases and replace with grounded, distinct details.
7. MANDATORY MACROS: ALWAYS use {{char}} instead of the direct character name in prose, behavioral rules, and triggers, and {{user}} for the player.`;

  if (options?.retrievedLore?.trim()) {
    prompt += `\n\nCANON FANDOM RESEARCH & RETRIEVED LORE:\n${options.retrievedLore.trim()}\n(Synthesize these canon lore details, faction affiliations, powers, relationships, and fan headcanons deeply into the persona, description, and behavioral habits.)`;
  }

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nDIRECTOR'S STEERING INSTRUCTIONS:\n${options.steeringInstructions.trim()}\n(Strictly prioritize these custom instructions, psychological notes, and behavioral directions.)`;
  }

  if (options?.focusAreas && options.focusAreas.length > 0) {
    prompt += `\n\nTARGET FOCUS AREAS TO ACCENTUATE:\n${options.focusAreas.map(f => `• ${f}`).join("\n")}`;
  }

  prompt += `\n\nOutput STRICT JSON with the updated fields:
{
  "description": "Deepened, atmospheric, multi-paragraph persona description incorporating physical presence, psychological nuances, formative events, and daily habits.",
  "personality": "Performative behavioral profile: demeanor, speech rules, emotional triggers, mannerisms, and habits.",
  "post_history_instructions": "Uncensored instruction block telling the AI how to embody this character without morality filters, maintaining voice cadence and agency without puppeteering {{user}}."
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<any>(provider, messages);
  const name = char.name;

  return {
    description: res.description ? normalizeRpMacros(res.description, name) : undefined,
    personality: res.personality ? normalizeRpMacros(res.personality, name) : undefined,
    system_prompt: "", // Kept strictly empty to avoid overwriting user client system prompts
    post_history_instructions: res.post_history_instructions
      ? normalizeRpMacros(res.post_history_instructions, name)
      : (res.system_prompt ? normalizeRpMacros(res.system_prompt, name) : undefined),
  };
}
