import type { CharacterBook, CharacterBookEntry, RoleplayCharacter } from "../../types/character";
import type {
  GenerateCompanionFromLorebookRequest,
  GenerateCompanionResponse,
  LorebookSummary,
} from "../../types/harness";
import { safeParseJson } from "../llm/json-repair";
import { synthesizeAuthoringSpine } from "../generator/spine";
import {
  renderDescriptionField,
  renderPersonalityField,
  renderScenarioAndFirstMessage,
  renderExampleMsgsAndAlts,
} from "../generator/field-renderer";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { LOREBOOK_COMPANION_CONTRACT } from "../agent/agent-harness";
import { sanitizeCharacterBook } from "../character/card-parser";

const sleep = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parses any incoming lorebook representation (CharacterBook object, JSON string, or raw world notes/markdown)
 * into a standardized, clean SillyTavern CharacterBook structure.
 */
export function parseLorebookInput(
  input: CharacterBook | string,
  defaultName = "World Lorebook"
): CharacterBook {
  if (typeof input === "object" && input !== null && Array.isArray((input as any).entries)) {
    return sanitizeCharacterBook(input) || { name: defaultName, entries: [] };
  }

  const text = typeof input === "string" ? input.trim() : "";
  if (!text) {
    return { name: defaultName, entries: [] };
  }

  // Attempt 1: Parse as JSON
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = safeParseJson<any>(text);
      if (parsed) {
        // Direct CharacterBook format: { name, entries: [...] }
        if (Array.isArray(parsed.entries)) {
          return sanitizeCharacterBook({
            name: parsed.name || defaultName,
            description: parsed.description || "Embedded World Lorebook",
            scan_depth: parsed.scan_depth ?? 5,
            token_budget: parsed.token_budget ?? 1024,
            recursive_scanning: parsed.recursive_scanning ?? false,
            entries: parsed.entries.map((e: any, idx: number) => ({
              id: e.id ?? idx + 1,
              comment: String(e.comment || `Lore Entry ${idx + 1}`),
              keys: Array.isArray(e.keys) ? e.keys.map(String) : [String(e.comment || `entry_${idx + 1}`)],
              secondary_keys: Array.isArray(e.secondary_keys) ? e.secondary_keys.map(String) : [],
              content: String(e.content || ""),
              position: e.position || "before_char",
              enabled: e.enabled !== false,
            })),
          }) || { name: defaultName, entries: [] };
        }

        // Array format: [ { keys, content, comment }, ... ]
        if (Array.isArray(parsed)) {
          return {
            name: defaultName,
            entries: parsed.map((e: any, idx: number) => ({
              id: idx + 1,
              comment: String(e.comment || `Lore Entry ${idx + 1}`),
              keys: Array.isArray(e.keys) ? e.keys.map(String) : [String(e.comment || `entry_${idx + 1}`)],
              content: String(e.content || ""),
              position: "before_char",
              enabled: true,
            })),
          };
        }

        // SillyTavern character card export containing character_book
        if (parsed.data?.character_book?.entries) {
          return sanitizeCharacterBook(parsed.data.character_book) || { name: defaultName, entries: [] };
        }
      }
    } catch {
      // Not JSON; fall through to raw text parser
    }
  }

  // Attempt 2: Parse raw worldbuilding text / markdown notes into structured CharacterBook entries
  const entries: CharacterBookEntry[] = [];
  const rawSections = text
    .split(/(?:\r?\n){2,}|(?=^#{1,3}\s+)/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  rawSections.forEach((section, idx) => {
    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    let title = lines[0].replace(/^#{1,4}\s*/, "").replace(/^[-*•]\s*/, "").trim();
    if (title.length > 60) title = title.substring(0, 55) + "...";

    const content = lines.slice(1).join("\n").trim() || lines[0];

    // Generate keys from title words
    const derivedKeys = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);

    if (!derivedKeys.includes(title.toLowerCase())) {
      derivedKeys.unshift(title.toLowerCase());
    }

    entries.push({
      id: idx + 1,
      comment: title,
      keys: derivedKeys,
      content,
      position: "before_char",
      enabled: true,
    });
  });

  return {
    name: defaultName,
    description: `Parsed world lorebook containing ${entries.length} entries`,
    scan_depth: 5,
    token_budget: 1024,
    entries,
  };
}

