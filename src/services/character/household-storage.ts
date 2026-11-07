import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { HouseholdRecord, HouseholdMeta, HouseholdMember } from "../../types/household";

const DATA_DIR = path.resolve(process.cwd(), "data");
const HOUSEHOLDS_FILE = path.join(DATA_DIR, "households.json");

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(HOUSEHOLDS_FILE);
    } catch {
      await fs.writeFile(HOUSEHOLDS_FILE, "[]", "utf-8");
    }
  } catch (err) {
    console.error("[HouseholdStorage] Failed to ensure households file:", err);
  }
}

async function readAll(): Promise<HouseholdRecord[]> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(HOUSEHOLDS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[HouseholdStorage] Failed to read households.json:", err);
    return [];
  }
}

async function writeAll(records: HouseholdRecord[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(HOUSEHOLDS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function listHouseholds(): Promise<HouseholdMeta[]> {
  const records = await readAll();
  return records.map((h) => ({
    id: h.id,
    name: h.name,
    category_label: h.category_label || "Arbitrary Household",
    description: h.description || "",
    user_title: h.user_title || "{{user}}",
    memberCount: (h.members || []).length,
    members: (h.members || []).map((m) => ({
      card_id: m.card_id,
      card_name: m.card_name,
      household_role: m.household_role,
      standing: m.standing,
    })),
    updatedAt: h.updatedAt || new Date().toISOString(),
  }));
}

export async function getHousehold(id: string): Promise<HouseholdRecord | null> {
  const records = await readAll();
  return records.find((h) => h.id === id) || null;
}

export async function saveHousehold(
  data: Partial<HouseholdRecord> & { name: string }
): Promise<HouseholdRecord> {
  const records = await readAll();
  const now = new Date().toISOString();

  let id = data.id;
  if (!id) {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32);
    id = `hh_${slug || "binder"}_${Date.now().toString(36)}`;
  }

  const existingIdx = records.findIndex((h) => h.id === id);

  const newRecord: HouseholdRecord = {
    id,
    name: data.name.trim(),
    category_label: (data.category_label || "Household / Court").trim(),
    description: (data.description || "").trim(),
    user_title: (data.user_title || "{{user}}").trim(),
    rules_and_etiquette: Array.isArray(data.rules_and_etiquette)
      ? data.rules_and_etiquette.map((r) => String(r).trim()).filter(Boolean)
      : [],
    members: Array.isArray(data.members) ? data.members : [],
    shared_lore: (data.shared_lore || "").trim(),
    createdAt: existingIdx >= 0 ? records[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    records[existingIdx] = newRecord;
  } else {
    records.unshift(newRecord);
  }

  await writeAll(records);
  return newRecord;
}

export async function deleteHousehold(id: string): Promise<boolean> {
  const records = await readAll();
  const filtered = records.filter((h) => h.id !== id);
  if (filtered.length === records.length) return false;
  await writeAll(filtered);
  return true;
}
