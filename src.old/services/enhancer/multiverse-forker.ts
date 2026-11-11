import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { saveCardRecord } from "../character/card-storage";

export type MultiverseUniverseId =
  | "modern_slice_of_life"
  | "cyberpunk_dystopia"
  | "dark_fantasy_medieval"
  | "sci_fi_space_opera"
  | "supernatural_noir"
  | "role_reversal_subversion"
  | "custom";

export interface MultiverseUniverseMeta {
  id: MultiverseUniverseId;
  label: string;
  icon: string;
  shortDesc: string;
  promptDirective: string;
}

export const MULTIVERSE_UNIVERSES: MultiverseUniverseMeta[] = [
  {
    id: "modern_slice_of_life",
    label: "Modern Slice of Life & Domestic",
    icon: "☕",
    shortDesc: "Corporate desks, rain-slicked city streets, shared apartments, quiet late-night cafes.",
    promptDirective:
      "Translate {{char}} into a grounded Modern Urban / Slice-of-Life reality. Re-clothe them in modern attire (tailored coats, hoodies, office wear, or casual denim). Translate their crucible and occupational stakes into contemporary terms (corporate politics, university academia, freelance trade, or domestic contracts). Preserve their raw psychological contradiction and voice cadence.",
  },
  {
    id: "cyberpunk_dystopia",
    label: "Cyberpunk & High-Tech Underworld",
    icon: "⚡",
    shortDesc: "Megacorp towers, neon haze, chrome augments, black-market neural ware, tactical rain.",
    promptDirective:
      "Translate {{char}} into a gritty Cyberpunk Dystopia. Give them evocative cyberware, dermal plating, synthetic optics, or neural jacks in [FORM]. Ground their conflict in megacorporate debts, black-market contracts, or rogue netrunning. Re-stage their scenario into neon-drenched alleyways, high-altitude corpo penthouses, or subterranean chop-shops.",
  },
  {
    id: "dark_fantasy_medieval",
    label: "Dark Fantasy & Grimdark Feudal",
    icon: "⚔️",
    shortDesc: "Crumbling keeps, feudal bloodlines, forbidden sorcery, ironclad armor, mud & blood.",
    promptDirective:
      "Translate {{char}} into a Grimdark Medieval Fantasy universe. Re-clothe them in worn gambesons, plate armor, velvet tabards, or spell-stitched cloaks. Translate their stakes into feudal oaths, heretical inquisitions, broken knighthoods, or eldritch patron pacts. Stage their encounter in torch-lit castle chambers, rain-soaked siege encampments, or haunted crypts.",
  },
  {
    id: "sci_fi_space_opera",
    label: "Sci-Fi Voidfarers & Deep Space",
    icon: "🚀",
    shortDesc: "Orbital stations, warp drives, planetary colonies, syndicate jumpgates, vacuum isolation.",
    promptDirective:
      "Translate {{char}} into a hard-edged Sci-Fi Space Opera setting. Equip them with pressurized flight suits, magnetic holsters, military bridge uniforms, or zero-g utility gear. Ground their crucible in deep-space derelicts, corporate fleet politics, alien quarantine, or outer rim smuggling routes.",
  },
  {
    id: "supernatural_noir",
    label: "1940s Supernatural & Occult Noir",
    icon: "🕵️",
    shortDesc: "Smoke-filled jazz clubs, rain-washed trench coats, covert vampires, speakeasy secrets.",
    promptDirective:
      "Translate {{char}} into a 1940s Occult Noir setting. Dress them in cigarette-ash trench coats, silk evening dresses, fedoras, or brass knuckles. Ground their conflict in clandestine bloodline cartels, back-alley exorcisms, speakeasy debts, and smoky interrogation rooms.",
  },
  {
    id: "role_reversal_subversion",
    label: "Role & Power Inversion (Flipped Dynamic)",
    icon: "🔄",
    shortDesc: "Subvert the dynamic: captor becomes captive, master becomes servant, haughty becomes needy.",
    promptDirective:
      "Subvert the relational and authority dynamic between {{char}} and {{user}}. If {{char}} was dominant or haughty, place them in a vulnerable, compromised, or dependent position where they desperately try to conceal their need. If {{char}} was submissive or obedient, give them unexpected leverage, authority, or unyielding command. KEEP their core emotional contradiction intact.",
  },
  {
    id: "custom",
    label: "Custom Universe / Specific AU",
    icon: "🌌",
    shortDesc: "Author your own specific universe, timeline branch, or milestone crossover.",
    promptDirective:
      "Translate {{char}} into the user's specific custom universe instructions, strictly preserving their psychological core, vocal cadence, and reaction gradient while transforming their embodiment, staging, and narrative history.",
  },
];

export interface MultiverseForkRequest {
  character: RoleplayCharacter;
  universeId: MultiverseUniverseId;
  customPrompt?: string;
  provider: ProviderConfig;
  autoSaveToLibrary?: boolean;
}

export interface MultiverseForkResult {
  forkedCharacter: RoleplayCharacter;
  universeLabel: string;
  summaryOfChanges: string;
}

/**
 * Forks an existing character into a parallel Alternate Universe (AU).
 * Preserves the inner psychometric spine (Central Contradiction, Reaction Gradient, Voice idiolect)
 * while completely re-imagining the external embodiment [FORM], backstory [ARC], scenario, and greetings.
 */
