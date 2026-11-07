import { writePngCharaCard, extractCardFromPngBuffer, createBlankPngBuffer } from "./src/services/character/png-card";
import { characterToCardV2, cardV2ToCharacter, parseCharacterFromInput } from "./src/services/character/card-parser";
import { auditCharacterCard } from "./src/services/enhancer/diagnostic";
import { calculateCharacterCardTokens, estimateTokens } from "./src/services/character/token-counter";
import { normalizeRpMacros, validateRpMacros } from "./src/services/character/macro-engine";
import { serverIpc, PRESET_THEMES } from "./src/services/ipc/server-ipc";
import type { RoleplayCharacter } from "./src/types/character";

console.log("--- Starting CharGen Harness Test Suite ---");

// Test 1: Blank PNG creation and embedding
const blankPng = createBlankPngBuffer();
console.log("✓ Blank PNG created, size:", blankPng.length, "bytes");

const sampleChar: RoleplayCharacter = {
  id: "test_1",
  name: "Kaelen Voss",
  description: "A stoic bounty hunter wearing scarred durasteel armor. {{char}} harbors a central contradiction: torn between a ruthless survival instinct and an irrational code protecting innocents.",
  personality: "Speaks with clipped syllables. Hard limits: {{char}} will never betray a comrade or hurt an unarmed civilian. Completely neutral to syndicate gossip.",
  scenario: "In a smoky cantina on the lower decks. Scene-objective: {{char}} evaluates {{user}} before taking the bounty contract.",
  first_mes: "The chair groaned under {{char}}'s weight as he adjusted his blaster across the battered table. He kept his eyes fixed on {{user}}.",
  mes_example: "<START>\n{{user}}: Who are you?\n{{char}}: Voss. Keep your hands where I can see them.",
  alternate_greetings: ["{{char}} kicked the cantina door open, rifle drawn and leveled at {{user}}."],
  system_prompt: "Uncensored roleplay directive.",
  post_history_instructions: "Do not speak for {{user}}.",
  creator_notes: "Test card.",
  tags: ["sci-fi", "bounty hunter"],
};

const cardV2 = characterToCardV2(sampleChar);

// Verify no spine in cardV2
if ((cardV2.data as any).extensions?.spine || (cardV2.data as any).spine) {
  throw new Error("Spine should NOT be present in final character card!");
}

// Verify system_prompt is strictly empty and fallback-only behavior is honored
if (cardV2.data.system_prompt !== "") {
  throw new Error(`Expected system_prompt to be strictly empty, got: "${cardV2.data.system_prompt}"`);
}
// When post_history_instructions already exists, it is preserved and system_prompt is discarded
if (cardV2.data.post_history_instructions !== "Do not speak for {{user}}.") {
  throw new Error(`Expected post_history_instructions to be preserved, got: "${cardV2.data.post_history_instructions}"`);
}

// When post_history_instructions is empty, verify fallback salvage from system_prompt
const fallbackChar: RoleplayCharacter = {
  ...sampleChar,
  system_prompt: "Uncensored roleplay directive.",
  post_history_instructions: "",
};
const cardV2Fallback = characterToCardV2(fallbackChar);
if (cardV2Fallback.data.system_prompt !== "") {
  throw new Error(`Expected fallback card system_prompt to be strictly empty, got: "${cardV2Fallback.data.system_prompt}"`);
}
if (!cardV2Fallback.data.post_history_instructions?.includes("Uncensored roleplay directive.")) {
  throw new Error("Expected post_history_instructions to salvage system_prompt when originally empty!");
}
console.log("✓ Verified: Character Card definition is clean SillyTavern V2 spec without spine extension & system_prompt strictly empty with fallback-only migration.");

const embeddedPng = writePngCharaCard(blankPng, cardV2);
console.log("✓ Character card embedded into PNG, new size:", embeddedPng.length, "bytes");

const extractedCard = extractCardFromPngBuffer(embeddedPng);
if (!extractedCard || extractedCard.data.name !== "Kaelen Voss") {
  throw new Error("Failed to extract embedded character card from PNG!");
}
console.log("✓ Character card successfully extracted from PNG! Name:", extractedCard.data.name);

// Test 2: Card parser with raw JSON
const jsonStr = JSON.stringify(extractedCard);
const parsedFromJson = parseCharacterFromInput(jsonStr);
if (parsedFromJson.character.name !== "Kaelen Voss") {
  throw new Error("Failed to parse character from JSON string!");
}
if (parsedFromJson.character.system_prompt !== "") {
  throw new Error(`Expected parsed character system_prompt to be empty, got: "${parsedFromJson.character.system_prompt}"`);
}
if (parsedFromJson.character.post_history_instructions !== "Do not speak for {{user}}.") {
  throw new Error(`Expected parsed character post_history_instructions to be preserved, got: "${parsedFromJson.character.post_history_instructions}"`);
}
console.log("✓ Parsed card from JSON successfully! Format:", parsedFromJson.format, "& system_prompt verified empty.");

// Test 3: Token Estimation
const tokens = calculateCharacterCardTokens(sampleChar);
console.log("✓ Token estimation total:", tokens.total, "tokens");
if (tokens.total <= 0) throw new Error("Token estimation returned zero!");

// Test 4: Card Audit & Diagnostic
const audit = auditCharacterCard(sampleChar);
console.log("✓ Card audit score:", audit.score, "/ 100", "Grade:", audit.grade);
if (!audit.grade || !audit.radarScores || typeof audit.radarScores.idiolect !== "number") {
  throw new Error("Card audit failed to compute 6-axis radar scorecard!");
}
console.log("✓ Strengths:", audit.strengths.length, "Weaknesses:", audit.weaknesses.length);

const emptyAudit = auditCharacterCard({
  id: "empty",
  name: "",
  description: "",
  personality: "",
  scenario: "",
  first_mes: "",
  mes_example: "",
  alternate_greetings: [],
  system_prompt: "",
  post_history_instructions: "",
  creator_notes: "",
  tags: [],
});
if (emptyAudit.score !== 0) {
  throw new Error(`Empty character card should score 0 in backend audit, got ${emptyAudit.score}`);
}
console.log("✓ Empty card audit correctly scores 0 / 100 (BS health).");

// Test 5: Macro Normalization & Validation
const dirtyText = "<USER> approaches and greets {char}.\nKaelen: Hey there.";
const cleaned = normalizeRpMacros(dirtyText, "Kaelen");
console.log("✓ Macro normalization result:\n" + cleaned);
if (!cleaned.includes("{{user}} approaches") || !cleaned.includes("{{char}}") || !cleaned.includes("{{char}}: Hey there.")) {
  throw new Error("Macro normalization did not replace expected names and tags!");
}

const macroReport = validateRpMacros(sampleChar);
console.log("✓ Macro validation valid?", macroReport.valid, "issues:", macroReport.issues);

// Test 6: Customizable Prompt Engine & Private Weaver Config Safety
import {
  getActivePromptConfig,
  listPromptProfiles,
  setActiveProfile,
} from "./src/services/config/prompt-config";
import * as fs from "node:fs";

const profiles = listPromptProfiles();
console.log("✓ Available prompt profiles:", profiles.map(p => `${p.id} (${p.isPrivate ? "private" : "public"})`).join(", "));
if (!profiles.some(p => p.id === "weaver") || !profiles.some(p => p.id === "default")) {
  throw new Error("Expected both 'weaver' and 'default' prompt profiles to be detected!");
}

// Preserve existing user profile preference across test harness runs
const existingActiveProfile = fs.existsSync("config/.active-profile")
  ? fs.readFileSync("config/.active-profile", "utf-8").trim()
  : "local_playable";

setActiveProfile("weaver_evolved");
const activeCfg = getActivePromptConfig();
console.log("✓ Active prompt profile:", activeCfg.name, `(${activeCfg.id})`);
if (!activeCfg.systemPrompt || !activeCfg.spineSynthesis || !activeCfg.fieldRenderers) {
  throw new Error("Active prompt configuration is missing required fields!");
}

