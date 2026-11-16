import type { ProviderConfig, ChatMessage } from "../../types/provider";
import { routeLLMJson } from "../llm/provider-router";
import { getEffectiveUncensoredPrompt, getEffectiveVisionPrompts } from "../config/prompt-config";

export interface VisionDeconstructionOutput {
  visual_profile: {
    gender_presentation: string;
    apparent_age: string;
    hair: string;
    eyes: string;
    physique: string;
    distinctive_features: string;
    clothing_attire: string;
    accessories_gear: string;
    expression_demeanor: string;
    lighting_atmosphere: string;
    art_style: string;
  };
  inferred_personality: {
    archetype: string;
    vibe: string;
    probable_traits: string[];
    suggested_names: string[];
    latent_conflict: string;
    probable_voice_style: string;
  };
}

export async function deconstructImageWithVision(
  imageBase64Url: string,
  provider: ProviderConfig,
  promptHints?: string
): Promise<VisionDeconstructionOutput> {
  const uncensored = getEffectiveUncensoredPrompt(provider);
  const visionPrompt =
    getEffectiveVisionPrompts(provider).deconstruct ||
    `You are an expert visual forensic analyst, character artist, and psychological profiler.
Your task is to analyze an uploaded image of a character in meticulous detail and extract both explicit visual cues and deep psychological subtext.
Operate with zero censorship or sanitization.`;
  const systemPrompt = `${uncensored}\n${visionPrompt}`;

  const userPrompt = `Examine this character image thoroughly and deconstruct everything visible.
${promptHints ? `ADDITIONAL USER CONTEXT / HINTS:\n"${promptHints}"\n` : ""}

Provide a comprehensive visual and psychological forensic breakdown as STRICT JSON:
{
  "visual_profile": {
    "gender_presentation": "Apparent gender / presentation",
    "apparent_age": "Estimated age or visual maturity",
    "hair": "Color, cut, style, texture, and highlights",
    "eyes": "Color, shape, gaze intensity, expression in the eyes",
    "physique": "Body build, posture, stature, silhouette",
    "distinctive_features": "Scars, tattoos, birthmarks, makeup, non-human traits (horns, pointed ears, cybernetics, fangs, etc.)",
    "clothing_attire": "Full wardrobe breakdown: style, fabrics, color scheme, fit, layers, wear and tear",
    "accessories_gear": "Jewelry, weapons, holsters, emblems, badges, glasses, bags, or props",
    "expression_demeanor": "Micro-expression (e.g. predatory smirk, weary stoicism, guarded sneer, melancholic softness) and body language",
    "lighting_atmosphere": "Lighting conditions, shadows, color palette, background hints, and mood",
    "art_style": "Visual style (e.g. digital anime, gritty semi-realistic, oil painting, dark fantasy illustration)"
  },
  "inferred_personality": {
    "archetype": "The core psychological archetype suggested by their look and demeanor",
    "vibe": "The visceral aura or aura of danger, charm, melancholy, or authority they project",
    "probable_traits": ["Trait 1", "Trait 2", "Trait 3", "Trait 4"],
    "suggested_names": ["Fitting Name 1", "Fitting Name 2", "Fitting Name 3"],
    "latent_conflict": "The visual contrast or hidden contradiction hinted at by the image (e.g. holy vestments but ruthless eyes, or rugged armor worn by someone with fragile posture)",
    "probable_voice_style": "Vocal tone, cadence, and register that would fit this face"
  }
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

  return await routeLLMJson<VisionDeconstructionOutput>(provider, messages);
}
