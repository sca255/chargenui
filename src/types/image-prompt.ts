import type { RoleplayCharacter } from "./character";
import type { ProviderConfig } from "./provider";

export type ImageTargetModel = "anima" | "flux" | "pony" | "sdxl" | "illustrious" | "midjourney" | "general";
export type ImageArtStyle = "anime" | "photorealistic" | "semi_realistic" | "dark_fantasy" | "cyberpunk" | "oil_painting" | "custom";
export type ImageShotType = "card_portrait" | "upper_body" | "full_body" | "action_scene" | "intimate_close_up";
export type PortraitIntent = "standard_avatar" | "casual" | "action" | "sensual_kink";
export type ImagePromptPurpose = "avatar" | "greeting" | "greeting_bg" | "scenario_avatar";
export type ImageQueueStatus = "queued" | "completed" | "skipped";

export interface VisualIdentity {
  gender: string;
  age: string;
  hair: string;
  eyes: string;
  features: string;
  build: string;
  clothing: string;
  tags: string[];
}

export interface ImagePromptRequest {
  character: RoleplayCharacter;
  characterId?: string;
  imagePurpose?: ImagePromptPurpose; // "avatar" | "greeting"
  greetingText?: string; // Explicit greeting scene text if generating for an alternate greeting
  targetModel?: ImageTargetModel;
  artStyle?: ImageArtStyle;
  shotType?: ImageShotType;
  portraitIntent?: PortraitIntent;
  customSteering?: string;
  nsfw?: boolean;
  aspectRatio?: string;
  includeNegative?: boolean; // Default false
  provider: ProviderConfig;
}

export interface ImagePromptResult {
  characterId?: string;
  characterName: string;
  imagePurpose?: ImagePromptPurpose;
  targetModel: ImageTargetModel;
  artStyle: ImageArtStyle;
  shotType: ImageShotType;
  portraitIntent?: PortraitIntent;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  recommendedSettings: { sampler: string; steps: number; cfg: number };
  prompt: string; // The pure image generation prompt
  positivePrompt: string; // Alias for backward compatibility
  negativePrompt?: string;
}

export interface ImagePromptQueueItem {
  id: string;
  characterId?: string;
  characterName: string;
  imagePurpose?: ImagePromptPurpose;
  createdAt: string;
  targetModel: ImageTargetModel;
  artStyle: ImageArtStyle;
  shotType: ImageShotType;
  portraitIntent?: PortraitIntent;
  aspectRatio: string;
  dimensions?: { width: number; height: number };
  recommendedSettings?: { sampler: string; steps: number; cfg: number };
  prompt: string; // The pure image generation prompt
  positivePrompt?: string; // Alias
  negativePrompt?: string;
  notes?: string;
  status: ImageQueueStatus;
  avatarDataUrl?: string;
  greetingDataUrl?: string;
  greetingBgDataUrl?: string;
  greetingIndex?: number;
}

export interface ComfyUINodeOption {
  nodeId: string;
  classType: string;
  title: string;
  textInputs: string[];
}

export interface ComfyUIWorkflowAnalysis {
  valid: boolean;
  format: "api" | "ui" | "invalid";
  error?: string;
  candidatePositiveNodes: ComfyUINodeOption[];
  candidateNegativeNodes: ComfyUINodeOption[];
  candidateSeedNodes: Array<{ nodeId: string; classType: string; fieldName: string }>;
  defaultPositiveNodeId?: string;
  defaultNegativeNodeId?: string;
  defaultSeedNodeId?: string;
}

export interface ComfyUIDispatchOptions {
  comfyUrl?: string;
  workflow: Record<string, any>;
  positiveNodeId: string;
  positiveField?: string;
  negativeNodeId?: string;
  negativeField?: string;
  randomizeSeed?: boolean;
}

export interface ComfyUIDispatchResult {
  queueItemId: string;
  promptId: string;
  status: "completed" | "error";
  imageUrls: string[];
  imageDataUrl?: string;
  error?: string;
}
