// Image Prompt Generation, Visual Identity & Persistent Queue
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast, notifyIpcActiveCard } from "./ipc.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { clearAllGalleryImages, addImagesToGallery, closeGalleryLightbox } from "./gallery.js";
import { renderAltGreetings } from "./alt-greetings.js";
import { updateActiveCardBadge, saveActiveCardToLibrary } from "./library.js";
import { handleDispatchComfyBatch } from "./comfyui.js";
import { runEnhance, getGlobalSteering } from "./enhance.js";

export function switchImgModalTab(tabId) {
  el.tabBtnImgGen?.classList.toggle("active", tabId === "img-tab-gen");
  el.tabBtnImgQueue?.classList.toggle("active", tabId === "img-tab-queue");
  el.tabBtnImgComfy?.classList.toggle("active", tabId === "img-tab-comfy");

  if (el.imgTabGen) el.imgTabGen.style.display = tabId === "img-tab-gen" ? "block" : "none";
  if (el.imgTabQueue) el.imgTabQueue.style.display = tabId === "img-tab-queue" ? "block" : "none";
  if (el.imgTabComfy) el.imgTabComfy.style.display = tabId === "img-tab-comfy" ? "block" : "none";

  if (tabId === "img-tab-queue") {
    refreshImageQueue();
  }
}

export function openImagePromptsModal(defaultTab = "img-tab-gen") {
  if (el.imgTargetCharName) {
    el.imgTargetCharName.textContent = state.character.name ? `"${state.character.name}"` : "(Unnamed Character)";
  }
  el.modalImagePrompts?.classList.remove("hidden");
  switchImgModalTab(defaultTab);
}

export function closeImagePromptsModal() {
  el.modalImagePrompts?.classList.add("hidden");
  // Defensive restore: Ensure active workspace tab is visible
  const activeTab = document.querySelector(".nav-tabs > .nav-tab[data-tab].active") || document.querySelector(".nav-tabs > .nav-tab[data-tab]");
  if (activeTab && activeTab.dataset.tab) {
    activeTab.classList.add("active");
    const targetEl = document.getElementById(activeTab.dataset.tab);
    if (targetEl) targetEl.classList.remove("hidden");
  }
}

export async function refreshImageQueue() {
  try {
    const res = await fetch("/api/image-prompts/queue");
    if (!res.ok) return;
    const data = await res.json();
    state.imageQueue = Array.isArray(data.queue) ? data.queue : [];
    updateImageQueueBadges();
    renderImageQueue();
  } catch (err) {
    console.warn("Failed to refresh image queue:", err);
  }
}

export function updateImageQueueBadges() {
  const count = state.imageQueue.length;
  if (el.imageQueueCountBadge) el.imageQueueCountBadge.textContent = count.toString();
  if (el.imgQueueTabCount) el.imgQueueTabCount.textContent = count.toString();
}

let pendingVisualIdentityCallback = null;

function hasVisualIdentity(char) {
  if (!char) return false;
  const vi = char.extensions?.visual_identity || char.data?.extensions?.visual_identity;
  if (!vi) return false;
  if (Array.isArray(vi.tags) && vi.tags.length > 0) return true;
  if (typeof vi.tags === "string" && vi.tags.trim()) return true;
  if (vi.hair?.trim() || vi.features?.trim() || vi.clothing?.trim() || vi.age?.trim()) return true;
  return false;
}

function syncVisualFieldsToTags() {
  const parts = [
    el.viGender?.value.trim(),
    el.viAge?.value.trim() ? el.viAge.value.split(",")[0].trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_") : "",
    el.viHair?.value.trim(),
    el.viEyes?.value.trim(),
    el.viFeatures?.value.trim(),
    el.viBuild?.value.trim(),
    el.viClothing?.value.trim(),
  ].filter(Boolean);

  const tags = parts.flatMap((p) =>
    p.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
  ).filter(Boolean);

  const uniqueTags = Array.from(new Set(tags));
  if (el.viTags) {
    el.viTags.value = uniqueTags.join(", ");
  }
}

