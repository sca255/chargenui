import type { RequestHandler } from "../utils/router";
import type { AgentModifyRequest, AgentCompactRequest } from "../services/agent/agent-harness";
import type { ReimagineRequest } from "../services/agent/reimagine";
import { executeAgentModify, executeAgentCompact } from "../services/agent/agent-harness";
import { executeReimagine } from "../services/agent/reimagine";

export const agentRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/agent/modify",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as AgentModifyRequest;
      const result = await executeAgentModify(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/agent/compact",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as AgentCompactRequest;
      const result = await executeAgentCompact(body);
      return Response.json(result);
    },
  },
  {
    method: "POST",
    path: "/api/agent/reimagine",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as ReimagineRequest;
      if (!body.character || !body.provider || !["redesign", "inspire"].includes(body.mode)) {
        return Response.json({ error: "character, provider, and mode are required" }, { status: 400 });
      }
      const result = await executeReimagine(body);
      return Response.json(result);
    },
  },
];