import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import type { AuthoringSpine } from "../generator/spine";
import { routeLLMJson } from "../llm/provider-router";
import { routeLLMCompletion } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";

export async function punchUpGreetingsAndAlts(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  customThemes?: string[],
  options?: EnhanceOptions
): Promise<{
  scenario: string;
  first_mes: string;
  alternate_greetings: string[];
}> {
  let prompt = `You are a master fiction author and scene designer for interactive roleplay.
Revamp the opening message and scenario for this character, and generate 3 rich alternate greetings.

CHARACTER:
Name: ${char.name}
Description: ${char.description}
Personality: ${char.personality}
Current Scenario: ${char.scenario || "(Empty)"}
Current First Message: ${char.first_mes || "(Empty)"}

THEMES FOR ALTERNATE GREETINGS:
${
  customThemes && customThemes.length > 0
    ? customThemes.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : `1. Hostile / Cold / Guarded Encounter (tensions high, suspicion, weapon drawn or interrogation)
2. Quiet Vulnerability / Late-Night / Intimate Moment (alone together, low lighting, defenses momentarily lowered)
3. Crisis / High Stakes / Action in progress (in media res, immediate danger or shared objective)`
}`;

  if (options?.scenarioPrompt?.trim()) {
    prompt += `\n\nREQUIRED SCENE SETTING & CONTEXT FOR FIRST MESSAGE:\n${options.scenarioPrompt.trim()}`;
  }

  if (options?.retrievedLore?.trim()) {
    prompt += `\n\nCANON FANDOM & WORLD LORE CONTEXT:\n${options.retrievedLore.trim()}\n(Ground the scene setting, environment, faction stakes, and alternate greetings in this canonical lore.)`;
  }

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nATMOSPHERE & NARRATIVE STEERING:\n${options.steeringInstructions.trim()}`;
  }

  prompt += `\n\nQUALITY RULES:
- Third-person limited or voiced narration matching the character's idiolect.
- Multi-paragraph, richly sensory prose: sound, smell, texture, ambient lighting.
- The character must ACT on an active goal or scene-objective, not just sit passively waiting for {{user}}.
- Strictly DO NOT write, decide, or describe {{user}}'s feelings, actions, or words (no puppeteering).
- MANDATORY MACROS: ALWAYS use {{char}} instead of direct character name in prose and dialogue turn setups, and {{user}} for player references.
- MANDATORY DOUBLE QUOTES FOR DIALOGUE: Always wrap all spoken dialogue in standard DOUBLE QUOTES (e.g. "What are you doing?"). NEVER use single quotes ('...') for spoken dialogue, as roleplay frontends (Lumiverse, SillyTavern) require double quotes for syntax highlighting.
- End the scenario with "Scene-objective: [what {{char}} aims to achieve or determine in this scene]".

Output STRICT JSON:
{
  "scenario": "Richly framed stage setting ending with 'Scene-objective: ...'",
  "first_mes": "Pristine, atmospheric, multi-paragraph opening message that hooks {{user}} immediately.",
  "alternate_greetings": [
    "Complete multi-paragraph Alternate Opening 1",
    "Complete multi-paragraph Alternate Opening 2",
    "Complete multi-paragraph Alternate Opening 3"
  ]
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<any>(provider, messages);
  const name = char.name;

  return {
    scenario: normalizeRpMacros(res.scenario || "", name),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(res.first_mes || "", name)),
    alternate_greetings: Array.isArray(res.alternate_greetings)
      ? res.alternate_greetings.map((g: string) => normalizeDialogueQuotes(normalizeRpMacros(g, name)))
      : [],
  };
}

