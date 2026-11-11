import type { RequestHandler } from "../utils/router";
import * as fs from "node:fs";
import * as path from "node:path";
import { PUBLIC_DIR, SCRIPTS_DIR } from "../config/constants";

export const staticRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/scripts/comfyui_batch_runner.py",
    handler: async () => {
      const scriptPath = path.join(SCRIPTS_DIR, "comfyui_batch_runner.py");
      if (fs.existsSync(scriptPath)) {
        return new Response(Bun.file(scriptPath), {
          headers: {
            "Content-Type": "text/x-python; charset=utf-8",
            "Content-Disposition": 'attachment; filename="comfyui_batch_runner.py"',
          },
        });
      }
      return Response.json({ error: "Script not found" }, { status: 404 });
    },
  },
  {
    method: "GET",
    path: "/*",
    handler: async (req) => {
      const url = new URL(req.url);
      let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(PUBLIC_DIR, "index.html");
      }
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    },
  },
];