import type { GenerateCharacterRequest } from "../../types/harness";
import type { RoleplayCharacter } from "../../types/character";
import { retrieveCharacterLore } from "../search/web-search";
import { synthesizeAuthoringSpine } from "./spine";
import {
  renderDescriptionField,
  renderPersonalityField,
  renderScenarioAndFirstMessage,
  renderExampleMsgsAndAlts,
} from "./field-renderer";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import {
  NATURAL_SPOKEN_DIALOGUE_CONTRACT,
  MULTI_CHARACTER_GOVERNANCE_CONTRACT,
  RPG_WORLD_GM_CONTRACT,
} from "../agent/agent-harness";

const sleep = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Two-stage uncensored character card generator:
 * Stage 1: Synthesizes an internal Authoring Spine (psychometrics, contradiction, reaction gradient, voice).
 * Stage 2: Sequential dedicated field rendering (1 single LLM call at a time with pacing delays to prevent queue saturation).
 * The Spine is strictly internal scaffolding to control the LLM and is stripped from the final card.
 */
export async function generateCharacterCard(
  request: GenerateCharacterRequest
): Promise<RoleplayCharacter> {
  let retrievedLore = request.retrievedLore || "";

  // Auto-search web for canon lore / fandom research & fan headcanons if enabled
  if (request.enableWebSearch && !retrievedLore) {
    const query = request.searchQuery || request.concept;
    try {
      const loreResult = await retrieveCharacterLore({
        query,
        includeHeadcanons: true,
        provider: request.provider,
      });
      retrievedLore = loreResult.condensedLore;
    } catch (err: any) {
      console.warn("Auto web search failed:", err.message);
    }
  }

  // Stage 1: Synthesize Authoring Spine (Internal psychometric scaffolding)
  const allThemes = Array.isArray(request.themes) ? request.themes.filter(Boolean) : [];
  const spine = await synthesizeAuthoringSpine({
    concept: request.concept,
    genre: request.genre,
    themes: allThemes,
    tone: request.tone,
    nsfw: request.nsfw,
    intensity: request.intensity,
    era: request.era,
    retrievedLore,
    steeringInstructions: request.steeringInstructions,
    botMode: request.botMode,
    provider: request.provider,
  });

  const charName = spine.name || "Custom Character";

  // Stage 2: Sequential dedicated field rendering from the Spine (1 single LLM call at a time)
  // Deliberate pacing delay prevents queuing all requests at once on local LLM servers
  await sleep(200);
  const description = await renderDescriptionField(spine, request.format || "prose", request.provider, request.botMode);

  await sleep(200);
  const personality = await renderPersonalityField(spine, request.provider, request.botMode);

  await sleep(200);
  const sceneData = await renderScenarioAndFirstMessage(spine, request.provider, request.botMode, request.storyArc);

  await sleep(200);
  const dialogueData = await renderExampleMsgsAndAlts(spine, request.provider, request.botMode, request.storyArc, request.minAltGreetings);

  // Assemble pristine SillyTavern V2 Character Card (NO spine in final card)
  const character: RoleplayCharacter = {
    id: "char_" + Math.random().toString(36).substring(2, 10),
    name: charName,
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
      // If spine had roleplay steering in creator_notes, migrate it to post_history_instructions where the AI actually reads it
      if (spine.creator_notes && spine.creator_notes.trim() && !basePost.includes(spine.creator_notes.trim())) {
        parts.push(normalizeRpMacros(spine.creator_notes.trim(), charName));
      }
      const combined = parts.join("\n\n");
      const modeContract = request.botMode === "multi_character"
        ? MULTI_CHARACTER_GOVERNANCE_CONTRACT
        : request.botMode === "rpg_world"
        ? RPG_WORLD_GM_CONTRACT
        : NATURAL_SPOKEN_DIALOGUE_CONTRACT;
      if (!combined.includes("Contract")) {
        return combined ? `${combined}\n\n${modeContract}` : modeContract;
      }
      return combined;
    })(),
    // Creator notes is strictly human-facing metadata for players/authors (never sent to LLM during chat)
    creator_notes: request.concept ? `Concept: ${request.concept}\nArchetype: ${spine.archetype || "Original"}` : "",
    tags: Array.from(new Set([...(Array.isArray(spine.tags) ? spine.tags : []), ...allThemes])),
    character_book: { name: "", entries: [] },
    // Store Authoring Spine + original inputs internally for regeneration (not exported to SillyTavern)
    extensions: {
      "chargenui:authoringSpine": spine,
      "chargenui:creationInputs": {
        concept: request.concept,
        genre: request.genre,
        themes: allThemes,
        tone: request.tone,
        nsfw: request.nsfw,
        intensity: request.intensity,
        era: request.era,
        retrievedLore: request.retrievedLore,
        steeringInstructions: request.steeringInstructions,
        botMode: request.botMode,
        storyArc: request.storyArc,
        minAltGreetings: request.minAltGreetings,
        format: request.format,
      },
    },
  };

  return character;
}
