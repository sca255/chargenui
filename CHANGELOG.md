# 🚀 Changelog - v1.0.0

All notable changes to the **CharGen Harness & Studio** ecosystem are documented below.

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
