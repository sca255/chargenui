import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { RoleplayCharacter } from "../../types/character";
import { auditCharacterCard } from "../enhancer/diagnostic";
import { calculateCharacterCardTokens } from "./token-counter";
import { sanitizeCharacterBook } from "./card-parser";
import { migrateCharacter } from "./migrations";

export interface SavedCardRecord {
  id: string;
  character: RoleplayCharacter;
  avatarBase64?: string;
  createdAt: string;
  updatedAt: string;
  metaCache?: {
    score: number;
    tokenCount: number;
  };
}

export interface SavedCardMeta {
  id: string;
  name: string;
  tags: string[];
  updatedAt: string;
  score: number;
  tokenCount: number;
  hasAvatar: boolean;
  avatarBase64?: string;
}

const CARDS_DIR = path.resolve(process.cwd(), "data", "cards");

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(CARDS_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code !== "EEXIST" && err.code !== "EROFS") throw err;
  }
}

// In-memory cache for fast metadata retrieval on library listing
const memoryCardMetaCache = new Map<string, { mtimeMs: number; meta: SavedCardMeta }>();

/**
 * Lists all saved cards with metadata, health score, and token count.
 * Uses mtime-based memory cache to avoid expensive disk reads and token re-auditing on reload.
 */
export async function listSavedCards(): Promise<SavedCardMeta[]> {
  await ensureDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(CARDS_DIR);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const jsonFiles = entries.filter((f) => f.endsWith(".json"));

  const results = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(CARDS_DIR, file);
        const stat = await fs.stat(filePath);
        const cached = memoryCardMetaCache.get(file);

        if (cached && cached.mtimeMs === stat.mtimeMs) {
          return cached.meta;
        }

        const raw = await fs.readFile(filePath, "utf-8");
        const record = JSON.parse(raw) as SavedCardRecord;
        if (!record.character) return null;

        const score = record.metaCache?.score ?? auditCharacterCard(record.character).score;
        const tokenCount = record.metaCache?.tokenCount ?? calculateCharacterCardTokens(record.character).total;

        const meta: SavedCardMeta = {
          id: record.id || file.replace(/\.json$/, ""),
          name: record.character.name || "Unnamed Character",
          tags: Array.isArray(record.character.tags) ? record.character.tags : [],
          updatedAt: record.updatedAt || new Date().toISOString(),
          score,
          tokenCount,
          hasAvatar: !!record.avatarBase64,
          // Strip heavy base64 strings from in-memory deck listings; frontend/client reads /api/cards/:id/avatar on-demand
          avatarBase64: "",
        };

        memoryCardMetaCache.set(file, { mtimeMs: stat.mtimeMs, meta });
        return meta;
      } catch (err) {
        console.warn(`Failed reading saved card ${file}:`, err);
        return null;
      }
    })
  );

  const metas = results.filter((m): m is SavedCardMeta => m !== null);
  // Sort newest first
  return metas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Retrieves a single saved card by ID.
 */
export async function getSavedCard(id: string): Promise<SavedCardRecord | null> {
  await ensureDir();
  const filePath = path.join(CARDS_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const record = JSON.parse(raw) as SavedCardRecord;
    if (record.character) {
      record.character = migrateCharacter(record.character);
      if (record.character.character_book) {
        record.character.character_book = sanitizeCharacterBook(record.character.character_book) || { name: "", entries: [] };
      }
    }
    return record;
  } catch {
    return null;
  }
}

/**
 * Saves or updates a card in the local library.
 */
