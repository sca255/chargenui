import type { RequestHandler } from "../utils/router";
import { retrieveCharacterLore } from "../services/search/web-search";

export const searchRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/search-lore",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
        query: string;
        providerType?: "duckduckgo" | "tavily" | "brave" | "searxng";
        apiKey?: string;
        searxngUrl?: string;
        includeHeadcanons?: boolean;
        provider?: any;
      };
      if (!body.apiKey) {
        if (body.providerType === "tavily" && process.env.TAVILY_API_KEY) {
          body.apiKey = process.env.TAVILY_API_KEY;
        } else if (body.providerType === "brave" && process.env.BRAVE_API_KEY) {
          body.apiKey = process.env.BRAVE_API_KEY;
        }
      }
      if (!body.searxngUrl && process.env.SEARXNG_URL) {
        body.searxngUrl = process.env.SEARXNG_URL;
      }
      const result = await retrieveCharacterLore(body);
      return Response.json(result);
    },
  },
];