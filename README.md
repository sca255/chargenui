# 🔮 CharGen Harness
> **The Uncensored Roleplay Character Engineer, Weaver Studio & Multimodal Vision Forge**

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/sca255/chargenui/releases/tag/v1.0.1)
[![Runtime](https://img.shields.io/badge/runtime-Bun%201.0+-orange.svg)](https://bun.sh)
[![Architecture](https://img.shields.io/badge/format-SillyTavern%20V2%2FV3%20%7C%20CharX-purple.svg)](https://github.com/sca255/chargenui)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Stop generating cardboard, agreeable chatbots that speak like academic textbooks. 

**CharGen Harness** is an open-source, full-stack character authoring workshop designed to construct high-tension, psychologically deep roleplay characters optimized for **local models** (`llama-server`, Ollama, vLLM) and cloud APIs alike.

---

## ⚡ What Makes CharGen Different?

### 1. 🚫 Anti-Slop & Zero-Pleaser Conditioning
Most LLMs default to "Thesaurus Syndrome"—polite, robotic, agreeable assistants who smile nervously, agree with everything, and recite appearance traits like a grocery list. 
CharGen enforces:
- **Calibrated Reaction Gradients**: Defines what leaves {{char}} completely flat and unimpressed (`NEUTRAL`), hard limits they will never cross (`WON'T`), and vulnerabilities that must be earned through trust (`WILL`).
- **Natural Spoken Cadence**: Banned clinical jargon ("statistical anomaly", "nutrient intake"), enforced contractions (*don't*, *won't*, *it's*), and distinct vocal mannerisms.
- **Tagged Bundle Architecture**: Structured cleanly into performable sections (`[CORE]`, `[ARC]`, `[FORM]`, `[TENSIONS]`, `[INTENT]`, `[NEGATIVE SPACE]`).

### 2. ⚡ System 1 Decision Model Engine (Jev / Clef Integration)
CharGen is the first character creator integrated with **fast bounded classification models** (Cloudflare Clef / TypeSafe AI Jev):
- **⚡ Auto-Pick with Jev**: Explore divergent narrative branches and psychometrics in sub-50ms passes.
- **🛡️ Answer Relevance Verification**: Detects evasive or off-topic responses in real time before card forging.
- **🎨 Smart Image Re-Queue**: Evaluates semantic diffs between card edits and only updates image generation queues if actual visual traits changed.

### 3. 👁️ Multimodal Vision Image-to-Card Forge
Drop in any anime portrait, fantasy illustration, or 3D render:
- Forensically deconstructs facial demeanor, lighting, wardrobe layers, scars, weapons, and latent body language.
- Infers psychological archetypes and backstory from visual cues.
- Automatically injects the completed card metadata directly into the image’s `chara` chunk, exporting ready-to-play **SillyTavern PNGs**.

### 4. 🏛️ The Era Forge: 120+ Curated Historical & Fantasy Settings
Leave generic fantasy kingdoms behind. Ground your characters in authentic cultural codes, guild rivalries, and trade tensions:
- Spans Bronze Age Dynasties, Medieval Feudalism, Heian Court intrigue, Cold War Espionage, and Basalt Dark Fantasy.
- Content rating filters: `Vanilla`, `Mature`, and `NSFL`.
- Completely declichified and purged of formulaic pulp tropes.

### 5. 🔌 Multi-Process Companion Ecosystem
- **Web UI (`:3333`)**: Clean, responsive tabbed interface with live diff inspectors, token telemetry, and health audits.
- **Desktop Studio (`desktop/run.sh`)**: GPU-accelerated PySide6/QML desktop app linked via zero-latency **Unix Domain Socket** (`/tmp/chargenui-ipc.sock`).
- **ComfyClient Sidecar (`comfyclient/run.sh`)**: Headless or native diffusion runner for SDXL, Flux, Illustrious, and `sd.cpp`.

---

## 🚀 One-Line Quick Start

### Installation
```bash
git clone https://github.com/sca255/chargenui.git
cd chargenui

# Automated setup (checks Bun, installs deps, and builds assets)
./install.sh
```

### Launch
```bash
./start.sh
```
Open **[http://localhost:3333](http://localhost:3333)** in your browser!

### Updating
Whenever new updates land:
```bash
./update.sh
```

---

## 🛠️ Supported Formats & Integrations

- **Card Formats**: SillyTavern V2 & V3 PNGs, modern `.charx` multi-asset bundles, raw JSON.
- **LLM Backends**: Local `llama.cpp` (`llama-server`), Ollama, OpenRouter, OpenAI, Claude, LM Studio.
- **Image Diffusion**: Automatic ComfyUI workflow generation, Booru tag translation, and SD.cpp dispatch.
- **Asset Plugins**: Expression sheet generator (up to 28 canonical expressions), outfit variants, and VTT token packs.

---

## 🤝 Community & Feedback
Found an edge case or want to suggest new era templates? 
- **GitHub**: [https://github.com/sca255/chargenui](https://github.com/sca255/chargenui)
- **Releases**: [View Changelogs & Releases](https://github.com/sca255/chargenui/releases)

---

## ⚖️ Legal Documentation, User Responsibility & Disclaimers

### User Responsibility
- **Self-Hosted Operation**: CharGenUI is general-purpose, self-hosted software distributed for independent installation, configuration, and operation by users.
- **Independent Content Control**: Users independently choose how to operate the software and are solely responsible for all content they generate, import, modify, store, or distribute using the application.
- **Legal Compliance**: Users must ensure that their installation, generation prompts, and resulting materials comply with all laws, regulations, and statutes applicable in their jurisdiction and country of operation.
- **Third-Party Rights**: Users must respect intellectual property rights, copyrights, publicity rights, and privacy rights of third parties when authoring or importing character data, names, imagery, and lore.
- **Terms of External Providers**: When configuring cloud AI integrations, users are independently responsible for reviewing and adhering to the respective provider's terms of service, usage policies, and content restrictions.

### Developer Role and Content Ownership
- **Software Distribution Only**: The developer distributes CharGenUI solely as open-source application software. The developer does not author, curate, review, verify, approve, endorse, or publish characters or content created by users.
- **No Public Hosting or Central Gallery**: CharGenUI is not a centralized content-hosting, character-sharing, or public publishing service. All card databases and generation assets reside locally on the user's host machine.
- **No Claim of Content Ownership**: The developer claims no ownership, intellectual property rights, or licensing stake in any user-generated character cards, text, or images produced using the software.
- **Data Flow Transparency**: When local engines (such as `llama-server`, Ollama, or ComfyUI) are selected, inference and data remain entirely on the user's local network. When external cloud providers (such as Gemini, Anthropic, OpenAI, or OpenRouter) are chosen by the user, submitted prompts, character metadata, and reference images are transmitted directly across the network to that third-party provider's endpoints.

### Third-Party Services
- Cloud AI providers (including Google Gemini, Anthropic, OpenAI, OpenRouter, and Cloudflare Workers AI) are independently operated external services.
- Their respective terms of service, privacy policies, availability, pricing, and content restrictions apply independently to the user's API credentials.
- Users select and provide their own API endpoints and keys and are responsible for their use. CharGenUI does not warrant or guarantee the availability, reliability, legality, safety, or behaviour of any third-party model or service.

### Disclaimer of Warranty and Limitation of Liability
- **As-Is Provision**: CharGenUI is provided "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT, as set forth in the [LICENSE](file:///mnt/d/projects/chargenui/LICENSE).
- **Limitation of Liability**: To the maximum extent permitted by applicable law, in no event shall the authors, copyright holders, or contributors be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with:
  1. Any user-generated, imported, or exported content;
  2. The independent operation, deployment, or misuse of the software;
  3. User-configured models, third-party AI providers, or remote API endpoints;
  4. Local network exposure, unauthenticated hosting, or system modifications; or
  5. Any indirect, incidental, consequential, special, or exemplary damages.
- Nothing in this disclaimer excludes or limits liability that cannot legally be excluded under applicable governing law.

---

*Crafted with zero puritanical moralizing, zero corporate filters, and 100% focus on deep, performable roleplay.*