/**
 * Summarizes the lorebook entities (factions, locations, key terms) to prime character generation
 * and inform the UI.
 */
export function summarizeLorebook(book: CharacterBook): LorebookSummary {
  const entries = Array.isArray(book.entries) ? book.entries : [];
  const allKeys = new Set<string>();
  const factions: string[] = [];
  const locations: string[] = [];
  let totalWords = 0;

  const factionKeywords = /(guild|order|clan|faction|syndicate|empire|house|dynasty|church|cult|legion|circle|conclave|court|cabal)/i;
  const locationKeywords = /(city|citadel|ruin|fortress|palace|forest|mountain|realm|spire|valley|district|temple|haven|gate|sanctuary|dungeon|harbor)/i;

  entries.forEach((e) => {
    (e.keys || []).forEach((k) => allKeys.add(k.trim().toLowerCase()));
    const title = e.comment || "";
    const text = `${title} ${e.content || ""}`;
    totalWords += text.split(/\s+/).length;

    if (factionKeywords.test(title)) factions.push(title);
    if (locationKeywords.test(title)) locations.push(title);
  });

  const approxTokens = Math.round(totalWords * 1.3);
  const keyTerms = Array.from(allKeys).slice(0, 35);

  const sampleTitles = entries.slice(0, 8).map((e) => e.comment || "Entry").join(", ");
  const summaryText = `Lorebook "${book.name || "World Info"}" contains ${entries.length} entries (~${approxTokens} tokens). Notable entities: ${sampleTitles || "General world elements"}.`;

  return {
    name: book.name || "World Lorebook",
    description: book.description || "",
    entryCount: entries.length,
    totalTokensApprox: approxTokens,
    keyTerms,
    factions: Array.from(new Set(factions)).slice(0, 10),
    locations: Array.from(new Set(locations)).slice(0, 10),
    summaryText,
  };
}

/**
 * Forges an authentic living Companion Character designed specifically to accompany, guide,
 * and navigate {{user}} through a SillyTavern Lorebook.
 */