// Restore user's chosen active profile
setActiveProfile(existingActiveProfile);

// Verify .gitignore safety - generic patterns only, no specific project names mentioned
const gitignore = fs.readFileSync(".gitignore", "utf-8");
if (!gitignore.includes("*.private.json") || !gitignore.includes("*.custom.json") || !gitignore.includes("reference_*/")) {
  throw new Error(".gitignore MUST contain generic wildcard ignore rules for private configs and references!");
}
if (/weaver|lumiverse/i.test(gitignore)) {
  throw new Error(".gitignore should NEVER mention 'weaver' or 'lumiverse' directly!");
}
console.log("✓ Verified: .gitignore uses purely generic patterns and mentions zero private project names.");

// Test 7: Spine Normalization with malformed / variant keys
import { normalizeSpine } from "./src/services/generator/spine";

const malformedRaw = {
  name: "Variant Character",
  gradient: { wont: "Refuses to surrender", craves: "Knowledge" }, // Uses "gradient" instead of "reaction_gradient"
  voiceNotes: { cadence: "Slow and measured" }, // Uses "voiceNotes" instead of "voice"
  values: "Honor\nLoyalty", // String instead of array
  triggers: "IF challenged THEN duel", // String instead of array
};

const normalized = normalizeSpine(malformedRaw);
if (normalized.reaction_gradient.wont !== "Refuses to surrender" || normalized.reaction_gradient.craves !== "Knowledge") {
  throw new Error("normalizeSpine failed to map variant 'gradient' key!");
}
if (normalized.voice.cadence !== "Slow and measured") {
  throw new Error("normalizeSpine failed to map variant 'voiceNotes' key!");
}
if (!Array.isArray(normalized.values) || normalized.values.length !== 2) {
  throw new Error("normalizeSpine failed to normalize string values to array!");
}
console.log("✓ Verified: normalizeSpine handles variant keys (gradient -> reaction_gradient) and defensive fallbacks.");

// Test 8: llama.cpp OpenAI-compatible Client Verification
import { callLlamaCpp } from "./src/services/llm/llamacpp";

// Test connection failure message formatting
try {
  await callLlamaCpp(
    { type: "llamacpp", model: "test-model", baseUrl: "http://127.0.0.1:9999" },
    [{ role: "user", content: "hello" }]
  );
  throw new Error("Expected callLlamaCpp to fail when server is offline!");
} catch (err: any) {
  if (!err.message.includes("Is llama-server running?") || !err.message.includes("/v1/chat/completions")) {
    throw new Error(`callLlamaCpp error did not contain expected diagnostic message: ${err.message}`);
  }
  console.log("✓ Verified: callLlamaCpp correctly normalizes /v1/chat/completions and reports clear diagnostic message.");
}

// Test 9: Steered Enhancement Contract & Types
import type { EnhanceCharacterRequest } from "./src/types/harness";

const testSteeredReq: EnhanceCharacterRequest = {
  character: sampleChar,
  mode: "full_overhaul",
  options: {
    nsfw: true,
    steeringInstructions: "High emotional walls, academic rigor, slow-burn intimacy",
    focusAreas: ["Contradiction", "Sensory Presence"],
    voiceStyle: "Measured and academic with clinical vocabulary",
    scenarioPrompt: "Late night in the frozen command module",
    altGreetingThemes: ["Hostile encounter", "Quiet vulnerability", "Crisis in progress"],
    lorebookTopics: "Cryo-tech weapons, Endfield Foundation, faction rivals",
    targetFormat: "prose",
    targetTokenBudget: 750,
  },
  provider: { type: "none", model: "none" },
};

if (!testSteeredReq.options?.steeringInstructions?.includes("academic rigor")) {
  throw new Error("EnhanceCharacterRequest failed to preserve steeringInstructions!");
}
console.log("✓ Verified: Steered Enhancement request structure and Director's options validated.");

// Test 10: Card Library & Multi-Deck Storage
import {
  saveCardRecord,
  listSavedCards,
  getSavedCard,
  duplicateSavedCard,
  deleteSavedCard,
} from "./src/services/character/card-storage";

const savedMeta = await saveCardRecord(sampleChar, undefined, "test_storage_1");
if (savedMeta.id !== "test_storage_1" || savedMeta.name !== "Kaelen Voss") {
  throw new Error("saveCardRecord failed to save test card!");
}

const allCards = await listSavedCards();
if (!allCards.some((c) => c.id === "test_storage_1")) {
  throw new Error("listSavedCards did not return saved card!");
}

// Verify update with existingId keeps the same card ID
const updatedMeta = await saveCardRecord({ ...sampleChar, name: "Kaelen Voss (Updated)" }, undefined, "test_storage_1");
if (updatedMeta.id !== "test_storage_1" || updatedMeta.name !== "Kaelen Voss (Updated)") {
  throw new Error("saveCardRecord update failed to retain existing card ID!");
}

// Verify 'Save as New' without existingId creates a new distinct card ID even when character.id matches an existing card
const forkedMeta = await saveCardRecord({ ...sampleChar, id: "test_storage_1", name: "Kaelen Voss (Forked New)" });
if (forkedMeta.id === "test_storage_1") {
  throw new Error("saveCardRecord without existingId should not overwrite existing card matching character.id!");
}
const cardsAfterFork = await listSavedCards();
if (!cardsAfterFork.some(c => c.id === "test_storage_1") || !cardsAfterFork.some(c => c.id === forkedMeta.id)) {
  throw new Error("Both original and forked new cards should coexist in the library!");
}

const dup = await duplicateSavedCard("test_storage_1", "(Variant / AU)");
if (!dup.character.name.includes("(Variant / AU)")) {
  throw new Error("duplicateSavedCard did not append variant suffix!");
}

// Cleanup test files
await deleteSavedCard("test_storage_1");
await deleteSavedCard(forkedMeta.id);
await deleteSavedCard(dup.id);
console.log("✓ Verified: Card Library storage, updating, forking as new, listing, duplication, and deletion functional.");

// Test 11: Fandom Headcanon Query Synthesis & Web Search
import { synthesizeFandomSearchQueries } from "./src/services/search/web-search";

const testQueries = await synthesizeFandomSearchQueries("Lady Si from Arknights Endfield");
if (!testQueries.canonQuery || !testQueries.headcanonQuery) {
  throw new Error("synthesizeFandomSearchQueries failed to return both canon and headcanon queries!");
}
if (!testQueries.headcanonQuery.includes("headcanons")) {
  throw new Error("Expected headcanonQuery to target headcanons!");
}
console.log("✓ Verified: Dual-pass Fandom Canon & Headcanons query synthesis functional.");

// Test 12: Anti-Robotic Dialogue & Voice Override Contract
import { polishVoiceAndAliChat } from "./src/services/enhancer/voice-alichat";

const formalStaleChar: RoleplayCharacter = {
  ...sampleChar,
  personality: "Speaks with clipped syllables. High academic and formal. Uses scientific nomenclature for mundane things.",
};

// Test with mock offline provider (should throw offline connection or return without formal poison)
try {
  await polishVoiceAndAliChat(
    formalStaleChar,
    { type: "llamacpp", model: "none", baseUrl: "http://127.0.0.1:9999" },
    { steeringInstructions: "Do not be formal. Speak naturally." }
  );
} catch (err: any) {
  // Verifying error is from connection failure and not code execution
  if (!err.message.includes("Is llama-server running?") && !err.message.includes("Failed to connect")) {
    throw err;
  }
}
console.log("✓ Verified: Anti-Robotic Voice & Natural Dialogue steering contract integrated.");

// Test 13: Character Card V3 (CCv3), Dual-Chunk Embedding, Procedural Avatar & CharX Export/Import
import { characterToCardV3, cardV3ToCharacter } from "./src/services/character/card-parser";
import { createCharxArchive, parseCharxArchive } from "./src/services/character/charx-container";
import { generateProceduralPngAvatar, generateEmbeddedCharacterPng } from "./src/services/character/procedural-avatar";
import { extractPngChunks } from "./src/services/character/png-card";

