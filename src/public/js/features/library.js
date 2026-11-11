// Character Card Deck Library & Management
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiGet, apiPost, apiDelete } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast, notifyIpcActiveCard } from "./ipc.js";
import { fetchHouseholds } from "./households.js";

// ==========================================
// Card Library & Multi-Deck Management
// ==========================================

export function updateActiveCardBadge() {
  if (state.activeCardId) {
    const card = state.savedCards.find((c) => c.id === state.activeCardId);
    const cardName = card ? card.name : (state.character.name || state.activeCardId);
    if (el.activeCardPill) {
      el.activeCardPill.style.display = "flex";
      if (el.activeCardNameLabel) el.activeCardNameLabel.textContent = cardName;
    }
    if (el.btnSaveToLibrary) {
      el.btnSaveToLibrary.innerHTML = `💾 Update Card`;
      el.btnSaveToLibrary.title = `Update "${cardName}" in your Card Library`;
    }
    if (el.btnSaveAsNewCard) {
      el.btnSaveAsNewCard.style.display = "inline-block";
    }
  } else {
    if (el.activeCardPill) {
      el.activeCardPill.style.display = "none";
    }
    if (el.btnSaveToLibrary) {
      el.btnSaveToLibrary.innerHTML = `💾 Save Card`;
      el.btnSaveToLibrary.title = `Save this character into your local library`;
    }
    if (el.btnSaveAsNewCard) {
      el.btnSaveAsNewCard.style.display = "none";
    }
  }
}

export function unlinkActiveCard() {
  state.activeCardId = null;
  updateActiveCardBadge();
  renderLibraryGrid();
}

export async function fetchLibrary() {
  try {
    const res = await apiGet("/api/cards");
    state.savedCards = res.cards || [];
    if (el.libraryCountBadge) {
      el.libraryCountBadge.textContent = state.savedCards.length;
    }
    updateActiveCardBadge();
    renderLibraryGrid();
  } catch (err) {
    console.warn("Failed fetching library:", err);
  }
}