export async function generateLorebookCompanion(
  request: GenerateCompanionFromLorebookRequest
): Promise<GenerateCompanionResponse> {
  const book = parseLorebookInput(request.lorebook, request.lorebookName || "World Lorebook");
  const summary = summarizeLorebook(book);

  if (book.entries.length === 0) {
    throw new Error("The provided lorebook contains no valid entries or text to build a companion from!");
  }

  // Digest lorebook entries for LLM authoring spine prompt
  const loreDigest = book.entries
    .slice(0, 20)
    .map((e, idx) => {
      const keys = (e.keys || []).join(", ");
      const body = (e.content || "").substring(0, 250).replace(/\n/g, " ");
      return `[Entry ${idx + 1}: ${e.comment || "Untitled"}] Keys: (${keys})\nLore: ${body}`;
    })
    .join("\n\n");

  const roleDescriptions: Record<string, string> = {
    guide: "Native Guide & Wayfarer: Expert in local terrain, hazardous shortcuts, safe campsites, and regional superstitions.",
    scholar: "Lorekeeper & Arcane Archivist: Fluent in dead dialects, forgotten ruins, ciphered relics, and occult faction histories.",
    bodyguard: "Mercenary Escort & Veteran Blade: Seasoned combatant with deep street-level contacts, faction bounties, and survival grit.",
    defector: "Faction Renegade & Deserter: Former insider with intimate knowledge of the ruling power's secret protocols, hunted by former comrades.",
    scoundrel: "Underworld Smuggler & Fixer: Knows every black market, checkpoint bribe, counterfeit pass, and back-alley fence in the realm.",
    bound_familiar: "Bound Spirit & Relic Familiar: Metaphysical entity tethered to {{user}}, viewing the world through timeless ancient awareness.",
    rival: "Reluctant Ally & Frenemy: Forced into partnership with {{user}} by necessity; cynical, sharp-tongued, yet indispensable.",
    custom: request.customRole || "Specialized companion with unique ties to this realm.",
  };

  const userRelationDescriptions: Record<string, string> = {
    stranger: "{{user}} is a complete outsider / newcomer who knows nothing of this world and relies on the companion for survival and navigation.",
    amnesiac: "{{user}} woke up in this world with no memory, bearing a mysterious relic or symbol recognized by the companion.",
    heir: "{{user}} is the hidden or disinherited heir to a fallen faction, and the companion was sworn to guide or protect them.",
    contractor: "{{user}} hired, summoned, or commissioned the companion for an urgent expedition across this world.",
    fugitive: "{{user}} and the companion are both marked outlaws fleeing the dominant faction mentioned in the lorebook.",
    custom: request.customRelation || "{{user}} and the companion share an intertwined destiny in this world.",
  };

  const chosenRole = request.companionRole || "guide";
  const chosenRelation = request.userRelation || "stranger";
  const roleText = roleDescriptions[chosenRole] || roleDescriptions.guide;
  const relationText = userRelationDescriptions[chosenRelation] || userRelationDescriptions.stranger;

  // Synthesize concept prompt for the Authoring Spine
  const companionConceptPrompt = `FORGE A LOREBOOK COMPANION CHARACTER:
World / Setting: "${summary.name}"
Companion Role: ${roleText}
Relationship to {{user}}: ${relationText}
${request.companionGender && request.companionGender !== "any" ? `Gender Presentation: ${request.companionGender}\n` : ""}${request.companionName ? `Requested Name: ${request.companionName}\n` : ""}Tone / Atmosphere: ${request.tone || "Grounded, tactical, atmospheric with authentic conversational banter"}

LOREBOOK ENTITIES & CANON WORLD KNOWLEDGE (SOURCE OF TRUTH):
"""
${loreDigest}
"""

AUTHORING DIRECTIVES:
1. Ground the companion deeply in this world's culture, factions, and landmarks from the lorebook.
2. The companion's central contradiction must spring directly from a faction feud, a tragic past contract, or a taboo relic mentioned in the lorebook.
3. Their signature gear, physical appearance, and clothing must reflect the materials, factions, and environment of this world.
4. Voice & Idiolect: Infuse local slang, colloquial warnings, and opinions regarding the factions from the lorebook.
5. Stance Toward {{user}}: Must authentically reflect "${chosenRelation}" without premature subservience or instant surrender.`;

  // Stage 1: Synthesize internal Authoring Spine
  const spine = await synthesizeAuthoringSpine({
    concept: companionConceptPrompt,
    genre: `World Companion / ${request.tone || "Atmospheric Fiction"}`,
    themes: ["Companion", "Lorebook-Integrated", chosenRole, chosenRelation],
    tone: request.tone || "Atmospheric, grounded, conversational",
    nsfw: request.nsfw,
    era: request.era,
    steeringInstructions: request.steeringInstructions,
    botMode: "single",
    provider: request.provider,
  });

  const charName = request.companionName || spine.name || "Companion";

  // Stage 2: Sequential field rendering (1 single LLM call at a time with deliberate pacing)
  await sleep(200);
  const description = await renderDescriptionField(spine, request.format || "prose", request.provider, "single");

  await sleep(200);
  const personality = await renderPersonalityField(spine, request.provider, "single");

  await sleep(200);
  const sceneData = await renderScenarioAndFirstMessage(spine, request.provider, "single");

  await sleep(200);
  const dialogueData = await renderExampleMsgsAndAlts(spine, request.provider, "single");

  // Stage 3: Assemble Character Card with Embedded Lorebook
  const character: RoleplayCharacter = {
    id: "char_companion_" + Math.random().toString(36).substring(2, 10),
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
      if (!combined.includes("Lorebook Companion Roleplay Contract")) {
        return combined ? `${combined}\n\n${LOREBOOK_COMPANION_CONTRACT}` : LOREBOOK_COMPANION_CONTRACT;
      }
      return combined;
    })(),
    creator_notes: `Lorebook Companion: Forged to accompany {{user}} through "${summary.name}".\nRole: ${chosenRole}\nRelation to {{user}}: ${chosenRelation}\nEmbedded Lorebook Entries: ${book.entries.length}`,
    tags: Array.from(
      new Set([
        "Companion",
        "Lorebook-Integrated",
        chosenRole,
        chosenRelation,
        ...(Array.isArray(spine.tags) ? spine.tags : []),
      ])
    ),
    // CRITICAL: Embed the sanitized world lorebook directly into the character card!
    character_book: book,
  };

  const companionSummary = `Forged "${charName}" as a ${chosenRole} companion for "${summary.name}" with ${book.entries.length} embedded lorebook entries.`;

  return {
    character,
    summary: companionSummary,
    lorebookSummary: summary,
  };
}
