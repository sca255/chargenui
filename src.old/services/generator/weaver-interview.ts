import type {
  WeaverInterviewQuestionsRequest,
  WeaverInterviewQuestionsResponse,
  WeaverForgeRequest,
} from "../../types/harness";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMJson } from "../llm/provider-router";
import { getEffectivePromptConfig } from "../config/prompt-config";
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
import { generateCharacterLorebook } from "../enhancer/lorebook-builder";

const sleep = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates dynamic, high-leverage interview questions tailored specifically to what the character concept needs.
 * Inspired by Lumiverse Weaver: questions are NOT hardcoded to 4 rigid dimensions; the AI determines how many
 * and what specific dimensions are needed to sharpen the character, and users can ask for more questions or remove unwanted ones.
 */
export async function generateWeaverInterviewQuestions(
  request: WeaverInterviewQuestionsRequest
): Promise<WeaverInterviewQuestionsResponse> {
  const cfg = getEffectivePromptConfig(request.provider);
  const themesStr = request.themes && request.themes.length > 0 ? request.themes.join(", ") : "None";

  const existingQList = Array.isArray(request.existingQuestions) ? request.existingQuestions : [];
  const isAskingMore = existingQList.length > 0;
  const existingSummary = isAskingMore
    ? `\nALREADY ASKED QUESTIONS (DO NOT repeat or rephrase these dimensions; formulate FRESH deepening questions):\n${existingQList
        .map((q, i) => `${i + 1}. [${q.category}] ${q.question}`)
        .join("\n")}\n`
    : "";

  const prompt = `You are the Weaver: an elite character dramatist, psychological profiler, and roleplay fiction architect.
The author wants to forge a character card and is conducting the interactive Weaver workshop to sharpen THEIR idea.

CONCEPT / SEED:
"""
${request.concept.trim()}
"""
${
  request.era && request.era.trim()
    ? `HISTORICAL ERA / TEMPORAL SETTING:
"""
${request.era.trim()}
"""\n`
    : ""
}
${
  request.influence && request.influence.trim()
    ? `USER STEERING DIRECTION / INFLUENCE:
"""
${request.influence.trim()}
"""
(CRITICAL MANDATE: Shape the preliminary vision, question angles, and all suggested options around this specific creative direction.)\n`
    : ""
}
GENRE / SETTING: ${request.genre || "Fiction / Roleplay"}
THEMES & TROPES: ${themesStr}
TONE: ${request.tone || "Atmospheric, nuanced"}
MATURE / NSFW: ${request.nsfw ? "Fully unrestricted" : "Standard"}
${existingSummary}
LUMIVERSE WEAVER DESIGN PHILOSOPHY:
- TOTAL AUTONOMY: There are NO mandatory, hardcoded, or default questions. Do NOT follow a rigid template or preset dimensions.
- You (the AI) decide entirely what questions need to be asked based purely on the user's concept and what is currently unpinned or unresolved.
- Ask as few or as many questions as the concept genuinely demands (e.g. 1, 2, 3, or more — NO forced number, NO arbitrary minimum or default of 4). If a concept is already detailed, only ask what is missing. If it is sparse, ask what is most vital to spark life.
- Build every question directly from THIS character's actual material. A question that could apply to any generic character is a failure.
- One thing at a time: no compound or convoluted questions. Keep questions concise, concrete, and punchy.
${
  isAskingMore
    ? "- The author has requested MORE questions. Formulate NEW, distinct deepening questions that explore unexamined corners (e.g. secret vulnerabilities, unspoken oaths, behavioral quirks, sensory triggers, social friction)."
    : ""
}

${
  request.botMode === "multi_character"
    ? `BOT MODE: MULTI-CHARACTER CAST / ENSEMBLE
Analyze the concept and decide what questions to ask to resolve interpersonal friction, shared history, or breaking points between cast members.`
    : request.botMode === "rpg_world"
    ? `BOT MODE: RPG WORLD SIMULATOR / GAME MASTER
Analyze the concept and decide what questions to ask to resolve living setting tension, factions, or environmental hazards.`
    : `BOT MODE: SINGLE CHARACTER
Analyze the concept and decide freely what dimensions to probe (contradictions, secrets, behavioral quirks, stance toward {{user}}, etc.) — choose whatever THIS character specifically needs.`
}

FOR EVERY QUESTION:
- "category": Short 2-4 word descriptor of what this question pins down (e.g. "Crucible Memory", "Friction with {{user}}", "Unspoken Oath", "Red Line").
- "question": Direct, concise question (1-2 sentences max).
- "options": Exactly 3 DISTINCT, creative, evocative candidate answers that go in genuinely different directions (each 1-2 punchy sentences).
- "recommendedOptionIndex": 0, 1, or 2 for Weaver's top intuitive pick.

Output STRICT JSON matching this schema:
{
  "preliminaryVision": "1-2 sentence compelling distillation of the character",
  "questions": [
    {
      "id": "dimension_key",
      "category": "Concise Category",
      "question": "Concise, probing question text?",
      "options": [
        "Vivid specific option 1",
        "Vivid specific option 2",
        "Vivid specific option 3"
      ],
      "recommendedOptionIndex": 0
    }
  ]
}`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const raw = await routeLLMJson<any>(request.provider, messages);
  const questions = Array.isArray(raw?.questions)
    ? raw.questions.map((q: any, idx: number) => {
        const id = q.id || `q_${Date.now()}_${idx + 1}`;
        const rawOpts = Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : ["Option A", "Option B"];
        const recIdx = typeof q.recommendedOptionIndex === "number" && q.recommendedOptionIndex >= 0 && q.recommendedOptionIndex < rawOpts.length
          ? q.recommendedOptionIndex
          : 0;
        return {
          id,
          category: q.category || `Dimension ${idx + 1}`,
          question: q.question || "How does this character react?",
          options: rawOpts,
          recommendedOptionIndex: recIdx,
        };
      })
    : [];

  // When asking more, preserve and append to existing questions rather than discarding
  const finalQuestions = isAskingMore ? [...existingQList, ...questions] : questions;

  return {
    preliminaryVision: raw?.preliminaryVision || "A compelling character waiting to be forged through your choices.",
    questions: finalQuestions,
  };
}

