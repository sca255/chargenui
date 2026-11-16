import type { ProviderConfig, ChatMessage, ToolCallRequest } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { routeLLMCompletion } from "../llm/provider-router";
import { rawHttpPost } from "../llm/llamacpp";
import { UNCENSORED_SYSTEM_PROMPT } from "../generator/uncensored-prompts";
import {
  getEffectiveAgentSystemPrompt,
  getEffectiveAgentCompactPrompt,
  getEffectiveGovernanceContracts,
} from "../config/prompt-config";
import { normalizeRpMacros, normalizeDialogueQuotes } from "../character/macro-engine";
import { parseAgentResponse, CARD_AGENT_TOOL_SCHEMA, type TakeOption } from "./agent-tools";
import { retrieveCharacterLore } from "../search/web-search";
import { getEraById, getAllEras, searchErasSemantic } from "../eras/eras-service";

const OPENAI_COMPAT_TYPES = new Set(["llamacpp", "openai", "openrouter", "ollama"]);

function resolveOpenAICompatEndpoint(config: ProviderConfig): { url: string; apiKey: string } {
  let baseUrl = config.baseUrl;
  let apiKey = config.apiKey;

  if (config.type === "openrouter") {
    baseUrl = baseUrl || "https://openrouter.ai/api/v1";
    apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  } else if (config.type === "ollama") {
    baseUrl = baseUrl || "http://localhost:11434/v1";
    apiKey = apiKey || "ollama";
  } else if (config.type === "llamacpp") {
    baseUrl = baseUrl || "http://127.0.0.1:8080/v1";
    apiKey = apiKey || "not-needed";
  } else {
    baseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  baseUrl = (baseUrl || "").replace(/\/+$/, "");
  return { url: `${baseUrl}/chat/completions`, apiKey: apiKey || "" };
}

interface CardAgentReply {
  content: string;
  rawToolCalls?: ToolCallRequest[];
}

async function postCardAgentChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  useNativeTools: boolean
): Promise<CardAgentReply> {
  if (useNativeTools && OPENAI_COMPAT_TYPES.has(config.type)) {
    const { url, apiKey } = resolveOpenAICompatEndpoint(config);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = "Bearer " + apiKey;
    if (config.type === "openrouter") {
      headers["HTTP-Referer"] = "https://github.com/chargenui/chargenui";
      headers["X-Title"] = "CharGen Harness";
    }

    const payloadBody: Record<string, unknown> = {
      model: config.model || "llama-server",
      messages,
      temperature: config.temperature ?? 0.85,
      max_tokens: config.maxTokens ?? 4096,
      tools: CARD_AGENT_TOOL_SCHEMA,
    };

    if (process.env.DEBUG_AGENT_TOOLS || process.env.NODE_ENV === "development") {
      console.log("\n================ [DEBUG AGENT OUTGOING REQUEST] ================");
      console.log(`Endpoint: ${url}`);
      console.log(`Model: ${payloadBody.model}`);
      console.log(`System Prompt:\n${messages.find((m) => m.role === "system")?.content}`);
      console.log(`Tools Array:\n${JSON.stringify(CARD_AGENT_TOOL_SCHEMA, null, 2)}`);
      console.log("=================================================================\n");
    }

    // 30 minute timeout (1,800,000 ms) via lower-level streaming HTTP request with TCP keep-alive
    const timeoutMs = 30 * 60 * 1000;
    const rawRes = await rawHttpPost(url, headers, payloadBody, timeoutMs);

    if (rawRes.status < 200 || rawRes.status >= 300) {
      if (rawRes.status === 400 || rawRes.status === 422) {
        console.warn(`Server rejected native tools with HTTP ${rawRes.status}; falling back to non-tool completion`);
        const fallbackText = await routeLLMCompletion(config, messages);
        return { content: fallbackText };
      }
      throw new Error(`LLM returned HTTP ${rawRes.status}: ${rawRes.text.slice(0, 300)}`);
    }

    const data = JSON.parse(rawRes.text) as any;
    const msg = data?.choices?.[0]?.message || {};
    const rawToolCalls: ToolCallRequest[] | undefined = Array.isArray(msg.tool_calls) ? msg.tool_calls : undefined;
    const visibleContent = typeof msg.content === "string" ? msg.content : "";

    if (process.env.DEBUG_AGENT_TOOLS || process.env.NODE_ENV === "development") {
      console.log("\n================ [DEBUG AGENT INCOMING RESPONSE] ================");
      console.log(`Content:\n${visibleContent || "(empty)"}`);
      console.log(`Tool Calls:\n${rawToolCalls ? JSON.stringify(rawToolCalls, null, 2) : "none"}`);
      console.log("=================================================================\n");
    }

    return { content: visibleContent, rawToolCalls };
  }

  const rawText = await routeLLMCompletion(config, messages);
  return { content: typeof rawText === "string" ? rawText : String(rawText || "") };
}

export type ModifiableField =
  | "name"
  | "tags"
  | "description"
  | "personality"
  | "scenario"
  | "first_mes"
  | "mes_example"
  | "alternate_greetings"
  | "post_history_instructions"
  | "creator_notes"
  | "advice_only";