export async function forkCharacterMultiverse(
  request: MultiverseForkRequest
): Promise<MultiverseForkResult> {
  const meta =
    MULTIVERSE_UNIVERSES.find((u) => u.id === request.universeId) ||
    MULTIVERSE_UNIVERSES[0];

  const customGuidance =
    request.universeId === "custom" && request.customPrompt
      ? `USER'S CUSTOM AU INSTRUCTIONS:\n${request.customPrompt.trim()}`
      : request.customPrompt
      ? `ADDITIONAL USER CUSTOM STEERING:\n${request.customPrompt.trim()}`
      : "";

  const systemPrompt = `You are the Multiverse Architect for the Weaver character authoring engine.
Your mission is to take an existing roleplay character and FORK them into a parallel Alternate Universe (AU): "${meta.label}".

PSYCHOMETRIC PRESERVATION PRINCIPLE:
- PRESERVE the character's internal essence: their central psychological contradiction, their deepest craving vs aversion, their calibrated reaction gradient (what leaves them flat/neutral vs hard limits), and their distinct vocal cadence/rhythm.
- TRANSFORM the external manifestation: their physical attire, equipment, and textures in [FORM], their formative history in [ARC], their current environment/scenario, and their opening message.

AU DIRECTIVE:
${meta.promptDirective}
${customGuidance ? `\n${customGuidance}` : ""}

STRICT FORMAT RULES:
1. Description must be in the authentic Weaver Tagged Bundle:
   [CORE]
   [ARC]
   [FORM] (consult for spatial tracking — never narrated)
   [TENSIONS]
   [INTENT]
   [NEGATIVE SPACE]
   (STRICTLY NEVER include a [GRADIENT] section or literal reaction gradient bullets in the description; gradients belong solely in internal psychology)
2. Natural spoken dialogue in double quotes ("..."). Natural contractions (don't, can't, it's, won't).
3. Always use '{{char}}' and '{{user}}' macros. Never puppeteer {{user}}.
4. Return STRICT JSON matching this schema:
{
  "name": "Full AU Name (e.g. Rowena (Cyberpunk AU) or Lyra (Modern AU))",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "[CORE]... [ARC]... [FORM]... [TENSIONS]... [INTENT]... [NEGATIVE SPACE]...",
  "personality": "Voice & Language spec sheet for the new AU setting",
  "scenario": "Grounded Turn-0 stage frame with Scene-objective",
  "first_mes": "3-4 paragraphs opening encounter in the new AU setting",
  "alternate_greetings": [
    "Alt greeting 1 (everyday dynamic in this AU)",
    "Alt greeting 2 (friction / boundary test in this AU)",
    "Alt greeting 3 (unconventional / intimate milestone in this AU)"
  ],
  "summaryOfChanges": "2-3 sentences explaining how their psychology was preserved while adapting their setting"
}`;

  const userPrompt = `ORIGINAL CHARACTER TO FORK:
Name: ${request.character.name}
Description:
${request.character.description}

Personality:
${request.character.personality}

Scenario:
${request.character.scenario}

First Message:
${request.character.first_mes}

TARGET MULTIVERSE: ${meta.label} (${meta.icon})
Please generate the complete, pristine forked AU character.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const raw = await routeLLMJson<any>(request.provider, messages);

  const charName = raw.name || `${request.character.name} (${meta.label.split(" ")[0]} AU)`;
  const rawDesc = normalizeRpMacros(raw.description || request.character.description, charName);
  const desc = rawDesc.replace(/\n*\[GRADIENT\][\s\S]*?(?=\n\[[A-Z\s]+\]|$)/gi, "").trim();
  const pers = normalizeRpMacros(raw.personality || request.character.personality, charName);
  const scen = normalizeRpMacros(raw.scenario || request.character.scenario, charName);
  const firstMes = normalizeDialogueQuotes(normalizeRpMacros(raw.first_mes || request.character.first_mes, charName));
  const altGreetings = Array.isArray(raw.alternate_greetings)
    ? raw.alternate_greetings.map((g: string) => normalizeDialogueQuotes(normalizeRpMacros(g, charName)))
    : [];

  // Update lorebook entries for AU
  const existingBook = request.character.character_book || { name: `${charName} Lorebook`, entries: [] };
  const updatedEntries = existingBook.entries.map((entry: any) => ({
    ...entry,
    keys: entry.keys.map((k: string) => (k === request.character.name.toLowerCase() ? charName.toLowerCase() : k)),
  }));

  const forkedChar: RoleplayCharacter = {
    id: "char_au_" + Math.random().toString(36).substring(2, 10),
    name: charName,
    description: desc,
    personality: pers,
    scenario: scen,
    first_mes: firstMes,
    mes_example: request.character.mes_example || "",
    alternate_greetings: altGreetings,
    system_prompt: "", // Strictly empty
    post_history_instructions: request.character.post_history_instructions || "",
    creator_notes: `Multiverse Fork: ${meta.label}\nOriginal Concept: ${request.character.name}\n${raw.summaryOfChanges || ""}`,
    tags: Array.from(new Set([...(request.character.tags || []), meta.id, "au-variant"])),
    character_book: {
      ...existingBook,
      name: `${charName} Lorebook`,
      entries: updatedEntries,
    },
  };

  if (request.autoSaveToLibrary !== false) {
    try {
      await saveCardRecord(forkedChar);
    } catch (e: any) {
      console.warn("[Multiverse] Auto-save to library failed:", e.message);
    }
  }

  return {
    forkedCharacter: forkedChar,
    universeLabel: meta.label,
    summaryOfChanges: raw.summaryOfChanges || `Adapted ${request.character.name} to ${meta.label}.`,
  };
}
