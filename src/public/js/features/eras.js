// Historical & Fantasy Era Explorer & Era Forge Co-Pilot
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiGet, apiPost, apiDelete } from "../core/api.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { showIpcToast } from "./ipc.js";
import { escapeHtml, recordSnapshot } from "../utils/diff.js";
import { assertProviderConfigured, updateLlmCacheBadge } from "../utils/provider.js";
import { updateActiveCardBadge } from "./library.js";

// ==========================================
// Historical & Fantasy Era Discovery Studio
// ==========================================

let eraSearchDebounceTimer = null;

export async function loadEraCatalogStats() {
  try {
    const res = await apiGet("/api/eras");
    if (res && Array.isArray(res.eras)) {
      state.eras = res.eras;
      if (el.eraCatalogCountBadge) {
        el.eraCatalogCountBadge.textContent = `${res.total || res.eras.length}+ Eras`;
      }
      const userEras = res.eras.filter((e) => e.is_user_era);
      if (el.userErasCount) {
        el.userErasCount.textContent = String(userEras.length);
      }
    }
  } catch (err) {
    console.warn("Failed to load era catalog:", err);
  }
}

export function openEraModal(tabName = "All") {
  if (!el.modalEraPicker) return;
  state.eraCategoryFilter = tabName;

  // Sync tab buttons
  document.querySelectorAll("[data-era-tab]").forEach((btn) => {
    const t = btn.getAttribute("data-era-tab");
    btn.classList.toggle("active", t === tabName);
  });

  if (el.eraSearchInput) el.eraSearchInput.value = "";
  state.eraSearchQuery = "";
  if (el.eraRegionFilter) el.eraRegionFilter.value = "All";
  state.eraRegionFilter = "All";

  el.modalEraPicker.classList.remove("hidden");
  loadEraCatalogStats();
  searchAndRenderEras();
}

export function closeEraModal() {
  if (el.modalEraPicker) el.modalEraPicker.classList.add("hidden");
}

export function setEraInput(val, highlight = true, eraData = null) {
  if (el.genEra) {
    el.genEra.value = val || "";
    if (highlight && val) {
      el.genEra.classList.add("pulse-highlight");
      setTimeout(() => el.genEra?.classList.remove("pulse-highlight"), 2000);
    }
  }

  // Update quick chip active styling
  document.querySelectorAll(".era-chip-btn").forEach((b) => b.classList.remove("active"));
  if (!val) {
    el.btnEraQuickOff?.classList.add("active");
  } else if (val.toLowerCase().includes("timeless") || val.toLowerCase().includes("fantasy")) {
    el.btnEraQuickFantasy?.classList.add("active");
  } else if (val.toLowerCase().includes("medieval") || val.toLowerCase().includes("plantagenet") || val.toLowerCase().includes("shogun")) {
    el.btnEraQuickMedieval?.classList.add("active");
  }

  updateEraDossierPreview(eraData || val);
}

let promptSnippetExpanded = false;
export async function updateEraDossierPreview(eraDataOrName) {
  const container = document.getElementById("era-dossier-preview");
  if (!container) return;

  if (!eraDataOrName || (typeof eraDataOrName === "string" && (!eraDataOrName.trim() || eraDataOrName.trim().toLowerCase() === "off"))) {
    container.style.display = "none";
    return;
  }

  let eraObj = null;
  let promptSnippet = "";

  if (typeof eraDataOrName === "object" && eraDataOrName !== null) {
    eraObj = eraDataOrName;
    promptSnippet = eraDataOrName.promptSnippet || "";
  } else if (typeof eraDataOrName === "string") {
    try {
      const res = await apiGet(`/api/eras/resolve?q=${encodeURIComponent(eraDataOrName.trim())}`);
      if (res && res.era) {
        eraObj = res.era;
      }
      promptSnippet = res?.promptSnippet || "";
    } catch (e) {
      console.warn("Failed resolving era preview:", e);
    }
  }

  const titleEl = document.getElementById("era-dossier-title");
  const spanEl = document.getElementById("era-dossier-span");
  const aestheticEl = document.getElementById("era-dossier-aesthetic");
  const techEl = document.getElementById("era-dossier-tech");
  const socialEl = document.getElementById("era-dossier-social");
  const snippetEl = document.getElementById("era-dossier-prompt-snippet");
  const toggleBtn = document.getElementById("btn-toggle-era-prompt-snippet");

  if (!promptSnippet && eraDataOrName) {
    const eraName = eraObj?.name || (typeof eraDataOrName === "string" ? eraDataOrName : "Selected Era");
    promptSnippet = `[ERA / SETTING CONSTRAINT: ${eraName}]\nAll dialogue, attire, social etiquette, technology, and terminology must authentically conform to this historical / setting period. Avoid anachronisms.`;
  }

  const eraTitle = eraObj?.name || eraObj?.short_name || (typeof eraDataOrName === "string" ? eraDataOrName : "HISTORICAL ERA");
  if (titleEl) titleEl.textContent = eraTitle;

  if (spanEl) {
    if (eraObj?.span) {
      spanEl.textContent = eraObj.span;
      spanEl.style.display = "inline-block";
    } else {
      spanEl.style.display = "none";
    }
  }

  if (aestheticEl) {
    if (eraObj?.aesthetic) {
      aestheticEl.textContent = eraObj.aesthetic;
      aestheticEl.style.display = "block";
    } else {
      aestheticEl.style.display = "none";
    }
  }

  if (techEl) {
    if (eraObj?.tech) {
      techEl.innerHTML = `<strong>⚙️ Tech &amp; Limitations:</strong> ${escapeHtml(eraObj.tech)}`;
      techEl.style.display = "block";
    } else {
      techEl.style.display = "none";
    }
  }

  if (socialEl) {
    if (eraObj?.social_codes) {
      socialEl.innerHTML = `<strong>📜 Social &amp; Hierarchy:</strong> ${escapeHtml(eraObj.social_codes)}`;
      socialEl.style.display = "block";
    } else {
      socialEl.style.display = "none";
    }
  }

  if (snippetEl) {
    snippetEl.textContent = promptSnippet || "";
  }

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      promptSnippetExpanded = !promptSnippetExpanded;
      if (promptSnippetExpanded) {
        snippetEl.style.webkitLineClamp = "unset";
        snippetEl.style.maxHeight = "none";
        toggleBtn.textContent = "▲ Collapse";
      } else {
        snippetEl.style.webkitLineClamp = "2";
        snippetEl.style.maxHeight = "";
        toggleBtn.textContent = "▼ Show Prompt";
      }
    };
  }

  container.style.display = "block";
}

