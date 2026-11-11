// Diff calculation, text utilities & history snapshotting
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { syncStateToUI, syncUIToState } from "../core/ui-sync.js";

export function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function computeWordDiff(strOld, strNew) {
  if (!strOld && !strNew) return "";
  if (!strOld) return `<span class="diff-ins">${escapeHtml(strNew)}</span>`;
  if (!strNew) return `<span class="diff-del">${escapeHtml(strOld)}</span>`;

  const words1 = strOld.split(/(\s+|[.,!?;:"'()\[\]{}]+)/).filter(Boolean);
  const words2 = strNew.split(/(\s+|[.,!?;:"'()\[\]{}]+)/).filter(Boolean);

  const m = words1.length;
  const n = words2.length;

  if (m * n > 400000) {
    return fastLineDiff(strOld, strNew);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m, j = n;
  const result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      result.push({ type: "eq", text: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "ins", text: words2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({ type: "del", text: words1[i - 1] });
      i--;
    }
  }

  result.reverse();

  let html = "";
  for (const part of result) {
    if (part.type === "eq") {
      html += escapeHtml(part.text);
    } else if (part.type === "ins") {
      html += `<span class="diff-ins">${escapeHtml(part.text)}</span>`;
    } else if (part.type === "del") {
      html += `<span class="diff-del">${escapeHtml(part.text)}</span>`;
    }
  }
  return html;
}

export function fastLineDiff(strOld, strNew) {
  const linesOld = strOld.split("\n");
  const linesNew = strNew.split("\n");
  let html = "";
  let i = 0, j = 0;
  while (i < linesOld.length || j < linesNew.length) {
    if (i < linesOld.length && j < linesNew.length && linesOld[i] === linesNew[j]) {
      html += escapeHtml(linesOld[i]) + "\n";
      i++; j++;
    } else if (j < linesNew.length && (!linesOld.includes(linesNew[j]) || i >= linesOld.length)) {
      html += `<span class="diff-ins">${escapeHtml(linesNew[j])}</span>\n`;
      j++;
    } else if (i < linesOld.length) {
      html += `<span class="diff-del">${escapeHtml(linesOld[i])}</span>\n`;
      i++;
    } else {
      break;
    }
  }
  return html;
}

export function recordSnapshot(label = "Card Update") {
  syncUIToState();
  const tokens = parseInt(el.tokenTotalNum?.textContent || "0", 10) || 0;
  const score = parseInt(el.cardScoreNum?.textContent || "0", 10) || 0;

  const snapshot = {
    id: "snap_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    label,
    timestamp: Date.now(),
    character: JSON.parse(JSON.stringify(state.character)),
    tokenCount: tokens,
    score: score,
  };

  state.history.unshift(snapshot);
  if (state.history.length > 25) {
    state.history.pop();
  }
  if (el.historyCountBadge) {
    el.historyCountBadge.textContent = state.history.length;
  }
}

export function renderHistoryDiffModal() {
  if (!el.diffSnapshotList) return;

  if (state.history.length === 0) {
    recordSnapshot("Current Workspace");
  }

  el.diffSnapshotList.innerHTML = state.history.map((snap, idx) => {
    const isSelected = idx === state.selectedDiffIndex;
    const timeStr = new Date(snap.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `
      <div class="diff-snapshot-item ${isSelected ? "active" : ""}" data-index="${idx}">
        <div class="diff-snapshot-title">${escapeHtml(snap.label)}</div>
        <div class="diff-snapshot-meta">
          <span>${timeStr}</span> • <span>${snap.tokenCount} tokens</span>
        </div>
      </div>
    `;
  }).join("");

  updateDiffView();
}

function formatDiffFieldValue(val, field) {
  if (field === "alternate_greetings") {
    if (!Array.isArray(val)) {
      if (typeof val === "string" && val.trim()) val = [val.trim()];
      else return "(no alternate greetings)";
    }
    if (val.length === 0) return "(no alternate greetings)";
    return val
      .map((g, idx) => `=== Greeting #${idx + 1} ===\n${(g || "").trim()}`)
      .join("\n\n");
  }
  if (Array.isArray(val)) {
    return val.join("\n");
  }
  return (val || "").toString().trim();
}

export function updateDiffView() {
  if (!el.diffViewContent) return;
  const snap = state.history[state.selectedDiffIndex];
  if (!snap) {
    el.diffViewContent.innerHTML = "No snapshot selected.";
    return;
  }

  syncUIToState();
  const currentVal = formatDiffFieldValue(state.character[state.selectedDiffField], state.selectedDiffField);
  const snapVal = formatDiffFieldValue(snap.character?.[state.selectedDiffField], state.selectedDiffField);

  const currentTokens = parseInt(el.tokenTotalNum?.textContent || "0", 10) || 0;
  const tokenDelta = currentTokens - snap.tokenCount;
  const deltaStr = tokenDelta >= 0 ? `+${tokenDelta}` : `${tokenDelta}`;

  if (el.diffCompareTitle) {
    el.diffCompareTitle.textContent = `Comparing "${snap.label}" → Active Workspace`;
  }
  if (el.diffDeltaBadge) {
    el.diffDeltaBadge.textContent = `(${deltaStr} tokens | Snapshot: ${snap.score} / 100)`;
  }

  if (snapVal === currentVal) {
    el.diffViewContent.innerHTML = `<span style="color: var(--text-dim);">(No differences in ${state.selectedDiffField})</span>\n\n${escapeHtml(currentVal)}`;
  } else {
    const diffHtml = computeWordDiff(snapVal, currentVal);
    el.diffViewContent.innerHTML = diffHtml;
  }
}

export function restoreSelectedSnapshot() {
  const snap = state.history[state.selectedDiffIndex];
  if (!snap) return;
  if (!confirm(`Restore character card to revision "${snap.label}"?`)) return;

  state.character = JSON.parse(JSON.stringify(snap.character));
  syncStateToUI();
  recordSnapshot(`Restored: ${snap.label}`);
  el.modalHistoryDiff?.classList.add("hidden");
  alert(`⏪ Successfully restored revision "${snap.label}"!`);
}

// History & Diff Event Listeners
el.btnOpenHistory?.addEventListener("click", () => {
  el.modalHistoryDiff?.classList.remove("hidden");
  renderHistoryDiffModal();
});
el.btnCloseHistory?.addEventListener("click", () => el.modalHistoryDiff?.classList.add("hidden"));
el.btnCloseHistoryFooter?.addEventListener("click", () => el.modalHistoryDiff?.classList.add("hidden"));
el.btnDiffRestore?.addEventListener("click", restoreSelectedSnapshot);

el.diffSnapshotList?.addEventListener("click", (e) => {
  const item = e.target.closest(".diff-snapshot-item");
  if (!item) return;
  state.selectedDiffIndex = parseInt(item.dataset.index, 10);
  document.querySelectorAll(".diff-snapshot-item").forEach((node) => node.classList.remove("active"));
  item.classList.add("active");
  updateDiffView();
});

document.querySelectorAll(".diff-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.selectedDiffField = tab.dataset.field;
    document.querySelectorAll(".diff-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    updateDiffView();
  });
});



