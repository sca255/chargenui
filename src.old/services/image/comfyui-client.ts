import type {
  ImagePromptQueueItem,
  ComfyUIWorkflowAnalysis,
  ComfyUINodeOption,
  ComfyUIDispatchResult,
} from "../../types/image-prompt";
import { attachImageToQueueItem } from "./prompt-queue";

/**
 * Inspects a ComfyUI workflow JSON and discovers text/prompt nodes and samplers.
 * Supports standard ComfyUI API format JSON (as exported via "Save (API format)").
 */
export function analyzeComfyWorkflow(workflowJson: any): ComfyUIWorkflowAnalysis {
  if (!workflowJson || typeof workflowJson !== "object") {
    return {
      valid: false,
      format: "invalid",
      error: "Workflow is not a valid JSON object.",
      candidatePositiveNodes: [],
      candidateNegativeNodes: [],
      candidateSeedNodes: [],
    };
  }

  // Detect regular UI format with { nodes: [...] }
  if (Array.isArray(workflowJson.nodes)) {
    const candidatePositiveNodes: ComfyUINodeOption[] = [];
    const candidateNegativeNodes: ComfyUINodeOption[] = [];
    const candidateSeedNodes: Array<{ nodeId: string; classType: string; fieldName: string }> = [];

    for (const node of workflowJson.nodes) {
      const nodeId = String(node.id);
      const classType = String(node.type || "");
      const title = String(node.title || classType);
      const isClip = classType.toLowerCase().includes("clip") || classType.toLowerCase().includes("text");

      if (isClip || Array.isArray(node.widgets_values)) {
        const option: ComfyUINodeOption = {
          nodeId,
          classType,
          title,
          textInputs: ["text"],
        };
        candidatePositiveNodes.push(option);
        candidateNegativeNodes.push(option);
      }
    }

    return {
      valid: true,
      format: "ui",
      error: "Detected ComfyUI Editor format. For direct ComfyUI API execution, please enable 'Dev mode Options' in ComfyUI Settings and click 'Save (API format)'.",
      candidatePositiveNodes,
      candidateNegativeNodes,
      candidateSeedNodes,
    };
  }

  // Standard API format { [nodeId]: { class_type, inputs } }
  const candidatePositiveNodes: ComfyUINodeOption[] = [];
  const candidateNegativeNodes: ComfyUINodeOption[] = [];
  const candidateSeedNodes: Array<{ nodeId: string; classType: string; fieldName: string }> = [];

  let defaultPositiveNodeId: string | undefined;
  let defaultNegativeNodeId: string | undefined;
  let defaultSeedNodeId: string | undefined;

  for (const [nodeId, nodeObj] of Object.entries(workflowJson)) {
    if (!nodeObj || typeof nodeObj !== "object") continue;
    const node = nodeObj as any;
    const classType = String(node.class_type || "");
    const title = String(node._meta?.title || classType);
    const inputs = node.inputs || {};

    // Discover text fields in inputs
    const textFields: string[] = [];
    for (const [key, val] of Object.entries(inputs)) {
      if (typeof val === "string") {
        textFields.push(key);
      }
    }

    // Check if it's a prompt node (CLIPTextEncode or custom text node)
    const isClip =
      classType.toLowerCase().includes("cliptextencode") ||
      classType.toLowerCase().includes("prompt") ||
      classType.toLowerCase().includes("text") ||
      textFields.includes("text");

    if (isClip && textFields.length > 0) {
      const option: ComfyUINodeOption = {
        nodeId,
        classType,
        title,
        textInputs: textFields,
      };

      const titleLower = title.toLowerCase();
      const isExplicitNegative = titleLower.includes("neg") || titleLower.includes("bad");
      const isExplicitPositive = titleLower.includes("pos") || (!isExplicitNegative && titleLower.includes("clip"));

      if (isExplicitPositive) {
        candidatePositiveNodes.push(option);
        if (!defaultPositiveNodeId) defaultPositiveNodeId = nodeId;
      } else {
        candidatePositiveNodes.push(option);
      }

      if (isExplicitNegative) {
        candidateNegativeNodes.push(option);
        if (!defaultNegativeNodeId) defaultNegativeNodeId = nodeId;
      } else {
        candidateNegativeNodes.push(option);
      }
    }

    // Discover sampler seed fields
    if ("seed" in inputs) {
      candidateSeedNodes.push({ nodeId, classType, fieldName: "seed" });
      if (!defaultSeedNodeId) defaultSeedNodeId = nodeId;
    } else if ("noise_seed" in inputs) {
      candidateSeedNodes.push({ nodeId, classType, fieldName: "noise_seed" });
      if (!defaultSeedNodeId) defaultSeedNodeId = nodeId;
    }
  }

  // Fallbacks if no explicit pos/neg titles were named
  if (!defaultPositiveNodeId && candidatePositiveNodes.length > 0) {
    defaultPositiveNodeId = candidatePositiveNodes[0].nodeId;
  }
  if (!defaultNegativeNodeId && candidateNegativeNodes.length > 1) {
    defaultNegativeNodeId = candidateNegativeNodes[1].nodeId;
  }

  return {
    valid: candidatePositiveNodes.length > 0,
    format: "api",
    candidatePositiveNodes,
    candidateNegativeNodes,
    candidateSeedNodes,
    defaultPositiveNodeId,
    defaultNegativeNodeId,
    defaultSeedNodeId,
  };
}

