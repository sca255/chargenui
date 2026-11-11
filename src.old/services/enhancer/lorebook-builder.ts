import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter, CharacterBook } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";

export async function generateCharacterLorebook(
  char: RoleplayCharacter,
  depth: "compact" | "detailed",
  provider: ProviderConfig,
  options?: EnhanceOptions
): Promise<CharacterBook> {
  const count = depth === "detailed" ? "6 to 10" : "3 to 5";
  let prompt = `You are an elite lore architect and worldbuilding engineer for roleplay environments.
Generate a high-utility SillyTavern Character Book (World Info) for this character.
Extract and expand key world elements:
- Signature weapons / equipment / relics
- Crucial locations / home base / haunts
- Factions / organizations / criminal syndicates / guilds they interact with
- Key backstory events / secrets / forbidden lore
- Important relationships / rivals / allies

CHARACTER CONTEXT:
Name: ${char.name}
Description: ${char.description}
Personality: ${char.personality}
Scenario: ${char.scenario}`;

  if (options?.retrievedLore?.trim()) {
    prompt += `\n\nCANON FANDOM RESEARCH & RETRIEVED LORE:\n${options.retrievedLore.trim()}\n(CRITICAL: Extract genuine canonical entities from this lore into the lorebook: signature weapons, specific gear, key factions, known locations, and pivotal lore events.)`;
  }

  if (options?.lorebookTopics?.trim()) {
    prompt += `\n\nDIRECTOR'S PRIORITY LORE TOPICS & ENTITIES:\n${options.lorebookTopics.trim()}\n(Focus lorebook entries specifically around these concepts, factions, relics, or secrets.)`;
  }

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nWORLDBUILDING & TONE DIRECTIVES:\n${options.steeringInstructions.trim()}`;
  }

  prompt += `\n\nREQUIREMENTS:
- Generate ${count} entries.
- Each entry must have precise, natural activation keys (synonyms, lower-case, words likely to appear in dialogue or user messages).
- Content should be dense, atmospheric, and actionable for the AI when the entry triggers.

Output STRICT JSON matching this schema:
{
  "name": "${char.name} - Lorebook",
  "description": "Embedded world info and lorebook entries for ${char.name}",
  "scan_depth": 5,
  "token_budget": 1024,
  "recursive_scanning": false,
  "entries": [
    {
      "comment": "Title of entry (e.g. 'Weapon: Obsidian Dagger')",
      "keys": ["obsidian dagger", "dagger", "black blade"],
      "content": "Dense factual lore describing the weapon, its origin, effects, and significance to {{char}}.",
      "position": "before_char",
      "enabled": true
    }
  ]
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  return await routeLLMJson<CharacterBook>(provider, messages);
}
