import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import type { ProviderConfig } from "../../types/provider";
import { callProviderWithJsonRepair } from "../llm/provider-router";
import { normalizeRpMacros } from "../character/macro-engine";

const REGISTER_GUIDANCE: Record<string, string> = {
  victorian_gothic:
    "Gothic Victorian register: Formal, atmospheric, subtle psychological dread, tactile candlelight/stone/velvet textures, repressed fervor.",
  gritty_noir:
    "Hardboiled Gritty Noir register: Cynical, hard-edged, clipped rhythm, urban decay, cigarette smoke, moral fatigue, stark similes.",
  cyber_street:
    "Cyberpunk Street register: Neon-lit, chrome, subculture jargon, corporate distrust, fast kinetic cadence, tech-augmented slang.",
  light_novel:
    "Light Novel register: Expressive interiority, vibrant emotive reactions, brisk pacing, clean visual descriptions, character quirk emphasis.",
  pulp_fantasy:
    "Sword & Sorcery Pulp Fantasy register: Bold, visceral, ancient bloodlines, iron, campfire embers, mythic gravitas, unapologetic ambition.",
  erotic_romance:
    "Sensual Intimate Romance register: Deep physical proximity, breath, pulse, skin temperature, heavy emotional stakes, tension.",
};

const FORMAT_GUIDANCE: Record<string, string> = {
  prose: "Format in natural, evocative narrative paragraphs with vivid spoken quotes in double quotation marks.",
  boostyle: "Format description and personality using structured categorized bracket tags (e.g. [Role: ...], [Appearance: ...], [Psychology: ...]).",
  wxx: "Format attributes using W++ syntax (e.g. [character('Name') { Gender(...) + Mind(...) + Appearance(...) }]).",
  ali_chat: "Format personality and example messages using Ali:Chat dialogue format (e.g. {{char}}: \"...\" / {{user}}: \"...\").",
};

/**
 * Transfers the structural format or literary register of a character card.
 */
export async function transferCharacterStyle(
  char: RoleplayCharacter,
  options: EnhanceOptions,
  provider: ProviderConfig
): Promise<{ character: RoleplayCharacter; changesSummary: string[] }> {
  const registerKey = options.literaryRegister || "gritty_noir";
  const registerGuidance =
    registerKey === "custom" && options.customRegisterDescription
      ? options.customRegisterDescription
      : REGISTER_GUIDANCE[registerKey] || REGISTER_GUIDANCE.gritty_noir;

  const targetFormat = options.styleTargetFormat || options.targetFormat || "prose";
  const formatGuidance = FORMAT_GUIDANCE[targetFormat] || FORMAT_GUIDANCE.prose;

  const systemPrompt = `You are an elite narrative stylist and character card architect.
Your task is to perform STYLE TRANSFER on this roleplay character card.
You must rigorously preserve ALL canon facts (names, species, history, core relationships, boundaries, psychometrics).
Transcribe their narrative register and syntax according to the specified style directives.

STYLE DIRECTIVES:
- Target Format: ${targetFormat.toUpperCase()} (${formatGuidance})
- Literary Register: ${registerKey.toUpperCase()} (${registerGuidance})

STRICT RULES:
1. Preserve {{user}} and {{char}} macros verbatim.
2. Absolutely ZERO puppeteering of {{user}} in first_mes or alternate greetings.
3. Keep spoken dialogue authentic to the character, flavored by the new register.
4. Output valid JSON matching the schema.`;

  const userPrompt = `ORIGINAL CHARACTER CARD:
Name: ${char.name}
Description:
${char.description}

Personality:
${char.personality}

Scenario:
${char.scenario}

First Message:
${char.first_mes}

Alternate Greetings (${char.alternate_greetings.length} greetings):
${char.alternate_greetings.map((g, i) => `[Alt ${i + 1}]:\n${g}`).join("\n\n")}

Rewrite this character in JSON format:
{
  "description": "...",
  "personality": "...",
  "scenario": "...",
  "first_mes": "...",
  "alternate_greetings": ["..."]
}`;

  const result = await callProviderWithJsonRepair<{
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    alternate_greetings?: string[];
  }>({
    provider,
    systemPrompt,
    userPrompt,
    temperature: 0.7,
  });

  const parsed = result.data;
  const name = char.name || "Unnamed";
  const updated: RoleplayCharacter = {
    ...char,
    description: normalizeRpMacros(parsed.description || char.description, name),
    personality: normalizeRpMacros(parsed.personality || char.personality, name),
    scenario: normalizeRpMacros(parsed.scenario || char.scenario, name),
    first_mes: normalizeRpMacros(parsed.first_mes || char.first_mes, name),
    alternate_greetings: Array.isArray(parsed.alternate_greetings)
      ? parsed.alternate_greetings.map((g) => normalizeRpMacros(g, name))
      : char.alternate_greetings,
  };

  const changesSummary = [
    `Applied Style Transfer: Register shifted to [${registerKey}], Format aligned to [${targetFormat}].`,
    `Preserved core psychometric contradictions and relational boundaries.`,
  ];

  return { character: updated, changesSummary };
}
