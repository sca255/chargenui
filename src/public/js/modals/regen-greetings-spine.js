import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { showIpcToast } from "../features/ipc.js";

export function openRegenGreetingsSpineModal() {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  const hasSpine = !!(state.character.extensions && state.character.extensions["chargenui:authoringSpine"]);
  if (!hasSpine) {
    alert("No Authoring Spine found. Please use 'Synthesize Spine' first or create a new character via Spark/Weaver.");
    return;
  }

  if (el.regenTargetCharName) el.regenTargetCharName.textContent = state.character.name;
  const storedStoryArc = state.character?.extensions?.["chargenui:creationInputs"]?.storyArc || "";
  if (el.regenStoryArc) el.regenStoryArc.value = storedStoryArc || (el.genStoryArc ? el.genStoryArc.value.trim() : "");
  if (el.regenMinAlts) el.regenMinAlts.value = el.genMinAlts?.value || "6";
  if (el.regenSteering) el.regenSteering.value = "";

  if (el.modalRegenGreetingsSpine) el.modalRegenGreetingsSpine.classList.remove("hidden");
  if (el.regenLoading) el.regenLoading.style.display = "none";
}

export function closeRegenGreetingsSpineModal() {
  if (el.modalRegenGreetingsSpine) el.modalRegenGreetingsSpine.classList.add("hidden");
}

export async function handleRegenerateGreetingsSpine() {
  if (!assertProviderConfigured()) return;
  if (!state.character || !state.character.name) return;

  const hasSpine = !!(state.character.extensions && state.character.extensions["chargenui:authoringSpine"]);
  if (!hasSpine) {
    alert("No Authoring Spine found. Please use 'Synthesize Spine' first.");
    return;
  }

  const storyArc = el.regenStoryArc?.value?.trim() || undefined;
  const minAltGreetings = parseInt(el.regenMinAlts?.value || "6", 10);
  const steeringInstructions = el.regenSteering?.value?.trim() || undefined;

  if (el.regenLoading) el.regenLoading.style.display = "block";
  if (el.btnRegenExecute) {
    el.btnRegenExecute.disabled = true;
    el.btnRegenExecute.innerHTML = "<span class='spinner'></span> <span>Regenerating...</span>";
  }

  try {
    const payload = {
      character: state.character,
      options: {
        scenarioPrompt: "",
        steeringInstructions,
        minAltGreetings: Math.max(1, minAltGreetings),
        ...(storyArc ? { storyArcOverride: storyArc } : {}),
      },
      provider: state.provider,
      mode: "regenerate_with_spine",
    };

    const res = await apiPost("/api/enhance", payload);
    
    if (res.character && res.character.alternate_greetings) {
      state.character = { ...state.character, ...res.character };
      syncStateToUI();
      showIpcToast(`✅ Regenerated ${res.character.alternate_greetings.length} arc-aware greetings!`, "success");
      closeRegenGreetingsSpineModal();
    } else {
      throw new Error("No greetings returned from regeneration");
    }
  } catch (err) {
    alert("❌ Regeneration failed: " + (err.message || err));
  } finally {
    if (el.regenLoading) el.regenLoading.style.display = "none";
    if (el.btnRegenExecute) {
      el.btnRegenExecute.disabled = false;
      el.btnRegenExecute.innerHTML = "<span>🧬 Regenerate Greetings with Spine</span>";
    }
  }
}

export function initRegenGreetingsSpineListeners() {
  el.btnRegenExecute?.addEventListener("click", handleRegenerateGreetingsSpine);
  el.btnRegenCancel?.addEventListener("click", closeRegenGreetingsSpineModal);
  el.btnCloseRegenGreetingsSpine?.addEventListener("click", closeRegenGreetingsSpineModal);

  el.btnRunGreetingsSpine?.addEventListener("click", () => {
    openRegenGreetingsSpineModal();
  });
  document.getElementById("btn-regen-alts-direct")?.addEventListener("click", () => {
    openRegenGreetingsSpineModal();
  });
}