async function fetchAndPopulateVisualIdentity(forceReextract = false) {
  syncUIToState();
  const char = state.character;
  const existingVI = !forceReextract ? (char.extensions?.visual_identity || char.data?.extensions?.visual_identity) : null;

  if (el.viCharName) {
    el.viCharName.textContent = char.name || "Unnamed Character";
  }

  if (existingVI && !forceReextract) {
    if (el.viGender) el.viGender.value = existingVI.gender || "1girl";
    if (el.viAge) el.viAge.value = existingVI.age || "";
    if (el.viHair) el.viHair.value = existingVI.hair || "";
    if (el.viEyes) el.viEyes.value = existingVI.eyes || "";
    if (el.viFeatures) el.viFeatures.value = existingVI.features || "";
    if (el.viBuild) el.viBuild.value = existingVI.build || "";
    if (el.viClothing) el.viClothing.value = existingVI.clothing || "";
    if (el.viTags) {
      el.viTags.value = Array.isArray(existingVI.tags)
        ? existingVI.tags.join(", ")
        : (existingVI.tags || "");
    }
    if (el.viLoading) el.viLoading.style.display = "none";
    if (el.viContent) el.viContent.style.display = "block";
    return;
  }

  // Need extraction via AI
  if (el.viLoading) el.viLoading.style.display = "block";
  if (el.viContent) el.viContent.style.display = "none";

  try {
    const res = await fetch("/api/image-prompts/extract-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: char,
        provider: state.provider,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const vi = data.visualIdentity || {};

    if (el.viGender) el.viGender.value = vi.gender || "1girl";
    if (el.viAge) el.viAge.value = vi.age || "";
    if (el.viHair) el.viHair.value = vi.hair || "";
    if (el.viEyes) el.viEyes.value = vi.eyes || "";
    if (el.viFeatures) el.viFeatures.value = vi.features || "";
    if (el.viBuild) el.viBuild.value = vi.build || "";
    if (el.viClothing) el.viClothing.value = vi.clothing || "";
    if (el.viTags) {
      el.viTags.value = Array.isArray(vi.tags)
        ? vi.tags.join(", ")
        : (vi.tags || "");
    }
  } catch (err) {
    console.warn("Visual tag extraction failed, using default values:", err);
    if (el.viGender) el.viGender.value = "1girl";
    if (el.viAge) el.viAge.value = "Adult";
    if (el.viHair) el.viHair.value = "";
    if (el.viEyes) el.viEyes.value = "";
    if (el.viFeatures) el.viFeatures.value = "";
    if (el.viBuild) el.viBuild.value = "";
    if (el.viClothing) el.viClothing.value = "";
    if (el.viTags) el.viTags.value = "1girl, solo";
  } finally {
    if (el.viLoading) el.viLoading.style.display = "none";
    if (el.viContent) el.viContent.style.display = "block";
  }
}

function ensureVisualIdentityElements() {
  const ids = [
    "modal-visual-identity", "btn-close-visual-identity", "vi-loading", "vi-content",
    "vi-char-name", "btn-vi-reextract", "vi-gender", "vi-age", "vi-hair",
    "vi-eyes", "vi-features", "vi-build", "vi-clothing", "vi-tags",
    "btn-vi-sync-tags", "btn-vi-save", "btn-vi-save-text", "btn-vi-cancel",
  ];
  for (const id of ids) {
    const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!el[key]) el[key] = document.getElementById(id);
  }
}

function openVisualIdentityModal(onConfirmCallback = null) {
  ensureVisualIdentityElements();
  pendingVisualIdentityCallback = onConfirmCallback;
  if (el.btnViSaveText) {
    el.btnViSaveText.textContent = onConfirmCallback
      ? "💾 Save & Proceed to Generate"
      : "💾 Save Visual Identity";
  }
  if (el.modalVisualIdentity) {
    el.modalVisualIdentity.classList.remove("hidden");
  }
  fetchAndPopulateVisualIdentity(false);
}

function closeVisualIdentityModal() {
  ensureVisualIdentityElements();
  if (el.modalVisualIdentity) {
    el.modalVisualIdentity.classList.add("hidden");
  }
  pendingVisualIdentityCallback = null;
}

