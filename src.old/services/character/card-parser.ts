import { Buffer } from "node:buffer";
import type {
  RoleplayCharacter,
  TavernCardV2,
  TavernCardV2Data,
  TavernCardV3,
  TavernCardV3Data,
  CharacterBook,
} from "../../types/character";
import { extractCardFromPngBuffer, extractPngChunks } from "./png-card";
import { normalizeRpMacros } from "./macro-engine";
import { parseCharxArchive } from "./charx-container";

/**
 * Cleans character book of internal authoring scaffolding (e.g. reaction gradient dumps, Weaver blueprints)
 * ensuring only genuine user/world lore remains in the final card.
 */
export function sanitizeCharacterBook(cb?: CharacterBook): CharacterBook | undefined {
  if (!cb || !Array.isArray(cb.entries)) return cb;
  const filtered = cb.entries.filter((e) => {
    const comment = (e.comment || "").toLowerCase();
    const content = (e.content || "").toLowerCase();
    const isWeaverScaffold =
      comment.includes("weaver psychological blueprint") ||
      comment.includes("calibrated reaction gradient") ||
      comment.includes("weaver formative backstory") ||
      comment.includes("weaver vocal idiolect") ||
      content.includes("[character bible: psychological blueprint") ||
      content.includes("[character bible: formative experiences") ||
      content.includes("[character bible: voice, idiolect");
    return !isWeaverScaffold;
  });

  return {
    ...cb,
    entries: filtered,
  };
}

export function cardV2ToCharacter(card: TavernCardV2, avatarDataUrl?: string): RoleplayCharacter {
  const data = card.data;
  const name = data.name || "Unnamed";

  // Fallback-only: If post_history_instructions already exists, keep it untouched and discard system_prompt.
  // Only if post_history_instructions is empty, salvage incoming system_prompt.
  let postHistory = normalizeRpMacros(data.post_history_instructions || "", name);
  const incomingSystemPrompt = normalizeRpMacros(data.system_prompt || "", name);
  if (incomingSystemPrompt && !postHistory) {
    postHistory = incomingSystemPrompt;
  }

  return {
    id: "char_" + Math.random().toString(36).substring(2, 10),
    name,
    avatar: avatarDataUrl,
    description: normalizeRpMacros(data.description || "", name),
    personality: normalizeRpMacros(data.personality || "", name),
    scenario: normalizeRpMacros(data.scenario || "", name),
    first_mes: normalizeRpMacros(data.first_mes || "", name),
    mes_example: normalizeRpMacros(data.mes_example || "", name),
    alternate_greetings: Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings.map((g) => normalizeRpMacros(g, name))
      : [],
    system_prompt: "", // STRICTLY BANNED: Always kept empty to protect user client system prompts
    post_history_instructions: postHistory,
    creator_notes: data.creator_notes || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    character_book: sanitizeCharacterBook(data.character_book),
    assets: Array.isArray(data.assets) ? data.assets : undefined,
    extensions: (data.extensions && typeof data.extensions === "object") ? data.extensions : undefined,
  };
}

export function characterToCardV2(char: RoleplayCharacter): TavernCardV2 {
  let postHistory = char.post_history_instructions || "";
  if (char.system_prompt && !postHistory) {
    postHistory = char.system_prompt;
  }

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: char.name,
      description: char.description,
      personality: char.personality,
      scenario: char.scenario,
      first_mes: char.first_mes,
      mes_example: char.mes_example,
      creator_notes: char.creator_notes ?? "",
      system_prompt: "", // STRICTLY BANNED: Exported cards never pollute or override client system prompts
      post_history_instructions: postHistory,
      alternate_greetings: char.alternate_greetings,
      tags: char.tags,
      character_book: sanitizeCharacterBook(char.character_book),
      character_version: "1.0",
      creator: "CharGen Harness",
      extensions: char.extensions || {},
    },
  };
}

/**
 * Converts a RoleplayCharacter into Character Card V3 standard (CCv3)
 */
export function characterToCardV3(char: RoleplayCharacter): TavernCardV3 {
  let postHistory = char.post_history_instructions || "";
  if (char.system_prompt && !postHistory) {
    postHistory = char.system_prompt;
  }

  const now = new Date().toISOString();

  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: char.name,
      description: char.description,
      personality: char.personality,
      scenario: char.scenario,
      first_mes: char.first_mes,
      mes_example: char.mes_example,
      creator_notes: char.creator_notes ?? "",
      system_prompt: "", // STRICTLY BANNED
      post_history_instructions: postHistory,
      alternate_greetings: char.alternate_greetings || [],
      group_only_greetings: char.group_only_greetings || [],
      tags: char.tags || [],
      character_book: sanitizeCharacterBook(char.character_book),
      character_version: "1.0",
      creator: "CharGen Harness",
      nickname: char.nickname || char.name,
      creation_date: now,
      modification_date: now,
      assets: Array.isArray(char.assets) && char.assets.length > 0
        ? char.assets
        : [
            {
              type: "icon",
              uri: "embedded://assets/icon.png",
              name: "main",
              ext: "png",
            },
          ],
      extensions: (() => {
        const { "chargenui:authoringSpine": _, "chargenui:creationInputs": __, ...safeExt } = char.extensions || {};
        return { fav: false, world: "", ...safeExt };
      })(),
    },
  };
}

/**
 * Parses Character Card V3 specification into a RoleplayCharacter
 */