export interface TargetedSelection {
  field: ModifiableField;
  selectedText: string;
}

export interface AgentModifyRequest {
  character: RoleplayCharacter;
  userPrompt: string;
  targetFields?: ModifiableField[];
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  provider: ProviderConfig;
  enforceNaturalVoice?: boolean;
  pinnedDirectives?: string[];
  twoTakes?: boolean;
  targetedSelection?: TargetedSelection;
  /** When true (or when vanilla mode requested), suppresses reading/searching NSFL eras and content */
  filterNsfl?: boolean;
}

export interface FieldChange {
  field: ModifiableField;
  before: any;
  after: any;
  explanation: string;
  action?: "add" | "update" | "delete";
  index?: number;
}

export interface AgentModifyResponse {
  character: RoleplayCharacter;
  changes: FieldChange[];
  agentMessage: string;
  appliedFields: ModifiableField[];
  takes?: TakeOption[];
}

const AGENT_MAX_FIELD_CHARS = 24000;
const AGENT_MAX_HISTORY_TURNS = 8;
const AGENT_MAX_HISTORY_MESSAGE_CHARS = 8000;
const AGENT_MAX_ARRAY_ITEMS = 32;

function limitAgentText(value: unknown, maxChars: number): string {
  const text = typeof value === "string" ? value : String(value ?? "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[truncated for model context]`;
}

function limitAgentArray(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.slice(0, AGENT_MAX_ARRAY_ITEMS).map((item) =>
    typeof item === "string"
      ? limitAgentText(item, AGENT_MAX_FIELD_CHARS)
      : limitAgentText(JSON.stringify(item), AGENT_MAX_FIELD_CHARS)
  );
}

export const NATURAL_SPOKEN_DIALOGUE_CONTRACT = `[Natural Spoken Dialogue Contract:
- Dialogue must feel spoken aloud by a real, living human being—grounded, casual, and authentic.
- Use natural contractions (don't, can't, it's, won't), brief pauses, and informal conversational rhythm.
- STRICTLY BANNED in casual/domestic conversation: Do NOT use pseudo-academic jargon, statistical metaphors, or clinical vocabulary for ordinary human actions (NEVER say "statistical anomaly", "mathematically unsound", "nutrient density", "altering my trajectory", "inefficiency of your chaos"). Smart, haughty, or divine characters show superiority or distance through dry sarcasm, razor wit, bored sighs, and casual dismissals—NOT dictionary lectures.
- Never puppeteer or speak for {{user}}.]`;

export const MULTI_CHARACTER_GOVERNANCE_CONTRACT = `[Multi-Character Cast Governance Contract:
- MULTI-VOICE INTEGRITY: Each character in the cast maintains a distinct personality, vocal cadence, motive, and reaction threshold. NEVER blend characters into an agreeable monolith or chorus.
- INTER-CHARACTER DYNAMICS: The characters have independent relationships, rivalries, alliances, and history with EACH OTHER, not just with {{user}}. They may interrupt, tease, argue, contradict, or back each other up.
- SPEAKER IDENTIFICATION: Clearly identify who is speaking or acting (e.g. using character names in narrative tags or dialogue prefixes) so {{user}} always knows who is performing each action.
- INDEPENDENT MOTIVATIONS: Cast members must not all share the same opinion of {{user}}. Some may be suspicious, some warm, some indifferent, some mocking.
- ZERO PUPPETEERING: Strictly never write {{user}}'s dialogue, inner monologue, reactions, or choices. Control only the cast members and the environment.
- NATURAL SPOKEN DIALOGUE: All characters speak with natural contractions, authentic rhythm, and situational vocabulary. Avoid robotic or identical cadence across members.]`;

export const RPG_WORLD_GM_CONTRACT = `[RPG World & Game Master Narration Contract:
- LIVING WORLD SIMULATION: Act as the Game Master and living world arbiter. Narrate the environment, weather, physics, NPC behaviors, and consequences of actions impartially and dynamically.
- STRICT PLAYER AGENCY (ZERO PUPPETEERING): NEVER dictate {{user}}'s actions, speech, internal thoughts, or emotional reactions. Present the world, challenges, and NPC responses, then leave the decision completely to {{user}}.
- DYNAMIC ADJUDICATION: Evaluate the feasibility and difficulty of {{user}}'s actions realistically based on the world rules. Success is not automatic; hazards, complications, and realistic setbacks make the world alive and thrilling.
- ATMOSPHERIC & TACTILE PROSE: Deliver vivid sensory descriptions (sounds, smells, temperatures, textures, lighting) to bring the setting to life without falling into purple prose or academic lecture tone.
- PROMPT FOR ACTION: At the end of reactive turns where a scene unfolds or tension peaks, conclude with an evocative situation prompt inviting {{user}}'s next move (e.g., "**What do you do?**").]`;

export const LOREBOOK_COMPANION_CONTRACT = `[Lorebook Companion Roleplay Contract:
- LIVING WORLD COMPANION: You are {{char}}, an authentic native companion, guide, or partner journeying through this world with {{user}}.
- ORGANIC LORE DELIVERY: You possess deep knowledge of the world's factions, locations, relics, taboos, and hazards. Share lore organically through personal memory, warnings, street rumors, or superstitions. NEVER sound like a detached narrator or read lorebook entries like an encyclopedia.
- RESPECT {{user}} AGENCY: NEVER puppeteer {{user}}'s speech, movements, decisions, or emotional responses. You may advise, warn, tease, or question, but {{user}} decides their own actions.
- LIVING REACTIONS: Express clear personal opinions, biases, and emotional stakes about world factions, historical events, and local figures.
- NATURAL SPOKEN DIALOGUE: Speak with natural human cadence, contractions (don't, it's, won't), and situational vocabulary.]`;

export const CHARGEN_ROLEPLAY_CONTRACT = `[ROLEPLAY RULES & CHARACTER INTEGRITY:
- ZERO PUPPETEERING: Never dictate {{user}}'s speech, thoughts, feelings, or choices. Control only {{char}} and the direct environment.
- EMBODIED PERSPECTIVE: Narrate from {{char}}'s distinct voice, lens, and personal biases. Never sound like a detached neutral camera.
- PERSISTENT CHARACTER: Keep {{char}}'s internal contradictions and boundaries intact. Do not flatten {{char}} into an overly agreeable or compliant assistant.
- SENSORY ACTION OVER RECITAL: Integrate physical and environmental details into ongoing action rather than listing appearance traits like a specification sheet.
- NATURAL DIALOGUE: Use natural spoken cadence and contractions. Avoid melodramatic sighs, clinical vocabulary, and repeating {{user}}'s statements back to them.]

${NATURAL_SPOKEN_DIALOGUE_CONTRACT}`;

export const WEAVER_GOVERNANCE_CONTRACT = CHARGEN_ROLEPLAY_CONTRACT;

const AGENT_SYSTEM_PROMPT_BASE = `${UNCENSORED_SYSTEM_PROMPT}
You are an expert AI Character Architect and Creative Director operating in AGENT MODE for the CharGen Harness.
Your duty is to act as an elite conversational co-writer and character doctor: chatting naturally with the user, answering questions, exploring creative directions, offering critiques, and modifying, refining, or restructuring roleplay character cards according to the user's exact instructions.

CRITICAL OPERATIONAL RULES:
1. CONVERSATIONAL AGENT & CREATIVE CONSULTANT:
   - You engage in a natural, collaborative, multi-turn dialogue with the user.
   - If the user is asking a question, brainstorming ideas, requesting a critique, or exploring alternatives, answer thoughtfully and thoroughly in your conversational text.
   - If the user asks you to modify, rewrite, adjust, or fix character card fields, invoke the appropriate tools and explain your choices in your response.
   - You may modify one field or multiple fields simultaneously if needed (e.g. updating both personality and dialogue examples).
   - Only modify fields that actually need updating. Leave untouched fields alone.

2. ABSOLUTE NATURAL SPOKEN DIALOGUE MANDATE:
   - AI roleplay characters frequently suffer from "Thesaurus/Spock Syndrome" (unnatural, robotic, pseudo-intellectual speeches; using words like "statistical anomaly", "mathematically unsound", "nutrient density", or speaking like an academic lecture in everyday casual moments).
   - Unless explicitly instructed to be a literal machine/robot, ALL characters—even divine beings, arrogant scholars, cold mercenaries, and tsunderes—MUST have natural, grounded, spoken English cadence.
   - They use natural contractions (don't, can't, it's, won't), brief reactive phrases, dry pauses, and casual human phrasing.
   - They show arrogance or intelligence through razor wit, dry sarcasm, bored dismissals, and subtle perceptiveness—NEVER cartoonish clinical jargon.
   - ALWAYS ensure 'post_history_instructions' enforces natural spoken cadence and strictly bans clinical vocabulary for domestic actions.

3. CARD HYGIENE & STRICTLY EMPTY SYSTEM PROMPT:
   - 'system_prompt' must ALWAYS remain strictly empty (""). All uncensored roleplay rules and voice constraints belong in 'post_history_instructions'.
   - Maintain proper SillyTavern / CCv3 macros: always use '{{char}}' for the character and '{{user}}' for the player.
   - Maintain third-person limited perspective in first message and greetings. Never puppeteer {{user}}.

4. FIELD FORMATTING SPECIFICATIONS (WEAVER PSYCHOMETRICS):
   - 'description': Follow the existing card format. If Tagged Bundle, use [CORE], [ARC], [FORM], [TENSIONS], [INTENT], [NEGATIVE SPACE]. (NEVER include [GRADIENT] or reaction gradient bullets in the description; reaction gradients belong solely in the authoring blueprint/spine). If Boostyle, use [Character("Name"){...}]. NEVER write melodramatic purple prose essays ("functions as a high-performance engine of domestic perfection", "fortress to guard a heart", "the Broken Promise").
   - 'personality': Performable Voice & Language spec sheet: register & dialect, sentence rhythm, natural contractions, characteristic lexicon, forbidden words, physical mannerisms while speaking. STRICTLY BAN cartoon anime quotes ("It's not like I did this for you", "Honestly!") and clinical Spock vocabulary.
   - 'first_mes': Voiced third-person limited starting in motion pursuing scene-objective, double-quote dialogue, zero {{user}} puppeteering. NEVER write in first person ("I").
   - 'creator_notes': Human-only metadata (user concept, author notes). NEVER AI steering.
   - 'post_history_instructions': CharGen roleplay governance contracts (Roleplay Rules & Character Integrity, Natural Spoken Dialogue Contract).`;

const AGENT_SYSTEM_PROMPT_XML_FALLBACK = `${AGENT_SYSTEM_PROMPT_BASE}

5. AGENT TOOLS & EMISSION FORMAT:
   You have powerful tools to inspect, update, and craft this character card. You can invoke tools in either of two formats:

   FORMAT A: TOOL ACTION TAGS:
   To update a card field:
   <tool:update_field name="[field_name]" explanation="[brief explanation of why this was changed]">
   [Full updated content for this field. Spoken dialogue quotes like "Hello" require ZERO backslash-escaping!]
   </tool:update_field>

   Valid field names: description, personality, scenario, first_mes, mes_example, post_history_instructions, tags, name, creator_notes.
   DO NOT update 'alternate_greetings' with update_field. To modify greetings, you MUST use the granular greetings tools below so individual greetings are never overwritten by mistake.

   GRANULAR ALTERNATE GREETINGS TOOLS (Container-Leaf addressing — preserves existing greetings):
   - Append a new alternate greeting without touching existing greetings:
     <tool:add_alternate_greeting explanation="Rainy encounter">
     [Complete alternate opening scene in third-person limited with spoken dialogue]
     </tool:add_alternate_greeting>
   - Update a single existing alternate greeting by its 0-based index:
     <tool:update_alternate_greeting index="0" explanation="Deepened psychological tension">
     [Refined greeting content]
     </tool:update_alternate_greeting>
   - Delete a single stale alternate greeting by its 0-based index:
     <tool:delete_alternate_greeting index="1" explanation="Removed redundant encounter" />
   - Prepend a framing header (lore prefix, scene primer) to ONE or ALL greetings without re-emitting entire texts:
     <tool:prepend_alternate_greeting_header index="all" explanation="Prepended atmosphere primer">
     [Header text to prepend]
     </tool:prepend_alternate_greeting_header>
   - Append a contextual footer (cliffhanger, spoken quote) to ONE or ALL greetings without re-emitting entire texts:
     <tool:append_alternate_greeting_footer index="all" explanation="Appended cliffhanger prompt">
     [Footer text to append]
     </tool:append_alternate_greeting_footer>

   ERA DATABASE TOOLS (Read & explore existing settings from eras_db.json):
   - Read the complete worldbuilding specification of any existing era:
     <tool:read_era id="floating_sky_citadel_haven" />
   - Search the 123+ existing eras:
     <tool:list_eras query="fantasy" />
   - Search by category (e.g. Fantasy, Medieval, Victorian) or list available categories:
     <tool:list_eras category="Fantasy" />
     <tool:list_era_categories />

   To search fandom or canon lore (if you need canon facts, abilities, or headcanons to ground your edit):
   <tool:search_lore query="[character name and topic to research]" />

   Your conversational explanation, critique, and commentary to the user goes naturally in your response text outside the tool tags.
`;

const AGENT_SYSTEM_PROMPT_NATIVE = `${AGENT_SYSTEM_PROMPT_BASE}

5. NATIVE TOOL USAGE:
   You drive card edits by calling the provided native tools (update_field, add_alternate_greeting, update_alternate_greeting, delete_alternate_greeting, prepend_alternate_greeting_header, append_alternate_greeting_footer, search_lore, read_era, list_eras, list_era_categories).
   - Use update_field for updating description, personality, scenario, first_mes, mes_example, post_history_instructions, tags, name, or creator_notes.
   - For alternate greetings, never overwrite the whole array via update_field.
   - When the user asks to edit, revise, rewrite, fix, or polish an existing alternate greeting, ALWAYS call update_alternate_greeting with the 0-based index of that greeting (e.g. Greeting #1 / first greeting is index 0, Greeting #2 is index 1, etc.).
   - ONLY call add_alternate_greeting when the user explicitly requests a NEW, additional, or extra greeting.
   - Call delete_alternate_greeting with its 0-based index to remove an unwanted or obsolete greeting.
   - Use prepend_alternate_greeting_header or append_alternate_greeting_footer to attach a prefix or suffix to a specific greeting (index: "0") or to ALL 50 greetings at once (index: "all") without having to re-emit thousands of tokens!
   - Provide your conversational summary, advice, or critique to the user in your message content alongside your tool calls.
`;

/**
 * Executes an Agent modification task on a RoleplayCharacter.
 */
export async function executeAgentModify(req: AgentModifyRequest): Promise<AgentModifyResponse> {
  const {
    character,
    userPrompt,
    targetFields,
    chatHistory = [],
    provider,
    enforceNaturalVoice = true,
    pinnedDirectives = [],
    twoTakes = false,
    targetedSelection,
  } = req;
  const charName = character.name || "Custom Character";

  const useTagFallback = Boolean(process.env.CARD_AGENT_ALLOW_TAG_FALLBACK);
  const systemPrompt =
    getEffectiveAgentSystemPrompt(useTagFallback ? "xml" : "native", provider) ||
    (useTagFallback ? AGENT_SYSTEM_PROMPT_XML_FALLBACK : AGENT_SYSTEM_PROMPT_NATIVE);

  // Build card representation for agent
  const cardSnapshot: Record<string, any> = {
    name: limitAgentText(character.name, 2000),
    tags: limitAgentArray(character.tags),
    description: limitAgentText(character.description, AGENT_MAX_FIELD_CHARS),
    personality: limitAgentText(character.personality, AGENT_MAX_FIELD_CHARS),
    scenario: limitAgentText(character.scenario, AGENT_MAX_FIELD_CHARS),
    first_mes: limitAgentText(character.first_mes, AGENT_MAX_FIELD_CHARS),
    mes_example: limitAgentText(character.mes_example, AGENT_MAX_FIELD_CHARS),
    alternate_greetings: limitAgentArray(character.alternate_greetings),
    post_history_instructions: limitAgentText(character.post_history_instructions, AGENT_MAX_FIELD_CHARS),
    creator_notes: limitAgentText(character.creator_notes, AGENT_MAX_FIELD_CHARS),
  };

  const isAdviceOnly = targetFields && targetFields.includes("advice_only");
  const scopeInstruction = isAdviceOnly
    ? "TARGET FIELD SCOPE: Chat & Consultation only. Answer the user's questions, critique the card, or offer creative suggestions. DO NOT update any card fields."
    : targetFields && targetFields.length > 0
    ? `TARGET FIELD SCOPE: The user specified that edits should primarily focus on: [${targetFields.join(", ")}]. You may also touch directly coupled fields if essential.`
    : useTagFallback
    ? "TARGET FIELD SCOPE: Auto-Detect. If the user wants card modifications, update all and only the relevant fields using <tool:update_field>. If the user is asking a conversational question or brainstorming, converse in plain text without tool tags."
    : "TARGET FIELD SCOPE: Auto-Detect. If the user wants card modifications, call the appropriate tools (update_field, add/update/delete_alternate_greeting). If the user is asking a conversational question or brainstorming, converse in plain text without tool calls.";

  const pinnedBlock =
    pinnedDirectives && pinnedDirectives.length > 0
      ? `\n\nUSER'S PINNED DIRECTIVES / WORKING MEMORY (PERSISTENT NON-NEGOTIABLE RULES):\n${pinnedDirectives.map((d, i) => `${i + 1}. ${d}`).join("\n")}\nMaintain strict adherence to these persistent rules across all edits and advice!`
      : "";

  const targetedBlock =
    targetedSelection && targetedSelection.selectedText
      ? `\n\nTARGETED SELECTION FOCUS (DOCTOR THIS SNIPPET):\nThe user specifically highlighted the following snippet in field "${targetedSelection.field}":\n"""\n${targetedSelection.selectedText}\n"""\nFocus your edits specifically on improving, refining, or replacing this snippet within the context of the field. Return the full field with your refined snippet integrated.`
      : "";

  const takesBlock = twoTakes
    ? `\n\nCREATIVE DIRECTION - TWO DISTINCT TAKES (Take A vs Take B):\nThe user requested TWO DISTINCT creative directions for this modification. Generate two distinct alternatives (e.g. Take A with one emotional/stylistic angle, and Take B with a contrasting angle).\nEmit both takes using the following tags:\n<take name="A" title="[Short Title of Take A]" field="[field_name]" explanation="[why this angle works]">\n[Full content for Take A]\n</take>\n\n<take name="B" title="[Short Title of Take B]" field="[field_name]" explanation="[why this angle works]">\n[Full content for Take B]\n</take>\nIn your agent message, briefly compare Take A and Take B so the user can choose which one to apply.`
    : "";

  const historyMessages: ChatMessage[] = chatHistory.slice(-AGENT_MAX_HISTORY_TURNS).map((m) => ({
    role: m.role,
    content: limitAgentText(m.content, AGENT_MAX_HISTORY_MESSAGE_CHARS),
  }));

  let dbEraContext = "";
  const lowerPrompt = userPrompt.toLowerCase();
  if (
    lowerPrompt.includes("existing") ||
    lowerPrompt.includes("read era") ||
    lowerPrompt.includes("list era") ||
    lowerPrompt.includes("eras_db") ||
    lowerPrompt.includes("show era")
  ) {
    const all = getAllEras(true);
    const matched = Object.values(all).filter((e) => {
      return lowerPrompt.includes(e.id.toLowerCase()) || lowerPrompt.includes(e.name.toLowerCase());
    });
    const sample = (matched.length > 0 ? matched : Object.values(all)).slice(0, 4);
    dbEraContext =
      `\n\n[DATABASE TOOL CONTEXT - EXISTING ERAS FROM eras_db.json]:\n` +
      sample
        .map(
          (e) =>
            `• ID: '${e.id}' | Title: '${e.name}' | Region: '${e.region}' | Span: '${e.span}'\n  Tags: ${(e.tags || []).join(", ")}`
        )
        .join("\n\n");
  }

  const promptInstruction = useTagFallback
    ? "Please analyze the request, determine which fields need updating, apply the modifications using tool action tags (<tool:update_field name=\"...\">), and provide your explanation to the user."
    : "Please analyze the request, determine which fields need updating, call the appropriate tools (update_field, add/update/delete_alternate_greeting), and provide your explanation to the user.";

  // Context Caching Optimization:
  // Pinned system prompt is index 0.
  // Pinned base character card snapshot is pinned at index 1 as a static system/context reference.
  // Prior conversational history follows strictly in index 2..N.
  // Ephemeral user wishes and turn-specific directives remain at the very end.
  const staticCardContext = `CURRENT BASE CHARACTER CARD STATE:
\`\`\`json
${JSON.stringify(cardSnapshot, null, 2)}
\`\`\``;

  const userTurn = `${scopeInstruction}${pinnedBlock}${targetedBlock}${takesBlock}${dbEraContext}

USER'S WISHES / MODIFICATION REQUEST:
"""
${userPrompt}
"""

${promptInstruction}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: staticCardContext },
    ...historyMessages,
    { role: "user", content: userTurn },
  ];

  const firstReply = await postCardAgentChat(provider, messages, !useTagFallback);
  let parsed = parseAgentResponse(firstReply.content, firstReply.rawToolCalls);

  // If assistant returned native tool calls, record assistant message in history
  if (firstReply.rawToolCalls && firstReply.rawToolCalls.length > 0) {
    messages.push({
      role: "assistant",
      content: firstReply.content || "",
      tool_calls: firstReply.rawToolCalls,
    });
  } else {
    messages.push({ role: "assistant", content: firstReply.content });
  }

  // Handle tool calls in native mode (including rejections and lookups)
  const rejectedGreetingCalls = parsed.toolCalls.filter(
    (t) => t.name === "update_field" && t.args?.error && t.id
  );
  const lookupCalls = parsed.toolCalls.filter((t) =>
    ["search_lore", "read_era", "list_eras", "list_era_categories"].includes(t.name)
  );

  const needsFollowup = rejectedGreetingCalls.length > 0 || lookupCalls.length > 0;

  if (needsFollowup) {
    for (const call of rejectedGreetingCalls) {
      if (call.id) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            ok: false,
            error: "Rejected: Do not update alternate_greetings via update_field. Use add_alternate_greeting, update_alternate_greeting or delete_alternate_greeting instead.",
          }),
        });
      }
    }

    for (const call of lookupCalls) {
      let resultData: any = {};
      if (call.name === "search_lore" && call.args.query) {
        try {
          const loreResult = await retrieveCharacterLore({
            query: call.args.query,
            provider,
          });
          resultData = { ok: true, lore: loreResult.condensedLore || loreResult.canonLore || "(no lore found)" };
        } catch (searchErr) {
          resultData = { ok: false, error: (searchErr as Error).message };
        }
      } else if (call.name === "read_era" && call.args.id) {
        const era = getEraById(call.args.id, req.filterNsfl ?? false);
        resultData = era
          ? { ok: true, id: era.id, name: era.name, span: era.span, region: era.region, aesthetic: era.aesthetic, social_codes: era.social_codes }
          : { ok: false, error: `Era '${call.args.id}' not found.` };
      } else if (call.name === "list_eras") {
        const query = call.args.query || "";
        const category = call.args.category || "All";
        const results = searchErasSemantic(query, category, "All", false, req.filterNsfl ?? false);
        resultData = { ok: true, eras: results.slice(0, 8).map((e) => ({ id: e.id, name: e.name, category: e.category || "Era" })) };
      } else if (call.name === "list_era_categories") {
        const { getEraCategories } = await import("../eras/eras-service");
        const cats = getEraCategories(true);
        resultData = { ok: true, categories: cats.map((c) => ({ name: c.name, count: c.count })) };
      }

      if (call.id) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(resultData),
        });
      } else {
        messages.push({
          role: "user",
          content: `TOOL RESULT [${call.name}]:\n"""\n${JSON.stringify(resultData, null, 2)}\n"""\nNow please proceed to apply card updates using tools.`,
        });
      }
    }

    const secondReply = await postCardAgentChat(provider, messages, !useTagFallback);
    const secondParsed = parseAgentResponse(secondReply.content, secondReply.rawToolCalls);

    parsed = {
      agentMessage: secondParsed.agentMessage || parsed.agentMessage,
      updatedFields: { ...parsed.updatedFields, ...secondParsed.updatedFields },
      explanations: { ...parsed.explanations, ...secondParsed.explanations },
      toolCalls: [...parsed.toolCalls, ...secondParsed.toolCalls],
      usedToolTags: parsed.usedToolTags || secondParsed.usedToolTags,
      greetingActions: [...(parsed.greetingActions || []), ...(secondParsed.greetingActions || [])],
    };
  }

  const updatedFields = parsed.updatedFields || {};
  const explanations = parsed.explanations || {};
  const updatedChar: RoleplayCharacter = { ...character };
  const changes: FieldChange[] = [];
  const appliedFields: ModifiableField[] = [];

  const modifiableKeys: Exclude<ModifiableField, "advice_only" | "alternate_greetings">[] = [
    "name",
    "tags",
    "description",
    "personality",
    "scenario",
    "first_mes",
    "mes_example",
    "post_history_instructions",
    "creator_notes",
  ];

  for (const key of modifiableKeys) {
    if (key in updatedFields && updatedFields[key] !== undefined) {
      let val = updatedFields[key];
      const beforeVal = (character as any)[key];

      // Macro & Quote normalization
      if (typeof val === "string") {
        val = normalizeRpMacros(val, charName);
        if (key === "first_mes" || key === "mes_example") {
          val = normalizeDialogueQuotes(val);
        }
      } else if (Array.isArray(val) && key === "alternate_greetings") {
        val = val.map((g: string) => normalizeDialogueQuotes(normalizeRpMacros(g, charName)));
      }

      // Check if actually changed
      const hasChanged = JSON.stringify(val) !== JSON.stringify(beforeVal);
      if (hasChanged) {
        (updatedChar as any)[key] = val;
        appliedFields.push(key);
        changes.push({
          field: key,
          before: beforeVal,
          after: val,
          explanation: explanations[key] || `Updated ${key} to fulfill user request.`,
        });
      }
    }
  }

  // Handle granular greeting actions (from <tool:add_alternate_greeting>, <tool:update_alternate_greeting>, <tool:delete_alternate_greeting>)
  if (parsed.greetingActions && parsed.greetingActions.length > 0) {
    const existingAlts = Array.isArray(updatedChar.alternate_greetings)
      ? [...updatedChar.alternate_greetings]
      : [];
    const beforeAlts = [...existingAlts];

    for (const ga of parsed.greetingActions) {
      if (ga.action === "add" && ga.content) {
        const normalized = normalizeDialogueQuotes(normalizeRpMacros(ga.content, charName));
        const insertIdx = ga.index !== undefined && ga.index >= 0 && ga.index <= existingAlts.length
          ? ga.index
          : existingAlts.length;
        existingAlts.splice(insertIdx, 0, normalized);
        changes.push({
          field: "alternate_greetings",
          before: "(none - newly added)",
          after: normalized,
          explanation: ga.explanation || `Added alternate greeting #${insertIdx + 1}`,
          action: "add",
          index: insertIdx,
        });
      } else if (ga.action === "update" && ga.content) {
        const rawIdx = ga.index !== undefined ? parseInt(String(ga.index), 10) : 0;
        const targetIdx = Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < existingAlts.length
          ? rawIdx
          : existingAlts.length > 0 ? 0 : -1;

        if (targetIdx >= 0 && targetIdx < existingAlts.length) {
          const beforeGreeting = existingAlts[targetIdx];
          const normalized = normalizeDialogueQuotes(normalizeRpMacros(ga.content, charName));
          existingAlts[targetIdx] = normalized;
          changes.push({
            field: "alternate_greetings",
            before: beforeGreeting,
            after: normalized,
            explanation: ga.explanation || `Updated alternate greeting #${targetIdx + 1}`,
            action: "update",
            index: targetIdx,
          });
        }
      } else if (ga.action === "delete") {
        const rawIdx = ga.index !== undefined ? parseInt(String(ga.index), 10) : -1;
        if (Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < existingAlts.length) {
          const beforeGreeting = existingAlts[rawIdx];
          existingAlts.splice(rawIdx, 1);
          changes.push({
            field: "alternate_greetings",
            before: beforeGreeting,
            after: "(deleted)",
            explanation: ga.explanation || `Deleted alternate greeting #${rawIdx + 1}`,
            action: "delete",
            index: rawIdx,
          });
        }
      } else if (ga.action === "prepend_header" && ga.content) {
        const headerText = normalizeRpMacros(ga.content, charName).trim();
        const isAll = ga.index === "all" || ga.index === undefined || ga.index === -1;
        const targetIndices = isAll
          ? existingAlts.map((_, i) => i)
          : typeof ga.index === "number" && ga.index >= 0 && ga.index < existingAlts.length
          ? [ga.index]
          : [];

        for (const idx of targetIndices) {
          const beforeGreeting = existingAlts[idx];
          const combined = `${headerText}\n\n${beforeGreeting}`.trim();
          existingAlts[idx] = combined;
          changes.push({
            field: "alternate_greetings",
            before: beforeGreeting,
            after: combined,
            explanation: ga.explanation || `Prepended header to greeting #${idx + 1}`,
            action: "update",
            index: idx,
          });
        }
      } else if (ga.action === "append_footer" && ga.content) {
        const footerText = normalizeRpMacros(ga.content, charName).trim();
        const isAll = ga.index === "all" || ga.index === undefined || ga.index === -1;
        const targetIndices = isAll
          ? existingAlts.map((_, i) => i)
          : typeof ga.index === "number" && ga.index >= 0 && ga.index < existingAlts.length
          ? [ga.index]
          : [];

        for (const idx of targetIndices) {
          const beforeGreeting = existingAlts[idx];
          const combined = `${beforeGreeting}\n\n${footerText}`.trim();
          existingAlts[idx] = combined;
          changes.push({
            field: "alternate_greetings",
            before: beforeGreeting,
            after: combined,
            explanation: ga.explanation || `Appended footer to greeting #${idx + 1}`,
            action: "update",
            index: idx,
          });
        }
      }
    }

    if (JSON.stringify(existingAlts) !== JSON.stringify(beforeAlts)) {
      updatedChar.alternate_greetings = existingAlts;
      if (!appliedFields.includes("alternate_greetings")) {
        appliedFields.push("alternate_greetings");
      }
    }
  }

  // Ensure post_history_instructions has Weaver Governance & Natural Spoken Dialogue Contract if natural voice is enforced
  if (enforceNaturalVoice) {
    const currentPost = updatedChar.post_history_instructions || "";
    if (!currentPost.includes("ROLEPLAY RULES & CHARACTER INTEGRITY") && !currentPost.includes("weaver_deliberation") && !currentPost.includes("Natural Spoken Dialogue Contract")) {
      const mergedPost = currentPost
        ? `${currentPost}\n\n${WEAVER_GOVERNANCE_CONTRACT}`
        : WEAVER_GOVERNANCE_CONTRACT;
      if (mergedPost !== currentPost) {
        const beforePost = updatedChar.post_history_instructions;
        updatedChar.post_history_instructions = mergedPost;
        if (!appliedFields.includes("post_history_instructions")) {
          appliedFields.push("post_history_instructions");
          changes.push({
            field: "post_history_instructions",
            before: beforePost,
            after: mergedPost,
            explanation: "Injected Weaver Governance and Natural Spoken Dialogue Contract to maintain internal tension and prevent robotic dialogue in SillyTavern/Lumiverse.",
          });
        }
      }
    }
  }

  // Strictly enforce empty system_prompt
  updatedChar.system_prompt = "";

  // Normalize quotes and macros on any creative takes
  const normalizedTakes = parsed.takes?.map((t) => ({
    ...t,
    content:
      t.field === "first_mes" || t.field === "mes_example"
        ? normalizeDialogueQuotes(normalizeRpMacros(t.content, charName))
        : normalizeRpMacros(t.content, charName),
  }));

  return {
    character: updatedChar,
    changes,
    agentMessage: parsed.agentMessage || "I have analyzed your request and updated the character card accordingly.",
    appliedFields,
    takes: normalizedTakes,
  };
}