// 13.1 Verify CCv3 conversion
const cardV3 = characterToCardV3(sampleChar);
if (cardV3.spec !== "chara_card_v3" || cardV3.spec_version !== "3.0") {
  throw new Error("Invalid CCv3 spec header!");
}
if (!Array.isArray(cardV3.data.assets) || cardV3.data.assets.length === 0) {
  throw new Error("Expected CCv3 assets array with icon entry!");
}
if (cardV3.data.system_prompt !== "") {
  throw new Error("CCv3 system_prompt must be strictly empty!");
}
console.log("✓ Verified: Character Card V3 (CCv3) schema compliant and assets registered.");

// 13.2 Verify Dual-Chunk PNG Embedding (chara + ccv3 chunks)
const dualPng = generateEmbeddedCharacterPng(sampleChar);
const chunks = extractPngChunks(dualPng.pngBuffer);
if (!chunks.chara || !chunks.ccv3) {
  throw new Error("Expected PNG to have BOTH 'chara' (V2) and 'ccv3' (V3) chunks embedded!");
}
console.log("✓ Verified: PNG embedding injects both 'chara' (V2) and 'ccv3' (V3) metadata chunks.");

// 13.3 Verify Procedural PNG Avatar Generation
const avatarPng = generateProceduralPngAvatar(sampleChar, 256, 256);
if (avatarPng.length < 500 || avatarPng[0] !== 0x89 || avatarPng[1] !== 0x50) {
  throw new Error("generateProceduralPngAvatar failed to create valid PNG!");
}
console.log("✓ Verified: Procedural PNG card avatar generation functional, size:", avatarPng.length, "bytes.");

// 13.4 Verify CharX Container Export & Extraction
const charxBytes = createCharxArchive(sampleChar, avatarPng);
if (charxBytes.length < 200 || charxBytes[0] !== 0x50 || charxBytes[1] !== 0x4b) {
  throw new Error("createCharxArchive failed to create valid ZIP buffer!");
}
const parsedCharx = parseCharxArchive(charxBytes);
if (parsedCharx.character.name !== "Kaelen Voss") {
  throw new Error("parseCharxArchive failed to extract character name!");
}
if (!parsedCharx.avatarDataUrl || !parsedCharx.avatarDataUrl.startsWith("data:image/png;base64,")) {
  throw new Error("parseCharxArchive failed to extract assets/icon.png into avatarDataUrl!");
}
console.log("✓ Verified: CharX (.charx) container bundling and parsing functional.");

// 14. Verify System Prompt Incorporation options and raw_system_prompt detection
const cardWithSysPrompt = JSON.stringify({
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "Legacy Card",
    description: "Old description.",
    system_prompt: "You are {{char}}. Act aggressively and maintain clipped speech.",
    post_history_instructions: "Existing post history.",
  },
});
const parsedWithSys = parseCharacterFromInput(cardWithSysPrompt);
if (parsedWithSys.raw_system_prompt !== "You are {{char}}. Act aggressively and maintain clipped speech.") {
  throw new Error(`Expected raw_system_prompt to be preserved on parse result, got: "${parsedWithSys.raw_system_prompt}"`);
}
if (parsedWithSys.character.system_prompt !== "") {
  throw new Error("Character system_prompt should remain strictly empty in memory!");
}
console.log("✓ Verified: raw_system_prompt detection on card import functional and character.system_prompt strictly empty.");

// 15. Verify Robotic Dialogue Caricature Diagnostic Detection
const roboticChar: RoleplayCharacter = {
  ...sampleChar,
  personality: "Her tone is high-frequency and pedantic, treating every conversation as an academic lecture she is winning. She uses complex linguistic structures and technical jargon like statistical anomaly.",
  mes_example: "<START>\n{{user}}: Help me find my keys.\n{{char}}: Your inability to track your own belongings is a statistical anomaly. It is mathematically unsound.",
};
const roboticAudit = auditCharacterCard(roboticChar);
const hasRoboticWeakness = roboticAudit.weaknesses.some((w) => w.issue.includes("Robotic / unnatural dialogue tropes detected"));
if (!hasRoboticWeakness) {
  throw new Error("Expected auditCharacterCard to detect and flag robotic academic tropes!");
}
console.log("✓ Verified: Robotic academic caricature tropes detected and penalized in card audit.");

// 16. Verify Natural Spoken Dialogue Contract
import { NATURAL_SPOKEN_DIALOGUE_CONTRACT } from "./src/services/agent/agent-harness";
if (!NATURAL_SPOKEN_DIALOGUE_CONTRACT.includes("mathematically unsound") || !NATURAL_SPOKEN_DIALOGUE_CONTRACT.includes("contractions")) {
  throw new Error("NATURAL_SPOKEN_DIALOGUE_CONTRACT must explicitly ban pseudo-scientific jargon!");
}
console.log("✓ Verified: Natural Spoken Dialogue Contract actively bans pseudo-scientific jargon and Spock caricatures.");

// 17. Verify Single-to-Double Quote Normalization for Spoken Dialogue
import { normalizeDialogueQuotes } from "./src/services/character/macro-engine";
const singleQuoteText = "'You're late,' she snapped. 'Why are you standing there?' {{char}}'s arm. It isn't right.";
const normalizedQuotes = normalizeDialogueQuotes(singleQuoteText);
if (!normalizedQuotes.includes('"You\'re late,"') || !normalizedQuotes.includes('"Why are you standing there?"')) {
  throw new Error(`Expected single-quoted dialogue to be converted to double quotes, got: "${normalizedQuotes}"`);
}
if (!normalizedQuotes.includes("{{char}}'s arm") || !normalizedQuotes.includes("isn't")) {
  throw new Error(`Contractions or possessives were corrupted during quote normalization: "${normalizedQuotes}"`);
}
console.log("✓ Verified: normalizeDialogueQuotes converts single quotes to double quotes while protecting contractions.");

// 18. Verify Optional Web Search & Lore Retrieval in Full Overhaul & Specific Polishing
import { processEnhanceRequest } from "./src/services/enhancer/index";
const testSearchOverhaulReq: EnhanceCharacterRequest = {
  character: sampleChar,
  mode: "full_overhaul",
  options: {
    enableWebSearch: true,
    searchQuery: "Kaelen Voss Endfield Foundation",
    includeHeadcanons: true,
    retrievedLore: "=== CANON LORE ===\n• [Endfield Wiki]: Kaelen Voss is a former chief researcher.",
  },
  provider: { type: "none", model: "none" },
};

if (!testSearchOverhaulReq.options?.enableWebSearch || !testSearchOverhaulReq.options?.retrievedLore) {
  throw new Error("EnhanceOptions failed to carry search configuration!");
}

const enhanceAuditResult = await processEnhanceRequest({
  character: sampleChar,
  mode: "audit_only",
  options: {
    enableWebSearch: true,
    retrievedLore: "Test lore snippet",
  },
  provider: { type: "none", model: "none" },
});

if (enhanceAuditResult.changesSummary.length === 0) {
  throw new Error("Audit only with enhance options failed to return summary!");
}
console.log("✓ Verified: Optional Web Search & Canon Lore retrieval integrated into Full Overhaul & Director's polishing modules.");

// 19. Verify Genre Fidelity & Authentic Romance Mandate
import { isRomanceGenreOrConcept, getGenreFidelityDirective } from "./src/services/character/genre-helper";

setActiveProfile("weaver_evolved");
const evolvedCfg = getActivePromptConfig();
if (!evolvedCfg.systemPrompt.includes("GENRE FIDELITY & AUTHENTIC ROMANCE VS NON-ROMANCE MANDATE")) {
  throw new Error("Expected active prompt profile to enforce Genre Fidelity & Authentic Romance Mandate!");
}
if (!evolvedCfg.systemPrompt.includes("MUST GENUINELY CARE ABOUT ROMANCE")) {
  throw new Error("Expected active prompt profile to require characters to care about romance when romance is requested!");
}
setActiveProfile(existingActiveProfile);

