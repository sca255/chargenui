// Net-New Feature Tabs: Evolution (Mutations), Timeline, Branches, and Asset Pipeline
import { state } from "../core/state.js";
import { apiGet, apiPost } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { showIpcToast } from "./ipc.js";
import { escapeHtml } from "../utils/macros.js";
import { assertProviderConfigured } from "../utils/provider.js";

// =========================================================================
// 1. Archetype Evolution & Vector Arithmetic Mutation
// =========================================================================
export function initEvolutionUI() {
  const btnMutate = document.getElementById("btn-mutate-archetype");
  const addTraitsInput = document.getElementById("mutation-add-traits");
  const removeTraitsInput = document.getElementById("mutation-remove-traits");
  const intensityInput = document.getElementById("mutation-intensity");
  const countSelect = document.getElementById("mutation-count");
  const resultsContainer = document.getElementById("mutation-results");

  if (!btnMutate) return;

  btnMutate.addEventListener("click", async () => {
    syncUIToState();
    if (!state.character?.name && !state.character?.description) {
      alert("Please load or generate a character first!");
      return;
    }
    if (!assertProviderConfigured()) return;

    const addTraits = (addTraitsInput?.value || "").split(",").map(t => t.trim()).filter(Boolean);
    const removeTraits = (removeTraitsInput?.value || "").split(",").map(t => t.trim()).filter(Boolean);
    const intensity = parseFloat(intensityInput?.value || "1.0") || 1.0;
    const count = parseInt(countSelect?.value || "1", 10) || 1;

    btnMutate.disabled = true;
    btnMutate.innerHTML = `<span>⏳ Mutating Vectors & Synthesizing...</span>`;
    if (resultsContainer) {
      resultsContainer.innerHTML = `<div style="font-size:11px; color:var(--text-muted); font-style:italic;">Synthesizing semantic mutations...</div>`;
    }

    try {
      const res = await apiPost("/api/characters/mutate", {
        character: state.character,
        characterId: state.activeCardId || undefined,
        addTraits,
        removeTraits,
        intensity,
        count,
        provider: state.provider,
      });

      if (!res || !res.variants || res.variants.length === 0) {
        throw new Error(res?.error || "No mutation variants returned");
      }

      showIpcToast(`Evolved ${res.variants.length} archetype variant(s)!`, "success");

      if (resultsContainer) {
        resultsContainer.innerHTML = res.variants.map((v, idx) => `
          <div style="background: var(--bg-card); border: 1px solid var(--accent-purple); border-radius: var(--radius-sm); padding: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:12px; font-weight:700; color:var(--accent-purple-light);">${escapeHtml(v.variantLabel || `Variant #${idx + 1}`)}</span>
              <button class="btn btn-xs btn-apply-mutation" data-idx="${idx}" style="background: rgba(168, 85, 247, 0.2); border: 1px solid var(--accent-purple); color: #fff;">Apply to Card</button>
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px; line-height:1.4;">${escapeHtml(v.personality || v.description || "")}</div>
          </div>
        `).join("");

        resultsContainer.querySelectorAll(".btn-apply-mutation").forEach(b => {
          b.addEventListener("click", (e) => {
            const idx = parseInt(e.target.dataset.idx, 10);
            const variant = res.variants[idx];
            if (variant) {
              state.character = { ...state.character, ...variant };
              syncStateToUI();
              showIpcToast(`Applied mutation variant to active card!`, "success");
            }
          });
        });
      }
    } catch (err) {
      alert("Evolution failed: " + err.message);
      if (resultsContainer) resultsContainer.innerHTML = "";
    } finally {
      btnMutate.disabled = false;
      btnMutate.innerHTML = `<span>🧬 Evolve Archetype Vector</span>`;
    }
  });
}

// =========================================================================
// 2. Narrative Timeline & Story Arc
// =========================================================================
export function initTimelineUI() {
  const btnExtract = document.getElementById("btn-timeline-extract");
  const btnAddBeat = document.getElementById("btn-timeline-add");
  const btnContinueArc = document.getElementById("btn-continue-arc");
  const timeAdvanceInput = document.getElementById("arc-time-advance");
  const focusPlotInput = document.getElementById("arc-focus-plot");
  const listContainer = document.getElementById("timeline-events-list");

  if (!btnContinueArc) return;

  function renderTimelineList() {
    if (!listContainer) return;
    const timeline = state.character?.extensions?.chargenui?.timeline || [];
    if (timeline.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 12px;">No timeline beats recorded yet.</div>`;
      return;
    }
    listContainer.innerHTML = timeline.map((evt, idx) => `
      <div style="background: var(--bg-card); border-left: 3px solid #10b981; border-radius: 4px; padding: 8px; font-size: 11px;">
        <div style="display:flex; justify-content:space-between; font-weight:700; color:#a7f3d0; margin-bottom:2px;">
          <span>${escapeHtml(evt.temporalMarker || `Beat #${idx + 1}`)}</span>
          <span style="font-size:10px; color:var(--text-dim);">${escapeHtml(evt.category || "story")}</span>
        </div>
        <div style="color:var(--text-main); margin-bottom:4px;">${escapeHtml(evt.summary || "")}</div>
        ${evt.openingLine ? `<div style="color:var(--text-muted); font-style:italic;">"${escapeHtml(evt.openingLine)}"</div>` : ""}
      </div>
    `).join("");
  }

  btnExtract?.addEventListener("click", async () => {
    syncUIToState();
    if (!assertProviderConfigured()) return;
    btnExtract.disabled = true;
    btnExtract.textContent = "Extracting...";
    try {
      const endpoint = state.activeCardId ? `/api/characters/${state.activeCardId}/timeline` : "/api/continue-arc";
      const res = await apiPost(endpoint, {
        character: state.character,
        autoExtract: true,
        provider: state.provider,
      });
      if (res && res.timeline) {
        if (!state.character.extensions) state.character.extensions = {};
        if (!state.character.extensions.chargenui) state.character.extensions.chargenui = {};
        state.character.extensions.chargenui.timeline = res.timeline;
        renderTimelineList();
        showIpcToast(`Extracted ${res.timeline.length} narrative beats!`, "success");
      }
    } catch (err) {
      alert("Failed extracting beats: " + err.message);
    } finally {
      btnExtract.disabled = false;
      btnExtract.textContent = "Auto-Extract Beats";
    }
  });

  btnAddBeat?.addEventListener("click", () => {
    const summary = prompt("Enter story beat summary:");
    if (!summary) return;
    const marker = prompt("Temporal marker (e.g. Chapter 2, 6 months later):") || "Next Beat";
    if (!state.character.extensions) state.character.extensions = {};
    if (!state.character.extensions.chargenui) state.character.extensions.chargenui = {};
    if (!Array.isArray(state.character.extensions.chargenui.timeline)) {
      state.character.extensions.chargenui.timeline = [];
    }
    state.character.extensions.chargenui.timeline.push({
      id: `evt_${Date.now()}`,
      temporalMarker: marker,
      summary,
    });
    renderTimelineList();
    showIpcToast("Added timeline beat!", "success");
  });

  btnContinueArc?.addEventListener("click", async () => {
    syncUIToState();
    if (!assertProviderConfigured()) return;
    const timeAdvance = timeAdvanceInput?.value?.trim() || "Three months later";
    const focusPlot = focusPlotInput?.value?.trim() || "";

    btnContinueArc.disabled = true;
    btnContinueArc.innerHTML = `<span>⏳ Continuing Story Arc...</span>`;

    try {
      const endpoint = state.activeCardId ? `/api/characters/${state.activeCardId}/continue-arc` : "/api/continue-arc";
      const res = await apiPost(endpoint, {
        character: state.character,
        timeAdvance,
        focusPlot,
        provider: state.provider,
      });

      if (res && res.updatedCharacter) {
        state.character = res.updatedCharacter;
        syncStateToUI();
        renderTimelineList();
        showIpcToast(`Advanced story arc forward (${timeAdvance})!`, "success");
      }
    } catch (err) {
      alert("Failed continuing arc: " + err.message);
    } finally {
      btnContinueArc.disabled = false;
      btnContinueArc.innerHTML = `<span>⏩ Advance Story Arc & Generate Beat</span>`;
    }
  });

  // Render on initial load
  renderTimelineList();
}

// =========================================================================
// 3. Git-Like Character Branching
// =========================================================================
export function initBranchesUI() {
  const branchSelect = document.getElementById("branch-select");
  const btnCheckout = document.getElementById("btn-branch-checkout");
  const newBranchInput = document.getElementById("branch-new-name");
  const btnCreateBranch = document.getElementById("btn-branch-create");
  const commitMsgInput = document.getElementById("branch-commit-msg");
  const btnCommit = document.getElementById("btn-branch-commit");
  const btnDiff = document.getElementById("btn-branch-diff");
  const btnMerge = document.getElementById("btn-branch-merge");
  const historyContainer = document.getElementById("branch-history-container");

  if (!btnCommit) return;

  async function loadBranchesInfo() {
    if (!state.activeCardId) {
      if (branchSelect) branchSelect.innerHTML = `<option value="main">main (save to library first)</option>`;
      return;
    }
    try {
      const res = await apiGet(`/api/characters/${state.activeCardId}/branches`);
      if (res && res.branches && branchSelect) {
        branchSelect.innerHTML = res.branches.map(b => `
          <option value="${escapeHtml(b.name)}" ${b.name === res.currentBranch ? "selected" : ""}>
            ${escapeHtml(b.name)} (${b.commitId.slice(0, 7)})
          </option>
        `).join("");
      }
      if (res && res.commits && historyContainer) {
        const commitList = Object.values(res.commits);
        historyContainer.innerHTML = commitList.map(c => `
          <div style="background: var(--bg-card); border-left: 2px solid #f59e0b; padding: 4px 6px; font-size: 10px;">
            <div style="font-weight:700; color:#fde68a;">${escapeHtml(c.message)}</div>
            <div style="color:var(--text-dim);">${c.id.slice(0, 7)} • ${new Date(c.timestamp).toLocaleTimeString()}</div>
          </div>
        `).join("");
      }
    } catch {}
  }

  btnCreateBranch?.addEventListener("click", async () => {
    if (!state.activeCardId) {
      alert("Please save this card to Library first before creating branches.");
      return;
    }
    const name = newBranchInput?.value?.trim();
    if (!name) {
      alert("Please enter a new branch name (e.g. dark-au).");
      return;
    }
    try {
      const res = await apiPost(`/api/characters/${state.activeCardId}/branches`, { name });
      if (res.success) {
        showIpcToast(`Created branch '${name}'!`, "success");
        if (newBranchInput) newBranchInput.value = "";
        await loadBranchesInfo();
      }
    } catch (err) {
      alert("Failed creating branch: " + err.message);
    }
  });

  btnCheckout?.addEventListener("click", async () => {
    if (!state.activeCardId) return;
    const target = branchSelect?.value;
    if (!target) return;
    try {
      const res = await apiPost(`/api/characters/${state.activeCardId}/checkout`, { target });
      if (res.character) {
        state.character = res.character;
        syncStateToUI();
        showIpcToast(`Switched to branch '${target}'!`, "success");
        await loadBranchesInfo();
      }
    } catch (err) {
      alert("Checkout failed: " + err.message);
    }
  });

  btnCommit?.addEventListener("click", async () => {
    syncUIToState();
    if (!state.activeCardId) {
      alert("Please save this card to Library first before creating commits.");
      return;
    }
    const message = commitMsgInput?.value?.trim() || "Snapshot update";
    try {
      const res = await apiPost(`/api/characters/${state.activeCardId}/commits`, {
        message,
        character: state.character,
      });
      if (res.success) {
        showIpcToast(`Committed: "${message}"`, "success");
        if (commitMsgInput) commitMsgInput.value = "";
        await loadBranchesInfo();
      }
    } catch (err) {
      alert("Commit failed: " + err.message);
    }
  });

  btnDiff?.addEventListener("click", async () => {
    if (!state.activeCardId) {
      alert("Please save this card to Library first before comparing branches.");
      return;
    }
    const fromBranch = branchSelect?.value;
    const toBranch = prompt(`Enter branch to compare with '${fromBranch}' (or leave blank to compare against active card):`);
    try {
      const url = `/api/characters/${state.activeCardId}/diff?from=${encodeURIComponent(fromBranch)}${toBranch ? `&to=${encodeURIComponent(toBranch)}` : ""}`;
      const res = await apiGet(url);
      if (res && res.diff) {
        const diffText = JSON.stringify(res.diff, null, 2);
        alert(`Diff against ${toBranch || "active state"}:\n\n` + diffText.slice(0, 1500) + (diffText.length > 1500 ? "\n...(truncated)" : ""));
      } else {
        showIpcToast("No differences detected between branches.", "info");
      }
    } catch (err) {
      alert("Diff failed: " + err.message);
    }
  });

  btnMerge?.addEventListener("click", async () => {
    if (!state.activeCardId) return;
    const sourceBranch = prompt("Enter source branch to merge into current:");
    if (!sourceBranch) return;
    try {
      const res = await apiPost(`/api/characters/${state.activeCardId}/merge`, { sourceBranch });
      if (res.mergedCharacter) {
        state.character = res.mergedCharacter;
        syncStateToUI();
        showIpcToast(`Merged '${sourceBranch}' successfully!`, "success");
        await loadBranchesInfo();
      }
    } catch (err) {
      alert("Merge failed: " + err.message);
    }
  });

  loadBranchesInfo();
}

// =========================================================================
// 4. Asset Pipeline Plugins & ComfyUI Generation
// =========================================================================
export function initAssetPipelineUI() {
  const btnGenerateAssets = document.getElementById("btn-generate-assets");
  const chkExpressions = document.getElementById("asset-chk-expressions");
  const chkOutfits = document.getElementById("asset-chk-outfits");
  const chkAtlas = document.getElementById("asset-chk-atlas");
  const chkDispatchComfy = document.getElementById("asset-chk-dispatch-comfy");
  const feedbackEl = document.getElementById("asset-gen-feedback");

  if (!btnGenerateAssets) return;

  btnGenerateAssets.addEventListener("click", async () => {
    syncUIToState();
    if (!state.character?.name) {
      alert("Please load or generate a character first!");
      return;
    }

    const assetTypes = [];
    if (chkExpressions?.checked) assetTypes.push("expression_sheet");
    if (chkOutfits?.checked) assetTypes.push("outfit_variants");
    if (chkAtlas?.checked) assetTypes.push("texture_atlas");

    if (assetTypes.length === 0) {
      alert("Please check at least one asset type to generate.");
      return;
    }

    btnGenerateAssets.disabled = true;
    btnGenerateAssets.innerHTML = `<span>⏳ Synthesizing Asset Packs...</span>`;
    if (feedbackEl) feedbackEl.textContent = "Running asset pipeline plugins and formatting diffusion prompts...";

    try {
      const endpoint = state.activeCardId ? `/api/characters/${state.activeCardId}/generate-assets` : "/api/characters/generate-assets";
      const res = await apiPost(endpoint, {
        assetTypes,
        dispatchToComfyClient: chkDispatchComfy?.checked ?? true,
        saveToQueue: true,
      });

      if (res && res.success) {
        showIpcToast(`Generated ${res.totalAssetsGenerated} asset prompts!`, "success");
        if (feedbackEl) {
          feedbackEl.innerHTML = `
            <div style="color:var(--accent-emerald); font-weight:700;">✓ Generated ${res.totalAssetsGenerated} asset prompts!</div>
            <div style="color:var(--text-muted); font-size:10px;">${res.queuedToComfyClient ? "⚡ Queued directly to ComfyClient socket!" : "📁 Saved to Image Queue."}</div>
          `;
        }
      }
    } catch (err) {
      alert("Asset generation failed: " + err.message);
      if (feedbackEl) feedbackEl.textContent = "Generation failed: " + err.message;
    } finally {
      btnGenerateAssets.disabled = false;
      btnGenerateAssets.innerHTML = `<span>🎨 Generate Character Asset Packs</span>`;
    }
  });
}
