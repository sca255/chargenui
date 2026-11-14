import type { RequestHandler } from "../utils/router";
import {
  getAllEras,
  getEraById,
  searchErasSemantic,
  getEraCategories,
  searchEraCategories,
  createUserEra,
  deleteUserEra,
  listExtensionFiles,
  saveExtensionFile,
  deleteExtensionFile,
  validateEraCompliance,
  resolveEraInfo,
  formatEraPromptSnippet,
} from "../services/eras/eras-service";
import { executeEraAgentTurn } from "../services/eras/era-agent";

const eraAgentRuns = new Map<string, { aborted: boolean; queued: string[] }>();

export const erasRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/eras",
    handler: async () => {
      const all = getAllEras(true);
      const eras = Object.values(all);
      const categories = Array.from(new Set(eras.map((e) => e.category).filter(Boolean)));
      const regions = Array.from(new Set(eras.map((e) => e.region).filter(Boolean)));
      return Response.json({ eras, total: eras.length, categories, regions });
    },
  },
  {
    method: "GET",
    path: "/api/eras/resolve",
    handler: async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q") || "";
      const era = resolveEraInfo(q);
      const promptSnippet = era ? formatEraPromptSnippet(era) : (q ? formatEraPromptSnippet(q) : "");
      return Response.json({ era: era || null, promptSnippet });
    },
  },
  {
    method: "GET",
    path: "/api/eras/search",
    handler: async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q") || "";
      const category = url.searchParams.get("category") || "All";
      const region = url.searchParams.get("region") || "All";
      const onlyUser = url.searchParams.get("onlyUser") === "true";
      const filterNsfl = url.searchParams.get("nsfl") === "false" || url.searchParams.get("filterNsfl") === "true";
      const results = searchErasSemantic(q, category, region, onlyUser, filterNsfl);
      return Response.json({ results, total: results.length });
    },
  },
  {
    method: "GET",
    path: "/api/eras/categories",
    handler: async (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q") || "";
      const categories = searchEraCategories(q);
      return Response.json({ categories, total: categories.length });
    },
  },
  {
    method: "POST",
    path: "/api/eras/user",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const created = createUserEra(body);
      return Response.json({ success: true, era: created });
    },
  },
  {
    method: "DELETE",
    path: "/api/eras/user/:id",
    handler: async (req, params) => {
      const ok = deleteUserEra(params.id);
      return Response.json({ success: ok });
    },
  },
  {
    method: "GET",
    path: "/api/eras/id/:id",
    handler: async (req, params) => {
      const id = decodeURIComponent(params.id);
      const era = getEraById(id);
      return Response.json({ era: era || null });
    },
  },
  {
    method: "GET",
    path: "/api/eras/extensions",
    handler: async () => {
      const files = listExtensionFiles();
      return Response.json({ files, total: files.length });
    },
  },
  {
    method: "POST",
    path: "/api/eras/extensions/save",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const { filename, content, destination } = body;
      if (!filename || !content) {
        return Response.json({ error: "Missing filename or content" }, { status: 400 });
      }
      const saved = saveExtensionFile(filename, content, destination);
      return Response.json({ success: true, saved });
    },
  },
  {
    method: "DELETE",
    path: "/api/eras/extensions/:filename",
    handler: async (req, params) => {
      const url = new URL(req.url);
      const destination = url.searchParams.get("destination") || undefined;
      const ok = deleteExtensionFile(params.filename, destination);
      return Response.json({ success: ok });
    },
  },
  {
    method: "POST",
    path: "/api/eras/validate",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const { era, pairEra } = body;
      if (!era) {
        return Response.json({ error: "Missing era object" }, { status: 400 });
      }
      const report = validateEraCompliance(era, pairEra);
      return Response.json({ success: true, report });
    },
  },
  {
    method: "POST",
    path: "/api/eras/agent/chat",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const runId = String(body.runId || crypto.randomUUID());
      const cancelSignal = { aborted: false, queued: [] as string[] };
      eraAgentRuns.set(runId, cancelSignal);
      try {
        const result = await executeEraAgentTurn({
          ...body,
          cancelSignal,
          instructionQueue: () => cancelSignal.queued.splice(0),
        });
        return Response.json({ ...result, runId });
      } finally {
        eraAgentRuns.delete(runId);
      }
    },
  },
  {
    method: "POST",
    path: "/api/eras/agent/cancel",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const runId = String(body.runId || "");
      const signal = eraAgentRuns.get(runId);
      if (signal) signal.aborted = true;
      return Response.json({ success: Boolean(signal), cancelled: Boolean(signal) });
    },
  },
  {
    method: "POST",
    path: "/api/eras/agent/queue",
    handler: async (req) => {
      const body = await req.json().catch(() => ({}));
      const runId = String(body.runId || "");
      const instruction = String(body.instruction || "").trim();
      const signal = eraAgentRuns.get(runId);
      if (!signal || !instruction) {
        return Response.json({ success: false }, { status: 400 });
      }
      signal.queued.push(instruction);
      return Response.json({ success: true, queued: signal.queued.length });
    },
  },
];