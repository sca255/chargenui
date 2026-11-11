// Autosave Draft Engine & Local Recovery
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { showIpcToast } from "./ipc.js";

// --- Autosave Engine & Creator Notes Rich Preview ---
let autosaveDebounceTimer = null;
let lastAutosavedHash = "";

export function computeCharacterHash(char) {
  if (!char) return "";
  return JSON.stringify({
    name: char.name,
    desc: char.description,
    pers: char.personality,
    scen: char.scenario,
    first: char.first_mes,
    mes: char.mes_example,
    post: char.post_history_instructions,
    notes: char.creator_notes,
    alts: char.alternate_greetings,
    tags: char.tags,
  });
}

export function scheduleCardAutosave() {
  if (autosaveDebounceTimer) clearTimeout(autosaveDebounceTimer);
  autosaveDebounceTimer = setTimeout(async () => {
    try {
      if (!state.character || !state.character.name) return;
      const currentHash = computeCharacterHash(state.character);
      if (currentHash === lastAutosavedHash) return;

      const res = await fetch("/api/cards/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: state.character,
          avatarBase64: state.avatarBase64 || undefined,
        }),
      });
      if (res.ok) {
        lastAutosavedHash = currentHash;
        checkAutosaveAvailability();
      }
    } catch (e) {
      console.warn("Autosave draft failed:", e);
    }
  }, 1000);
}

export async function checkAutosaveAvailability() {
  try {
    const res = await fetch("/api/cards/autosave");
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.draft && data.draft.character) {
      const draftChar = data.draft.character;
      const currentHash = computeCharacterHash(state.character);
      const draftHash = computeCharacterHash(draftChar);
      if (draftHash !== currentHash && el.btnRestoreAutosave) {
        el.btnRestoreAutosave.style.display = "inline-flex";
        el.btnRestoreAutosave.title = `Recover autosaved draft for "${draftChar.name || "Unnamed"}"`;
        el.btnRestoreAutosave.onclick = () => {
          if (confirm(`Restore autosaved card draft for "${draftChar.name || "Unnamed"}"? Current unsaved edits will be replaced.`)) {
            state.character = JSON.parse(JSON.stringify(draftChar));
            if (data.draft.avatarBase64) {
              state.avatarBase64 = data.draft.avatarBase64;
              if (el.charAvatar) el.charAvatar.src = state.avatarBase64;
            }
            syncStateToUI();
            showIpcToast(`Restored autosave draft for ${draftChar.name || "character"}!`, "success");
            el.btnRestoreAutosave.style.display = "none";
          }
        };
        return;
      }
    }
    if (el.btnRestoreAutosave) {
      el.btnRestoreAutosave.style.display = "none";
    }
  } catch (e) {
    console.warn("Check autosave failed:", e);
  }
}

// Bind Creator Notes Rich Preview Modal
if (el.btnPreviewCreatorNotes && el.modalCreatorNotes) {
  el.btnPreviewCreatorNotes.addEventListener("click", () => {
    const rawNotes = (el.fieldCreatorNotes && el.fieldCreatorNotes.value) || (state.character && state.character.creator_notes) || "";
    if (el.creatorNotesPreviewContainer) {
      if (!rawNotes.trim()) {
        el.creatorNotesPreviewContainer.innerHTML = `<div style="color:var(--text-dim); font-style:italic;">Creator notes are empty. Type author notes, concept overview, or HTML tags in the editor to preview them here.</div>`;
      } else {
        // Safe innerHTML rendering container for creator notes
        el.creatorNotesPreviewContainer.innerHTML = rawNotes;
      }
    }
    el.modalCreatorNotes.classList.remove("hidden");
  });

  const closeCreatorNotes = () => el.modalCreatorNotes.classList.add("hidden");
  if (el.btnCloseCreatorNotesModal) el.btnCloseCreatorNotesModal.addEventListener("click", closeCreatorNotes);
  if (el.btnCloseCreatorNotesModal2) el.btnCloseCreatorNotesModal2.addEventListener("click", closeCreatorNotes);
}


