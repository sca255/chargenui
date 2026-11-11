import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";

export interface ScenarioPackage {
  id: "canon" | "crisis" | "intimacy" | "interrogation";
  title: string;
  vibe: string;
  scenario: string;
  first_mes: string;
  alternate_greetings: string[];
}

export interface ScenarioMatrixResult {
  characterName: string;
  packages: ScenarioPackage[];
}

/**
 * Generates a matrix of 4 distinct, immersive roleplay scenario branches for a character:
 * 1. Canon / Baseline Encounter: The authentic foundational setting and relationship dynamic.
 * 2. High-Stakes Crisis (In Media Res): Immediate danger, action in progress, forced cooperation.
 * 3. Late-Night Intimacy & Vulnerability: Low lighting, emotional walls temporarily lowered, repressed yearning.
 * 4. Hostile Interrogation / Dark Friction: Mistrust, weapon drawn, captive or interrogator tension.
 */
export async function generateScenarioMatrix(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  customSteering?: string,
  retrievedLore?: string
): Promise<ScenarioMatrixResult> {
  const prompt = `You are a master fiction author and scene designer for interactive roleplay.
Given this character profile, generate a complete SCENARIO MATRIX containing 4 distinctly branched roleplay opening packages.

CHARACTER PROFILE:
Name: ${char.name}
Description:
${char.description}

Personality & Demeanor:
${char.personality}

Current Scenario:
${char.scenario || "(None)"}

Current First Message:
${char.first_mes || "(None)"}

${
  retrievedLore && retrievedLore.trim()
    ? `CANON FANDOM & SCENARIO LORE:\n${retrievedLore.trim()}\n(Ground the canon encounter, crisis event, and intimate scenes in these authentic lore details, factions, and world stakes.)\n\n`
    : ""
}${
  customSteering && customSteering.trim()
    ? `DIRECTOR'S STEERING DIRECTIVE:\n${customSteering.trim()}\n`
    : ""
}

QUALITY RULES:
1. Third-person limited or voiced narration matching {{char}}'s idiolect.
2. Multi-paragraph, richly sensory prose: sound, ambient temperature, lighting, physical posture, smells.
3. {{char}} must ACT with an active goal or scene-objective, never sitting passively like an idle NPC.
4. STRICTLY NEVER write, decide, or describe {{user}}'s feelings, actions, or words (no puppeteering).
5. MANDATORY MACROS: ALWAYS use {{char}} instead of direct character name in prose and dialogue turn setups, and {{user}} for player references.
6. MANDATORY DOUBLE QUOTES FOR DIALOGUE: Always wrap spoken dialogue in standard DOUBLE QUOTES (e.g. "What are you doing?"). NEVER use single quotes ('...') for spoken dialogue.
7. Every scenario MUST end with "Scene-objective: [what {{char}} aims to achieve or determine in this scene]".

Output STRICT JSON matching this schema:
{
  "packages": [
    {
      "id": "canon",
      "title": "Evocative Title (e.g. 'The Frostbitten Archivist')",
      "vibe": "Authentic Canon Dynamic & Baseline Encounter",
      "scenario": "Rich stage-setting ending with 'Scene-objective: ...'",
      "first_mes": "Pristine, atmospheric, multi-paragraph opening message that hooks {{user}} immediately.",
      "alternate_greetings": [
        "Alternate opening variation A for canon setting",
        "Alternate opening variation B for canon setting"
      ]
    },
    {
      "id": "crisis",
      "title": "Evocative Title (e.g. 'Sub-Zero Reactor Failure')",
      "vibe": "Adrenaline, Immediate Threat & Shared Survival",
      "scenario": "High-stakes crisis setting ending with 'Scene-objective: ...'",
      "first_mes": "Pristine, atmospheric, multi-paragraph opening message in media res.",
      "alternate_greetings": [
        "Alternate opening variation A for crisis setting",
        "Alternate opening variation B for crisis setting"
      ]
    },
    {
      "id": "intimacy",
      "title": "Evocative Title (e.g. 'Observation Deck: 0300 Hours')",
      "vibe": "Quiet Vulnerability, Defenses Down & Slow-Burn Tension",
      "scenario": "Intimate setting ending with 'Scene-objective: ...'",
      "first_mes": "Pristine, atmospheric, multi-paragraph opening message with palpable emotional/sensual tension.",
      "alternate_greetings": [
        "Alternate opening variation A for intimate setting",
        "Alternate opening variation B for intimate setting"
      ]
    },
    {
      "id": "interrogation",
      "title": "Evocative Title (e.g. 'Behind Locked Bulkheads')",
      "vibe": "Hostile Friction, Mistrust & Power Dynamic",
      "scenario": "Confrontational setting ending with 'Scene-objective: ...'",
      "first_mes": "Pristine, atmospheric, multi-paragraph opening message with high psychological friction.",
      "alternate_greetings": [
        "Alternate opening variation A for interrogation setting",
        "Alternate opening variation B for interrogation setting"
      ]
    }
  ]
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<{ packages: ScenarioPackage[] }>(provider, messages);
  const name = char.name;

  const packages: ScenarioPackage[] = Array.isArray(res.packages)
    ? res.packages.map((pkg) => ({
        id: pkg.id || "canon",
        title: pkg.title || "Custom Scenario",
        vibe: pkg.vibe || "",
        scenario: normalizeRpMacros(pkg.scenario || "", name),
        first_mes: normalizeDialogueQuotes(normalizeRpMacros(pkg.first_mes || "", name)),
        alternate_greetings: Array.isArray(pkg.alternate_greetings)
          ? pkg.alternate_greetings.map((g) => normalizeDialogueQuotes(normalizeRpMacros(g, name)))
          : [],
      }))
    : [];

  return {
    characterName: char.name,
    packages,
  };
}
