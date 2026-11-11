// Households & Multi-Character Encounters
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiGet, apiPost, apiDelete } from "../core/api.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast } from "./ipc.js";
import { fetchLibrary } from "./library.js";
import { assertProviderConfigured } from "../utils/provider.js";

// ==========================================
// Custom Household & Court Binder Engine
// ==========================================

let activeHousehold = null;
let savedHouseholdsList = [];

export async function fetchHouseholds() {
  try {
    const res = await apiGet("/api/households");
    savedHouseholdsList = res.households || [];
    if (el.householdsCountBadge) {
      el.householdsCountBadge.textContent = savedHouseholdsList.length;
    }
    renderHouseholdList();
  } catch (err) {
    console.warn("Failed fetching households:", err);
  }
}

export function renderHouseholdList() {
  if (!el.householdListContainer) return;
  if (!savedHouseholdsList.length) {
    el.householdListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 24px 8px; font-size: 11px;">
        No binders created yet.<br>Click "➕ New Binder" above!
      </div>
    `;
    return;
  }

  el.householdListContainer.innerHTML = savedHouseholdsList.map(h => {
    const isSelected = activeHousehold && activeHousehold.id === h.id;
    return `
      <div class="hh-sidebar-item ${isSelected ? 'active' : ''}" data-id="${escapeHtml(h.id)}"
           style="padding: 8px 10px; border-radius: 6px; cursor: pointer; border: 1px solid ${isSelected ? '#ec4899' : 'var(--border-color)'}; background: ${isSelected ? 'rgba(236,72,153,0.12)' : 'var(--bg-primary)'}; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 11px; color: ${isSelected ? '#f472b6' : 'var(--text-main)'};">${escapeHtml(h.name)}</strong>
          <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(236,72,153,0.2); color: #f472b6;">${h.memberCount} members</span>
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
          🏷️ ${escapeHtml(h.category_label || 'Household')}
        </div>
      </div>
    `;
  }).join("");

  el.householdListContainer.querySelectorAll(".hh-sidebar-item").forEach(item => {
    item.addEventListener("click", () => selectHousehold(item.dataset.id));
  });
}

export async function selectHousehold(id) {
  try {
    const res = await apiGet(`/api/households/${id}`);
    if (res.household) {
      activeHousehold = res.household;
      renderHouseholdDetails();
      renderHouseholdList();
    }
  } catch (err) {
    alert("Failed loading household: " + err.message);
  }
}

export function renderHouseholdDetails() {
  if (!activeHousehold) {
    el.householdEmptyState?.classList.remove("hidden");
    el.householdEditorView?.classList.add("hidden");
    return;
  }
  el.householdEmptyState?.classList.add("hidden");
  el.householdEditorView?.classList.remove("hidden");

  // Populate inputs
  if (el.hhInputName) el.hhInputName.value = activeHousehold.name || "";
  if (el.hhInputCategory) el.hhInputCategory.value = activeHousehold.category_label || "";
  if (el.hhInputUserTitle) el.hhInputUserTitle.value = activeHousehold.user_title || "";
  if (el.hhInputLore) el.hhInputLore.value = activeHousehold.shared_lore || "";
  if (el.hhInputRules) el.hhInputRules.value = (activeHousehold.rules_and_etiquette || []).join("\n");
  if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members?.length || 0} members)`;

  // Populate Add Member select from library cards
  if (el.hhAddCardSelect) {
    el.hhAddCardSelect.innerHTML = `<option value="">-- Add Character from Library --</option>` +
      state.savedCards.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  }

  // Render members roster
  renderMembersTable();
}

export function renderMembersTable() {
  if (!el.hhMembersTableContainer || !activeHousehold) return;
  const members = activeHousehold.members || [];
  if (members.length === 0) {
    el.hhMembersTableContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 16px; font-size: 11px;">
        No characters assigned to this household yet. Select a character from your library above!
      </div>
    `;
    return;
  }

  el.hhMembersTableContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${members.map((m, idx) => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">👤</span>
              <strong style="font-size: 11px; color: var(--accent-cyan);">${escapeHtml(m.card_name)}</strong>
              <span style="font-size: 9px; color: var(--text-muted);">(ID: ${escapeHtml(m.card_id)})</span>
            </div>
            <button class="btn btn-xs btn-remove-member" data-index="${idx}" style="color: #f87171; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1);">✕ Remove</button>
          </div>
          <div style="display: flex; gap: 6px;">
            <div style="flex: 1.5;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Standing / Hierarchy</label>
              <input type="text" class="form-input member-standing" data-index="${idx}" value="${escapeHtml(m.standing || '')}" placeholder="e.g. Senior Wife, Defiant Ward, Master Alchemist" style="font-size: 10px; padding: 2px 6px;">
            </div>
            <div style="flex: 2;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Role & Status</label>
              <input type="text" class="form-input member-role" data-index="${idx}" value="${escapeHtml(m.household_role || '')}" placeholder="e.g. Household Logistics, Guard, Companion" style="font-size: 10px; padding: 2px 6px;">
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <div style="flex: 1;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Attitude to {{user}}</label>
              <input type="text" class="form-input member-att-user" data-index="${idx}" value="${escapeHtml(m.attitude_to_user || '')}" placeholder="e.g. Tsundere pride melting over his knee, fiercely obedient" style="font-size: 10px; padding: 2px 6px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 9px; color: var(--text-muted); display: block; margin-bottom: 2px;">Attitude to Co-Members</label>
              <input type="text" class="form-input member-att-peers" data-index="${idx}" value="${escapeHtml(m.attitude_to_peers || '')}" placeholder="e.g. Competitive with younger consorts, protective" style="font-size: 10px; padding: 2px 6px;">
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  // Attach input listeners to update activeHousehold memory
  el.hhMembersTableContainer.querySelectorAll(".member-standing").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].standing = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-role").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].household_role = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-att-user").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].attitude_to_user = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".member-att-peers").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (activeHousehold.members[idx]) activeHousehold.members[idx].attitude_to_peers = e.target.value;
    });
  });
  el.hhMembersTableContainer.querySelectorAll(".btn-remove-member").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      activeHousehold.members.splice(idx, 1);
      renderMembersTable();
      if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members.length} members)`;
    });
  });
}

