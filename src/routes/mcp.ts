import type { RequestHandler } from "../utils/router";
import { executeMcpToolCall, type McpServerConfig } from "../services/mcp/client";

export const mcpRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/mcp-call",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
        server: McpServerConfig;
        toolName: string;
        toolArgs: Record<string, unknown>;
      };
      const output = await executeMcpToolCall(body.server, body.toolName, body.toolArgs);
      return Response.json({ output });
    },
  },
];