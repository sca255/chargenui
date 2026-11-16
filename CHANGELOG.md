# 🚀 Changelog

All notable changes to the **CharGen Harness & Studio** ecosystem are documented below.

## [v1.2.0] - 2026-11-16

### 🌟 Major Subsystem Updates & Modular Preset Engine
- **📜 Dynamic Prompt Preset Architecture (`idea_generator/` & `src/services/config/`)**:
  - Implemented modular, file-backed prompt preset discovery in both the Python Idea Forge pipeline and TypeScript runtime.
  - Added dedicated preset selectors in PySide6/QML UI (`idea_generator/qml/Main.qml`), allowing one-click runtime switching between creative directives.
  - Added dynamic getters for effective uncensored system prompts, agent harness directives, governance contracts, and story arc templates.
- **🧠 Idea Generator Pipeline Modularization**:
  - Refactored `idea_generator/pipeline.py` to route all prompt authoring through `idea_generator/prompt_presets.py`.
  - Added fallback safe paths (`/tmp/chargenui`) for system log configurations.
- **🎨 Configurable Story Arc, Vision & Enhancer Templates**:
  - Added schema support and dynamic resolution for `storyArcPrompt`, `visionPrompts`, `enhancerPrompts`, and `reimagine` directives.
- **🔒 Gitignore & Preset Directory Safeguards**:
  - Configured Git ignores for `config/presets/` and `idea_generator/presets/` while maintaining `.gitkeep` directory anchors.

---

## [v1.0.1] - 2026-11-15

### 🌟 Enhancements & Polish
- **⚡ System One Decision Protocol & Model Auto-Discovery**:
  - Aligned Decision Service with the formal System One endpoint (`/v1/systemone` on port `8017`).
  - Added dynamic model auto-discovery querying `/v1/models` on startup to automatically bind available models (e.g., `jevos-v5`, `clef`).
  - Formatted question payloads using criteria maps (`choice`, `noul`) and normalized probabilities/scores.
- **🎙️ Weaver Options Quality & Autonomous Reroll Gate**:
  - Filter gate now checks both question leverage and option responsiveness.
  - Automatically rerolls option candidates up to 10 times if initial options are evasive or weak before presenting them to the user.
- **📦 Runtime Asset Automation & Repository Cleanup**:
  - Untracked generated `src/public/index.html` from Git; added to `.gitignore`.
  - Added automatic HTML assembly on server startup in `src/server.ts`.
  - Added standalone `install.sh` and `update.sh` helper scripts for automated setup, dependency installation, and asset building.
  - Hardened prompt profile discovery in `prompt-config.ts` to strictly ignore non-prompt JSON configs.

---

## [v1.0.0] - 2026-11-14

### 🌟 Highlights & Major Features
- **⚡ System 1 Decision Model Engine (`src/services/decision/`)**:
  - Integrated Cloudflare Workers AI Clef (`@cf/cloudflare/clef-flash`), TypeSafe AI Jev, and custom HTTP OpenAI-compatible decision endpoints.
  - Enables sub-50ms bounded classifications with transparent fallback to the primary LLM or pass-through defaults.
- **🎙️ Weaver Guided Interview & Auto-Pick**:
  - Added "⚡ Auto-Pick with Jev" across interview questions to rapidly explore divergent narrative branches.
  - Implemented real-time answer relevance verification (`/api/weaver/check-answer`) to guard against evasive inputs before card forging.
- **🎨 Smart Image Re-Queue & Visual Change Detection**:
  - Added intelligent change evaluation (`/api/image-prompts/smart-requeue-check`) that only triggers diffusion regeneration when a meaningful visual change occurs to an existing avatar or greeting image.
- **🏛️ Era Forge Declichification & Anti-Slop Overhaul**:
  - Cleaned and modernized 120+ historical and fantasy era definitions in `eras_data.json`, stripping repetitive pulp tropes in favor of authentic cultural codes, trade leverage, and guild dynamics.
  - Added granular content tiering (`vanilla`, `mature`, `nsfl`) and semantic search filtering.
- **🛡️ Copyright Sanitization & Clean Governance**:
  - Replaced legacy Weaver governance contracts with the original, local-model-optimized `CHARGEN_ROLEPLAY_CONTRACT`.
  - Refined Danbooru tag rules in `prompt-config.ts` to ensure clean independence from external reference projects.
- **📦 Multi-Asset Bundling & Container Support**:
  - Full support for SillyTavern V2/V3 embedded `.png` character cards and modern `.charx` multi-asset archives.
  - Expression sheet generator supporting up to 28 canonical roleplay facial expressions.

### 🛠️ Infrastructure & Testing
- Fully green test suite across character migrations, archetype vector arithmetic, timelines, asset pipelines, and plugins (`bun test`).
- High-efficiency production builds: modularized HTML and bundled JavaScript assets (`bun run build`).
- Complete Unix Domain Socket IPC interconnect between CharGenUI, Desktop Studio (`desktop/`), and ComfyClient (`comfyclient/`).

---
