// Navigation Tabs, Editor Inputs, Lorebook & General UI Event Handlers
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiGet, apiPost, apiDelete } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { normalizeRpMacros, interpolateRpMacros } from "../utils/macros.js";
import { renderAltGreetings } from "./alt-greetings.js";
import { renderAgentChatStream } from "./agent.js";
import { loadInstalledExtensions } from "./eras.js";
import { handleQueueGreetingImage } from "./image-prompts.js";

// Render Lorebook Entries
export function renderLorebook() {
  el.lorebookList.innerHTML = "";
  if (state.character.character_book && Array.isArray(state.character.character_book.entries)) {
    state.character.character_book.entries = state.character.character_book.entries.filter(e => {
      const c = (e.comment || '').toLowerCase();
      const txt = (e.content || '').toLowerCase();
      return !c.includes('weaver psychological blueprint') &&
             !c.includes('calibrated reaction gradient') &&
             !c.includes('weaver formative backstory') &&
             !c.includes('weaver vocal idiolect') &&
             !c.includes('backstory & crucible') &&
             !c.includes('psychological contradiction') &&
             !c.includes('behavioral dynamics') &&
             !txt.includes('[character bible:');
    });
  }
  const book = state.character.character_book;
  const entries = book?.entries || [];

  if (entries.length === 0) {
    el.lorebookList.innerHTML = `<div style="color:var(--text-dim); font-size:12px; font-style:italic;">No lorebook entries yet. Use the Enhancer's "World Info & Lorebook Generator" to auto-build entries from character gear, factions, and backstory.</div>`;
    return;
  }

  entries.forEach((ent, idx) => {
    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:700; font-size:12px; color:var(--accent-purple);">Lore: ${ent.comment || `Entry #${idx + 1}`}</span>
        <button class="btn btn-sm btn-danger btn-del-lore" data-idx="${idx}">🗑️</button>
      </div>
      <div style="margin-bottom:6px;">
        <label class="form-label" style="font-size:10px;">Activation Keys (comma-separated):</label>
        <input type="text" class="form-input lore-keys-input" data-idx="${idx}" value="${(ent.keys || []).join(', ')}" style="font-size:12px;">
      </div>
      <div>
        <label class="form-label" style="font-size:10px;">Lore Content:</label>
        <textarea class="form-textarea lore-content-input" data-idx="${idx}" style="min-height:70px; font-size:12px;">${ent.content || ''}</textarea>
      </div>
    `;
    el.lorebookList.appendChild(card);
  });

  el.lorebookList.querySelectorAll(".lore-keys-input").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries[idx].keys = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
    });
  });

  el.lorebookList.querySelectorAll(".lore-content-input").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries[idx].content = e.target.value;
    });
  });

  el.lorebookList.querySelectorAll(".btn-del-lore").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      entries.splice(idx, 1);
      renderLorebook();
    });
  });
}



// Navigation Tabs Handlers
const modeBtns = document.querySelectorAll(".workspace-mode-btn");
const subtabGroups = {
  create: document.getElementById("subtabs-create"),
  refine: document.getElementById("subtabs-refine"),
  lore: document.getElementById("subtabs-lore")
};

modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const cat = btn.dataset.category;
    if (!cat) return;
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    Object.entries(subtabGroups).forEach(([key, groupEl]) => {
      if (groupEl) groupEl.classList.toggle("hidden", key !== cat);
    });

    const activeGroup = subtabGroups[cat];
    if (activeGroup) {
      const firstTab = activeGroup.querySelector(".nav-tab");
      if (firstTab) firstTab.click();
    }
  });
});

el.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    if (!target) return; // Guard: Ignore tabs without data-tab
    const targetEl = document.getElementById(target);
    if (!targetEl) return; // Guard: Don't hide tabs if target element does not exist

    // Ensure parent category group is visible if tab was clicked programmatically
    const parentGroup = tab.closest(".subtab-group");
    if (parentGroup && parentGroup.id) {
      const cat = parentGroup.id.replace("subtabs-", "");
      modeBtns.forEach(b => b.classList.toggle("active", b.dataset.category === cat));
      Object.entries(subtabGroups).forEach(([key, groupEl]) => {
        if (groupEl) groupEl.classList.toggle("hidden", key !== cat);
      });
    }

    el.tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    el.tabContents.forEach(tc => tc.classList.add("hidden"));
    targetEl.classList.remove("hidden");

    if (target === "tab-agent") {
      renderAgentChatStream();
      if (el.agentChatInput) el.agentChatInput.focus();
    }
    if (target === "tab-eras") {
      loadInstalledExtensions();
    }
  });
});

el.edTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    el.edTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.edtab;
    el.edTabContents.forEach(tc => tc.classList.add("hidden"));
    document.getElementById(target).classList.remove("hidden");
  });
});

// Bind Inputs
[el.charName, el.charTags, el.fieldDesc, el.fieldPers, el.fieldScenario, el.fieldFirstMes, el.fieldMesExample, el.fieldSystemPrompt, el.fieldPostHistory, el.fieldCreatorNotes].forEach(input => {
  input?.addEventListener("input", syncUIToState);
});

function normalizeDialogueQuotes(text) {
  if (!text) return "";
  let out = text;
  out = out.replace(/(\{\{[^}]+\}\})['’]s/g, "$1___CHAR_POSS___");
  out = out.replace(/([a-zA-Z0-9])['’]([a-zA-Z0-9])/g, "$1___INTRA_APOS___$2");
  out = out.replace(/(^|[\s—–(\[{*])['‘]([^"'\n]+?)['’](?=[\s—–,.;:!?)*\]}\n]|$)/gm, '$1"$2"');
  out = out.replace(/___INTRA_APOS___/g, "'");
  out = out.replace(/___CHAR_POSS___/g, "'s");
  return out;
}

// Fix & Normalize RP Macros and Dialogue Quotes
if (el.btnFixMacros) {
  el.btnFixMacros.addEventListener("click", () => {
    syncUIToState();
    const c = state.character;
    const name = c.name;

    c.description = normalizeRpMacros(c.description, name);
    c.personality = normalizeRpMacros(c.personality, name);
    c.scenario = normalizeRpMacros(c.scenario, name);
    c.first_mes = normalizeDialogueQuotes(normalizeRpMacros(c.first_mes, name));
    c.mes_example = normalizeDialogueQuotes(normalizeRpMacros(c.mes_example, name));
    c.system_prompt = normalizeRpMacros(c.system_prompt, name);
    c.post_history_instructions = normalizeRpMacros(c.post_history_instructions, name);

    if (Array.isArray(c.alternate_greetings)) {
      c.alternate_greetings = c.alternate_greetings.map(g => normalizeDialogueQuotes(normalizeRpMacros(g, name)));
    }

    syncStateToUI();
    recordSnapshot("Normalized macros and dialogue quotes");
    alert("🪄 All roleplay macros & dialogue quotes normalized! Converted single quotes in dialogue to standard double quotes for Lumiverse/SillyTavern syntax highlighting.");
  });
}

// Macro Live Preview Toggle
if (el.chkMacroPreview) {
  el.chkMacroPreview.addEventListener("change", () => {
    const isPreview = el.chkMacroPreview.checked;
    const userName = el.macroPreviewUser?.value.trim() || "Anon";
    const charName = state.character.name || "Character";

    if (isPreview) {
      syncUIToState();
      el.fieldDesc.value = interpolateRpMacros(state.character.description, userName, charName);
      el.fieldPers.value = interpolateRpMacros(state.character.personality, userName, charName);
      el.fieldScenario.value = interpolateRpMacros(state.character.scenario, userName, charName);
      el.fieldFirstMes.value = interpolateRpMacros(state.character.first_mes, userName, charName);
      el.fieldMesExample.value = interpolateRpMacros(state.character.mes_example, userName, charName);
    } else {
      syncStateToUI();
    }
  });

  if (el.macroPreviewUser) {
    el.macroPreviewUser.addEventListener("input", () => {
      if (el.chkMacroPreview.checked) {
        const userName = el.macroPreviewUser.value.trim() || "Anon";
        const charName = state.character.name || "Character";
        el.fieldDesc.value = interpolateRpMacros(state.character.description, userName, charName);
        el.fieldPers.value = interpolateRpMacros(state.character.personality, userName, charName);
        el.fieldScenario.value = interpolateRpMacros(state.character.scenario, userName, charName);
        el.fieldFirstMes.value = interpolateRpMacros(state.character.first_mes, userName, charName);
        el.fieldMesExample.value = interpolateRpMacros(state.character.mes_example, userName, charName);
      }
    });
  }
}

// Add Alt Greeting
el.btnAddAltGreeting?.addEventListener("click", () => {
  if (!state.character.alternate_greetings) state.character.alternate_greetings = [];
  state.character.alternate_greetings.push("Write your alternative opening scenario here...");
  renderAltGreetings();
});

// Queue Primary Opening Greeting Image & Chat Background
document.getElementById("btn-queue-first-greeting-img")?.addEventListener("click", async () => {
  const firstMes = el.fieldFirstMes?.value || state.character.first_mes || "";
  await handleQueueGreetingImage(firstMes, "First Message Greeting Scene", "greeting", 0);
});

document.getElementById("btn-queue-first-greeting-bg")?.addEventListener("click", async () => {
  const firstMes = el.fieldFirstMes?.value || state.character.first_mes || "";
  await handleQueueGreetingImage(firstMes, "First Message Chat Background", "greeting_bg", 0);
});

// Add Lorebook Entry
el.btnAddLorebookEntry?.addEventListener("click", () => {
  if (!state.character.character_book) {
    state.character.character_book = { name: "Character Lore", entries: [] };
  }
  state.character.character_book.entries.push({
    comment: "New Topic",
    keys: ["keyword1", "keyword2"],
    content: "Lore details that trigger when keywords are spoken...",
    position: "before_char",
    enabled: true
  });
  renderLorebook();
});

// Clear Lorebook Entries
el.btnClearLorebook?.addEventListener("click", () => {
  if (confirm("Clear all lorebook entries from this card?")) {
    state.character.character_book = { name: "", entries: [] };
    renderLorebook();
    updateTokenCount();
  }
});

// API Helpers






// Web Search Toggle & Preview
el.genWebSearch?.addEventListener("change", () => {
  el.boxSearchQuery?.classList.toggle("hidden", !el.genWebSearch.checked);
  if (el.genWebSearch?.checked && el.genSearchQuery && !el.genSearchQuery.value) {
    el.genSearchQuery.value = el.genConcept ? el.genConcept.value.trim() : "";
  }
});

el.btnPreviewSearch?.addEventListener("click", async () => {
  const q = el.genSearchQuery.value.trim() || el.genConcept.value.trim();
  if (!q) {
    alert("Enter a character name or lore query to search!");
    return;
  }
  el.btnPreviewSearch.disabled = true;
  el.btnPreviewSearch.textContent = "...";
  try {
    const res = await apiPost("/api/search-lore", {
      query: q,
      providerType: state.searchConfig?.provider || "duckduckgo",
      apiKey: state.searchConfig?.apiKey,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      provider: state.provider
    });
    el.searchLorePreview.classList.remove("hidden");
    let previewHtml = `<strong>Found ${res.results?.length || 0} research & fan lore sources:</strong><br><br>`;
    if (res.canonLore) {
      previewHtml += `<div style="margin-bottom:8px;"><strong style="color:var(--accent-cyan);">📚 Canon Lore & Wiki Background:</strong><br>${escapeHtml(res.canonLore.slice(0, 380))}...</div>`;
    }
    if (res.fanHeadcanons) {
      previewHtml += `<div><strong style="color:#f472b6;">✨ Fan Headcanons, Mindcanons & Tropes:</strong><br>${escapeHtml(res.fanHeadcanons.slice(0, 380))}...</div>`;
    }
    if (!res.canonLore && !res.fanHeadcanons) {
      previewHtml += "No detailed lore returned for this query.";
    }
    el.searchLorePreview.innerHTML = previewHtml;
  } catch (err) {
    alert("Search failed: " + err.message);
  } finally {
    el.btnPreviewSearch.disabled = false;
    el.btnPreviewSearch.textContent = "🔎 Fetch";
  }
});

