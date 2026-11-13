import type { ProviderConfig, ChatMessage } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { AgentModifyResponse } from "./agent-harness";
import type { AuthoringSpine } from "../generator/spine";
import { routeLLMJson } from "../llm/provider-router";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { getEffectivePromptConfig } from "../config/prompt-config";
import { renderExampleMsgsAndAlts } from "../generator/field-renderer";

export type ReimagineMode = "redesign" | "inspire";

export interface ReimagineRequest {
  character: RoleplayCharacter;
  mode: ReimagineMode;
  prompt?: string;
  eraPromptSnippet?: string;
  storyArc?: string;
  format?: "prose" | "boostyle" | "wxx" | "markdown" | "bbcode";
  themes?: string[];
  genre?: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  provider: ProviderConfig;
}

export async function executeReimagine(req: ReimagineRequest): Promise<AgentModifyResponse & { mode: ReimagineMode }> {
  const { character, mode, prompt = "", eraPromptSnippet, storyArc, format = "bbcode", themes, genre, provider } = req;
  const cfg = getEffectivePromptConfig(provider);
  const isRedesign = mode === "redesign";
  const charName = character.name || "Character";
  const nickname = character.nickname || charName;

  const userDirection = prompt.trim();
  const eraBlock = eraPromptSnippet?.trim() ? `\nERA / HISTORICAL SETTING CONSTRAINT:\n${eraPromptSnippet.trim()}\n` : "";
  const themesBlock = themes && themes.length > 0 ? `\nTHEMES & TROPES: ${themes.join(", ")}\n` : "";
  const genreBlock = genre?.trim() ? `\nTARGET GENRE / WORLD: ${genre.trim()}\n` : "";

  // Format Guidance (BBCode, Boostyle, W++, Markdown, Prose/Tagged Bundle)
  let formatGuidance = "";
  if (format === "bbcode") {
    formatGuidance = `
FORMAT REQUIREMENT (BBCode):
Format the "description" using clean, structured BBCode tags:
[b]Core Essence:[/b] ...
[b]Physical Embodiment & Attire:[/b] ...
[b]Psychological Drivers & Contradictions:[/b] ...
[b]Formative Backstory:[/b] ...
[b]Boundaries & Limits:[/b] ...
Ensure clean category tags with [b]...[/b] and bulleted lists [*] where appropriate. Avoid flat, unstructured paragraphs.`;
  } else if (format === "boostyle") {
    formatGuidance = `
FORMAT REQUIREMENT (Boostyle Pseudocode):
Format the "description" in Boostyle pseudocode:
[Character("${charName}")
{
  Archetype("...")
  Contradiction("...")
  Form("...")
  Values("...")
  History("...")
  Limits("...")
  Speech("...")
}]`;
  } else if (format === "wxx") {
    formatGuidance = `
FORMAT REQUIREMENT (W++):
Format the "description" in W++ pseudocode:
[character("${charName}"){archetype("...")+contradiction("...")+build("...")+limits("...")+cravings("...")+speech("...")}]`;
  } else if (format === "markdown") {
    formatGuidance = `
FORMAT REQUIREMENT (Structured Markdown):
Format the "description" using structured markdown with bold section headers (### Appearance & Physical Embodiment, ### Psychological Profile & Contradiction, ### Formative Backstory, ### Behavioral Boundaries).`;
  } else {
    // Configured prose / tagged bundle guidance from active prompt profile
    formatGuidance = cfg.fieldRenderers?.description?.taggedBundleGuidance || cfg.fieldRenderers?.description?.proseGuidance || `
FORMAT REQUIREMENT (Weaver Tagged Bundle):
Format the "description" using bracket tagged bundle sections: [CORE], [ARC], [FORM], [TENSIONS], [INTENT], [NEGATIVE SPACE].`;
  }

  // Parse story arc into acts to ensure we map each act to alternate greetings
  const arcText = (storyArc || "").trim();
  const arcActs = [...arcText.matchAll(/Act\s*(\d+)[:\s\-]+([^\n]+)\n*([\s\S]*?)(?=(?:Act\s*\d+|$))/gi)];
  const targetAltCount = Math.max(3, arcActs.length > 1 ? arcActs.length - 1 : (character.alternate_greetings?.length || 3));

  let storyArcDirective = "";
  if (arcText) {
    if (isRedesign) {
      storyArcDirective = `
MANDATORY STORY ARC INTEGRATION (EXACT CONTINUITY & CONDENSATION):
${arcText}

CRITICAL RULES FOR SCENARIO & FIRST MESSAGE:
1. SCENARIO & FIRST MESSAGE (first_mes) MUST specifically represent ACT 1 (the initial entry point, inciting incident, and baseline tension of the Story Arc).
2. Establish the exact initial dynamic and opening stakes between {{char}} and {{user}}.`;
    } else {
      storyArcDirective = `
MANDATORY STORY ARC INTEGRATION (INSPIRED / RECONCEPTUALIZED DIRECTION):
${arcText}

CRITICAL RULES FOR SCENARIO & FIRST MESSAGE:
1. SCENARIO & FIRST MESSAGE (first_mes) MUST anchor the inciting dynamic / initial catalyst inspired by Act 1 of the Story Arc.
2. Establish a fresh, captivating initial meeting dynamic between {{char}} and {{user}}.`;
    }
  }

  // Inject configured profile instructions (from prompts.default.json, prompts.local.json, etc.)
  const baseSystemPrompt = cfg.systemPrompt || "You are an elite roleplay character architect and creative fiction engineer operating at the highest psychometric standard.";

  const systemPrompt = `${baseSystemPrompt}

YOUR CURRENT OPERATION: DIRECT COMPREHENSIVE ${isRedesign ? "REDESIGN" : "INSPIRED REIMAGINATION"}
Active Profile: "${cfg.name || "Default"}"

${isRedesign
  ? `REDESIGN OBJECTIVE:
- Preserve the character's core identity, emotional DNA, and voice.
- Enhance psychological contradictions, visceral subtext, and grounded tension.
- Eliminate purple-prose cliches, robotic formulas, and sterile pacing.
- If a Story Arc is provided, strictly condense and align the card (Scenario & First Message = Act 1).`
  : `INSPIRE OBJECTIVE:
- Create a fresh, inspired alternate interpretation of the character.
- Keep the emotional core or intriguing premise, but inject novel hooks, fresh setting pressures, elevated stakes, and distinct scene dynamics.
- If a Story Arc is provided, translate those beats into vibrant scene possibilities (Scenario & First Message = Act 1).`
}

${formatGuidance}

VOICE & PERSONALITY GUIDELINES (from Active Profile):
${cfg.fieldRenderers?.personality?.guidance || "Write a performative voice specification: cadence, dialect/register, lexicon, forbidden words, and physical tells."}

SCENARIO & GREETING GUIDELINES (from Active Profile):
${cfg.fieldRenderers?.scenarioAndFirstMes?.firstMesRule || "Sensory-rich Turn-0 opening in voiced third-person limited following {{char}}'s lens. Never narrate {{user}}'s actions or thoughts."}

CRITICAL OUTPUT CONSTRAINTS:
- Output STRICT JSON matching the schema below.
- Do NOT output markdown code fences around the JSON or conversational chatter.
- "system_prompt" MUST be empty string (""). Any AI steering belongs in "post_history_instructions".
- Use {{char}} and {{user}} for standard roleplay macros.`;

  const userPrompt = `ORIGINAL CHARACTER:
Name: ${character.name}
Nickname: ${character.nickname || ""}
Description:
${character.description || ""}

Personality:
${character.personality || ""}

Scenario:
${character.scenario || ""}

First Message:
${character.first_mes || ""}

Example Dialogues:
${character.mes_example || ""}

Post History Instructions:
${character.post_history_instructions || ""}

Creator Notes:
${character.creator_notes || ""}

${userDirection ? `USER CREATIVE DIRECTION:\n${userDirection}\n` : ""}${eraBlock}${themesBlock}${genreBlock}${storyArcDirective}

OUTPUT STRICT JSON WITH THIS SCHEMA:
{
  "name": "${charName}",
  "nickname": "${nickname}",
  "description": "...",
  "personality": "...",
  "scenario": "...",
  "first_mes": "...",
  "mes_example": "...",
  "post_history_instructions": "...",
  "creator_notes": "...",
  "tags": ["tag1", "tag2"],
  "summary_of_changes": "Brief 1-2 sentence explanation of the reimagined direction and format."
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const rawJson = await routeLLMJson<any>(provider, messages, {
    temperature: isRedesign ? 0.72 : 0.85,
    maxTokens: 8192,
  });

  const finalName = rawJson.name?.trim() || charName;
  const finalNickname = rawJson.nickname?.trim() || character.nickname || finalName;

  // Render Alternate Greetings DIRECTLY via dedicated chunked/batched pipeline
  console.log(`[executeReimagine] Generating ${targetAltCount} alternate greetings directly via batched renderExampleMsgsAndAlts...`);
  let normalizedAlts: string[] = [];
  try {
    const existingSpine = (character.extensions as any)?.["chargenui:authoringSpine"] as AuthoringSpine | undefined;
    const spineForAlts: AuthoringSpine = existingSpine || {
      name: finalName,
      tags: Array.isArray(rawJson.tags) ? rawJson.tags : (character.tags || []),
      archetype: character.archetype || "Character",
      central_contradiction: character.central_contradiction || "Duty vs Desire",
      values: [],
      experiences: [],
      reaction_gradient: {
        wont: "",
        craves: "",
        neutral: "",
        will: "",
        trust_gate: ""
      },
      triggers: [],
      form: rawJson.description || character.description || "",
      voice: {
        cadence: "Standard spoken cadence with natural contractions",
        dialect_register: "Standard",
        signature_lexicon: [],
        forbidden_words: [],
        quirks: []
      },
      stance_toward_user: "Guarded initial stance with underlying tension",
      intents: {
        super_objective: "Pursue active personal goals",
        obstacle: "Internal defenses and external pressures",
        strategy: "Evaluate and challenge {{user}}"
      },
      scene_frame: {
        setting: rawJson.scenario || character.scenario || "",
        atmosphere: "Tense and dynamic",
        scene_objective: "Establish presence and test boundaries"
      }
    };

    const dedicatedAltsRes = await renderExampleMsgsAndAlts(
      spineForAlts,
      provider,
      "single",
      arcText || storyArc,
      targetAltCount,
      32768
    );

    if (dedicatedAltsRes.alternate_greetings && dedicatedAltsRes.alternate_greetings.length > 0) {
      normalizedAlts = dedicatedAltsRes.alternate_greetings.map((g) =>
        normalizeDialogueQuotes(normalizeRpMacros(g, finalName, finalNickname))
      );
    }
  } catch (altErr) {
    console.warn("[executeReimagine] Error during chunked alternate greetings generation:", altErr);
    // If dedicated generation fails, keep existing alternate greetings
    normalizedAlts = character.alternate_greetings || [];
  }

  const updatedCharacter: RoleplayCharacter = {
    ...character,
    name: finalName,
    nickname: finalNickname,
    description: normalizeRpMacros(rawJson.description || character.description || "", finalName, finalNickname),
    personality: normalizeRpMacros(rawJson.personality || character.personality || "", finalName, finalNickname),
    scenario: normalizeRpMacros(rawJson.scenario || character.scenario || "", finalName, finalNickname),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(rawJson.first_mes || character.first_mes || "", finalName, finalNickname)),
    mes_example: normalizeDialogueQuotes(normalizeRpMacros(rawJson.mes_example || character.mes_example || "", finalName, finalNickname)),
    alternate_greetings: normalizedAlts.length > 0 ? normalizedAlts : (character.alternate_greetings || []),
    system_prompt: "", // Strictly banned
    post_history_instructions: normalizeRpMacros(rawJson.post_history_instructions || character.post_history_instructions || "", finalName, finalNickname),
    creator_notes: rawJson.creator_notes || character.creator_notes || "",
    tags: Array.isArray(rawJson.tags) && rawJson.tags.length > 0 ? rawJson.tags : (character.tags || []),
  };

  const agentMessage = rawJson.summary_of_changes ||
    (isRedesign
      ? `Redesigned '${finalName}' in [${format.toUpperCase()}] format with cohesive arc progression and ${updatedCharacter.alternate_greetings?.length || 0} alternate greetings.`
      : `Generated inspired take on '${finalName}' in [${format.toUpperCase()}] format with fresh hooks and ${updatedCharacter.alternate_greetings?.length || 0} alternate greetings.`);

  return {
    character: updatedCharacter,
    agentMessage,
    mode,
    suggestedFixes: [],
  };
}
