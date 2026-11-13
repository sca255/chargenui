// Agent Mode Co-Pilot & Studio Fullscreen Workspace
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiPost } from "../core/api.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";
import { recordSnapshot, escapeHtml } from "../utils/diff.js";
import { showIpcToast, notifyIpcActiveCard } from "./ipc.js";
import { assertProviderConfigured } from "../utils/provider.js";
import { renderAltGreetings } from "./alt-greetings.js";
import { estimateTokens } from "../utils/macros.js";
import { updateActiveCardBadge, saveActiveCardToLibrary } from "./library.js";

// --- Agent Mode Co-Pilot Full Chat Implementation ---

let activeTargetedSelection = null;

export function renderPinnedRules() {
  const rules = state.agentPinnedRules || [];
  if (el.agentPinnedCountBadge) el.agentPinnedCountBadge.textContent = String(rules.length);
  if (el.agentStudioPinnedCount) el.agentStudioPinnedCount.textContent = String(rules.length);

  const emptyHtml = `<span id="agent-pinned-empty-hint" style="font-size: 10px; color: var(--text-muted); font-style: italic;">No pinned rules yet. Pin persistent constraints like "Never apologize", "Keep dialogue under 2 sentences", or "Enforce gothic dialect".</span>`;
  const chipsHtml = rules.length === 0
    ? emptyHtml
    : rules
        .map(
          (r, idx) => `
          <span class="agent-pinned-chip">
            <span>${escapeHtml(r)}</span>
            <span class="agent-pinned-chip-remove" data-rule-index="${idx}" title="Unpin rule">×</span>
          </span>
        `
        )
        .join("");

  if (el.agentPinnedChips) el.agentPinnedChips.innerHTML = chipsHtml;
  if (el.agentStudioPinnedChips) el.agentStudioPinnedChips.innerHTML = chipsHtml;
}