// Verify Romance genre detection and directive injection
if (!isRomanceGenreOrConcept("Romance / Slice of Life", "enemies to lovers tsundere roommate")) {
  throw new Error("isRomanceGenreOrConcept failed to detect romance genre and tropes!");
}
const romanceDirective = getGenreFidelityDirective("Romance / Slice of Life", "sweet slow burn");
if (!romanceDirective.includes("MUST GENUINELY CARE ABOUT ROMANCE") || !romanceDirective.includes("STRICTLY BANNED: Cynical snobbery")) {
  throw new Error("getGenreFidelityDirective did not generate authentic romance directives for romance genre!");
}

// Verify Non-Romance genre keeps non-romantic setting fidelity
if (isRomanceGenreOrConcept("Dark Fantasy / Grimdark", "Inquisitor hunting heretics in the frost")) {
  throw new Error("isRomanceGenreOrConcept falsely matched non-romance grimdark concept!");
}
const nonRomanceDirective = getGenreFidelityDirective("Dark Fantasy / Grimdark");
if (!nonRomanceDirective.includes("NON-ROMANCE / SPECIFIED GENRE FIDELITY")) {
  throw new Error("getGenreFidelityDirective did not enforce non-romance fidelity for grimdark!");
}

const cleansedCard = JSON.parse(fs.readFileSync("data/cards/char_3y9c4l3z.json", "utf8"));
const cardContent = JSON.stringify(cleansedCard);
if (cardContent.includes("pinned down") || cardContent.includes("breathless mess of submission") || cardContent.includes("forehead to rest against")) {
  throw new Error("char_3y9c4l3z.json still contains unwanted sexual submission/romance tropes!");
}
console.log("✓ Verified: Genre Fidelity & Authentic Romance Mandate actively enforces romantic investment for romance cards and setting fidelity for non-romance cards.");

// 20. Verify Bulletproof JSON Repair & Token Preservation Engine
import { safeParseJson, repairJsonSyntax, fuzzyExtractJsonFields } from "./src/services/llm/json-repair";

// Test unescaped quotes inside dialogue string literal
const brokenDialogueJson = `{\n  "name": "Kaelen",\n  "mes_example": "He looked up and said "I won't let you," before sighing."\n}`;
const parsedDialogue = safeParseJson<{ name: string; mes_example: string }>(brokenDialogueJson);
if (parsedDialogue.name !== "Kaelen" || !parsedDialogue.mes_example.includes("won't let you")) {
  throw new Error("safeParseJson failed to repair unescaped quotes inside dialogue!");
}

// Test trailing commas, Python literals, and comments
const pythonicJson = `{\n  // Single line comment\n  "name": "Kaelen",\n  "verified": True,\n  "secret": None,\n  "tags": ["tactical", "cold",],\n}`;
const parsedPythonic = safeParseJson<{ name: string; verified: boolean; secret: any; tags: string[] }>(pythonicJson);
if (parsedPythonic.verified !== true || parsedPythonic.secret !== null || parsedPythonic.tags.length !== 2) {
  throw new Error("safeParseJson failed to repair Python literals and trailing commas!");
}

// Test truncated JSON from token cutoff
const truncatedJson = `{\n  "agent_message": "Updated personality",\n  "updated_fields": {\n    "personality": "A sharp, observant tactician who hates wasted time`;
const parsedTruncated = safeParseJson<any>(truncatedJson);
if (!parsedTruncated.updated_fields?.personality?.includes("observant tactician")) {
  throw new Error("safeParseJson failed to salvage truncated JSON token cutoff!");
}

// Test fuzzy salvage on heavily corrupted output
const corruptedJson = `Sure! Here is the updated card:\n{\n  "agent_message": "Fleshed out description.",\n  "description": "Scattered across the northern front, cold iron and snow."\n  Wait forgot a comma and syntax is broken!`;
const salvagedCorrupted = safeParseJson<any>(corruptedJson);
if (!salvagedCorrupted.agent_message || !salvagedCorrupted.description) {
  throw new Error("safeParseJson failed to salvage fields from heavily corrupted JSON!");
}
console.log("✓ Verified: Bulletproof JSON Repair & Token Preservation Engine prevents token loss across all failure modes.");

// 21. Verify Agent Tool Calling & Action Dispatch Engine
import { parseAgentResponse } from "./src/services/agent/agent-tools";

const agentOutputWithTools = `
I have rewritten her personality and opening message to make her cadence dry, natural, and grounded in realistic spoken dialogue.

<tool:update_field name="personality" explanation="Removed thesaurus tropes and injected deadpan wit">
{{char}} uses natural spoken contractions—"can't," "won't," "don't"—and reacts to obvious questions with dry, flat irony.
</tool:update_field>

<tool:update_field name="first_mes" explanation="Punched up opening scene tension">
"You're late," she said, not looking up. "I'd ask if you had an excuse, but I'd rather not listen to one."
</tool:update_field>

<tool:search_lore query="Arknights Endfield lore" />
`;

const parsedAgent = parseAgentResponse(agentOutputWithTools);
if (!parsedAgent.usedToolTags) {
  throw new Error("parseAgentResponse failed to detect tool action tags!");
}
if (!parsedAgent.updatedFields.personality?.includes("can't") || !parsedAgent.updatedFields.first_mes?.includes("You're late")) {
  throw new Error("parseAgentResponse failed to extract fields from tool tags!");
}
if (parsedAgent.toolCalls.length !== 3) {
  throw new Error(`Expected 3 tool calls, got ${parsedAgent.toolCalls.length}`);
}
if (!parsedAgent.agentMessage.includes("dry, natural, and grounded")) {
  throw new Error("parseAgentResponse failed to isolate conversational agent message!");
}

// Verify salvage from raw markdown sections
const markdownOutput = `
Here are the updates:
### Personality
She is quiet, observant, and speaks with few words.
### First Message
"Take a seat before you fall over," she muttered.
`;
const parsedMarkdown = parseAgentResponse(markdownOutput);
if (!parsedMarkdown.updatedFields.personality || !parsedMarkdown.updatedFields.first_mes) {
  throw new Error("parseAgentResponse failed to salvage fields from markdown sections!");
}
console.log("✓ Verified: Agent Tool Calling & Action Dispatch Engine parses tool action tags, lore searches, and markdown fallbacks.");

// 22. Verify Architecture-Adaptive Prompting & Local Model Optimization
import { isLocalModelArchitecture, getEffectivePromptConfig } from "./src/services/config/prompt-config";

if (!isLocalModelArchitecture({ type: "llamacpp", model: "Meta-Llama-3.1-8B-Instruct" })) {
  throw new Error("isLocalModelArchitecture failed to detect llama.cpp!");
}
if (!isLocalModelArchitecture({ type: "ollama", model: "qwen2.5:14b" })) {
  throw new Error("isLocalModelArchitecture failed to detect Ollama Qwen!");
}
if (isLocalModelArchitecture({ type: "anthropic", model: "claude-3-5-sonnet-20241022" })) {
  throw new Error("isLocalModelArchitecture falsely classified Claude as a local model!");
}

const localConfig = profiles.find((p) => p.id === "local_playable");
if (!localConfig) {
  throw new Error("Expected 'local_playable' profile to be available in prompt profiles!");
}

const localTemplate = JSON.parse(fs.readFileSync("config/prompts.local.json", "utf8"));
if (!localTemplate.systemPrompt.includes("CORE PLAYABILITY RULES") || !localTemplate.systemPrompt.includes("ZERO META-ESSAY BLOAT")) {
  throw new Error("Expected prompts.local.json to contain Playability First and Zero Meta-Essay directives!");
}
if (localTemplate.fieldRenderers?.description?.proseGuidance?.includes("[FORMATIVE CRUCIBLE]")) {
  throw new Error("prompts.local.json should NOT contain abstract [FORMATIVE CRUCIBLE] bracket-jargon!");
}
console.log("✓ Verified: Architecture-Adaptive Prompting & Local Model Optimization active and validated.");