async function handleSaveVisualIdentity() {
  ensureVisualIdentityElements();
  const rawTags = (el.viTags?.value || "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);

  const viData = {
    gender: el.viGender?.value.trim() || "1girl",
    age: el.viAge?.value.trim() || "",
    hair: el.viHair?.value.trim() || "",
    eyes: el.viEyes?.value.trim() || "",
    features: el.viFeatures?.value.trim() || "",
    build: el.viBuild?.value.trim() || "",
    clothing: el.viClothing?.value.trim() || "",
    tags: rawTags,
  };

  if (!state.character.extensions) state.character.extensions = {};
  state.character.extensions.visual_identity = viData;

  if (!state.character.data) state.character.data = {};
  if (!state.character.data.extensions) state.character.data.extensions = {};
  state.character.data.extensions.visual_identity = viData;

  // Persist to card library or notify IPC
  if (state.activeCardId) {
    saveActiveCardToLibrary(false).catch((err) => console.warn("Card save error:", err));
  } else {
    notifyIpcActiveCard(state.character);
  }

  showIpcToast("✓ Visual Identity & Danbooru tags locked into character card!", "success");

  const cb = pendingVisualIdentityCallback;
  closeVisualIdentityModal();
  if (typeof cb === "function") {
    cb();
  }
}

// ==========================================
// Spine Synthesis Modal (Retroactive Authoring Spine)
// ==========================================
export function openSynthesizeSpineModal() {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  if (el.spineTargetCharName) el.spineTargetCharName.textContent = state.character.name;
  if (el.spineOriginalConcept) el.spineOriginalConcept.value = "";
  if (el.spineOriginalStoryArc) el.spineOriginalStoryArc.value = "";
  if (el.spineGenre) el.spineGenre.value = "Fantasy";
  if (el.spineEra) el.spineEra.value = "";
  if (el.spineThemes) el.spineThemes.value = (state.selectedThemes || []).join(", ");
  if (el.spineTone) el.spineTone.value = "Atmospheric, psychologically nuanced";
  if (el.spineIntensity) el.spineIntensity.value = "balanced";
  if (el.spineBotMode) el.spineBotMode.value = state.botMode || "single";
  if (el.spineNsfw) el.spineNsfw.checked = true;

  if (el.modalSynthesizeSpine) el.modalSynthesizeSpine.classList.remove("hidden");
  if (el.spineLoading) el.spineLoading.style.display = "none";
}

function closeSynthesizeSpineModal() {
  if (el.modalSynthesizeSpine) el.modalSynthesizeSpine.classList.add("hidden");
}

async function handleSynthesizeSpine() {
  if (!assertProviderConfigured()) return;
  if (!state.character || !state.character.name) return;

  const originalConcept = el.spineOriginalConcept?.value?.trim() || undefined;
  const originalStoryArc = el.spineOriginalStoryArc?.value?.trim() || undefined;

  if (!originalConcept && !originalStoryArc) {
    if (!confirm("No original concept or story arc provided. The AI will infer from the card fields only. Continue?")) {
      return;
    }
  }

  if (el.spineLoading) el.spineLoading.style.display = "block";
  if (el.btnSpineSynthesize) {
    el.btnSpineSynthesize.disabled = true;
    el.btnSpineSynthesize.innerHTML = "<span class='spinner'></span> <span>Synthesizing...</span>";
  }

  try {
    const payload = {
      character: state.character,
      originalConcept,
      originalStoryArc,
      genre: el.spineGenre?.value || "Fantasy",
      themes: (el.spineThemes?.value || "").split(",").map(t => t.trim()).filter(Boolean),
      tone: el.spineTone?.value || "Atmospheric, psychologically nuanced",
      nsfw: el.spineNsfw?.checked ?? true,
      intensity: el.spineIntensity?.value || "balanced",
      era: el.spineEra?.value?.trim() || undefined,
      botMode: el.spineBotMode?.value || "single",
      provider: state.provider
    };

    const res = await apiPost("/api/spine/synthesize", payload);
    
    if (res.character && res.spine) {
      state.character = { ...state.character, ...res.character };
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Synthesized Spine: ${state.character.name}`);
      
      // Enable Regenerate with Spine button
      if (el.btnRunGreetingsSpine) {
        el.btnRunGreetingsSpine.disabled = false;
        el.btnRunGreetingsSpine.style.opacity = "1";
        el.btnRunGreetingsSpine.style.cursor = "pointer";
        el.btnRunGreetingsSpine.title = "Regenerate alternate greetings using stored spine and story arc";
      }
      
      showIpcToast("✅ Authoring Spine synthesized & attached! Ready for 'Regenerate with Spine' mode.", "success");
      closeSynthesizeSpineModal();
    } else {
      throw new Error("No character or spine returned");
    }
  } catch (err) {
    alert("❌ Spine synthesis failed: " + (err.message || err));
  } finally {
    if (el.spineLoading) el.spineLoading.style.display = "none";
    if (el.btnSpineSynthesize) {
      el.btnSpineSynthesize.disabled = false;
      el.btnSpineSynthesize.innerHTML = "<span>🧬 Synthesize & Attach Spine</span>";
    }
  }
}

// ==========================================
// Regenerate Greetings with Spine Modal
// ==========================================
function openRegenGreetingsSpineModal() {
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

function closeRegenGreetingsSpineModal() {
  if (el.modalRegenGreetingsSpine) el.modalRegenGreetingsSpine.classList.add("hidden");
}

async function handleRegenerateGreetingsSpine() {
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
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Regenerated ${res.character.alternate_greetings.length} Greetings with Spine: ${state.character.name}`);
      
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

// ==========================================
// Image Prompt Generation
// ==========================================
export async function handleGenerateImagePrompt() {
  if (!el.btnDoGenImgPrompt) return;
  syncUIToState();

  if (!hasVisualIdentity(state.character)) {
    openVisualIdentityModal(() => handleGenerateImagePrompt());
    return;
  }

  const originalText = el.btnDoGenImgPrompt.innerHTML;
  el.btnDoGenImgPrompt.disabled = true;
  el.btnDoGenImgPrompt.innerHTML = "<span>⏳ Synthesizing Diffusion Prompt...</span>";

  try {
    const imagePurpose = el.imgPurposeGreeting?.checked
      ? "greeting"
      : el.imgPurposeScenario?.checked
      ? "scenario_avatar"
      : "avatar";
    const reqBody = {
      character: state.character,
      characterId: state.activeCardId || undefined,
      imagePurpose,
      targetModel: el.imgTargetModel?.value || "flux",
      portraitIntent: el.imgPortraitIntent?.value || "standard_avatar",
      artStyle: el.imgArtStyle?.value || "anime",
      shotType: el.imgShotType?.value || (imagePurpose === "greeting" ? "action_scene" : "card_portrait"),
      aspectRatio: el.imgAspectRatio?.value || "2:3",
      customSteering: el.imgCustomSteering?.value.trim() || undefined,
      nsfw: !!el.imgNsfwCheck?.checked,
      provider: state.provider,
    };

    const res = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Generation failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data.result;
    state.lastGeneratedImagePrompt = result;

    if (el.imgOutPositive) el.imgOutPositive.value = result.positivePrompt;
    if (el.imgOutNegative) el.imgOutNegative.value = result.negativePrompt;

    if (el.imgOutSettingsBadges) {
      const intentLabel =
        result.portraitIntent === "casual"
          ? "Casual Attire"
          : result.portraitIntent === "action"
          ? "Action Stance"
          : result.portraitIntent === "sensual_kink"
          ? "Sensual / Kink"
          : "Normal Avatar";

      const purposeBadge =
        result.imagePurpose === "greeting"
          ? `<span class="badge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;">💬 Greeting Scene</span>`
          : result.imagePurpose === "scenario_avatar"
          ? `<span class="badge" style="background: rgba(244, 63, 94, 0.2); border: 1px solid rgba(244, 63, 94, 0.4); color: #fda4af;">🔥 Unfiltered Scenario Avatar</span>`
          : `<span class="badge" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd;">👤 Character Profile Avatar</span>`;

      el.imgOutSettingsBadges.innerHTML = `
        <span class="img-badge img-badge-${result.targetModel}">${result.targetModel.toUpperCase()}</span>
        ${purposeBadge}
        <span class="badge" style="background: rgba(147, 51, 234, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc;">
          ✨ ${intentLabel}
        </span>
        <span class="badge" style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #93c5fd;">
          📐 ${result.dimensions.width}×${result.dimensions.height} (${result.aspectRatio})
        </span>
        <span class="badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7;">
          ⚙️ Sampler: ${result.recommendedSettings.sampler}
        </span>
        <span class="badge" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fcd34d;">
          🔢 Steps: ${result.recommendedSettings.steps} | CFG: ${result.recommendedSettings.cfg}
        </span>
      `;
    }

    if (el.imgGenOutputContainer) {
      el.imgGenOutputContainer.style.display = "block";
    }
  } catch (err) {
    alert("❌ Image prompt generation failed: " + (err.message || err));
  } finally {
    el.btnDoGenImgPrompt.disabled = false;
    el.btnDoGenImgPrompt.innerHTML = originalText;
  }
}

export async function handleQueueGreetingImage(customGreetingText, label = "Greeting Scene", imagePurpose = "greeting", greetingIndex = 0) {
  syncUIToState();
  if (!hasVisualIdentity(state.character)) {
    openVisualIdentityModal(() => handleQueueGreetingImage(customGreetingText, label, imagePurpose, greetingIndex));
    return;
  }
  const greeting = customGreetingText || state.character.first_mes || "";
  try {
    const isBg = imagePurpose === "greeting_bg";
    const steering = isBg
      ? `Atmospheric environmental landscape or room architecture backdrop for chat wallpaper during this greeting encounter:\n${greeting.slice(0, 600)}`
      : `Scene illustration depicting the opening greeting encounter:\n${greeting.slice(0, 600)}`;

    const targetModel = state.imageConfig?.defaultTargetModel || el.imgTargetModel?.value || "flux";
    const artStyle = state.imageConfig?.defaultArtStyle || el.imgArtStyle?.value || "anime";

    const reqBody = {
      character: state.character,
      characterId: state.activeCardId || undefined,
      imagePurpose,
      greetingText: greeting || undefined,
      targetModel,
      portraitIntent: "standard_avatar",
      artStyle,
      shotType: isBg ? "action_scene" : "action_scene",
      aspectRatio: "16:9",
      customSteering: greeting ? steering : undefined,
      nsfw: true,
      provider: state.provider,
    };

    const res = await fetch("/api/image-prompts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Generation failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data.result;
    result.greetingIndex = greetingIndex;
    state.lastGeneratedImagePrompt = result;

    // Enqueue
    const qRes = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (!qRes.ok) throw new Error("Failed to add to queue");
    await refreshImageQueue();
    showIpcToast(`✓ Generated and queued ${label} prompt!`, "success");
  } catch (err) {
    alert(`Failed to queue ${label} image: ${err.message || err}`);
  }
}

export async function handleAddLastPromptToQueue() {
  if (!state.lastGeneratedImagePrompt) {
    alert("Please generate a prompt first!");
    return;
  }

  const itemPayload = {
    ...state.lastGeneratedImagePrompt,
    imagePurpose:
      state.lastGeneratedImagePrompt.imagePurpose ||
      (el.imgPurposeGreeting?.checked
        ? "greeting"
        : el.imgPurposeScenario?.checked
        ? "scenario_avatar"
        : "avatar"),
    positivePrompt: el.imgOutPositive ? el.imgOutPositive.value : state.lastGeneratedImagePrompt.positivePrompt,
    negativePrompt: el.imgOutNegative ? el.imgOutNegative.value : state.lastGeneratedImagePrompt.negativePrompt,
  };

  try {
    const res = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await refreshImageQueue();
    switchImgModalTab("img-tab-queue");
  } catch (err) {
    alert("Failed to add prompt to queue: " + (err.message || err));
  }
}

export async function handleQuickDispatchPrompt() {
  if (!state.lastGeneratedImagePrompt) {
    alert("Generate an image prompt first!");
    return;
  }
  const itemPayload = {
    ...state.lastGeneratedImagePrompt,
    characterName: state.character.name || "Untitled Character",
    characterId: state.character.id || state.character.name || "",
    imagePurpose:
      state.lastGeneratedImagePrompt.imagePurpose ||
      (el.imgPurposeGreetingBg?.checked
        ? "greeting_bg"
        : el.imgPurposeGreeting?.checked
        ? "greeting"
        : el.imgPurposeScenario?.checked
        ? "scenario_avatar"
        : "avatar"),
    positivePrompt: el.imgOutPositive ? el.imgOutPositive.value : state.lastGeneratedImagePrompt.positivePrompt,
    negativePrompt: el.imgOutNegative ? el.imgOutNegative.value : state.lastGeneratedImagePrompt.negativePrompt,
  };

  try {
    const res = await fetch("/api/image-prompts/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    await refreshImageQueue();
    switchImgModalTab("img-tab-comfy");
    await handleDispatchComfyBatch(data.item ? [data.item.id] : undefined);
  } catch (err) {
    alert("Failed to queue & dispatch: " + (err.message || err));
  }
}

export function renderImageQueue() {
  if (!el.imgQueueListContainer) return;

  const searchQuery = el.imgQueueSearch ? el.imgQueueSearch.value.trim().toLowerCase() : "";
  const filterStatus = el.imgQueueFilterStatus ? el.imgQueueFilterStatus.value : "all";

  const filtered = state.imageQueue.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (searchQuery) {
      const matchName = (item.characterName || "").toLowerCase().includes(searchQuery);
      const matchModel = (item.targetModel || "").toLowerCase().includes(searchQuery);
      const matchPos = (item.positivePrompt || "").toLowerCase().includes(searchQuery);
      if (!matchName && !matchModel && !matchPos) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    el.imgQueueListContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-dim); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">
        <div style="font-size: 28px; margin-bottom: 8px;">🖼️</div>
        <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Prompt Queue is Empty</div>
        <div style="font-size: 11px; max-width: 420px; margin: 0 auto 12px; line-height: 1.4;">
          Forge character cards, generate diffusion prompts for each, and queue them up here. Once queued, you can turn off your LLM to free VRAM and batch-generate all images in ComfyUI!
        </div>
        <button class="btn btn-sm btn-primary" onclick="switchImgModalTab('img-tab-gen')" type="button">
          🎨 Generate Prompt for Active Card
        </button>
      </div>
    `;
    return;
  }

  el.imgQueueListContainer.innerHTML = filtered
    .map((item) => {
      const isDone = item.status === "completed";
      const badgeClass = `img-badge-${item.targetModel || "flux"}`;
      const statusLabel = isDone ? "COMPLETED" : "QUEUED";
      const statusBg = isDone ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)";
      const statusColor = isDone ? "#34d399" : "#fbbf24";
      const isGreeting = item.imagePurpose === "greeting";
      const isScenario = item.imagePurpose === "scenario_avatar";
      const purposeBadge = isGreeting
        ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3);">💬 GREETING</span>`
        : isScenario
        ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3);">🔥 SCENARIO AVATAR</span>`
        : `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);">👤 AVATAR</span>`;

      const createdStr = new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemId = item.id || item.name;
      const charName = item.characterName || item.name || "Prompt";
      const modelName = (item.targetModel || "flux").toLowerCase();
      const promptText = item.prompt || item.positivePrompt || (item.params && item.params.positive) || "";
      const negText = item.negativePrompt || (item.params && item.params.negative) || "";
      const hasNeg = !!negText;
      const attachedImage = item.greetingDataUrl || item.avatarDataUrl;

      return `
      <div class="img-queue-card ${isDone ? "completed" : "queued"}" data-id="${itemId}">
        <!-- Card Top Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 13px; color: #fff;">${escapeHtml(charName)}</strong>
            ${purposeBadge}
            <span class="img-badge img-badge-${modelName}">${modelName.toUpperCase()}</span>
            <span style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: ${statusBg}; color: ${statusColor};">
              ${statusLabel}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-send-item-comfy" data-id="${itemId}" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; font-weight: 700; padding: 2px 8px; font-size: 11px;" type="button" title="Dispatch this prompt to ComfyUI">
              ⚡ ComfyUI
            </button>
            <button class="btn btn-sm btn-primary btn-copy-item-pos" data-id="${itemId}" style="font-weight: 700; padding: 2px 8px; font-size: 11px;" type="button">
              📋 Copy Prompt
            </button>
            <button class="btn btn-sm btn-toggle-item-status" data-id="${itemId}" data-current="${item.status}" style="padding: 2px 8px; font-size: 11px;" type="button">
              ${isDone ? "🔄 Re-queue" : "✅ Done"}
            </button>
            <label class="btn btn-sm" style="padding: 2px 8px; font-size: 11px; cursor: pointer; margin: 0;" title="Attach generated image from ComfyUI to this character">
              🖼️ Attach Image
              <input type="file" class="queue-attach-file-input" data-id="${itemId}" data-purpose="${item.imagePurpose || 'avatar'}" accept="image/png,image/jpeg,image/webp" style="display: none;">
            </label>
            <button class="btn btn-sm btn-danger btn-delete-queue-item" data-id="${itemId}" style="padding: 2px 6px; font-size: 11px;" type="button" title="Delete from queue">
              ✕
            </button>
          </div>
        </div>

        <!-- Image Prompt Box -->
        <textarea class="form-textarea queue-item-pos" data-id="${itemId}" style="min-height: 60px; font-size: 11px; font-family: monospace;">${escapeHtml(promptText)}</textarea>

        <!-- Optional Negative Prompt if present -->
        ${
          hasNeg
            ? `
          <details style="font-size: 10px; color: var(--text-dim);">
            <summary style="cursor: pointer; margin-bottom: 4px;">Negative Prompt (Optional)</summary>
            <div style="display: flex; gap: 4px; align-items: center;">
              <textarea class="form-textarea queue-item-neg" data-id="${itemId}" style="min-height: 36px; font-size: 10px; font-family: monospace; flex: 1;">${escapeHtml(negText)}</textarea>
              <button class="btn btn-sm btn-copy-item-neg" data-id="${itemId}" style="padding: 2px 6px; font-size: 10px;" type="button">📋</button>
            </div>
          </details>
        `
            : ""
        }

        <!-- Attached Image Thumbnail Preview -->
        ${
          attachedImage
            ? `
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--border-color);">
          <img src="${attachedImage}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15);" alt="Generated preview">
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1;">
            <div style="font-size: 11px; font-weight: 600; color: #34d399;">✓ Image Attached (${isGreeting ? "Greeting Scene" : isScenario ? "Scenario Profile Avatar" : "Card Avatar"})</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-apply-as-avatar" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">👤 Set as Avatar</button>
              <button class="btn btn-sm btn-apply-as-greeting" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">💬 Set as Greeting Scene</button>
              <button class="btn btn-sm btn-apply-as-chat-bg" data-id="${item.id}" style="font-size: 10px; padding: 2px 6px;" type="button">🌄 Set as Chat Background</button>
              <a href="${attachedImage}" download="${escapeHtml(item.characterName)}_${item.imagePurpose || 'image'}.png" class="btn btn-sm" style="font-size: 10px; padding: 2px 6px; text-decoration: none;">📥 Download</a>
            </div>
          </div>
        </div>
        `
            : ""
        }
      </div>
      `;
    })
    .join("");
}

// Image Prompt Modal Listeners
el.btnGenImgPrompt?.addEventListener("click", () => openImagePromptsModal("img-tab-gen"));
el.btnOpenImageQueue?.addEventListener("click", () => openImagePromptsModal("img-tab-queue"));
el.btnCloseImagePrompts?.addEventListener("click", closeImagePromptsModal);

el.tabBtnImgGen?.addEventListener("click", () => switchImgModalTab("img-tab-gen"));
el.tabBtnImgQueue?.addEventListener("click", () => switchImgModalTab("img-tab-queue"));
el.tabBtnImgComfy?.addEventListener("click", () => switchImgModalTab("img-tab-comfy"));

el.btnDoGenImgPrompt?.addEventListener("click", handleGenerateImagePrompt);
el.btnOpenVisualIdentity?.addEventListener("click", () => openVisualIdentityModal(null));
el.btnAddToImgQueue?.addEventListener("click", handleAddLastPromptToQueue);
el.btnQuickDispatchComfy?.addEventListener("click", handleQuickDispatchPrompt);

// Visual Identity Modal Listeners
el.btnViSyncTags?.addEventListener("click", syncVisualFieldsToTags);
el.btnViReextract?.addEventListener("click", () => fetchAndPopulateVisualIdentity(true));
el.btnViSave?.addEventListener("click", handleSaveVisualIdentity);
el.btnViCancel?.addEventListener("click", closeVisualIdentityModal);
el.btnCloseVisualIdentity?.addEventListener("click", closeVisualIdentityModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-visual-identity, #btn-vi-cancel, #btn-vi-save, #btn-vi-sync-tags, #btn-vi-reextract",
  );
  if (!target) return;
  if (target.id === "btn-vi-save") handleSaveVisualIdentity();
  else if (target.id === "btn-vi-sync-tags") syncVisualFieldsToTags();
  else if (target.id === "btn-vi-reextract") fetchAndPopulateVisualIdentity(true);
  else closeVisualIdentityModal();
});

