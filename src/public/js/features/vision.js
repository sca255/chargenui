// Vision Scan & OCR Image Deconstruction Handlers
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast } from "./ipc.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { updateActiveCardBadge, fetchLibrary } from "./library.js";
import { openIncorporateModal } from "../modals/settings-and-incorporate.js";
import { renderWeaverInterviewQuestions } from "./weaver.js";

// Vision Drag & Drop Handling
el.visionDropzone?.addEventListener("click", () => el.visionFileInput?.click());

["dragenter", "dragover"].forEach(eventName => {
  el.visionDropzone?.addEventListener(eventName, (e) => {
    e.preventDefault();
    el.visionDropzone?.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(eventName => {
  el.visionDropzone?.addEventListener(eventName, (e) => {
    e.preventDefault();
    el.visionDropzone?.classList.remove("dragover");
  });
});

el.visionDropzone?.addEventListener("drop", (e) => {
  const files = e.dataTransfer?.files;
  if (files && files[0]) {
    handleVisionImageUpload(files[0]);
  }
});

let batchVisionFiles = [];

el.visionFileInput?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 1) {
    handleBatchVisionUpload(files);
  } else if (files.length === 1) {
    batchVisionFiles = [];
    const statusEl = document.getElementById("vision-batch-status");
    if (statusEl) statusEl.classList.add("hidden");
    handleVisionImageUpload(files[0]);
  }
});

function handleBatchVisionUpload(files) {
  batchVisionFiles = files;
  const statusEl = document.getElementById("vision-batch-status");
  const countEl = document.getElementById("vision-batch-count");
  if (statusEl && countEl) {
    countEl.textContent = files.length;
    statusEl.classList.remove("hidden");
  }
  handleVisionImageUpload(files[0]);
  if (el.btnRunVision) {
    el.btnRunVision.innerHTML = `<span>👁️ Batch Scan (${files.length} Images) & Save to Library</span>`;
  }
}

function handleVisionImageUpload(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target.result;
    state.visionImageBase64 = dataUrl;
    if (el.visionImgPreview) el.visionImgPreview.src = dataUrl;
    if (el.visionPreviewBox) el.visionPreviewBox.classList.remove("hidden");
    // Also set avatar immediately
    state.character.avatar = dataUrl;
    if (el.avatarImg) {
      el.avatarImg.src = dataUrl;
      el.avatarImg.style.display = "block";
    }
    if (el.avatarPlaceholder) el.avatarPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// Clear attached vision image button
const btnClearVisionImg = document.getElementById("btn-clear-vision-image");
if (btnClearVisionImg) {
  btnClearVisionImg.addEventListener("click", () => {
    state.visionImageBase64 = null;
    batchVisionFiles = [];
    if (el.visionPreviewBox) el.visionPreviewBox.classList.add("hidden");
    if (el.visionImgPreview) el.visionImgPreview.src = "";
    const statusEl = document.getElementById("vision-batch-status");
    if (statusEl) statusEl.classList.add("hidden");
    if (el.visionFileInput) el.visionFileInput.value = "";
  });
}

// Button: Run Vision Scan (if present in UI)
if (el.btnRunVision) {
  el.btnRunVision.addEventListener("click", async () => {
  if (!assertProviderConfigured()) return;

  if (batchVisionFiles.length > 1) {
    // Process Batch Vision Scan
    const btn = el.btnRunVision;
    btn.disabled = true;
    let completedCount = 0;
    try {
      const readAsB64 = (f) => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, imageBase64: r.result });
        r.onerror = reject;
        r.readAsDataURL(f);
      });

      btn.innerHTML = `<span class="spinner"></span> <span>Reading ${batchVisionFiles.length} images...</span>`;
      const imagesPayload = await Promise.all(batchVisionFiles.map(readAsB64));

      btn.innerHTML = `<span class="spinner"></span> <span>Batch scanning 1 / ${imagesPayload.length}...</span>`;
      const res = await apiPost("/api/scan-image/batch", {
        images: imagesPayload,
        provider: state.provider,
        promptHints: el.visionHints ? el.visionHints.value.trim() : "",
        nsfw: el.visionNsfw ? el.visionNsfw.checked : false,
        saveToLibrary: true,
      });

      if (res && res.results) {
        const successes = res.results.filter(r => r.success);
        if (successes.length > 0 && successes[0].result && successes[0].result.character) {
          state.character = { ...successes[0].result.character, avatar: imagesPayload[0].imageBase64 };
          state.activeCardId = successes[0].savedMeta?.id || null;
          updateActiveCardBadge();
          syncStateToUI();
        }
        await fetchLibrary();
        showIpcToast(`Batch vision scan completed! Created ${successes.length} cards in Library.`, "success");
        alert(`🎉 Batch scan complete! ${successes.length} / ${imagesPayload.length} character cards forged and saved to Library.`);
      }
    } catch (err) {
      alert("Batch vision scan failed: " + err.message);
    } finally {
      btn.disabled = false;
      batchVisionFiles = [];
      const statusEl = document.getElementById("vision-batch-status");
      if (statusEl) statusEl.classList.add("hidden");
      btn.innerHTML = `<span>👁️ Scan Image & Synthesize Card</span>`;
    }
    return;
  }

  if (!state.visionImageBase64) {
    alert("Please upload or drop an image to scan first!");
    return;
  }

  const btn = el.btnRunVision;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Scanning Image with Vision Model...</span>`;

  try {
    const payload = {
      imageBase64: state.visionImageBase64,
      promptHints: el.visionHints ? el.visionHints.value.trim() : "",
      nsfw: el.visionNsfw ? el.visionNsfw.checked : false,
      provider: state.provider
    };

    const res = await apiPost("/api/scan-image", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character, avatar: state.visionImageBase64 };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();

      // Show forensic findings
      if (res.visual_profile && el.visionFindingsBox && el.visionFindingsText) {
        el.visionFindingsBox.classList.remove("hidden");
        const vp = res.visual_profile;
        const ip = res.inferred_personality;
        el.visionFindingsText.innerHTML = `
          <strong>Appearance:</strong> ${vp.apparent_age || ''} ${vp.gender_presentation || ''}, ${vp.hair || ''}, ${vp.eyes || ''}.<br>
          <strong>Wardrobe:</strong> ${vp.clothing_attire || ''} (${vp.accessories_gear || ''})<br>
          <strong>Demeanor:</strong> ${vp.expression_demeanor || ''}<br>
          <strong>Inferred Archetype:</strong> ${ip?.archetype || ''} (${ip?.vibe || ''})<br>
          <strong>Contradiction:</strong> ${ip?.latent_conflict || ''}
        `;
      }

      recordSnapshot(`Vision Scan: ${state.character.name}`);
      alert(`👁️ Vision scan complete! Synthesized "${state.character.name}" directly from image.`);
    }
  } catch (err) {
    alert("Vision scan failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>👁️ Fast Spark Scan</span>`;
  }
});
}

