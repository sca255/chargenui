import type { RoleplayCharacter } from "../types/character";

export type PluginType =
  | "enhancer"
  | "generator"
  | "exporter"
  | "validator"
  | "importer"
  | "pipeline"
  | "asset_generator";

export type PluginLanguage = "javascript" | "lua" | "typescript";

export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  type: PluginType;
  language: PluginLanguage;
  enabled: boolean;
  isBuiltin: boolean;
  filePath?: string;
  configSchema?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
}

export interface ValidationIssue {
  area: string;
  severity: "error" | "warning" | "info";
  message: string;
  recommendation?: string;
}

export interface PluginContext {
  character?: RoleplayCharacter;
  options?: Record<string, unknown>;
  config?: Record<string, unknown>;
  format?: string;
  rawInput?: string;
  params?: Record<string, unknown>;
}

export interface PluginResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  logs?: string[];
  issues?: ValidationIssue[];
  changesSummary?: string[];
}

export interface GeneratedAssetPrompt {
  id?: string;
  name: string;
  assetType: "expression_sheet" | "outfit_variant" | "texture_atlas" | "avatar" | "greeting" | "greeting_bg" | string;
  label: string;
  prompt: string;
  negativePrompt?: string;
  targetModel?: string;
  aspectRatio?: string;
  dimensions?: { width: number; height: number };
  workflowTemplate?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AssetGeneratorResult {
  assetType: string;
  assets: GeneratedAssetPrompt[];
}

export interface CharGenPlugin {
  meta: PluginMeta;
  onEnhance?: (char: RoleplayCharacter, opts?: Record<string, unknown>) => Promise<PluginResult<RoleplayCharacter>> | PluginResult<RoleplayCharacter>;
  onGenerate?: (ctx: PluginContext) => Promise<PluginResult<RoleplayCharacter>> | PluginResult<RoleplayCharacter>;
  onExport?: (char: RoleplayCharacter, format?: string) => Promise<PluginResult<string | Record<string, unknown>>> | PluginResult<string | Record<string, unknown>>;
  onValidate?: (char: RoleplayCharacter) => Promise<PluginResult<ValidationIssue[]>> | PluginResult<ValidationIssue[]>;
  onImport?: (fileContent: string, format?: string) => Promise<PluginResult<RoleplayCharacter>> | PluginResult<RoleplayCharacter>;
  onPipeline?: (ctx: PluginContext) => Promise<PluginResult<unknown>> | PluginResult<unknown>;
  onGenerateAssets?: (char: RoleplayCharacter, opts?: Record<string, unknown>) => Promise<PluginResult<AssetGeneratorResult>> | PluginResult<AssetGeneratorResult>;
}