export function cardV3ToCharacter(card: TavernCardV3, avatarDataUrl?: string): RoleplayCharacter {
  const data = card.data;
  const name = data.name || "Unnamed";

  let postHistory = normalizeRpMacros(data.post_history_instructions || "", name);
  const incomingSystemPrompt = normalizeRpMacros(data.system_prompt || "", name);
  if (incomingSystemPrompt && !postHistory) {
    postHistory = incomingSystemPrompt;
  }

  return {
    id: "char_" + Math.random().toString(36).substring(2, 10),
    name,
    nickname: data.nickname,
    avatar: avatarDataUrl,
    description: normalizeRpMacros(data.description || "", name),
    personality: normalizeRpMacros(data.personality || "", name),
    scenario: normalizeRpMacros(data.scenario || "", name),
    first_mes: normalizeRpMacros(data.first_mes || "", name),
    mes_example: normalizeRpMacros(data.mes_example || "", name),
    alternate_greetings: Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings.map((g) => normalizeRpMacros(g, name))
      : [],
    group_only_greetings: Array.isArray(data.group_only_greetings)
      ? data.group_only_greetings.map((g) => normalizeRpMacros(g, name))
      : [],
    system_prompt: "", // STRICTLY BANNED
    post_history_instructions: postHistory,
    creator_notes: data.creator_notes || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    character_book: sanitizeCharacterBook(data.character_book),
    assets: Array.isArray(data.assets) ? data.assets : undefined,
    extensions: (data.extensions && typeof data.extensions === "object") ? data.extensions : undefined,
  };
}

/**
 * Parses raw input (PNG buffer, CharX ZIP buffer, JSON string, or raw text) into RoleplayCharacter
 */
export function parseCharacterFromInput(
  raw: Uint8Array | string,
  filename?: string
): { character: RoleplayCharacter; avatarDataUrl?: string; format: string; raw_system_prompt?: string } {
  // If Uint8Array, check if CharX (ZIP) or PNG or UTF-8 string
  if (raw instanceof Uint8Array) {
    // 1. Check for ZIP / .charx archive signature (PK\x03\x04)
    const isZip = raw.length > 4 && raw[0] === 0x50 && raw[1] === 0x4b && raw[2] === 0x03 && raw[3] === 0x04;
    if (isZip || (filename && filename.toLowerCase().endsWith(".charx"))) {
      try {
        return parseCharxArchive(raw);
      } catch (err: any) {
        console.warn("Failed parsing as .charx bundle, trying fallback:", err.message);
      }
    }

    // 2. Check for PNG signature
    const isPng = raw.length > 8 && raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47;
    if (isPng) {
      const card = extractCardFromPngBuffer(raw);
      const avatarDataUrl = `data:image/png;base64,${Buffer.from(raw).toString("base64")}`;
      if (card) {
        const rawSysPrompt = (card.data.system_prompt || "").trim();
        if (card.spec === "chara_card_v3") {
          return {
            character: cardV3ToCharacter(card as TavernCardV3, avatarDataUrl),
            avatarDataUrl,
            format: "png_tavern_v3",
            raw_system_prompt: rawSysPrompt || undefined,
          };
        }
        return {
          character: cardV2ToCharacter(card as TavernCardV2, avatarDataUrl),
          avatarDataUrl,
          format: "png_tavern_v2",
          raw_system_prompt: rawSysPrompt || undefined,
        };
      } else {
        // Image without metadata - ready for vision scan!
        return {
          character: {
            id: "char_" + Math.random().toString(36).substring(2, 10),
            name: filename ? filename.replace(/\.[^/.]+$/, "") : "Unscanned Character",
            avatar: avatarDataUrl,
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
          },
          avatarDataUrl,
          format: "png_image_only",
        };
      }
    }
    // Try decoding as text
    raw = new TextDecoder().decode(raw);
  }

  // Raw is string
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.spec === "chara_card_v3" && parsed.data) {
        const rawSysPrompt = (parsed.data.system_prompt || "").trim();
        return {
          character: cardV3ToCharacter(parsed as TavernCardV3),
          format: "json_v3",
          raw_system_prompt: rawSysPrompt || undefined,
        };
      }
      if (parsed.spec === "chara_card_v2" && parsed.data) {
        const rawSysPrompt = (parsed.data.system_prompt || "").trim();
        return {
          character: cardV2ToCharacter(parsed as TavernCardV2),
          format: "json_v2",
          raw_system_prompt: rawSysPrompt || undefined,
        };
      }
      // V1 JSON or Agnai
      if (parsed.name || parsed.description || parsed.first_mes) {
        const rawSysPrompt = (parsed.system_prompt || "").trim();
        const v2Card: TavernCardV2 = {
          spec: "chara_card_v2",
          spec_version: "2.0",
          data: {
            name: parsed.name || "Unnamed",
            description: parsed.description || "",
            personality: parsed.personality || "",
            scenario: parsed.scenario || "",
            first_mes: parsed.first_mes || "",
            mes_example: parsed.mes_example || "",
            creator_notes: parsed.creator_notes || "",
            system_prompt: parsed.system_prompt || "",
            post_history_instructions: parsed.post_history_instructions || "",
            alternate_greetings: Array.isArray(parsed.alternate_greetings) ? parsed.alternate_greetings : [],
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          },
        };
        return {
          character: cardV2ToCharacter(v2Card),
          format: "json_v1",
          raw_system_prompt: rawSysPrompt || undefined,
        };
      }
    } catch {}
  }

  // Fallback: Raw text description
  return {
    character: {
      id: "char_" + Math.random().toString(36).substring(2, 10),
      name: filename ? filename.replace(/\.[^/.]+$/, "") : "Custom Character",
      description: trimmed,
      personality: "",
      scenario: "",
      first_mes: "",
      mes_example: "",
      alternate_greetings: [],
      system_prompt: "",
      post_history_instructions: "",
      creator_notes: "",
      tags: [],
    },
    format: "raw_text",
  };
}
