import { state } from "./state.js";
import { el } from "./dom.js";
import { estimateTokens } from "../utils/macros.js";
import { runLocalAudit } from "../features/audit.js";
import { scheduleCardAutosave } from "../features/autosave.js";

export function updateTokenMetrics() {
  if (!el.tokenTotalNum) return;
  const dTokens = estimateTokens(el.fieldDesc?.value || "");
  const pTokens = estimateTokens(el.fieldPers?.value || "");
  const sTokens = estimateTokens(el.fieldScenario?.value || "");
  const fTokens = estimateTokens(el.fieldFirstMes?.value || "");
  const eTokens = estimateTokens(el.fieldMesExample?.value || "");
  const sysTokens = estimateTokens(el.fieldSystemPrompt?.value || "") + estimateTokens(el.fieldPostHistory?.value || "");

  const total = dTokens + pTokens + sTokens + fTokens + eTokens + sysTokens;

  el.tokenTotalNum.textContent = total.toLocaleString();
  if (el.tbDesc) el.tbDesc.textContent = dTokens.toLocaleString();
  if (el.tbPers) el.tbPers.textContent = pTokens.toLocaleString();
  if (el.tbScenario) el.tbScenario.textContent = sTokens.toLocaleString();
  if (el.tbFirst) el.tbFirst.textContent = fTokens.toLocaleString();
  if (el.tbExamples) el.tbExamples.textContent = eTokens.toLocaleString();
  if (el.tbSystem) el.tbSystem.textContent = sysTokens.toLocaleString();

  if (el.tokenBadgeDesc) el.tokenBadgeDesc.textContent = `${dTokens} tokens`;
  if (el.tokenBadgePers) el.tokenBadgePers.textContent = `${pTokens} tokens`;
  if (el.tokenBadgeScenario) el.tokenBadgeScenario.textContent = `${sTokens} tokens`;
  if (el.tokenBadgeFirst) el.tokenBadgeFirst.textContent = `${fTokens} tokens`;
  if (el.tokenBadgeExamples) el.tokenBadgeExamples.textContent = `${eTokens} tokens`;
}

export function syncStateToUI() {
  const c = state.character;
  if (!c) return;

  if (!Array.isArray(c.alternate_greetings)) {
    if (typeof c.alternate_greetings === "string" && c.alternate_greetings.trim()) {
      c.alternate_greetings = [c.alternate_greetings.trim()];
    } else {
      c.alternate_greetings = [];
    }
  }

  if (el.reimagineCardName) el.reimagineCardName.textContent = c.name || "No card";

  if (c.system_prompt) {
    if (!c.post_history_instructions) {
      c.post_history_instructions = c.system_prompt;
    }
    c.system_prompt = "";
  }

  if (el.charName) el.charName.value = c.name || "";
  if (el.enhanceSearchQuery && (!el.enhanceSearchQuery.value || el.enhanceSearchQuery.dataset.autoSync === "true")) {
    if (c.name) {
      el.enhanceSearchQuery.value = c.name;
      el.enhanceSearchQuery.dataset.autoSync = "true";
    }
  }
  if (el.charTags) el.charTags.value = Array.isArray(c.tags) ? c.tags.join(", ") : "";

  if (c.avatar) {
    if (el.avatarImg) {
      el.avatarImg.src = c.avatar;
      el.avatarImg.style.display = "block";
    }
    if (el.avatarPlaceholder) el.avatarPlaceholder.style.display = "none";
    if (el.btnRemoveAvatar) el.btnRemoveAvatar.classList.remove("hidden");
  } else {
    if (el.avatarImg) {
      el.avatarImg.src = "";
      el.avatarImg.style.display = "none";
    }
    if (el.avatarPlaceholder) el.avatarPlaceholder.style.display = "block";
    if (el.btnRemoveAvatar) el.btnRemoveAvatar.classList.add("hidden");
  }

  if (el.fieldDesc) el.fieldDesc.value = c.description || "";
  if (el.fieldPers) el.fieldPers.value = c.personality || "";
  if (el.fieldScenario) el.fieldScenario.value = c.scenario || "";
  if (el.fieldFirstMes) el.fieldFirstMes.value = c.first_mes || "";
  if (el.fieldMesExample) el.fieldMesExample.value = c.mes_example || "";
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  if (el.fieldPostHistory) el.fieldPostHistory.value = c.post_history_instructions || "";
  if (el.fieldCreatorNotes) el.fieldCreatorNotes.value = c.creator_notes || "";

  if (typeof window.renderAltGreetings === "function") window.renderAltGreetings();
  if (typeof window.renderLorebook === "function") window.renderLorebook();
  if (typeof window.renderGallery === "function") window.renderGallery();
  updateTokenMetrics();
  runLocalAudit();
  if (typeof window.updateAgentStudioSidebar === "function") window.updateAgentStudioSidebar();

  const hasSpine = !!(c.extensions && c.extensions["chargenui:authoringSpine"]);
  if (el.btnRunGreetingsSpine) {
    el.btnRunGreetingsSpine.disabled = !hasSpine;
    el.btnRunGreetingsSpine.style.opacity = hasSpine ? "1" : "0.5";
    el.btnRunGreetingsSpine.style.cursor = hasSpine ? "pointer" : "not-allowed";
    el.btnRunGreetingsSpine.title = hasSpine
      ? "Regenerate alternate greetings using stored spine and story arc"
      : "Requires stored Authoring Spine (create via Spark/Weaver or use Spine Synthesis modal)";
  }
}

export function syncUIToState() {
  const c = state.character;
  if (!c) return;
  if (el.charName) c.name = el.charName.value.trim();
  if (el.charTags) c.tags = el.charTags.value.split(",").map(t => t.trim()).filter(Boolean);

  if (el.fieldDesc) c.description = el.fieldDesc.value;
  if (el.fieldPers) c.personality = el.fieldPers.value;
  if (el.fieldScenario) c.scenario = el.fieldScenario.value;
  if (el.fieldFirstMes) c.first_mes = el.fieldFirstMes.value;
  if (el.fieldMesExample) c.mes_example = el.fieldMesExample.value;

  c.system_prompt = "";
  if (el.fieldPostHistory) c.post_history_instructions = el.fieldPostHistory.value;
  if (el.fieldCreatorNotes) c.creator_notes = el.fieldCreatorNotes.value;

  updateTokenMetrics();
  runLocalAudit();
  scheduleCardAutosave();
}
