import { serve } from "bun";
import * as os from "node:os";
import * as path from "node:path";

import { healthRoutes } from "./routes/health";
import { generateRoutes } from "./routes/generate";
import { enhanceRoutes } from "./routes/enhance";
import { visionRoutes } from "./routes/vision";
import { agentRoutes } from "./routes/agent";
import { cardRoutes } from "./routes/card";
import { searchRoutes } from "./routes/search";
import { mcpRoutes } from "./routes/mcp";
import { cacheRoutes } from "./routes/cache";
import { promptsRoutes } from "./routes/prompts";
import { cardsRoutes } from "./routes/cards";
import { householdsRoutes } from "./routes/households";
import { imagePromptRoutes } from "./routes/image-prompts";
import { comfyuiRoutes } from "./routes/comfyui";
import { ipcRoutes } from "./routes/ipc";
import { erasRoutes } from "./routes/eras";
import { pluginsRoutes } from "./routes/plugins";
import { mutationsRoutes } from "./routes/mutations";
import { timelineRoutes } from "./routes/timeline";
import { branchesRoutes } from "./routes/branches";
import { assetGenerationRoutes } from "./routes/asset-generation";
import { staticRoutes } from "./routes/static";

import { findRoute } from "./utils/router";
import { withCors, handleCors, errorWithCors, notFoundWithCors } from "./middleware/cors";
import { serverIpc } from "./services/ipc/server-ipc";
import { PORT, PUBLIC_DIR, CHARGEN_IPC_SOCKET } from "./config/constants";

const allRoutes = [
  ...healthRoutes,
  ...generateRoutes,
  ...enhanceRoutes,
  ...visionRoutes,
  ...agentRoutes,
  ...cardRoutes,
  ...searchRoutes,
  ...mcpRoutes,
  ...cacheRoutes,
  ...promptsRoutes,
  ...cardsRoutes,
  ...householdsRoutes,
  ...imagePromptRoutes,
  ...comfyuiRoutes,
  ...ipcRoutes,
  ...erasRoutes,
  ...pluginsRoutes,
  ...mutationsRoutes,
  ...timelineRoutes,
  ...branchesRoutes,
  ...assetGenerationRoutes,
  ...staticRoutes,
];

console.log(`🚀 Starting CharGen Harness on port ${PORT}...`);

const server = serve({
  port: PORT,
  hostname: "0.0.0.0",
  idleTimeout: 0,
  async fetch(req, serverInstance) {
    const url = new URL(req.url);
    const method = req.method;

    // CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // WebSocket Upgrade for IPC
    if (url.pathname === "/api/ipc/ws" || url.pathname === "/ws") {
      const upgraded = (serverInstance as any).upgrade(req);
      if (upgraded) return undefined;
      return errorWithCors("WebSocket upgrade failed", 400);
    }

    // API Routes
    if (url.pathname.startsWith("/api/")) {
      try {
        const routeMatch = findRoute(allRoutes, method, url.pathname);
        if (routeMatch) {
          const response = await routeMatch.handler(req, routeMatch.params);
          return withCors(response);
        }

        return notFoundWithCors();
      } catch (err) {
        console.error("API error:", err);
        return errorWithCors((err as Error).message || "Internal server error", 500);
      }
    }

    // Static file serving (handled by staticRoutes with /* pattern)
    const routeMatch = findRoute(allRoutes, method, url.pathname);
    if (routeMatch) {
      const response = await routeMatch.handler(req, routeMatch.params);
      return withCors(response);
    }

    return notFoundWithCors();
  },
  websocket: {
    open(ws) {
      serverIpc.registerClient(ws);
    },
    message(ws, message) {
      serverIpc.handleMessage(ws, message);
    },
    close(ws) {
      serverIpc.unregisterClient(ws);
    },
  },
});

console.log(`✨ CharGen Harness is running at: http://localhost:${server.port}`);

// Dual-bind IPC: Start Unix Domain Socket server for local side apps & daemons
serverIpc.startUnixServer(CHARGEN_IPC_SOCKET);

// Clean up Unix socket on process termination
const handleShutdown = () => {
  serverIpc.stopUnixServer();
  process.exit(0);
};
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

console.log(`🔌 Dual-bind IPC active: HTTP/WS on :${server.port} + Unix Socket at: ${serverIpc.getSocketPath()}`);