// Spine Synthesis Modal Listeners
el.btnSpineSynthesize?.addEventListener("click", handleSynthesizeSpine);
el.btnSpineCancel?.addEventListener("click", closeSynthesizeSpineModal);
el.btnCloseSynthesizeSpine?.addEventListener("click", closeSynthesizeSpineModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-synthesize-spine, #btn-spine-cancel, #btn-spine-synthesize",
  );
  if (!target) return;
  if (target.id === "btn-spine-synthesize") handleSynthesizeSpine();
  else closeSynthesizeSpineModal();
});

// Regenerate Greetings with Spine Modal Listeners
el.btnRegenExecute?.addEventListener("click", handleRegenerateGreetingsSpine);
el.btnRegenCancel?.addEventListener("click", closeRegenGreetingsSpineModal);
el.btnCloseRegenGreetingsSpine?.addEventListener("click", closeRegenGreetingsSpineModal);
document.addEventListener("click", (event) => {
  const target = event.target.closest(
    "#btn-close-regen-greetings-spine, #btn-regen-cancel, #btn-regen-execute",
  );
  if (!target) return;
  if (target.id === "btn-regen-execute") handleRegenerateGreetingsSpine();
  else closeRegenGreetingsSpineModal();
});

// Regenerate with Spine Button (in Generate tab & Alts tab) - opens modal
el.btnRunGreetingsSpine?.addEventListener("click", () => {
  openRegenGreetingsSpineModal();
});
document.getElementById("btn-regen-alts-direct")?.addEventListener("click", () => {
  openRegenGreetingsSpineModal();
});

