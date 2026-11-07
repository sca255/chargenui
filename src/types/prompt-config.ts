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
}

export interface PromptProfileSummary {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isCurrent: boolean;
}
