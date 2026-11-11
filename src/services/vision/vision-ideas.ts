import type { ProviderConfig, ChatMessage } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import { deconstructImageWithVision } from "./deconstruct";

export interface VisionIdea {
  title: string;
  premise: string;
  tropeSubversion: string;
  centralConflict: string;
  suggestedGenre: string;
  suggestedTone: string;
  characterPrompt: string; // The ready-to-use prompt optimized for Spark or Weaver
}

export interface GenerateVisionIdeasResponse {
  visualSummary: string;
  ideas: VisionIdea[];
}

/**
 * Analyzes an image and generates 3-4 creative, distinct roleplay character concepts,
 * subverting tropes and producing rich prompts ready for Quick-Spark or Weaver Interview.
 */
export async function generateVisionIdeas(
  imageBase64Url: string,
  provider: ProviderConfig,
  userHints?: string
): Promise<GenerateVisionIdeasResponse> {
  // Step 1: Deconstruct image
  const deconstruction = await deconstructImageWithVision(imageBase64Url, provider, userHints);
  const vp = deconstruction.visual_profile;
  const ip = deconstruction.inferred_personality;

  const visualSummary = `${vp.apparent_age || ""} ${vp.gender_presentation || ""}, ${vp.hair || ""}, ${vp.eyes || ""}. Wardrobe: ${vp.clothing_attire || ""}. Demeanor: ${vp.expression_demeanor || ""}. Suggested Archetype: ${ip.archetype || ""}.`;

  const systemPrompt = `${UNCENSORED_SYSTEM_PROMPT}
You are a visionary character architect, creative writing director, and master of narrative tropes.
Your mission is to look beyond surface-level visual traits and generate 3 to 4 DIVERGENT, DEEPLY COMPELLING character concepts inspired by the visual evidence.

For each idea:
1. Ground it in visible details from the image (accessories, posture, scars, clothing, expression).
2. SUBVERT expected clichés (e.g. if dressed as a holy paladin, avoid standard righteous champion; explore a defrocked inquisitor carrying heretic contraband, or a devout soul whose faith demands horrific sacrifices).
3. Formulate an actionable, vivid "characterPrompt" (3-5 sentences) that an author can drop directly into an uncensored roleplay card generator.`;

  const userPrompt = `FORENSIC VISUAL EVIDENCE:
- Appearance: ${vp.apparent_age || ""} ${vp.gender_presentation || ""}, ${vp.hair || ""}, ${vp.eyes || ""}, ${vp.physique || ""}
- Distinctive Features: ${vp.distinctive_features || "None noted"}
- Wardrobe & Gear: ${vp.clothing_attire || ""}, ${vp.accessories_gear || ""}
- Demeanor & Expression: ${vp.expression_demeanor || ""}
- Inferred Archetype & Aura: ${ip.archetype || ""} (${ip.vibe || ""})
- Latent Contradiction: ${ip.latent_conflict || ""}
${userHints ? `\nUSER HINTS & PREFERENCES:\n"${userHints}"\n` : ""}

Brainstorm 3-4 distinct character directions as STRICT JSON:
{
  "ideas": [
    {
      "title": "Evocative Concept Title (e.g. The Oathbreaker's Tithe)",
      "premise": "1-2 sentence core premise explaining who they are and why they are unforgettable",
      "tropeSubversion": "How this concept twists or subverts the generic archetype",
      "centralConflict": "The internal contradiction or interpersonal friction that makes roleplay with them gripping",
      "suggestedGenre": "e.g. Dark Fantasy / Cyberpunk / Gothic Noir",
      "suggestedTone": "e.g. Morally gray, bitter stoicism with repressed loyalty",
      "characterPrompt": "A comprehensive 3-5 sentence character concept prompt ready for the character forge."
    }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: imageBase64Url } },
      ],
    },
  ];

  const result = await routeLLMJson<{ ideas: VisionIdea[] }>(provider, messages);
  return {
    visualSummary,
    ideas: Array.isArray(result.ideas) ? result.ideas : [],
  };
}