export function initTargetedDoctorSelection() {
  const fields = [
    { el: el.fieldDesc, name: "description" },
    { el: el.fieldPers, name: "personality" },
    { el: el.fieldScenario, name: "scenario" },
    { el: el.fieldFirstMes, name: "first_mes" },
    { el: el.fieldMesExample, name: "mes_example" },
    { el: el.fieldPostHistory, name: "post_history_instructions" },
  ];

  const pill = el.floatingDoctorPill;
  if (!pill) return;

  function checkSelection(e, fieldName, targetEl) {
    const text = targetEl.value.substring(targetEl.selectionStart, targetEl.selectionEnd).trim();

    if (text.length >= 8) {
      activeTargetedSelection = {
        field: fieldName,
        selectedText: text,
        start: targetEl.selectionStart,
        end: targetEl.selectionEnd,
        element: targetEl,
      };

      const rect = targetEl.getBoundingClientRect();
      pill.style.top = `${window.scrollY + rect.bottom - 36}px`;
      pill.style.left = `${window.scrollX + rect.right - 230}px`;
      pill.classList.remove("hidden");
    } else {
      setTimeout(() => {
        if (!activeTargetedSelection || targetEl.selectionStart === targetEl.selectionEnd) {
          pill.classList.add("hidden");
        }
      }, 250);
    }
  }

  fields.forEach(({ el: targetEl, name }) => {
    if (!targetEl) return;
    targetEl.addEventListener("mouseup", (e) => checkSelection(e, name, targetEl));
    targetEl.addEventListener("keyup", (e) => checkSelection(e, name, targetEl));
  });

  pill.addEventListener("click", () => {
    if (!activeTargetedSelection) return;
    pill.classList.add("hidden");

    // Switch to tab-agent
    document.querySelector('.nav-tab[data-tab="tab-agent"]')?.click();

    // Set scope to targeted field
    if (el.agentTargetScope) {
      el.agentTargetScope.value = activeTargetedSelection.field;
    }

    if (el.agentChatInput) {
      el.agentChatInput.value = `Doctor this selected snippet from ${activeTargetedSelection.field}: "${activeTargetedSelection.selectedText}". Refine it to be more natural, vivid, and punchy.`;
      el.agentChatInput.focus();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (e.target !== pill && !pill.contains(e.target)) {
      pill.classList.add("hidden");
    }
  });
}

function runPrescriptionCheckup() {
  syncUIToState();
  const char = state.character;
  const issues = [];

  // Check 1: Thesaurus / Spock Jargon
  const persAndMes = `${char.personality || ""} ${char.mes_example || ""}`.toLowerCase();
  const roboticTerms = [
    "statistical anomaly",
    "mathematically unsound",
    "nutrient density",
    "altering my trajectory",
    "inefficiency of your chaos",
    "empirical evidence",
    "probability matrix",
    "computational",
    "cognitive faculty",
  ];
  const foundRobotic = roboticTerms.filter((t) => persAndMes.includes(t));
  if (foundRobotic.length > 0) {
    issues.push({
      id: "jargon",
      severity: "high",
      title: `Thesaurus / Spock Syndrome Detected (${foundRobotic.slice(0, 3).join(", ")})`,
      explanation: "Character dialogue or personality uses clinical pseudo-academic vocabulary for ordinary domestic actions, breaking conversational immersion.",
      prompt: `Purge all robotic, academic, or clinical jargon (such as ${foundRobotic.join(", ")}). Rewrite personality and dialogue examples so she speaks with natural contractions, razor wit, and realistic spoken cadence.`,
      buttonText: "🩺 Fix: Naturalize Spoken Cadence",
    });
  }

  // Check 2: {{user}} Puppeteering
  const greetings = `${char.first_mes || ""} ${(char.alternate_greetings || []).join(" ")}`;
  const puppeteerMatches = greetings.match(/{{user}}\s+(feels|thinks|gasps|whispers|steps back|shivers|nodded|replied|answers|sighs|realizes|hesitates)/gi);
  if (puppeteerMatches && puppeteerMatches.length > 0) {
    issues.push({
      id: "puppeteering",
      severity: "high",
      title: `{{user}} Puppeteering in Opening Messages (${puppeteerMatches.length} instances)`,
      explanation: "The character's greeting narrates {{user}}'s actions, feelings, or dialogue, violating player agency.",
      prompt: "Remove all instances of {{user}} puppeteering from first_mes and alternate_greetings. Keep third-person limited perspective strictly focused on {{char}}'s actions and speech.",
      buttonText: "🩺 Fix: Remove {{user}} Puppeteering",
    });
  }

  // Check 3: Token Bloat in Description
  const descTokens = estimateTokens(char.description || "");
  if (descTokens > 750) {
    issues.push({
      id: "token_bloat",
      severity: "medium",
      title: `Description Token Bloat (~${descTokens} tokens)`,
      explanation: "Character description exceeds 750 tokens with potential purple prose or redundant exposition.",
      prompt: `Optimize and condense description by ~30% from ${descTokens} tokens to ~450 tokens without sacrificing any core contradictions, physical tells, or sensory anchors.`,
      buttonText: "🩺 Fix: Compress Description (~30%)",
    });
  }

  // Check 4: Missing Spoken Dialogue Contractions
  if (char.first_mes && !/don't|can't|it's|won't|i'm|you're|didn't|doesn't/i.test(char.first_mes)) {
    issues.push({
      id: "no_contractions",
      severity: "medium",
      title: "Stiff / Formal Dialogue Cadence (No Contractions)",
      explanation: "Opening message has zero natural contractions (e.g. 'do not', 'cannot'), which can make characters sound like reading textbooks.",
      prompt: "Inject natural contractions (don't, can't, it's, won't) and brief reactive pauses into first_mes and dialogue examples to make her speech sound authentically spoken aloud.",
      buttonText: "🩺 Fix: Inject Natural Contractions",
    });
  }

  // Check 5: Interpersonal Friction & Central Contradiction
  if (char.personality && !/contradiction|friction|conflict|vulnerability|underneath|secretly|guard|tension/i.test(char.personality)) {
    issues.push({
      id: "friction",
      severity: "low",
      title: "Flat Character Tension (Low Interpersonal Friction)",
      explanation: "Personality lacks an explicit internal contradiction or emotional stake to sustain long-term roleplay.",
      prompt: "Heighten the central contradiction in her personality: give her a sharp internal tension between her public role/facade and a private vulnerability or craving.",
      buttonText: "🩺 Fix: Elevate Psychological Tension",
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "clean",
      severity: "low",
      title: "Clean Baseline Health",
      explanation: "No major clinical jargon or puppeteering detected. You can further polish sensory tells or amplify scene stakes.",
      prompt: "Add vivid sensory tells, involuntary micro-expressions, and physical mannerisms to personality and first message to make scenes hyper-vivid.",
      buttonText: "✨ Enhance Sensory Tells & Stakes",
    });
  }

  const checkupMessage = {
    role: "assistant",
    content: `### 🩺 Card Doctor Diagnostic Report for **${escapeHtml(char.name || "Character")}**\n\nI evaluated this card for narrative health, voice cadence, and macro integrity. Found **${issues.length} targeted recommendation${issues.length !== 1 ? "s" : ""}**:`,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    prescriptions: issues,
  };

  state.agentChatHistory.push(checkupMessage);
  renderAgentChatStream();
}

export function renderAgentChatStream() {
  if (!el.agentChatStream && !el.agentStudioStream) return;

  // Persist agent chat to localStorage so it survives page reloads / restarts
  try {
    const toPersist = (state.agentChatHistory || []).filter(m => !m.isPending);
    localStorage.setItem("chargen_agent_chat_history", JSON.stringify(toPersist));
  } catch {}

  if (!state.agentChatHistory || state.agentChatHistory.length === 0) {
    const charName = state.character?.name || "your character";
    const emptyChatHtml = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 12px; font-size: 11px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">
          <span>🤖</span> <span>Agent Co-Pilot Ready</span>
        </div>
        <div style="color: var(--text-muted); line-height: 1.4;">
          I am your multi-turn character engineering agent. Tell me what to modify, critique, rewrite, or brainstorm for <strong style="color: var(--text-main);">${escapeHtml(charName)}</strong>.
          <div style="margin-top: 6px; color: var(--text-dim); font-size: 10px;">
            💡 <em>Tip: Click a directive chip above or highlight text in the editor to doctor specific snippets. Use "Review Diffs" to inspect Before/After changes before accepting!</em>
          </div>
        </div>
      </div>
    `;
    if (el.agentChatStream) el.agentChatStream.innerHTML = emptyChatHtml;
    if (el.agentStudioStream) {
      el.agentStudioStream.innerHTML = emptyChatHtml.replace(
        "Agent Co-Pilot Ready",
        "Agent Co-Pilot Studio Ready",
      );
      el.agentStudioStream.scrollTop = el.agentStudioStream.scrollHeight;
    }
    return;
  }

  const historyHtml = state.agentChatHistory
    .map((msg, index) => {
      const isUser = msg.role === "user";
      if (isUser) {
        return `
        <div style="align-self: flex-end; max-width: 85%; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <div style="font-size: 10px; color: var(--text-dim);">${escapeHtml(msg.time || "User")}</div>
          <div style="background: rgba(99, 102, 241, 0.18); border: 1px solid rgba(99, 102, 241, 0.4); color: var(--text-main); border-radius: 10px 10px 2px 10px; padding: 8px 12px; font-size: 12px; line-height: 1.4; word-break: break-word;">
            ${escapeHtml(msg.content)}
          </div>
        </div>
      `;
      }

      // 1. Proposed Changes Review Card (Granular Cherry-Pick Diffs)
      let proposalsHtml = "";
      if (msg.proposals && msg.proposals.length > 0) {
        const hasPending = msg.proposals.some((p) => p.status === "pending");
        proposalsHtml = `
        <div class="agent-proposal-card">
          <div class="agent-proposal-header">
            <span style="font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 4px;">
              <span>🎛️ Proposed Changes (${msg.proposals.length} field${msg.proposals.length > 1 ? "s" : ""})</span>
            </span>
            ${
              hasPending
                ? `
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-xs btn-success btn-accept-all-proposals" data-turn-idx="${index}" type="button">✓ Accept All</button>
                <button class="btn btn-xs btn-danger btn-discard-all-proposals" data-turn-idx="${index}" type="button">✕ Discard All</button>
              </div>
            `
                : `<span style="font-size: 10px; color: var(--text-dim);">Reviewed</span>`
            }
          </div>
          <div class="agent-diff-list">
            ${msg.proposals
              .map((prop, propIdx) => {
                const isPending = prop.status === "pending";
                const isAccepted = prop.status === "accepted";
                const beforeText = typeof prop.before === "string" ? prop.before : JSON.stringify(prop.before, null, 2);
                const afterText = typeof prop.after === "string" ? prop.after : JSON.stringify(prop.after, null, 2);
                const beforeTokens = estimateTokens(beforeText || "");
                const afterTokens = estimateTokens(afterText || "");
                const diffVal = afterTokens - beforeTokens;
                const tokenDiffBadge =
                  diffVal > 0
                    ? `<span style="color: #f59e0b; font-size: 10px; font-weight:600;">(+${diffVal} tok)</span>`
                    : diffVal < 0
                    ? `<span style="color: #10b981; font-size: 10px; font-weight:600;">(${diffVal} tok)</span>`
                    : `<span style="color: var(--text-dim); font-size: 10px;">(0 tok)</span>`;

                return `
                <div class="agent-diff-row status-${prop.status || "pending"}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-weight: 700; color: var(--accent-purple); font-size: 11px;">
                        ${escapeHtml(prop.field.replace(/_/g, " ").toUpperCase())}
                      </span>
                      ${tokenDiffBadge}
                      <span style="font-size: 10px; color: var(--text-muted); font-style: italic;">
                        ${escapeHtml(prop.explanation || "")}
                      </span>
                    </div>
                    <div>
                      ${
                        isPending
                          ? `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <button class="btn btn-xs btn-success btn-accept-field" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" title="Apply this field change to active card">✓ Accept</button>
                          <button class="btn btn-xs btn-danger btn-discard-field" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" title="Discard this field change">✕ Discard</button>
                        </div>
                      `
                          : isAccepted
                          ? `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <span style="color: #10b981; font-weight: 700; font-size: 10px;">✓ Applied</span>
                        </div>
                      `
                          : `
                        <div style="display: flex; gap: 4px; align-items: center;">
                          <button class="btn btn-xs btn-open-diff-modal" data-turn-idx="${index}" data-prop-idx="${propIdx}" type="button" style="background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; font-weight: 700;" title="Inspect large full-screen side-by-side diff">🔍 Full Diff</button>
                          <span style="color: #ef4444; font-size: 10px;">✕ Discarded</span>
                        </div>
                      `
                      }
                    </div>
                  </div>

                  <div class="agent-diff-boxes">
                    <div class="agent-diff-box agent-diff-before" title="Original Content">
                      <div style="font-size: 9px; opacity: 0.7; margin-bottom: 2px;">BEFORE (${beforeTokens} tok):</div>
                      ${escapeHtml(beforeText || "(empty)")}
                    </div>
                    <div class="agent-diff-box agent-diff-after" title="Agent's Proposed Revision">
                      <div style="font-size: 9px; opacity: 0.7; margin-bottom: 2px;">AFTER (${afterTokens} tok):</div>
                      ${escapeHtml(afterText || "(empty)")}
                    </div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
      }

      // 2. Creative Takes (A/B Choices)
      let takesHtml = "";
      if (msg.takes && msg.takes.length > 0) {
        takesHtml = `
        <div class="agent-takes-container">
          <div style="font-size: 10px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">
            🎲 Creative Alternatives (${msg.takes.length} Takes Generated):
          </div>
          ${msg.takes
            .map((take, takeIdx) => {
              const isSelected = take.status === "applied";
              return `
              <div class="agent-take-card ${isSelected ? "take-selected" : ""}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: rgba(99, 102, 241, 0.2); color: var(--accent-cyan); font-weight: 700; padding: 1px 6px; border-radius: 4px; font-size: 10px;">
                      Take ${escapeHtml(take.takeId)}: ${escapeHtml(take.title)}
                    </span>
                    <span style="font-size: 10px; color: var(--text-dim);">Target: ${escapeHtml(take.field)}</span>
                  </div>
                  <div>
                    ${
                      isSelected
                        ? `
                      <span style="color: #10b981; font-weight: 700; font-size: 10px;">✓ Chosen</span>
                    `
                        : `
                      <button class="btn btn-xs btn-primary btn-apply-take" data-turn-idx="${index}" data-take-idx="${takeIdx}" type="button">
                        ✓ Choose Take ${escapeHtml(take.takeId)}
                      </button>
                    `
                    }
                  </div>
                </div>
                ${
                  take.explanation
                    ? `<div style="font-size: 10px; color: var(--text-muted); font-style: italic; margin-bottom: 4px;">${escapeHtml(take.explanation)}</div>`
                    : ""
                }
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px; font-family: monospace; font-size: 10px; max-height: 110px; overflow-y: auto; white-space: pre-wrap;">
                  ${escapeHtml(take.content)}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      `;
      }

      // 3. Prescription Checkup Box
      let prescriptionsHtml = "";
      if (msg.prescriptions && msg.prescriptions.length > 0) {
        prescriptionsHtml = `
        <div class="agent-prescription-box">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>🩺 Doctor's Prescriptions</span>
          </div>
          ${msg.prescriptions
            .map(
              (p, pIdx) => `
            <div class="prescription-item">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #f8fafc; font-size: 11px;">${escapeHtml(p.title)}</div>
                <div style="color: var(--text-muted); font-size: 10px;">${escapeHtml(p.explanation)}</div>
              </div>
              <button class="btn btn-xs btn-success btn-prescription-fix" data-turn-idx="${index}" data-presc-idx="${pIdx}" type="button" style="white-space: nowrap;">
                ${escapeHtml(p.buttonText)}
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      `;
      }

      // Auto-Applied Changes Tags (when review diffs is off)
      const changesHtml =
        !proposalsHtml && msg.changes && msg.changes.length > 0
          ? `
        <div style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 10px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">Auto-Applied Card Fields:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${msg.changes
              .map(
                (c) => `
              <span class="badge" title="${escapeHtml(c.explanation || "")}" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: default;">
                ✓ ${escapeHtml(c.field.replace("_", " "))}
              </span>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : "";

      const undoButtonHtml = msg.snapshotBefore
        ? `
        <div style="margin-top: 6px; display: flex; justify-content: flex-end;">
          <button class="btn btn-xs btn-agent-revert-turn" data-index="${index}" type="button" style="font-size: 10px; padding: 2px 8px; color: var(--text-dim);" title="Revert card to before this edit">
            ↩️ Revert this turn
          </button>
        </div>
      `
        : "";

      return `
        <div style="align-self: flex-start; max-width: 92%; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
          <div style="font-size: 10px; color: var(--text-dim); display: flex; align-items: center; gap: 4px;">
            <span>🤖 Agent Co-Pilot</span>
            <span>•</span>
            <span>${escapeHtml(msg.time || "")}</span>
          </div>
          <div style="background: var(--bg-secondary); border: 1px solid ${msg.isPending ? 'var(--accent-purple, #a855f7)' : 'var(--border-color)'}; border-radius: 10px 10px 10px 2px; padding: 9px 12px; font-size: 12px; line-height: 1.4; color: var(--text-main); word-break: break-word; width: 100%;">
            <div style="white-space: pre-wrap;">${
              msg.isPending
                ? `<div style="display: flex; align-items: center; gap: 8px; color: var(--accent-purple, #c084fc); font-weight: 500;">
                    <span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-top-color: #c084fc;"></span>
                    <span>Deliberating with local model & applying card updates...</span>
                   </div>`
                : escapeHtml(msg.content)
            }</div>
            ${prescriptionsHtml}
            ${takesHtml}
            ${proposalsHtml}
            ${changesHtml}
            ${undoButtonHtml}
          </div>
        </div>
      `;
    })
    .join("");

  if (el.agentChatStream) {
    el.agentChatStream.innerHTML = historyHtml;
    el.agentChatStream.scrollTop = el.agentChatStream.scrollHeight;
  }

  if (el.agentStudioStream) {
    if (!state.agentChatHistory || state.agentChatHistory.length === 0) {
      const charName = state.character?.name || "your character";
      el.agentStudioStream.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 6px; font-size: 14px;">
            <span>🤖</span> <span>Agent Co-Pilot Studio Ready</span>
          </div>
          <div style="color: var(--text-muted); line-height: 1.5;">
            You are in the fullscreen studio workspace for <strong style="color: var(--text-main);">${escapeHtml(charName)}</strong>. The right-hand sidebar displays your character card in real time and updates automatically as changes are accepted.
            <div style="margin-top: 8px; color: var(--text-dim); font-size: 11px;">
              💡 <em>Use the sidebar tabs to inspect any field. Click "Ask Agent to Doctor This" to send that field straight to the agent!</em>
            </div>
          </div>
        </div>
      `;
    } else {
      el.agentStudioStream.innerHTML = historyHtml;
    }
    el.agentStudioStream.scrollTop = el.agentStudioStream.scrollHeight;
  }
}

let activeAgentAbortController = null;

export function cancelAgentChatMessage() {
  if (activeAgentAbortController) {
    activeAgentAbortController.abort();
    activeAgentAbortController = null;
    showIpcToast("Agent generation canceled", "info");
  }
}

export async function sendAgentChatMessage(customPrompt) {
  if (!assertProviderConfigured()) return;

  const isStudioOpen = el.modalAgentStudio && !el.modalAgentStudio.classList.contains("hidden");
  const prompt = (
    customPrompt ||
    (isStudioOpen ? el.agentStudioInput?.value : el.agentChatInput?.value) ||
    el.agentChatInput?.value ||
    el.agentStudioInput?.value ||
    ""
  ).trim();
  if (!prompt) return;
  if (prompt === "/compact" || prompt.startsWith("/compact ")) {
    if (el.agentChatInput) el.agentChatInput.value = "";
    if (el.agentStudioInput) el.agentStudioInput.value = "";
    compactAgentHistory();
    return;
  }
  if (prompt === "/clear" || prompt === "/reset") {
    if (el.agentChatInput) el.agentChatInput.value = "";
    if (el.agentStudioInput) el.agentStudioInput.value = "";
    clearAgentHistory();
    return;
  }

  const scope = isStudioOpen
    ? el.agentStudioScope?.value || "auto"
    : el.agentTargetScope?.value || "auto";
  let targetFields;
  if (scope === "advice_only") targetFields = [];
  else if (scope === "dialogue") targetFields = ["mes_example", "personality"];
  else if (scope === "description") targetFields = ["description"];
  else if (scope === "personality") targetFields = ["personality"];
  else if (scope === "first_mes") targetFields = ["first_mes", "alternate_greetings"];
  else if (scope === "scenario") targetFields = ["scenario"];
  else if (scope === "post_history") targetFields = ["post_history_instructions"];

  const enforceNatural = isStudioOpen
    ? (el.agentStudioEnforceNaturalVoice ? el.agentStudioEnforceNaturalVoice.checked : true)
    : (el.agentEnforceNaturalVoice ? el.agentEnforceNaturalVoice.checked : true);
  const reviewDiffs = isStudioOpen
    ? (el.agentStudioReviewDiffs ? el.agentStudioReviewDiffs.checked : true)
    : (el.agentReviewDiffs ? el.agentReviewDiffs.checked : true);
  const twoTakes = isStudioOpen
    ? (el.agentStudioTwoTakes ? el.agentStudioTwoTakes.checked : false)
    : (el.agentTwoTakes ? el.agentTwoTakes.checked : false);

  syncUIToState();

  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.agentChatHistory.push({
    role: "user",
    content: prompt,
    time: nowTime,
  });

  if (el.agentChatInput) el.agentChatInput.value = "";
  if (el.agentStudioInput) el.agentStudioInput.value = "";

  const snapshotBefore = JSON.parse(JSON.stringify(state.character));

  // Toggle buttons: hide Send, show Cancel
  if (el.btnAgentSend) el.btnAgentSend.classList.add("hidden");
  if (el.btnAgentCancel) el.btnAgentCancel.classList.remove("hidden");
  if (el.btnAgentStudioSend) el.btnAgentStudioSend.classList.add("hidden");
  if (el.btnAgentStudioCancel) el.btnAgentStudioCancel.classList.remove("hidden");

  activeAgentAbortController = new AbortController();

  // Placeholder bubble
  const tempMsg = {
    role: "assistant",
    content: "Thinking & synthesizing...",
    time: nowTime,
    isPending: true,
  };
  state.agentChatHistory.push(tempMsg);
  renderAgentChatStream();

  const targetedPayload = activeTargetedSelection
    ? {
        field: activeTargetedSelection.field,
        selectedText: activeTargetedSelection.selectedText,
      }
    : undefined;

  // Clear targeted selection after sending
  activeTargetedSelection = null;
  el.floatingDoctorPill?.classList.add("hidden");

  const agentCharacter = {
    name: state.character.name,
    tags: state.character.tags,
    description: state.character.description,
    personality: state.character.personality,
    scenario: state.character.scenario,
    first_mes: state.character.first_mes,
    mes_example: state.character.mes_example,
    alternate_greetings: state.character.alternate_greetings,
    system_prompt: "",
    post_history_instructions: state.character.post_history_instructions,
    creator_notes: state.character.creator_notes,
  };

  try {
    const res = await apiPost("/api/agent/modify", {
      character: agentCharacter,
      userPrompt: prompt,
      targetFields,
      chatHistory: state.agentChatHistory.filter((m) => !m.isPending),
      provider: state.provider,
      enforceNaturalVoice: enforceNatural,
      pinnedDirectives: state.agentPinnedRules || [],
      twoTakes,
      targetedSelection: targetedPayload,
    }, activeAgentAbortController.signal);

    state.agentChatHistory = state.agentChatHistory.filter((m) => !m.isPending);

    const hasCardEdits = res.character && Object.keys(res.character).length > 0 && scope !== "advice_only";

    // Setup proposals for granular review
    let proposals = [];
    if (hasCardEdits && Array.isArray(res.changes) && res.changes.length > 0) {
      if (reviewDiffs) {
        // Granular review mode: keep proposals pending for user decision
        proposals = res.changes.map((c) => ({
          field: c.field,
          before: c.before,
          after: c.after,
          explanation: c.explanation,
          action: c.action,
          index: c.index,
          status: "pending",
        }));
      } else {
        // Auto-apply mode: apply immediately
        recordSnapshot(`Before Agent: ${prompt.substring(0, 20)}...`);
        state.character = {
          ...state.character,
          ...res.character,
        };
        syncStateToUI();
        recordSnapshot(`Agent Edit: ${prompt.substring(0, 20)}...`);
        notifyIpcActiveCard(state.character);
      }
    }

    // Creative Takes
    const takes = Array.isArray(res.takes) ? res.takes.map((t) => ({ ...t, status: "pending" })) : [];

    const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    state.agentChatHistory.push({
      role: "assistant",
      content: res.agentMessage || "Done.",
      time: responseTime,
      changes: res.changes || [],
      proposals,
      takes,
      snapshotBefore: hasCardEdits && !reviewDiffs ? snapshotBefore : null,
    });

    renderAgentChatStream();
  } catch (err) {
    state.agentChatHistory = state.agentChatHistory.filter((m) => !m.isPending);
    if (err.name === "AbortError") {
      state.agentChatHistory.push({
        role: "assistant",
        content: "⏹️ *Agent generation stopped by user.*",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } else {
      console.error("Agent error:", err);
      state.agentChatHistory.push({
        role: "assistant",
        content: `❌ Error: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
    renderAgentChatStream();
  } finally {
    activeAgentAbortController = null;
    if (el.btnAgentSend) el.btnAgentSend.classList.remove("hidden");
    if (el.btnAgentCancel) el.btnAgentCancel.classList.add("hidden");
    if (el.btnAgentStudioSend) el.btnAgentStudioSend.classList.remove("hidden");
    if (el.btnAgentStudioCancel) el.btnAgentStudioCancel.classList.add("hidden");
  }
}

let reimagineMode = "redesign";

export async function runReimagine() {
  if (!assertProviderConfigured()) return;
  syncUIToState();
  if (!state.character?.name) {
    showIpcToast("Load or generate a character card first.", "error");
    return;
  }
  const button = el.btnRunReimagine;
  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Agent is reimagining...";
  }
  const storyArcInput = document.getElementById("reimagine-story-arc");
  const eraSelect = document.getElementById("reimagine-era-select");
  const formatSelect = document.getElementById("reimagine-format");

  try {
    const res = await apiPost("/api/agent/reimagine", {
      character: state.character,
      mode: reimagineMode,
      prompt: el.reimaginePrompt?.value || "",
      storyArc: storyArcInput ? storyArcInput.value.trim() : "",
      format: formatSelect ? formatSelect.value : "bbcode",
      eraPromptSnippet: eraSelect && eraSelect.value ? eraSelect.value : undefined,
      chatHistory: state.agentChatHistory.filter((m) => !m.isPending),
      provider: state.provider,
    });
    if (res.character && Object.keys(res.character).length) {
      recordSnapshot(`Before Reimagine: ${reimagineMode}`);
      state.character = { ...state.character, ...res.character };
      syncStateToUI();
      notifyIpcActiveCard(state.character);
    }
    if (el.reimagineResult) {
      el.reimagineResult.classList.remove("hidden");
      el.reimagineResult.innerHTML = `<strong>${escapeHtml(res.mode === "inspire" ? "Inspired direction" : "Redesign complete")}</strong><div>${escapeHtml(res.agentMessage || "The card was updated.")}</div>`;
    }
  } catch (err) {
    if (el.reimagineResult) {
      el.reimagineResult.classList.remove("hidden");
      el.reimagineResult.textContent = `❌ ${err.message}`;
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "✨ Reimagine Current Card";
    }
  }
}

// Story Arc Generator Button in Reimagine / Inspire
document.getElementById("btn-generate-story-arc")?.addEventListener("click", async () => {
  const btn = document.getElementById("btn-generate-story-arc");
  const storyArcInput = document.getElementById("reimagine-story-arc");
  const guidanceInput = document.getElementById("reimagine-arc-guidance");
  const actsInput = document.getElementById("reimagine-arc-acts");

  if (!state.character?.name && !state.character?.description) {
    alert("Please load or create a character first!");
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Drafting...";
  }
  try {
    const hint = (guidanceInput?.value?.trim()) || (el.reimaginePrompt ? el.reimaginePrompt.value.trim() : "");
    const requestedActs = actsInput ? (parseInt(actsInput.value, 10) || 3) : 3;
    const res = await apiPost("/api/story-arc/generate", {
      character: state.character,
      roughStoryHint: hint,
      minActs: Math.max(1, requestedActs),
      mode: reimagineMode,
      provider: state.provider
    });
    if (res.storyArc && storyArcInput) {
      storyArcInput.value = res.storyArc;
    }
  } catch (e) {
    alert("Story arc error: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ Generate Arc";
    }
  }
});

// Story Arc Generator Button in Spark Generator Tab
document.getElementById("btn-spark-generate-story-arc")?.addEventListener("click", async () => {
  const btn = document.getElementById("btn-spark-generate-story-arc");
  const storyArcInput = document.getElementById("gen-story-arc");
  const guidanceInput = document.getElementById("spark-arc-guidance");
  const actsInput = document.getElementById("spark-arc-acts");

  const conceptText = el.genConcept?.value?.trim() || "";
  const genreText = el.genGenre?.value?.trim() || "";
  const toneText = el.genTone?.value?.trim() || "";
  const eraText = el.genEra?.value?.trim() || "";
  const themesText = (state.selectedThemes && state.selectedThemes.length) ? state.selectedThemes.join(", ") : "";

  // If Spark has a concept/seed in the textarea, extract or construct character seed
  let charName = state.character?.name || "Character";
  let desc = conceptText;
  if (genreText || toneText || themesText) {
    const metaParts = [];
    if (genreText) metaParts.push(`Genre: ${genreText}`);
    if (toneText) metaParts.push(`Tone: ${toneText}`);
    if (themesText) metaParts.push(`Themes/Tropes: ${themesText}`);
    desc = desc ? `${desc}\n\n[Setting & Context]:\n${metaParts.join(" | ")}` : metaParts.join(" | ");
  }

  // Attempt to parse character name from concept sauce (e.g. "Character: Sarah — Title")
  const charMatch = conceptText.match(/^Character:\s*([^—\n]+)/m);
  if (charMatch && charMatch[1]) {
    charName = charMatch[1].trim();
  }

  const charPayload = {
    ...state.character,
    name: charName,
    description: desc || state.character?.description || "A dynamic character",
    personality: state.character?.personality || "",
    scenario: state.character?.scenario || "",
  };

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Drafting...";
  }
  try {
    const hint = (guidanceInput?.value?.trim()) || "";
    const requestedActs = actsInput ? (parseInt(actsInput.value, 10) || 3) : 3;
    const res = await apiPost("/api/story-arc/generate", {
      character: charPayload,
      roughStoryHint: hint,
      eraPromptSnippet: eraText,
      minActs: Math.max(1, requestedActs),
      mode: "spark",
      provider: state.provider
    });
    if (res.storyArc && storyArcInput) {
      storyArcInput.value = res.storyArc;
    }
  } catch (e) {
    alert("Story arc error: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ Generate Arc";
    }
  }
});

document.querySelectorAll(".reimagine-mode").forEach((button) => {
  button.addEventListener("click", () => {
    reimagineMode = button.dataset.mode || "redesign";
    document.querySelectorAll(".reimagine-mode").forEach((b) => b.classList.toggle("active", b === button));
  });
});
el.btnRunReimagine?.addEventListener("click", runReimagine);

// ==========================================
// Lorebook Companion Creator Logic
// ==========================================
let companionRole = "guide";
let companionRelation = "stranger";

// Companion Role Chip Handlers
document.querySelectorAll(".companion-role-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    companionRole = chip.dataset.role || "guide";
    document.querySelectorAll(".companion-role-chip").forEach((c) => {
      c.classList.toggle("active", c === chip);
      if (c === chip) {
        c.style.borderColor = "var(--accent-purple)";
        c.style.background = "rgba(168, 85, 247, 0.2)";
        c.style.color = "#c084fc";
      } else {
        c.style.borderColor = "var(--border-main)";
        c.style.background = "var(--bg-card)";
        c.style.color = "var(--text-muted)";
      }
    });

    const customInp = document.getElementById("companion-custom-role-input");
    if (customInp) {
      customInp.classList.toggle("hidden", companionRole !== "custom");
      if (companionRole === "custom") customInp.focus();
    }
  });
});

// User Relation Chip Handlers
document.querySelectorAll(".companion-rel-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    companionRelation = chip.dataset.rel || "stranger";
    document.querySelectorAll(".companion-rel-chip").forEach((c) => {
      c.classList.toggle("active", c === chip);
      if (c === chip) {
        c.style.borderColor = "var(--accent-cyan)";
        c.style.background = "rgba(56, 189, 248, 0.2)";
        c.style.color = "#38bdf8";
      } else {
        c.style.borderColor = "var(--border-main)";
        c.style.background = "var(--bg-card)";
        c.style.color = "var(--text-muted)";
      }
    });

    const customInp = document.getElementById("companion-custom-rel-input");
    if (customInp) {
      customInp.classList.toggle("hidden", companionRelation !== "custom");
      if (companionRelation === "custom") customInp.focus();
    }
  });
});

// Load Active Card Lorebook
document.getElementById("btn-companion-use-active-lore")?.addEventListener("click", () => {
  const cb = state.character?.character_book;
  if (cb && Array.isArray(cb.entries) && cb.entries.length > 0) {
    const input = document.getElementById("companion-lorebook-input");
    if (input) {
      input.value = JSON.stringify(cb, null, 2);
      analyzeCompanionLorebook();
    }
  } else {
    alert("Currently active character does not have an embedded lorebook with entries.");
  }
});

// Upload Lorebook JSON file
document.getElementById("companion-lorebook-file")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const content = evt.target.result;
    const input = document.getElementById("companion-lorebook-input");
    if (input) {
      input.value = content;
      analyzeCompanionLorebook();
    }
  };
  reader.readAsText(file);
});

// Analyze Lorebook function
async function analyzeCompanionLorebook() {
  const input = document.getElementById("companion-lorebook-input");
  const badge = document.getElementById("companion-lorebook-badge");
  const preview = document.getElementById("companion-entities-preview");
  const text = input ? input.value.trim() : "";

  if (!text) {
    if (badge) badge.textContent = "Please enter or paste a lorebook first";
    return;
  }

  if (badge) badge.textContent = "Analyzing...";

  try {
    const res = await apiPost("/api/lorebook/analyze", { lorebook: text });
    if (res.summary) {
      const s = res.summary;
      if (badge) {
        badge.textContent = `✓ ${s.entryCount} entries detected (~${s.totalTokensApprox} tokens)`;
        badge.style.color = "var(--accent-green, #10b981)";
      }
      if (preview) {
        const entities = (s.factions || []).concat(s.locations || []).slice(0, 10);
        if (entities.length > 0) {
          preview.classList.remove("hidden");
          preview.innerHTML = entities
            .map(
              (ent) =>
                `<span style="font-size: 10px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe; border-radius: 10px; padding: 1px 8px;">${escapeHtml(
                  ent
                )}</span>`
            )
            .join("");
        } else {
          preview.classList.add("hidden");
        }
      }
    }
  } catch (err) {
    if (badge) {
      badge.textContent = "Failed to parse lorebook: " + err.message;
      badge.style.color = "#ef4444";
    }
  }
}

document.getElementById("btn-companion-analyze")?.addEventListener("click", analyzeCompanionLorebook);

// Forge Lorebook Companion
document.getElementById("btn-companion-forge")?.addEventListener("click", async () => {
  if (!assertProviderConfigured()) return;

  const loreInput = document.getElementById("companion-lorebook-input")?.value?.trim();
  if (!loreInput) {
    alert("Please provide or load a lorebook before forging a companion!");
    return;
  }

  const customRole = document.getElementById("companion-custom-role-input")?.value?.trim() || "";
  const customRel = document.getElementById("companion-custom-rel-input")?.value?.trim() || "";
  const gender = document.getElementById("companion-gender")?.value || "any";
  const nsfw = !!document.getElementById("companion-nsfw")?.checked;
  const tone = document.getElementById("companion-tone")?.value?.trim() || "Tactical, atmospheric, conversational";
  const steering = document.getElementById("companion-steering")?.value?.trim() || "";

  const btn = document.getElementById("btn-companion-forge");
  const origHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> <span>Synthesizing Companion &amp; Embedding Lorebook...</span>`;
  }

  try {
    const payload = {
      lorebook: loreInput,
      companionRole,
      customRole: companionRole === "custom" ? customRole : undefined,
      userRelation: companionRelation,
      customRelation: companionRelation === "custom" ? customRel : undefined,
      companionGender: gender,
      tone,
      nsfw,
      steeringInstructions: steering,
      provider: state.provider,
    };

    const res = await apiPost("/api/lorebook/generate-companion", payload);
    if (res.character) {
      state.character = { ...state.character, ...res.character };
      state.activeCardId = null;
      updateActiveCardBadge();
      syncStateToUI();
      recordSnapshot(`Forged Companion: ${state.character.name}`);
      const entryCount = state.character.character_book?.entries?.length || 0;
      alert(`🎉 Successfully forged Companion "${state.character.name}" with ${entryCount} embedded lorebook entries!`);
    }
  } catch (err) {
    alert("Companion generation failed: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
});
el.btnAgentImportCard?.addEventListener("click", () => el.fileImportInput?.click());

// Preset chips populate the chat input
document.querySelectorAll(".agent-preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const isStudioOpen = el.modalAgentStudio && !el.modalAgentStudio.classList.contains("hidden");
    const targetInput = isStudioOpen && el.agentStudioInput ? el.agentStudioInput : el.agentChatInput;
    if (targetInput) {
      targetInput.value = chip.dataset.wish || "";
      targetInput.focus();
    }
  });
});

// 1-Click Prescription Checkup Button
el.btnAgentPrescription?.addEventListener("click", () => {
  runPrescriptionCheckup();
});

// Pinned Rules Expand/Collapse Toggle
el.agentTogglePinned?.addEventListener("click", () => {
  const isHidden = el.agentPinnedContent?.classList.contains("hidden");
  if (isHidden) {
    el.agentPinnedContent?.classList.remove("hidden");
    if (el.agentPinnedChevron) el.agentPinnedChevron.textContent = "▲";
  } else {
    el.agentPinnedContent?.classList.add("hidden");
    if (el.agentPinnedChevron) el.agentPinnedChevron.textContent = "▼";
  }
});

// Add Pinned Rule
function handleAddPinnedRule() {
  const text = el.agentNewPinnedInput?.value.trim();
  if (!text) return;
  if (!state.agentPinnedRules) state.agentPinnedRules = [];
  if (!state.agentPinnedRules.includes(text)) {
    state.agentPinnedRules.push(text);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
  if (el.agentNewPinnedInput) el.agentNewPinnedInput.value = "";
}

el.btnAddPinnedRule?.addEventListener("click", handleAddPinnedRule);
el.agentNewPinnedInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddPinnedRule();
  }
});

// Remove Pinned Rule via delegation
el.agentPinnedChips?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".agent-pinned-chip-remove");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.ruleIndex, 10);
  if (state.agentPinnedRules && idx >= 0 && idx < state.agentPinnedRules.length) {
    state.agentPinnedRules.splice(idx, 1);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
});

// Agent chat stream interactive clicks (Accept/Discard diffs, Choose Takes, Prescriptions, Revert)
let activeModalDiffTurnIdx = null;
let activeModalDiffPropIdx = null;

function openAgentDiffModal(turnIdx, propIdx) {
  const msg = state.agentChatHistory[turnIdx];
  const prop = msg?.proposals?.[propIdx];
  if (!prop) return;

  activeModalDiffTurnIdx = turnIdx;
  activeModalDiffPropIdx = propIdx;

  const modal = document.getElementById("modal-agent-field-diff");
  const title = document.getElementById("agent-diff-modal-title");
  const subtitle = document.getElementById("agent-diff-modal-subtitle");
  const expl = document.getElementById("agent-diff-modal-explanation");
  const beforeArea = document.getElementById("agent-diff-modal-before");
  const afterArea = document.getElementById("agent-diff-modal-after");
  const beforeTok = document.getElementById("agent-diff-before-tokens");
  const afterTok = document.getElementById("agent-diff-after-tokens");
  const statusTxt = document.getElementById("agent-diff-modal-status-text");
  const acceptBtn = document.getElementById("btn-agent-diff-modal-accept");
  const discardBtn = document.getElementById("btn-agent-diff-modal-discard");

  const fieldName = (prop.field || "").replace(/_/g, " ").toUpperCase();
  const bTokens = estimateTokens(prop.before || "");
  const aTokens = estimateTokens(prop.after || "");
  const diffTokens = aTokens - bTokens;

  if (title) title.textContent = `🔍 Diff Inspector: ${fieldName}`;
  if (subtitle) subtitle.textContent = `Comparing current ${fieldName} with proposed revision (${diffTokens >= 0 ? "+" : ""}${diffTokens} tokens)`;
  if (expl) {
    if (prop.explanation) {
      expl.textContent = `💡 ${prop.explanation}`;
      expl.style.display = "block";
    } else {
      expl.style.display = "none";
    }
  }
  if (beforeArea) beforeArea.value = prop.before || "(empty)";
  if (afterArea) afterArea.value = prop.after || "(empty)";
  if (beforeTok) beforeTok.textContent = bTokens;
  if (afterTok) afterTok.textContent = aTokens;

  if (prop.status === "accepted") {
    if (statusTxt) {
      statusTxt.textContent = "✓ This proposal has been accepted and applied to the card.";
      statusTxt.style.color = "#10b981";
    }
    if (acceptBtn) acceptBtn.style.display = "none";
    if (discardBtn) discardBtn.style.display = "none";
  } else if (prop.status === "discarded") {
    if (statusTxt) {
      statusTxt.textContent = "✕ This proposal was discarded.";
      statusTxt.style.color = "#ef4444";
    }
    if (acceptBtn) acceptBtn.style.display = "none";
    if (discardBtn) discardBtn.style.display = "none";
  } else {
    if (statusTxt) {
      statusTxt.textContent = "Pending author review.";
      statusTxt.style.color = "var(--text-muted)";
    }
    if (acceptBtn) acceptBtn.style.display = "inline-block";
    if (discardBtn) discardBtn.style.display = "inline-block";
  }

  if (modal) modal.classList.remove("hidden");
}

function closeAgentDiffModal() {
  const modal = document.getElementById("modal-agent-field-diff");
  if (modal) modal.classList.add("hidden");
  activeModalDiffTurnIdx = null;
  activeModalDiffPropIdx = null;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-close-agent-diff-modal");
  if (target) closeAgentDiffModal();
});
async function copyAgentDiffText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      if (!document.execCommand("copy")) throw new Error("Clipboard access unavailable");
      area.remove();
    }
    showIpcToast(`Copied ${label} text to clipboard`, "info");
  } catch (err) {
    showIpcToast(`Could not copy ${label} text: ${err.message}`, "error");
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-agent-diff-copy-before, #btn-agent-diff-copy-after");
  if (!target) return;
  const id = target.id === "btn-agent-diff-copy-before" ? "agent-diff-modal-before" : "agent-diff-modal-after";
  const area = document.getElementById(id);
  if (area) copyAgentDiffText(area.value, target.id.endsWith("before") ? "BEFORE" : "AFTER");
});
function applyProposalToCharacter(prop) {
  if (!prop) return;
  if (prop.field === "alternate_greetings") {
    if (!Array.isArray(state.character.alternate_greetings)) {
      state.character.alternate_greetings = [];
    }
    const alts = state.character.alternate_greetings;
    if (prop.action === "add" || prop.before === "(none - newly added)") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index <= alts.length ? prop.index : alts.length;
      alts.splice(idx, 0, prop.after);
    } else if (prop.action === "update") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index < alts.length ? prop.index : alts.indexOf(prop.before);
      if (idx !== -1) alts[idx] = prop.after;
      else alts.push(prop.after);
    } else if (prop.action === "delete" || prop.after === "(deleted)") {
      const idx = prop.index !== undefined && prop.index >= 0 && prop.index < alts.length ? prop.index : alts.indexOf(prop.before);
      if (idx !== -1) alts.splice(idx, 1);
    } else if (Array.isArray(prop.after)) {
      state.character.alternate_greetings = prop.after;
    } else if (typeof prop.after === "string") {
      alts.push(prop.after);
    }
  } else {
    state.character[prop.field] = prop.after;
  }
}

