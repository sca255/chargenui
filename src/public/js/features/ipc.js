// Inter-Process Communication (IPC) - WebSocket & Unix Socket Bridge
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { escapeHtml, recordSnapshot } from "../utils/diff.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { renderThemePills } from "./themes.js";
import { updateEraDossierPreview } from "./eras.js";
import { updateActiveCardBadge } from "./library.js";
import { renderAltGreetings } from "./alt-greetings.js";
import { refreshImageQueue } from "./image-prompts.js";

// ==================== Inter-Process Communication (IPC) ====================
let ipcWs = null;
let ipcReconnectTimer = null;

export function showIpcToast(message, type = "info") {
  const container = document.getElementById("ipc-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `ipc-toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 14px;">${type === "success" ? "🎉" : type === "warning" ? "⚠️" : "💡"}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <span style="cursor: pointer; opacity: 0.7; font-size: 14px; margin-left: 8px;" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.style) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50%)";
    }
    setTimeout(() => {
      if (typeof toast.remove === "function") {
        toast.remove();
      } else if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

export function initIpcWebSocket() {
  if (ipcWs && (ipcWs.readyState === WebSocket.OPEN || ipcWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}/api/ipc/ws`;

  try {
    ipcWs = new WebSocket(wsUrl);

    ipcWs.onopen = () => {
      console.log("⚡ CharGen IPC WebSocket connected to:", wsUrl);
      const badge = document.getElementById("header-ipc-badge");
      if (badge) {
        badge.innerHTML = "⚡ IPC Online";
        badge.style.background = "rgba(16, 185, 129, 0.15)";
        badge.style.borderColor = "#10b981";
        badge.style.color = "#34d399";
        badge.title = "Connected to CharGen IPC Server. External QML / Desktop apps can sync characters and submit ideas in real-time.";
      }

      if (state.character && state.character.name) {
        notifyIpcActiveCard(state.character);
      }
    };

    ipcWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIpcMessage(msg);
      } catch (err) {
        console.warn("Error parsing IPC WebSocket frame:", err);
      }
    };

    ipcWs.onclose = () => {
      const badge = document.getElementById("header-ipc-badge");
      if (badge) {
        badge.innerHTML = "⚡ IPC Offline";
        badge.style.background = "rgba(107, 114, 128, 0.15)";
        badge.style.borderColor = "#6b7280";
        badge.style.color = "#9ca3af";
        badge.title = "IPC WebSocket disconnected. Reconnecting...";
      }
      clearTimeout(ipcReconnectTimer);
      ipcReconnectTimer = setTimeout(initIpcWebSocket, 3000);
    };

    ipcWs.onerror = () => {
      // Disconnection handled in onclose
    };
  } catch (err) {
    console.warn("Failed to create IPC WebSocket:", err);
  }
}

export function notifyIpcActiveCard(character) {
  if (ipcWs && ipcWs.readyState === WebSocket.OPEN && character) {
    try {
      ipcWs.send(JSON.stringify({
        action: "set_active_card",
        payload: { character }
      }));
    } catch (e) {
      console.warn("Failed to notify IPC server of active card:", e);
    }
  }
}

export function handleIpcMessage(msg) {
  const { type, payload } = msg;

  if (type === "idea:received" && payload?.idea) {
    const { idea } = payload;
    const label = idea.archetype || idea.characterName || (idea.concept.length > 50 ? idea.concept.slice(0, 47) + "..." : idea.concept);
    showIpcToast(`💡 Idea received from ${idea.suggestedBy || "Idea Suggester"}: "${label}"`, "info");

    // Populate Spark Concept textarea with full sauce
    if (el.genConcept) {
      el.genConcept.value = idea.concept;
      el.genConcept.classList.add("pulse-highlight");
      setTimeout(() => el.genConcept?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Genre if provided
    if (idea.genre && el.genGenre) {
      const gLower = idea.genre.toLowerCase();
      let matched = false;
      for (const opt of el.genGenre.options) {
        if (opt.value.toLowerCase().includes(gLower) || gLower.includes(opt.value.toLowerCase())) {
          el.genGenre.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Add custom option if not matched
        const newOpt = document.createElement("option");
        newOpt.value = idea.genre;
        newOpt.textContent = idea.genre;
        el.genGenre.appendChild(newOpt);
        el.genGenre.value = idea.genre;
      }
      el.genGenre.classList.add("pulse-highlight");
      setTimeout(() => el.genGenre?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Story Arc if provided
    if (idea.storyArc && el.genStoryArc) {
      el.genStoryArc.value = idea.storyArc;
      el.genStoryArc.classList.add("pulse-highlight");
      setTimeout(() => el.genStoryArc?.classList.remove("pulse-highlight"), 2000);
    }

    // Populate Era input if provided
    if (idea.era && el.genEra) {
      el.genEra.value = idea.era;
      el.genEra.classList.add("pulse-highlight");
      setTimeout(() => el.genEra?.classList.remove("pulse-highlight"), 2000);
      updateEraDossierPreview(idea.eraData || idea.era);
    } else {
      updateEraDossierPreview(null);
    }

    // Populate suggested themes / tags
    const rawThemes = idea.themes || idea.tags;
    if (rawThemes) {
      let themesArr = [];
      if (Array.isArray(rawThemes)) {
        themesArr = rawThemes;
      } else if (typeof rawThemes === "string") {
        try {
          themesArr = rawThemes.startsWith("[") ? JSON.parse(rawThemes) : rawThemes.split(",").map(t => t.trim());
        } catch (e) {
          themesArr = rawThemes.split(",").map(t => t.trim());
        }
      }

      if (Array.isArray(themesArr) && themesArr.length > 0) {
        if (!state.selectedThemes) state.selectedThemes = [];

        // Map known theme chips in DOM to handle case-insensitivity and sub-aliases
        const chips = document.querySelectorAll(".theme-chip");
        const chipMap = new Map();
        chips.forEach((c) => {
          const raw = c.getAttribute("data-theme") || "";
          if (raw) {
            chipMap.set(raw.toLowerCase().replace(/&amp;/g, "&").trim(), raw);
            raw.split("/").forEach((p) => chipMap.set(p.toLowerCase().trim(), raw));
          }
        });

        themesArr.forEach((t) => {
          const trimmed = String(t).trim();
          if (!trimmed) return;
          const clean = trimmed.toLowerCase().replace(/&amp;/g, "&").trim();
          // Resolve to official chip name if matched, else use trimmed text
          const canonical = chipMap.get(clean) || trimmed;
          if (!state.selectedThemes.includes(canonical)) {
            state.selectedThemes.push(canonical);
          }
        });
        renderThemePills();
      }
    }

    // If avatar was passed with the idea, immediately bind it to character
    if (idea.avatar) {
      state.character.avatar = idea.avatar;
      el.avatarImg.src = idea.avatar;
      el.avatarImg.style.display = "block";
      el.avatarPlaceholder.style.display = "none";
    }

    // Switch to Spark tab (tab-generate / tab-spark)
    const sparkTab = document.querySelector('.nav-tab[data-tab="tab-spark"]') || document.querySelector('.nav-tab[data-tab="tab-generate"]');
    if (sparkTab?.click) sparkTab.click();
  }

  if (type === "character:generated" && payload?.character) {
    const char = payload.character;
    state.character = { ...state.character, ...char };
    syncStateToUI();
    updateActiveCardBadge();
    recordSnapshot(`Generated from Idea: ${char.name}`);
    showIpcToast(`Auto-generated character "${char.name}"!`, "success");

    // Switch to Manual Editor tab
    const manualTab = document.querySelector('.nav-tab[data-tab="tab-manual"]');
    if (manualTab?.click) manualTab.click();
  }

  if (type === "character:changed" && payload?.character) {
    console.log("IPC: Active character updated remotely:", payload.character.name);
  }

  if (type === "image:attached" && payload) {
    const { imageType, imageDataUrl, greetingIndex } = payload;
    const gIdx = typeof greetingIndex === "number" ? greetingIndex : 0;

    if (imageType === "greeting") {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      if (gIdx === 0) {
        state.character.data.extensions.greeting_image = imageDataUrl;
        state.character.greeting_image = imageDataUrl;
      }

      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];
      const galNum = state.character.extensions.gallery.length + 1;
      const galleryTag = `![Gallery image](gallery://image-${galNum})`;

      if (!state.character.extensions.gallery.some((g) => g.dataUrl === imageDataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: gIdx > 0 ? `Alt Greeting #${gIdx} Scene` : "Greeting Scene",
          dataUrl: imageDataUrl,
          type: "scene",
          greetingIndex: gIdx,
          createdAt: new Date().toISOString(),
        });
      }

      if (gIdx === 0) {
        if (state.character.first_mes && !state.character.first_mes.includes("gallery://image-")) {
          state.character.first_mes = state.character.first_mes.trimEnd() + "\n\n" + galleryTag;
          if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        }
        showIpcToast("✓ Greeting scene image attached to character starter!", "success");
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
        showIpcToast(`✓ Greeting scene image attached to Alternate Greeting #${gIdx}!`, "success");
      }
    } else if (imageType === "avatar") {
      state.character.avatar = imageDataUrl;
      showIpcToast("✓ Avatar image attached to active character!", "success");
    } else if (imageType === "greeting_bg") {
      if (!state.character.data) state.character.data = {};
      if (!state.character.data.extensions) state.character.data.extensions = {};
      state.character.data.extensions.chat_background = imageDataUrl;
      state.character.chat_background = imageDataUrl;

      if (!state.character.extensions) state.character.extensions = {};
      if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];
      if (!state.character.extensions.gallery.some((g) => g.dataUrl === imageDataUrl)) {
        state.character.extensions.gallery.push({
          id: `gal_${Date.now()}`,
          name: "Chat Background",
          dataUrl: imageDataUrl,
          type: "background",
          isBackground: true,
          createdAt: new Date().toISOString(),
        });
      }

      showIpcToast("✓ Chat background attached!", "success");
    }
    syncStateToUI();
    if (typeof refreshImageQueue === "function") {
      refreshImageQueue();
    }
    if (typeof refreshSavedCards === "function") {
      refreshSavedCards();
    }
  }
}