// Button: Vision Weaver Interview
if (el.btnVisionWeaver) {
  el.btnVisionWeaver.addEventListener("click", async () => {
    if (!assertProviderConfigured()) return;
    if (!state.visionImageBase64) {
      alert("Please upload or drop an image to scan first!");
      return;
    }

    const btn = el.btnVisionWeaver;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Launching Weaver Interview...</span>`;

    try {
      const payload = {
        imageBase64: state.visionImageBase64,
        concept: el.visionHints.value.trim(),
        nsfw: el.visionNsfw.checked,
        provider: state.provider
      };

      const res = await apiPost("/api/vision/weaver-interview", payload);
      if (res && res.questions) {
        state.weaverInterview = {
          concept: payload.concept || "Visual Character from image",
          genre: "Roleplay / Fiction",
          themes: [],
          tone: "Vivid & Nuanced",
          nsfw: payload.nsfw,
          botMode: "single",
          questions: res.questions,
          preliminaryVision: res.preliminaryVision || "Character vision shaped by image deconstruction.",
          influence: "",
          avatarImageBase64: state.visionImageBase64
        };

        renderWeaverInterviewQuestions();
        el.modalWeaverInterview.classList.remove("hidden");
        el.weaverInterviewLoading?.classList.add("hidden");
        el.weaverInterviewContent?.classList.remove("hidden");

        // Also render forensic findings in vision tab
        if (res.visualProfile) {
          el.visionFindingsBox.classList.remove("hidden");
          const vp = res.visualProfile;
          const ip = res.inferredPersonality;
          el.visionFindingsText.innerHTML = `
            <strong>Appearance:</strong> ${vp.apparent_age || ''} ${vp.gender_presentation || ''}, ${vp.hair || ''}, ${vp.eyes || ''}.<br>
            <strong>Wardrobe:</strong> ${vp.clothing_attire || ''} (${vp.accessories_gear || ''})<br>
            <strong>Demeanor:</strong> ${vp.expression_demeanor || ''}<br>
            <strong>Inferred Archetype:</strong> ${ip?.archetype || ''} (${ip?.vibe || ''})<br>
            <strong>Contradiction:</strong> ${ip?.latent_conflict || ''}
          `;
        }
      }
    } catch (err) {
      alert("Vision Weaver Interview failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>🔮 Vision Weaver Interview</span>`;
    }
  });
}

