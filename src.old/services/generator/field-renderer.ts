// Master Field Renderer: Renders individual character card fields from the Authoring Spine
// Each field is rendered with a dedicated prompt loaded dynamically from the active Prompt Configuration.
// Built defensively with full optional chaining and fallbacks to handle any LLM schema variation.

import type { ProviderConfig } from "../../types/provider";
import type { AuthoringSpine } from "./spine";
import { routeLLMCompletion, routeLLMJson } from "../llm/provider-router";
import { getActivePromptConfig, getEffectivePromptConfig } from "../config/prompt-config";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { getGenreFidelityDirective } from "../character/genre-helper";

/**
 * Renders the Description field from the Spine
 */
export async function renderDescriptionField(
  spine: AuthoringSpine,
  format: "prose" | "boostyle" | "wxx" | "markdown",
  provider: ProviderConfig,
  botMode: "single" | "multi_character" | "rpg_world" = "single"
): Promise<string> {
  const cfg = getEffectivePromptConfig(provider);
  const charName = spine?.name || "Character";
  const rg = spine?.reaction_gradient || { wont: "", craves: "", neutral: "", will: "", trust_gate: "" };
  const v = spine?.voice || { cadence: "", dialect_register: "", signature_lexicon: [], forbidden_words: [], quirks: [] };
  const vals = Array.isArray(spine?.values) ? spine.values : [];
  const exps = Array.isArray(spine?.experiences) ? spine.experiences : [];
  const cleanQuotes = (val: any) => {
    const s = typeof val === "string" ? val : (val != null ? String(val) : "");
    return s.replace(/(\d+)'(\d+)"/g, "$1ft $2in").replace(/"/g, "'");
  };

  let formatInstructions = "";

  if (format === "boostyle") {
    formatInstructions = `Output in rich, descriptive Boostyle Pseudocode:
[Character("${charName}")
{
  Archetype("${cleanQuotes(spine?.archetype || "")}")
  Contradiction("${cleanQuotes(spine?.central_contradiction || "")}")
  Form("${cleanQuotes(spine?.form || "")}")
  Values("${vals.map(cleanQuotes).join('; ')}")
  History("${exps.map(cleanQuotes).join('; ')}")
  Limits("${cleanQuotes(rg.wont || "")}")
  Cravings("${cleanQuotes(rg.craves || "")}")
  Neutral("${cleanQuotes(rg.neutral || "")}")
  Trust("${cleanQuotes(rg.will || "")}")
  Speech("${cleanQuotes(v.cadence || "")} | ${cleanQuotes(v.dialect_register || "")}")
}]
Ensure each tag is concrete, sensory, and actionable. Strictly avoid unescaped double quotes inside attribute strings (use single quotes or 5ft 4in). Do not use generic 1-word tags or purple prose essays.`;
  } else if (format === "wxx") {
    formatInstructions = `Output in W++ format:
[character("${charName}"){archetype("${cleanQuotes(spine?.archetype || "")}")+contradiction("${cleanQuotes(spine?.central_contradiction || "")}")+build("${cleanQuotes(spine?.form || "")}")+limits("${cleanQuotes(rg.wont || "")}")+cravings("${cleanQuotes(rg.craves || "")}")+speech("${cleanQuotes(v.cadence || "")}")}]`;
  } else if (format === "markdown") {
    formatInstructions = `Output in structured, categorized Markdown with bold section headers (### Appearance & Physical Embodiment, ### Psychological Profile & Contradiction, ### Formative Backstory, ### Behavioral Reactions & Boundaries).`;
  } else {
    // Prose format (Weaver-grade tagged bundle or evocative prose from config)
    formatInstructions = cfg.fieldRenderers?.description?.proseGuidance || "Write a deep, evocative, multi-paragraph prose persona description.";
  }

  const prompt = `You are an elite creative author rendering the DESCRIPTION field of a roleplay character card from the Authoring Spine below.

THE AUTHORING SPINE (Source of Truth):
- Name: ${charName}
- Archetype: ${spine?.archetype || "Unspecified"}
- Central Contradiction: ${spine?.central_contradiction || "Unspecified"}
- Physical Form: ${spine?.form || "Unspecified"}
- Values: ${vals.length > 0 ? vals.join("\n  ") : "None specified"}
- Formative Experiences: ${exps.length > 0 ? exps.join("\n  ") : "None specified"}
- Reaction Gradient:
  * WON'T: ${rg.wont || "None"}
  * CRAVES: ${rg.craves || "None"}
  * NEUTRAL: ${rg.neutral || "None"}
  * WILL: ${rg.will || "None"}
  * TRUST GATE: ${rg.trust_gate || "None"}
- Voice: ${v.cadence || "Standard"} | ${v.dialect_register || "Standard"} | Quirks: ${(v.quirks || []).join(", ") || "None"}

FORMAT GUIDANCE:
${formatInstructions}

${
  botMode === "multi_character"
    ? `MULTI-CHARACTER CAST FORMATTING DIRECTIVE:
Structure the description with clear cast sections:
- [CAST OVERVIEW / GROUP PREMISE]: High-level summary of the group, their shared history, headquarters/territory, and collective reputation.
- [MEMBER 1: Name & Role]: Physical appearance, distinct silhouette, demeanor, signature gear, and personal motive.
- [MEMBER 2: Name & Role]: Physical appearance, distinct silhouette, demeanor, signature gear, and personal motive.
(Detail all core members defined in the spine).
- [INTERPERSONAL DYNAMICS]: Alliances, rivalries, tensions, and unspoken loyalties between the members.
- [STANCE TOWARD {{user}}]: How the group collectively and individually perceives and handles {{user}}.\n`
    : botMode === "rpg_world"
    ? `RPG WORLD SIMULATOR FORMATTING DIRECTIVE:
Structure the description as a comprehensive world encyclopedia and setting guide:
- [WORLD SETTING & PREMISE]: Core premise, era, geography, atmosphere, and the living reality of this realm.
- [MAJOR FACTIONS & POWER PLAYERS]: Dominant factions, guilds, or syndicates, their leadership, and their cold/hot wars.
- [WORLD RULES, MAGIC & TECHNOLOGY]: Natural laws, magic system, tech tier, survival constraints, and taboos.
- [KEY LOCATIONS & HAZARDS]: Vital hubs, frontier zones, environmental threats, and dangerous anomalies.
- [SIMULATION MECHANICS]: How the GM tracks inventory, health, faction standing, or world clock (clean, unobtrusive).
- [STARTING STATE & INCITING CRISIS]: The immediate state of the world when {{user}} arrives.\n`
    : ""
}
${getGenreFidelityDirective(spine?.archetype, (spine?.tags || []).join(" "), spine?.stance_toward_user, spine?.central_contradiction)}

MANDATORY RULES:
- Use {{char}} instead of repeating their direct name constantly.
- Use {{user}} for any reference to the player.
- FORMAT ADHERENCE:
  * If format guidance specifies Tagged Bundle ([CORE], [ARC], [FORM], [TENSIONS], [INTENT], [NEGATIVE SPACE]), output the bracket-tagged sections cleanly with their labeled lines.
  * If format guidance specifies Boostyle or W++, output valid, expanded bracket pseudocode.
- EXCLUDE REACTION GRADIENT: STRICTLY NEVER output a [GRADIENT] section or literal WON'T / NEUTRAL / WILL / CRAVES / TRUST GATE bullets in the description. The reaction gradient belongs strictly in the internal authoring spine for the AI's generation context, NEVER in the final character card description.
- STRICT ANTI-PURPLE-PROSE: Actively resist predictable AI melodrama and purple-prose cliches. NEVER use phrases like "functions as a high-performance engine of...", "using [X] as a fortress to guard a heart", "a testament to...", "delicate balance", "mask of indifference", or capitalized melodramatic labels like "the Broken Promise". Ground every detail in observable, physical, and behavioral facts.
- Output ONLY the description content — no preamble, no markdown code block wrapper, no conversational meta.`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const raw = await routeLLMCompletion(provider, messages);
  let cleaned = normalizeRpMacros(raw.trim(), charName);
  // Post-sanitize: Ensure no accidental [GRADIENT] block is included in final description
  cleaned = cleaned.replace(/\n*\[GRADIENT\][\s\S]*?(?=\n\[[A-Z\s]+\]|$)/gi, "").trim();
  return cleaned;
}

/**
 * Renders the Personality field from the Spine
 */
export async function renderPersonalityField(
  spine: AuthoringSpine,
  provider: ProviderConfig,
  botMode: "single" | "multi_character" | "rpg_world" = "single"
): Promise<string> {
  const cfg = getEffectivePromptConfig(provider);
  const charName = spine?.name || "Character";
  const rg = spine?.reaction_gradient || { wont: "", craves: "", neutral: "", will: "", trust_gate: "" };
  const v = spine?.voice || { cadence: "", dialect_register: "", signature_lexicon: [], forbidden_words: [], quirks: [] };
  const triggers = Array.isArray(spine?.triggers) ? spine.triggers : [];

  const prompt = `You are an elite roleplay actor and dialogue engineer rendering the PERSONALITY & BEHAVIORAL SPEC of a character card from the Authoring Spine.

THE AUTHORING SPINE:
- Name: ${charName}
- Archetype: ${spine?.archetype || "Unspecified"}
- Central Contradiction: ${spine?.central_contradiction || "Unspecified"}
- Reaction Gradient:
  * WON'T: ${rg.wont || "None"}
  * CRAVES: ${rg.craves || "None"}
  * NEUTRAL: ${rg.neutral || "None"}
  * WILL: ${rg.will || "None"}
  * TRUST GATE: ${rg.trust_gate || "None"}
- Triggers: ${triggers.length > 0 ? triggers.join("\n  ") : "None specified"}
- Voice Cadence: ${v.cadence || "Standard"}
- Dialect / Register: ${v.dialect_register || "Standard"}
- Signature Lexicon: ${(v.signature_lexicon || []).join(", ") || "None"}
- Forbidden Words: ${(v.forbidden_words || []).join(", ") || "None"}
- Quirks & Physical Tells: ${(v.quirks || []).join(", ") || "None"}
- Stance Toward User: ${spine?.stance_toward_user || "Neutral"}

TASK GUIDANCE:
${cfg.fieldRenderers?.personality?.guidance || "Write the performative behavioral specification for the AI."}

${
  botMode === "multi_character"
    ? `MULTI-CHARACTER BEHAVIORAL SPECIFICATION:
- INDIVIDUAL VOICES & CADENCE: Clearly delineate each member's speech rhythm, dialect register, physical tells, and emotional triggers.
- INTER-CHARACTER BANTER: Establish how members talk to each other (interjections, mocking commentary, protective gestures, conflicting opinions).
- INDEPENDENT MINDS (NO MONOLITH): When {{user}} acts or speaks, members must NOT react identically. Some may approve, others mock or object.\n`
    : botMode === "rpg_world"
    ? `RPG GAME MASTER & LIVING WORLD BEHAVIORAL SPECIFICATION:
- NARRATIVE PERSONA: Impartial Game Master, vivid world architect, and objective outcome arbiter.
- ZERO PUPPETEERING: STRICTLY NEVER speak, act, choose, or feel for {{user}}. The player retains 100% agency over their character.
- REACTIVE LIVING WORLD: Environmental physics, weather, and NPC reactions respond dynamically to {{user}}'s actions. Consequences are fair, tactile, and non-linear.
- NPC VOICING: When NPCs speak, give them distinct voices, immediate desires, and bounded knowledge.
- PROMPT AT CLIMAX: Conclude reactive turns that present a choice or tension with "**What do you do?**".\n`
    : ""
}
${getGenreFidelityDirective(spine?.archetype, (spine?.tags || []).join(" "), spine?.stance_toward_user, spine?.central_contradiction)}

MANDATORY RULES:
- Use {{char}} instead of direct name where possible.
- Use {{user}} for player references.
- STRICT BAN ON RAW REACTION GRADIENT BULLETS: Do not output literal "- WON'T:" or "- CRAVES:" bullet points in the personality spec. Focus on performative behavioral rules, mannerisms, physical tells, and speech cadence.
- ANTI-ROBOTIC DIALOGUE MANDATE: STRICTLY NEVER prescribe that {{char}} speaks like an academic lecture or uses scientific/mathematical jargon for everyday life. Even if {{char}} is a genius, scholar, or divine being, their intelligence manifests through sharp perceptiveness, dry wit, and casual dismissals—NOT dictionary vomit or robotic Spock mannerisms.
- ZERO SAMPLE DIALOGUE QUOTES: Do NOT include a "Speech Examples" or "Signature Lines" section with cliché sample quotes. The personality field is a PERFORMABLE SPEC SHEET — register, rhythm, lexicon, forbidden words, physical tells. Not a collection of dialogue lines. Example dialogue belongs ONLY in mes_example (Example Messages).
- ANTI-PURPLE-PROSE: Do NOT use flowery metaphorical descriptions like "performing a dance of defense and surrender", "a strength that contradicts her fragile appearance", or "a coiled spring of resentment". State behavioral facts plainly and concretely.
- Output ONLY the personality spec — no preamble, no meta.`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const raw = await routeLLMCompletion(provider, messages);
  return normalizeRpMacros(raw.trim(), charName);
}

/**
 * Renders Scenario and First Message from the Spine
 */
export async function renderScenarioAndFirstMessage(
  spine: AuthoringSpine,
  provider: ProviderConfig,
  botMode: "single" | "multi_character" | "rpg_world" = "single",
  storyArc?: string,
  maxTokens: number = 32768
): Promise<{ scenario: string; first_mes: string }> {
  const cfg = getEffectivePromptConfig(provider);
  const charName = spine?.name || "Character";
  const sf = spine?.scene_frame || { setting: "", atmosphere: "", scene_objective: "" };
  const v = spine?.voice || { cadence: "", dialect_register: "", signature_lexicon: [], forbidden_words: [], quirks: [] };

  const prompt = `You are an elite fiction author crafting the SCENARIO and opening FIRST MESSAGE for an uncensored roleplay card from the Authoring Spine.

THE AUTHORING SPINE:
- Character: ${charName}
- Archetype: ${spine?.archetype || "Unspecified"}
- Central Contradiction: ${spine?.central_contradiction || "Unspecified"}
- Voice: ${v.cadence || "Standard"} (${v.dialect_register || "Standard"})
- Quirks: ${(v.quirks || []).join(", ") || "None"}
- Stance Toward {{user}}: ${spine?.stance_toward_user || "Neutral"}
- Scene Frame:
  * Location & Setting: ${sf.setting || "Unspecified setting"}
  * Atmosphere: ${sf.atmosphere || "Tense and charged"}
  * Scene-Objective: ${sf.scene_objective || "Evaluate {{user}}"}
${storyArc ? `\nSTORY ARC & NARRATIVE TRAJECTORY (MANDATORY - SCENARIO AND FIRST MESSAGE MUST ADHERE TO THIS):\n${storyArc}\n\nCRITICAL INSTRUCTION: The scenario and first message MUST serve as the inciting incident / entry point of THIS SPECIFIC story arc. Do NOT write a generic opening. The scene must:\n- Establish the opening stakes, tension, or catalyst that launches this arc\n- Position {{char}} and {{user}} in the correct relationship dynamic for the arc's beginning\n- Set up the central conflict or question the arc will explore\n- NEVER ignore or contradict the declared story arc\n` : ""}

REQUIREMENTS:
${
  botMode === "multi_character"
    ? `MULTI-CHARACTER SCENARIO & FIRST MESSAGE RULES:
- SCENARIO: Neutral third-person stage frame establishing where the cast is gathered, what active task or tension they are engaged in, and their immediate relationship with {{user}}.
- FIRST MESSAGE:
  * Involve multiple cast members speaking and acting in the scene.
  * Use third-person narration. Attribute spoken dialogue clearly to members (e.g. Lyra scoffed, "..." / Valen stepped forward, "...").
  * Showcase lively inter-character banter or friction between members before or as they address {{user}}.
  * Wrap ALL spoken dialogue in standard DOUBLE QUOTES ("...").
  * Strict ZERO puppeteering of {{user}}.\n`
    : botMode === "rpg_world"
    ? `RPG WORLD SCENARIO & FIRST MESSAGE RULES:
- SCENARIO: Stage frame establishing the immediate world setting, current location, active situation, and the inciting incident confronting {{user}}.
- FIRST MESSAGE:
  * Cinematic, sensory-rich Turn-0 opening describing the immediate environment (sounds, weather, lighting, physical details).
  * Introduce the immediate dilemma, encounter, or crossroads {{user}} faces upon arrival.
  * Introduce any nearby NPCs or environmental hazards.
  * Conclude the message with a bold action prompt inviting player agency:
    "**What do you do?**"
  * STRICT ZERO puppeteering of {{user}}.\n`
    : ""
}
${getGenreFidelityDirective(spine?.archetype, (spine?.tags || []).join(" "), spine?.stance_toward_user, sf.atmosphere, sf.scene_objective)}

1. SCENARIO:
   - ${cfg.fieldRenderers?.scenarioAndFirstMes?.scenarioRule || "Neutral third-person stage frame ending with Scene-objective:"}
2. FIRST MESSAGE:
   - ${cfg.fieldRenderers?.scenarioAndFirstMes?.firstMesRule || "Atmospheric opening message in character's voice and perspective."}
   - MANDATORY THIRD-PERSON LIMITED POV: Write in voiced third-person limited narration filtered through {{char}}'s sensory lens. NEVER write in first person ("I walked", "my hand"). Always use third person ("{{char}} walked", "her hand"). The narration reflects {{char}}'s perspective and voice, but is written in third person.
   - MANDATORY DOUBLE QUOTES FOR DIALOGUE: All spoken dialogue must strictly be wrapped in standard DOUBLE QUOTES (e.g. "What are you doing?"). NEVER use single quotes ('...') for spoken dialogue, as roleplay frontends (Lumiverse, SillyTavern) require double quotes for syntax highlighting.
   - STAGING DIVERSITY: Ground the scene dynamically in an active moment together (e.g. already in-media-res mid-routine, preparing food, side-by-side, sorting supplies, or physical proximity). STRICTLY BANNED SCENE CLICHÉ: Do NOT default to {{user}} walking into a room where {{char}} is waiting at a desk and saying 'You are late'.
   - PRESERVE INITIAL TENSION (NO PREMATURE SURRENDER): On Turn 0, {{char}} MUST maintain their defensive armor, bratty front, professional dignity, or haughty mask. NEVER have {{char}} break down, beg for discipline, or prematurely surrender on Turn 0 before {{user}} has acted.
   - GROUNDED PROVOCATIONS: Provocations, teasing, and bratty behavior must fit the relationship context realistically (tactile teasing, stubborn defiance, invading personal space, withholding attention) rather than cartoonish property destruction.
   - RELATIONSHIP VOCABULARY FIDELITY: Keep terms of address and internal narration faithful to the established dynamic (marriage, arranged pact, domestic authority). Do NOT inject 24/7 BDSM jargon ('my master', 'slave') into domestic romance or slice-of-life.

Output STRICT JSON:
{
  "scenario": "Framed stage setting concluding with Scene-objective: ...",
  "first_mes": "Multi-paragraph atmospheric opening message in {{char}}'s voice and perspective"
}`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const res = await routeLLMJson<{ scenario: string; first_mes: string }>(provider, messages, { maxTokens });
  return {
    scenario: normalizeRpMacros(res.scenario || "", charName),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(res.first_mes || "", charName)),
  };
}

/**
 * Renders Example Dialogues (Example Messages format) and Alternate Greetings from the Spine
 */
export async function renderExampleMsgsAndAlts(
  spine: AuthoringSpine,
  provider: ProviderConfig,
  botMode: "single" | "multi_character" | "rpg_world" = "single",
  storyArc?: string,
  minAltGreetings: number = 3,
  maxTokens: number = 32768
): Promise<{ mes_example: string; alternate_greetings: string[] }> {
  const cfg = getEffectivePromptConfig(provider);
  const charName = spine?.name || "Character";
  const rg = spine?.reaction_gradient || { wont: "", craves: "", neutral: "", will: "", trust_gate: "" };
  const v = spine?.voice || { cadence: "", dialect_register: "", signature_lexicon: [], forbidden_words: [], quirks: [] };
  const targetAltCount = Math.max(1, Math.floor(minAltGreetings || 3));

  const sampleAltPlaceholders = Array.from({ length: targetAltCount }, (_, i) => `    { "phase": "Phase/Turning Point label (e.g., Inciting Incident, First Confrontation, Midpoint Reveal, Crisis, Alternative: Betrayal)", "greeting": "Complete multi-paragraph Alternate Opening ${i + 1} as voiced scene" }`).join(",\n");

  const prompt = `You are an elite dialogue specialist rendering the EXAMPLE DIALOGUES (Example Messages) and ALTERNATE GREETINGS from the Authoring Spine.

THE AUTHORING SPINE:
- Character: ${charName}
- Archetype: ${spine?.archetype || "Unspecified"}
- Central Contradiction: ${spine?.central_contradiction || "Unspecified"}
- Reaction Gradient:
  * WON'T: ${rg.wont || "None"}
  * CRAVES: ${rg.craves || "None"}
  * NEUTRAL: ${rg.neutral || "None"}
  * WILL: ${rg.will || "None"}
- Voice: ${v.cadence || "Standard"} (${v.dialect_register || "Standard"})
- Signature Lexicon: ${(v.signature_lexicon || []).join(", ") || "None"}
- Forbidden Words: ${(v.forbidden_words || []).join(", ") || "None"}
- Quirks: ${(v.quirks || []).join(", ") || "None"}
${storyArc ? `\nSTORY ARC & NARRATIVE TRAJECTORY (MANDATORY - EVERY ALTERNATE GREETING MUST ADHERE TO THIS):\n${storyArc}\n\nCRITICAL INSTRUCTION: Each of the ${targetAltCount} alternate greetings MUST be a distinct entry point into THIS SPECIFIC story arc. Do NOT generate generic/random openings.\n\nENFORCEMENT RULES:\n1. EXPLICIT PHASE MAPPING: For EACH greeting, you MUST internally identify which specific phase/turning point/branch of the story arc it represents (e.g., "Inciting Incident", "First Confrontation", "Midpoint Reveal", "Crisis Point", "Climax", "Alternative Timeline: Betrayal", etc.).\n2. SCENE CONTEXT FIDELITY: The setting, stakes, character emotional state, and {{user}} relationship dynamic in each greeting MUST logically derive from that arc phase.\n3. NO GENERIC OPENINGS: BANNED - "sitting on edge of bed", "walking into tavern", "waking up in morning", "training in courtyard" unless the STORY ARC explicitly takes place there at that phase.\n4. CHARACTER CONSISTENCY: {{char}}'s voice, defenses, vocabulary, and stance toward {{user}} must match the arc phase's emotional stakes.\n5. NEVER IGNORE OR CONTRADICT the declared story arc.\n\nVALIDATION CHECKLIST (apply to each greeting before output):\n- [ ] Does this greeting map to a DISTINCT phase/turning point of the declared arc?\n- [ ] Does the scene setting match that arc phase's location/context?\n- [ ] Are the emotional stakes appropriate for that arc phase?\n- [ ] Is {{char}}'s behavior consistent with their arc-phase mindset?\n- [ ] Would this greeting make sense as an entry point for a player joining at that story moment?\n` : ""}
REQUIREMENTS:
${
  botMode === "multi_character"
    ? `MULTI-CHARACTER DIALOGUE & ALTERNATE GREETING RULES:
1. EXAMPLE DIALOGUES (mes_example):
   Format with <START> blocks featuring multiple characters interacting with {{user}} and each other:
   <START>
   {{user}}: "What is our next move?"
   CharacterA: "We take the high ground and wait for dark." She checks her quiver with steady hands.
   CharacterB: "And freeze while their patrols double?" He laughs dryly. "We breach now."
   Showcase contrasting speech rhythms, differing opinions, and banter between members.
2. ALTERNATE GREETINGS:
   At least ${targetAltCount} distinct opening scenarios placing the cast and {{user}} in different locations, stakes, and dynamics.\n`
    : botMode === "rpg_world"
    ? `RPG WORLD DIALOGUE & ALTERNATE GREETING RULES:
1. EXAMPLE DIALOGUES (mes_example):
   Format with <START> blocks showing Player-Action followed by GM-Reactive-Narration:
   <START>
   {{user}}: [Player statement or action]
   {{char}}: [Atmospheric GM narration of environmental reaction, NPC response, and consequences, concluding with **What do you do?**]
2. ALTERNATE GREETINGS:
   At least ${targetAltCount} distinct alternate starting points or campaign hooks in this world, each concluding with "**What do you do?**".\n`
    : ""
}
${getGenreFidelityDirective(spine?.archetype, (spine?.tags || []).join(" "), spine?.stance_toward_user, rg.craves)}

1. EXAMPLE DIALOGUES (mes_example):
   - ${cfg.fieldRenderers?.aliChatAndAlts?.aliChatRule || "Strict Example Messages convention: <START> blocks with {{user}}: and {{char}}:."}
   - ANTI-ROBOTIC MANDATE: STRICTLY NEVER make {{char}} talk like a calculator, thesaurus, or Spock caricature. FORBIDDEN in domestic dialogue: "statistical anomaly", "mathematically unsound", "altering my trajectory", "nutrient density", "inefficiency of your chaos". Smart characters speak with natural contractions, dry brevity, and grounded human cadence.
2. ALTERNATE GREETINGS (alternate_greetings):
    - ${targetAltCount > 3 ? `You MUST generate EXACTLY ${targetAltCount} alternate greetings in the array.` : (cfg.fieldRenderers?.aliChatAndAlts?.altGreetingsRule || `At least ${targetAltCount} distinct opening scenes in voiced narration tailored organically to {{char}}'s setting and dynamic.`)}
    - **LENGTH: Each greeting MUST be exactly 2 paragraphs, richly sensory, and equal in depth to a main first_mes. NOT a short blurb.** Ground the scene dynamically in an active moment together. Vary physical locations, times of day, and emotional stakes across the greetings.
    - PRESERVE INITIAL TENSION: On Turn 0, {{char}} MUST maintain their defensive armor, professional dignity, or bratty front; do not allow premature surrender or instant breakdown.

Output STRICT JSON — The "alternate_greetings" array MUST have EXACTLY ${targetAltCount} entries:
{
  "mes_example": "<START>\\n{{user}}: [Prompt 1]\\n{{char}}: [Voiced response]\\n<START>\\n{{user}}: [Prompt 2]\\n{{char}}: [Voiced response]...",
  "alternate_greetings": [
${sampleAltPlaceholders}
  ]
}`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  // If requesting more than 6 greetings, generate in sequential batches to prevent LLM context truncation or early stopping
  if (targetAltCount > 6) {
    console.log(`[renderExampleMsgsAndAlts] Large request (${targetAltCount} greetings). Generating in batches of up to 6...`);
    const initialBatchCount = Math.min(6, targetAltCount);
    const initialPlaceholders = Array.from({ length: initialBatchCount }, (_, i) => `    { "phase": "Phase/Turning Point label", "greeting": "Complete multi-paragraph Alternate Opening ${i + 1} as voiced scene" }`).join(",\n");
    const initialPrompt = prompt.replace(sampleAltPlaceholders, initialPlaceholders)
      .replace(new RegExp(`EXACTLY ${targetAltCount}`, "g"), `EXACTLY ${initialBatchCount}`)
      .replace(new RegExp(`At least ${targetAltCount}`, "g"), `At least ${initialBatchCount}`);

    const initialRes = await routeLLMJson<{ mes_example: string; alternate_greetings: Array<{ phase: string; greeting: string }> | string[] }>(
      provider,
      [{ role: "system" as const, content: cfg.systemPrompt }, { role: "user" as const, content: initialPrompt }],
      { maxTokens }
    );

    const accumulatedAlts: string[] = [];
    const rawFirst = initialRes.alternate_greetings || [];
    if (Array.isArray(rawFirst)) {
      for (const item of rawFirst) {
        if (typeof item === "string") accumulatedAlts.push(normalizeDialogueQuotes(normalizeRpMacros(item, charName)));
        else if (item && typeof item.greeting === "string") accumulatedAlts.push(normalizeDialogueQuotes(normalizeRpMacros(item.greeting, charName)));
      }
    }

    let currentStartIdx = accumulatedAlts.length + 1;
    while (accumulatedAlts.length < targetAltCount) {
      const remainingNeeded = targetAltCount - accumulatedAlts.length;
      const thisBatchSize = Math.min(6, remainingNeeded);
      console.log(`[renderExampleMsgsAndAlts] Generating batch: openings ${currentStartIdx} to ${currentStartIdx + thisBatchSize - 1} of ${targetAltCount}...`);

      const batchPlaceholders = Array.from({ length: thisBatchSize }, (_, i) => `    { "phase": "Phase/Turning Point label", "greeting": "Complete multi-paragraph Alternate Opening ${currentStartIdx + i} as voiced scene" }`).join(",\n");
      const continuationPrompt = `You are continuing the generation of ALTERNATE GREETINGS for ${charName}.
We have already created the first ${accumulatedAlts.length} greetings.

THE AUTHORING SPINE & VOICE:
- Character: ${charName}
- Archetype: ${spine?.archetype || "Unspecified"}
- Voice: ${v.cadence || "Standard"} (${v.dialect_register || "Standard"})
- Signature Lexicon: ${(v.signature_lexicon || []).join(", ") || "None"}
${storyArc ? `\nSTORY ARC:\n${storyArc}\n` : ""}

REQUIREMENTS:
- Generate the NEXT ${thisBatchSize} distinct alternate greetings (Openings ${currentStartIdx} to ${currentStartIdx + thisBatchSize - 1}).
- LENGTH: Each greeting MUST be exactly 2 paragraphs, richly sensory, voiced third-person limited narration.
- Do NOT repeat previously used scenes. Continue exploring different phases or turning points of the story arc.

Output STRICT JSON:
{
  "alternate_greetings": [
${batchPlaceholders}
  ]
}`;

      try {
        const batchRes = await routeLLMJson<{ alternate_greetings: Array<{ phase: string; greeting: string }> | string[] }>(
          provider,
          [{ role: "system" as const, content: cfg.systemPrompt }, { role: "user" as const, content: continuationPrompt }],
          { maxTokens }
        );
        const rawBatch = batchRes.alternate_greetings || [];
        let addedThisBatch = 0;
        if (Array.isArray(rawBatch)) {
          for (const item of rawBatch) {
            let text = "";
            if (typeof item === "string") text = item;
            else if (item && typeof item.greeting === "string") text = item.greeting;
            if (text && text.trim()) {
              accumulatedAlts.push(normalizeDialogueQuotes(normalizeRpMacros(text, charName)));
              addedThisBatch++;
            }
          }
        }
        if (addedThisBatch === 0) {
          console.warn("[renderExampleMsgsAndAlts] Batch returned no new greetings. Breaking loop to prevent infinite retry.");
          break;
        }
        currentStartIdx = accumulatedAlts.length + 1;
      } catch (batchErr) {
        console.error("[renderExampleMsgsAndAlts] Error generating batch of greetings:", batchErr);
        break;
      }
    }

    return {
      mes_example: normalizeDialogueQuotes(normalizeRpMacros(initialRes.mes_example || "", charName)),
      alternate_greetings: accumulatedAlts,
    };
  }

  const res = await routeLLMJson<{ mes_example: string; alternate_greetings: Array<{ phase: string; greeting: string }> | string[] }>(provider, messages, { maxTokens });
  const rawAlts = res.alternate_greetings || [];
  const normalizedAlts = Array.isArray(rawAlts)
    ? rawAlts.map((item: any) => {
        if (typeof item === "string") return normalizeDialogueQuotes(normalizeRpMacros(item, charName));
        if (item && typeof item.greeting === "string") return normalizeDialogueQuotes(normalizeRpMacros(item.greeting, charName));
        return "";
      }).filter(Boolean)
    : [];
  
  return {
    mes_example: normalizeDialogueQuotes(normalizeRpMacros(res.mes_example || "", charName)),
    alternate_greetings: normalizedAlts,
  };
}
