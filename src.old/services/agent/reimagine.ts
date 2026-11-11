import type { ProviderConfig } from "../../types/provider";
import type { RoleplayCharacter } from "../../types/character";
import { executeAgentModify, type AgentModifyResponse } from "./agent-harness";

export type ReimagineMode = "redesign" | "inspire";

export interface ReimagineRequest {
  character: RoleplayCharacter;
  mode: ReimagineMode;
  prompt?: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  provider: ProviderConfig;
}

export async function executeReimagine(req: ReimagineRequest): Promise<AgentModifyResponse & { mode: ReimagineMode }> {
  const prompt = (req.prompt || "").trim();
  const direction =
    req.mode === "redesign"
      ? `Redesign this character card while preserving its recognizable core identity. Improve the weakest areas, deepen the central conflict, and return a cohesive playable card. ${prompt}`
      : `Generate an inspired alternate interpretation of this character card. Preserve the emotional DNA, but introduce fresh hooks, setting pressure, voice, and scene possibilities. ${prompt}`;

  const result = await executeAgentModify({
    character: req.character,
    userPrompt: direction,
    chatHistory: req.chatHistory,
    provider: req.provider,
    enforceNaturalVoice: true,
  });
  return { ...result, mode: req.mode };
}
