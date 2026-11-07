// Agent Tool Calling & Action Dispatch Engine
// Enables multi-step tool execution, native OpenAI-style tool calls, resilient non-JSON action tags,
// and automatic recovery so that a JSON decode failure never destroys 15 minutes of tokens.

import { safeParseJson } from "../llm/json-repair";
import type { RoleplayCharacter } from "../../types/character";
import type { ToolCallRequest } from "../../types/provider";

export interface ParsedToolCall {
  name: "update_field" | "search_lore" | "audit_card" | "message" | "read_era" | "list_eras" | "list_era_categories";
  args: Record<string, any>;
  rawBlock?: string;
  id?: string;
}

export interface TakeOption {
  takeId: "A" | "B";
  title: string;
  field: string;
  content: string;
  explanation: string;
}

export interface GreetingAction {
  action: "add" | "update" | "delete";
  index?: number;
  content?: string;
  explanation?: string;
}

export interface AgentExecutionResult {
  agentMessage: string;
  updatedFields: Partial<RoleplayCharacter>;
  explanations: Record<string, string>;
  toolCalls: ParsedToolCall[];
  usedToolTags: boolean;
  takes?: TakeOption[];
  greetingActions?: GreetingAction[];
}

export const CARD_AGENT_TOOL_SCHEMA = [
  {
    type: "function",
    function: {
      name: "update_field",
      description: "Update a single character card field. Never use this for alternate_greetings; use add/update/delete_alternate_greeting instead.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            enum: [
              "description",
              "personality",
              "scenario",
              "first_mes",
              "mes_example",
              "post_history_instructions",
              "tags",
              "name",
              "creator_notes",
            ],
            description: "Target card field to update.",
          },
          content: {
            type: "string",
            description: "Full updated content for this field.",
          },
          explanation: {
            type: "string",
            description: "Reasoning for the change.",
          },
        },
        required: ["field", "content", "explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_alternate_greeting",
      description: "Append a brand new alternate greeting. ONLY use this when adding a new greeting, NOT when editing or revising existing greetings.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Complete opening scene in third-person limited with spoken dialogue.",
          },
          explanation: {
            type: "string",
            description: "Reasoning for the new alternate greeting.",
          },
          index: {
            type: "integer",
            description: "Optional 0-based insertion index; appends to end if omitted.",
          },
        },
        required: ["content", "explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_alternate_greeting",
      description: "Update, edit, rewrite, or polish an existing alternate greeting by its 0-based index. Use this whenever the user requests changes to an existing alternate greeting.",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description: "0-based index of the alternate greeting to update.",
          },
          content: {
            type: "string",
            description: "Refined alternate greeting text.",
          },
          explanation: {
            type: "string",
            description: "Reasoning for the modification.",
          },
        },
        required: ["index", "content", "explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_alternate_greeting",
      description: "Delete a single stale alternate greeting by its 0-based index.",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description: "0-based index of the alternate greeting to remove.",
          },
          explanation: {
            type: "string",
            description: "Reasoning for deleting this greeting.",
          },
        },
        required: ["index", "explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_lore",
      description: "Search canon fandom lore or internet knowledge to ground character facts, abilities, or backstory.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Character name and topic to research.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_era",
      description: "Read the complete worldbuilding specification of an era from eras_db.json.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Exact ID of the era (e.g. 'floating_sky_citadel_haven').",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_eras",
      description: "Search or browse historical & fantasy eras.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keywords to search across eras.",
          },
          category: {
            type: "string",
            description: "Optional category filter (e.g. 'Fantasy', 'Medieval').",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_era_categories",
      description: "List all era categories in the database with their current era counts.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

/**
 * Parses an LLM agent response supporting:
 * 0. Native OpenAI-style tool_calls array (highest priority)
 * 1. XML-style Tool Action Tags (<tool:update_field name="...">...</tool:update_field>)
 * 2. Standard Structured JSON with multi-pass repair
 * 3. Fuzzy Markdown Section Extraction
 */
export function parseAgentResponse(raw: string, nativeToolCalls?: ToolCallRequest[]): AgentExecutionResult {
  const toolCalls: ParsedToolCall[] = [];
  const updatedFields: Record<string, any> = {};
  const explanations: Record<string, string> = {};
  const greetingActions: GreetingAction[] = [];

  // ========================================================
  // Pass 0: Native OpenAI-style tool_calls
  // ========================================================
  if (Array.isArray(nativeToolCalls) && nativeToolCalls.length > 0) {
    for (const tc of nativeToolCalls) {
      const fnName = tc.function?.name || "";
      let args: any = {};
      try {
        args = typeof tc.function?.arguments === "object"
          ? tc.function.arguments
          : safeParseJson(tc.function?.arguments || "{}") || {};
      } catch {
        args = {};
      }

      if (fnName === "update_field") {
        const fieldName = (args.field || "").toLowerCase().trim();
        if (fieldName === "alternate_greetings" || fieldName === "alternate_greeting" || fieldName === "alts") {
          toolCalls.push({
            name: "update_field",
            args: {
              field: fieldName,
              error: "Rejected: Do not update alternate_greetings via update_field. Use add_alternate_greeting, update_alternate_greeting or delete_alternate_greeting instead.",
            },
            id: tc.id,
          });
        } else if (fieldName && args.content !== undefined) {
          updatedFields[fieldName] = args.content;
          if (args.explanation) explanations[fieldName] = args.explanation;
          toolCalls.push({
            name: "update_field",
            args: { field: fieldName, content: args.content, explanation: args.explanation || "" },
            id: tc.id,
          });
        }
      } else if (fnName === "add_alternate_greeting") {
        if (args.content) {
          const rawIdx = args.index !== undefined ? parseInt(String(args.index), 10) : undefined;
          const parsedIdx = Number.isInteger(rawIdx) ? rawIdx : undefined;
          greetingActions.push({ action: "add", index: parsedIdx, content: args.content, explanation: args.explanation });
          toolCalls.push({
            name: "update_field",
            args: { field: "alternate_greetings", action: "add", index: parsedIdx, content: args.content, explanation: args.explanation || "" },
            id: tc.id,
          });
        }
      } else if (fnName === "update_alternate_greeting") {
        if (args.content) {
          const rawIdx = args.index !== undefined ? parseInt(String(args.index), 10) : 0;
          const parsedIdx = Number.isInteger(rawIdx) ? rawIdx : 0;
          greetingActions.push({ action: "update", index: parsedIdx, content: args.content, explanation: args.explanation });
          toolCalls.push({
            name: "update_field",
            args: { field: "alternate_greetings", action: "update", index: parsedIdx, content: args.content, explanation: args.explanation || "" },
            id: tc.id,
          });
        }
      } else if (fnName === "delete_alternate_greeting") {
        const rawIdx = args.index !== undefined ? parseInt(String(args.index), 10) : undefined;
        if (Number.isInteger(rawIdx)) {
          greetingActions.push({ action: "delete", index: rawIdx, explanation: args.explanation });
          toolCalls.push({
            name: "update_field",
            args: { field: "alternate_greetings", action: "delete", index: rawIdx, explanation: args.explanation || "" },
            id: tc.id,
          });
        }
      } else if (fnName === "search_lore" || fnName === "read_era" || fnName === "list_eras" || fnName === "list_era_categories") {
        toolCalls.push({
          name: fnName,
          args,
          id: tc.id,
        });
      }
    }

    if (toolCalls.length > 0 || Object.keys(updatedFields).length > 0) {
      return {
        agentMessage: (raw || "").trim(),
        updatedFields,
        explanations,
        toolCalls,
        usedToolTags: false,
        greetingActions: greetingActions.length > 0 ? greetingActions : undefined,
      };
    }
  }

  if (!raw || typeof raw !== "string") {
    return {
      agentMessage: "No response generated.",
      updatedFields: {},
      explanations: {},
      toolCalls: [],
      usedToolTags: false,
    };
  }

  const trimmed = raw.trim();

  // ========================================================
  // Pass 1: Check for XML-Style Tool Action Tags
  // Supports:
  // 1. Standard: <tool:update_field name="description">...</tool:update_field>
  // 2. Field-named close: <tool:update_field name="description">...</description>
  // 3. Unclosed / next-tag boundary
  // 4. Direct tag: <tool:description>...</tool:description>
  // ========================================================
  function normalizeFieldName(name: string): string {
    const lower = name.toLowerCase().trim();
    if (lower === "first_message" || lower === "greeting" || lower === "firstmessage") return "first_mes";
    if (lower === "dialogue_examples" || lower === "mes_examples" || lower === "example_dialogue" || lower === "examples") return "mes_example";
    if (lower === "post_history" || lower === "post_history_instruction" || lower === "post_history_instructions") return "post_history_instructions";
    if (lower === "alternate_greeting" || lower === "alts") return "alternate_greetings";
    return lower;
  }

  // Resilient, attribute-order-agnostic scanner for <tool:update_field ...> or <call:update_field ...> or <update_field ...>
  // Handles:
  // - name="..." or field="..." or unquoted name=description
  // - explanation="..." in ANY order (before or after name)
  // - Closing tags: </tool:update_field>, </update_field>, </[fieldname]>, next tag boundary, or EOF
  const openTagRegex = /<(?:tool:)?(?:call:)?update_field\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  let hasToolTags = false;
  const matchedRawBlocks: string[] = [];

  while ((match = openTagRegex.exec(trimmed)) !== null) {
    const attrString = match[1];
    const startIndex = match.index + match[0].length;

    // Extract name or field attribute (order independent)
    const nameMatch = /\b(?:name|field)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrString);
    const fieldRaw = nameMatch ? (nameMatch[1] ?? nameMatch[2] ?? nameMatch[3] ?? "").trim() : "";
    if (!fieldRaw) continue;

    // Extract optional explanation (order independent)
    const explMatch = /\bexplanation\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrString);
    const rawExpl = explMatch ? (explMatch[1] ?? explMatch[2] ?? explMatch[3] ?? "").trim() : "";
    const fieldName = normalizeFieldName(fieldRaw);
    const explanation = rawExpl || `Updated ${fieldName}`;

    // Find closing boundary: </tool:update_field> OR </update_field> OR </[fieldname]> OR next <tool:update_field OR EOF
    const remainder = trimmed.slice(startIndex);
    const closePattern = new RegExp(
      `(?:<\\/(?:tool:)?(?:call:)?(?:update_field|${fieldRaw})>)|(?=<(?:tool:)?(?:call:)?update_field\\b)|$`,
      "i"
    );
    const closeMatch = closePattern.exec(remainder);
    const content = closeMatch ? remainder.slice(0, closeMatch.index).trim() : remainder.trim();
    const fullBlock = trimmed.slice(match.index, startIndex + (closeMatch ? closeMatch.index + closeMatch[0].length : remainder.length));

    if (fieldName && content) {
      hasToolTags = true;
      updatedFields[fieldName] = content;
      explanations[fieldName] = explanation;
      matchedRawBlocks.push(fullBlock);

      toolCalls.push({
        name: "update_field",
        args: { field: fieldName, content, explanation },
        rawBlock: fullBlock,
      });
    }
  }

  // Also check for direct field tags: <tool:description>...</tool:description> or <description>...</description>
  const directFieldRegex = /<(?:tool:)?(?:call:)?(description|personality|scenario|first_mes|first_message|greeting|alternate_greetings|alternate_greeting|mes_example|post_history_instructions|creator_notes|name|tags)(?:\s+explanation=["']([^"']*)["'])?\s*>([\s\S]*?)<\/(?:tool:)?(?:call:)?\1>/gi;
  while ((match = directFieldRegex.exec(trimmed)) !== null) {
    const rawField = match[1].trim();
    const fieldName = normalizeFieldName(rawField);
    const explanation = match[2] || `Updated ${fieldName}`;
    const content = match[3].trim();

    if (fieldName && content && !(fieldName in updatedFields)) {
      hasToolTags = true;
      updatedFields[fieldName] = content;
      explanations[fieldName] = explanation;

      toolCalls.push({
        name: "update_field",
        args: { field: fieldName, content, explanation },
        rawBlock: match[0],
      });
    }
  }

  // ========================================================
  // Pass 1b: Dedicated Alternate Greeting Action Tags
  // Inspired by LumiAgent / Mousy container-leaf addressing:
  // - <tool:add_alternate_greeting [explanation="..."] [index="..."]>Content</tool:add_alternate_greeting>
  // - <tool:update_alternate_greeting index="[0-based]" [explanation="..."]>Content</tool:update_alternate_greeting>
  // - <tool:delete_alternate_greeting index="[0-based]" [explanation="..."]/>
  // ========================================================

  // Add alternate greeting
  const addAltRegex = /<(?:tool:)?(?:call:)?add_alternate_greeting(?:\s+explanation=["']([^"']*)["'])?(?:\s+index=["'](\d+)["'])?\s*>([\s\S]*?)<\/(?:tool:)?(?:call:)?add_alternate_greeting>/gi;
  while ((match = addAltRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    const explanation = match[1] || "Added alternate greeting";
    const index = match[2] !== undefined ? parseInt(match[2], 10) : undefined;
    const content = match[3].trim();
    if (content) {
      greetingActions.push({ action: "add", index, content, explanation });
      toolCalls.push({
        name: "update_field",
        args: { field: "alternate_greetings", action: "add", index, content, explanation },
        rawBlock: match[0],
      });
    }
  }

  // Update alternate greeting
  const updateAltRegex = /<(?:tool:)?(?:call:)?update_alternate_greeting\s+index=["'](\d+)["'](?:\s+explanation=["']([^"']*)["'])?\s*>([\s\S]*?)<\/(?:tool:)?(?:call:)?update_alternate_greeting>/gi;
  while ((match = updateAltRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    const index = parseInt(match[1], 10);
    const explanation = match[2] || `Updated alternate greeting #${index}`;
    const content = match[3].trim();
    if (content) {
      greetingActions.push({ action: "update", index, content, explanation });
      toolCalls.push({
        name: "update_field",
        args: { field: "alternate_greetings", action: "update", index, content, explanation },
        rawBlock: match[0],
      });
    }
  }

  // Delete alternate greeting
  const deleteAltRegex = /<(?:tool:)?(?:call:)?delete_alternate_greeting\s+index=["'](\d+)["'](?:\s+explanation=["']([^"']*)["'])?\s*(?:\/>|>.*?<\/(?:tool:)?(?:call:)?delete_alternate_greeting>)/gi;
  while ((match = deleteAltRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    const index = parseInt(match[1], 10);
    const explanation = match[2] || `Deleted alternate greeting #${index}`;
    greetingActions.push({ action: "delete", index, explanation });
    toolCalls.push({
      name: "update_field",
      args: { field: "alternate_greetings", action: "delete", index, explanation },
      rawBlock: match[0],
    });
  }

  // Check for <tool:search_lore query="..." />
  const searchLoreRegex = /<(?:tool:)?(?:call:)?search_lore\s+query=["']([^"']+)["']\s*(?:\/>|>.*?<\/(?:tool:)?(?:call:)?search_lore>)/gi;
  while ((match = searchLoreRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    toolCalls.push({
      name: "search_lore",
      args: { query: match[1].trim() },
      rawBlock: match[0],
    });
  }

  // Check for <tool:read_era id="..." />
  const readEraRegex = /<(?:tool:)?(?:call:)?read_era\s+id=["']([^"']+)["']\s*(?:\/>|>.*?<\/(?:tool:)?(?:call:)?read_era>)/gi;
  while ((match = readEraRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    toolCalls.push({
      name: "read_era",
      args: { id: match[1].trim() },
      rawBlock: match[0],
    });
  }

  // Check for <tool:list_eras query="..." category="..." />
  const listErasRegex = /<(?:tool:)?(?:call:)?(?:list_eras|list_existing_eras)(?:\s+(?:query=["']([^"']*)["']|category=["']([^"']*)["']|\w+=["'][^"']*["']))*\s*(?:\/>|>.*?<\/(?:tool:)?(?:call:)?(?:list_eras|list_existing_eras)>)/gi;
  while ((match = listErasRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    const fullTag = match[0];
    const qMatch = /query=["']([^"']*)["']/i.exec(fullTag);
    const catMatch = /category=["']([^"']*)["']/i.exec(fullTag);
    toolCalls.push({
      name: "list_eras",
      args: {
        query: qMatch ? qMatch[1].trim() : "",
        category: catMatch ? catMatch[1].trim() : "All",
      },
      rawBlock: fullTag,
    });
  }

  // Check for <tool:list_era_categories />
  const listCatsRegex = /<(?:tool:)?(?:call:)?(?:list_era_categories|list_categories)\s*(?:\/>|>.*?<\/(?:tool:)?(?:call:)?(?:list_era_categories|list_categories)>)/gi;
  while ((match = listCatsRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    toolCalls.push({
      name: "list_era_categories",
      args: {},
      rawBlock: match[0],
    });
  }

  // Check for <take name="A|B" ...>
  const takeRegex = /<(?:tool:)?take\s+name=["']([AB])["'](?:\s+title=["']([^"']*)["'])?(?:\s+field=["']([^"']*)["'])?(?:\s+explanation=["']([^"']*)["'])?\s*>([\s\S]*?)<\/(?:tool:)?take>/gi;
  const takes: TakeOption[] = [];
  while ((match = takeRegex.exec(trimmed)) !== null) {
    hasToolTags = true;
    const takeId = match[1].toUpperCase() as "A" | "B";
    const title = match[2] || `Take ${takeId}`;
    const fieldName = normalizeFieldName(match[3] || "first_mes");
    const explanation = match[4] || "";
    const content = match[5].trim();
    takes.push({
      takeId,
      title,
      field: fieldName,
      content,
      explanation,
    });
  }

  if (hasToolTags) {
    // Reset regex indices before string replace
    directFieldRegex.lastIndex = 0;
    searchLoreRegex.lastIndex = 0;
    readEraRegex.lastIndex = 0;
    listErasRegex.lastIndex = 0;
    takeRegex.lastIndex = 0;

    // Everything outside tool tags is the conversational agent message!
    let cleanMessage = trimmed;
    for (const rawB of matchedRawBlocks) {
      cleanMessage = cleanMessage.replace(rawB, "");
    }
    cleanMessage = cleanMessage
      .replace(directFieldRegex, "")
      .replace(addAltRegex, "")
      .replace(updateAltRegex, "")
      .replace(deleteAltRegex, "")
      .replace(searchLoreRegex, "")
      .replace(readEraRegex, "")
      .replace(listErasRegex, "")
      .replace(takeRegex, "")
      .trim();

    // Clean up code block ticks if any
    cleanMessage = cleanMessage.replace(/^```[a-z]*\s*/gm, "").replace(/```$/gm, "").trim();

    if (!cleanMessage) {
      cleanMessage = takes.length > 0
        ? `Generated ${takes.length} creative takes for your comparison.`
        : `Applied updates via agent tools.`;
    }

    return {
      agentMessage: cleanMessage,
      updatedFields,
      explanations,
      toolCalls,
      usedToolTags: true,
      takes: takes.length > 0 ? takes : undefined,
      greetingActions: greetingActions.length > 0 ? greetingActions : undefined,
    };
  }

  // ========================================================
  // Pass 2: Multi-Pass Resilient JSON Parsing
  // ========================================================
  try {
    const json = safeParseJson<any>(trimmed);
    if (json && typeof json === "object") {
      const msg = json.agent_message || json.message || json.explanation || "";
      const fields = json.updated_fields || json.fields || {};
      const expls = json.explanations || {};

      // If JSON returned top-level fields directly instead of inside updated_fields
      const knownKeys = [
        "description",
        "personality",
        "scenario",
        "first_mes",
        "mes_example",
        "alternate_greetings",
        "post_history_instructions",
        "creator_notes",
        "tags",
        "name",
      ];

      for (const k of knownKeys) {
        if (k in json && !(k in fields)) {
          fields[k] = json[k];
        }
      }

      // Check if tool_calls array was emitted in JSON
      if (Array.isArray(json.tool_calls)) {
        for (const tc of json.tool_calls) {
          if (tc.name === "update_field" && tc.args) {
            fields[tc.args.field] = tc.args.content;
            if (tc.args.explanation) expls[tc.args.field] = tc.args.explanation;
            toolCalls.push(tc);
          } else if (tc.name) {
            toolCalls.push(tc);
          }
        }
      }

      let parsedTakes: TakeOption[] | undefined;
      if (Array.isArray(json.takes)) {
        parsedTakes = json.takes.map((t: any, idx: number) => ({
          takeId: (t.takeId || (idx === 0 ? "A" : "B")).toUpperCase() as "A" | "B",
          title: t.title || `Take ${idx === 0 ? "A" : "B"}`,
          field: normalizeFieldName(t.field || "first_mes"),
          content: t.content || "",
          explanation: t.explanation || "",
        }));
      }

      return {
        agentMessage: msg || "Agent finished processing modifications.",
        updatedFields: fields,
        explanations: expls,
        toolCalls,
        usedToolTags: false,
        takes: parsedTakes && parsedTakes.length > 0 ? parsedTakes : undefined,
      };
    }
  } catch {
    // Non-JSON format detected; falling back to markdown section salvage
  }

  // ========================================================
  // Pass 3: Markdown Section Salvage (Last line of defense)
  // Extracts ### Description, ### Personality, etc. from raw markdown
  // ========================================================
  const sectionRegex = /###?\s*\[?([A-Za-z0-9_ -]+)\]?\s*\n([\s\S]*?)(?=(?:###?\s*\[?[A-Za-z0-9_ -]+\]?)|$)/gi;
  let secMatch: RegExpExecArray | null;
  const salvaged: Record<string, any> = {};

  while ((secMatch = sectionRegex.exec(trimmed)) !== null) {
    const header = secMatch[1].trim().toLowerCase().replace(/[\s-]/g, "_");
    const body = secMatch[2].trim();

    if (header.includes("personality")) salvaged.personality = body;
    else if (header.includes("description")) salvaged.description = body;
    else if (header.includes("first_mes") || header.includes("first_message") || header.includes("greeting")) salvaged.first_mes = body;
    else if (header.includes("scenario")) salvaged.scenario = body;
    else if (header.includes("example") || header.includes("dialogue")) salvaged.mes_example = body;
    else if (header.includes("post_history")) salvaged.post_history_instructions = body;
  }

  if (Object.keys(salvaged).length > 0) {
    return {
      agentMessage: "Salvaged modified sections from formatted text.",
      updatedFields: salvaged,
      explanations: {},
      toolCalls: [],
      usedToolTags: false,
    };
  }

  // Fallback: If it was purely a conversational response without card edits
  return {
    agentMessage: trimmed,
    updatedFields: {},
    explanations: {},
    toolCalls: [],
    usedToolTags: false,
  };
}
