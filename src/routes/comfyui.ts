import type { RequestHandler } from "../utils/router";
import * as fs from "node:fs";
import { sendComfyClientRPC, COMFYCLIENT_SOCKET } from "../utils/comfy-client";
import {
  analyzeComfyWorkflow,
  checkComfyConnection,
  dispatchQueueItemToComfy,
  exportComfyBatchFile,
} from "../services/image/comfyui-client";
import { listPromptQueue } from "../services/image/prompt-queue";

export const comfyuiRoutes: RequestHandler[] = [
  {
    method: "GET",
    path: "/api/comfyui/status",
    handler: async (req) => {
      const url = new URL(req.url);
      const socketPath = url.searchParams.get("socket") || COMFYCLIENT_SOCKET;
      const exists = fs.existsSync(socketPath);
      return Response.json({
        ok: exists,
        socketPath,
        message: exists ? "ComfyClient socket detected" : `Socket file not found at ${socketPath}`,
        server: "comfyclient",
      });
    },
  },
  {
    method: "GET",
    path: "/api/comfyui/settings",
    handler: async () => {
      try {
        const settings = await sendComfyClientRPC("get_settings", {});
        return Response.json({ ok: true, settings });
      } catch (err: any) {
        return Response.json({ ok: false, error: err.message });
      }
    },
  },
  {
    method: "POST",
    path: "/api/comfyui/settings",
    handler: async (req) => {
      try {
        const body = await req.json().catch(() => ({}));
        const settings = await sendComfyClientRPC("set_settings", body);
        return Response.json({ ok: true, settings });
      } catch (err: any) {
        return Response.json({ ok: false, error: err.message });
      }
    },
  },
  {
    method: "POST",
    path: "/api/comfyui/trigger",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({}))) as {
        promptName?: string;
        runAll?: boolean;
        items?: Array<Record<string, any>>;
      };

      if (!fs.existsSync(COMFYCLIENT_SOCKET)) {
        return Response.json(
          {
            ok: false,
            socketActive: false,
            error: `ComfyClient socket not active at ${COMFYCLIENT_SOCKET}. Start ComfyClient via ./comfyclient/run.sh to process generations.`,
          },
          { status: 503 }
        );
      }

      let itemsToDispatch = body.items;
      if (!itemsToDispatch || itemsToDispatch.length === 0) {
        const diskQueue = await listPromptQueue();
        if (body.promptName) {
          itemsToDispatch = diskQueue.filter((i) => i.id === body.promptName || i.name === body.promptName);
        } else {
          itemsToDispatch = diskQueue.filter((i) => i.status !== "completed");
        }
      }

      try {
        const result = await sendComfyClientRPC("dispatch_prompt", {
          items: itemsToDispatch && itemsToDispatch.length > 0 ? itemsToDispatch : undefined,
          id: body.promptName,
          name: body.promptName,
          auto_run: true,
        });
        return Response.json({ ok: true, socketActive: true, result });
      } catch (err: any) {
        return Response.json({ ok: false, socketActive: false, error: err.message }, { status: 500 });
      }
    },
  },
  {
    method: "POST",
    path: "/api/comfyui/analyze",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { workflow: any };
      const analysis = analyzeComfyWorkflow(body.workflow);
      return Response.json(analysis);
    },
  },
  {
    method: "POST",
    path: "/api/comfyui/dispatch",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
        comfyUrl?: string;
        workflow: Record<string, any>;
        positiveNodeId: string;
        positiveField?: string;
        negativeNodeId?: string;
        negativeField?: string;
        randomizeSeed?: boolean;
        seedNodeId?: string;
        queueItemIds?: string[];
      };

      const comfyUrl = body.comfyUrl || "http://127.0.0.1:8188";
      const allItems = await listPromptQueue();
      const targetItems =
        body.queueItemIds && body.queueItemIds.length > 0
          ? allItems.filter((i) => body.queueItemIds!.includes(i.id))
          : allItems.filter((i) => i.status === "queued");

      if (targetItems.length === 0) {
        return Response.json(
          { results: [], message: "No queued items to process" },
        );
      }

      const results = [];
      for (const item of targetItems) {
        try {
          const res = await dispatchQueueItemToComfy(comfyUrl, item, {
            workflow: body.workflow,
            positiveNodeId: body.positiveNodeId,
            positiveField: body.positiveField,
            negativeNodeId: body.negativeNodeId,
            negativeField: body.negativeField,
            randomizeSeed: body.randomizeSeed,
            seedNodeId: body.seedNodeId,
          });
          results.push(res);
        } catch (err: any) {
          results.push({
            queueItemId: item.id,
            promptId: "",
            status: "error",
            imageUrls: [],
            error: err?.message || "Execution error",
          });
        }
      }

      return Response.json({ results });
    },
  },
  {
    method: "POST",
    path: "/api/comfyui/export-batch",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as {
        workflow: Record<string, any>;
        positiveNodeId: string;
        positiveField?: string;
        negativeNodeId?: string;
        negativeField?: string;
        randomizeSeed?: boolean;
        seedNodeId?: string;
        queueItemIds?: string[];
      };

      const allItems = await listPromptQueue();
      const targetItems =
        body.queueItemIds && body.queueItemIds.length > 0
          ? allItems.filter((i) => body.queueItemIds!.includes(i.id))
          : allItems;

      const batchJson = exportComfyBatchFile(targetItems, {
        workflow: body.workflow,
        positiveNodeId: body.positiveNodeId,
        positiveField: body.positiveField,
        negativeNodeId: body.negativeNodeId,
        negativeField: body.negativeField,
        randomizeSeed: body.randomizeSeed,
        seedNodeId: body.seedNodeId,
      });

      return new Response(batchJson, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="comfyui_batch_${Date.now()}.json"`,
        },
      });
    },
  },
];