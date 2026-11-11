// ComfyClient Dedicated Unix Socket & HTTP Client
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { showIpcToast } from "./ipc.js";
import { switchImgModalTab, refreshImageQueue } from "./image-prompts.js";

// -------------------------------------------------------------
// ComfyUI Direct Client & Workflow Dispatcher
// -------------------------------------------------------------

state.comfy = {
  socket: localStorage.getItem("chargen_comfyclient_socket") || "/tmp/comfyclient.sock",
};

export function initComfyUIClient() {
  if (el.comfyServerUrl) {
    el.comfyServerUrl.value = state.comfy.socket;
    el.comfyServerUrl.addEventListener("change", () => {
      state.comfy.socket = el.comfyServerUrl.value.trim() || "/tmp/comfyclient.sock";
      localStorage.setItem("chargen_comfyclient_socket", state.comfy.socket);
    });
  }

  el.btnTestComfyConn?.addEventListener("click", testComfyConnection);
  el.btnComfyRunAll?.addEventListener("click", () => handleDispatchComfyBatch());
}

export async function testComfyConnection() {
  const socket = el.comfyServerUrl?.value.trim() || "/tmp/comfyclient.sock";
  if (el.comfyStatusBadge) {
    el.comfyStatusBadge.textContent = "⏳ Checking...";
    el.comfyStatusBadge.style.color = "#fbbf24";
  }

  try {
    const res = await fetch(`/api/comfyui/status?socket=${encodeURIComponent(socket)}`);
    const data = await res.json();
    if (data.ok) {
      if (el.comfyStatusBadge) {
        el.comfyStatusBadge.textContent = "🟢 Socket Active";
        el.comfyStatusBadge.style.background = "rgba(16, 185, 129, 0.2)";
        el.comfyStatusBadge.style.color = "#34d399";
      }
    } else {
      if (el.comfyStatusBadge) {
        el.comfyStatusBadge.textContent = "🔴 Not Found (" + socket + ")";
        el.comfyStatusBadge.style.background = "rgba(239, 68, 68, 0.2)";
        el.comfyStatusBadge.style.color = "#f87171";
      }
    }
  } catch (err) {
    if (el.comfyStatusBadge) {
      el.comfyStatusBadge.textContent = "🔴 Error: " + err.message;
      el.comfyStatusBadge.style.color = "#f87171";
    }
  }
}

export function logComfyProgress(text) {
  if (!el.comfyProgressLines) return;
  if (el.comfyProgressConsole) el.comfyProgressConsole.style.display = "block";
  const div = document.createElement("div");
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  el.comfyProgressLines.appendChild(div);
  el.comfyProgressConsole.scrollTop = el.comfyProgressConsole.scrollHeight;
}

export async function handleDispatchComfyBatch(queueItemIds) {
  const targetItems = queueItemIds && queueItemIds.length > 0
    ? state.imageQueue.filter((i) => queueItemIds.includes(i.id))
    : state.imageQueue;

  const count = targetItems.length || state.imageQueue.length;
  if (count === 0 && (!queueItemIds || queueItemIds.length === 0)) {
    alert("The prompt queue is empty. Generate prompts first in the Prompt Generator tab!");
    switchImgModalTab("img-tab-gen");
    return;
  }

  const promptName = queueItemIds && queueItemIds.length === 1 ? queueItemIds[0] : null;
  const originalText = el.btnComfyRunAll ? el.btnComfyRunAll.innerHTML : "";
  if (el.btnComfyRunAll) {
    el.btnComfyRunAll.disabled = true;
    el.btnComfyRunAll.innerHTML = "<span>⏳ Dispatching to ComfyClient...</span>";
  }

  logComfyProgress(promptName ? `Dispatching prompt '${promptName}' to ComfyClient...` : `Dispatching all ${count} prompt(s) to ComfyClient...`);

  try {
    const res = await fetch("/api/comfyui/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptName: promptName || undefined,
        runAll: !promptName,
        items: targetItems.length > 0 ? targetItems : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      logComfyProgress(`ComfyClient offline: ${data.error || "Socket not responding"}`);
      alert(
        `⚡ All prompts are ready in the queue (data/image_prompt_queue.json)!\n\n` +
        `ComfyClient is currently offline.\nTo generate your images:\n` +
        `1. Start ComfyClient in your terminal: ./comfyclient/run.sh\n` +
        `2. ComfyClient will load the prompts with your configured workflow & models and automatically return generated images back here!`
      );
      return;
    }

    logComfyProgress(`✓ ComfyClient accepted run command! Status: Queued in ComfyClient.`);
    showIpcToast(`🚀 Successfully queued prompt(s) in ComfyClient!`, "success");
    await refreshImageQueue();
  } catch (err) {
    logComfyProgress(`✗ Failed: ${err.message}`);
    alert(`⚡ Prompts are saved in data/image_prompt_queue.json.\nStart ComfyClient (./comfyclient/run.sh) to generate.`);
  } finally {
    if (el.btnComfyRunAll) {
      el.btnComfyRunAll.disabled = false;
      el.btnComfyRunAll.innerHTML = originalText;
    }
  }
}

export async function handleExportComfyBatchJson() {
  if (!state.comfy.workflow) {
    alert("Please paste or load your ComfyUI workflow JSON first!");
    return;
  }

  const posNodeId = el.comfyPosNodeSelect?.value;
  if (!posNodeId) {
    alert("Please select the Positive Prompt Node first!");
    return;
  }

  const payload = {
    workflow: state.comfy.workflow,
    positiveNodeId: posNodeId,
    negativeNodeId: el.comfyNegNodeSelect?.value || undefined,
    randomizeSeed: !!el.comfyRandomizeSeedCheck?.checked,
  };

  try {
    const res = await fetch("/api/comfyui/export-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comfyui_batch_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export batch JSON: " + err.message);
  }
}


