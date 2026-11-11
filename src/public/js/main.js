// Main entrypoint for CharGenUI Modular Frontend
import { state } from "./core/state.js";
import { el } from "./core/dom.js";
import { apiGet, apiPost } from "./core/api.js";
import { syncStateToUI, syncUIToState } from "./core/ui-sync.js";
import { updateProviderBadge, assertProviderConfigured, updateLlmCacheBadge } from "./utils/provider.js";
import { recordSnapshot, escapeHtml } from "./utils/diff.js";
import { renderAltGreetings } from "./features/alt-greetings.js";
import { initIpcWebSocket, showIpcToast, notifyIpcActiveCard } from "./features/ipc.js";
import { renderThemePills } from "./features/themes.js";
import { initEraForgeUI, loadInstalledExtensions } from "./features/eras.js";
import { initComfyUIClient } from "./features/comfyui.js";
import { renderPinnedRules, initTargetedDoctorSelection, renderAgentChatStream } from "./features/agent.js";
import { fetchLibrary, updateActiveCardBadge } from "./features/library.js";
import { fetchHouseholds } from "./features/households.js";
import { refreshImageQueue } from "./features/image-prompts.js";
import { checkAutosaveAvailability } from "./features/autosave.js";
import { loadPromptProfilesUI } from "./features/prompt-profiles.js";
import "./features/navigation-lorebook.js";
import "./features/gallery.js";
import "./features/audit.js";
import "./features/weaver.js";
import "./features/vision.js";
import "./features/enhance.js";
import { initEvolutionUI, initTimelineUI, initBranchesUI, initAssetPipelineUI } from "./features/net-new-tabs.js";
import "./modals/settings-and-incorporate.js";
import "./modals/regen-greetings-spine.js";

// Expose core on window for debugging & interoperability
if (typeof window !== "undefined") {
  window.state = state;
  window.el = el;
  window.syncStateToUI = syncStateToUI;
  window.syncUIToState = syncUIToState;
  window.showIpcToast = showIpcToast;
  window.recordSnapshot = recordSnapshot;
  window.escapeHtml = escapeHtml;
  window.assertProviderConfigured = assertProviderConfigured;
  window.renderAltGreetings = renderAltGreetings;
}


// Load Saved Settings & Check Environment Keys
async function initApp() {
  const saved = localStorage.getItem("chargen_provider_config");
  if (saved) {
    try {
      state.provider = { ...state.provider, ...JSON.parse(saved) };
    } catch {}
  }

  const savedSearch = localStorage.getItem("chargen_search_config");
  if (savedSearch) {
    try {
      state.searchConfig = JSON.parse(savedSearch);
    } catch {}
  }

  const savedImage = localStorage.getItem("chargen_image_config");
  if (savedImage) {
    try {
      state.imageConfig = { ...state.imageConfig, ...JSON.parse(savedImage) };
    } catch {}
  }
  if (el.imgTargetModel && state.imageConfig?.defaultTargetModel) {
    el.imgTargetModel.value = state.imageConfig.defaultTargetModel;
  }
  if (el.imgArtStyle && state.imageConfig?.defaultArtStyle) {
    el.imgArtStyle.value = state.imageConfig.defaultArtStyle;
  }

  // Fire initialization requests in parallel rather than blocking in serial waterfall
  const promptProfileRestorePromise = (async () => {
    await loadPromptProfilesUI();
    const savedPromptProfile = localStorage.getItem("chargen_active_prompt_profile");
    if (savedPromptProfile) {
      try {
        const pRes = await fetch("/api/prompts/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: savedPromptProfile })
        });
        if (pRes.ok) {
          await loadPromptProfilesUI();
        }
      } catch (e) {
        console.warn("Failed restoring saved prompt profile:", e);
      }
    }
  })();

  const envPromise = (async () => {
    try {
      const res = await fetch("/api/env-keys");
      if (res.ok) state.envKeys = await res.json();
    } catch {}
  })();

  // Render active character immediately from state/cache for zero-latency first paint
  syncStateToUI();
  recordSnapshot("Initial State");

  // Non-blocking parallel data fetch
  Promise.all([
    promptProfileRestorePromise,
    envPromise,
    fetchLibrary(),
    fetchHouseholds(),
    refreshImageQueue(),
  ]).finally(() => {
    updateActiveCardBadge();
    checkAutosaveAvailability();
  });

  initComfyUIClient();
  initIpcWebSocket();
  updateProviderBadge();
  updateActiveCardBadge();
  updateLlmCacheBadge();

  document.getElementById("btn-toggle-llm-cache")?.addEventListener("click", async () => {
    try {
      const stats = await apiGet("/api/llm/cache");
      const nextState = !stats.enabled;
      await apiPost("/api/llm/cache/toggle", { enabled: nextState });
      await updateLlmCacheBadge();
      showIpcToast(`LLM Response Cache turned ${nextState ? "ON (instant replay active)" : "OFF"}`, "info");
    } catch (e) {
      alert("Failed toggling LLM cache: " + e.message);
    }
  });

  document.getElementById("btn-toggle-llm-cache")?.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    if (confirm("Clear all cached LLM responses from disk? Next runs will re-fetch from API.")) {
      try {
        const res = await apiPost("/api/llm/cache/clear", {});
        await updateLlmCacheBadge();
        showIpcToast(`Cleared ${res.cleared || 0} cached responses from disk`, "info");
      } catch (err) {
        alert("Failed clearing LLM cache: " + err.message);
      }
    }
  });

  try {
    const savedPinned = localStorage.getItem("chargen_agent_pinned_rules");
    if (savedPinned) state.agentPinnedRules = JSON.parse(savedPinned);
  } catch {}
  renderPinnedRules();

  try {
    const savedChat = localStorage.getItem("chargen_agent_chat_history");
    if (savedChat) state.agentChatHistory = JSON.parse(savedChat);
  } catch {}
  initTargetedDoctorSelection();
  renderAgentChatStream();
  initEraForgeUI();
  initEvolutionUI();
  initTimelineUI();
  initBranchesUI();
  initAssetPipelineUI();
  renderThemePills();
}

// Initialize Application on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

console.log("⚡ CharGen Modular Frontend Initialized Successfully!");