// Improve Greetings Button (in Enhancer tab) - improves first_mes + alternate_greetings
el.btnImproveGreetings?.addEventListener("click", () => {
  if (!state.character || !state.character.name) {
    alert("No active character loaded. Please create or load a character first.");
    return;
  }
  if (!assertProviderConfigured()) return;

  const currentAlts = state.character.alternate_greetings || [];
  if (currentAlts.length === 0) {
    alert("No alternate greetings to improve. Use 'Punch Greetings' first or create a new character.");
    return;
  }

  // Open the Punch Greetings drawer and trigger the improve mode
  const drawer = document.getElementById("act-punch-first-mes");
  if (drawer) drawer.classList.add("open");
  
  runEnhance(
    "improve_greetings",
    { 
      scenarioPrompt: "", 
      steeringInstructions: getGlobalSteering(), 
      ...getEnhanceSearchOptions() 
    },
    "Improving Greetings (First Mes + Alts)..."
  );
});

// Open Spine Synthesis Modal from Generate tab
el.btnOpenSynthesizeSpineGenerate?.addEventListener("click", () => {
  openSynthesizeSpineModal();
});

// Gallery Listeners
el.btnGalleryUpload?.addEventListener("click", () => el.galleryFileInput?.click());
el.btnGalleryClearAll?.addEventListener("click", clearAllGalleryImages);
el.btnGalleryGenPrompt?.addEventListener("click", () => openImagePromptsModal("img-tab-gen"));