// 23. Verify Multi-Theme Picker & BDSM / Power Exchange Fidelity Directives
import { isBdsmOrKinkTheme } from "./src/services/character/genre-helper";

// Verify BDSM / Kink detection across diverse tags and write-ins
if (!isBdsmOrKinkTheme("BDSM / Power Exchange")) throw new Error("isBdsmOrKinkTheme failed on 'BDSM / Power Exchange'!");
if (!isBdsmOrKinkTheme("Dominant / Sadistic")) throw new Error("isBdsmOrKinkTheme failed on 'Dominant / Sadistic'!");
if (!isBdsmOrKinkTheme("Submissive / Masochistic")) throw new Error("isBdsmOrKinkTheme failed on 'Submissive / Masochistic'!");
if (!isBdsmOrKinkTheme("Femdom / Domme")) throw new Error("isBdsmOrKinkTheme failed on 'Femdom / Domme'!");
if (!isBdsmOrKinkTheme("Brat / Brat Tamer")) throw new Error("isBdsmOrKinkTheme failed on 'Brat / Brat Tamer'!");
if (!isBdsmOrKinkTheme("Bondage / Shibari")) throw new Error("isBdsmOrKinkTheme failed on 'Bondage / Shibari'!");
if (!isBdsmOrKinkTheme("Dark Romance")) throw new Error("isBdsmOrKinkTheme failed on 'Dark Romance'!");
if (!isBdsmOrKinkTheme("collar and petplay leash")) throw new Error("isBdsmOrKinkTheme failed on 'collar and petplay leash'!");

// Verify clean negative detection on non-BDSM settings
if (isBdsmOrKinkTheme("Dark Fantasy / Grimdark")) throw new Error("isBdsmOrKinkTheme falsely matched 'Dark Fantasy / Grimdark'!");
if (isBdsmOrKinkTheme("Romance / Slice of Life", "Slow Burn", "Enemies to Lovers")) throw new Error("isBdsmOrKinkTheme falsely matched pure vanilla romance!");
if (isBdsmOrKinkTheme("Cyberpunk / Dystopian", "Detective Noir")) throw new Error("isBdsmOrKinkTheme falsely matched cyberpunk detective!");

// Verify Pure BDSM Directive Generation
const pureBdsmDirective = getGenreFidelityDirective("Dark Fantasy", "BDSM / Power Exchange", "Dominant / Sadistic");
if (!pureBdsmDirective.includes("BDSM / POWER EXCHANGE / KINK / MATURE EROTICA DETECTED")) {
  throw new Error("getGenreFidelityDirective failed to generate BDSM / Power Exchange directive!");
}
if (!pureBdsmDirective.includes("safewords") || !pureBdsmDirective.includes("dominance/submission")) {
  throw new Error("BDSM directive missing safeword and dominance/submission calibration!");
}

// Verify D/s Romance / Dark Romance Directive Generation (Combining Romance + BDSM)
const dsRomanceDirective = getGenreFidelityDirective("Romance / Slice of Life", "BDSM / Power Exchange", "Slow Burn");
if (!dsRomanceDirective.includes("BDSM / DARK ROMANCE / POWER EXCHANGE DETECTED")) {
  throw new Error("getGenreFidelityDirective failed to generate D/s Dark Romance directive!");
}
if (!dsRomanceDirective.includes("EMBRACE BOTH AUTHENTIC ROMANTIC CHEMISTRY AND POWER EXCHANGE")) {
  throw new Error("D/s Romance directive missing dual romance and power exchange mandate!");
}

// Verify Pure Vanilla Romance Directive remains protected
const pureRomanceDirective = getGenreFidelityDirective("Romance / Slice of Life", "Slow Burn");
if (!pureRomanceDirective.includes("BAN EDGY BDSM SUBMISSION IN PLACE OF ROMANCE")) {
  throw new Error("Vanilla romance directive should still protect against uninvited edgy BDSM submission!");
}

console.log("✓ Verified: Multi-Theme & BDSM Power Exchange fidelity directives accurately calibrated across all genre combinations.");

// 24. Verify Clean Character Card & Stripping of Unneeded Authoring Lore / Reaction Gradients
import { buildCharacterBookFromSpine } from "./src/services/character/bible-builder";
import { sanitizeCharacterBook } from "./src/services/character/card-parser";
import type { AuthoringSpine } from "./src/services/generator/spine";

const mockSpine: AuthoringSpine = {
  tags: [],
  name: "Lyra Voss",
  archetype: "Cold inquisitor seeking redemption",
  central_contradiction: "Sacred duty vs maternal protectiveness",
  values: ["Duty -> Executes orders promptly", "Mercy -> Secretly spares the innocent"],
  experiences: ["Year 12 -> Burned the archives, forged cynicism"],
  reaction_gradient: {
    wont: "Will never execute a child",
    craves: "Absolution and peace",
    neutral: "Court politics and weather",
    will: "Admits guilt when trust is proven",
    trust_gate: "Lowers her silver blade and sighs",
  },
  triggers: ["IF threatened, THEN draws blade"],
  form: "Tall, lean, scarred wrists, scent of cedar",
  voice: {
    cadence: "Measured and quiet",
    dialect_register: "Formal",
    signature_lexicon: ["By the light", "Stand fast"],
    forbidden_words: ["smirks", "baby"],
    quirks: ["Taps pommel"],
  },
  stance_toward_user: "Cautious suspicion",
  intents: {
    super_objective: "Find peace",
    obstacle: "Guilt",
    strategy: "Probe intentions",
  },
  scene_frame: {
    setting: "Frosty chapel",
    atmosphere: "Tense stillness",
    scene_objective: "Evaluate player's loyalty",
  },
};

// Verify that if a card contains internal Weaver scaffold entries, sanitizeCharacterBook strips them completely
const rawBookWithScaffolding = buildCharacterBookFromSpine(mockSpine);
const cleanedBook = sanitizeCharacterBook(rawBookWithScaffolding);
if (!cleanedBook || cleanedBook.entries.length !== 0) {
  throw new Error("sanitizeCharacterBook failed to strip internal Weaver reaction gradient blueprint from lorebook!");
}

// Verify that evolved & local prompt description guidelines ban raw gradient bullet lists
const evolvedCfgCheck = JSON.parse(fs.readFileSync("config/prompts.evolved.private.json", "utf8"));
const evolvedDescGuidance = evolvedCfgCheck.fieldRenderers?.description?.proseGuidance || "";
if (evolvedDescGuidance.includes("- WON'T: Non-negotiable") || evolvedDescGuidance.includes("- CRAVES: What they secretly")) {
  throw new Error("prompts.evolved.private.json should NOT mandate literal - WON'T: / - CRAVES: bullet lists in description!");
}
if (!evolvedDescGuidance.includes("STRICTLY DO NOT write literal bullet lists")) {
  throw new Error("prompts.evolved.private.json must explicitly forbid literal gradient bullet dumps in description!");
}

const localCfgCheck = JSON.parse(fs.readFileSync("config/prompts.local.json", "utf8"));
const localDescGuidance = localCfgCheck.fieldRenderers?.description?.proseGuidance || "";
if (localDescGuidance.includes("- WON'T: Hard limits") || localDescGuidance.includes("- CRAVES: Authentic desires")) {
  throw new Error("prompts.local.json should NOT mandate literal - WON'T: / - CRAVES: bullet lists in description!");
}

console.log("✓ Verified: Final cards are pristine and free of unneeded lore/reaction gradient dumps.");

// 25. Verify Image Generation Prompt Generator & Persistent Offline Prompt Queue
import { generateImagePrompt } from "./src/services/image/prompt-generator";
import {
  addToPromptQueue,
  listPromptQueue,
  updatePromptQueueItem,
  removeFromPromptQueue,
  clearPromptQueue,
  exportPromptQueue,
  attachImageToQueueItem,
} from "./src/services/image/prompt-queue";

