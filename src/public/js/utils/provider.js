import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { apiGet } from "../core/api.js";

// Update Top Header LLM Cache Status Badge
export async function updateLlmCacheBadge() {
  const btn = document.getElementById("btn-toggle-llm-cache");
  if (!btn) return;
  try {
    const res = await apiGet("/api/llm/cache");
    if (res.enabled) {
      btn.className = "header-badge-cache enabled";
      btn.innerHTML = `⚡ Cache (<span id="llm-cache-count">${res.totalEntries || 0}</span>)`;
      btn.title = `LLM Response Cache ON: ${res.totalEntries || 0} responses saved (${((res.totalBytes || 0) / 1024).toFixed(1)} KB). Instant replay active. Click to toggle OFF. Right-click to clear cache.`;
    } else {
      btn.className = "header-badge-cache disabled";
      btn.innerHTML = `🚫 Cache (<span id="llm-cache-count">${res.totalEntries || 0}</span>)`;
      btn.title = `LLM Response Cache OFF. Click to toggle ON.`;
    }
  } catch (e) {
    console.warn("Failed fetching LLM cache stats:", e);
  }
}

export function updateProviderBadge() {
  if (!el.headerProviderBadge) return;
  const p = state.provider;
  const envKeyPresent =
    (p.type === "gemini" && state.envKeys.hasGemini) ||
    (p.type === "openrouter" && state.envKeys.hasOpenRouter) ||
    (p.type === "openai" && state.envKeys.hasOpenAI) ||
    (p.type === "anthropic" && state.envKeys.hasAnthropic);

  const hasCredentials = p.type === "ollama" || p.type === "llamacpp" || p.apiKey || envKeyPresent;

  if (p && p.type && p.type !== "none" && hasCredentials) {
    const modelShort = p.model ? p.model.split("/").pop() : "";
    el.headerProviderBadge.textContent = `🟢 ${p.type.toUpperCase()}${modelShort ? `: ${modelShort}` : ''}`;
    el.headerProviderBadge.style.background = "rgba(16, 185, 129, 0.15)";
    el.headerProviderBadge.style.borderColor = "#10b981";
    el.headerProviderBadge.style.color = "#34d399";
    el.headerProviderBadge.title = `Active LLM Provider: ${p.type} (${p.model || 'default'}). Click to configure.`;
  } else {
    el.headerProviderBadge.textContent = "⚠️ No Key";
    el.headerProviderBadge.style.background = "rgba(239, 68, 68, 0.15)";
    el.headerProviderBadge.style.borderColor = "#ef4444";
    el.headerProviderBadge.style.color = "#f87171";
    el.headerProviderBadge.title = "⚠️ NO API KEY (NO FREE AI) - Click to configure API key in Settings";
  }
}

// Guard: Validates provider and alerts user if not configured
export function assertProviderConfigured() {
  const p = state.provider;
  if (!p || !p.type || p.type === "none") {
    alert(
      "🤡 Did you seriously think we were offering free AI?\n\n" +
      "You haven't configured any provider or API key, you absolute melon!\n" +
      "We are NOT running a free charity for freeloaders.\n\n" +
      "Click 'OK' to open Settings (⚙️) and enter your own API key (Gemini, OpenRouter, Anthropic, OpenAI) or connect local Ollama."
    );
    if (el.modalSettings) el.modalSettings.classList.remove("hidden");
    return false;
  }

  const envKeyPresent =
    (p.type === "gemini" && state.envKeys.hasGemini) ||
    (p.type === "openrouter" && state.envKeys.hasOpenRouter) ||
    (p.type === "openai" && state.envKeys.hasOpenAI) ||
    (p.type === "anthropic" && state.envKeys.hasAnthropic);

  if (p.type !== "ollama" && p.type !== "llamacpp" && !p.apiKey && !envKeyPresent) {
    alert(
      `🤡 Bro thought the AI was free!\n\n` +
      `You selected '${p.type.toUpperCase()}' but didn't provide an API key!\n` +
      `We don't sponsor free tokens. Enter your API key in Settings (⚙️) or put it in .env.`
    );
    if (el.modalSettings) el.modalSettings.classList.remove("hidden");
    return false;
  }

  return true;
}