export function renderLibraryGrid() {
  if (!el.libraryCardsContainer) return;
  const filter = (el.librarySearchInput?.value || "").toLowerCase().trim();
  const filtered = state.savedCards.filter((card) => {
    if (!filter) return true;
    const nameMatch = (card.name || "").toLowerCase().includes(filter);
    const tagMatch = (card.tags || []).some((t) => t.toLowerCase().includes(filter));
    return nameMatch || tagMatch;
  });

  if (filtered.length === 0) {
    el.libraryCardsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">
        ${state.savedCards.length === 0 ? "No saved character cards in your deck yet. Click 'Save Active Card' to store your first card!" : "No cards match your filter query."}
      </div>
    `;
    return;
  }

  el.libraryCardsContainer.innerHTML = filtered.map((c) => {
    const isBs = c.score === 0;
    const scoreColor = isBs ? "#ef4444" : c.score >= 80 ? "#10b981" : "#f59e0b";
    const scoreText = isBs ? "BS / 100" : `${c.score} / 100`;
    const avatarHtml = c.avatarBase64
      ? `<img src="${c.avatarBase64}" alt="${escapeHtml(c.name)}">`
      : `<span style="font-size: 20px; color: var(--text-dim);">👤</span>`;
    const tagsText = (c.tags || []).join(", ") || "No tags";
    const isActive = state.activeCardId === c.id;

    return `
      <div class="deck-card" data-id="${c.id}" style="${isActive ? 'border-color: var(--accent-cyan); box-shadow: 0 0 10px rgba(6, 182, 212, 0.25);' : ''}">
        <div class="deck-card-top">
          <div class="deck-card-avatar">
            ${avatarHtml}
          </div>
          <div class="deck-card-info">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
              <div class="deck-card-title" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
              ${isActive ? `<span style="background: rgba(6, 182, 212, 0.2); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">ACTIVE</span>` : ''}
            </div>
            <div class="deck-card-meta">
              <span style="color: ${scoreColor}; font-weight: 700;">${scoreText}</span>
              <span>•</span>
              <span>${c.tokenCount} tokens</span>
            </div>
            <div class="deck-card-tags" title="${escapeHtml(tagsText)}">${escapeHtml(tagsText)}</div>
          </div>
        </div>
        <div class="deck-card-actions">
          <button class="btn btn-sm ${isActive ? 'btn-success' : 'btn-primary'} btn-load-card" data-id="${c.id}" style="flex: 1;" type="button">
            ${isActive ? '✓ Active (Reload)' : '📂 Load'}
          </button>
          <button class="btn btn-sm btn-dup-card" data-id="${c.id}" title="Duplicate as variant" type="button">
            📋 Dup
          </button>
          <button class="btn btn-sm btn-danger btn-del-card" data-id="${c.id}" title="Delete card" type="button">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join("");
}

export async function loadCardIntoWorkspace(id) {
  try {
    const record = await apiGet(`/api/cards/${id}`);
    if (!record || !record.character) throw new Error("Invalid card record");

    state.character = record.character;
    state.activeCardId = record.id;
    if (record.avatarBase64) {
      state.character.avatar = record.avatarBase64;
    }
    syncStateToUI();
    updateActiveCardBadge();
    notifyIpcActiveCard(state.character);
    recordSnapshot(`Loaded: ${record.character.name}`);
    el.modalCardLibrary?.classList.add("hidden");
  } catch (err) {
    alert("Failed loading card: " + err.message);
  }
}

export async function saveActiveCardToLibrary(forceNew = false) {
  syncUIToState();
  if (!state.character.name?.trim()) {
    alert("Please give the character a name before saving!");
    return;
  }
  try {
    const targetId = forceNew ? undefined : (state.activeCardId || undefined);
    const meta = await apiPost("/api/cards", {
      character: state.character,
      avatarBase64: state.character.avatar,
      id: targetId,
    });
    state.activeCardId = meta.id;
    // Update local card list directly without re-reading the entire card deck from disk
    const existingIdx = state.savedCards.findIndex((c) => c.id === meta.id);
    if (existingIdx !== -1) {
      state.savedCards[existingIdx] = meta;
    } else {
      state.savedCards.unshift(meta);
    }
    if (el.libraryCountBadge) {
      el.libraryCountBadge.textContent = state.savedCards.length;
    }
    renderLibraryGrid();
    updateActiveCardBadge();
    notifyIpcActiveCard(state.character);
    recordSnapshot(`${forceNew ? "Saved as New" : "Saved to Library"}: ${meta.name}`);
    alert(`💾 Successfully ${forceNew ? "saved new card" : "updated"} "${meta.name}" in your Card Library!`);
  } catch (err) {
    alert("Failed saving card: " + err.message);
  }
}

export async function duplicateCardInLibrary(id) {
  try {
    await apiPost(`/api/cards/${id}/duplicate`, { suffix: "(Variant / AU)" });
    await fetchLibrary();
  await fetchHouseholds();
  } catch (err) {
    alert("Failed duplicating card: " + err.message);
  }
}

export async function deleteCardInLibrary(id) {
  if (!confirm("Are you sure you want to delete this saved card?")) return;
  try {
    await apiDelete(`/api/cards/${id}`);
    if (state.activeCardId === id) {
      state.activeCardId = null;
      updateActiveCardBadge();
    }
    await fetchLibrary();
  await fetchHouseholds();
  } catch (err) {
    alert("Failed deleting card: " + err.message);
  }
}

export function createNewBlankCard() {
  if (!confirm("Start a new blank character card? Make sure your current card is saved to library!")) return;
  state.character = {
    id: "char_" + Math.random().toString(36).substring(2, 10),
    name: "",
    avatar: null,
    tags: [],
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    alternate_greetings: [],
    system_prompt: "",
    post_history_instructions: "",
    creator_notes: "",
    character_book: { name: "", entries: [] },
  };
  state.activeCardId = null;
  updateActiveCardBadge();
  syncStateToUI();
  recordSnapshot("New Blank Card");
  el.modalCardLibrary?.classList.add("hidden");
}

// Library Event Listeners
el.btnOpenLibrary?.addEventListener("click", () => {
  el.modalCardLibrary?.classList.remove("hidden");
  fetchLibrary();
});
el.btnCloseLibrary?.addEventListener("click", () => el.modalCardLibrary?.classList.add("hidden"));
el.btnCloseLibraryFooter?.addEventListener("click", () => el.modalCardLibrary?.classList.add("hidden"));
el.librarySearchInput?.addEventListener("input", renderLibraryGrid);
el.btnLibSaveCurrent?.addEventListener("click", () => saveActiveCardToLibrary(false));
el.btnSaveToLibrary?.addEventListener("click", () => saveActiveCardToLibrary(false));
el.btnSaveAsNewCard?.addEventListener("click", () => saveActiveCardToLibrary(true));
el.btnUnlinkCard?.addEventListener("click", unlinkActiveCard);
el.btnLibNewBlank?.addEventListener("click", createNewBlankCard);
el.btnNewCard?.addEventListener("click", createNewBlankCard);

el.libraryCardsContainer?.addEventListener("click", (e) => {
  const loadBtn = e.target.closest(".btn-load-card");
  if (loadBtn) {
    loadCardIntoWorkspace(loadBtn.dataset.id);
    return;
  }
  const dupBtn = e.target.closest(".btn-dup-card");
  if (dupBtn) {
    duplicateCardInLibrary(dupBtn.dataset.id);
    return;
  }
  const delBtn = e.target.closest(".btn-del-card");
  if (delBtn) {
    deleteCardInLibrary(delBtn.dataset.id);
    return;
  }
});