// Button: Brainstorm Character Ideas from Image
if (el.btnVisionBrainstorm) {
  el.btnVisionBrainstorm.addEventListener("click", async () => {
    if (!assertProviderConfigured()) return;
    if (!state.visionImageBase64) {
      alert("Please upload or drop an image to brainstorm ideas first!");
      return;
    }

    const btn = el.btnVisionBrainstorm;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Brainstorming Concepts from Image...</span>`;

    try {
      const payload = {
        imageBase64: state.visionImageBase64,
        promptHints: el.visionHints.value.trim(),
        provider: state.provider
      };

      const res = await apiPost("/api/vision/ideas", payload);
      if (res && res.ideas && res.ideas.length > 0) {
        el.visionIdeasContainer.classList.remove("hidden");
        el.visionIdeasCount.textContent = `${res.ideas.length} ideas generated`;
        el.visionIdeasList.innerHTML = "";

        res.ideas.forEach((idea, idx) => {
          const card = document.createElement("div");
          card.style.cssText = "padding: 10px 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm); font-size: 11px; display: flex; flex-direction: column; gap: 6px;";
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="font-weight: 700; color: #38bdf8; font-size: 12px;">#${idx + 1}: ${escapeHtml(idea.title)}</span>
              <div style="display: flex; gap: 4px;">
                <span class="badge" style="font-size: 10px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3);">${escapeHtml(idea.suggestedGenre || 'Genre')}</span>
                <span class="badge" style="font-size: 10px; background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3);">${escapeHtml(idea.suggestedTone || 'Tone')}</span>
              </div>
            </div>
            <div style="color: var(--text-main); font-style: italic;">"${escapeHtml(idea.premise)}"</div>
            <div style="color: var(--text-muted); line-height: 1.35;">
              <strong style="color: #cbd5e1;">Subversion:</strong> ${escapeHtml(idea.tropeSubversion)}<br>
              <strong style="color: #cbd5e1;">Conflict:</strong> ${escapeHtml(idea.centralConflict)}
            </div>
            <div style="display: flex; gap: 6px; margin-top: 4px;">
              <button type="button" class="btn btn-sm btn-use-idea-spark" data-idx="${idx}" style="flex: 1; justify-content: center; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 11px; padding: 4px 8px;">
                ⚡ Send to Spark New
              </button>
              <button type="button" class="btn btn-sm btn-use-idea-weaver" data-idx="${idx}" style="flex: 1; justify-content: center; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc; font-size: 11px; padding: 4px 8px;">
                🔮 Open Weaver Interview
              </button>
            </div>
          `;

          // Button handlers
          const btnSpark = card.querySelector(".btn-use-idea-spark");
          btnSpark.addEventListener("click", () => {
            el.genConcept.value = idea.characterPrompt;
            if (idea.suggestedGenre) el.genGenre.value = idea.suggestedGenre;
            if (idea.suggestedTone) el.genTone.value = idea.suggestedTone;
            // Transfer avatar image to character immediately
            state.character.avatar = state.visionImageBase64;
            el.avatarImg.src = state.visionImageBase64;
            el.avatarImg.style.display = "block";
            el.avatarPlaceholder.style.display = "none";
            // Switch to Spark tab
            const sparkTabBtn = document.querySelector('.nav-tab[data-tab="tab-generate"]');
            if (sparkTabBtn) sparkTabBtn.click();
            alert(`✨ Idea "${idea.title}" and uploaded portrait sent to Spark New! Click "Synthesize Character Card" to forge.`);
          });

          const btnWeaver = card.querySelector(".btn-use-idea-weaver");
          btnWeaver.addEventListener("click", async () => {
            el.genConcept.value = idea.characterPrompt;
            if (idea.suggestedGenre) el.genGenre.value = idea.suggestedGenre;
            if (idea.suggestedTone) el.genTone.value = idea.suggestedTone;
            // Trigger Weaver interview using this idea prompt + image
            el.btnVisionWeaver.click();
          });

          el.visionIdeasList.appendChild(card);
        });
      }
    } catch (err) {
      alert("Vision Idea Brainstorm failed: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>💡 Brainstorm Character Ideas from Image</span>`;
    }
  });
}