// Household Event Listeners
el.btnOpenHouseholds?.addEventListener("click", () => {
  el.modalHouseholds?.classList.remove("hidden");
  fetchHouseholds();
  fetchLibrary();
});
el.btnCloseHouseholds?.addEventListener("click", () => el.modalHouseholds?.classList.add("hidden"));
el.btnCloseHouseholdsFooter?.addEventListener("click", () => el.modalHouseholds?.classList.add("hidden"));

el.btnCreateHousehold?.addEventListener("click", () => {
  const name = prompt("Enter a name for the new Household / Court Binder:", "Solar Sovereign Household");
  if (!name || !name.trim()) return;
  activeHousehold = {
    id: "",
    name: name.trim(),
    category_label: "Imperial Court / Household",
    user_title: "Master / Sovereign",
    description: "",
    shared_lore: "",
    rules_and_etiquette: [],
    members: [],
  };
  renderHouseholdDetails();
  saveCurrentHouseholdMeta();
});

export async function saveCurrentHouseholdMeta() {
  if (!activeHousehold) return;
  activeHousehold.name = el.hhInputName?.value?.trim() || activeHousehold.name || "Untitled Household";
  activeHousehold.category_label = el.hhInputCategory?.value?.trim() || "Household / Court";
  activeHousehold.user_title = el.hhInputUserTitle?.value?.trim() || "{{user}}";
  activeHousehold.shared_lore = el.hhInputLore?.value?.trim() || "";
  activeHousehold.rules_and_etiquette = (el.hhInputRules?.value || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  try {
    const res = await apiPost("/api/households", activeHousehold);
    if (res.household) {
      activeHousehold = res.household;
      await fetchHouseholds();
      renderHouseholdDetails();
      showIpcToast(`Saved household "${activeHousehold.name}"`, "success");
    }
  } catch (err) {
    alert("Failed saving household: " + err.message);
  }
}

el.btnSaveHouseholdMeta?.addEventListener("click", saveCurrentHouseholdMeta);

el.btnDeleteHousehold?.addEventListener("click", async () => {
  if (!activeHousehold || !activeHousehold.id) return;
  if (!confirm(`Delete binder "${activeHousehold.name}"? (Individual character cards will NOT be deleted).`)) return;
  try {
    await apiDelete(`/api/households/${activeHousehold.id}`);
    activeHousehold = null;
    await fetchHouseholds();
    renderHouseholdDetails();
    showIpcToast("Household binder deleted", "info");
  } catch (err) {
    alert("Failed deleting household: " + err.message);
  }
});

el.btnHhAddMember?.addEventListener("click", () => {
  if (!activeHousehold) return;
  const cardId = el.hhAddCardSelect?.value;
  if (!cardId) {
    alert("Please select a character card from the dropdown!");
    return;
  }
  const card = state.savedCards.find(c => c.id === cardId);
  if (!card) return;

  if (activeHousehold.members.some(m => m.card_id === cardId)) {
    alert(`${card.name} is already in this household!`);
    return;
  }

  activeHousehold.members.push({
    card_id: card.id,
    card_name: card.name,
    household_role: "Companion",
    standing: "Standard Member",
    attitude_to_user: "Devoted and responsive to {{user}}'s presence",
    attitude_to_peers: "Courteous dynamic with co-members"
  });

  renderMembersTable();
  if (el.hhRosterCount) el.hhRosterCount.textContent = `(${activeHousehold.members.length} members)`;
  el.hhAddCardSelect.value = "";
  saveCurrentHouseholdMeta();
});

// Group Encounter Generator
el.btnHhGenEncounter?.addEventListener("click", async () => {
  if (!activeHousehold || !activeHousehold.members?.length) {
    alert("Please add at least 1-2 character companions to this household first!");
    return;
  }
  const btn = el.btnHhGenEncounter;
  btn.disabled = true;
  btn.textContent = "⏳ Synthesizing Scene...";

  try {
    const goal = el.hhEncounterGoal?.value?.trim() || "";
    const saveAlt = Boolean(el.hhEncounterSaveAlt?.checked);

    const res = await apiPost(`/api/households/${activeHousehold.id}/encounter`, {
      householdId: activeHousehold.id,
      scenarioGoal: goal,
      saveToAlternateGreetings: saveAlt,
      provider: state.provider
    });

    if (res.encounter) {
      el.hhEncounterOutputBox?.classList.remove("hidden");
      if (el.hhEncounterTitle) el.hhEncounterTitle.textContent = `✨ ${res.encounter.title}`;
      if (el.hhEncounterScenario) el.hhEncounterScenario.textContent = res.encounter.scenario;
      if (el.hhEncounterText) el.hhEncounterText.textContent = res.encounter.first_mes;

      if (saveAlt && res.encounter.savedToCards?.length) {
        showIpcToast(`Group encounter attached to ${res.encounter.savedToCards.length} companion cards as alternate greetings!`, "success");
        await fetchLibrary();
  await fetchHouseholds();
      }
    }
  } catch (err) {
    alert("Failed generating group encounter: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Synthesize Group Scene";
  }
});

el.btnHhCopyEncounter?.addEventListener("click", () => {
  const text = el.hhEncounterText?.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text);
  el.btnHhCopyEncounter.textContent = "✓ Copied!";
  setTimeout(() => el.btnHhCopyEncounter.textContent = "📋 Copy Text", 1500);
});



