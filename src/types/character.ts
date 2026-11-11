// SillyTavern Character Card V2 / V1 and CharacterBook Specifications

export interface TavernCardV1 {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
}

export interface CharacterBookEntry {
  id?: number | string;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  position?: "before_char" | "after_char" | "before_an" | "after_an";
  enabled?: boolean;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  entries: CharacterBookEntry[];
}

export interface TavernCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  character_book?: CharacterBook;
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, unknown>;
}

export interface TavernCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: TavernCardV2Data;
}

export interface CardAsset {
  type: "icon" | "background" | "user_icon" | "emotion" | "inlay" | string;
  uri: string; // e.g. "embedded://assets/icon.png" or "ccdefault:"
  name: string; // e.g. "main"
  ext?: string; // e.g. "png"
}

export interface TavernCardV3Data extends TavernCardV2Data {
  nickname?: string;
  creator_notes_multilingual?: Record<string, string>;
  source?: string[];
  group_only_greetings?: string[];
  creation_date?: string;
  modification_date?: string;
  assets?: CardAsset[];
}

export interface TavernCardV3 {
  spec: "chara_card_v3";
  spec_version: "3.0";
  data: TavernCardV3Data;
}

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp?: string; // in-universe timestamp or chronological order e.g. "Year 845", "Day 1"
  summary: string;
  significance?: "critical" | "major" | "minor" | "flavor";
  charactersInvolved?: string[];
  location?: string;
  source?: "scenario" | "first_mes" | "chat" | "manual" | "continuation";
}

export interface CharacterBranchCommit {
  commitId: string;
  parentCommitId?: string;
  message: string;
  timestamp: string;
  author?: string;
  snapshot: Partial<RoleplayCharacter>; // Fields snapshotted in this commit
}

export interface CharacterBranch {
  name: string;
  createdAt: string;
  headCommitId: string;
  description?: string;
}

export interface CharacterBranchesData {
  currentBranch: string;
  branches: Record<string, CharacterBranch>;
  commits: Record<string, CharacterBranchCommit>;
}

export interface CharGenExtensionMeta {
  schemaVersion: number;
  migratedAt?: string;
  migrationHistory?: string[];
  embedding?: number[];
  timeline?: TimelineEvent[];
  branches?: CharacterBranchesData;
  [key: string]: unknown;
}

export interface RoleplayCharacter {
  id: string;
  name: string;
  nickname?: string;
  avatar?: string; // base64 or data URL
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  alternate_greetings: string[];
  group_only_greetings?: string[];
  system_prompt: string;
  post_history_instructions: string;
  creator_notes: string;
  tags: string[];
  character_book?: CharacterBook;
  assets?: CardAsset[];
  extensions?: {
    chargenui?: CharGenExtensionMeta;
    [key: string]: any;
  };
}