function acceptActiveAgentDiff() {
  if (activeModalDiffTurnIdx !== null && activeModalDiffPropIdx !== null) {
    const msg = state.agentChatHistory[activeModalDiffTurnIdx];
    const prop = msg?.proposals?.[activeModalDiffPropIdx];
    if (prop && prop.status === "pending") {
      recordSnapshot(`Before Accept: ${prop.field}`);
      applyProposalToCharacter(prop);
      prop.status = "accepted";
      syncStateToUI();
      recordSnapshot(`Accepted Agent Edit: ${prop.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
      showIpcToast(`✓ Applied ${prop.field} revision to card`, "success");
      closeAgentDiffModal();
    }
  }
}
function discardActiveAgentDiff() {
  if (activeModalDiffTurnIdx !== null && activeModalDiffPropIdx !== null) {
    const msg = state.agentChatHistory[activeModalDiffTurnIdx];
    const prop = msg?.proposals?.[activeModalDiffPropIdx];
    if (prop && prop.status === "pending") {
      prop.status = "discarded";
      renderAgentChatStream();
      closeAgentDiffModal();
    }
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("#btn-agent-diff-modal-accept, #btn-agent-diff-modal-discard");
  if (!target) return;
  if (target.id === "btn-agent-diff-modal-accept") acceptActiveAgentDiff();
  else discardActiveAgentDiff();
});

function handleAgentStreamClick(e) {
  // Open Large Diff Modal
  const btnOpenDiff = e.target.closest(".btn-open-diff-modal") || e.target.closest(".agent-diff-box");
  if (btnOpenDiff) {
    const row = btnOpenDiff.closest(".agent-diff-row");
    const acceptBtn = row?.querySelector(".btn-accept-field") || row?.querySelector(".btn-open-diff-modal");
    if (acceptBtn) {
      const turnIdx = parseInt(acceptBtn.dataset.turnIdx, 10);
      const propIdx = parseInt(acceptBtn.dataset.propIdx, 10);
      openAgentDiffModal(turnIdx, propIdx);
      return;
    }
  }

  // 1. Accept Single Field Proposal
  const btnAcceptField = e.target.closest(".btn-accept-field");
  if (btnAcceptField) {
    const turnIdx = parseInt(btnAcceptField.dataset.turnIdx, 10);
    const propIdx = parseInt(btnAcceptField.dataset.propIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const prop = msg?.proposals?.[propIdx];
    if (prop && prop.status === "pending") {
      recordSnapshot(`Before Accept: ${prop.field}`);
      applyProposalToCharacter(prop);
      prop.status = "accepted";
      syncStateToUI();
      recordSnapshot(`Accepted Agent Edit: ${prop.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 2. Discard Single Field Proposal
  const btnDiscardField = e.target.closest(".btn-discard-field");
  if (btnDiscardField) {
    const turnIdx = parseInt(btnDiscardField.dataset.turnIdx, 10);
    const propIdx = parseInt(btnDiscardField.dataset.propIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const prop = msg?.proposals?.[propIdx];
    if (prop && prop.status === "pending") {
      prop.status = "discarded";
      renderAgentChatStream();
    }
    return;
  }

  // 3. Accept All Proposals
  const btnAcceptAll = e.target.closest(".btn-accept-all-proposals");
  if (btnAcceptAll) {
    const turnIdx = parseInt(btnAcceptAll.dataset.turnIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    if (msg?.proposals) {
      recordSnapshot("Before Accept All Proposals");
      msg.proposals.forEach((p) => {
        if (p.status === "pending") {
          applyProposalToCharacter(p);
          p.status = "accepted";
        }
      });
      syncStateToUI();
      recordSnapshot("Accepted All Agent Proposals");
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 4. Discard All Proposals
  const btnDiscardAll = e.target.closest(".btn-discard-all-proposals");
  if (btnDiscardAll) {
    const turnIdx = parseInt(btnDiscardAll.dataset.turnIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    if (msg?.proposals) {
      msg.proposals.forEach((p) => {
        if (p.status === "pending") p.status = "discarded";
      });
      renderAgentChatStream();
    }
    return;
  }

  // 5. Choose Take A / Take B
  const btnApplyTake = e.target.closest(".btn-apply-take");
  if (btnApplyTake) {
    const turnIdx = parseInt(btnApplyTake.dataset.turnIdx, 10);
    const takeIdx = parseInt(btnApplyTake.dataset.takeIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const take = msg?.takes?.[takeIdx];
    if (take) {
      recordSnapshot(`Before Choose Take ${take.takeId}`);
      state.character[take.field] = take.content;
      msg.takes.forEach((t) => (t.status = "unselected"));
      take.status = "applied";
      syncStateToUI();
      recordSnapshot(`Applied Take ${take.takeId} to ${take.field}`);
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }

  // 6. Prescription 1-Click Action Fix
  const btnPrescFix = e.target.closest(".btn-prescription-fix");
  if (btnPrescFix) {
    const turnIdx = parseInt(btnPrescFix.dataset.turnIdx, 10);
    const prescIdx = parseInt(btnPrescFix.dataset.prescIdx, 10);
    const msg = state.agentChatHistory[turnIdx];
    const presc = msg?.prescriptions?.[prescIdx];
    if (presc && presc.prompt) {
      sendAgentChatMessage(presc.prompt);
    }
    return;
  }

  // 7. Full Turn Revert
  const revertBtn = e.target.closest(".btn-agent-revert-turn");
  if (revertBtn) {
    const idx = parseInt(revertBtn.dataset.index, 10);
    const msg = state.agentChatHistory[idx];
    if (msg && msg.snapshotBefore) {
      if (!confirm("Revert character card to before this edit was made?")) return;
      state.character = JSON.parse(JSON.stringify(msg.snapshotBefore));
      delete msg.snapshotBefore;
      msg.content += "\n\n*(Edit reverted)*";
      syncStateToUI();
      recordSnapshot("Reverted Agent Turn");
      notifyIpcActiveCard(state.character);
      renderAgentChatStream();
    }
    return;
  }
}

// Agent chat stream interactive clicks (Accept/Discard diffs, Choose Takes, Prescriptions, Revert)
el.agentChatStream?.addEventListener("click", handleAgentStreamClick);
el.agentStudioStream?.addEventListener("click", handleAgentStreamClick);

// Compact agent conversation (client prune + optional AI summary)
export async function compactAgentHistory() {
  const history = (state.agentChatHistory || []).filter((m) => !m.isPending);
  if (history.length <= 2) {
    showIpcToast("Conversation is already compact (2 or fewer messages).", "info");
    return;
  }

  const choice = confirm(
    `Compact ${history.length} conversation turns?\n\n` +
    `• Click OK to generate an AI Executive Summary of previous decisions and prune old turns.\n` +
    `• Click Cancel if you want to keep full conversation turns.`
  );

  if (!choice) return;

  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // If provider configured, try AI summary compaction
  if (state.provider && state.provider.type && state.provider.type !== "none") {
    const tempMsg = {
      role: "assistant",
      content: "🗜️ Summarizing and compacting conversation memory...",
      time: nowTime,
      isPending: true,
    };
    state.agentChatHistory.push(tempMsg);
    renderAgentChatStream();

    try {
      const res = await apiPost("/api/agent/compact", {
        provider: state.provider,
        chatHistory: history,
        characterName: state.character?.name,
      });

      if (res && res.compactedHistory && res.compactedHistory.length > 0) {
        state.agentChatHistory = res.compactedHistory;
        renderAgentChatStream();
        showIpcToast("Conversation compacted with AI summary! KV cache prefix optimized.", "success");
        return;
      }
    } catch (err) {
      console.warn("AI compact failed, falling back to local client prune:", err);
      showIpcToast("AI summary failed; falling back to local prune.", "warning");
    }
  }

  // Local client-side prune: keep first user turn + last 4 turns
  const kept = [
    {
      role: "user",
      content: `[CONVERSATION COMPACTED - LOCAL PRUNE]: Kept initial direction and recent turns to optimize token usage.`,
      time: nowTime,
    },
    ...history.slice(-4),
  ];
  state.agentChatHistory = kept;
  renderAgentChatStream();
  showIpcToast("Pruned older turns client-side.", "info");
}

// Clear agent conversation
const clearAgentHistory = () => {
  if (state.agentChatHistory.length > 0 && !confirm("Clear agent chat history?")) return;
  state.agentChatHistory = [];
  renderAgentChatStream();
};
el.btnAgentClearChat?.addEventListener("click", clearAgentHistory);
el.btnAgentStudioClear?.addEventListener("click", clearAgentHistory);

el.btnAgentCompact?.addEventListener("click", compactAgentHistory);
el.btnAgentStudioCompact?.addEventListener("click", compactAgentHistory);

// Enter key to send (Shift+Enter for newline)
el.agentChatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAgentChatMessage();
  }
});
el.agentStudioInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAgentChatMessage();
  }
});

// Agent Send & Cancel button clicks
el.btnAgentSend?.addEventListener("click", () => sendAgentChatMessage());
el.btnAgentStudioSend?.addEventListener("click", () => sendAgentChatMessage());
el.btnAgentCancel?.addEventListener("click", cancelAgentChatMessage);
el.btnAgentStudioCancel?.addEventListener("click", cancelAgentChatMessage);

// --- Fullscreen Agent Studio Modal & Collapsible Sidebar Implementation ---
let activeStudioField = "description";

function updateAgentStudioSidebar() {
  const c = state.character;
  if (!c) return;

  if (el.agentStudioCardBadge) {
    el.agentStudioCardBadge.textContent = c.name ? `[${c.name}]` : "";
  }

  // Update tabs count
  const alts = Array.isArray(c.alternate_greetings) ? c.alternate_greetings : [];
  if (el.agentStudioAltsCount) el.agentStudioAltsCount.textContent = String(alts.length);

  // Field label
  if (el.agentStudioActiveFieldLabel) {
    el.agentStudioActiveFieldLabel.textContent = activeStudioField.replace(/_/g, " ").toUpperCase();
  }

  // Tokens counter for current field
  if (activeStudioField === "alternate_greetings") {
    if (el.agentStudioFieldEditor) el.agentStudioFieldEditor.classList.add("hidden");
    if (el.agentStudioAltsContainer) {
      el.agentStudioAltsContainer.classList.remove("hidden");
      if (alts.length === 0) {
        el.agentStudioAltsContainer.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); font-style: italic; padding: 10px;">No alternate greetings yet. Use the agent to create some!</div>`;
      } else {
        el.agentStudioAltsContainer.innerHTML = alts
          .map(
            (alt, idx) => `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--accent-purple); font-size: 10px;">GREETING #${idx + 1} (${estimateTokens(alt)} tok)</span>
                <button class="btn btn-ghost btn-xs btn-doctor-single-alt" data-index="${idx}" style="font-size: 10px; color: var(--accent-cyan);" type="button">✂️ Doctor</button>
              </div>
              <div style="font-size: 11px; color: var(--text-main); white-space: pre-wrap; font-family: monospace; max-height: 120px; overflow-y: auto;">${escapeHtml(alt)}</div>
            </div>
          `
          )
          .join("");
      }
    }
    const totalTokens = alts.reduce((sum, g) => sum + estimateTokens(g), 0);
    if (el.agentStudioSidebarTokens) el.agentStudioSidebarTokens.textContent = `${totalTokens} tok (total alts)`;
  } else {
    if (el.agentStudioAltsContainer) el.agentStudioAltsContainer.classList.add("hidden");
    if (el.agentStudioFieldEditor) {
      el.agentStudioFieldEditor.classList.remove("hidden");
      const val = c[activeStudioField];
      const textVal = typeof val === "string" ? val : Array.isArray(val) ? val.join(", ") : "";
      el.agentStudioFieldEditor.value = textVal;
      if (el.agentStudioSidebarTokens) {
        el.agentStudioSidebarTokens.textContent = `${estimateTokens(textVal)} tok`;
      }
    }
  }
}

export function openAgentStudio() {
  if (!el.modalAgentStudio) return;
  syncUIToState();
  el.modalAgentStudio.classList.remove("hidden");
  renderAgentChatStream();
  renderPinnedRules();
  updateAgentStudioSidebar();
  if (el.agentStudioInput) {
    setTimeout(() => el.agentStudioInput.focus(), 80);
  }
}

export function closeAgentStudio() {
  if (!el.modalAgentStudio) return;
  el.modalAgentStudio.classList.add("hidden");
  // Sync any manual edits made inside the studio field editor back to character and UI
  if (el.agentStudioFieldEditor && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
    syncStateToUI();
  }
}

// Open Fullscreen Studio triggers
el.btnOpenAgentFullscreen?.addEventListener("click", openAgentStudio);
el.btnAgentExpandFullscreen?.addEventListener("click", openAgentStudio);
el.btnCloseAgentStudio?.addEventListener("click", closeAgentStudio);

// Studio Save Card button
el.btnAgentStudioSaveCard?.addEventListener("click", () => {
  if (el.agentStudioFieldEditor && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
  }
  syncStateToUI();
  saveActiveCardToLibrary(false);
  showIpcToast("Character card successfully saved!", "success");
});

// Sidebar Collapse / Expand Toggle
let isSidebarHidden = false;
el.btnAgentStudioToggleSidebar?.addEventListener("click", () => {
  if (!el.agentStudioSidebar) return;
  isSidebarHidden = !isSidebarHidden;
  if (isSidebarHidden) {
    el.agentStudioSidebar.style.display = "none";
    if (el.agentStudioSidebarBtnText) el.agentStudioSidebarBtnText.textContent = "Show Card Sidebar";
  } else {
    el.agentStudioSidebar.style.display = "flex";
    if (el.agentStudioSidebarBtnText) el.agentStudioSidebarBtnText.textContent = "Hide Card Sidebar";
    updateAgentStudioSidebar();
  }
});

// Sidebar Tab switching
document.querySelectorAll(".agent-studio-tab").forEach((tab) => {
  tab.addEventListener("click", (e) => {
    document.querySelectorAll(".agent-studio-tab").forEach((t) => t.classList.remove("active"));
    const btn = e.currentTarget;
    btn.classList.add("active");
    activeStudioField = btn.dataset.field || "description";
    updateAgentStudioSidebar();
  });
});

// Doctor Field button from sidebar
el.btnAgentStudioDoctorField?.addEventListener("click", () => {
  const c = state.character;
  if (!c) return;
  const val = c[activeStudioField];
  const fieldLabel = activeStudioField.replace(/_/g, " ");
  if (el.agentStudioInput) {
    el.agentStudioInput.value = `Doctor the character's ${fieldLabel}. Refine it to be more natural, vivid, and punchy while maintaining her core essence.`;
    el.agentStudioInput.focus();
  }
});

// Doctor individual alternate greeting from sidebar
el.agentStudioAltsContainer?.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-doctor-single-alt");
  if (btn) {
    const idx = parseInt(btn.dataset.index || "0", 10);
    const alts = state.character.alternate_greetings || [];
    const targetAlt = alts[idx] || "";
    if (el.agentStudioInput) {
      el.agentStudioInput.value = `Refine alternate greeting #${idx + 1}: "${targetAlt}". Make dialogue cadence more spontaneous, emotional, and grounded.`;
      el.agentStudioInput.focus();
    }
  }
});

// Manual typing in studio field editor syncs live to state
el.agentStudioFieldEditor?.addEventListener("input", () => {
  if (activeStudioField && activeStudioField !== "alternate_greetings") {
    state.character[activeStudioField] = el.agentStudioFieldEditor.value;
    if (el.agentStudioSidebarTokens) {
      el.agentStudioSidebarTokens.textContent = `${estimateTokens(el.agentStudioFieldEditor.value)} tok`;
    }
    // Also update main editor if open in background
    syncStateToUI();
  }
});

// Studio 1-Click Prescription Checkup Button
el.btnAgentStudioPrescription?.addEventListener("click", () => {
  runPrescriptionCheckup();
});

// Studio Pinned Directives
function handleAddStudioPinnedRule() {
  const text = el.agentStudioPinnedInput?.value.trim();
  if (!text) return;
  if (!state.agentPinnedRules) state.agentPinnedRules = [];
  if (!state.agentPinnedRules.includes(text)) {
    state.agentPinnedRules.push(text);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
  if (el.agentStudioPinnedInput) el.agentStudioPinnedInput.value = "";
}
el.btnAgentStudioAddPinned?.addEventListener("click", handleAddStudioPinnedRule);
el.agentStudioPinnedInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddStudioPinnedRule();
  }
});
el.agentStudioPinnedChips?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".agent-pinned-chip-remove");
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.ruleIndex || "0", 10);
  if (state.agentPinnedRules && idx >= 0 && idx < state.agentPinnedRules.length) {
    state.agentPinnedRules.splice(idx, 1);
    localStorage.setItem("chargen_agent_pinned_rules", JSON.stringify(state.agentPinnedRules));
    renderPinnedRules();
  }
});


