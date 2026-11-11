import type { RoleplayCharacter } from "../../types/character";
import { normalizeRpMacros } from "./macro-engine";

export const CURRENT_SCHEMA_VERSION = 3;

export interface MigrationStep {
  version: number;
  name: string;
  description: string;
  migrate: (char: RoleplayCharacter) => RoleplayCharacter;
}

/**
 * Migration v1: Purges deprecated system_prompt pollution into post_history_instructions
 * (only if post_history_instructions is empty) and guarantees system_prompt is blanked.
 */
export const v1_purgeSystemPrompt: MigrationStep = {
  version: 1,
  name: "v1_purgeSystemPrompt",
  description: "Ensures post_history_instructions receives system_prompt if blank, and empties system_prompt.",
  migrate: (char: RoleplayCharacter): RoleplayCharacter => {
    let postHistory = char.post_history_instructions || "";
    if (char.system_prompt && !postHistory.trim()) {
      postHistory = char.system_prompt;
    }
    return {
      ...char,
      system_prompt: "",
      post_history_instructions: postHistory,
    };
  },
};

/**
 * Migration v2: Normalizes greetings, arrays, and macro tokens across all narrative fields.
 */
export const v2_normalizeGreetingsAndMacros: MigrationStep = {
  version: 2,
  name: "v2_normalizeGreetingsAndMacros",
  description: "Ensures alternate_greetings and tags are valid arrays and runs macro normalization.",
  migrate: (char: RoleplayCharacter): RoleplayCharacter => {
    const name = char.name || "Unnamed";
    const rawAlts = Array.isArray(char.alternate_greetings) ? char.alternate_greetings : [];
    const normalizedAlts = rawAlts
      .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
      .map((g) => normalizeRpMacros(g, name));

    const tags = Array.isArray(char.tags)
      ? Array.from(new Set(char.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)))
      : [];

    return {
      ...char,
      description: normalizeRpMacros(char.description || "", name),
      personality: normalizeRpMacros(char.personality || "", name),
      scenario: normalizeRpMacros(char.scenario || "", name),
      first_mes: normalizeRpMacros(char.first_mes || "", name),
      mes_example: normalizeRpMacros(char.mes_example || "", name),
      alternate_greetings: normalizedAlts,
      tags,
    };
  },
};

/**
 * Migration v3: Ensures card assets array and initializes chargenui extension metadata.
 */
export const v3_ensureAssetsAndMeta: MigrationStep = {
  version: 3,
  name: "v3_ensureAssetsAndMeta",
  description: "Ensures assets array is defined and establishes extensions.chargenui container.",
  migrate: (char: RoleplayCharacter): RoleplayCharacter => {
    const assets = Array.isArray(char.assets) ? char.assets : [];
    const ext = char.extensions ? { ...char.extensions } : {};
    return {
      ...char,
      assets,
      extensions: ext,
    };
  },
};

export const MIGRATION_REGISTRY: MigrationStep[] = [
  v1_purgeSystemPrompt,
  v2_normalizeGreetingsAndMacros,
  v3_ensureAssetsAndMeta,
];

/**
 * Migrates a character card through sequential versioned steps up to CURRENT_SCHEMA_VERSION.
 */
export function migrateCharacter(char: RoleplayCharacter): RoleplayCharacter {
  const currentVersion = char.extensions?.chargenui?.schemaVersion ?? 0;
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return char;
  }

  let migrated: RoleplayCharacter = { ...char };
  const history: string[] = [...(migrated.extensions?.chargenui?.migrationHistory || [])];

  for (const step of MIGRATION_REGISTRY) {
    if (step.version > currentVersion) {
      try {
        migrated = step.migrate(migrated);
        history.push(`${step.name} (v${step.version}) at ${new Date().toISOString()}`);
      } catch (err: any) {
        console.warn(`[Migrations] Step ${step.name} encountered error:`, err?.message || err);
      }
    }
  }

  const chargenMeta = {
    ...(migrated.extensions?.chargenui || {}),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    migratedAt: new Date().toISOString(),
    migrationHistory: history,
  };

  return {
    ...migrated,
    extensions: {
      ...(migrated.extensions || {}),
      chargenui: chargenMeta,
    },
  };
}