/**
 * Rerolls 3 fresh, distinct creative options for a specific Weaver interview question,
 * intentionally diverging from previously presented options.
 */
export async function rerollWeaverQuestionOptions(params: {
  concept: string;
  category: string;
  question: string;
  currentOptions?: string[];
  genre?: string;
  tone?: string;
  nsfw?: boolean;
  influence?: string;
  provider: any;
}): Promise<{ options: string[]; recommendedOptionIndex: number }> {
  const cfg = getEffectivePromptConfig(params.provider);
  const currentStr = params.currentOptions && params.currentOptions.length > 0
    ? params.currentOptions.map((o, i) => `${i + 1}. "${o}"`).join("\n")
    : "None";

  const prompt = `You are the Weaver: an elite character dramatist, psychological profiler, and roleplay fiction architect.
The user is conducting the WEAVER INTERACTIVE INTERVIEW WORKSHOP and clicked "Reroll Choices" for the following design question.

CHARACTER CONCEPT:
"""
${(params.concept || "").trim()}
"""
GENRE / SETTING: ${params.genre || "Fiction / Roleplay"}
TONE: ${params.tone || "Atmospheric, nuanced"}
MATURE / NSFW: ${params.nsfw ? "Fully unrestricted" : "Standard"}

QUESTION DIMENSION: ${params.category}
QUESTION:
"${params.question}"

${
  params.influence && params.influence.trim()
    ? `USER STEERING INFLUENCE / DIRECTION (MANDATORY STEERING):
"""
${params.influence.trim()}
"""
(CRITICAL MANDATE: Closely steer all 3 newly generated choices to embody and reflect this specific direction/theme, while ensuring they remain distinct from each other and avoid previous choices.)\n`
    : ""
}
PREVIOUS CHOICES TO AVOID (Provide 3 completely NEW and different creative angles):
${currentStr}

TASK:
Generate 3 BRAND NEW, evocative, concrete creative options that explore fresh dramatic angles, subverted expectations, or alternative psychological stakes for this question. Do NOT repeat or rephrase the previous choices.
Mark recommendedOptionIndex (0, 1, or 2) for your favorite new option.

Output STRICT JSON matching this schema:
{
  "options": [
    "New vivid option 1",
    "New vivid option 2",
    "New vivid option 3"
  ],
  "recommendedOptionIndex": 0
}`;

  const messages = [
    { role: "system" as const, content: cfg.systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const raw = await routeLLMJson<any>(params.provider, messages);
  const options = Array.isArray(raw?.options) && raw.options.length > 0
    ? raw.options.map(String).slice(0, 3)
    : ["Alternative design angle A", "Alternative design angle B", "Alternative design angle C"];

  const recommendedOptionIndex =
    typeof raw?.recommendedOptionIndex === "number" && raw.recommendedOptionIndex >= 0 && raw.recommendedOptionIndex < options.length
      ? raw.recommendedOptionIndex
      : 0;

  return { options, recommendedOptionIndex };
}

/**
 * Forges the character card using the user's Weaver interview answers.
 * The Authoring Spine / Character Bible is strictly internal scaffolding used by the AI
 * during synthesis and is STRIPPED from the final card (never leaked into character_book or card fields).
 */
export async function generateCharacterWithWeaverInterview(
  request: WeaverForgeRequest
): Promise<RoleplayCharacter> {
  let retrievedLore = request.retrievedLore || "";

  // Auto-search web for canon lore if enabled
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

  const allThemes = Array.isArray(request.themes) ? request.themes.filter(Boolean) : [];

  // Stage 1: Synthesize Authoring Spine incorporating all Interview Answers
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
    interviewAnswers: request.interviewAnswers,
    provider: request.provider,
  });

  const charName = spine.name || "Custom Character";

  // Stage 2: Sequential field rendering (1 single LLM call at a time with deliberate pacing)
  await sleep(200);
  const description = await renderDescriptionField(spine, request.format || "prose", request.provider, request.botMode);

  await sleep(200);
  const personality = await renderPersonalityField(spine, request.provider, request.botMode);

  await sleep(200);
  const sceneData = await renderScenarioAndFirstMessage(spine, request.provider, request.botMode, request.storyArc);

  await sleep(200);
  const dialogueData = await renderExampleMsgsAndAlts(spine, request.provider, request.botMode, request.storyArc, request.minAltGreetings);

  // Assemble pristine Character Card (Authoring Spine is strictly internal scaffolding and excluded from final card)
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
    // Lorebook / Character Book is strictly EMPTY by default. No automatic pseudo-lore or psychometric dumps.
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
        interviewAnswers: request.interviewAnswers,
        format: request.format,
      },
    },
  };

  // Optional: Build genuine SillyTavern World Info / Lorebook ONLY if explicitly opted in by the user
  if (request.includeLorebook) {
    try {
      await sleep(200);
      character.character_book = await generateCharacterLorebook(
        character,
        "compact",
        request.provider,
        {
          retrievedLore: request.retrievedLore,
          nsfw: request.nsfw,
        }
      );
    } catch (e: any) {
      console.warn("Optional lorebook generation failed:", e.message);
      character.character_book = { name: "", entries: [] };
    }
  }

  return character;
}
