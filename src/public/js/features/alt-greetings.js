import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { escapeHtml } from "../utils/macros.js";
import { showIpcToast } from "./ipc.js";
import { apiPost } from "../core/api.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { handleQueueGreetingImage } from "./image-prompts.js";

export function renderAltGreetings() {
  if (!el.altGreetingsList) return;
  el.altGreetingsList.innerHTML = "";
  let alts = state.character.alternate_greetings;
  if (!Array.isArray(alts)) {
    if (typeof alts === "string" && alts.trim()) {
      alts = [alts.trim()];
    } else {
      alts = [];
    }
    state.character.alternate_greetings = alts;
  }

  if (alts.length === 0) {
    el.altGreetingsList.innerHTML = `<div style="color:var(--text-dim); font-size:12px; font-style:italic;">No alternate greetings added yet. Click "+ Add Alternate Greeting" or use the Enhancer suite to auto-generate them.</div>`;
    return;
  }

  alts.forEach((alt, idx) => {
    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;";

    const galleryItems = Array.isArray(state.character?.extensions?.gallery) ? state.character.extensions.gallery : [];
    const altScene = galleryItems.find(g => g.greetingIndex === idx + 1 && !g.isBackground && g.type !== "background");
    const altBg = galleryItems.find(g => g.greetingIndex === idx + 1 && (g.isBackground || g.type === "background"));

    const sceneBadge = altScene
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(168, 85, 247, 0.2); border:1px solid rgba(168, 85, 247, 0.4); color:#d8b4fe;" title="Attached Scene: ${altScene.name || 'Scene'}">
           🖼️ Attached: <code>${altScene.name || 'gallery_image'}</code>
         </span>`
      : "";
    const bgBadge = altBg
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(56, 189, 248, 0.2); border:1px solid rgba(56, 189, 248, 0.4); color:#7dd3fc;" title="Attached Chat Background">
           🌄 Chat BG
         </span>`
      : "";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; font-size:12px; color:var(--accent-cyan);">Alternate Greeting #${idx + 1}</span>
          ${sceneBadge}
          ${bgBadge}
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-xs btn-queue-alt-greeting-img" data-idx="${idx}" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;" title="Generate & queue an active scene illustration for this greeting">🖼️ Scene</button>
          <button class="btn btn-xs btn-queue-alt-greeting-bg" data-idx="${idx}" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc;" title="Generate & queue an environmental chat background wallpaper for this greeting">🌄 Chat BG</button>
          <button class="btn btn-xs btn-improve-alt" data-idx="${idx}" style="background: linear-gradient(135deg, #059669, #0d9488); border: none; color: #fff; font-weight: 700;" title="Improve this specific greeting">✨ Improve</button>
          <button class="btn btn-sm btn-copy-alt" data-idx="${idx}">📋 Copy</button>
          <button class="btn btn-sm btn-danger btn-del-alt" data-idx="${idx}">🗑️ Delete</button>
        </div>
      </div>
      <textarea class="form-textarea alt-text-input" data-idx="${idx}" style="min-height:100px; font-family:monospace; font-size:12px;">${escapeHtml(alt)}</textarea>
    `;
    el.altGreetingsList.appendChild(card);
  });

  el.altGreetingsList.querySelectorAll(".alt-text-input").forEach(ta => {
    ta.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      state.character.alternate_greetings[idx] = e.target.value;
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-del-alt").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      state.character.alternate_greetings.splice(idx, 1);
      renderAltGreetings();
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-copy-alt").forEach(b => {
    b.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      navigator.clipboard.writeText(state.character.alternate_greetings[idx]);
      b.textContent = "✓ Copied!";
      setTimeout(() => b.textContent = "📋 Copy", 1500);
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-queue-alt-greeting-img").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const text = state.character.alternate_greetings[idx] || "";
      await handleQueueGreetingImage(text, `Alternate Greeting #${idx + 1} Scene`, "greeting", idx + 1);
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-queue-alt-greeting-bg").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const text = state.character.alternate_greetings[idx] || "";
      await handleQueueGreetingImage(text, `Alternate Greeting #${idx + 1} Background`, "greeting_bg", idx + 1);
    });
  });

  el.altGreetingsList.querySelectorAll(".btn-improve-alt").forEach(b => {
    b.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const currentAlt = state.character.alternate_greetings[idx];
      if (!currentAlt) return;
      if (!assertProviderConfigured()) return;
      b.disabled = true;
      b.textContent = "⏳ Improving...";
      try {
        const res = await apiPost("/api/enhance-field", {
          character: { ...state.character, alternate_greetings: [currentAlt] },
          field: "alternate_greetings",
          mode: "punch_up",
          provider: state.provider,
          steeringInstructions: `Improve ONLY alternate greeting #${idx + 1}. Current text:\n\n${currentAlt}\n\nImprove this specific greeting: make it more sensory, arc-aware (if story arc exists), exactly 2 paragraphs, richly sensory, arc-aware. Preserve the scene context but enhance sensory details, emotional stakes, and character voice. Do NOT change the scene context. Keep it as a distinct entry point into the story arc.`,
        });
        if (res.character && res.character.alternate_greetings && res.character.alternate_greetings.length > 0) {
          state.character.alternate_greetings[idx] = res.character.alternate_greetings[0];
          renderAltGreetings();
          showIpcToast(`✓ Alternate Greeting #${idx + 1} improved!`, "success");
        }
      } catch (err) {
        alert("Failed improving greeting: " + err.message);
      } finally {
        b.disabled = false;
        b.textContent = "✨ Improve";
      }
    });
  });
}

// Global window exposure for inter-module calls
if (typeof window !== "undefined") {
  window.renderAltGreetings = renderAltGreetings;
}
