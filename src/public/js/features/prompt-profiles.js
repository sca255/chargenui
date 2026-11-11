// Prompt Profiles Management & Active Selector
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { showIpcToast } from "./ipc.js";
import { openSettingsModal } from "../modals/settings-and-incorporate.js";

// Prompt Configuration UI & Management
let currentPromptConfig = null;

export async function loadPromptProfilesUI() {
  try {
    const res = await fetch("/api/prompts");
    if (!res.ok) return;
    const data = await res.json();
    currentPromptConfig = data.config;

    // Populate profile select in settings modal
    if (el.settingPromptProfile) {
      el.settingPromptProfile.innerHTML = "";
      data.profiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        const icon = p.id === "local_maledom_bdsm" ? "⛓️ " : p.id === "local_playable" ? "⚡ " : p.isPrivate ? "🔒 " : "🌐 ";
        opt.textContent = `${icon}${p.name}`;
        if (p.id === data.activeProfile) opt.selected = true;
        el.settingPromptProfile.appendChild(opt);
      });
    }

    // Populate Header Dropdown Selector
    if (el.headerPromptSelect) {
      el.headerPromptSelect.innerHTML = "";
      data.profiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        const icon = p.id === "local_maledom_bdsm" ? "⛓️ " : p.id === "local_playable" ? "⚡ " : p.isPrivate ? "🔒 " : "🌐 ";
        opt.textContent = `${icon}${p.name}`;
        if (p.id === data.activeProfile) opt.selected = true;
        el.headerPromptSelect.appendChild(opt);
      });

      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      const isPriv = activeObj?.isPrivate;
      const isBdsm = activeObj?.id === "local_maledom_bdsm";
      const isLocal = activeObj?.id === "local_playable" || isBdsm;
      el.headerPromptSelect.style.borderColor = isBdsm ? "#ec4899" : isLocal ? "var(--accent-cyan)" : isPriv ? "#10b981" : "var(--accent-purple)";
      el.headerPromptSelect.style.color = isBdsm ? "#f472b6" : isLocal ? "var(--accent-cyan)" : isPriv ? "#34d399" : "var(--accent-purple)";
      el.headerPromptSelect.style.background = isBdsm ? "rgba(236, 72, 153, 0.15)" : isLocal ? "rgba(6, 182, 212, 0.15)" : isPriv ? "rgba(16, 185, 129, 0.15)" : "rgba(168, 85, 247, 0.15)";
    }

    // Update Header Badge (if present)
    if (el.headerPromptBadge) {
      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      const isPriv = activeObj?.isPrivate;
      const isBdsm = activeObj?.id === "local_maledom_bdsm";
      const isLocal = activeObj?.id === "local_playable" || isBdsm;
      const icon = isBdsm ? "⛓️ " : isLocal ? "⚡ " : isPriv ? "🔒 " : "🧠 ";
      el.headerPromptBadge.textContent = `${icon}${activeObj?.name || "Default"}`;
      el.headerPromptBadge.style.borderColor = isBdsm ? "#ec4899" : isLocal ? "var(--accent-cyan)" : isPriv ? "#10b981" : "var(--accent-purple)";
      el.headerPromptBadge.style.color = isBdsm ? "#f472b6" : isLocal ? "var(--accent-cyan)" : isPriv ? "#34d399" : "var(--accent-purple)";
      el.headerPromptBadge.style.background = isBdsm ? "rgba(236, 72, 153, 0.15)" : isLocal ? "rgba(6, 182, 212, 0.15)" : isPriv ? "rgba(16, 185, 129, 0.15)" : "rgba(168, 85, 247, 0.15)";
    }

    // Update Private Badge in modal
    if (el.badgePromptPrivate) {
      const activeObj = data.profiles.find(p => p.id === data.activeProfile);
      el.badgePromptPrivate.style.display = activeObj?.isPrivate ? "inline-block" : "none";
    }

    // Populate Template Edit Textareas
    if (data.config) {
      if (el.promptEditSystem) el.promptEditSystem.value = data.config.systemPrompt || "";
      if (el.promptEditSpine) el.promptEditSpine.value = data.config.spineSynthesis?.instructions || "";
      if (el.promptEditDesc) el.promptEditDesc.value = data.config.fieldRenderers?.description?.proseGuidance || "";
      if (el.promptEditPers) el.promptEditPers.value = data.config.fieldRenderers?.personality?.guidance || "";
      if (el.promptEditScenario) el.promptEditScenario.value = data.config.fieldRenderers?.scenarioAndFirstMes?.scenarioRule || "";
      if (el.promptEditFirstmes) el.promptEditFirstmes.value = data.config.fieldRenderers?.scenarioAndFirstMes?.firstMesRule || "";
      if (el.promptEditAlichat) el.promptEditAlichat.value = data.config.fieldRenderers?.aliChatAndAlts?.aliChatRule || "";
    }
  } catch (err) {
    console.warn("Failed to load prompt configuration:", err);
  }
}