// --- Custom Avatar Image Processing & Handlers ---
function processImageFileToPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // If it's already a PNG data URL, preserve raw bytes directly
      if (file.type === "image/png" && typeof dataUrl === "string" && dataUrl.startsWith("data:image/png;base64,")) {
        return resolve(dataUrl);
      }
      // If JPG, WEBP, GIF, or other, render to canvas and convert cleanly to a PNG data URL
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to render image in browser"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 400;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          resolve(pngUrl);
        } catch (canvasErr) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function handleAvatarImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") && !file.name.match(/\.(png|jpe?g|webp|gif)$/i)) {
    alert("Please select a valid image file (PNG, JPG, WEBP, or GIF).");
    return;
  }

  try {
    const pngDataUrl = await processImageFileToPng(file);
    state.character.avatar = pngDataUrl;
    syncStateToUI();
    recordSnapshot(`Added custom avatar: ${file.name}`);
  } catch (err) {
    console.error("Failed to load avatar:", err);
    alert("Failed to load avatar image: " + err.message);
  }
}

// Avatar Container Click & Button triggers
el.avatarContainer?.addEventListener("click", (e) => {
  if (e.target.closest("#btn-remove-avatar")) return;
  el.avatarFileInput?.click();
});

el.btnUploadAvatar?.addEventListener("click", () => {
  el.avatarFileInput?.click();
});

el.avatarFileInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (file) {
    await handleAvatarImageFile(file);
  }
  el.avatarFileInput.value = "";
});

el.btnRemoveAvatar?.addEventListener("click", (e) => {
  e.stopPropagation();
  state.character.avatar = null;
  syncStateToUI();
  recordSnapshot("Removed custom avatar");
});

// Avatar Drag & Drop Cues & Drop Handling
if (el.avatarContainer) {
  ["dragenter", "dragover"].forEach((eventName) => {
    el.avatarContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.avatarContainer.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    el.avatarContainer.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.avatarContainer.classList.remove("drag-over");
    });
  });

  el.avatarContainer.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await handleAvatarImageFile(file);
    }
  });
}

// Global Drag & Drop safety to prevent browser navigating away on dropped files
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  if (e.target.closest("#avatar-container") || e.target.closest("#vision-dropzone")) {
    return;
  }
  e.preventDefault();
});

// Import Card
el.btnImportCard?.addEventListener("click", () => el.fileImportInput?.click());
el.fileImportInput?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/parse-card", {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Failed to parse card");
    const data = await res.json();
    if (data.character) {
      // Replace the previous draft rather than merging stale fields into an import.
      // This keeps Agent Mode from carrying oversized data from an earlier card.
      state.character = data.character;
      state.activeCardId = null;
      updateActiveCardBadge();
      if (data.avatarDataUrl) state.character.avatar = data.avatarDataUrl;
      syncStateToUI();
      recordSnapshot(`Imported: ${state.character.name}`);

      if (data.raw_system_prompt && data.raw_system_prompt.trim()) {
        state.pendingSystemPrompt = data.raw_system_prompt.trim();
        if (el.fieldSystemPrompt) el.fieldSystemPrompt.value = state.pendingSystemPrompt;
        openIncorporateModal(state.pendingSystemPrompt);
      } else {
        alert(`📂 Successfully imported "${state.character.name}" (${data.format})!`);
      }
    }
  } catch (err) {
    alert("Import failed: " + err.message);
  } finally {
    el.fileImportInput.value = "";
  }
});