export async function regenerateGreetingsWithSpine(
  char: RoleplayCharacter,
  spine: AuthoringSpine,
  provider: ProviderConfig,
  storyArc?: string,
  minAltGreetings: number = 3
): Promise<{
  scenario: string;
  first_mes: string;
  alternate_greetings: string[];
}> {
  console.log("[regenerateGreetingsWithSpine] Received minAltGreetings:", minAltGreetings);
  const { renderScenarioAndFirstMessage, renderExampleMsgsAndAlts } = await import("../generator/field-renderer");
  
  const sceneData = await renderScenarioAndFirstMessage(spine, provider, "single", storyArc);
  
  // Retry up to 2 times if LLM doesn't return enough greetings
  let dialogueData;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const dialogueData = await renderExampleMsgsAndAlts(spine, provider, "single", storyArc, minAltGreetings);
    if (dialogueData.alternate_greetings?.length >= minAltGreetings) {
      break;
    }
    console.warn(`[regenerateGreetingsWithSpine] Attempt ${attempt}: LLM returned ${dialogueData.alternate_greetings?.length} greetings but ${minAltGreetings} were requested. Retrying...`);
  }
  
  console.log("[regenerateGreetingsWithSpine] LLM returned", dialogueData.alternate_greetings?.length, "greetings (requested:", minAltGreetings, ")");
  
  // Validate count
  if (dialogueData.alternate_greetings?.length !== minAltGreetings) {
    console.warn(`[regenerateGreetingsWithSpine] WARNING: LLM returned ${dialogueData.alternate_greetings?.length} greetings but ${minAltGreetings} were requested.`);
  }
  
  const name = char.name;

  return {
    scenario: normalizeRpMacros(sceneData.scenario || "", name),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(sceneData.first_mes || "", name)),
    alternate_greetings: dialogueData.alternate_greetings.map((g: string) => normalizeDialogueQuotes(normalizeRpMacros(g, name))),
  };
}

