import { Buffer } from "node:buffer";
import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import type { VisionScanResult } from "../../types/harness";
import { deconstructImageWithVision } from "./deconstruct";
import { synthesizeAuthoringSpineFromVisual } from "../generator/spine";
import {
  renderDescriptionField,
  renderPersonalityField,
  renderScenarioAndFirstMessage,
  renderExampleMsgsAndAlts,
} from "../generator/field-renderer";
import { characterToCardV2 } from "../character/card-parser";
import { writePngCharaCard } from "../character/png-card";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { NATURAL_SPOKEN_DIALOGUE_CONTRACT } from "../agent/agent-harness";

const sleep = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Forensically scans character art/portraits and generates a rich uncensored character card.
 * Uses a two-stage pipeline:
 * 1. Multimodal visual deconstruction -> internal psychometric Authoring Spine.
 * 2. Dedicated field renderers for maximum depth, prose quality, and RP macros.
 * The Spine is an internal scaffolding and is stripped from the final card.
 */
export async function generateCharacterFromImage(
  imageBase64Url: string,
  provider: ProviderConfig,
  promptHints?: string,
  nsfw?: boolean
): Promise<VisionScanResult> {
  // Step 1: Multimodal vision scan
  const deconstruction = await deconstructImageWithVision(imageBase64Url, provider, promptHints);
  const vp = deconstruction.visual_profile;
  const ip = deconstruction.inferred_personality;

  await sleep(200);

  // Step 2: Synthesize internal Authoring Spine from visual & psychological forensic profile
  const spine = await synthesizeAuthoringSpineFromVisual({
    visualProfile: vp,
    inferredPersonality: ip,
    promptHints,
    nsfw,
    provider,
  });

  const charName = spine.name || ip.suggested_names?.[0] || "Scanned Character";

  // Step 3: Sequential dedicated field rendering for high literary depth (1 single LLM call at a time)
  await sleep(200);
  const description = await renderDescriptionField(spine, "prose", provider);

  await sleep(200);
  const personality = await renderPersonalityField(spine, provider);

  await sleep(200);
  const sceneData = await renderScenarioAndFirstMessage(spine, provider);

  await sleep(200);
  const dialogueData = await renderExampleMsgsAndAlts(spine, provider);

  // Step 4: Assemble pristine SillyTavern V2 Character Card (NO spine in card def)
  const character: RoleplayCharacter = {
    id: "char_" + Math.random().toString(36).substring(2, 10),
    name: charName,
    avatar: imageBase64Url,
    description: normalizeRpMacros(description, charName),
    personality: normalizeRpMacros(personality, charName),
    scenario: normalizeRpMacros(sceneData.scenario, charName),
    first_mes: normalizeDialogueQuotes(normalizeRpMacros(sceneData.first_mes, charName)),
    mes_example: normalizeDialogueQuotes(normalizeRpMacros(dialogueData.mes_example, charName)),
    alternate_greetings: Array.isArray(dialogueData.alternate_greetings)
      ? dialogueData.alternate_greetings.map((g) => normalizeDialogueQuotes(normalizeRpMacros(g, charName)))
      : [],
    system_prompt: "", // Kept strictly empty by design
    post_history_instructions: (() => {
      const parts: string[] = [];
      const basePost = normalizeRpMacros(spine.post_history_instructions || spine.system_prompt || "", charName);
      if (basePost) parts.push(basePost);
      if (spine.creator_notes && spine.creator_notes.trim() && !basePost.includes(spine.creator_notes.trim())) {
        parts.push(normalizeRpMacros(spine.creator_notes.trim(), charName));
      }
      const combined = parts.join("\n\n");
      if (!combined.includes("Natural Spoken Dialogue Contract")) {
        return combined ? `${combined}\n\n${NATURAL_SPOKEN_DIALOGUE_CONTRACT}` : NATURAL_SPOKEN_DIALOGUE_CONTRACT;
      }
      return combined;
    })(),
    // Creator notes is strictly human-facing metadata for players/authors (never sent to LLM during chat)
    creator_notes: `Visual Scan Deconstruction\nArchetype: ${spine.archetype || "Original"}`,
    tags: Array.isArray(spine.tags) && spine.tags.length > 0 ? spine.tags : ["visual-scan", spine.archetype.toLowerCase()],
  };

  // Step 5: Embed character card into PNG
  let pngCardBase64: string | undefined;
  try {
    const cardV2 = characterToCardV2(character);
    // If the image is already PNG, embed directly
    if (imageBase64Url.startsWith("data:image/png;base64,")) {
      const rawB64 = imageBase64Url.replace(/^data:image\/png;base64,/, "");
      const pngBuffer = new Uint8Array(Buffer.from(rawB64, "base64"));
      const embedded = writePngCharaCard(pngBuffer, cardV2);
      pngCardBase64 = `data:image/png;base64,${Buffer.from(embedded).toString("base64")}`;
      character.avatar = pngCardBase64;
    }
  } catch (err) {
    console.warn("Could not embed card into original image:", err);
  }

  return {
    visual_profile: vp,
    inferred_personality: ip,
    character,
    pngCardBase64,
  };
}
