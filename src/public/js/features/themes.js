// Theme Pills & Selection
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { escapeHtml } from "../utils/diff.js";

export function renderThemePills() {
  if (!el.selectedThemesBox) return;
  const themes = state.selectedThemes || [];
  if (themes.length === 0) {
    el.selectedThemesBox.innerHTML = `<span id="no-themes-hint" style="font-size: 11px; color: var(--text-muted); align-self: center;">Click themes below or type custom tropes to tag...</span>`;
    if (el.btnClearThemes) el.btnClearThemes.style.display = "none";
  } else {
    if (el.btnClearThemes) el.btnClearThemes.style.display = "inline-block";
    el.selectedThemesBox.innerHTML = themes
      .map((t) => {
        const isBdsm = /bdsm|dom|sub|kink|collar|pet|femdom|maledom|brat|sadis|masoch|bondage|erotic|taboo|switch|sensory/i.test(t);
        return `<span class="selected-theme-pill ${isBdsm ? "pill-bdsm" : ""}" data-theme="${escapeHtml(t)}">
          <span>${escapeHtml(t)}</span>
          <span class="pill-remove" data-theme="${escapeHtml(t)}" title="Remove theme">×</span>
        </span>`;
      })
      .join("");
  }

  // Update active status on buttons (with case-insensitive & alias normalization)
  const chips = document.querySelectorAll(".theme-chip");
  const normalizedSelected = themes.map((t) => t.toLowerCase().replace(/&amp;/g, "&").trim());

  chips.forEach((chip) => {
    const rawTheme = chip.getAttribute("data-theme") || "";
    const cleanTheme = rawTheme.toLowerCase().replace(/&amp;/g, "&").trim();
    const parts = cleanTheme.split("/").map((p) => p.trim());

    // Matches if exact, or if tag is in parts (e.g. "Brat Tamer" matching "Brat / Brat Tamer")
    const isMatched = normalizedSelected.some((sel) => {
      if (sel === cleanTheme) return true;
      if (parts.includes(sel)) return true;
      if (sel.includes(cleanTheme) || cleanTheme.includes(sel)) return true;
      return false;
    });

    if (isMatched) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

export function addTheme(theme) {
  if (!theme) return;
  const trimmed = theme.trim();
  if (!trimmed) return;
  if (!state.selectedThemes) state.selectedThemes = [];
  if (!state.selectedThemes.includes(trimmed)) {
    state.selectedThemes.push(trimmed);
    renderThemePills();
  }
}

export function removeTheme(theme) {
  if (!state.selectedThemes) return;
  state.selectedThemes = state.selectedThemes.filter((t) => t !== theme);
  renderThemePills();
}

export function clearThemes() {
  state.selectedThemes = [];
  renderThemePills();
}

// Global click delegation for theme chips and pill remove buttons
document.addEventListener("click", (e) => {
  const chip = e.target.closest(".theme-chip");
  if (chip) {
    const theme = chip.getAttribute("data-theme");
    if (state.selectedThemes && state.selectedThemes.includes(theme)) {
      removeTheme(theme);
    } else {
      addTheme(theme);
    }
    return;
  }

  const pillRemove = e.target.closest(".pill-remove");
  if (pillRemove) {
    const theme = pillRemove.getAttribute("data-theme");
    removeTheme(theme);
    return;
  }
});

if (el.btnAddCustomTheme && el.customThemeInput) {
  el.btnAddCustomTheme.addEventListener("click", () => {
    addTheme(el.customThemeInput.value);
    el.customThemeInput.value = "";
  });
  el.customThemeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTheme(el.customThemeInput.value);
      el.customThemeInput.value = "";
    }
  });
}

if (el.btnClearThemes) {
  el.btnClearThemes.addEventListener("click", () => {
    clearThemes();
  });
}