/**
 * Patches a ComfyUI workflow JSON strictly with positive & negative prompts.
 * GUARANTEE: Does NOT alter any other parameters (samplers, steps, CFG, LoRAs, latents, VAE are untouched).
 */
export function patchComfyWorkflow(
  workflow: Record<string, any>,
  options: {
    positiveNodeId: string;
    positiveField?: string;
    positiveText: string;
    negativeNodeId?: string;
    negativeField?: string;
    negativeText?: string;
    randomizeSeed?: boolean;
    seedNodeId?: string;
  }
): Record<string, any> {
  // Deep clone to ensure original workflow is never mutated
  const cloned: Record<string, any> = JSON.parse(JSON.stringify(workflow));

  // 1. Inject Positive Prompt
  const posField = options.positiveField || "text";
  if (cloned[options.positiveNodeId] && cloned[options.positiveNodeId].inputs) {
    cloned[options.positiveNodeId].inputs[posField] = options.positiveText;
  }

  // 2. Inject Negative Prompt (if specified)
  if (options.negativeNodeId && cloned[options.negativeNodeId] && cloned[options.negativeNodeId].inputs) {
    const negField = options.negativeField || "text";
    cloned[options.negativeNodeId].inputs[negField] = options.negativeText || "";
  }

  // 3. Randomize Seed (if requested and seed node exists)
  if (options.randomizeSeed) {
    const newSeed = Math.floor(Math.random() * 900000000000000) + 100000000000000;
    if (options.seedNodeId && cloned[options.seedNodeId]?.inputs) {
      if ("seed" in cloned[options.seedNodeId].inputs) {
        cloned[options.seedNodeId].inputs.seed = newSeed;
      } else if ("noise_seed" in cloned[options.seedNodeId].inputs) {
        cloned[options.seedNodeId].inputs.noise_seed = newSeed;
      }
    } else {
      // Find any KSampler or node with seed input
      for (const node of Object.values(cloned)) {
        if (node && typeof node === "object" && node.inputs) {
          if ("seed" in node.inputs && typeof node.inputs.seed === "number") {
            node.inputs.seed = newSeed;
          }
        }
      }
    }
  }

  return cloned;
}

/**
 * Checks connectivity to a running ComfyUI instance.
 */
export async function checkComfyConnection(
  baseUrl = "http://127.0.0.1:8188"
): Promise<{ ok: boolean; devices?: any[]; error?: string }> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${cleanUrl}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `ComfyUI responded with HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, devices: data?.devices || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection refused" };
  }
}

/**
 * Queues a prompt to ComfyUI.
 */
export async function queuePromptToComfy(
  baseUrl: string,
  patchedWorkflow: Record<string, any>,
  clientId = "chargenui-client"
): Promise<{ promptId: string; number: number }> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const payload = {
    prompt: patchedWorkflow,
    client_id: clientId,
  };

  const res = await fetch(`${cleanUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ComfyUI prompt submission failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data?.prompt_id) {
    throw new Error("ComfyUI did not return a valid prompt_id.");
  }

  return { promptId: data.prompt_id, number: data.number };
}

/**
 * Polls ComfyUI /history/{promptId} until generation completes or times out.
 */
