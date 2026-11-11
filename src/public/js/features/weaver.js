// Reference Weaver Psychometric Workshop & Interactive Interview Flow
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast, notifyIpcActiveCard } from "./ipc.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { updateActiveCardBadge } from "./library.js";
import { updateLlmCacheBadge } from "../utils/provider.js";

// ==========================================
// Weaver Guided Interview Workshop Logic
// ==========================================
async function openWeaverInterviewModal(customInfluence) {
  if (!assertProviderConfigured()) return;

  const concept = el.genConcept.value.trim();
  if (!concept) {
    alert("Please provide a concept or seed idea for Weaver to analyze!");
    return;
  }

  el.modalWeaverInterview.classList.remove("hidden");
  el.weaverInterviewLoading.classList.remove("hidden");
  el.weaverInterviewContent.classList.add("hidden");
  el.btnWeaverSubmitForge.disabled = true;

  try {
    const payload = {
      concept,
      genre: el.genGenre.value,
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone.value,
      nsfw: el.genNsfw.checked,
      botMode: state.botMode || "single",
      influence: typeof customInfluence === "string" && customInfluence.trim() ? customInfluence.trim() : undefined,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/interview-questions", payload);
    state.weaverInterview = {
      questions: res.questions || [],
      preliminaryVision: res.preliminaryVision || "",
      lastInfluence: payload.influence || "",
      answers: {},
    };

    renderWeaverInterviewQuestions();
    el.weaverInterviewLoading.classList.add("hidden");
    el.weaverInterviewContent.classList.remove("hidden");
    el.btnWeaverSubmitForge.disabled = false;
  } catch (err) {
    alert("Failed to formulate interview questions: " + err.message);
    el.modalWeaverInterview.classList.add("hidden");
  }
}

export function renderWeaverInterviewQuestions() {
  if (!state.weaverInterview) return;
  const { questions, preliminaryVision } = state.weaverInterview;

  el.weaverVisionText.textContent = preliminaryVision || "A complex persona taking shape through your choices.";

  el.weaverQuestionsList.innerHTML = questions
    .map((q, idx) => {
      const qNum = idx + 1;
      const recIdx = q.recommendedOptionIndex || 0;
      return `
        <div class="weaver-question-card" data-qid="${escapeHtml(q.id)}" data-category="${escapeHtml(q.category)}" data-question="${escapeHtml(q.question)}" data-idx="${idx}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
            <div class="weaver-question-category">[${qNum}/${questions.length}] ${escapeHtml(q.category)}</div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" class="btn btn-sm btn-weaver-reroll-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="padding: 2px 8px; font-size: 11px; color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.4); background: rgba(192, 132, 252, 0.1);" title="Generate 3 fresh alternative options for this question">
                <span>🎲 Reroll</span>
              </button>
              <button type="button" class="btn btn-sm btn-weaver-toggle-influence" data-idx="${idx}" style="padding: 2px 8px; font-size: 11px; color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1);" title="Influence / steer the rerolled choices for this question">
                <span>🎯 Influence</span>
              </button>
              <button type="button" class="btn btn-sm btn-weaver-remove-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="padding: 2px 7px; font-size: 11px; color: #f87171; border: 1px solid rgba(248, 113, 113, 0.35); background: rgba(248, 113, 113, 0.1);" title="Remove / skip this question">
                <span>✕</span>
              </button>
              <span style="font-size: 10px; color: var(--text-dim);">Pick an option or type below</span>
            </div>
          </div>
          <div class="weaver-question-text">${escapeHtml(q.question)}</div>

          <!-- Collapsible Influence Drawer for Rerolling Choices -->
          <div class="weaver-influence-drawer hidden" id="weaver-influence-drawer-${idx}" style="margin: 6px 0 8px; padding: 8px 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 11px; font-weight: 600; color: #7dd3fc; display: flex; align-items: center; gap: 4px;">
                <span>🎯</span> Influence Reroll Direction
              </span>
              <span style="font-size: 10px; color: var(--text-dim);">Steers all 3 new choices toward your intent</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <input type="text" class="weaver-influence-input form-input" data-idx="${idx}" placeholder="e.g. 'darker taboo', 'magical curse', 'extreme obedience', 'slow-burn romance'..." style="font-size: 11px; padding: 4px 8px; flex: 1; height: 28px;">
              <button type="button" class="btn btn-sm btn-weaver-reroll-q" data-idx="${idx}" data-qid="${escapeHtml(q.id)}" style="font-size: 11px; padding: 2px 10px; background: #0284c7; color: #fff; border: none; white-space: nowrap; font-weight: 600; height: 28px;">
                <span>⚡ Reroll with Influence</span>
              </button>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Dark taboo, extreme psychological friction, forbidden temptation">⛓️ Taboo</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Dominant authority, command protocols, intoxicating psychological control">👑 Dominant</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Surrender of control, trembling vulnerability, obedient submissiveness">🥀 Submissive</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Visceral physical craving, intense romantic longing, slow-burn tension">🔥 Romance</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Supernatural curse, eldritch taint, mysterious ancient artifact">🔮 Curse</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Cold cynicism, calculating detachment, sharp dry sarcasm">🧠 Cynical</span>
              <span class="steering-chip weaver-steer-chip" data-idx="${idx}" data-steer="Lethal combat threat, violent history, dangerous predator instinct">🗡️ Lethal</span>
            </div>
          </div>

          <div class="weaver-options-row" id="weaver-options-row-${idx}">
            ${(q.options || [])
              .map((opt, oIdx) => {
                const isRec = oIdx === recIdx;
                return `
                  <button type="button" class="weaver-option-btn ${isRec ? "selected" : ""}" data-qid="${escapeHtml(q.id)}" data-opt="${escapeHtml(opt)}" data-oidx="${oIdx}">
                    <span>${isRec ? "⭐ " : ""}${escapeHtml(opt)}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
          <div style="margin-top: 4px;">
            <input type="text" class="weaver-custom-answer-input" data-qid="${escapeHtml(q.id)}" placeholder="Selected answer or custom write-in..." value="${escapeHtml(q.options?.[recIdx] || "")}">
          </div>
        </div>
      `;
    })
    .join("");
}

function autoFillWeaverIntuition() {
  if (!state.weaverInterview?.questions) return;
  state.weaverInterview.questions.forEach((q) => {
    const card = document.querySelector(`.weaver-question-card[data-qid="${q.id}"]`);
    if (!card) return;
    const input = card.querySelector(".weaver-custom-answer-input");
    const recIdx = q.recommendedOptionIndex || 0;
    const recOption = q.options[recIdx] || q.options[0] || "";

    // Clear previous option selections
    card.querySelectorAll(".weaver-option-btn").forEach((b) => b.classList.remove("selected"));

    // Select the recommended button
    const recBtn = card.querySelector(`.weaver-option-btn[data-oidx="${recIdx}"]`);
    if (recBtn) recBtn.classList.add("selected");

    if (input) {
      input.value = recOption;
    }
  });
}

async function submitWeaverForge() {
  if (!state.weaverInterview) return;
  const concept = el.genConcept.value.trim();
  if (!concept) return;

  // Gather answers from inputs
  const cards = document.querySelectorAll(".weaver-question-card");
  const answers = [];
  cards.forEach((card) => {
    const qid = card.getAttribute("data-qid");
    const category = card.getAttribute("data-category") || "";
    const question = card.getAttribute("data-question") || "";
    const input = card.querySelector(".weaver-custom-answer-input");
    const val = input ? input.value.trim() : "";
    if (val) {
      answers.push({
        questionId: qid,
        category,
        question,
        selectedAnswer: val,
      });
    }
  });

  const btn = el.btnWeaverSubmitForge;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Synthesizing Bible &amp; Forging Card...</span>`;

  try {
    const includeLorebook = !!document.getElementById("weaver-include-lorebook")?.checked;
    const payload = {
      concept,
      genre: el.genGenre.value,
      storyArc: el.genStoryArc ? el.genStoryArc.value.trim() : undefined,
      minAltGreetings: el.genMinAlts ? (parseInt(el.genMinAlts.value, 10) || 3) : 3,
      era: el.genEra ? el.genEra.value.trim() : undefined,
      themes: state.selectedThemes || [],
      tone: el.genTone.value,
      format: el.genFormat.value,
      nsfw: el.genNsfw.checked,
      botMode: state.botMode || "single",
      enableWebSearch: el.genWebSearch.checked,
      searchQuery: el.genSearchQuery.value.trim() || concept,
      includeHeadcanons: el.genIncludeHeadcanons ? el.genIncludeHeadcanons.checked : true,
      interviewAnswers: answers,
      includeLorebook,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/forge", payload);
    if (res.character) {
      const avatar = state.weaverInterview?.avatarImageBase64 || state.character.avatar;
      state.character = { ...state.character, ...res.character, avatar };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Forged via Weaver Workshop: ${state.character.name}`);
      updateLlmCacheBadge();
      el.modalWeaverInterview.classList.add("hidden");
      alert(`🎉 Successfully forged "${state.character.name}" via Weaver Workshop!`);
    }
  } catch (err) {
    alert("Weaver forge failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>⚡ Synthesize Bible &amp; Forge Final Card</span>`;
  }
}

// Event Listeners for Weaver Workshop
el.btnWeaverInterview?.addEventListener("click", () => openWeaverInterviewModal());
el.btnCloseWeaverInterview?.addEventListener("click", () => el.modalWeaverInterview?.classList.add("hidden"));
el.btnWeaverCancel?.addEventListener("click", () => el.modalWeaverInterview?.classList.add("hidden"));
el.btnWeaverAutofill?.addEventListener("click", autoFillWeaverIntuition);
el.btnWeaverAskMore?.addEventListener("click", async () => {
  if (!state.weaverInterview?.questions) return;
  const concept = el.genConcept.value.trim();
  if (!concept) return;

  const btn = el.btnWeaverAskMore;
  const origText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> <span>Asking Weaver...</span>`;

  try {
    const payload = {
      concept,
      genre: el.genGenre.value,
      themes: state.selectedThemes || [],
      tone: el.genTone.value.trim(),
      nsfw: el.genNsfw.checked,
      era: el.genEra.value.trim(),
      botMode: el.genBotMode ? el.genBotMode.value : "single",
      existingQuestions: state.weaverInterview.questions,
      provider: state.provider,
    };

    const res = await apiPost("/api/weaver/interview-questions", payload);
    if (res && Array.isArray(res.questions)) {
      state.weaverInterview.questions = res.questions;
      if (res.preliminaryVision) {
        state.weaverInterview.preliminaryVision = res.preliminaryVision;
      }
      renderWeaverInterviewQuestions();
    }
  } catch (err) {
    alert("Failed to ask more questions: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
});
el.btnWeaverSubmitForge?.addEventListener("click", submitWeaverForge);
document.getElementById("btn-weaver-reroll-all")?.addEventListener("click", () => openWeaverInterviewModal());
document.getElementById("btn-weaver-influence-all")?.addEventListener("click", () => {
  const currentInfluence = state.weaverInterview?.lastInfluence || "";
  const steer = prompt(
    "🎯 How should Weaver steer the interview questions?\n\n(e.g., 'Focus on master-servant power exchange, dark taboo secrets, and fantasy curse'):",
    currentInfluence
  );
  if (steer !== null) {
    openWeaverInterviewModal(steer.trim());
  }
});

// Delegate option button clicks & per-question rerolls inside Weaver interview
el.weaverQuestionsList?.addEventListener("click", async (e) => {
  // Toggle influence drawer for this question
  const toggleBtn = e.target.closest(".btn-weaver-toggle-influence");
  if (toggleBtn) {
    const idx = toggleBtn.getAttribute("data-idx");
    const drawer = document.getElementById(`weaver-influence-drawer-${idx}`);
    if (drawer) {
      drawer.classList.toggle("hidden");
      if (!drawer.classList.contains("hidden")) {
        const inp = drawer.querySelector(".weaver-influence-input");
        if (inp) inp.focus();
      }
    }
    return;
  }

  // Quick steer chip clicked inside influence drawer
  const steerChip = e.target.closest(".weaver-steer-chip");
  if (steerChip) {
    const idx = steerChip.getAttribute("data-idx");
    const steer = steerChip.getAttribute("data-steer") || steerChip.textContent.trim();
    const drawer = document.getElementById(`weaver-influence-drawer-${idx}`);
    const inp = drawer?.querySelector(".weaver-influence-input");
    if (inp) {
      inp.value = steer;
      inp.focus();
    }
    return;
  }

  // 1. Reroll Choices for a single question
  const rerollBtn = e.target.closest(".btn-weaver-reroll-q");
  if (rerollBtn) {
    const idx = parseInt(rerollBtn.getAttribute("data-idx") || "0", 10);
    const q = state.weaverInterview?.questions?.[idx];
    if (!q) return;

    const card = rerollBtn.closest(".weaver-question-card");
    const influenceInput = card?.querySelector(".weaver-influence-input");
    const influenceVal = influenceInput ? influenceInput.value.trim() : "";

    rerollBtn.disabled = true;
    const originalHtml = rerollBtn.innerHTML;
    rerollBtn.innerHTML = `<span class="spinner" style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-right:4px;"></span><span>Rerolling...</span>`;

    try {
      const res = await fetch("/api/weaver/reroll-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: el.genConcept?.value?.trim() || "",
          category: q.category,
          question: q.question,
          currentOptions: q.options || [],
          genre: el.genGenre?.value || "Fiction",
          tone: el.genTone?.value || "",
          nsfw: el.genNsfw?.checked || false,
          influence: influenceVal || undefined,
          provider: state.provider,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Reroll failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.options)) {
        q.options = data.options;
        q.recommendedOptionIndex = data.recommendedOptionIndex || 0;

        // Re-render this question's options row
        const optionsRow = document.getElementById(`weaver-options-row-${idx}`);
        if (optionsRow) {
          optionsRow.innerHTML = q.options.map((opt, oIdx) => {
            const isRec = oIdx === q.recommendedOptionIndex;
            return `
              <button type="button" class="weaver-option-btn ${isRec ? "selected" : ""}" data-qid="${escapeHtml(q.id)}" data-opt="${escapeHtml(opt)}" data-oidx="${oIdx}">
                <span>${isRec ? "⭐ " : ""}${escapeHtml(opt)}</span>
              </button>
            `;
          }).join("");
        }

        // Update custom answer input with new recommended option
        const card = rerollBtn.closest(".weaver-question-card");
        const input = card?.querySelector(".weaver-custom-answer-input");
        if (input) {
          input.value = q.options[q.recommendedOptionIndex] || q.options[0] || "";
        }
      }
    } catch (err) {
      alert("Failed to reroll choices: " + err.message);
    } finally {
      rerollBtn.disabled = false;
      rerollBtn.innerHTML = originalHtml;
    }
    return;
  }

  // 1.5 Remove / dismiss a question
  const removeBtn = e.target.closest(".btn-weaver-remove-q");
  if (removeBtn) {
    const idx = parseInt(removeBtn.getAttribute("data-idx") || "0", 10);
    if (state.weaverInterview?.questions && idx >= 0 && idx < state.weaverInterview.questions.length) {
      state.weaverInterview.questions.splice(idx, 1);
      renderWeaverInterviewQuestions();
    }
    return;
  }

  // 2. Select option choice
  const optBtn = e.target.closest(".weaver-option-btn");
  if (!optBtn) return;
  const qid = optBtn.getAttribute("data-qid");
  const optText = optBtn.getAttribute("data-opt");
  const card = optBtn.closest(".weaver-question-card");
  if (!card) return;

  card.querySelectorAll(".weaver-option-btn").forEach((b) => b.classList.remove("selected"));
  optBtn.classList.add("selected");

  const input = card.querySelector(".weaver-custom-answer-input");
  if (input) {
    input.value = optText;
  }
});

// Sync custom text typing with option button highlight
el.weaverQuestionsList?.addEventListener("input", (e) => {
  const input = e.target.closest(".weaver-custom-answer-input");
  if (!input) return;
  const card = input.closest(".weaver-question-card");
  if (!card) return;
  const val = input.value.trim();

  // Highlight option if it matches typed text, otherwise remove all highlights
  card.querySelectorAll(".weaver-option-btn").forEach((b) => {
    const optText = b.getAttribute("data-opt")?.trim();
    if (optText && optText === val) {
      b.classList.add("selected");
    } else {
      b.classList.remove("selected");
    }
  });
});