export async function searchAndRenderEras() {
  if (!el.eraCardsContainer) return;
  el.eraCardsContainer.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);"><span class="spinner"></span> Searching eras...</div>`;

  try {
    const q = (el.eraSearchInput?.value || "").trim();
    const cat = state.eraCategoryFilter || "All";
    const reg = el.eraRegionFilter?.value || "All";
    const onlyUser = cat === "User Eras";

    const params = new URLSearchParams({
      q,
      category: cat,
      region: reg,
      onlyUser: String(onlyUser),
    });

    const res = await apiGet(`/api/eras/search?${params.toString()}`);
    const results = res?.results || [];

    if (results.length === 0) {
      el.eraCardsContainer.innerHTML = `
        <div style="text-align:center; padding: 32px 16px; color: var(--text-muted);">
          <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 600;">No historical or fantasy eras match your filter</div>
          <div style="font-size: 11px; margin-top: 4px;">Try searching for a country name, century (e.g. '14th century', '1200s'), or broad concept ('knight', 'gladiator', 'samurai').</div>
        </div>
      `;
      return;
    }

    el.eraCardsContainer.innerHTML = "";
    results.forEach((era) => {
      const card = document.createElement("div");
      card.className = "era-card";
      if (state.selectedEra && state.selectedEra.id === era.id) {
        card.classList.add("selected");
      }

      card.innerHTML = `
        <div class="era-card-title">
          <span>${escapeHtml(era.name)}</span>
          ${era.is_user_era ? `<span class="era-badge-user">User Custom</span>` : ""}
        </div>
        <div class="era-meta-badges">
          <span class="era-badge-span">📅 ${escapeHtml(era.span || "Epoch")}</span>
          <span class="era-badge-region">📍 ${escapeHtml(era.region || "Global")}</span>
          <span class="era-badge-category">${escapeHtml(era.category || "Historical")}</span>
        </div>
        <div class="era-card-snippet">${escapeHtml(era.aesthetic || era.tech || "")}</div>
      `;

      card.addEventListener("click", () => {
        document.querySelectorAll(".era-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        state.selectedEra = era;
        renderEraInspector(era);
        if (el.btnApplySelectedEra) el.btnApplySelectedEra.disabled = false;
      });

      el.eraCardsContainer.appendChild(card);
    });

    // Auto-select first if none selected
    if (!state.selectedEra && results[0]) {
      state.selectedEra = results[0];
      const firstCard = el.eraCardsContainer.firstElementChild;
      if (firstCard) firstCard.classList.add("selected");
      renderEraInspector(results[0]);
      if (el.btnApplySelectedEra) el.btnApplySelectedEra.disabled = false;
    }
  } catch (err) {
    el.eraCardsContainer.innerHTML = `<div style="color:#f87171; padding:16px;">Failed to search eras: ${err.message}</div>`;
  }
}

