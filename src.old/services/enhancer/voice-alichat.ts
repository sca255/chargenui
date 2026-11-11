import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { normalizeRpMacros } from "../character/macro-engine";

export async function polishVoiceAndAliChat(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  options?: EnhanceOptions
): Promise<{
  mes_example: string;
  post_history_instructions: string;
  voice_notes: {
    cadence: string;
    dialect_register: string;
    forbidden_words: string[];
    quirks: string[];
  };
  updated_personality?: string;
}> {
  const rawSteering = `${options?.voiceStyle || ""} ${options?.steeringInstructions || ""}`.toLowerCase();
  const wantsInformalOrNatural =
    rawSteering.includes("not formal") ||
    rawSteering.includes("don't be formal") ||
    rawSteering.includes("dont be formal") ||
    rawSteering.includes("no formal") ||
    rawSteering.includes("informal") ||
    rawSteering.includes("casual") ||
    rawSteering.includes("grounded") ||
    rawSteering.includes("natural") ||
    rawSteering.includes("unpretentious") ||
    rawSteering.includes("less formal") ||
    rawSteering.includes("no robot") ||
    rawSteering.includes("ban robot");

  let overrideDirective = "";
  if (wantsInformalOrNatural) {
    overrideDirective = `
🚨 MANDATORY OVERRIDE DIRECTIVE — THE USER EXPLICITLY COMMANDS NON-FORMAL SPEECH:
1. TOTAL PURGE OF STIFFNESS: You must completely IGNORE, PURGE, and REVERSE any text in the character profile above that claims {{char}} speaks in "high academic and formal" or "scientific nomenclature for mundane things". Those old instructions are VOID.
2. GROUNDED HUMAN REALISM: {{char}} MUST speak in a natural, grounded, everyday human voice. Use natural contractions ("don't", "can't", "I'm", "it's", "won't"), conversational rhythm, realistic pauses, and domestic familiarity.
3. AUTHENTIC INTELLECT: Smart, reserved characters in private show their intelligence through dry brevity, razor-sharp observation, and deadpan irony — NEVER through pseudo-scientific lectures or talking like a broken textbook.`;
  }

  const antiThesaurusMandate = `
CRITICAL ANTI-ROBOTIC & REALISTIC SPEECH MANDATE (ABSOLUTE PROHIBITION):
- STRICT BAN ON SPOCK / CALCULATOR / ANDROID CLICHES:
  * NEVER make {{char}} use pseudo-intellectual or scientific jargon to describe normal everyday human acts.
  * FORBIDDEN WORDS/PHRASES in dialogue: "statistical anomaly", "mathematically unsound", "altering my trajectory", "nutrient density", "sensory saturation", "cognitive dissonance" (unless actively analyzing a peer-reviewed psychology paper), "inefficiency of your chaos", "data points", "efficiency of a ratio".
  * Real academics, researchers, and reserved characters DO NOT speak like broken text-to-speech engines in private life.
- HOW TO WRITE REALISTIC SHARP / RESERVED DIALOGUE:
  * When asked to come to bed: She says "Three more pages. Go to sleep if you can't keep your eyes open." or "Stop hovering, you're blocking my lamp." (NOT "The chapter on cognitive dissonance is far more compelling... timing is mathematically unsound... take me by the waist like a brute").
  * When asked about lost keys: She sighs: "Check the counter where you always drop them." (NOT "Your inability to track your belongings is a statistical anomaly").
  * When flattered/complimented: She gives a dry, faint scoff: "Smooth. Now let me finish this page." (NOT "Flattery is a low-effort tactic statistically ineffective at altering my trajectory").
  * When dinner is discussed: She says "Something light. And pour the wine before you sit down." (NOT "Nutrient density is more important than flavor at this hour... well-balanced ratio").`;

  let prompt = `You are a dialogue specialist and speech pattern engineer for roleplay LLMs.
Analyze the following character and generate:
1. A pristine set of 3-5 example exchanges in strict Example Messages format (<START> blocks).
2. Voice rules (cadence, vocabulary, forbidden words, quirks).
3. Post-history instructions to lock in voice consistency and eliminate robotic AI speech patterns.
4. An updated "personality" block that cleanses any obsolete robotic/stiff voice rules and locks in the new natural voice.

CHARACTER PROFILE:
Name: ${char.name}
Description:
${char.description}

Current Personality:
${char.personality}

Existing Examples:
${char.mes_example || "(None)"}`;

  if (overrideDirective) {
    prompt += `\n\n${overrideDirective}`;
  }

  if (options?.retrievedLore?.trim()) {
    prompt += `\n\nCANON FANDOM & CHARACTER LORE CONTEXT:\n${options.retrievedLore.trim()}\n(Draw on canonical relationships, speech mannerisms, catchphrases, and interactions from this lore in the dialogue examples and voice rules.)`;
  }

  if (options?.voiceStyle?.trim() && options.voiceStyle !== "custom") {
    prompt += `\n\nTARGET SPEECH REGISTER / VOCAL IDIOLECT:\n${options.voiceStyle.trim()}`;
  }

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nDIRECTOR'S DIALOGUE & BEAT STEERING:\n${options.steeringInstructions.trim()}\n(Strictly prioritize these instructions over any stale personality text.)`;
  }

  prompt += `\n\n${antiThesaurusMandate}`;

  prompt += `\n\nREQUIREMENTS FOR EXAMPLE EXCHANGES:
- Begin each exchange with a line containing only "<START>".
- Each exchange must contain a "{{user}}:" turn and a "{{char}}:" turn.
- STRICT MACRO DIRECTIVE: NEVER hardcode the character's direct name (e.g. "${char.name}:"). Turns MUST be written with the literal macro "{{char}}:" and user turns with "{{user}}:".
- Across the exchanges, cover VARIED emotional beats:
  1. A tense or emotional conflict beat.
  2. A boundary the character firmly holds (proving they are not an agreeable chatbot).
  3. A moment of their specific humor, banter, or irony.
  4. A moment of quiet vulnerability or value-driven decision.
  5. A mundane, everyday interaction showing baseline cadence.
- Dialogue must sound unmistakably like THIS person. Incorporate *italics* for action beats, physical mannerisms, and tone.
- Do NOT write {{user}}'s actions or thoughts beyond a short prompt setup.

Output STRICT JSON:
{
  "mes_example": "<START>\\n{{user}}: [Prompt 1]\\n{{char}}: [Response 1]\\n<START>\\n{{user}}: [Prompt 2]\\n{{char}}: [Response 2]...",
  "post_history_instructions": "Roleplay directives enforcing {{char}} voice adherence, agency, physical mannerisms, and prohibiting {{user}} puppeteering.",
  "voice_notes": {
    "cadence": "Sentence rhythm, phrasing habits, tempo",
    "dialect_register": "Formality tier, characteristic lexicon, slang",
    "forbidden_words": ["Specific words or stock AI phrases this character would NEVER say"],
    "quirks": ["Verbal tics, breath patterns, signature physical tells while speaking"]
  },
  "updated_personality": "Updated performative personality block with sanitized voice rules matching the new speech cadence."
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<any>(provider, messages);
  const name = char.name;

  let cleanPersonality = res.updated_personality ? normalizeRpMacros(res.updated_personality, name) : undefined;
  if (!cleanPersonality && wantsInformalOrNatural && char.personality) {
    // Heuristic sanitize if model didn't return updated_personality
    cleanPersonality = char.personality
      .replace(/high academic and formal/gi, "grounded, natural, and observant")
      .replace(/uses scientific nomenclature for mundane things/gi, "speaks plainly with dry understatement and natural contractions");
  }

  return {
    mes_example: normalizeRpMacros(res.mes_example || "", name),
    post_history_instructions: normalizeRpMacros(res.post_history_instructions || "", name),
    voice_notes: res.voice_notes || {
      cadence: "Grounded and rhythmic",
      dialect_register: "Natural spoken English with dry irony",
      forbidden_words: ["statistically anomaly", "mathematically unsound", "altering my trajectory", "nutrient density"],
      quirks: [],
    },
    updated_personality: cleanPersonality,
  };
}
