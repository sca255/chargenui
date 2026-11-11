import type { RequestHandler } from "../utils/router";

export const healthRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/health",
    handler: async () => Response.json({ status: "ok", uptime: process.uptime() }),
  },
  {
    method: "GET",
    path: "/api/env-keys",
    handler: async () => Response.json({
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    }),
  },
];