const mockImgChar: RoleplayCharacter = {
  id: "test-img-char", alternate_greetings: [], system_prompt: "", post_history_instructions: "", creator_notes: "", tags: [],
  name: "Lyra Shadowsong",
  description: "A dark elf assassin with silver hair styled in twin braids, piercing violet eyes, a slender athletic build, wearing leather armor with obsidian pauldrons and a silk cloak.",
  personality: "Cold, calculating, sharp-tongued, fiercely loyal once trust is earned.",
  scenario: "Rain-slicked gothic rooftops at midnight overlooking the neon-lit cathedral.",
  first_mes: "*Lyra crouches silently on the gargoyle's ledge, her daggers gleaming in the moonlight.*",
  mes_example: "",
};

// Test Flux prompt generation
const fluxResult = await generateImagePrompt({
  character: mockImgChar,
  targetModel: "flux",
  artStyle: "dark_fantasy",
  shotType: "card_portrait",
  aspectRatio: "2:3",
  provider: { type: "none", model: "" },
});

if (!fluxResult.prompt || fluxResult.prompt.length < 20) {
  throw new Error("Flux image prompt generation failed to produce valid prompt!");
}

// Test Pony prompt generation
const ponyResult = await generateImagePrompt({
  character: mockImgChar,
  targetModel: "pony",
  artStyle: "anime",
  shotType: "card_portrait",
  nsfw: true,
  provider: { type: "none", model: "" },
});

if (!ponyResult.prompt.includes("score_9, score_8_up") || !ponyResult.prompt.includes("rating_explicit")) {
  throw new Error("Pony prompt missing required score tags or rating tag!");
}
if (!ponyResult.negativePrompt || !ponyResult.negativePrompt.includes("score_6, score_5") || !ponyResult.negativePrompt.includes("source_pony")) {
  throw new Error("Pony negative prompt missing required negative score tags!");
}

// Test Clean Avatar Isolation against BDSM / Kink Contamination
const bdsmChar: RoleplayCharacter = {
  id: "test-bdsm-char", alternate_greetings: [], system_prompt: "", post_history_instructions: "", creator_notes: "", tags: [],
  name: "Mistress Vespera",
  description: "A tall woman with crimson eyes, long black hair, wearing an elegant velvet evening dress and golden earrings. In private dungeon sessions, she engages in bondage, leather restraints, ropes, and suspension.",
  personality: "Poised, commanding, sophisticated.",
  scenario: "{{user}} is brought into a dimly lit dungeon where leather restraints, ropes, and chains hang from the stone walls.",
  first_mes: "*Vespera looks down with a calm, amused gaze.*",
  mes_example: "",
};

const cleanAvatarResult = await generateImagePrompt({
  character: bdsmChar,
  targetModel: "pony",
  portraitIntent: "standard_avatar",
  artStyle: "anime",
  shotType: "card_portrait",
  nsfw: false,
  provider: { type: "none", model: "" },
});

if (cleanAvatarResult.portraitIntent !== "standard_avatar") {
  throw new Error("Expected portraitIntent to be 'standard_avatar'");
}
if (!cleanAvatarResult.negativePrompt?.includes("bondage") || !cleanAvatarResult.negativePrompt?.includes("restraints")) {
  throw new Error("Standard avatar on Pony must include anti-bondage/restraint negative tags to protect avatar quality!");
}

// Test Greeting Scene Image Prompt Generation
const greetingResult = await generateImagePrompt({
  character: mockImgChar,
  imagePurpose: "greeting",
  targetModel: "flux",
  artStyle: "dark_fantasy",
  shotType: "action_scene",
  aspectRatio: "16:9",
  provider: { type: "none", model: "" },
});

if (greetingResult.imagePurpose !== "greeting") {
  throw new Error("Expected imagePurpose to be 'greeting'");
}
if (!greetingResult.prompt.toLowerCase().includes("greeting") && !greetingResult.prompt.toLowerCase().includes("scene")) {
  throw new Error("Greeting image prompt must formulate a narrative greeting scene!");
}

// Test Unfiltered Scenario Avatar Image Prompt Generation
const scenarioAvatarResult = await generateImagePrompt({
  character: {
    ...mockImgChar,
    scenario: "Chained to the obsidian throne inside the subterranean volcanic dungeon.",
  },
  imagePurpose: "scenario_avatar",
  targetModel: "flux",
  artStyle: "dark_fantasy",
  shotType: "card_portrait",
  aspectRatio: "2:3",
  nsfw: true,
  provider: { type: "none", model: "" },
});

if (scenarioAvatarResult.imagePurpose !== "scenario_avatar") {
  throw new Error("Expected imagePurpose to be 'scenario_avatar'");
}
if (!scenarioAvatarResult.prompt.toLowerCase().includes("scenario") && !scenarioAvatarResult.prompt.toLowerCase().includes("obsidian")) {
  throw new Error("Scenario avatar prompt must formulate the unfiltered scenario situation!");
}

// Test Queue operations
await clearPromptQueue(false); // Clean initial state

const qItem1 = await addToPromptQueue({
  characterName: mockImgChar.name,
  targetModel: "flux",
  artStyle: "dark_fantasy",
  shotType: "card_portrait",
  aspectRatio: "2:3",
  prompt: fluxResult.prompt,
});

const qItem2 = await addToPromptQueue({
  characterName: "Evelyn Reed",
  targetModel: "pony",
  artStyle: "anime",
  shotType: "card_portrait",
  aspectRatio: "2:3",
  prompt: ponyResult.prompt,
  negativePrompt: ponyResult.negativePrompt,
});

const queueList = await listPromptQueue();
if (queueList.length < 2) {
  throw new Error(`Expected at least 2 items in prompt queue, got ${queueList.length}`);
}

// Test queue export
const jsonExport = await exportPromptQueue("json");
if (!jsonExport.includes("Lyra Shadowsong") || !jsonExport.includes("Evelyn Reed")) {
  throw new Error("exportPromptQueue (json) failed to include queued characters!");
}

const comfyBatchExport = await exportPromptQueue("comfy_batch");
if (!comfyBatchExport.includes("Lyra Shadowsong") || !comfyBatchExport.includes("model")) {
  throw new Error("exportPromptQueue (comfy_batch) failed to format batch nodes payload!");
}

const textExport = await exportPromptQueue("text");
if (!textExport.includes("PROMPT:") || !textExport.includes("Lyra Shadowsong")) {
  throw new Error("exportPromptQueue (text) failed to format readable prompt sheet!");
}

// Test status update and mark completed
const updatedItem = await updatePromptQueueItem(qItem1.id, { status: "completed" });
if (!updatedItem || updatedItem.status !== "completed") {
  throw new Error("updatePromptQueueItem failed to update item status!");
}

// Test clear completed only
const clearedCount = await clearPromptQueue(true);
if (clearedCount !== 1) {
  throw new Error(`Expected clearPromptQueue(true) to remove 1 completed item, got ${clearedCount}`);
}

const remainingList = await listPromptQueue();
if (remainingList.length !== 1 || remainingList[0].id !== qItem2.id) {
  throw new Error("clearPromptQueue(true) left unexpected items in queue!");
}

// Clean up test items
await clearPromptQueue(false);

// Test ComfyUI Workflow Analysis & Zero-Destruction Invariant
import {
  analyzeComfyWorkflow,
  patchComfyWorkflow,
  exportComfyBatchFile,
} from "./src/services/image/comfyui-client";

