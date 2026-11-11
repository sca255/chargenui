import type { RequestHandler } from "../utils/router";
import { serverIpc, PRESET_THEMES } from "../services/ipc/server-ipc";
import type { RoleplayCharacter } from "../types/character";

export const ipcRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/ipc/status",
    handler: async () => Response.json(serverIpc.getStatus()),
  },
  {
    method: "GET",
    path: "/api/ipc/info",
    handler: async () => Response.json(serverIpc.getStatus()),
  },
  {
    method: "POST",
    path: "/api/ipc/suggest-concept",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const result = await serverIpc.submitConcept(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/ipc/idea",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const result = await serverIpc.submitConcept(body);
      return Response.json(result);
    },
  },
  {
    method: "GET",
    path: "/api/ipc/last-idea",
    handler: async () => Response.json({ idea: serverIpc.getLastIdea() }),
  },
  {
    method: "GET",
    path: "/api/ipc/ideas",
    handler: async () => Response.json({ ideas: serverIpc.getRecentIdeas() }),
  },
  {
    method: "GET",
    path: "/api/ipc/active-card",
    handler: async () => Response.json({ character: serverIpc.getActiveCharacter() }),
  },
  {
    method: "POST",
    path: "/api/ipc/active-card",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter };
      if (body?.character) {
        serverIpc.setActiveCharacter(body.character);
      }
      return Response.json({ success: true, character: serverIpc.getActiveCharacter() });
    },
  },
  {
    method: "GET",
    path: "/api/ipc/themes",
    handler: async () => Response.json({ themes: PRESET_THEMES }),
  },
];