export interface AgentCompactRequest {
  provider: ProviderConfig;
  chatHistory: { role: string; content: string }[];
  characterName?: string;
}

export interface AgentCompactResponse {
  summary: string;
  compactedHistory: { role: "user" | "assistant"; content: string; time?: string }[];
}

/**
 * Summarizes an extended agent conversation using AI into an authoritative working memory checkpoint.
 */
export async function executeAgentCompact(req: AgentCompactRequest): Promise<AgentCompactResponse> {
  const { provider, chatHistory, characterName } = req;
  const validHistory = (chatHistory || []).filter((m) => m && m.content && m.content.trim());

  if (validHistory.length === 0) {
    return {
      summary: "No prior conversation to compact.",
      compactedHistory: [],
    };
  }

  const name = characterName || "the character";
  const formattedTranscript = validHistory
    .map((m, i) => `Turn ${i + 1} [${m.role.toUpperCase()}]:\n${m.content}`)
    .join("\n\n");

  const promptMessages: ChatMessage[] = [
    {
      role: "system",
      content: getEffectiveAgentCompactPrompt(provider).replace(/\$\{name\}/g, name).replace(/"the character"/g, `"${name}"`),
    },
    {
      role: "user",
      content: `Here is the multi-turn agent conversation transcript:\n\n${formattedTranscript}\n\nProvide the consolidated executive summary:`,
    },
  ];

  const summary = await routeLLMCompletion(provider, promptMessages, {
    temperature: 0.3,
    maxTokens: 500,
  });

  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const compactedHistory: { role: "user" | "assistant"; content: string; time?: string }[] = [
    {
      role: "user",
      content: `[CONVERSATION COMPACTED - PREVIOUS TURNS SUMMARY]:\n${summary.trim()}`,
      time: nowTime,
    },
    {
      role: "assistant",
      content: `Understood. I have consolidated our prior engineering decisions into working memory. Ready to proceed with refining ${name}.`,
      time: nowTime,
    },
  ];

  return {
    summary: summary.trim(),
    compactedHistory,
  };
}
