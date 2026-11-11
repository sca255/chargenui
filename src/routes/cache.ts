import type { RequestHandler } from "../utils/router";
import {
  getLlmCacheStats,
  setLlmCacheEnabled,
  clearLlmCache,
} from "../services/llm/llm-cache";

export const cacheRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/llm/cache",
    handler: async () => Response.json(getLlmCacheStats()),
  },
  {
    method: "POST",
    path: "/api/llm/cache/toggle",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
      if (typeof body.enabled === "boolean") {
        setLlmCacheEnabled(body.enabled);
      }
      return Response.json(getLlmCacheStats());
    },
  },
  {
    method: "POST",
    path: "/api/llm/cache/clear",
    handler: async () => {
      const result = clearLlmCache();
      return Response.json({ success: true, ...result, ...getLlmCacheStats() });
    },
  },
];