el.galleryFileInput?.addEventListener("change", (e) => {
  if (e.target.files?.length) {
    addImagesToGallery(e.target.files);
    e.target.value = "";
  }
});

el.galleryDropzone?.addEventListener("click", () => el.galleryFileInput?.click());

el.galleryDropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "var(--accent-cyan)";
  el.galleryDropzone.style.background = "rgba(56, 189, 248, 0.08)";
});

el.galleryDropzone?.addEventListener("dragleave", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "rgba(168, 85, 247, 0.35)";
  el.galleryDropzone.style.background = "rgba(168, 85, 247, 0.04)";
});

el.galleryDropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  el.galleryDropzone.style.borderColor = "rgba(168, 85, 247, 0.35)";
  el.galleryDropzone.style.background = "rgba(168, 85, 247, 0.04)";
  if (e.dataTransfer?.files?.length) {
    addImagesToGallery(e.dataTransfer.files);
  }
});

// Lightbox Listeners
document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-close-lightbox")) {
    closeGalleryLightbox();
    return;
  }
  const modal = document.getElementById("modal-gallery-lightbox");
  if (modal && e.target === modal) closeGalleryLightbox();
});

// Copy Buttons in Generator Tab
el.btnCopyPosPrompt?.addEventListener("click", () => {
  if (el.imgOutPositive) {
    navigator.clipboard.writeText(el.imgOutPositive.value);
    const orig = el.btnCopyPosPrompt.textContent;
    el.btnCopyPosPrompt.textContent = "✓ Copied!";
    setTimeout(() => (el.btnCopyPosPrompt.textContent = orig), 1500);
  }
});