export async function pollComfyExecution(
  baseUrl: string,
  promptId: string,
  timeoutMs = 180000,
  pollIntervalMs = 1500
): Promise<{
  status: "completed" | "error";
  images: Array<{ filename: string; subfolder: string; type: string }>;
  error?: string;
}> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${cleanUrl}/history/${promptId}`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const historyData = await res.json();
        const runData = historyData[promptId];

        if (runData) {
          const status = runData.status;
          if (status?.status_str === "error") {
            const errorMsg =
              status?.messages?.map((m: any) => m[1]?.message || m[1] || "").join("; ") || "Unknown execution error";
            return { status: "error", images: [], error: errorMsg };
          }

          if (status?.completed || runData.outputs) {
            const images: Array<{ filename: string; subfolder: string; type: string }> = [];
            for (const outNode of Object.values(runData.outputs || {})) {
              if (outNode && typeof outNode === "object" && Array.isArray((outNode as any).images)) {
                for (const img of (outNode as any).images) {
                  images.push({
                    filename: img.filename,
                    subfolder: img.subfolder || "",
                    type: img.type || "output",
                  });
                }
              }
            }

            if (images.length > 0 || status?.completed) {
              return { status: "completed", images };
            }
          }
        }
      }
    } catch {
      // Continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { status: "error", images: [], error: "Execution timed out waiting for ComfyUI." };
}

/**
 * Downloads a completed image from ComfyUI and encodes as Data URL.
 */
export async function fetchComfyImageDataUrl(
  baseUrl: string,
  filename: string,
  subfolder = "",
  type = "output"
): Promise<string> {
  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({ filename, subfolder, type });
  const res = await fetch(`${cleanUrl}/view?${query.toString()}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch image from ComfyUI (${res.status})`);
  }

  const mime = res.headers.get("content-type") || "image/png";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Executes a single queue item to ComfyUI end-to-end.
 */
export async function dispatchQueueItemToComfy(
  baseUrl: string,
  item: ImagePromptQueueItem,
  options: {
    workflow: Record<string, any>;
    positiveNodeId: string;
    positiveField?: string;
    negativeNodeId?: string;
    negativeField?: string;
    randomizeSeed?: boolean;
    seedNodeId?: string;
  }
): Promise<ComfyUIDispatchResult> {
  const positivePrompt = item.prompt || item.positivePrompt || "";
  const negativePrompt = item.negativePrompt || "";

  const patchedWorkflow = patchComfyWorkflow(options.workflow, {
    positiveNodeId: options.positiveNodeId,
    positiveField: options.positiveField,
    positiveText: positivePrompt,
    negativeNodeId: options.negativeNodeId,
    negativeField: options.negativeField,
    negativeText: negativePrompt,
    randomizeSeed: options.randomizeSeed !== false,
    seedNodeId: options.seedNodeId,
  });

  const { promptId } = await queuePromptToComfy(baseUrl, patchedWorkflow);
  const result = await pollComfyExecution(baseUrl, promptId);

  if (result.status === "error" || result.images.length === 0) {
    return {
      queueItemId: item.id,
      promptId,
      status: "error",
      imageUrls: [],
      error: result.error || "No images returned by ComfyUI.",
    };
  }

  const firstImg = result.images[0];
  const dataUrl = await fetchComfyImageDataUrl(baseUrl, firstImg.filename, firstImg.subfolder, firstImg.type);

  // Attach directly to queue item and character card
  const attachType = item.imagePurpose === "greeting" ? "greeting" : "avatar";
  await attachImageToQueueItem(item.id, dataUrl, true, attachType);

  const cleanUrl = baseUrl.replace(/\/+$/, "");
  const imageUrls = result.images.map(
    (img) => `${cleanUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${encodeURIComponent(img.type)}`
  );

  return {
    queueItemId: item.id,
    promptId,
    status: "completed",
    imageUrls,
    imageDataUrl: dataUrl,
  };
}

/**
 * Exports a ready-to-use ComfyUI API batch payload containing pre-patched workflows for all queue items.
 */
export function exportComfyBatchFile(
  queueItems: ImagePromptQueueItem[],
  options: {
    workflow: Record<string, any>;
    positiveNodeId: string;
    positiveField?: string;
    negativeNodeId?: string;
    negativeField?: string;
    randomizeSeed?: boolean;
    seedNodeId?: string;
  }
): string {
  const batch = queueItems.map((item, idx) => {
    const positivePrompt = item.prompt || item.positivePrompt || "";
    const negativePrompt = item.negativePrompt || "";

    const patched = patchComfyWorkflow(options.workflow, {
      positiveNodeId: options.positiveNodeId,
      positiveField: options.positiveField,
      positiveText: positivePrompt,
      negativeNodeId: options.negativeNodeId,
      negativeField: options.negativeField,
      negativeText: negativePrompt,
      randomizeSeed: options.randomizeSeed !== false,
      seedNodeId: options.seedNodeId,
    });

    return {
      index: idx + 1,
      queueItemId: item.id,
      characterName: item.characterName,
      imagePurpose: item.imagePurpose || "avatar",
      positivePrompt,
      negativePrompt,
      workflow: patched,
    };
  });

  return JSON.stringify(batch, null, 2);
}
