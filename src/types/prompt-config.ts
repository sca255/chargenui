// Customizable Prompt Configuration Schema

export interface ImageModelPromptConfig {
  guidance: string;
  defaultPositivePrefix?: string;
  defaultNegative?: string;
  recommendedSettings?: {
    sampler: string;
    steps: number;
    cfg: number;
  };
}

export interface ImageGenerationConfig {
  systemPrompt?: string;
  tagRules?: string;
  models: {
    illustrious: ImageModelPromptConfig;
    pony: ImageModelPromptConfig;
    flux: ImageModelPromptConfig;
    sdxl: ImageModelPromptConfig;
    midjourney?: ImageModelPromptConfig;
    general?: ImageModelPromptConfig;
  };
  intentDirectives?: {
    standard_avatar?: string;
    casual?: string;
    action?: string;
    sensual_kink?: string;
    greeting?: string;
    scenario_avatar?: string;
  };
}

export interface PromptTemplateConfig {
  id: string;
  name: string;
  description: string;
  version?: number;
  parentId?: string;
  changelog?: string[];
  tags?: string[];
  isPrivate?: boolean;
  
  systemPrompt: string;

  spineSynthesis: {
    systemDirective: string;
    instructions: string;
    schemaInstructions: string;
  };

  fieldRenderers: {
    description: {
      proseGuidance: string;
      taggedBundleGuidance: string;
    };
    personality: {
      guidance: string;
    };
    scenarioAndFirstMes: {
      guidance: string;
      scenarioRule: string;
      firstMesRule: string;
    };
    aliChatAndAlts: {
      guidance: string;
      aliChatRule: string;
      altGreetingsRule: string;
    };
  };

  imageGeneration?: ImageGenerationConfig;

  // Global & Subsystem Preset Directives
  uncensoredSystemPrompt?: string;
  governanceContracts?: GovernanceContractsConfig;
  agentHarness?: AgentHarnessConfig;
  reimagine?: ReimaginePromptConfig;
  eraArchitectPrompt?: string;
  audioDirectorPrompt?: string;
  enhancerPrompts?: EnhancerPromptsConfig;
  visionPrompts?: VisionPromptsConfig;
  storyArcPrompt?: string | { spark?: string; standard?: string };
}

export interface GovernanceContractsConfig {
  naturalSpokenDialogue?: string;
  multiCharacter?: string;
  rpgWorldGm?: string;
  lorebookCompanion?: string;
  chargenRoleplay?: string;
}

export interface AgentHarnessConfig {
  systemPromptBase?: string;
  systemPromptNative?: string;
  systemPromptXml?: string;
  compactSummaryPrompt?: string;
}

export interface ReimaginePromptConfig {
  systemPromptTemplate?: string;
  redesignObjective?: string;
  inspireObjective?: string;
}

export interface EnhancerPromptsConfig {
  multiverseForker?: string;
  worldNodes?: string;
  greetingsPuncherAlt?: string;
  greetingsPuncherImprove?: string;
}

export interface VisionPromptsConfig {
  deconstruct?: string;
  ideas?: string;
}

export interface PromptProfileSummary {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isCurrent: boolean;
  version?: number;
  parentId?: string;
  tags?: string[];
}