export function renderEraInspector(era) {
  if (!el.eraDetailPanel) return;
  if (!era) {
    el.eraDetailPanel.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-dim);">Select an era from the list</div>`;
    return;
  }

  const namesList = Array.isArray(era.names) && era.names.length > 0 ? era.names.join(", ") : "Standard period authentic naming";
  const titlesList = Array.isArray(era.titles) && era.titles.length > 0 ? era.titles.join(", ") : "Period titles and stations";

  el.eraDetailPanel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
      <div>
        <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">${escapeHtml(era.name)}</h3>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
          <span>${escapeHtml(era.span)}</span> • <span>${escapeHtml(era.region)}</span>
        </div>
      </div>
      ${era.is_user_era ? `
        <div style="display:flex; gap:6px;">
          <button id="btn-edit-user-era" class="btn btn-xs" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #93c5fd;">✏️ Edit</button>
          <button id="btn-delete-user-era" class="btn btn-xs" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">🗑️ Delete</button>
        </div>
      ` : ""}
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">🏛️ Aesthetic, Architecture & Atmosphere</div>
      <div class="era-detail-text">${escapeHtml(era.aesthetic || "Historical setting atmosphere.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">⚙️ Technology & Material Constraints</div>
      <div class="era-detail-text">${escapeHtml(era.tech || "Period material tools.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">⚖️ Social Codes, Hierarchy & Honor Dynamics</div>
      <div class="era-detail-text">${escapeHtml(era.social_codes || "Interpersonal etiquette.")}</div>
    </div>

    <div class="era-detail-section">
      <div class="era-detail-label">👤 Sample Authenticated Names</div>
      <div class="era-detail-text" style="font-size: 11px; color: #cbd5e1;">${escapeHtml(namesList)}</div>
    </div>

    <div class="era-detail-section" style="margin-bottom: 16px;">
      <div class="era-detail-label">👑 Suggested Social Stations & Titles</div>
      <div class="era-detail-text" style="font-size: 11px; color: #cbd5e1;">${escapeHtml(titlesList)}</div>
    </div>

    <button id="btn-inspector-apply" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 10px; font-weight: 700; margin-top: auto;">
      ✨ Apply "${escapeHtml(era.short_name || era.name)}" to Character Spark
    </button>
  `;

  document.getElementById("btn-inspector-apply")?.addEventListener("click", () => {
    applySelectedEraToSpark(era);
  });

  if (era.is_user_era) {
    document.getElementById("btn-edit-user-era")?.addEventListener("click", () => {
      openUserEraEditor(era);
    });
    document.getElementById("btn-delete-user-era")?.addEventListener("click", async () => {
      if (confirm(`Are you sure you want to delete custom era "${era.name}"?`)) {
        await deleteUserEraItem(era.id);
      }
    });
  }
}

export function applySelectedEraToSpark(era) {
  if (!era) return;
  setEraInput(era.name, true, era);
  closeEraModal();
  showIpcToast(`Era selected: ${era.name}`, "info");
}

function openUserEraEditor(eraToEdit = null) {
  if (!el.modalUserEraEditor) return;
  if (eraToEdit) {
    if (el.userEraModalTitle) el.userEraModalTitle.textContent = "✏️ Edit Custom Era Template";
    if (el.userEraId) el.userEraId.value = eraToEdit.id || "";
    if (el.userEraName) el.userEraName.value = eraToEdit.name || "";
    if (el.userEraSpan) el.userEraSpan.value = eraToEdit.span || "";
    if (el.userEraRegion) el.userEraRegion.value = eraToEdit.region || "";
    if (el.userEraAesthetic) el.userEraAesthetic.value = eraToEdit.aesthetic || "";
    if (el.userEraTech) el.userEraTech.value = eraToEdit.tech || "";
    if (el.userEraSocial) el.userEraSocial.value = eraToEdit.social_codes || "";
    if (el.userEraNames) el.userEraNames.value = Array.isArray(eraToEdit.names) ? eraToEdit.names.join(", ") : "";
    if (el.userEraTitles) el.userEraTitles.value = Array.isArray(eraToEdit.titles) ? eraToEdit.titles.join(", ") : "";
  } else {
    if (el.userEraModalTitle) el.userEraModalTitle.textContent = "➕ Create Custom Era Template";
    if (el.userEraId) el.userEraId.value = "";
    if (el.userEraName) el.userEraName.value = "";
    if (el.userEraSpan) el.userEraSpan.value = "";
    if (el.userEraRegion) el.userEraRegion.value = "";
    if (el.userEraAesthetic) el.userEraAesthetic.value = "";
    if (el.userEraTech) el.userEraTech.value = "";
    if (el.userEraSocial) el.userEraSocial.value = "";
    if (el.userEraNames) el.userEraNames.value = "";
    if (el.userEraTitles) el.userEraTitles.value = "";
  }
  el.modalUserEraEditor.classList.remove("hidden");
}

function closeUserEraEditor() {
  if (el.modalUserEraEditor) el.modalUserEraEditor.classList.add("hidden");
}

async function saveUserEraFromForm() {
  const name = el.userEraName?.value.trim();
  const span = el.userEraSpan?.value.trim();
  if (!name || !span) {
    alert("Please provide both an Era Name and a Time Span / Century!");
    return;
  }

  const payload = {
    id: el.userEraId?.value.trim() || undefined,
    name,
    short_name: name,
    span,
    region: el.userEraRegion?.value.trim() || "Global",
    category: "User Eras",
    aesthetic: el.userEraAesthetic?.value.trim() || "User-defined period atmosphere.",
    tech: el.userEraTech?.value.trim() || "Period material tools.",
    social_codes: el.userEraSocial?.value.trim() || "Custom social dynamic.",
    names: (el.userEraNames?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
    titles: (el.userEraTitles?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
    tags: ["User Template"],
  };

  try {
    const res = await apiPost("/api/eras/user", payload);
    if (res && res.era) {
      closeUserEraEditor();
      await loadEraCatalogStats();
      state.eraCategoryFilter = "User Eras";
      document.querySelectorAll("[data-era-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-era-tab") === "User Eras");
      });
      await searchAndRenderEras();
      state.selectedEra = res.era;
      renderEraInspector(res.era);
      showIpcToast(`Saved custom era: ${res.era.name}`, "success");
    }
  } catch (err) {
    alert("Failed to save custom era: " + err.message);
  }
}

async function deleteUserEraItem(id) {
  try {
    const res = await apiDelete(`/api/eras/user/${id}`);
    if (res && res.success) {
      state.selectedEra = null;
      await loadEraCatalogStats();
      await searchAndRenderEras();
      showIpcToast("Custom era deleted", "info");
    }
  } catch (err) {
    alert("Failed to delete custom era: " + err.message);
  }
}

// Global Event Listeners for Era Studio
el.btnOpenEraModal?.addEventListener("click", () => openEraModal("All"));
el.btnBrowseEraAddon?.addEventListener("click", () => openEraModal("All"));
el.btnCloseEraModal?.addEventListener("click", closeEraModal);
el.btnCloseEraModalBottom?.addEventListener("click", closeEraModal);
el.btnClearEra?.addEventListener("click", () => setEraInput("", false));
el.genEra?.addEventListener("input", (e) => {
  const val = e.target.value;
  updateEraDossierPreview(val);
});

el.btnEraQuickOff?.addEventListener("click", () => {
  setEraInput("", false);
  showIpcToast("Temporal constraints set to Off", "info");
});
el.btnEraQuickFantasy?.addEventListener("click", () => {
  setEraInput("🌌 Timeless High Fantasy (Achronological)", true);
  showIpcToast("Applied Timeless High Fantasy", "info");
});
el.btnEraQuickMedieval?.addEventListener("click", () => openEraModal("Medieval"));
el.btnEraQuickAntiquity?.addEventListener("click", () => openEraModal("Antiquity"));
el.btnEraQuickVictorian?.addEventListener("click", () => openEraModal("Victorian & Industrial"));
el.btnEraQuickUser?.addEventListener("click", () => openEraModal("User Eras"));

el.btnModalEraOff?.addEventListener("click", () => {
  setEraInput("", false);
  closeEraModal();
  showIpcToast("Era constraints cleared", "info");
});
el.btnModalEraFantasy?.addEventListener("click", () => {
  setEraInput("🌌 Timeless High Fantasy (Achronological)", true);
  closeEraModal();
  showIpcToast("Applied Timeless High Fantasy", "info");
});
el.btnApplySelectedEra?.addEventListener("click", () => {
  if (state.selectedEra) {
    applySelectedEraToSpark(state.selectedEra);
  }
});

// Category Tab clicks in modal
document.querySelectorAll("[data-era-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-era-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.eraCategoryFilter = btn.getAttribute("data-era-tab") || "All";
    searchAndRenderEras();
  });
});

// Region Filter change
el.eraRegionFilter?.addEventListener("change", () => {
  searchAndRenderEras();
});

// Search input debounced
el.eraSearchInput?.addEventListener("input", () => {
  clearTimeout(eraSearchDebounceTimer);
  eraSearchDebounceTimer = setTimeout(() => {
    searchAndRenderEras();
  }, 220);
});

// User Custom Era Editor
el.btnEraCreateCustom?.addEventListener("click", () => openUserEraEditor(null));
el.btnCloseUserEraEditor?.addEventListener("click", closeUserEraEditor);
el.btnCancelUserEra?.addEventListener("click", closeUserEraEditor);
el.btnSaveUserEra?.addEventListener("click", saveUserEraFromForm);

// Load Era catalog stats on page load
loadEraCatalogStats();

// Forge or Reroll Character Card
async function executeForgeOrReroll(isReroll = false, customSteer = "") {
  if (!assertProviderConfigured()) return;

  let concept = el.genConcept ? el.genConcept.value.trim() : "";
  if (!concept && state.character && state.character.name) {
    concept = `${state.character.name}: ${state.character.personality || state.character.description || ""}`.trim();
  }

  if (!concept) {
    alert("Please provide a concept or seed idea for the character!");
    return;
  }

  const btnRunSteerReroll = document.getElementById("btn-run-steer-reroll");
  const buttonsToLock = [el.btnRunGenerate, el.btnRunReroll, btnRunSteerReroll, el.btnRerollCardHeader].filter(Boolean);
  buttonsToLock.forEach((b) => { b.disabled = true; });

  const origGenerateHtml = el.btnRunGenerate ? el.btnRunGenerate.innerHTML : "";
  const origRerollHtml = el.btnRunReroll ? el.btnRunReroll.innerHTML : "";
  const origSteerHtml = btnRunSteerReroll ? btnRunSteerReroll.innerHTML : "";
  const origCardHeaderHtml = el.btnRerollCardHeader ? el.btnRerollCardHeader.innerHTML : "";

  if (isReroll) {
    if (el.btnRunReroll) el.btnRunReroll.innerHTML = `<span class="spinner"></span> <span>Rerolling...</span>`;
    if (btnRunSteerReroll) btnRunSteerReroll.innerHTML = `<span class="spinner"></span>`;
    if (el.btnRerollCardHeader) el.btnRerollCardHeader.innerHTML = `<span class="spinner"></span> <span>Rerolling...</span>`;
  } else {
    if (el.btnRunGenerate) el.btnRunGenerate.innerHTML = `<span class="spinner"></span> <span>Engineering Uncensored Card...</span>`;
  }

  try {
    const payload = {
      concept,
      genre: el.genGenre ? el.genGenre.value : "fantasy",
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone ? el.genTone.value : "dynamic",
      format: el.genFormat ? el.genFormat.value : "w++",
      nsfw: el.genNsfw ? el.genNsfw.checked : false,
      botMode: state.botMode || "single",
      enableWebSearch: el.genWebSearch ? el.genWebSearch.checked : false,
      searchQuery: (el.genSearchQuery ? el.genSearchQuery.value.trim() : "") || concept,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      steeringInstructions: customSteer || (el.enhanceSteeringNotes ? el.enhanceSteeringNotes.value.trim() : undefined) || undefined,
      provider: state.provider
    };

    const res = await apiPost("/api/generate", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`${isReroll ? "Rerolled" : "Forged"}: ${state.character.name}`);
      updateLlmCacheBadge();
      alert(`🎉 Successfully ${isReroll ? "rerolled" : "forged"} "${state.character.name}"!`);
    }
  } catch (err) {
    alert(`${isReroll ? "Reroll" : "Generation"} failed: ` + err.message);
  } finally {
    buttonsToLock.forEach((b) => { b.disabled = false; });
    if (el.btnRunGenerate && origGenerateHtml) el.btnRunGenerate.innerHTML = origGenerateHtml;
    if (el.btnRunReroll && origRerollHtml) el.btnRunReroll.innerHTML = origRerollHtml;
    if (btnRunSteerReroll && origSteerHtml) btnRunSteerReroll.innerHTML = origSteerHtml;
    if (el.btnRerollCardHeader && origCardHeaderHtml) el.btnRerollCardHeader.innerHTML = origCardHeaderHtml;
  }
}

el.btnRunGenerate?.addEventListener("click", () => executeForgeOrReroll(false));
el.btnRunReroll?.addEventListener("click", () => executeForgeOrReroll(true));
el.btnRerollCardHeader?.addEventListener("click", () => executeForgeOrReroll(true));
document.getElementById("btn-run-steer-reroll")?.addEventListener("click", () => {
  const currentNotes = el.enhanceSteeringNotes ? el.enhanceSteeringNotes.value.trim() : "";
  const steer = prompt(
    "🎯 Influence / Steer this Character Reroll:\n\nEnter instructions to guide {{char}}'s psychology, tone, or dynamic:",
    currentNotes
  );
  if (steer !== null) {
    if (el.enhanceSteeringNotes && steer.trim()) {
      el.enhanceSteeringNotes.value = steer.trim();
    }
    executeForgeOrReroll(true, steer.trim());
  }
});

// Bot Generation Mode Selector Handlers (Solo Character, Multi-Character Cast, RPG World / GM)
document.querySelectorAll(".bot-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    state.botMode = mode;
    document.querySelectorAll(".bot-mode-btn").forEach((b) => {
      if (b.dataset.mode === mode) {
        b.classList.add("active");
        b.style.borderColor = mode === "multi_character" ? "var(--accent-purple)" : mode === "rpg_world" ? "var(--accent-green)" : "var(--accent-cyan)";
        b.style.background = mode === "multi_character" ? "rgba(168, 85, 247, 0.15)" : mode === "rpg_world" ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)";
        b.style.color = mode === "multi_character" ? "#c084fc" : mode === "rpg_world" ? "#34d399" : "#38bdf8";
      } else {
        b.classList.remove("active");
        b.style.borderColor = "var(--border-main)";
        b.style.background = "var(--bg-card)";
        b.style.color = "var(--text-muted)";
      }
    });

    const lbl = document.getElementById("gen-concept-label");
    const txt = el.genConcept;
    if (mode === "multi_character") {
      if (lbl) lbl.textContent = "Multi-Character Cast / Duo / Household Concept";
      if (txt) txt.placeholder = "e.g. Two rival inquisitor partners bound by a blood contract: one ruthless and methodical, the other empathetic and reckless, hunting heretics while hiding their own forbidden pact.";
    } else if (mode === "rpg_world") {
      if (lbl) lbl.textContent = "RPG World / Game Master Setting & Inciting Incident";
      if (txt) txt.placeholder = "e.g. The Sunken Citadel of Oakhaven: A flooded gothic kingdom ruled by competing merchant factions, ancient sea cults, and drowned automatons. High-stakes survival and political intrigue.";
    } else {
      if (lbl) lbl.textContent = "Character Concept / Seed / Trope";
      if (txt) txt.placeholder = "e.g. A weary inquisitor who broke their sacred oath to protect a heretic child. Cold, formal, scarred, haunted by ghosts they refuse to name.";
    }
  });
});



// ============================================================================
// Era Forge: Agent-Assisted Worldbuilding & Drop-in Extension Manager
// ============================================================================

let activeEraPair = null;
let activePreviewVariant = "polygyny"; // "polygyny" | "monogamy"
let activeEraCompliance = null;

export async function loadInstalledExtensions() {
  const container = document.getElementById("installed-extensions-list");
  if (!container) return;
  try {
    const res = await fetch("/api/eras/extensions");
    if (!res.ok) throw new Error("Failed to load extensions");
    const data = await res.json();
    const files = data.files || [];

    if (files.length === 0) {
      container.innerHTML = `
        <div style="font-size: 11px; color: var(--text-dim); padding: 4px;">
          No custom extension packs found in <code>data/eras_extensions/</code>. Forge an era pair above to create one!
        </div>`;
      return;
    }

    container.innerHTML = files.map(f => {
      const isExtUser = Boolean(f.isExternalUser);
      const tagBadge = isExtUser
        ? `<span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); margin-left: 4px;">User AppData</span>`
        : `<span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); margin-left: 4px;">Project</span>`;
      return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 11px;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">
          <span style="font-weight: 700; color: var(--accent-cyan);">📄 ${escapeHtml(f.filename)}</span>
          ${tagBadge}
          <span style="color: var(--text-dim); margin-left: 6px;">(${f.eraCount} era${f.eraCount === 1 ? "" : "s"} · ${(f.sizeBytes / 1024).toFixed(1)} KB)</span>
          <div style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">
            ${(f.eras || []).map(e => escapeHtml(e.name || e.id)).join(" · ")}
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn btn-sm btn-delete-extension" data-filename="${escapeHtml(f.filename)}" data-destination="${isExtUser ? 'local_user' : 'project_data'}" style="font-size: 10px; padding: 2px 6px; color: #f87171;" title="Delete this extension pack">🗑️</button>
        </div>
      </div>
    `;
    }).join("");

    container.querySelectorAll(".btn-delete-extension").forEach(btn => {
      btn.addEventListener("click", async () => {
        const fn = btn.dataset.filename;
        const dest = btn.dataset.destination || "project_data";
        if (!confirm(`Delete extension pack "${fn}" (${dest === "local_user" ? "User AppData" : "Project"})?`)) return;
        try {
          const delRes = await fetch(`/api/eras/extensions/${encodeURIComponent(fn)}?destination=${encodeURIComponent(dest)}`, { method: "DELETE" });
          if (delRes.ok) {
            showIpcToast(`Deleted ${fn}`, "info");
            await loadInstalledExtensions();
            await loadEraCatalogStats();
          }
        } catch (err) {
          showIpcToast(`Failed to delete: ${err.message}`, "error");
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div style="font-size: 11px; color: #f87171;">Failed to load extensions: ${err.message}</div>`;
  }
}

export function renderActiveEraCard() {
  if (!activeEraPair) return;
  const era = activePreviewVariant === "monogamy" ? activeEraPair.monogamy : activeEraPair.polygyny;
  const report = activeEraCompliance?.[activePreviewVariant];

  const titleEl = document.getElementById("era-preview-title");
  const spanEl = document.getElementById("era-preview-span");
  const regionEl = document.getElementById("era-preview-region");
  const aestheticEl = document.getElementById("era-preview-aesthetic");
  const techEl = document.getElementById("era-preview-tech");
  const socialEl = document.getElementById("era-preview-social");
  const titlesEl = document.getElementById("era-preview-titles");
  const tagsEl = document.getElementById("era-preview-tags");
  const badgeSummaryEl = document.getElementById("era-compliance-badge-summary");

  if (titleEl) titleEl.textContent = era?.name || "Unnamed Era";
  if (spanEl) spanEl.textContent = era?.span || "Temporal Span Undefined";
  if (regionEl) regionEl.textContent = era?.region || "Setting Region";
  if (aestheticEl) aestheticEl.textContent = era?.aesthetic || "";
  if (techEl) techEl.textContent = era?.tech || "";
  if (socialEl) socialEl.textContent = era?.social_codes || "";

  if (titlesEl) {
    const titles = Array.isArray(era?.titles) ? era.titles : [];
    titlesEl.innerHTML = titles.map(t => `<span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 ${escapeHtml(t)}</span>`).join("");
  }

  if (tagsEl) {
    const tags = Array.isArray(era?.tags) ? era.tags : [];
    tagsEl.innerHTML = tags.map(t => `<span style="background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-color); padding: 1px 5px; border-radius: 3px; font-size: 10px;">#${escapeHtml(t)}</span>`).join("");
  }

  // Update Era Architecture & Quality Checklist
  if (report) {
    const p = report.pillars || {};
    const renderCheck = (id, text, passed) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `${text}: <span style="font-weight:700; color: ${passed ? '#4ade80' : '#f87171'};">${passed ? '✓ PASS' : '✗ WARN'}</span>`;
      }
    };

    renderCheck("pillar-check-dual", "⚔️ Dual-Format Pair", Boolean(p.dualFormat));
    renderCheck("pillar-check-depth", "🏰 Setting & Aesthetic Depth", Boolean(p.settingDepth ?? p.zeroIntruder ?? true));
    renderCheck("pillar-check-social", "📜 Social Codes & Dynamic", Boolean(p.socialStructure ?? p.domesticOrder ?? true));
    renderCheck("pillar-check-richness", "📚 Rich Names & Archetypes", Boolean(p.contentRichness));

    if (badgeSummaryEl) {
      const isOk = report.compliant && report.score >= 80;
      badgeSummaryEl.style.background = isOk ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)";
      badgeSummaryEl.style.color = isOk ? "#4ade80" : "#facc15";
      badgeSummaryEl.style.borderColor = isOk ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)";
      badgeSummaryEl.textContent = `🛡️ ${report.score}% Compliant`;
    }

    const issuesEl = document.getElementById("era-compliance-issues");
    if (issuesEl) {
      const allNotes = [...(report.issues || []).map(i => `⚠️ Issue: ${i}`), ...(report.warnings || []).map(w => `💡 Tip: ${w}`)];
      issuesEl.innerHTML = allNotes.map(n => `<div>${escapeHtml(n)}</div>`).join("");
    }
  }
}

