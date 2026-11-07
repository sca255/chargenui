import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { EnhanceOptions } from "../../types/harness";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";

export async function compressAndFormatCard(
  char: RoleplayCharacter,
  targetFormat: "prose" | "boostyle" | "wxx" | "markdown",
  targetTokenBudget: number | undefined,
  provider: ProviderConfig,
  options?: EnhanceOptions
): Promise<{
  description: string;
  personality: string;
  formatSummary: string;
}> {
  let prompt = `You are a token optimization expert and format architect for roleplay AI cards.
Convert and optimize the following character card into the requested format: "${targetFormat}".
${targetTokenBudget ? `Aim for an approximate token budget of ~${targetTokenBudget} tokens for permanent definition (description + personality).` : "Eliminate all repetitive phrasing and redundant prose while preserving 100% of sensory details, psychological triggers, and boundaries."}

FORMAT SPECIFICATIONS:
- "prose": Dense, evocative prose paragraphs where every adjective and verb does heavy lifting. No fluff.
- "boostyle": Pseudocode format:
  [Character("${char.name}")
  {
    Gender(...)
    Archetype(...)
    Appearance(...)
    Psychology(...)
    Boundaries(...)
    Speech(...)
  }]
- "wxx": W++ attribute format: [character("${char.name}"){species("...")+build("...")+personality("...")+habits("...")}]
- "markdown": Clean, hyper-dense categorized bullet points with bold headers.

CURRENT CHARACTER:
Name: ${char.name}
Description:
${char.description}

Personality:
${char.personality}`;

  if (options?.steeringInstructions?.trim()) {
    prompt += `\n\nDIRECTOR'S RETENTION & COMPRESSION PRIORITIES:\n${options.steeringInstructions.trim()}\n(Preserve these specific traits or sections with utmost priority during compression.)`;
  }

  prompt += `\n\nOutput STRICT JSON:
{
  "description": "Optimized description in ${targetFormat} format",
  "personality": "Optimized personality/behavioral block in ${targetFormat} format",
  "formatSummary": "Brief summary of changes made and estimated token efficiency gains"
}`;

  const messages = [
    { role: "system" as const, content: UNCENSORED_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  return await routeLLMJson(provider, messages);
}
