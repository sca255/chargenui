# 📖 CharGenUI User Guide

Welcome to **CharGenUI**, the open, uncensored roleplay character engineering harness, multimodal vision forge, and story architecture studio.

---

## 🚀 1. Getting Started

### Prerequisites
- **Bun** (v1.0+): Primary server and API runtime.
- **Python 3.10+ & PySide6** (optional): For the native Desktop Studio and ComfyClient diffusion sidecar.
- **LLM Backend**: Local OpenAI-compatible server (e.g. `llama-server`, Ollama, vLLM, LM Studio) or cloud provider (OpenRouter, OpenAI, Claude).

### Quick Start
```bash
# Clone the repository
git clone https://github.com/chargenui/chargenui.git
cd chargenui

# Install dependencies and build assets
bun install
bun run build

# Start the web harness
bun run start
```
Open **[http://localhost:3333](http://localhost:3333)** in your browser.

---

## 🌟 2. Core Workflows & Features

### A. The Character Workshop
- **Tagged Bundle Architecture**: Generates cards structured cleanly into `[CORE]`, `[ARC]`, `[FORM]`, `[TENSIONS]`, `[INTENT]`, and `[NEGATIVE SPACE]`.
- **Performable Voice & Speech Spec Sheet**: Replaces robotic dialogue with natural human spoken cadence, idiosyncratic lexicon, forbidden words, and `<START>` example exchanges.
- **Embedded PNG & CharX Container Support**: Imports and exports SillyTavern V2/V3 `.png` character cards with embedded metadata, as well as modern `.charx` multi-asset bundles.

### B. Weaver Interview Studio & System 1 Decision Model
- **Interactive Multi-Branch Interview**: Deepen character ideas before generation. Refine psychometrics, internal contradictions, and reaction gradients.
- **⚡ System 1 Decision Model (Clef / Jev)**:
  - Supports Cloudflare Clef (`@cf/cloudflare/clef-flash`), TypeSafe AI Jev, or custom endpoints.
  - **Auto-Pick with Jev**: Evaluates options in milliseconds to pick the most compelling psychological branch.
  - **Answer Relevance Gate**: Verifies custom user answers to ensure they directly address the character dimension before forging.

### C. The Era Forge (Setting & Culture Engine)
- **120+ Curated Historical & Speculative Eras**: Explore settings ranging from the Bronze Age collapse and Heian Court to Dark Fantasy Imperiums and Cyberpunk megacities.
- **Content Tiers**: Filter by `Vanilla`, `Mature`, or `NSFL` settings.
- **Anti-Cliche Mandate**: Replaces formulaic pulp cliches with grounded social codes, guild economics, and cultural friction.

### D. Companion Applications & IPC
- **Desktop Studio (`desktop/run.sh`)**: High-performance PySide6/QML desktop interface connected directly via Unix domain socket (`/tmp/chargenui-ipc.sock`).
- **ComfyClient (`comfyclient/run.sh`)**: Dedicated diffusion runner for Stable Diffusion, Flux, and SD.cpp with background prompt queue management.
- **Smart Re-Queue Check**: Intelligent visual change detection that re-generates or re-queues avatar/greeting image prompts only when meaningful visual edits occur.

---

## ⚙️ 3. Configuration & Providers

Configure your providers directly in the web UI under **Settings**:
- **Generative LLM**: Supports llamacpp, Ollama, OpenRouter, and OpenAI-compatible endpoints.
- **Decision Model**: Enable Cloudflare Clef or Jev for fast bounded classification, or select **Fallback to Primary LLM**.
- **Diffusion Target Models**: Tailored prompts for Flux, Illustrious-XL, SDXL Pony, and Midjourney.

---

## 🔒 4. Data Safety & Privacy
- **Local-First**: All character cards and lorebooks reside locally on your machine.
- **Zero Telemetry**: No external trackers or metrics.