if (el.headerPromptBadge) {
  el.headerPromptBadge.addEventListener("click", () => {
    openSettingsModal();
  });
}

if (el.headerPromptSelect) {
  el.headerPromptSelect.addEventListener("change", async (e) => {
    const profileId = e.target.value;
    try {
      const res = await fetch("/api/prompts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        localStorage.setItem("chargen_active_prompt_profile", profileId);
        await loadPromptProfilesUI();
        showIpcToast(`Switched active prompt preset to: ${profileId}`, "success");
      }
    } catch (err) {
      alert("Error switching prompt profile: " + err.message);
    }
  });
}

if (el.btnHeaderEditPrompt) {
  el.btnHeaderEditPrompt.addEventListener("click", () => {
    openSettingsModal();
    const profileEl = document.getElementById("setting-prompt-profile");
    if (profileEl) {
      profileEl.scrollIntoView({ behavior: "smooth", block: "center" });
      profileEl.classList.add("pulse-highlight");
      setTimeout(() => profileEl.classList.remove("pulse-highlight"), 2000);
    }
    const details = profileEl?.closest(".form-group")?.nextElementSibling;
    if (details && details.tagName === "DETAILS") {
      details.open = true;
    }
  });
}

if (el.settingPromptProfile) {
  el.settingPromptProfile.addEventListener("change", async (e) => {
    const profileId = e.target.value;
    try {
      const res = await fetch("/api/prompts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        localStorage.setItem("chargen_active_prompt_profile", profileId);
        await loadPromptProfilesUI();
      }
    } catch (err) {
      alert("Error switching prompt profile: " + err.message);
    }
  });
}

if (el.btnSaveCustomPrompts) {
  el.btnSaveCustomPrompts.addEventListener("click", async () => {
    const customConfig = {
      name: "Custom Overrides",
      systemPrompt: el.promptEditSystem?.value || "",
      spineSynthesis: {
        systemDirective: currentPromptConfig?.spineSynthesis?.systemDirective || "You are an elite psychometric character architect.",
        instructions: el.promptEditSpine?.value || "",
        schemaInstructions: currentPromptConfig?.spineSynthesis?.schemaInstructions || ""
      },
      fieldRenderers: {
        description: {
          proseGuidance: el.promptEditDesc?.value || "",
          taggedBundleGuidance: currentPromptConfig?.fieldRenderers?.description?.taggedBundleGuidance || ""
        },
        personality: {
          guidance: el.promptEditPers?.value || ""
        },
        scenarioAndFirstMes: {
          guidance: "Write the present scenario and opening first message.",
          scenarioRule: el.promptEditScenario?.value || "",
          firstMesRule: el.promptEditFirstmes?.value || ""
        },
        aliChatAndAlts: {
          guidance: "Write example messages (<START>) and alternate greetings.",
          aliChatRule: el.promptEditAlichat?.value || "",
          altGreetingsRule: currentPromptConfig?.fieldRenderers?.aliChatAndAlts?.altGreetingsRule || ""
        }
      }
    };

    try {
      const res = await fetch("/api/prompts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: customConfig })
      });
      if (res.ok) {
        await loadPromptProfilesUI();
        alert("✓ Custom prompt template saved into private configuration (git-ignored)!");
      }
    } catch (err) {
      alert("Error saving custom prompt: " + err.message);
    }
  });
}

if (el.btnResetPrompts) {
  el.btnResetPrompts.addEventListener("click", async () => {
    if (!confirm("Reset prompts to default open profile?")) return;
    try {
      const res = await fetch("/api/prompts/reset", { method: "POST" });
      if (res.ok) {
        await loadPromptProfilesUI();
        alert("✓ Prompt profile reset to default!");
      }
    } catch (err) {
      alert("Error resetting prompt: " + err.message);
    }
  });
}