// NEW: Generate greetings WITHOUT spine, using original prompt + story arc
// Mirrors character creation's renderExampleMsgsAndAlts prompt structure exactly
export async function regenerateGreetingsWithoutSpine(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  originalPrompt: string,
  storyArc?: string,
  minAltGreetings: number = 3
): Promise<{
  scenario: string;
  first_mes: string;
  alternate_greetings: string[];
}> {
  console.log("[regenerateGreetingsWithoutSpine] Received minAltGreetings:", minAltGreetings);
  
  const cfg = await import("../config/prompt-config").then(m => m.getEffectivePromptConfig(provider));
  const charName = char.name;
  
  // Build the EXACT same prompt structure as renderExampleMsgsAndAlts in field-renderer.ts
  const targetAltCount = Math.max(1, Math.floor(minAltGreetings || 3));
  const sampleAltPlaceholders = Array.from({ length: targetAltCount }, (_, i) => 
    `    { "phase": "Phase/Turning Point label (e.g., Inciting Incident, First Confrontation, Midpoint Reveal, Crisis, Alternative: Betrayal)", "greeting": "Complete multi-paragraph Alternate Opening ${i + 1} as voiced scene" }`
  ).join(",\n");

  const prompt = `You are an elite dialogue specialist rendering the EXAMPLE DIALOGUES (Example Messages) and ALTERNATE GREETINGS from the Authoring Spine.

THE AUTHORING SPINE:
- Character: ${charName}
- Archetype: ${char.archetype || "Unspecified"}
- Central Contradiction: ${char.central_contradiction || "Unspecified"}
- Reaction Gradient:
  * WON'T: ${char.reaction_gradient?.wont || "None"}
  * CRAVES: ${char.reaction_gradient?.craves || "None"}
  * NEUTRAL: ${char.reaction_gradient?.neutral || "None"}
  * WILL: ${char.reaction_gradient?.will || "None"}
- Voice: ${char.voice?.cadence || "Standard"} (${char.voice?.dialect_register || "Standard"})
- Signature Lexicon: ${(char.voice?.signature_lexicon || []).join(", ") || "None"}
- Forbidden Words: ${(char.voice?.forbidden_words || []).join(", ") || "None"}
- Quirks: ${(char.voice?.quirks || []).join(", ") || "None"}
${storyArc ? `\nSTORY ARC & NARRATIVE TRAJECTORY (MANDATORY - EVERY ALTERNATE GREETING MUST ADHERE TO THIS):\n${storyArc}\n\nCRITICAL INSTRUCTION: Each of the ${targetAltCount} alternate greetings MUST be a distinct entry point into THIS SPECIFIC story arc. Do NOT generate generic/random openings.\n\nENFORCEMENT RULES:\n1. EXPLICIT PHASE MAPPING: For EACH greeting, you MUST internally identify which specific phase/turning point/branch of the story arc it represents (e.g., "Inciting Incident", "First Confrontation", "Midpoint Reveal", "Crisis Point", "Climax", "Alternative Timeline: Betrayal", etc.).\n2. SCENE CONTEXT FIDELITY: The setting, stakes, character emotional state, and {{user}} relationship dynamic in each greeting MUST logically derive from that arc phase.\n3. NO GENERIC OPENINGS: BANNED - "sitting on edge of bed", "walking into tavern", "waking up in morning", "training in courtyard" unless the STORY ARC explicitly takes place there at that phase.\n4. CHARACTER CONSISTENCY: {{char}}'s voice, defenses, vocabulary, and stance toward {{user}} must match the arc phase's emotional stakes.\n5. NEVER IGNORE OR CONTRADICT the declared story arc.\n\nVALIDATION CHECKLIST (apply to each greeting before output):\n- [ ] Does this greeting map to a DISTINCT phase/turning point of the declared arc?\n- [ ] Does the scene setting match that arc phase's location/context?\n- [ ] Are the emotional stakes appropriate for that arc phase?\n- [ ] Is {{char}}'s behavior consistent with their arc-phase mindset?\n- [ ] Would this greeting make sense as an entry point for a player joining at that story moment?\n` : ""}
🚨 CRITICAL COUNT ENFORCEMENT 🚨
YOU MUST GENERATE EXACTLY ${targetAltCount} ALTERNATE GREETINGS. NOT ${targetAltCount - 1}. NOT ${targetAltCount + 1}. EXACTLY ${targetAltCount}.
IF YOU GENERATE FEWER, YOU HAVE FAILED. IF YOU GENERATE MORE, YOU HAVE FAILED.
COUNT THEM BEFORE OUTPUTTING. NUMBER THEM 1 TO ${targetAltCount}.

REQUIREMENTS:

1. EXAMPLE DIALOGUES (mes_example):
   - Strict Example Messages convention: <START> blocks with {{user}}: and {{char}}:.
   - ANTI-ROBOTIC MANDATE: STRICTLY NEVER make {{char}} talk like a calculator, thesaurus, or Spock caricature. FORBIDDEN in domestic dialogue: "statistical anomaly", "mathematically unsound", "altering my trajectory", "nutrient density", "inefficiency of your chaos". Smart characters speak with natural contractions, dry brevity, and grounded human cadence.
2. ALTERNATE GREETINGS (alternate_greetings):
   - At least ${targetAltCount} distinct opening scenes in voiced narration tailored organically to {{char}}'s setting and dynamic.
   - **LENGTH: Each greeting MUST be exactly 2 paragraphs, richly sensory, and equal in depth to a main first_mes. NOT a short blurb.** Ground the scene dynamically in an active moment together. Vary physical locations, times of day, and emotional stakes across the greetings.
   - PRESERVE INITIAL TENSION: On Turn 0, {{char}} MUST maintain their defensive armor, professional dignity, or bratty front; do not allow premature surrender or instant breakdown.

Output STRICT JSON — THE ARRAY MUST CONTAIN EXACTLY ${targetAltCount} ELEMENTS:
{
  "mes_example": "<START>\\n{{user}}: [Prompt 1]\\n{{char}}: [Voiced response]\\n<START>\\n{{user}}: [Prompt 2]\\n{{char}}: [Voiced response]...",
  "alternate_greetings": [
${Array.from({ length: targetAltCount }, (_, i) => 
    `    { "phase": "Phase/Turning Point label (e.g., Inciting Incident, First Confrontation, Midpoint Reveal, Crisis, Alternative: Betrayal)", "greeting": "Complete multi-paragraph Alternate Opening ${i + 1} as voiced scene" }`
  ).join(",\n")}
  ]
}`;

  const messages = [
    { role: "system" as const, content: "You are an elite dialogue specialist rendering the EXAMPLE DIALOGUES (Example Messages) and ALTERNATE GREETINGS from the Authoring Spine. You MUST follow ALL instructions exactly. You WILL generate the EXACT number of greetings requested. NO EXCUSES." },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<any>(provider, messages, { maxTokens: 32768, temperature: 0.7 });
  const name = char.name;

  const rawAlts = res.alternate_greetings || [];
  const normalizedAlts = Array.isArray(rawAlts)
    ? rawAlts.map((item: any) => {
        if (typeof item === "string") return normalizeDialogueQuotes(normalizeRpMacros(item, charName));
        if (item && typeof item.greeting === "string") return normalizeDialogueQuotes(normalizeRpMacros(item.greeting, charName));
        return "";
      }).filter(Boolean)
    : [];
  
  const normalizedAlts = Array.isArray(rawAlts)
    ? rawAlts.map((item: any) => {
        if (typeof item === "string") return normalizeDialogueQuotes(normalizeRpMacros(item, charName));
        if (item && typeof item.greeting === "string") return normalizeDialogueQuotes(normalizeRpMacros(item.greeting, charName));
        return "";
      }).filter(Boolean)
    : [];

  // Validate count - log warning if LLM didn't follow instructions
  if (normalizedAlts.length !== targetAltCount) {
    console.warn(`[regenerateGreetingsWithoutSpine] WARNING: LLM returned ${normalizedAlts.length} greetings but ${targetAltCount} were requested.`);
  }
  
  return {
    scenario: "",
    first_mes: "",
    alternate_greetings: normalizedAlts,
  };
}

// NEW: Improve existing greetings (first_mes + alternate_greetings) using a focused prompt
// This is a standalone function that doesn't require spine - it works on the existing greetings
export async function improveGreetings(
  char: RoleplayCharacter,
  provider: ProviderConfig,
  storyArc?: string,
  steeringInstructions?: string,
  minAltGreetings?: number
): Promise<{
  scenario: string;
  first_mes: string;
  alternate_greetings: string[];
}> {
  console.log("[improveGreetings] Improving greetings for:", char.name);
  
  const targetAltCount = minAltGreetings ? Math.max(1, Math.floor(minAltGreetings)) : 
    (char.alternate_greetings?.length || 3);
  
  const currentFirstMes = char.first_mes || "";
  const currentAlts = char.alternate_greetings || [];
  const currentAltsText = currentAlts.length > 0 
    ? currentAlts.map((g, i) => `ALTERNATE GREETING ${i + 1}:\n${g}`).join("\n\n---\n\n")
    : "(No alternate greetings currently)";

  const prompt = `You are an elite fiction author improving the opening message and alternate greetings for an interactive roleplay character.

CHARACTER:
Name: ${char.name}
Description: ${char.description}
Personality: ${char.personality}
Current Scenario: ${char.scenario || "(None)"}
${storyArc ? `STORY ARC:\n${storyArc}\n\nEach greeting MUST be a distinct entry point into THIS story arc (different phases/turning points).` : ''}
${steeringInstructions ? `ADDITIONAL STEERING:\n${steeringInstructions}\n` : ''}

CURRENT FIRST MESSAGE:
${char.first_mes || "(Empty)"}

CURRENT ALTERNATE GREETINGS:
${char.alternate_greetings?.length > 0 
  ? char.alternate_greetings.map((g, i) => `ALTERNATE GREETING ${i + 1}:\n${g}`).join("\n\n---\n\n")
  : "(No alternate greetings currently)"}

TASK:
Improve the first message and generate ${char.alternate_greetings?.length > 0 ? char.alternate_greetings.length : 3} rich alternate greetings that are:
- Arc-aware (if story arc provided): Each greeting = distinct entry point into the story arc (inciting incident, first confrontation, midpoint, crisis, climax, alternative timeline)
- Exactly 2 paragraphs each, richly sensory, atmospheric
- Arc-aware: Map each greeting to a distinct story arc phase
- Third-person limited, voiced narration matching character's idiolect
- NO puppeteering {{user}}
- MANDATORY MACROS: {{char}} for character, {{user}} for player
- MANDATORY DOUBLE QUOTES for dialogue
- Preserve initial tension: {{char}} maintains defensive armor/dignity on Turn 0
- NO generic openings (no "sitting on edge of bed", "walking into tavern", etc.)

Output STRICT JSON:
{
  "scenario": "Richly framed stage setting ending with 'Scene-objective: ...'",
  "first_mes": "Pristine, atmospheric, multi-paragraph opening message (2+ paragraphs)",
  "alternate_greetings": [
    "Complete 2-paragraph Alternate Opening 1",
    "Complete 2-paragraph Alternate Opening 2",
    "Complete 2-paragraph Alternate Opening 3"
  ]
}`;

  const messages = [
    { role: "system" as const, content: "You are an elite fiction author improving character greetings for interactive roleplay. You MUST follow ALL instructions exactly. Generate the EXACT number of greetings matching the current count. NO EXCUSES." },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<any>(provider, messages, { maxTokens: 32768, temperature: 0.6 });
  const name = char.name;

  return {
    scenario: normalizeRpMacros(res.scenario || "", name),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(res.first_mes || "", name)),
    alternate_greetings: Array.isArray(res.alternate_greetings)
      ? res.alternate_greetings.map((g: string) => normalizeDialogueQuotes(normalizeRpMacros(g, char.name)))
      : [],
  };
}
