// System Prompt Incorporator & App Settings Modal
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot } from "../utils/diff.js";
import { assertProviderConfigured, updateProviderBadge } from "../utils/provider.js";
import { loadPromptProfilesUI } from "../features/prompt-profiles.js";

// --- AI Directive & System Prompt Incorporator ---

export function showIncorporateStatus(msg, type = "info") {
  if (!el.incorporateStatusBox) return;
  el.incorporateStatusBox.classList.remove("hidden");
  const color = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "var(--accent-cyan)";
  el.incorporateStatusBox.style.borderColor = color;
  el.incorporateStatusBox.style.color = color;
  el.incorporateStatusBox.textContent = msg;
}

export function openIncorporateModal(content) {
  if (!el.modalIncorporateSystem) return;
  if (el.modalIncPreview) el.modalIncPreview.textContent = content;
  if (el.modalIncGuidance) el.modalIncGuidance.value = "";
  const radioBoth = document.querySelector('input[name="modal-inc-target"][value="both"]');
  if (radioBoth) radioBoth.checked = true;
  el.modalIncorporateSystem.classList.remove("hidden");
}

export async function executeIncorporate(content, target, guidance) {
  if (!assertProviderConfigured()) return;
  if (!content || !content.trim()) {
    alert("Please provide a system prompt or directives to incorporate.");
    return;
  }

  syncUIToState();

  const btn = el.btnRunIncorporate;
  const originalBtnHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; vertical-align:middle; margin-right:4px;"></span> Incorporating...`;
  }
  if (el.btnModalIncRun) {
    el.btnModalIncRun.disabled = true;
    el.btnModalIncRun.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; vertical-align:middle; margin-right:4px;"></span> Incorporating...`;
  }

  showIncorporateStatus(`🤖 AI is synthesizing content into ${target.replace("_", "-")}...`, "info");

  try {
    const res = await apiPost("/api/incorporate-prompt", {
      character: state.character,
      systemPromptContent: content,
      target,
      provider: state.provider,
      userGuidance: guidance || undefined,
    });

    if (res.character) {
      state.character = {
        ...state.character,
        ...res.character,
      };
      state.pendingSystemPrompt = null;
      if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
      syncStateToUI();
      recordSnapshot(`Incorporated directives into ${target}`);
      showIncorporateStatus(`✓ ${res.summary || "Directives incorporated successfully!"}`, "success");
      el.modalIncorporateSystem?.classList.add("hidden");
      alert(`✨ Directives successfully incorporated into ${target.replace("_", " ")}!`);
    }
  } catch (err) {
    console.error("Incorporation failed:", err);
    showIncorporateStatus(`⚠️ Incorporation failed: ${err.message}`, "error");
    alert(`Incorporation failed: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
    if (el.btnModalIncRun) {
      el.btnModalIncRun.disabled = false;
      el.btnModalIncRun.innerHTML = `<span>✨ Run AI Incorporation</span>`;
    }
  }
}

// In-Editor AI Incorporator Handlers
el.btnRunIncorporate?.addEventListener("click", async () => {
  const content = el.fieldSystemPrompt?.value?.trim() || "";
  const target = el.incorporateTarget?.value || "both";
  const guidance = el.incorporateGuidance?.value?.trim() || "";
  await executeIncorporate(content, target, guidance);
});

el.btnPlainMovePostHistory?.addEventListener("click", () => {
  const content = el.fieldSystemPrompt?.value?.trim() || "";
  if (!content) {
    alert("System prompt box is empty.");
    return;
  }
  if (!state.character.post_history_instructions) {
    state.character.post_history_instructions = content;
  } else if (!state.character.post_history_instructions.includes(content)) {
    state.character.post_history_instructions = `${state.character.post_history_instructions}\n\n${content}`;
  }
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  syncStateToUI();
  recordSnapshot("Plain moved system prompt to post-history");
  showIncorporateStatus("✓ Moved directly to Post-History Instructions (No AI).", "success");
});

// Modal Event Handlers
el.btnCloseIncModal?.addEventListener("click", () => {
  el.modalIncorporateSystem?.classList.add("hidden");
});

el.btnModalIncDiscard?.addEventListener("click", () => {
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  el.modalIncorporateSystem?.classList.add("hidden");
  recordSnapshot("Discarded legacy system prompt");
});

el.btnModalIncFallback?.addEventListener("click", () => {
  const content = state.pendingSystemPrompt || el.fieldSystemPrompt?.value?.trim() || "";
  if (content) {
    if (!state.character.post_history_instructions) {
      state.character.post_history_instructions = content;
    } else if (!state.character.post_history_instructions.includes(content)) {
      state.character.post_history_instructions = `${state.character.post_history_instructions}\n\n${content}`;
    }
  }
  state.pendingSystemPrompt = null;
  if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = "";
  syncStateToUI();
  recordSnapshot("Moved system prompt to post-history (Fallback)");
  el.modalIncorporateSystem?.classList.add("hidden");
});

el.btnModalIncRun?.addEventListener("click", async () => {
  const content = state.pendingSystemPrompt || el.fieldSystemPrompt?.value?.trim() || "";
  const selectedTarget = (document.querySelector('input[name="modal-inc-target"]:checked'))?.value || "both";
  const guidance = el.modalIncGuidance?.value?.trim() || "";
  await executeIncorporate(content, selectedTarget, guidance);
});

// Export PNG Card (SillyTavern V2 & V3 Dual Embedded)
el.btnExportPng?.addEventListener("click", async () => {
  syncUIToState();
  try {
    const res = await fetch("/api/export-png", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: state.character,
        avatarDataUrl: state.character.avatar || state.visionImageBase64
      })
    });
    if (!res.ok) throw new Error("PNG export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.character.name || "character"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Export failed: " + err.message);
  }
});

// Export .charx Card (Character Card V3 / Lumiverse XCHAR container format)
el.btnExportCharx?.addEventListener("click", async () => {
  syncUIToState();
  try {
    const res = await fetch("/api/export-charx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: state.character,
        avatarDataUrl: state.character.avatar || state.visionImageBase64
      })
    });
    if (!res.ok) throw new Error("CharX export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.character.name || "character"}.charx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("CharX export failed: " + err.message);
  }
});

// Export JSON Card
el.btnExportJson?.addEventListener("click", () => {
  syncUIToState();
  const cardV2 = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: state.character.name,
      description: state.character.description,
      personality: state.character.personality,
      scenario: state.character.scenario,
      first_mes: state.character.first_mes,
      mes_example: state.character.mes_example,
      creator_notes: state.character.creator_notes,
      system_prompt: "", // Strictly empty so SillyTavern presets are preserved
      post_history_instructions: state.character.post_history_instructions,
      alternate_greetings: state.character.alternate_greetings,
      tags: state.character.tags,
      character_book: state.character.character_book,
      creator: "CharGen Harness",
      character_version: "1.0",
      extensions: state.character.extensions || {},
    }
  };
  const jsonStr = JSON.stringify(cardV2, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.character.name || "character"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Copy Character Prompt
el.btnCopyPrompt?.addEventListener("click", () => {
  syncUIToState();
  const c = state.character;
  const promptText = `[Character: ${c.name}]
[Description:
${c.description}]

[Personality:
${c.personality}]

[Scenario:
${c.scenario}]

[First Message:
${c.first_mes}]

${c.mes_example ? `[Example Dialogues:\n${c.mes_example}]` : ""}`;

  navigator.clipboard.writeText(promptText);
  el.btnCopyPrompt.textContent = "✓ Copied Prompt!";
  setTimeout(() => el.btnCopyPrompt.textContent = "📋 Copy Character Prompt to Clipboard", 2000);
});

// Raw JSON View
el.btnViewRawJson?.addEventListener("click", () => {
  syncUIToState();
  const cardV2 = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      ...state.character,
    }
  };
  el.rawJsonTextarea.value = JSON.stringify(cardV2, null, 2);
  el.modalJson.classList.remove("hidden");
});

el.btnCloseJson?.addEventListener("click", () => el.modalJson.classList.add("hidden"));
el.btnCopyRawJson?.addEventListener("click", () => {
  navigator.clipboard.writeText(el.rawJsonTextarea.value);
  el.btnCopyRawJson.textContent = "✓ Copied!";
  setTimeout(() => el.btnCopyRawJson.textContent = "Copy JSON", 1500);
});

// Settings Modal
el.btnOpenSettings?.addEventListener("click", () => {
  openSettingsModal();
});

if (el.headerProviderBadge) {
  el.headerProviderBadge.addEventListener("click", () => {
    openSettingsModal();
  });
}

export function openSettingsModal() {
  loadPromptProfilesUI();
  el.settingProviderType.value = state.provider.type || "none";
  el.settingApiKey.value = state.provider.apiKey || "";
  el.settingBaseUrl.value = state.provider.baseUrl || "";
  el.settingModelName.value = state.provider.model || "";
  el.settingTemperature.value = state.provider.temperature || 0.85;
  el.tempVal.textContent = state.provider.temperature || 0.85;

  if (state.searchConfig) {
    if (el.settingSearchProvider) el.settingSearchProvider.value = state.searchConfig.provider || "duckduckgo";
    if (el.settingSearchKey) el.settingSearchKey.value = state.searchConfig.apiKey || "";
    if (el.settingMcpCommand) el.settingMcpCommand.value = state.searchConfig.mcpCommand || "";
  }
  if (el.settingImgDefaultModel) {
    el.settingImgDefaultModel.value = state.imageConfig?.defaultTargetModel || "flux";
  }
  if (el.settingImgDefaultArtStyle) {
    el.settingImgDefaultArtStyle.value = state.imageConfig?.defaultArtStyle || "anime";
  }
  toggleSearchKeyField();
  toggleBaseUrlField();
  checkEnvKeyDetection();
  el.modalSettings.classList.remove("hidden");
}

export function toggleSearchKeyField() {
  if (!el.settingSearchProvider || !el.groupSearchKey) return;
  const p = el.settingSearchProvider.value;
  if (p === "tavily" || p === "brave" || p === "searxng") {
    el.groupSearchKey.style.display = "block";
    el.labelSearchKey.textContent = p === "searxng" ? "SearXNG Instance URL" : "Search API Key";
    el.settingSearchKey.placeholder = p === "searxng" ? "e.g. http://localhost:8888" : "Enter API Key";
  } else {
    el.groupSearchKey.style.display = "none";
  }
}

if (el.settingSearchProvider) {
  el.settingSearchProvider.addEventListener("change", toggleSearchKeyField);
}

el.btnCloseSettings?.addEventListener("click", () => el.modalSettings.classList.add("hidden"));

el.settingProviderType?.addEventListener("change", () => {
  const pType = el.settingProviderType.value;
  toggleBaseUrlField();
  if (pType === "gemini") el.settingModelName.value = "gemini-2.5-flash";
  else if (pType === "anthropic") el.settingModelName.value = "claude-3-5-sonnet-20241022";
  else if (pType === "openrouter") el.settingModelName.value = "deepseek/deepseek-chat";
  else if (pType === "ollama") el.settingModelName.value = "llama3.2-vision";
  else if (pType === "llamacpp") el.settingModelName.value = "local-model";
  else if (pType === "openai") el.settingModelName.value = "gpt-4o-mini";
  else if (pType === "none") el.settingModelName.value = "";
  checkEnvKeyDetection();
});

el.settingTemperature?.addEventListener("input", (e) => {
  if (el.tempVal) el.tempVal.textContent = e.target.value;
});

export function toggleBaseUrlField() {
  const pType = el.settingProviderType.value;
  if (pType === "openai" || pType === "ollama" || pType === "llamacpp") {
    el.groupBaseUrl.style.display = "block";
    if (pType === "llamacpp" && !el.settingBaseUrl.value) {
      el.settingBaseUrl.value = "http://127.0.0.1:8080/v1";
    } else if (pType === "ollama" && !el.settingBaseUrl.value) {
      el.settingBaseUrl.value = "http://localhost:11434/v1";
    }
  } else {
    el.groupBaseUrl.style.display = "none";
  }
}

export function checkEnvKeyDetection() {
  const pType = el.settingProviderType.value;
  const envKeyPresent =
    (pType === "gemini" && state.envKeys.hasGemini) ||
    (pType === "openrouter" && state.envKeys.hasOpenRouter) ||
    (pType === "openai" && state.envKeys.hasOpenAI) ||
    (pType === "anthropic" && state.envKeys.hasAnthropic);

  el.settingEnvDetected.style.display = envKeyPresent ? "block" : "none";
}

el.btnSaveSettings?.addEventListener("click", () => {
  state.provider.type = el.settingProviderType.value;
  state.provider.apiKey = el.settingApiKey.value.trim();
  state.provider.baseUrl = el.settingBaseUrl.value.trim();
  state.provider.model = el.settingModelName.value.trim();
  state.provider.temperature = parseFloat(el.settingTemperature.value);

  state.searchConfig = {
    provider: el.settingSearchProvider?.value || "duckduckgo",
    apiKey: el.settingSearchKey?.value.trim() || "",
    mcpCommand: el.settingMcpCommand?.value.trim() || ""
  };

  state.imageConfig = {
    defaultTargetModel: el.settingImgDefaultModel?.value || "flux",
    defaultArtStyle: el.settingImgDefaultArtStyle?.value || "anime",
  };

  localStorage.setItem("chargen_provider_config", JSON.stringify(state.provider));
  localStorage.setItem("chargen_search_config", JSON.stringify(state.searchConfig));
  localStorage.setItem("chargen_image_config", JSON.stringify(state.imageConfig));

  if (el.imgTargetModel) el.imgTargetModel.value = state.imageConfig.defaultTargetModel;
  if (el.imgArtStyle) el.imgArtStyle.value = state.imageConfig.defaultArtStyle;

  updateProviderBadge();
  el.modalSettings.classList.add("hidden");
  alert("Settings saved!");
});

