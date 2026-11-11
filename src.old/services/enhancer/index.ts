import type {
  EnhanceCharacterRequest,
  EnhanceCharacterResponse,
  EnhanceOptions,
  CharacterDiagnostic,
} from "../../types/harness";
import type { RoleplayCharacter } from "../../types/character";
import { auditCharacterCard } from "./diagnostic";
import { deepenCharacterPersona } from "./persona-deepener";
import { polishVoiceAndAliChat } from "./voice-alichat";
import type { AuthoringSpine } from "../generator/spine";
import { regenerateGreetingsWithSpine, regenerateGreetingsWithoutSpine, punchUpGreetingsAndAlts, improveGreetings } from "./greetings-puncher";
import { compressAndFormatCard } from "./token-compressor";
import { generateCharacterLorebook } from "./lorebook-builder";
import { shiftCharacterTone } from "./tone-shifter";
import { retrieveCharacterLore } from "../search/web-search";

export async function processEnhanceRequest(
  req: EnhanceCharacterRequest
): Promise<EnhanceCharacterResponse> {
  const initialChar = { ...req.character };
  const diagnosticBefore = auditCharacterCard(initialChar);
  const changesSummary: string[] = [];

  let updatedChar: RoleplayCharacter = { ...initialChar };
  let addedAlts: string[] | undefined;
  let generatedLorebook = initialChar.character_book;

  // Clone options for augmentation
  const options: EnhanceOptions = req.options ? { ...req.options } : {};

  // 🌐 Optional Web Lore Search & Canon Retrieval for Full Overhaul and Specific Polishing
  if (options.enableWebSearch && !options.retrievedLore) {
    const query = options.searchQuery?.trim() || req.character.name;
    if (query) {
      try {
        const loreResult = await retrieveCharacterLore({
          query,
          providerType: options.searchProviderType,
          apiKey: options.searchApiKey,
          searxngUrl: options.searxngUrl,
          includeHeadcanons: options.includeHeadcanons !== false,
          provider: req.provider,
        });
        options.retrievedLore = loreResult.condensedLore;
        if (loreResult.results.length > 0) {
          changesSummary.push(
            `Retrieved canon lore & fandom research (${loreResult.results.length} sources) for "${query}".`
          );
        }
      } catch (err: any) {
        console.warn("Enhancement web search failed:", err.message);
      }
    }
  }

  switch (req.mode) {
    case "audit_only":
      return {
        character: initialChar,
        diagnosticBefore,
        diagnosticAfter: diagnosticBefore,
        changesSummary: ["Completed diagnostic card audit."],
      };

    case "deepen_persona": {
      const deepened = await deepenCharacterPersona(
        updatedChar,
        req.provider,
        options?.nsfw,
        options
      );
      updatedChar = {
        ...updatedChar,
        ...deepened,
      };
      changesSummary.push("Deepened psychological profile, sensory embodiment, and reaction gradient.");
      break;
    }

    case "polish_voice": {
      const voiceResult = await polishVoiceAndAliChat(updatedChar, req.provider, options);
      updatedChar = {
        ...updatedChar,
        mes_example: voiceResult.mes_example,
        post_history_instructions: voiceResult.post_history_instructions,
        personality: voiceResult.updated_personality || updatedChar.personality,
      };
      changesSummary.push("Crafted distinctive voice rules, purged robotic cliches, and generated multi-beat example dialogue examples.");
      break;
    }

    case "punch_first_mes":
    case "alternate_greetings": {
      const greetingsResult = await punchUpGreetingsAndAlts(
        updatedChar,
        req.provider,
        options?.altGreetingThemes,
        options
      );
      updatedChar = {
        ...updatedChar,
        scenario: greetingsResult.scenario,
        first_mes: greetingsResult.first_mes,
        alternate_greetings: greetingsResult.alternate_greetings,
      };
      addedAlts = greetingsResult.alternate_greetings;
      changesSummary.push("Revamped first message with sensory atmosphere and generated 3 alternate greetings.");
      break;
    }

    case "regenerate_with_spine": {
      const spine = (updatedChar.extensions as Record<string, any>)?.["chargenui:authoringSpine"] as AuthoringSpine | undefined;
      const creationInputs = (updatedChar.extensions as Record<string, any>)?.["chargenui:creationInputs"] as any;
      
      if (!spine) {
        throw new Error("No stored Authoring Spine found. Character was not created with CharGenUI or spine was stripped.");
      }
      
      // Use passed options (from modal) with fallback to stored creationInputs
      const storyArc = req.options?.storyArcOverride ?? creationInputs?.storyArc;
      const minAltGreetings = req.options?.minAltGreetings ?? creationInputs?.minAltGreetings ?? 3;
      console.log("[enhancer:regenerate_with_spine] minAltGreetings from request:", minAltGreetings);
      
      const greetingsResult = await regenerateGreetingsWithSpine(
        updatedChar,
        spine,
        req.provider,
        storyArc,
        minAltGreetings
      );
      
      // Only update alternate_greetings - NOT scenario, NOT first_mes
      updatedChar = {
        ...updatedChar,
        alternate_greetings: greetingsResult.alternate_greetings,
      };
      addedAlts = greetingsResult.alternate_greetings;
      changesSummary.push(`Regenerated ${greetingsResult.alternate_greetings.length} greetings using stored Authoring Spine.`);
      break;
    }

    case "regenerate_without_spine": {
      const originalPrompt = req.options?.originalPrompt;
      const storyArc = req.options?.storyArcOverride;
      const minAltGreetings = req.options?.minAltGreetings ?? 3;
      
      if (!originalPrompt) {
        throw new Error("Original prompt required for non-spine regeneration. Provide options.originalPrompt.");
      }
      
      const greetingsResult = await regenerateGreetingsWithoutSpine(
        updatedChar,
        req.provider,
        originalPrompt,
        req.options?.storyArcOverride,
        req.options?.minAltGreetings
      );
      
      updatedChar = {
        ...updatedChar,
        alternate_greetings: greetingsResult.alternate_greetings,
      };
      addedAlts = greetingsResult.alternate_greetings;
      changesSummary.push(`Regenerated ${greetingsResult.alternate_greetings.length} greetings from original prompt (no spine).`);
      break;
    }

    case "improve_greetings": {
      const storyArc = req.options?.storyArcOverride;
      const steeringInstructions = req.options?.steeringInstructions;
      const minAltGreetings = req.options?.minAltGreetings;
      
      const greetingsResult = await improveGreetings(
        updatedChar,
        req.provider,
        storyArc,
        steeringInstructions,
        req.options?.minAltGreetings
      );
      
      updatedChar = {
        ...updatedChar,
        scenario: greetingsResult.scenario,
        first_mes: greetingsResult.first_mes,
        alternate_greetings: greetingsResult.alternate_greetings,
      };
      addedAlts = greetingsResult.alternate_greetings;
      changesSummary.push(`Improved first message and ${greetingsResult.alternate_greetings.length} alternate greetings.`);
      break;
    }

    case "format_optimize": {
      const format = options?.targetFormat || "prose";
      const optimized = await compressAndFormatCard(
        updatedChar,
        format,
        options?.targetTokenBudget,
        req.provider,
        options
      );
      updatedChar = {
        ...updatedChar,
        description: optimized.description,
        personality: optimized.personality,
      };
      changesSummary.push(`Optimized card into ${format.toUpperCase()} format. ${optimized.formatSummary}`);
      break;
    }

    case "generate_lorebook": {
      const depth = options?.lorebookDepth || "detailed";
      generatedLorebook = await generateCharacterLorebook(
        updatedChar,
        depth,
        req.provider,
        options
      );
      updatedChar = {
        ...updatedChar,
        character_book: generatedLorebook,
      };
      changesSummary.push(`Generated embedded SillyTavern lorebook with ${generatedLorebook.entries.length} entries.`);
      break;
    }

    case "tone_shift": {
      const targetTone = options?.toneShift || "dark psychological";
      const shifted = await shiftCharacterTone(
        updatedChar,
        targetTone,
        req.provider,
        options?.nsfw,
        options
      );
      updatedChar = {
        ...updatedChar,
        ...shifted,
      };
      changesSummary.push(`Shifted character tone toward "${targetTone}".`);
      break;
    }

    case "full_overhaul": {
      // 1. Deepen persona with steering & retrieved lore
      const deepened = await deepenCharacterPersona(
        updatedChar,
        req.provider,
        options?.nsfw,
        options
      );
      updatedChar = {
        ...updatedChar,
        ...deepened,
      };
      changesSummary.push("Deepened psychology and central contradiction.");

      // 2. Polish voice & dialogue with steering & retrieved lore
      const voiceResult = await polishVoiceAndAliChat(updatedChar, req.provider, options);
      updatedChar = {
        ...updatedChar,
        mes_example: voiceResult.mes_example,
        post_history_instructions: voiceResult.post_history_instructions,
        personality: voiceResult.updated_personality || updatedChar.personality,
      };
      changesSummary.push("Upgraded voice rules and example dialogue examples.");

      // 3. Punch up first message & generate alternate greetings with steering & retrieved lore
      const greetingsResult = await punchUpGreetingsAndAlts(
        updatedChar,
        req.provider,
        options?.altGreetingThemes,
        options
      );
      updatedChar = {
        ...updatedChar,
        scenario: greetingsResult.scenario,
        first_mes: greetingsResult.first_mes,
        alternate_greetings: greetingsResult.alternate_greetings,
      };
      addedAlts = greetingsResult.alternate_greetings;
      changesSummary.push("Re-wrote immersive starter and added alternate greetings.");
      break;
    }
  }

  // Guarantee that system_prompt is never present in enhanced output
  if (updatedChar.system_prompt) {
    if (!updatedChar.post_history_instructions) {
      updatedChar.post_history_instructions = updatedChar.system_prompt;
    }
    updatedChar.system_prompt = "";
  }

  const diagnosticAfter = auditCharacterCard(updatedChar);

  return {
    character: updatedChar,
    diagnosticBefore,
    diagnosticAfter,
    changesSummary,
    addedAlternateGreetings: addedAlts,
    generatedLorebook,
  };
}
