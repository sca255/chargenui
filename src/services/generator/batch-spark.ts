import type { BatchGenerationRequest, BatchGenerationResult } from "../../types/harness";
import { generateCharacterCard } from "./quick-spark";
import { callProviderWithJsonRepair } from "../llm/provider-router";

const sleep = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

interface VariationBlueprint {
  title: string;
  divergencePitch: string;
  steeredConcept: string;
  tone: string;
}

/**
 * Generates an ensemble batch of divergent character card variants from a single core archetype or seed.
 */
export async function generateCharacterBatch(
  request: BatchGenerationRequest
): Promise<BatchGenerationResult> {
  const count = Math.min(Math.max(request.count || 3, 2), 5);
  const variationAxis = request.variationAxis || "archetype";

  const systemPrompt = `You are a master character brainstormer and worldbuilding ensemble director.
Given a character concept, you must plan ${count} DIVERGENT and DISTINCT character variations along the axis of: [${variationAxis.toUpperCase()}].

Each variation must offer a unique angle, subverted expectation, distinct psychological contradiction, and differing stance.
Output strictly JSON matching this schema:
{
  "variations": [
    {
      "title": "Short punchy variant label (e.g. 'The Cynical Veteran')",
      "divergencePitch": "1-2 sentences explaining how this variant differs and what tension it explores",
      "steeredConcept": "Detailed prompt describing this specific variant's angle, traits, and background",
      "tone": "Suggested tone"
    }
  ]
}`;

  const userPrompt = `CORE CONCEPT:
${request.concept}

Genre: ${request.genre || "Unspecified"}
Themes: ${(request.themes || []).join(", ") || "None"}
Requested Count: ${count}
Variation Axis: ${variationAxis}`;

  let blueprints: VariationBlueprint[] = [];
  try {
    const res = await callProviderWithJsonRepair<{ variations: VariationBlueprint[] }>({
      provider: request.provider,
      systemPrompt,
      userPrompt,
      temperature: 0.85,
    });
    blueprints = res.data.variations || [];
  } catch (err: any) {
    console.warn("[BatchGeneration] Failed to get variation blueprints, creating manual variants:", err.message);
    for (let i = 0; i < count; i++) {
      blueprints.push({
        title: `Variant ${i + 1}`,
        divergencePitch: `Divergent iteration ${i + 1} with alternative tone.`,
        steeredConcept: `${request.concept} (Alternative take #${i + 1})`,
        tone: request.tone || "balanced",
      });
    }
  }

  // Cap at requested count
  blueprints = blueprints.slice(0, count);

  const results: BatchGenerationResult["variants"] = [];

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    await sleep(250); // Pacing delay to avoid queue exhaustion

    const variantRequest = {
      ...request,
      concept: bp.steeredConcept || request.concept,
      tone: bp.tone || request.tone,
      steeringInstructions: `Variant Directive (${bp.title}): ${bp.divergencePitch}`,
    };

    try {
      const card = await generateCharacterCard(variantRequest);
      results.push({
        variantIndex: i + 1,
        variationTitle: bp.title,
        divergencePitch: bp.divergencePitch,
        character: card,
      });
    } catch (err: any) {
      console.error(`[BatchGeneration] Error generating variant ${i + 1}:`, err);
    }
  }

  return { variants: results };
}
