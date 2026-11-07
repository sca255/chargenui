# 🔮 CharGen Harness
> **The Uncensored Roleplay Character Engineer, Enhancer & Multimodal Vision Forge**

An advanced roleplay character engineering harness inspired by Lumiverse's Weaver architecture, but engineered specifically with:
1. **Zero Censorship / Moralizing**: Operates with zero puritanical guardrails, preaching, or refusal disclaimers. Handles dark fiction, gritty psychological tension, mature/NSFW attributes, taboo conflicts, and authentic dialogue.
2. **Deep Character Enhancer**: Not just a card maker—audit existing character cards, eliminate generic AI clichés, deepen internal tensions, rewrite opening scenes, and generate alternate greetings.
3. **Multimodal Vision Scanner**: Scan character portraits, anime artwork, cosplay photos, or concept art with vision models (Gemini, Claude, GPT-4o, Ollama/Llama 3.2-Vision) to forensically deconstruct appearance, vibe, and demeanor into a complete SillyTavern V2 character card.
4. **Embedded PNG Card Generation**: Direct import & export of SillyTavern-compliant `.png` character cards containing the embedded `chara` base64 chunk.

---

## ⚡ Quick Start

### Option A: Web Application
```bash
# In the project directory
./start.sh
# Or directly with Bun
bun run start
```
Then open your browser at **[http://localhost:3333](http://localhost:3333)**.

### Option B: Native Desktop Studio (PySide6 + QML)
```bash
# Launch native desktop application (auto-starts Bun daemon if offline)
./desktop/run.sh
```
The native desktop client runs a full GPU-accelerated Qt 6 Quick interface with high-DPI scaling, native system file pickers, real-time token telemetry, Weaver Guided Interview workshop, and multi-theme/BDSM tag selector.

---

## 🌟 Key Features

### 1. 👁️ Multimodal Vision Image Scanner (Image-to-Card)
- **Upload or Drop Any Image**: Character portraits, digital paintings, anime artwork, or 3D renders.
- **Forensic Visual Deconstruction**: Extracts anatomy, apparent age, hair, eyes, facial expressions, micro-demeanor, wardrobe layers, weapons/props, lighting, and ambient atmosphere.
- **Psychological Profiling**: Infers character archetypes, latent contradictions (e.g. elegant formalwear paired with bloodied knuckles and concealed daggers), and vocal register.
- **Direct PNG Card Injection**: Automatically re-encodes the scanned image with the generated V2 Character Card embedded directly into the PNG metadata (`chara` chunk), ready for SillyTavern, Lumiverse, Agnai, and RisuAI.

### 2. ⚡ The Enhancer Suite
Take any existing card (from PNG, JSON, or raw text) and run specialized enhancement modules:
- 🩺 **Diagnostic Card Audit**: Scores cards (0–100) and detects weak points (lack of contradiction, missing reaction boundaries, "eager agreeable bot" syndrome, passive starters, cliché stock phrases).
- 🧠 **Deepen Persona & Psychology**: Sharpens the **Central Contradiction** (internal warring forces that prevent 1D tropes) and builds concrete sensory habits.
- 🎙️ **Voice Rules & Ali:Chat Examples**: Crafts distinctive idiolect rules, forbidden words the character would never say, and generates 3–5 multi-beat example dialogue exchanges formatted with `<START>` tags.
- 🎬 **Scene Starter & Alternate Greetings**: Rewrites opening greetings with sensory hooks and clear agency, and generates multiple alternate greetings for different roleplay branches (e.g. Hostile Interrogation, Late-Night Intimacy, In Media Res combat).
- 🗜️ **Token Compressor & Format Converter**: Convert between Natural Prose, Boostyle (`[Character("Name"){...}]`), W++ (`[character("Name"){...}]`), and Markdown, reducing token bloat by 20–40%.
- 📚 **World Info & Lorebook Generator**: Automatically creates SillyTavern embedded character books with activation keys for signature weapons, factions, locations, and secrets.
- 🎭 **Tone & Dynamic Shifter**: Shifts demeanor along uncensored creative axes (Grittier, Sensual, Tsundere, Yandere, Stoic, Playful).
- 🚀 **Full Overhaul**: Executes persona deepening, voice polish, and starter punch-up in a single pass.

### 3. ⛩️ Weaver-Inspired Spine Architecture
Built upon the principles of elite roleplay engineering:
- **Central Contradiction**: Two forces pulling against each other (not a bolted-on flaw).
- **Calibrated Reaction Gradient**:
  - `wont`: Hard limits (trust-invariant boundaries).
  - `craves`: Obsessive desires, paired with what repels them.
  - `neutral`: Flat reactions (topics that leave the character unmoved, breaking default agreeable chatbot behavior).
  - `will`: Behaviors unlocked only through earned trust.
- **Sensory Embodiment**: Physical specs designed as a consult-only reference, not recited as an inventory list.

### 4. 🎨 Diffusion Image Prompt Generator & Offline Queue (ComfyUI / Flux / Pony)
- **VRAM-Saving Offline Workflow**: Designed specifically for creators running local LLMs and diffusion models on a single GPU. Generate characters and their tailored visual prompts first, then shut down your LLM to free VRAM and batch-generate images in ComfyUI or WebUI!
- **Architecture-Tuned Prompting**:
  - **Flux.1 / SD 3.5**: Natural language descriptive prose focusing on lighting, materials, and composition without tag stuffing.
  - **Pony Diffusion V6 / XL**: Automatic score prefix (`score_9, score_8_up... rating_safe/explicit`), Danbooru visual tags, and negative score tags.
  - **Illustrious-XL / Animagine**: Clean booru tags with quality headers.
  - **SDXL Standard & Midjourney V6**: Photographic or anime styling with optimal aspect ratios (`832x1216`, `1024x1024`, `1216x832`, `768x1344`).
- **Persistent Offline Queue**:
  - Saved to `data/image_prompt_queue.json` across sessions.
  - 1-click clipboard buttons for Positive, Negative, or full ComfyUI payload.
  - Batch export to **JSON** (ComfyUI batch queue) or formatted **Text Sheet** (`.txt`).
  - **One-Click Avatar Attachment**: Drag and drop generated images back onto queue items to automatically embed them into the character card!

### 5. 🌐 Model Providers Supported
- **llama.cpp Native Server (`llama-server`)**: Directly connects to llama.cpp's native `POST /completion` endpoint (not OpenAI compatibility wrapper). Supports native prompt formatting, ChatML, stop tokens, and native multimodal vision via `image_data: [{ data, id }]` with `[img-1]` tags! (Default: `http://127.0.0.1:8080`).
- **Ollama**: Local Ollama models (`http://localhost:11434/v1`).
- **Google Gemini**: Gemini 2.5 Flash, Gemini 2.0 Flash, Gemini 1.5 Pro (Multimodal Vision + Text with `BLOCK_NONE` safety thresholds).
- **OpenRouter**: Access uncensored models (DeepSeek, Llama 3 Uncensored, Claude, Qwen, etc.).
- **OpenAI-Compatible / Local**: LM Studio, vLLM, Aphrodite, TabbyAPI, etc.
- **Anthropic**: Claude 3.5 Sonnet / Haiku.

---

## 📦 File Architecture

```
chargenui/
├── package.json
├── tsconfig.json
├── start.sh
├── .env.example
├── src/
│   ├── server.ts                    # Bun API server + static file serving
│   ├── types/
│   │   ├── character.ts             # SillyTavern V1/V2, CharX, Lorebook types
│   │   ├── provider.ts              # Model configurations & multimodal types
│   │   └── harness.ts               # Generator, enhancer & vision request types
│   ├── services/
│   │   ├── llm/
│   │   │   ├── provider-router.ts   # Routes requests to Gemini, OpenRouter, OpenAI, Claude
│   │   │   ├── gemini.ts            # Gemini text & vision with BLOCK_NONE
│   │   │   ├── openai-compat.ts     # OpenAI / OpenRouter / Ollama text & vision
│   │   │   └── anthropic.ts         # Claude text & vision
│   │   ├── vision/
│   │   │   ├── deconstruct.ts       # Multimodal image deconstruction
│   │   │   └── image-to-card.ts     # Vision synthesis + PNG card injection
│   │   ├── character/
│   │   │   ├── png-card.ts          # Pure TS PNG tEXt 'chara' chunk reader & writer
│   │   │   ├── card-parser.ts       # Ingestion for PNG, JSON, CharX, text
│   │   │   └── token-counter.ts     # Fast token estimator
│   │   ├── generator/
│   │   │   ├── uncensored-prompts.ts# Anti-trope, uncensored generation prompts
│   │   │   └── quick-spark.ts       # Prompt-to-card generator
│   │   └── enhancer/
│   │       ├── diagnostic.ts        # Card audit & weakness detection
│   │       ├── persona-deepener.ts  # Contradiction, psychology, sensory habits
│   │       ├── voice-alichat.ts     # Idiolect rules & Ali:Chat <START> generation
│   │       ├── greetings-puncher.ts # Starter revamp & alternate greetings
│   │       ├── token-compressor.ts  # Boostyle, W++, Markdown conversion
│   │       ├── lorebook-builder.ts  # SillyTavern character_book entries
│   │       ├── tone-shifter.ts      # Uncensored tone calibration
│   │       └── index.ts             # Enhancer dispatcher
│   └── public/
│       ├── index.html               # Tactical 3-column UI layout
│       ├── style.css                # Dark cyber/tactical styling
│       └── app.js                   # Client-side reactivity, tokens, API handlers
```
