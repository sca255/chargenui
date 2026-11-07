import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { normalizeRpMacros } from "../character/macro-engine";

export type IncorporationTarget = "post_history" | "description" | "both";

export interface IncorporatePromptRequest {
  character: RoleplayCharacter;
  systemPromptContent: string;
  target: IncorporationTarget;
  provider: ProviderConfig;
  userGuidance?: string;
}

export interface IncorporatePromptResponse {
  character: RoleplayCharacter;
  summary: string;
  target: IncorporationTarget;
  incorporatedFields: {
    description?: string;
    post_history_instructions?: string;
  };
}

/**
 * Uses LLM to intelligently incorporate a legacy system prompt or raw directive block
 * into post_history_instructions, description, or both.
 */
export async function incorporatePromptWithLlm(
  req: IncorporatePromptRequest
): Promise<IncorporatePromptResponse> {
  const { character, systemPromptContent, target, provider, userGuidance } = req;
  const name = character.name || "Unnamed";

  if (!systemPromptContent || !systemPromptContent.trim()) {
    throw new Error("No system prompt or directive content provided to incorporate.");
  }

  const cleanContent = normalizeRpMacros(systemPromptContent.trim(), name);

  let targetInstructions = "";
  let jsonSchemaDesc = "";

  if (target === "post_history") {
    targetInstructions = `
TARGET: POST-HISTORY INSTRUCTIONS ONLY
Your objective is to incorporate and synthesize the content into the character's 'post_history_instructions'.
Guidelines:
- Extract all behavioral directives, voice rules, uncensored roleplay instructions, persona embodiment rules, formatting instructions, and anti-puppeteering boundaries.
- If existing post_history_instructions exist, merge harmoniously without contradictions or redundant repeating.
- Purge meta-chatter, robotic assistant tropes, and boilerplate AI disclaimers.
- Retain uncensored, sharp, active phrasing.
- Do NOT modify the character's description.
`;
    jsonSchemaDesc = `{
  "post_history_instructions": "Refined and merged post-history instructions block",
  "summary": "Brief 1-2 sentence explanation of what directives were incorporated"
}`;
  } else if (target === "description") {
    targetInstructions = `
TARGET: DESCRIPTION ONLY
Your objective is to incorporate and weave the content into the character's 'description'.
Guidelines:
- Extract all character facts, backstory, physical appearance, demeanor, relationships, lore, abilities, habits, and psychological nuances.
- Seamlessly integrate them into the existing character description, maintaining atmospheric depth, prose quality, and consistent formatting.
- Rephrase second-person ("You are a ...") or imperative instructions into vivid, third-person character definition.
- Do NOT touch post_history_instructions.
`;
    jsonSchemaDesc = `{
  "description": "Richly expanded character description integrating all lore and traits",
  "summary": "Brief 1-2 sentence explanation of how the lore/traits were woven into description"
}`;
  } else {
    // target === "both"
    targetInstructions = `
TARGET: BOTH (DESCRIPTION & POST-HISTORY INSTRUCTIONS)
Your objective is to intelligently bifurcate and incorporate the content into BOTH fields:
1. 'description':
   - Extract all narrative lore, physical appearance, psychological contradictions, backstory, sensory details, abilities, relationships, and world context.
   - Weave them seamlessly into the existing description.
2. 'post_history_instructions':
   - Extract all behavioral boundaries, voice cadence rules, agency enforcement, roleplay format requirements, uncensored directives, and anti-puppeteering constraints.
   - Merge harmoniously with existing post_history_instructions.
- Ensure ZERO redundant overlap between description and post_history_instructions. Everything goes into its optimal architectural location.
`;
    jsonSchemaDesc = `{
  "description": "Richly expanded character description integrating lore, appearance, and background",
  "post_history_instructions": "Refined and sharp roleplay directives, voice rules, and agency boundaries",
  "summary": "Brief 1-2 sentence explanation of how content was split and incorporated between description and post-history"
}`;
  }

  const systemMessage = `${UNCENSORED_SYSTEM_PROMPT}
You are an expert Character Card Architect specializing in SillyTavern and CCv3 specifications.
Your task is to take a legacy or raw system prompt / directive block and intelligently incorporate it into the character's card according to the specified TARGET.
Strict Rule: Cards must NEVER keep a system_prompt. All directives and traits must be properly placed into 'description', 'post_history_instructions', or 'both'.
Always return clean, valid JSON matching the exact schema requested.`;

  const userPrompt = `CHARACTER PROFILE:
Name: ${name}
Current Description:
${character.description || "(Empty)"}

Current Personality:
${character.personality || "(Empty)"}

Current Post-History Instructions:
${character.post_history_instructions || "(Empty)"}

${userGuidance ? `USER GUIDANCE / PREFERENCES:\n${userGuidance}\n` : ""}
RAW DIRECTIVE / SYSTEM PROMPT CONTENT TO INCORPORATE:
"""
${cleanContent}
"""

${targetInstructions}

Return ONLY a JSON object with this structure:
${jsonSchemaDesc}`;

  const res = await routeLLMJson<any>(provider, [
    { role: "system", content: systemMessage },
    { role: "user", content: userPrompt },
  ]);

  const updatedChar: RoleplayCharacter = {
    ...character,
    system_prompt: "", // STRICTLY BANNED: Always kept empty
  };

  const incorporatedFields: { description?: string; post_history_instructions?: string } = {};

  if (target === "post_history" || target === "both") {
    if (res.post_history_instructions) {
      updatedChar.post_history_instructions = normalizeRpMacros(res.post_history_instructions, name);
      incorporatedFields.post_history_instructions = updatedChar.post_history_instructions;
    }
  }

  if (target === "description" || target === "both") {
    if (res.description) {
      updatedChar.description = normalizeRpMacros(res.description, name);
      incorporatedFields.description = updatedChar.description;
    }
  }

  return {
    character: updatedChar,
    summary: res.summary || `Successfully incorporated content into ${target.replace("_", "-")}.`,
    target,
    incorporatedFields,
  };
}