export function initEraForgeUI() {
  const promptInput = document.getElementById("era-agent-prompt");
  const autocompleteEl = document.getElementById("era-agent-autocomplete");
  const filenameInput = document.getElementById("era-extension-filename");
  const btnGenerate = document.getElementById("btn-era-agent-generate");
  const feedEl = document.getElementById("era-agent-feed");
  const msgBodyEl = document.getElementById("era-agent-message-body");
  const toolContainerEl = document.getElementById("era-tool-calls-container");
  const previewSection = document.getElementById("era-preview-section");
  const btnPoly = document.getElementById("btn-preview-poly");
  const btnMono = document.getElementById("btn-preview-mono");
  const btnSave = document.getElementById("btn-save-era-extension");
  const btnTest = document.getElementById("btn-test-era-spark");
  const btnCopyJson = document.getElementById("btn-copy-era-json");
  const btnRefresh = document.getElementById("btn-refresh-extensions");
  let activeAgentRunId = null;
  let agentCancelRequested = false;

  // Era & Category Autocomplete trigger (era: <query> for specific setting, erac: <query> for category)
  if (promptInput && autocompleteEl) {
    let debounceTimer = null;
    const hideAutocomplete = () => {
      autocompleteEl.classList.add("hidden");
      autocompleteEl.innerHTML = "";
    };

    promptInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const text = promptInput.value;
      const matchErac = /(?:^|\s)erac:\s*([^\s]*)$/i.exec(text);
      const matchEra = /(?:^|\s)era:\s*([^\s]*)$/i.exec(text);
      if (!matchErac && !matchEra) {
        hideAutocomplete();
        return;
      }

      const isCategory = Boolean(matchErac);
      const searchQuery = isCategory ? (matchErac[1] || "") : (matchEra[1] || "");
      const marker = isCategory ? "erac:" : "era:";

      debounceTimer = setTimeout(async () => {
        try {
          if (isCategory) {
            const res = await apiGet(`/api/eras/categories?q=${encodeURIComponent(searchQuery)}`);
            const categories = res?.categories || [];
            if (!categories.length) {
              hideAutocomplete();
              return;
            }
            autocompleteEl.innerHTML = categories.slice(0, 8).map(c => `
              <div class="era-ac-item" data-id="${escapeHtml(c.name)}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); font-size: 11px;">
                <div>
                  <span style="font-weight: 600; color: var(--text-main);">📁 ${escapeHtml(c.name)}</span>
                  <span style="color: var(--text-muted); font-size: 10px; margin-left: 6px;">(${c.count} settings)</span>
                </div>
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(16, 185, 129, 0.2); color: #34d399;">
                  Category
                </span>
              </div>
            `).join("");
          } else {
            const res = await apiGet(`/api/eras/search?q=${encodeURIComponent(searchQuery)}`);
            const results = res?.results || [];
            if (!results.length) {
              hideAutocomplete();
              return;
            }
            autocompleteEl.innerHTML = results.slice(0, 8).map(era => `
              <div class="era-ac-item" data-id="${escapeHtml(era.id)}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); font-size: 11px;">
                <div>
                  <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(era.name)}</span>
                  <span style="color: var(--text-muted); font-size: 10px; margin-left: 6px;">(${escapeHtml(era.region || era.category || "Era")})</span>
                </div>
                <span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: ${era.is_extension ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)'}; color: ${era.is_extension ? '#c084fc' : '#93c5fd'};">
                  ${era.is_extension ? 'Extension' : 'Core'}
                </span>
              </div>
            `).join("");
          }
          autocompleteEl.classList.remove("hidden");

          autocompleteEl.querySelectorAll(".era-ac-item").forEach(item => {
            item.addEventListener("mouseenter", () => { item.style.background = "var(--bg-hover, rgba(255,255,255,0.06))"; });
            item.addEventListener("mouseleave", () => { item.style.background = "transparent"; });
            item.addEventListener("click", () => {
              const selectedValue = item.dataset.id;
              const currentVal = promptInput.value;
              const idx = currentVal.toLowerCase().lastIndexOf(marker);
              if (idx >= 0) {
                const before = currentVal.substring(0, idx + marker.length);
                promptInput.value = before + " " + selectedValue + " ";
              }
              hideAutocomplete();
              promptInput.focus();
            });
          });
        } catch {
          hideAutocomplete();
        }
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!autocompleteEl.contains(e.target) && e.target !== promptInput) {
        hideAutocomplete();
      }
    });
  }

  if (promptInput) {
    promptInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && activeAgentRunId) {
        event.preventDefault();
        const instruction = promptInput.value.trim();
        if (!instruction) return;
        await fetch("/api/eras/agent/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: activeAgentRunId, instruction }),
        }).catch(() => {});
        promptInput.value = "";
        showIpcToast("Instruction queued for the next agent step.", "info");
      }
    });
  }

  // Preset chips click
  document.querySelectorAll(".era-preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const concept = chip.dataset.concept;
      if (promptInput && concept) {
        promptInput.value = concept;
        promptInput.focus();
      }
    });
  });

  // Switch between Polygyny and Monogamy previews
  if (btnPoly && btnMono) {
    btnPoly.addEventListener("click", () => {
      activePreviewVariant = "polygyny";
      btnPoly.classList.add("active");
      btnMono.classList.remove("active");
      renderActiveEraCard();
    });

    btnMono.addEventListener("click", () => {
      activePreviewVariant = "monogamy";
      btnMono.classList.add("active");
      btnPoly.classList.remove("active");
      renderActiveEraCard();
    });
  }

  // Refresh extensions list
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadInstalledExtensions();
    });
  }

  // Copy JSON
  if (btnCopyJson) {
    btnCopyJson.addEventListener("click", () => {
      if (!activeEraPair) return;
      const json = JSON.stringify(activeEraPair, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        showIpcToast("Copied era pair JSON to clipboard!", "success");
      });
    });
  }

  // Save to extension file
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      if (!activeEraPair) return;
      const fn = filenameInput?.value?.trim() || "custom_eras.json";
      const destSelect = document.getElementById("era-save-destination");
      const destination = destSelect?.value || "project_data";
      try {
        btnSave.disabled = true;
        btnSave.textContent = "Saving...";
        const res = await fetch("/api/eras/extensions/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fn,
            destination,
            content: {
              [activeEraPair.polygyny.id]: activeEraPair.polygyny,
              [activeEraPair.monogamy.id]: activeEraPair.monogamy,
            },
          }),
        });

        if (!res.ok) throw new Error("Failed to save extension");
        const data = await res.json();
        const targetLabel = destination === "local_user" ? "user data folder (~/.local or AppData)" : `data/eras_extensions/${fn}`;
        showIpcToast(`Saved era pair to ${targetLabel}!`, "success");
        await loadInstalledExtensions();
        await loadEraCatalogStats();
      } catch (err) {
        showIpcToast(`Error saving: ${err.message}`, "error");
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "💾 Save to Extensions Folder";
      }
    });
  }

  // Test Spark Character in Era
  if (btnTest) {
    btnTest.addEventListener("click", () => {
      if (!activeEraPair) return;
      const era = activePreviewVariant === "monogamy" ? activeEraPair.monogamy : activeEraPair.polygyny;
      // Switch to Spark tab
      const sparkTab = document.querySelector('.nav-tab[data-tab="tab-generate"]');
      if (sparkTab) sparkTab.click();

      // Pre-fill concept and set era
      const conceptInput = document.getElementById("char-concept");
      if (conceptInput) {
        const archetype = era.titles?.[0] || "Beloved Bride";
        conceptInput.value = `${archetype} living in seclusion with {{user}} in ${era.name}`;
      }

      // Set era in state
      state.selectedEra = era;
      if (el.selectedEraPill) {
        el.selectedEraPill.classList.remove("hidden");
        if (el.selectedEraPillName) el.selectedEraPillName.textContent = era.short_name || era.name;
      }

      showIpcToast(`Selected era "${era.short_name || era.name}" for character spark!`, "info");
    });
  }

  // Generate Era Pair via Agent
  if (btnGenerate) {
    btnGenerate.addEventListener("click", async () => {
      if (activeAgentRunId) {
        agentCancelRequested = true;
        await fetch("/api/eras/agent/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: activeAgentRunId }),
        }).catch(() => {});
        btnGenerate.innerHTML = `<span>⏳ Cancelling...</span>`;
        return;
      }
      const prompt = promptInput?.value?.trim();
      if (!prompt) {
        showIpcToast("Please describe the era setting you want to forge.", "warning");
        return;
      }

      const filename = filenameInput?.value?.trim() || "my_fantasy_eras.json";

      try {
        activeAgentRunId = crypto.randomUUID();
        agentCancelRequested = false;
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<span>🛑 Cancel Agent</span>`;
        if (feedEl) feedEl.classList.remove("hidden");
        if (msgBodyEl) msgBodyEl.textContent = "Agent is inspecting worldbuilding rules and crafting paired eras...";
        if (toolContainerEl) toolContainerEl.innerHTML = `<span style="color:var(--accent-cyan); font-size:10px;">🔧 Running 5-Pillars Era Architect...</span>`;

        const dualPairChk = document.getElementById("chk-era-dual-pair");
        const dualPair = dualPairChk ? dualPairChk.checked : true;

        const res = await fetch("/api/eras/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPrompt: prompt,
            provider: state.provider,
            currentEraPair: activeEraPair,
            activeFilename: filename,
            runId: activeAgentRunId,
            dualPair,
          }),
        });

        if (!res.ok) throw new Error(`Agent request failed: ${res.statusText}`);
        const data = await res.json();

        // Update Agent Feed
        if (msgBodyEl) msgBodyEl.textContent = data.agentMessage || "Era pair synthesized successfully.";
        if (toolContainerEl) {
          const tools = data.toolCallsExecuted || [];
          toolContainerEl.innerHTML = tools.map(t => `
            <span style="background: rgba(99, 102, 241, 0.25); color: #a5b4fc; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">
              ⚡ ${escapeHtml(t.tool)}: ${escapeHtml(t.resultSummary)}
            </span>
          `).join("");
        }

        if (!agentCancelRequested && data.eraPair) {
          activeEraPair = data.eraPair;
          activeEraCompliance = data.complianceReports;
          if (previewSection) previewSection.classList.remove("hidden");
          renderActiveEraCard();
          showIpcToast(`Successfully forged "${data.eraPair.polygyny.name}"!`, "success");
        } else if (!agentCancelRequested) {
          showIpcToast("Agent provided worldbuilding guidance. See response feed.", "info");
        }

        if (data.savedFile) {
          showIpcToast(`Directly saved ${data.savedFile.count} eras to ${data.savedFile.filename}!`, "success");
          await loadInstalledExtensions();
          await loadEraCatalogStats();
        }
      } catch (err) {
        if (!agentCancelRequested) showIpcToast(`Era forge failed: ${err.message}`, "error");
        if (msgBodyEl) msgBodyEl.textContent = `Error: ${err.message}`;
      } finally {
        activeAgentRunId = null;
        agentCancelRequested = false;
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `<span>⚡ Forge Era Pair</span>`;
      }
    });
  }
}