const btnToggleNeg = document.getElementById("btn-toggle-show-negative");
const negWrapper = document.getElementById("img-negative-wrapper");
btnToggleNeg?.addEventListener("click", () => {
  if (negWrapper) {
    const isHidden = negWrapper.style.display === "none";
    negWrapper.style.display = isHidden ? "block" : "none";
    btnToggleNeg.textContent = isHidden ? "- Hide Negative Prompt" : "+ Show Negative Prompt";
  }
});

el.btnCopyNegPrompt?.addEventListener("click", () => {
  if (el.imgOutNegative) {
    navigator.clipboard.writeText(el.imgOutNegative.value);
    const orig = el.btnCopyNegPrompt.textContent;
    el.btnCopyNegPrompt.textContent = "✓ Copied!";
    setTimeout(() => (el.btnCopyNegPrompt.textContent = orig), 1500);
  }
});

el.btnCopyComfySnippet?.addEventListener("click", () => {
  if (state.lastGeneratedImagePrompt?.comfyUiSnippet) {
    navigator.clipboard.writeText(state.lastGeneratedImagePrompt.comfyUiSnippet);
    const orig = el.btnCopyComfySnippet.textContent;
    el.btnCopyComfySnippet.textContent = "✓ Copied Payload!";
    setTimeout(() => (el.btnCopyComfySnippet.textContent = orig), 1500);
  }
});

// Queue Action Bar Listeners
el.imgQueueSearch?.addEventListener("input", renderImageQueue);
el.imgQueueFilterStatus?.addEventListener("change", renderImageQueue);

el.btnQueueCopyAll?.addEventListener("click", () => {
  const unfinished = state.imageQueue.filter((i) => i.status !== "completed");
  const listToCopy = unfinished.length > 0 ? unfinished : state.imageQueue;
  if (listToCopy.length === 0) {
    alert("No prompts in queue to copy!");
    return;
  }

  const combined = listToCopy
    .map((item, idx) => {
      return `[${idx + 1}] ${item.characterName} (${item.targetModel.toUpperCase()} | ${item.dimensions.width}x${item.dimensions.height})\nPOSITIVE:\n${item.positivePrompt}\n\nNEGATIVE:\n${item.negativePrompt}\n----------------------------------------`;
    })
    .join("\n\n");

  navigator.clipboard.writeText(combined);
  alert(`✓ Copied ${listToCopy.length} character image prompts to clipboard!`);
});

el.btnQueueExportJson?.addEventListener("click", () => {
  window.location.href = "/api/image-prompts/export?format=json";
});

el.btnQueueExportText?.addEventListener("click", () => {
  window.location.href = "/api/image-prompts/export?format=text";
});

el.btnQueueClearDone?.addEventListener("click", async () => {
  if (!confirm("Remove all completed prompts from the queue?")) return;
  try {
    const res = await fetch("/api/image-prompts/queue?completedOnly=true", { method: "DELETE" });
    if (res.ok) await refreshImageQueue();
  } catch (err) {
    alert("Failed to clear completed prompts: " + err);
  }
});

el.btnQueueClearAll?.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear the entire image prompt queue?")) return;
  try {
    const res = await fetch("/api/image-prompts/queue", { method: "DELETE" });
    if (res.ok) await refreshImageQueue();
  } catch (err) {
    alert("Failed to clear queue: " + err);
  }
});