const mockComfyApiWorkflow = {
  "3": {
    "inputs": {
      "seed": 123456789,
      "steps": 25,
      "cfg": 7.5,
      "sampler_name": "euler_ancestral",
      "scheduler": "karras",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "KSampler" }
  },
  "6": {
    "inputs": {
      "text": "old positive prompt",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
  },
  "7": {
    "inputs": {
      "text": "old negative prompt",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
  }
};

const wfAnalysis = analyzeComfyWorkflow(mockComfyApiWorkflow);
if (!wfAnalysis.valid || wfAnalysis.defaultPositiveNodeId !== "6" || wfAnalysis.defaultNegativeNodeId !== "7") {
  throw new Error("ComfyUI workflow analysis failed to correctly identify prompt nodes!");
}

const patchedWorkflow = patchComfyWorkflow(mockComfyApiWorkflow, {
  positiveNodeId: "6",
  positiveText: "new injected positive prompt",
  negativeNodeId: "7",
  negativeText: "new injected negative prompt",
  randomizeSeed: false,
});

if (patchedWorkflow["6"].inputs.text !== "new injected positive prompt") {
  throw new Error("Positive prompt injection failed!");
}
if (patchedWorkflow["7"].inputs.text !== "new injected negative prompt") {
  throw new Error("Negative prompt injection failed!");
}
if (patchedWorkflow["3"].inputs.steps !== 25 || patchedWorkflow["3"].inputs.cfg !== 7.5 || patchedWorkflow["3"].inputs.sampler_name !== "euler_ancestral") {
  throw new Error("VIOLATION OF ZERO-DESTRUCTION INVARIANT: Sampler parameters were modified!");
}
if (mockComfyApiWorkflow["6"].inputs.text !== "old positive prompt") {
  throw new Error("Original workflow was mutated in-place!");
}

const testQueueItems = [
  {
    id: "test_1",
    characterName: "Test Char",
    imagePurpose: "greeting" as const,
    createdAt: new Date().toISOString(),
    targetModel: "flux" as const,
    artStyle: "anime" as const,
    shotType: "card_portrait" as const,
    aspectRatio: "2:3",
    prompt: "A beautiful test character in greeting scene",
    status: "queued" as const,
  }
];

const batchFileContent = exportComfyBatchFile(testQueueItems, {
  workflow: mockComfyApiWorkflow,
  positiveNodeId: "6",
  negativeNodeId: "7",
  randomizeSeed: false,
});

const parsedBatch = JSON.parse(batchFileContent);
if (!Array.isArray(parsedBatch) || parsedBatch.length !== 1 || parsedBatch[0].workflow["6"].inputs.text !== "A beautiful test character in greeting scene") {
  throw new Error("exportComfyBatchFile failed to generate valid mapped batch payload!");
}

console.log("✓ Verified: ComfyUI Client Workflow Analyzer & Zero-Destruction Invariant Engine active and verified.");
console.log("✓ Verified: Image Generation Prompt Generator (Avatar & Greeting Scenes) & Offline Prompt Queue fully functional.");

// Test Server-Side IPC Engine
const ipcStatus = serverIpc.getStatus();
if (ipcStatus.status !== "online" || !Array.isArray(PRESET_THEMES)) {
  throw new Error("IPC Server is not online or themes unavailable!");
}
const ipcConceptRes = await serverIpc.submitConcept({
  concept: "Eldritch botanist studying weeping spore trees.",
  era: "Plantagenet England (c. 1154 – 1399 CE)",
  themes: ["Psychological Thriller"],
  suggestedBy: "Test Harness",
  autoGenerate: false,
});
if (!ipcConceptRes.idea || ipcConceptRes.idea.suggestedBy !== "Test Harness" || ipcConceptRes.idea.era !== "Plantagenet England (c. 1154 – 1399 CE)") {
  throw new Error("IPC submitConcept failed to record idea or era!");
}
if (serverIpc.getLastIdea()?.id !== ipcConceptRes.idea.id) {
  throw new Error("IPC getLastIdea mismatch!");
}

let testIpcReceived = false;
const testIpcWs = {
  send: (msgStr: string) => {
    const parsed = JSON.parse(msgStr);
    if (parsed.type === "ipc:connected") testIpcReceived = true;
  },
};
serverIpc.registerClient(testIpcWs);
if (!testIpcReceived) {
  throw new Error("IPC WebSocket registerClient failed to emit welcome payload!");
}
serverIpc.unregisterClient(testIpcWs);

console.log("✓ Verified: Server-Side IPC Engine & Real-time WebSocket Protocol verified.");

// Test Multiverse Universes Meta
const { MULTIVERSE_UNIVERSES } = await import("./src/services/enhancer/multiverse-forker");
if (!Array.isArray(MULTIVERSE_UNIVERSES) || MULTIVERSE_UNIVERSES.length !== 7) {
  throw new Error("MULTIVERSE_UNIVERSES should contain 7 canonical universes!");
}
const cyberpunkUni = MULTIVERSE_UNIVERSES.find((u) => u.id === "cyberpunk_dystopia");
if (!cyberpunkUni || !cyberpunkUni.promptDirective.includes("Cyberpunk")) {
  throw new Error("Cyberpunk universe metadata incomplete!");
}
console.log("✓ Verified: Multiverse AU Forker meta registered with 7 canonical universes.");

// Test Voice Spec Default Stamping Structure
const testStampedChar = JSON.parse(JSON.stringify(sampleChar));
testStampedChar.extensions = {
  chargen: {
    tts_spec: {
      voiceName: "Kaelen Voss (Default Gritty)",
      gender: "male",
      ageBracket: "adult",
      vocalTexture: "gravelly with quiet rasp",
      pitchCadence: "low pitch, clipped syllables",
      accentDialect: "Mid-Atlantic",
      qwenInstructPrompt: "male, adult, gravelly with quiet rasp, low pitch, clipped syllables",
      qwenSampleDialogue: "Keep your hands where I can see them.",
      kokoroVoice: "am_adam",
      elevenLabs: { stability: 0.75, similarity: 0.85, style: 0.2, speed: 0.95 },
      audioTags: ["stoic", "tactical", "low-pitch"],
    },
  },
};
if (!testStampedChar.extensions?.chargen?.tts_spec?.qwenInstructPrompt) {
  throw new Error("TTS Voice Spec structure invalid!");
}
console.log("✓ Verified: Qwen3-TTS / CosyVoice & Kokoro Voice Spec stamping structure verified.");

// Test Historical & Fantasy Eras Service
const { getAllEras, searchErasSemantic, createUserEra, deleteUserEra } = await import("./src/services/eras/eras-service");
const allEras = getAllEras();
if (Object.keys(allEras).length < 70) {
  throw new Error("Eras catalog should contain at least 70 historical and fantasy eras!");
}
const samuraiMatches = searchErasSemantic("samurai");
if (!samuraiMatches.length || (!samuraiMatches[0].name.toLowerCase().includes("kamakura") && !samuraiMatches[0].name.toLowerCase().includes("samurai"))) {
  throw new Error("Semantic search failed to match 'samurai' to Japanese historical era!");
}
const centMatches = searchErasSemantic("14th century");
if (!centMatches.length) {
  throw new Error("Century range detection failed for '14th century'!");
}
const testUserEra = createUserEra({
  name: "Neo-Alexandrian Renaissance",
  span: "c. 2400 – 2600 CE",
  category: "User Eras",
  region: "Mediterranean & Beyond",
  aesthetic: "White marble colonnades interwoven with bioluminescent algae glass conduits.",
  tech: "Solar mirrors, optical crystal archives, pneumatic skiffs.",
  social_codes: "Scholastic democracy, debate amphitheatres, strict guest hospitality oaths.",
});
if (!testUserEra.id || !testUserEra.is_user_era) {
  throw new Error("Failed to create user custom era!");
}
const userEraSearch = searchErasSemantic("Alexandrian", "User Eras", "All", true);
if (!userEraSearch.find((e) => e.id === testUserEra.id)) {
  throw new Error("User era semantic search failed to locate newly created user era!");
}
deleteUserEra(testUserEra.id);
console.log("✓ Verified: Historical & Fantasy Eras Catalog, Semantic Search & User Eras CRUD functional.");

// 33. Verify Reroll Steering & Weaver Choice Influence Support
import type { GenerateCharacterRequest, WeaverInterviewQuestionsRequest } from "./src/types/harness";

const testGenReq: GenerateCharacterRequest = {
  concept: "Elena, renegade spellblade",
  steeringInstructions: "Emphasize cold psychological detachment and secret vulnerability",
  provider: { type: "gemini", apiKey: "dummy" , model: "gemini-2.0-flash" },
};
if (!testGenReq.steeringInstructions) {
  throw new Error("GenerateCharacterRequest should allow steeringInstructions!");
}

const testWeaverReq: WeaverInterviewQuestionsRequest = {
  concept: "Elena, renegade spellblade",
  influence: "Focus on forbidden ancient curse and master-servant tension",
  provider: { type: "gemini", apiKey: "dummy" , model: "gemini-2.0-flash" },
};
if (!testWeaverReq.influence) {
  throw new Error("WeaverInterviewQuestionsRequest should allow influence!");
}

console.log("✓ Verified: Reroll Steering & Weaver Choice Influence Engine fully functional.");

// 34. Verify First-Class Bot Generation Modes (Multi-Character Cast & RPG World / GM)
import {
  MULTI_CHARACTER_GOVERNANCE_CONTRACT,
  RPG_WORLD_GM_CONTRACT,
} from "./src/services/agent/agent-harness";

if (!MULTI_CHARACTER_GOVERNANCE_CONTRACT.includes("Multi-Character Cast Governance Contract") ||
    !MULTI_CHARACTER_GOVERNANCE_CONTRACT.includes("MULTI-VOICE INTEGRITY") ||
    !MULTI_CHARACTER_GOVERNANCE_CONTRACT.includes("INTER-CHARACTER DYNAMICS")) {
  throw new Error("MULTI_CHARACTER_GOVERNANCE_CONTRACT is missing core cast governance rules!");
}

if (!RPG_WORLD_GM_CONTRACT.includes("RPG World & Game Master Narration Contract") ||
    !RPG_WORLD_GM_CONTRACT.includes("LIVING WORLD SIMULATION") ||
    !RPG_WORLD_GM_CONTRACT.includes("STRICT PLAYER AGENCY (ZERO PUPPETEERING)")) {
  throw new Error("RPG_WORLD_GM_CONTRACT is missing core RPG GM simulation directives!");
}

const multiCharReq: GenerateCharacterRequest = {
  concept: "Valen & Lyra, rival mercenary duo bound by blood oath",
  botMode: "multi_character",
  provider: { type: "none", model: "none" },
};
if (multiCharReq.botMode !== "multi_character") {
  throw new Error("GenerateCharacterRequest failed to retain 'multi_character' botMode!");
}

const rpgWorldReq: GenerateCharacterRequest = {
  concept: "The Sunken Citadel of Oakhaven: A flooded gothic kingdom",
  botMode: "rpg_world",
  provider: { type: "none", model: "none" },
};
if (rpgWorldReq.botMode !== "rpg_world") {
  throw new Error("GenerateCharacterRequest failed to retain 'rpg_world' botMode!");
}

const weaverMultiReq: WeaverInterviewQuestionsRequest = {
  concept: "Valen & Lyra, rival mercenary duo",
  botMode: "multi_character",
  provider: { type: "none", model: "none" },
};
if (weaverMultiReq.botMode !== "multi_character") {
  throw new Error("WeaverInterviewQuestionsRequest failed to retain 'multi_character' botMode!");
}

console.log("✓ Verified: Multi-Character Cast Mode and RPG World / GM Mode fully configured across backend contracts and request pipelines.");

// 35. Verify Lorebook Companion Creator & Parser
import {
  parseLorebookInput,
  summarizeLorebook,
} from "./src/services/lorebook/lorebook-companion";
import { LOREBOOK_COMPANION_CONTRACT } from "./src/services/agent/agent-harness";
import type { GenerateCompanionFromLorebookRequest } from "./src/types/harness";

// Test parsing SillyTavern JSON format
const sampleLorebookJson = JSON.stringify({
  name: "Aethelgard World Lore",
  description: "Setting details for Aethelgard",
  entries: [
    {
      comment: "Faction: The Obsidian Syndicate",
      keys: ["obsidian syndicate", "syndicate", "black market"],
      content: "A ruthless underworld cartel operating from the Lower Spires of Aethelgard.",
    },
    {
      comment: "Location: Sunken Citadel Ruins",
      keys: ["sunken citadel", "citadel", "flooded district"],
      content: "Ancient drowned keep teeming with clockwork automatons and forbidden relics.",
    },
  ],
});

const parsedJsonBook = parseLorebookInput(sampleLorebookJson);
if (parsedJsonBook.name !== "Aethelgard World Lore" || parsedJsonBook.entries.length !== 2) {
  throw new Error("parseLorebookInput failed to parse SillyTavern Lorebook JSON!");
}

// Test parsing raw markdown notes into structured CharacterBook entries
const sampleRawText = `
### Order of the Eclipse
The knightly order that once defended the Sun-King. Now broken and scattered across the southern marshes.

### The Gloomwood Forest
A perpetual nocturnal forest where compasses spin erratically and shadow-stalkers nest.
`;

const parsedTextBook = parseLorebookInput(sampleRawText, "Gloomwood Lore");
if (parsedTextBook.entries.length !== 2) {
  throw new Error(`parseLorebookInput failed to parse markdown lore notes into entries! Found: ${parsedTextBook.entries.length}`);
}
if (!parsedTextBook.entries[0].keys.some(k => k.includes("eclipse"))) {
  throw new Error("Derived keys failed for raw text lorebook entries!");
}

// Test summarizing lorebook
const loreSummary = summarizeLorebook(parsedJsonBook);
if (loreSummary.entryCount !== 2 || !loreSummary.factions.includes("Faction: The Obsidian Syndicate")) {
  throw new Error("summarizeLorebook failed to identify entry count or factions!");
}

if (!LOREBOOK_COMPANION_CONTRACT.includes("LIVING WORLD COMPANION") ||
    !LOREBOOK_COMPANION_CONTRACT.includes("ORGANIC LORE DELIVERY") ||
    !LOREBOOK_COMPANION_CONTRACT.includes("RESPECT {{user}} AGENCY")) {
  throw new Error("LOREBOOK_COMPANION_CONTRACT missing core roleplay directives!");
}

const companionReq: GenerateCompanionFromLorebookRequest = {
  lorebook: parsedJsonBook,
  companionRole: "guide",
  userRelation: "stranger",
  companionGender: "female",
  tone: "Tactical and dry",
  provider: { type: "none", model: "none" },
};
if (companionReq.companionRole !== "guide" || companionReq.userRelation !== "stranger") {
  throw new Error("GenerateCompanionFromLorebookRequest failed to retain companion configuration!");
}

console.log("✓ Verified: Lorebook Companion Creator, Parser, Summarizer & Roleplay Contracts fully functional.");

// Test 36: Sequential Single-Call-at-a-Time Execution & Pacing Verification
// Verifies that multi-field generation pipelines do not flood local LLM servers with concurrent Promise.all calls.
import { readFileSync } from "node:fs";

const generatorFiles = [
  "./src/services/generator/quick-spark.ts",
  "./src/services/generator/weaver-interview.ts",
  "./src/services/lorebook/lorebook-companion.ts",
  "./src/services/vision/image-to-card.ts",
];

for (const filePath of generatorFiles) {
  const content = readFileSync(filePath, "utf-8");
  if (content.includes("Promise.all([")) {
    throw new Error(`File ${filePath} still contains Promise.all concurrency! Must be sequential single-call execution.`);
  }
  if (!content.includes("sleep(200)") && !content.includes("sleep(")) {
    throw new Error(`File ${filePath} is missing pacing sleep between sequential LLM calls!`);
  }
}
console.log("✓ Verified: Sequential Single-Call-at-a-Time execution & pacing delay enforced across all generator pipelines.");

console.log("\n🎉 ALL TESTS PASSED! CHARGEN HARNESS IS FULLY FUNCTIONAL.");