export async function saveCardRecord(
  character: RoleplayCharacter,
  avatarBase64?: string,
  existingId?: string
): Promise<SavedCardMeta> {
  await ensureDir();

  let id = existingId;
  if (!id) {
    if (character.id && !(await getSavedCard(character.id))) {
      id = character.id;
    } else {
      id = "char_" + Math.random().toString(36).substring(2, 10);
    }
  }
  const existing = await getSavedCard(id);

  if (character.character_book) {
    character.character_book = sanitizeCharacterBook(character.character_book) || { name: "", entries: [] };
  }

  // Cleanse system_prompt into post_history_instructions
  const cleanChar = { ...character, id };
  if (cleanChar.system_prompt) {
    if (!cleanChar.post_history_instructions) {
      cleanChar.post_history_instructions = cleanChar.system_prompt;
    }
    cleanChar.system_prompt = "";
  }

  const now = new Date().toISOString();
  const record: SavedCardRecord = {
    id,
    character: cleanChar,
    avatarBase64: avatarBase64 || existing?.avatarBase64,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const score = auditCharacterCard(record.character).score;
  const tokenCount = calculateCharacterCardTokens(record.character).total;
  record.metaCache = { score, tokenCount };

  const filePath = path.join(CARDS_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");

  const metaResult: SavedCardMeta = {
    id,
    name: record.character.name || "Unnamed Character",
    tags: Array.isArray(record.character.tags) ? record.character.tags : [],
    updatedAt: record.updatedAt,
    score,
    tokenCount,
    hasAvatar: !!record.avatarBase64,
    avatarBase64: record.avatarBase64,
  };

  try {
    const stat = await fs.stat(filePath);
    memoryCardMetaCache.set(`${id}.json`, { mtimeMs: stat.mtimeMs, meta: metaResult });
  } catch {}

  return metaResult;
}

/**
 * Deletes a card by ID.
 */
export async function deleteSavedCard(id: string): Promise<boolean> {
  await ensureDir();
  const filePath = path.join(CARDS_DIR, `${id}.json`);
  try {
    await fs.unlink(filePath);
    memoryCardMetaCache.delete(`${id}.json`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Duplicates a card as a new variant (e.g., "Kaelen Voss (Variant / AU)").
 */
export async function duplicateSavedCard(
  id: string,
  suffix = "(Variant / AU)"
): Promise<SavedCardRecord> {
  const source = await getSavedCard(id);
  if (!source) throw new Error(`Card with ID ${id} not found.`);

  const newId = "card_" + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  const dupChar: RoleplayCharacter = {
    ...source.character,
    id: newId,
    name: `${source.character.name || "Unnamed"} ${suffix}`.trim(),
  };

  const newRecord: SavedCardRecord = {
    id: newId,
    character: dupChar,
    avatarBase64: source.avatarBase64,
    createdAt: now,
    updatedAt: now,
  };

  const filePath = path.join(CARDS_DIR, `${newId}.json`);
  await fs.writeFile(filePath, JSON.stringify(newRecord, null, 2), "utf-8");

  return newRecord;
}

const AUTOSAVE_FILE = path.resolve(process.cwd(), "data", ".autosave_card.json");

/**
 * Saves a card into the dedicated temporary autosave slot.
 * Overwrites any previous temporary draft.
 */
export async function saveAutosaveDraft(
  character: RoleplayCharacter,
  avatarBase64?: string
): Promise<SavedCardRecord> {
  const dataDir = path.dirname(AUTOSAVE_FILE);
  await fs.mkdir(dataDir, { recursive: true });

  const record: SavedCardRecord = {
    id: character.id || "autosave_draft",
    character,
    avatarBase64,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(AUTOSAVE_FILE, JSON.stringify(record, null, 2), "utf-8");
  return record;
}

/**
 * Retrieves the currently saved autosave draft, or null if none exists.
 */
export async function getAutosaveDraft(): Promise<SavedCardRecord | null> {
  try {
    const raw = await fs.readFile(AUTOSAVE_FILE, "utf-8");
    return JSON.parse(raw) as SavedCardRecord;
  } catch {
    return null;
  }
}

/**
 * Clears the temporary autosave draft file if it exists.
 */
export async function clearAutosaveDraft(): Promise<boolean> {
  try {
    await fs.unlink(AUTOSAVE_FILE);
    return true;
  } catch {
    return false;
  }
}
