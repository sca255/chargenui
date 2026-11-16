import type { RoleplayCharacter, CharacterBookEntry } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { normalizeRpMacros } from "../character/macro-engine";
import { getEffectiveEnhancerPrompts } from "../config/prompt-config";

export type WorldNodeCategory =
  | "locations"
  | "npcs_factions"
  | "secrets_triggers"
  | "relics_gear"
  | "general";

export interface GenerateWorldNodesRequest {
  character: RoleplayCharacter;
  category: WorldNodeCategory;
  customContext?: string;
  count?: number;
  provider: ProviderConfig;
}

export interface GenerateWorldNodesResult {
  nodes: CharacterBookEntry[];
  category: WorldNodeCategory;
  summary: string;
}

const CATEGORY_DIRECTIVES: Record<WorldNodeCategory, string> = {
  locations: `Focus strictly on 2-3 immersive, tactile physical LOCATIONS and staging environments central to {{char}}'s daily life, work, or hideouts.
Each location must specify:
- Sensory atmosphere (lighting, smell, sounds, clutter)
- Practical layout and spatial objects {{char}} or {{user}} can interact with
- What {{char}} does when alone here vs when receiving {{user}}`,
  npcs_factions: `Focus strictly on 2-3 crucial NPCS, RIVALS, HANDLERS, OR FACTIONS that exert direct narrative pressure on {{char}}.
Each entity must specify:
- Their exact relationship to {{char}} (debt, rivalry, blood pact, ideological clash)
- Concrete friction / boundary: what happens if their name or interests are brought up
- How {{char}} instinctively reacts when this entity is mentioned`,
  secrets_triggers: `Focus strictly on 2-3 TABOO SECRETS, UNHEALED TRAUMAS, OR HIDDEN TRUTHS that {{char}} actively hides.
CRITICAL SILENT TRIGGER CONVENTION:
- Design specific, natural TRIGGER KEYS (e.g. "scar", "past", "nightmare", "confession", "forgiveness", "promise") that remain silent until the player actually probes that specific theme.
- When triggered, this entry provides the LLM with the deep psychological subtext and unmasked vulnerability needed to advance the scene.`,
  relics_gear: `Focus strictly on 2-3 SIGNATURE RELICS, WEAPONS, OR PERSONAL TALISMANS {{char}} carries.
Each relic must specify:
- Physical description, tactile weight, wear, materials
- Origin beat: how they obtained it and what promise or burden it represents
- Observable physical habit: how {{char}} fingers, checks, or holds it during tension`,
  general: `Generate a balanced set of 3 worldbuilding nodes covering 1 signature location, 1 pivotal relationship/rival, and 1 hidden personal secret.`,
};

/**
 * Synthesizes deep, immersive SillyTavern CCv2/CCv3 Character Bible (Lorebook) entries
 * to expand the character's living world.
 */
export async function generateWorldNodes(
  request: GenerateWorldNodesRequest
): Promise<GenerateWorldNodesResult> {
  const charName = request.character.name || "Character";
  const cat = request.category || "general";
  const directive = CATEGORY_DIRECTIVES[cat] || CATEGORY_DIRECTIVES.general;
  const count = Math.max(1, Math.min(5, request.count || 3));

  const baseNodesPrompt =
    getEffectiveEnhancerPrompts(request.provider).worldNodes ||
    `You are an elite Worldbuilding Lore Architect for the SillyTavern Character Bible system.
Your task is to synthesize \${count} high-utility, atmospheric Character Bible (World Info) entries for the character "\${charName}".`;

  const systemPrompt = `${baseNodesPrompt.replace(/\$\{count\}/g, String(count)).replace(/\$\{charName\}/g, charName)}

CATEGORY FOCUS: ${cat.toUpperCase()}
${directive}

${request.customContext ? `USER CUSTOM FOCUS / PROMPT:\n${request.customContext.trim()}\n` : ""}

REQUIREMENTS:
1. Every entry must have 3-6 precise, natural, lowercase activation KEYS (words or short phrases that might naturally occur in player dialogue or narrative).
2. Clean macro usage: Use '{{char}}' for the character and '{{user}}' for the player.
3. Content must be dense, factual, and actionable for the AI when injected into context during chat.
4. Output STRICT JSON:
{
  "summary": "1-2 sentences summarizing the world nodes generated",
  "entries": [
    {
      "comment": "Title of entry (e.g. 'Location: The Clocktower Workshop')",
      "keys": ["clocktower", "workshop", "hideout", "gears"],
      "content": "Rich factual lore entry...",
      "position": "before_char",
      "enabled": true
    }
  ]
}`;

  const userPrompt = `CHARACTER CONTEXT:
Name: ${charName}
Description:
${request.character.description}

Personality:
${request.character.personality}

Scenario:
${request.character.scenario}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const raw = await routeLLMJson<any>(request.provider, messages);

  const existingEntries = request.character.character_book?.entries || [];
  let nextId = existingEntries.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0) + 1;

  const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const nodes: CharacterBookEntry[] = rawEntries.map((e: any) => ({
    id: nextId++,
    keys: Array.isArray(e.keys)
      ? e.keys.map((k: string) => k.toLowerCase().trim()).filter(Boolean)
      : [charName.toLowerCase()],
    comment: e.comment || `World Node #${nextId}`,
    content: normalizeRpMacros(e.content || "", charName),
    position: e.position === "after_char" ? "after_char" : "before_char",
    enabled: e.enabled !== false,
  }));

  return {
    nodes,
    category: cat,
    summary: raw.summary || `Synthesized ${nodes.length} world nodes for ${charName}.`,
  };
}
