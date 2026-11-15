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
import { decideScore, decideChoice } from "../decision/decision-service";
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
- "options": Exactly 3 compelling, concrete response choices offering contrasting narrative choices (each 1-2 punchy sentences).
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

  let preliminaryVision = "A compelling character waiting to be forged through your choices.";
  let candidateQuestions: any[] = [];

  const raw = await routeLLMJson<any>(request.provider, messages);
  if (raw?.preliminaryVision) preliminaryVision = raw.preliminaryVision;
  if (Array.isArray(raw?.questions)) {
    candidateQuestions = raw.questions.map((q: any, idx: number) => {
      const id = q.id || `q_${Date.now()}_${idx + 1}`;
      const rawOpts = Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : ["Option A", "Option B", "Option C"];
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
    });
  }

  // --- Parallel Jev / Clef Decision Model Gate ---
  // Evaluates every candidate question AND its options simultaneously in parallel.
  // 1. Question relevance & high-leverage tension score >= 0.65.
  // 2. Options quality: checks whether at least one generated option genuinely and compellingly answers the question.
  // If options are poor, rerolls options up to 10 times.
  async function filterQuestionsWithJev(qs: any[]): Promise<any[]> {
    if (!request.decisionConfig || request.decisionConfig.provider === "disabled") {
      return qs;
    }
    const vetted: any[] = [];
    for (const q of qs) {
      try {
        // Step A: Question Relevance Check
        const scoreRes = await decideScore({
          statement: "This interview question targets a crucial, high-leverage tension or unexplored psychological contradiction specific to this concept, avoiding generic cliches.",
          text: `Concept: ${request.concept}\nCategory: ${q.category}\nQuestion: ${q.question}`,
          config: request.decisionConfig,
        });

        if (scoreRes.score < 0.65) {
          console.log(`[Weaver Jev Gate] Question [${q.category}] failed relevance score (${scoreRes.score.toFixed(2)} < 0.65). Dropping.`);
          continue;
        }

        // Step B: Options Quality & Direct Responsiveness Check
        let currentOpts = [...q.options];
        let optionsValid = false;
        let optRerolls = 0;

        while (optRerolls < 10) {
          const evalState = `Concept: "${request.concept}"\nQuestion: [${q.category}] ${q.question}\nOption 1: "${currentOpts[0] || ""}"\nOption 2: "${currentOpts[1] || ""}"\nOption 3: "${currentOpts[2] || ""}"`;
          const optChoice = await decideChoice({
            state: evalState,
            schema: {
              options_valid: ["valid_and_relevant", "evasive_or_poor"],
              recommended_pick: ["1", "2", "3", "none"],
            },
            config: request.decisionConfig,
          });

          if (optChoice.decision.options_valid === "valid_and_relevant" && optChoice.decision.recommended_pick !== "none") {
            optionsValid = true;
            const pickIdx = optChoice.decision.recommended_pick === "1" ? 0 : optChoice.decision.recommended_pick === "2" ? 1 : 2;
            q.recommendedOptionIndex = pickIdx;
            q.options = currentOpts;
            break;
          }

          optRerolls++;
          console.log(`[Weaver Jev Gate] Options for [${q.category}] were judged poor/evasive. Rerolling options (${optRerolls}/10)...`);
          const rerolled = await rerollWeaverQuestionOptions({
            concept: request.concept,
            category: q.category,
            question: q.question,
            currentOptions: currentOpts,
            genre: request.genre,
            tone: request.tone,
            nsfw: request.nsfw,
            influence: request.influence,
            provider: request.provider,
          });
          currentOpts = rerolled.options;
        }

        if (optionsValid) {
          vetted.push(q);
        } else {
          console.warn(`[Weaver Jev Gate] Dropped question [${q.category}] because even after 10 rerolls, its options were not satisfactory.`);
        }
      } catch (err) {
        console.warn("Jev question/options check warning:", err);
        vetted.push(q); // Fail-open on network glitch
      }
    }
    return vetted;
  }

  let vettedQuestions = await filterQuestionsWithJev(candidateQuestions);

  // If fewer than 2 vetted questions survive, attempt up to 3 replacement loops
  let swapAttempts = 0;
  while (vettedQuestions.length < 2 && swapAttempts < 3) {
    swapAttempts++;
    console.log(`[Weaver Jev Gate] Only ${vettedQuestions.length} vetted question(s) survived. Fetching deepening replacements (Attempt ${swapAttempts}/3)...`);
    const deepenPrompt = `You are the Weaver. The previous interview questions were too generic or insufficient.
Formulate 3 BRAND NEW, deeply probing questions specifically targeting unaddressed psychological dilemmas or core contradictions in this concept:
"""
${request.concept.trim()}
"""
Already accepted questions (DO NOT repeat):
${vettedQuestions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n")}

Output STRICT JSON matching schema:
{
  "questions": [
    {
      "id": "dimension_key",
      "category": "Concise Category",
      "question": "Concise, probing question text?",
      "options": ["Option 1", "Option 2", "Option 3"],
      "recommendedOptionIndex": 0
    }
  ]
}`;
    try {
      const moreRaw = await routeLLMJson<any>(request.provider, [
        { role: "system" as const, content: cfg.systemPrompt },
        { role: "user" as const, content: deepenPrompt },
      ]);
      if (Array.isArray(moreRaw?.questions)) {
        const newCandidates = moreRaw.questions.map((q: any, idx: number) => ({
          id: q.id || `q_repl_${Date.now()}_${swapAttempts}_${idx + 1}`,
          category: q.category || `Dimension ${vettedQuestions.length + idx + 1}`,
          question: q.question || "How does this character react?",
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options.map(String) : ["Option A", "Option B", "Option C"],
          recommendedOptionIndex: typeof q.recommendedOptionIndex === "number" ? q.recommendedOptionIndex : 0,
        }));
        const newVetted = await filterQuestionsWithJev(newCandidates);
        for (const nq of newVetted) {
          if (!vettedQuestions.some((vq) => vq.question.toLowerCase() === nq.question.toLowerCase())) {
            vettedQuestions.push(nq);
          }
        }
      }
    } catch (err) {
      console.warn("Failed deepening question fetch:", err);
      break;
    }
  }

  // Fallback: If after 3 swap loops we still have 0 questions, return the original candidate questions so user is never blocked
  if (vettedQuestions.length === 0 && candidateQuestions.length > 0) {
    vettedQuestions = candidateQuestions;
  }

  // When asking more, preserve and append to existing questions rather than discarding
  const finalQuestions = isAskingMore ? [...existingQList, ...vettedQuestions] : vettedQuestions;

  return {
    preliminaryVision,
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
 * Evaluates whether a user's answer directly answers the Weaver question using Jev/Clef.
 */
export async function evaluateWeaverAnswerRelevance(params: {
  question: string;
  category: string;
  userAnswer: string;
  options?: string[];
  decisionConfig?: any;
}): Promise<{ answersQuestion: boolean; reason?: string }> {
  if (!params.decisionConfig || params.decisionConfig.provider === "disabled") {
    return { answersQuestion: true };
  }

  console.log(`\n--- [Weaver Answer Validation] ---`);
  console.log(`Category: [${params.category}]`);
  console.log(`Question: "${params.question}"`);
  console.log(`Answer: "${params.userAnswer}"`);

  try {
    const res = await decideChoice({
      state: `Question Category: ${params.category}\nQuestion: "${params.question}"\nProposed Answer to evaluate: "${params.userAnswer}"`,
      schema: {
        answers_question: ["yes", "no_or_evasive"],
      },
      config: params.decisionConfig,
    });

    const isYes = res.decision.answers_question === "yes";
    console.log(`Result from Jev: ${res.decision.answers_question} (Pass: ${isYes})\n----------------------------------\n`);
    return {
      answersQuestion: isYes,
      reason: isYes ? undefined : "The provided answer does not directly address the question dimension.",
    };
  } catch (err) {
    console.warn("Jev answer relevance check error:", err);
    return { answersQuestion: true }; // Fail open
  }
}

/**
 * Automatically picks the best option for a Weaver question using Jev.
 * If none of the 3 options are compelling or of high quality, rerolls up to 10 times.
 * If still not good enough after 10 rerolls, flags the question to be dropped.
 */
export async function autoPickWeaverOptionWithJev(params: {
  concept: string;
  category: string;
  question: string;
  options: string[];
  genre?: string;
  tone?: string;
  nsfw?: boolean;
  influence?: string;
  provider: any;
  decisionConfig?: any;
}): Promise<{
  selectedOptionIndex: number;
  selectedOptionText: string;
  dropped: boolean;
  rerollCount: number;
  options: string[];
}> {
  let currentOptions = [...params.options];
  let rerolls = 0;
  const maxRerolls = 10;

  while (rerolls <= maxRerolls) {
    // If decision provider is disabled, return recommended/first option
    if (!params.decisionConfig || params.decisionConfig.provider === "disabled") {
      return {
        selectedOptionIndex: 0,
        selectedOptionText: currentOptions[0] || "",
        dropped: false,
        rerollCount: 0,
        options: currentOptions,
      };
    }

    try {
      const evalState = `Concept: "${params.concept}"\nQuestion: [${params.category}] ${params.question}\nOption 1: "${currentOptions[0] || ""}"\nOption 2: "${currentOptions[1] || ""}"\nOption 3: "${currentOptions[2] || ""}"`;
      const res = await decideChoice({
        state: evalState,
        schema: {
          best_option: ["1", "2", "3", "none_compelling"],
          quality_level: ["strong", "mediocre_or_cliche"],
        },
        config: params.decisionConfig,
      });

      const bestChoice = res.decision.best_option;
      const quality = res.decision.quality_level;

      if (bestChoice !== "none_compelling" && quality === "strong") {
        const idx = bestChoice === "1" ? 0 : bestChoice === "2" ? 1 : 2;
        return {
          selectedOptionIndex: idx,
          selectedOptionText: currentOptions[idx] || currentOptions[0],
          dropped: false,
          rerollCount: rerolls,
          options: currentOptions,
        };
      }
    } catch (err) {
      console.warn("Jev auto-pick evaluation error:", err);
      // Fallback to top option on error
      return {
        selectedOptionIndex: 0,
        selectedOptionText: currentOptions[0] || "",
        dropped: false,
        rerollCount: rerolls,
        options: currentOptions,
      };
    }

    rerolls++;
    if (rerolls <= maxRerolls) {
      console.log(`[Weaver Jev Auto-Pick] Options for [${params.category}] were not compelling. Rerolling (Attempt ${rerolls}/${maxRerolls})...`);
      const rerolled = await rerollWeaverQuestionOptions({
        concept: params.concept,
        category: params.category,
        question: params.question,
        currentOptions,
        genre: params.genre,
        tone: params.tone,
        nsfw: params.nsfw,
        influence: params.influence,
        provider: params.provider,
      });
      currentOptions = rerolled.options;
    }
  }

  // If exceeded 10 rerolls and still not compelling, drop question per user specification
  console.log(`[Weaver Jev Auto-Pick] Question [${params.category}] reached ${maxRerolls} rerolls without a compelling option. Dropping question.`);
  return {
    selectedOptionIndex: -1,
    selectedOptionText: "",
    dropped: true,
    rerollCount: maxRerolls,
    options: currentOptions,
  };
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
