import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";

export async function shiftCharacterTone(
  char: RoleplayCharacter,
  targetTone: string,
  provider: ProviderConfig,
  nsfw = false,
  options?: EnhanceOptions
): Promise<Partial<RoleplayCharacter>> {
  let prompt = `You are an uncensored roleplay card stylist and tone calibration engineer.
Re-calibrate the emotional register, voice, demeanor, and scenario of this character to match the target tone: "${targetTone}".
${nsfw ? "Full NSFW, erotic, dark, or taboo elements are unconstrained." : "Embrace full creative freedom."}

CHARACTER:
Name: ${char.name}
Description: ${char.description}
Personality: ${char.personality}
Scenario: ${char.scenario}
First Message: ${char.first_mes}

INSTRUCTIONS:
Retain the core identity, history, and physical form of the character, but shift their attitude, vocabulary, emotional reactions, and opening scene toward "${targetTone}".`;

  if (options?.retrievedLore?.trim()) {
    prompt += `\n\nCANON FANDOM & LORE CONTEXT:\n${options.retrievedLore.trim()}`;
  }

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nSPECIFIC STEERING & DYNAMICS DIRECTIVE:\n${options.steeringInstructions.trim()}\n(Apply these specific behaviors, dialogue dynamics, and character nuances in the new tone.)`;
  }

  prompt += `\n\nOutput STRICT JSON:
{
  "description": "Adjusted description reflecting the new tone/aura",
  "personality": "Re-tuned personality spec, mannerisms, and behavioral rules",
  "scenario": "Adjusted scenario framing matching the new vibe",
  "first_mes": "Re-voiced opening message reflecting the new attitude and tone"
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  return await routeLLMJson<Partial<RoleplayCharacter>>(provider, messages);
}