// Delegated Queue Item Events (Copy, Status, Delete, Edit, Attach Image)
el.imgQueueListContainer?.addEventListener("click", async (e) => {
  const btnCopyPos = e.target.closest(".btn-copy-item-pos");
  if (btnCopyPos) {
    const id = btnCopyPos.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      navigator.clipboard.writeText(item.positivePrompt);
      btnCopyPos.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyPos.textContent = "📋 Copy"), 1200);
    }
    return;
  }

  const btnCopyNeg = e.target.closest(".btn-copy-item-neg");
  if (btnCopyNeg) {
    const id = btnCopyNeg.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      navigator.clipboard.writeText(item.negativePrompt);
      btnCopyNeg.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyNeg.textContent = "📋 Copy"), 1200);
    }
    return;
  }

  const btnCopyComfy = e.target.closest(".btn-copy-item-comfy");
  if (btnCopyComfy) {
    const id = btnCopyComfy.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    if (item) {
      const snippet = [
        `# ComfyUI Payload: ${item.characterName} (${item.targetModel.toUpperCase()})`,
        `# ${item.dimensions.width}x${item.dimensions.height} | Sampler: ${item.recommendedSettings.sampler} | Steps: ${item.recommendedSettings.steps} | CFG: ${item.recommendedSettings.cfg}`,
        `[POSITIVE]`,
        item.positivePrompt,
        `[NEGATIVE]`,
        item.negativePrompt,
      ].join("\n");
      navigator.clipboard.writeText(snippet);
      btnCopyComfy.textContent = "✓ Copied!";
      setTimeout(() => (btnCopyComfy.textContent = "📋 Copy ComfyUI"), 1200);
    }
    return;
  }

  const btnToggleStatus = e.target.closest(".btn-toggle-item-status");
  if (btnToggleStatus) {
    const id = btnToggleStatus.dataset.id;
    const current = btnToggleStatus.dataset.current;
    const nextStatus = current === "completed" ? "queued" : "completed";
    try {
      await fetch(`/api/image-prompts/queue/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshImageQueue();
    } catch (err) {
      alert("Failed to update status: " + err);
    }
    return;
  }

  const btnDelete = e.target.closest(".btn-delete-queue-item");
  if (btnDelete) {
    const id = btnDelete.dataset.id;
    try {
      await fetch(`/api/image-prompts/queue/${id}`, { method: "DELETE" });
      await refreshImageQueue();
    } catch (err) {
      alert("Failed to delete item: " + err);
    }
    return;
  }

  const btnSendComfy = e.target.closest(".btn-send-item-comfy");
  if (btnSendComfy) {
    const id = btnSendComfy.dataset.id;
    await handleDispatchComfyBatch([id]);
    return;
  }

  const btnApplyAvatar = e.target.closest(".btn-apply-as-avatar");
  if (btnApplyAvatar) {
    const id = btnApplyAvatar.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.avatarDataUrl || item?.greetingDataUrl;
    if (dataUrl) {
      state.character.avatar = dataUrl;
      syncStateToUI();
      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "avatar", updateSavedCard: true }),
        });
      }
      alert(`✓ Set image as active avatar for ${state.character.name || "character"}!`);
    }
    return;
  }

  const btnApplyGreeting = e.target.closest(".btn-apply-as-greeting");
  if (btnApplyGreeting) {
    const id = btnApplyGreeting.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.greetingDataUrl || item?.avatarDataUrl || item?.greetingBgDataUrl;
    if (dataUrl) {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];

      const gIdx = typeof item.greetingIndex === "number" ? item.greetingIndex : 0;
      const galNum = state.character.extensions.gallery.length + 1;
      const galleryTag = `![Gallery image](gallery://image-${galNum})`;

      if (!state.character.extensions.gallery.some((g) => g.dataUrl === dataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: gIdx > 0 ? `Alt Greeting #${gIdx} Scene` : "Greeting Scene",
          dataUrl,
          type: "scene",
          greetingIndex: gIdx,
          createdAt: new Date().toISOString(),
        });
      }

      if (gIdx === 0) {
        state.character.data.extensions.greeting_image = dataUrl;
        state.character.greeting_image = dataUrl;
        if (state.character.first_mes && !state.character.first_mes.includes("gallery://image-")) {
          state.character.first_mes = state.character.first_mes.trimEnd() + "\n\n" + galleryTag;
          if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        }
      } else {
        const altIdx = gIdx - 1;
        if (!Array.isArray(state.character.alternate_greetings)) {
          state.character.alternate_greetings = [];
        }
        if (state.character.alternate_greetings[altIdx] !== undefined) {
          if (!state.character.alternate_greetings[altIdx].includes("gallery://image-")) {
            state.character.alternate_greetings[altIdx] = state.character.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
          }
        }
        if (state.character.data) {
          if (!Array.isArray(state.character.data.alternate_greetings)) {
            state.character.data.alternate_greetings = [];
          }
          if (state.character.data.alternate_greetings[altIdx] !== undefined) {
            if (!state.character.data.alternate_greetings[altIdx].includes("gallery://image-")) {
              state.character.data.alternate_greetings[altIdx] = state.character.data.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
            }
          }
        }
        renderAltGreetings();
      }

      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "greeting", updateSavedCard: true }),
        });
      }
      alert(gIdx > 0 ? `✓ Saved image as Scene for Alternate Greeting #${gIdx}!` : `✓ Saved image as Greeting Scene for ${state.character.name || "character"}!`);
    }
    return;
  }

  const btnApplyChatBg = e.target.closest(".btn-apply-as-chat-bg");
  if (btnApplyChatBg) {
    const id = btnApplyChatBg.dataset.id;
    const item = state.imageQueue.find((i) => i.id === id);
    const dataUrl = item?.greetingBgDataUrl || item?.greetingDataUrl || item?.avatarDataUrl;
    if (dataUrl) {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      state.character.data.extensions.chat_background = dataUrl;
      state.character.chat_background = dataUrl;
      if (item.characterId) {
        await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: dataUrl, imageType: "greeting_bg", updateSavedCard: true }),
        });
      }
      alert(`✓ Saved image as Chat Background for ${state.character.name || "character"}!`);
    }
    return;
  }
});

// Update prompt text on change
el.imgQueueListContainer?.addEventListener("change", async (e) => {
  const target = e.target;
  if (target.classList.contains("queue-item-pos")) {
    const id = target.dataset.id;
    await fetch(`/api/image-prompts/queue/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positivePrompt: target.value }),
    });
  } else if (target.classList.contains("queue-item-neg")) {
    const id = target.dataset.id;
    await fetch(`/api/image-prompts/queue/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negativePrompt: target.value }),
    });
  } else if (target.classList.contains("queue-attach-file-input")) {
    const id = target.dataset.id;
    const purpose = target.dataset.purpose || "avatar";
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === "string") {
        try {
          const res = await fetch(`/api/image-prompts/queue/${id}/attach-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarDataUrl: dataUrl, updateSavedCard: true, imageType: purpose }),
          });
          if (res.ok) {
            const queueItem = state.imageQueue.find((i) => i.id === id);
            if (queueItem && state.character.name === queueItem.characterName && purpose === "avatar") {
              state.character.avatar = dataUrl;
              syncStateToUI();
            }
            await refreshImageQueue();
            if (typeof refreshSavedCards === "function") {
              await refreshSavedCards();
            }
            alert(`✓ Generated image attached as ${purpose === "greeting" ? "Greeting Scene" : "Avatar"} and saved to library card!`);
          }
        } catch (err) {
          alert("Failed to attach image: " + err);
        }
      }
    };
    reader.readAsDataURL(file);
  }
});


