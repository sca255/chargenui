// Enhancer Suite, Field Puncher & Scenario Matrix
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast } from "./ipc.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { openSynthesizeSpineModal } from "./image-prompts.js";

// Enhancer Actions
export async function runEnhance(mode, options = {}, statusMsg = "Enhancing...") {
  if (mode !== "audit_only" && !assertProviderConfigured()) return;

  syncUIToState();
  const btn = document.activeElement;
  const originalHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>${statusMsg}</span>`;
  }

  try {
    const payload = {
      character: state.character,
      mode,
      options,
      provider: state.provider
    };

    const res = await apiPost("/api/enhance", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      syncStateToUI();
      recordSnapshot(`Enhanced (${mode}): ${state.character.name}`);
      alert(`✨ Enhancement complete! ${res.changesSummary?.join(" ") || ""}`);
    }
  } catch (err) {
    alert("Enhancement failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

export function getGlobalSteering() {
  return el.enhanceSteeringNotes?.value?.trim() || "";
}

function getEnhanceSearchOptions() {
  if (!el.enhanceWebSearch || !el.enhanceWebSearch.checked) {
    return {};
  }
  const query = el.enhanceSearchQuery?.value?.trim() || state.character.name || "";
  const includeHeadcanons = el.enhanceIncludeHeadcanons ? el.enhanceIncludeHeadcanons.checked : true;
  return {
    enableWebSearch: true,
    searchQuery: query,
    includeHeadcanons,
    retrievedLore: (state.enhanceRetrievedLoreQuery === query && state.enhanceRetrievedLore) ? state.enhanceRetrievedLore : undefined,
    searchProviderType: state.searchConfig?.provider || "duckduckgo",
    searchApiKey: state.searchConfig?.apiKey,
    searxngUrl: state.searchConfig?.searxngUrl,
  };
}

// Enhancer Web Search Toggle & Preview
el.enhanceWebSearch?.addEventListener("change", () => {
  el.boxEnhanceSearch?.classList.toggle("hidden", !el.enhanceWebSearch.checked);
  if (el.enhanceWebSearch.checked && !el.enhanceSearchQuery?.value?.trim()) {
    if (el.enhanceSearchQuery) {
      el.enhanceSearchQuery.value = state.character.name || "";
      el.enhanceSearchQuery.dataset.autoSync = "true";
    }
  }
});

el.enhanceSearchQuery?.addEventListener("input", () => {
  if (el.enhanceSearchQuery) el.enhanceSearchQuery.dataset.autoSync = "false";
});

el.btnEnhancePreviewSearch?.addEventListener("click", async () => {
  const q = el.enhanceSearchQuery?.value?.trim() || state.character.name || "";
  if (!q) {
    alert("Enter a character name or lore query to search!");
    return;
  }
  el.btnEnhancePreviewSearch.disabled = true;
  el.btnEnhancePreviewSearch.textContent = "...";
  try {
    const res = await apiPost("/api/search-lore", {
      query: q,
      providerType: state.searchConfig?.provider || "duckduckgo",
      apiKey: state.searchConfig?.apiKey,
      searxngUrl: state.searchConfig?.searxngUrl,
    });
    el.enhanceSearchLorePreview?.classList.remove("hidden");
    let previewHtml = `<strong>Found ${res.results?.length || 0} research & fan lore sources:</strong><br><br>`;
    if (res.canonLore) {
      previewHtml += `<strong>Canon Lore Highlights:</strong><br>${res.canonLore.slice(0, 300).replace(/\n/g, "<br>")}...<br><br>`;
    }
    if (res.fanHeadcanons) {
      previewHtml += `<strong>Headcanons & Dynamics:</strong><br>${res.fanHeadcanons.slice(0, 300).replace(/\n/g, "<br>")}...`;
    }
    if (!res.results || res.results.length === 0) {
      previewHtml += `<em>No results returned. Check query or search settings.</em>`;
    }
    if (el.enhanceSearchLorePreview) el.enhanceSearchLorePreview.innerHTML = previewHtml;
    state.enhanceRetrievedLore = res.condensedLore;
    state.enhanceRetrievedLoreQuery = q;
  } catch (err) {
    alert("Lore search failed: " + err.message);
  } finally {
    el.btnEnhancePreviewSearch.disabled = false;
    el.btnEnhancePreviewSearch.textContent = "🔎 Fetch";
  }
});

// Steering Directive UI hooks
el.btnClearSteering?.addEventListener("click", () => {
  if (el.enhanceSteeringNotes) el.enhanceSteeringNotes.value = "";
});

el.steeringChips?.addEventListener("click", (e) => {
  const chip = e.target.closest(".steering-chip");
  if (!chip) return;
  const steerText = chip.dataset.text;
  if (!steerText || !el.enhanceSteeringNotes) return;
  const current = el.enhanceSteeringNotes.value.trim();
  if (!current) {
    el.enhanceSteeringNotes.value = steerText;
  } else if (!current.includes(steerText)) {
    el.enhanceSteeringNotes.value = `${current}. ${steerText}`;
  }
});

// Expand / collapse drawer when clicking action card headers
document.querySelectorAll(".action-card").forEach((card) => {
  const header = card.querySelector(".action-card-header");
  const desc = card.querySelector(".action-card-desc");
  const toggle = (e) => {
    // Avoid toggling when clicking inside an input or button
    if (e.target.closest("input, select, textarea, button, label")) return;
    card.classList.toggle("expanded");
  };
  header?.addEventListener("click", toggle);
  desc?.addEventListener("click", toggle);
});

// Tone Preset Pills
el.tonePresetChips?.addEventListener("click", (e) => {
  const pill = e.target.closest(".preset-pill");
  if (!pill) return;
  const tone = pill.dataset.tone;
  if (tone && el.toneCustomInput) {
    el.toneCustomInput.value = tone;
    el.tonePresetChips.querySelectorAll(".preset-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
  }
});

// Steered Enhancement Button Listeners
el.btnRunAudit?.addEventListener("click", () => runEnhance("audit_only", {}, "Auditing..."));

el.btnFullOverhaul?.addEventListener("click", () => {
  const globalNotes = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  const statusMsg = searchOpts.enableWebSearch ? "Executing Steered Overhaul (with Web Lore)..." : "Executing Steered Overhaul...";
  runEnhance(
    "full_overhaul",
    { nsfw: true, steeringInstructions: globalNotes, ...searchOpts },
    statusMsg
  );
});

el.btnRunDeepen?.addEventListener("click", () => {
  const focusCbs = Array.from(document.querySelectorAll(".deepen-focus:checked"));
  const focusAreas = focusCbs.map((cb) => cb.value);
  const customHint = el.deepenCustomHint?.value?.trim() || "";
  const globalNotes = getGlobalSteering();
  const steeringInstructions = [globalNotes, customHint].filter(Boolean).join(". ");
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "deepen_persona",
    { nsfw: true, focusAreas, steeringInstructions, ...searchOpts },
    "Deepening Persona..."
  );
});

el.btnRunVoice?.addEventListener("click", () => {
  const selectedStyle = el.voiceRegisterSelect?.value || "";
  const voiceStyle = selectedStyle === "custom" ? "" : selectedStyle;
  const customScenario = el.voiceScenarioHint?.value?.trim() || "";
  const banRobot = el.voiceBanRobot?.checked !== false;
  const globalNotes = getGlobalSteering();
  const directives = [globalNotes, customScenario];
  if (banRobot) {
    directives.push("CRITICAL: Completely ban robotic Spock parodies, statistical jargon (e.g. 'statistical anomaly', 'mathematically unsound'), and thesaurus phrasing. Speak with natural human cadence.");
  }
  const steeringInstructions = directives.filter(Boolean).join(". ");
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "polish_voice",
    { voiceStyle, steeringInstructions, ...searchOpts },
    "Polishing Voice & Example Messages..."
  );
});

el.btnRunGreetings?.addEventListener("click", () => {
  const scenePrompt = el.greetingsSceneHint?.value?.trim() || "";
  const themes = [
    el.greetingTheme1?.value?.trim(),
    el.greetingTheme2?.value?.trim(),
    el.greetingTheme3?.value?.trim(),
  ].filter(Boolean);
  const globalNotes = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "punch_first_mes",
    { scenarioPrompt: scenePrompt, altGreetingThemes: themes, steeringInstructions: globalNotes, ...searchOpts },
    "Punching Up Starter & Greetings..."
  );
});

el.btnRunFormat?.addEventListener("click", () => {
  const targetFormat = el.formatTargetSelect?.value || "prose";
  const rawBudget = el.formatTokenBudget?.value?.trim();
  const targetTokenBudget = rawBudget ? parseInt(rawBudget, 10) : undefined;
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "format_optimize",
    { targetFormat, targetTokenBudget, steeringInstructions, ...searchOpts },
    "Compressing & Converting Format..."
  );
});

el.btnRunLorebook?.addEventListener("click", () => {
  const depth = el.lorebookDepthSelect?.value || "detailed";
  const topics = el.lorebookTopicsHint?.value?.trim() || "";
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "generate_lorebook",
    { lorebookDepth: depth, lorebookTopics: topics, steeringInstructions, ...searchOpts },
    "Building Steered Lorebook..."
  );
});

el.btnRunTone?.addEventListener("click", () => {
  const targetTone = el.toneCustomInput?.value?.trim() || "Cold, authoritative, intellectually rigorous";
  const steeringInstructions = getGlobalSteering();
  const searchOpts = getEnhanceSearchOptions();
  runEnhance(
    "tone_shift",
    { toneShift: targetTone, nsfw: true, steeringInstructions, ...searchOpts },
    "Calibrating Character Tone..."
  );
});

el.btnOpenSynthesizeSpine?.addEventListener("click", () => {
  openSynthesizeSpineModal();
});



// ==========================================
// Scenario Matrix & Branching Starters
// ==========================================

async function runScenarioMatrix() {
  if (!assertProviderConfigured()) return;
  syncUIToState();
  if (!state.character.name && !state.character.description) {
    alert("Please spark or define a character first before generating scenario branches!");
    return;
  }

  el.modalScenarioMatrix?.classList.remove("hidden");
  if (el.matrixLoading) el.matrixLoading.classList.remove("hidden");
  if (el.matrixPackagesContainer) el.matrixPackagesContainer.innerHTML = "";

  try {
    const customSteering = [
      getGlobalSteering(),
      el.matrixCustomSteering?.value?.trim()
    ].filter(Boolean).join(". ");
    const searchOptions = getEnhanceSearchOptions();

    const res = await apiPost("/api/scenario-matrix", {
      character: state.character,
      provider: state.provider,
      customSteering,
      searchOptions,
    });

    state.scenarioMatrix = res;
    renderScenarioMatrixUI(res.packages || []);
  } catch (err) {
    alert("Scenario Matrix generation failed: " + err.message);
  } finally {
    if (el.matrixLoading) el.matrixLoading.classList.add("hidden");
  }
}

function renderScenarioMatrixUI(packages) {
  if (!el.matrixPackagesContainer) return;
  if (!packages || packages.length === 0) {
    el.matrixPackagesContainer.innerHTML = "<div style='grid-column: 1/-1; text-align: center; color: var(--text-dim);'>No packages generated.</div>";
    return;
  }

  const icons = {
    canon: "🏛️",
    crisis: "🚨",
    intimacy: "🌙",
    interrogation: "🔒",
  };

  el.matrixPackagesContainer.innerHTML = packages.map((pkg, idx) => {
    const icon = icons[pkg.id] || "🎭";
    const altsCount = (pkg.alternate_greetings || []).length;
    return `
      <div class="scenario-pkg-card" data-index="${idx}">
        <div class="scenario-pkg-header">
          <div class="scenario-pkg-title">${icon} ${escapeHtml(pkg.title)}</div>
          <span class="scenario-pkg-vibe">${escapeHtml(pkg.vibe)}</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: var(--text-dim); margin-top: 4px;">Opening Message Preview:</div>
        <div class="scenario-pkg-body">
          ${escapeHtml(pkg.first_mes).replace(/\\n/g, "<br>")}
        </div>
        <div style="font-size: 10px; color: var(--text-dim); display: flex; justify-content: space-between;">
          <span>Includes scenario + ${altsCount} alternate greetings</span>
        </div>
        <button class="btn btn-sm btn-primary btn-apply-scenario" data-index="${idx}" style="margin-top: 6px; width: 100%; justify-content: center;" type="button">
          ✨ Apply This Scenario to Card
        </button>
      </div>
    `;
  }).join("");
}

function applyScenarioPackage(index) {
  const pkg = state.scenarioMatrix?.packages?.[index];
  if (!pkg) return;

  state.character.scenario = pkg.scenario;
  state.character.first_mes = pkg.first_mes;
  if (Array.isArray(pkg.alternate_greetings) && pkg.alternate_greetings.length > 0) {
    state.character.alternate_greetings = pkg.alternate_greetings;
  }

  syncStateToUI();
  recordSnapshot(`Applied Branch: ${pkg.title}`);
  el.modalScenarioMatrix?.classList.add("hidden");
  alert(`✨ Applied "${pkg.title}"! Scenario, First Message, and Alternate Greetings updated.`);
}

// Scenario Matrix Listeners
el.btnGenerateMatrix?.addEventListener("click", runScenarioMatrix);
el.btnCloseMatrix?.addEventListener("click", () => el.modalScenarioMatrix?.classList.add("hidden"));
el.btnCloseMatrixFooter?.addEventListener("click", () => el.modalScenarioMatrix?.classList.add("hidden"));

el.matrixPackagesContainer?.addEventListener("click", (e) => {
  const applyBtn = e.target.closest(".btn-apply-scenario");
  if (!applyBtn) return;
  const idx = parseInt(applyBtn.dataset.index, 10);
  applyScenarioPackage(idx);
});

// -------------------------------------------------------------
// Image Prompt Generator & Offline Queue Engine
// -------------------------------------------------------------


