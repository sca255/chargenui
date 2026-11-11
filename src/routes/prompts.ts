import type { RequestHandler } from "../utils/router";
import {
  getActivePromptConfig,
  listPromptProfiles,
  setActiveProfile,
  saveCustomPromptConfig,
  resetToDefault,
  forkPromptProfile,
} from "../services/config/prompt-config";

export const promptsRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/prompts",
    handler: async () => Response.json({
      profiles: listPromptProfiles(),
      activeProfile: getActivePromptConfig().id,
      config: getActivePromptConfig(),
    }),
  },
  {
    method: "POST",
    path: "/api/prompts/select",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { profileId: string };
      const config = setActiveProfile(body.profileId);
      return Response.json({
        profiles: listPromptProfiles(),
        activeProfile: config.id,
        config,
      });
    },
  },
  {
    method: "POST",
    path: "/api/prompts/save",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { config: any };
      const config = saveCustomPromptConfig(body.config);
      return Response.json({
        profiles: listPromptProfiles(),
        activeProfile: config.id,
        config,
      });
    },
  },
  {
    method: "POST",
    path: "/api/prompts/reset",
    handler: async () => {
      const config = resetToDefault();
      return Response.json({
        profiles: listPromptProfiles(),
        activeProfile: config.id,
        config,
      });
    },
  },
  {
    method: "POST",
    path: "/api/prompts/fork",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        sourceProfileId?: string;
        name?: string;
        description?: string;
        changelogEntry?: string;
        tags?: string[];
      };
      const forked = forkPromptProfile(body.sourceProfileId || "default", body);
      return Response.json({
        success: true,
        profiles: listPromptProfiles(),
        activeProfile: forked.id,
        config: forked,
      });
    },
  },
];