/**
 * Story Arc Generator Service.
 * Generates structured 3-phase narrative trajectories (Act 1 -> Act 2 -> Act 3)
 * tailored to {{char}} and {{user}}, compatible with any active ProviderConfig (Gemini, OpenRouter, local llama.cpp).
 */

import type { ProviderConfig, ChatMessage } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMCompletion } from "../llm/provider-router";

export interface StoryArcRequest {
  character: RoleplayCharacter;
  roughStoryHint?: string;
  minActs?: number;
  eraPromptSnippet?: string;
  mode?: "reimagine" | "redesign" | "inspire" | "spark";
  provider: ProviderConfig;
}

export interface StoryArcResponse {
  storyArc: string;
  acts: { act: number; title: string; description: string }[];
}

export async function generateStoryArc(req: StoryArcRequest): Promise<StoryArcResponse> {
  const { character, roughStoryHint, minActs = 3, eraPromptSnippet, mode = "reimagine", provider } = req;
  const targetActs = Math.max(1, minActs);
  const name = character.name || "Character";
  const desc = character.description || "";
  const personality = character.personality || "";
  const scenario = character.scenario || "";
  const firstMes = character.first_mes || "";
  const alts = Array.isArray(character.alternate_greetings) ? character.alternate_greetings : [];

  const hintBlock = roughStoryHint?.trim() ? `\nUSER STORY DIRECTION & GUIDANCE:\n${roughStoryHint.trim()}\n` : "";
  const eraBlock = eraPromptSnippet?.trim() ? `\nHISTORICAL ERA / SETTING CONTEXT:\n${eraPromptSnippet.trim()}\n` : "";

  const isSpark = mode === "spark";
  const isInspire = mode === "inspire";

  // Build greetings context depending on mode:
  // - In Reimagine / Redesign mode: exact part of the story, condensed into arcs.
  // - In Inspire mode: reference ideas and evocative motifs that inspire similar-sized arc parts without forcing exact narrative continuation.
  // - In Spark mode: new character being forged from concept/seed, no pre-existing card continuity required.
  let greetingsBlock = "";
  if (!isSpark && (firstMes.trim() || alts.length > 0)) {
    if (isInspire) {
      greetingsBlock += `\nINSPIRATIONAL REFERENCE SCENES & SEEDS (Use for thematic inspiration, emotional dynamics, and motif ideas to craft fresh, similarly weighted arc beats):\n`;
      if (firstMes.trim()) {
        greetingsBlock += `[Reference Opening Seed]:\n${firstMes.slice(0, 800)}\n`;
      }
      alts.forEach((alt, idx) => {
        greetingsBlock += `[Reference Dynamic Seed ${idx + 1}]:\n${alt.slice(0, 400)}\n`;
      });
    } else {
      greetingsBlock += `\nEXISTING CHARACTER STORY & SCENES (EXACT CONTINUITY TO CONDENSE INTO ARCS):\n`;
      if (firstMes.trim()) {
        greetingsBlock += `[Established Initial Greeting - Act 1 Baseline]:\n${firstMes.slice(0, 800)}\n`;
      }
      alts.forEach((alt, idx) => {
        greetingsBlock += `[Existing Alternate Scene ${idx + 2}]:\n${alt.slice(0, 400)}\n`;
      });
    }
  }

  const systemPrompt = isSpark
    ? `You are an elite narrative designer and creative writer designing a compelling ${targetActs}-Act story arc trajectory for a new roleplay character (${name}) and {{user}}.
Synthesize a dramatic, high-tension narrative arc with escalating stakes, emotional tension, interpersonal conflict, and meaningful progression.

STRICT OUTPUT RULES:
- Output ALL ${targetActs} acts in a SINGLE uninterrupted message. Do not stop until all ${targetActs} acts are written.
- Number them sequentially: Act 1, Act 2, Act 3 ... Act ${targetActs}.
- Use this concise format for each act (1–2 punchy sentences per act):
Act [N]: [Evocative Title]
[Brief 1–2 sentence escalation beat detailing conflict, stakes, and progression]
- Output ONLY the numbered acts. No preamble, conversational filler, or wrap-up.`
    : isInspire
    ? `You are an elite narrative designer crafting an INSPIRED story arc trajectory for ${name} and {{user}}.
Use the character's reference seeds as creative springboards: synthesize fresh, similarly sized narrative phases, surprising twists, and elevated stakes.

STRICT OUTPUT RULES:
- Output ALL ${targetActs} acts in a SINGLE uninterrupted message. Do not stop until all ${targetActs} acts are written.
- Number them sequentially: Act 1, Act 2, Act 3 ... Act ${targetActs}.
- Use this concise format for each act (1–2 punchy sentences per act):
Act [N]: [Evocative Title]
[Brief 1–2 sentence escalation beat detailing conflict, stakes, and progression]
- Output ONLY the numbered acts. No preamble, conversational filler, or wrap-up.`
    : `You are a master dramaturge and narrative architect for ${name} and {{user}}.
Condense the existing character story, first message, and alternate scenes into an exact, high-tension ${targetActs}-Act trajectory.

STRICT OUTPUT RULES:
- Output ALL ${targetActs} acts in a SINGLE uninterrupted message. Do not stop until all ${targetActs} acts are written.
- Number them sequentially: Act 1, Act 2, Act 3 ... Act ${targetActs}.
- Act 1 MUST anchor the established first message / opening encounter.
- The existing alternate scenes must be condensed and mapped into the progression of subsequent acts, advancing into climax and resolution.
- Use this concise format for each act (1–2 punchy sentences per act):
Act [N]: [Evocative Title]
[Brief 1–2 sentence escalation beat detailing conflict, stakes, and progression]
- Output ONLY the numbered acts. No preamble, conversational filler, or wrap-up.`;

  const userPrompt = `CHARACTER PROFILE:
Name: ${name}
Description: ${desc.slice(0, 600)}
Personality: ${personality.slice(0, 400)}
Current Scenario: ${scenario.slice(0, 500)}
${greetingsBlock}
${hintBlock}${eraBlock}
Generate all ${targetActs} acts of the story arc in a single output now:`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  // Scale maxTokens appropriately so all acts fit in a single response without batching overhead
  const maxTokens = Math.min(32768, Math.max(1024, targetActs * 120));

  const raw = await routeLLMCompletion(provider, messages, {
    temperature: isInspire ? 0.85 : 0.72,
    maxTokens,
  });

  const cleaned = raw.trim();
  const actMatches = [...cleaned.matchAll(/Act\s*(\d+)[:\s\-]+([^\n]+)\n+([\s\S]*?)(?=(?:Act\s*\d+|$))/gi)];

  const acts = actMatches.map(m => ({
    act: parseInt(m[1], 10),
    title: m[2].trim(),
    description: m[3].trim()
  }));

  return {
    storyArc: cleaned,
    acts
  };
}
