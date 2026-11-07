# ✨ CharGen Idea Forge (QML Desktop Studio)

A standalone QML / PySide6 desktop app and psychometric idea pipeline for synthesizing uncensored, high-friction roleplay character concepts (especially tailored for married dynamics, domestic discipline, brat taming, and power exchange).

Directly connected to **CharGenUI** via the server-side IPC Bridge on port `3333`.

## 🚀 Quick Start

Run the launcher from terminal:
```bash
./idea_generator/run.sh
```
Or directly via Python:
```bash
python3 idea_generator/app.py
```

## ⚙️ Configuration (`config.json`)

The server configuration lives at `idea_generator/config.json`:
```json
{
  "endpoint_url": "http://localhost:5001/v1",
  "model_name": "",
  "default_temperature": 0.85,
  "default_genre": "Modern Domestic / Slice of Life",
  "default_dynamic": "Domestic Discipline & Brat Taming",
  "default_intensity": "any",
  "chargen_url": "http://localhost:3333",
  "auto_check_connection": true
}
```
* **llama-server support**: Defaulted to your preferred port **`5001`** (`http://localhost:5001/v1`).
* **CharGenUI IPC Bridge**: Defaulted to port **`3333`** (`http://localhost:3333`).
* **In-App Saving**: You can also change the endpoint URLs directly inside the GUI and click **"Save"** or **"Connect"** to update `config.json` immediately.

---

## 🛠 Features

### 1. 🚀 Direct CharGenUI IPC Bridge (`:3333`)
Connects directly to CharGenUI without copy-pasting:
- **"🚀 Send to CharGenUI (:3333)" Button**: Pushes the active premise, character name, archetype title, and theme tags to `POST http://localhost:3333/api/ipc/suggest-concept`.
- **Automatic Spark Population**: CharGenUI immediately triggers a toast notification in your browser, selects matching theme pills, and populates the Spark Generator concept field!
- **Auto-Forge Toggle (`⚡ Auto-Forge: ON/OFF`)**: Toggle ON to instruct CharGenUI to immediately invoke the LLM card generator upon receiving the idea.
- **Live Status Indicator**: A header status pill monitors connection status to CharGenUI (`● CharGenUI :3333 (Online / Standby)`).

### 2. 🌶️ Spice & Intensity Dial
Switch instantly between 3 tailored intensity levels or use wildcard mode:
- **🌸 Cozy Brat (Mild)**: Playful domestic cheekiness, affectionate teasing, over-the-lap bare-hand spanking, sweet blanket swaddling, kitchen counter wrist-holding, and gentle reassurance.
- **⚖️ Domestic Discipline (Medium)**: Structured household rules, stern "husband voice" authority, scheduled conduct accountability, formal over-the-knee bare-hand spanking, privilege forfeiture (phones/keys), eye-contact enforcement, and deep tearful confessions.
- **⛓️ Heavy Restraint (Heavy)**: Shibari rope bondage, silk/leather blindfolds, formal locked collars, desk/workbench face-down physical containment, breath play & possessive claiming marks, and total autonomy surrender protocols.
- **✨ Any / Wildcard**: Blends across all intensity tiers.

### 3. 🔒 Component & Slot Locking
Love the character's name or archetype but want to change their disciplinary dynamic? Or love a specific kink modality but want a new name?
- **Lock Name (`🔒 Name`)**: Keeps the character's name while rerolling other layers.
- **Lock Archetype (`🔒 Arch`)**: Preserves the character's archetype title and public role.
- **Lock Dynamic (`🔒 Dynamic`)**: Preserves the kink modality, disciplinary craving, and reaction gradient.
- **Lock Voice (`🔒 Voice`)**: Preserves the vocal idiolect and central contradiction.
- Click **"🎲 Reroll Unlocked Slots (Keep Locked)"** to generate fresh, seamless layers while preserving your locked components!

### 4. 🧠 Advanced Procedural Engine (`procedural_engine.py`)
- **15 Handcrafted Master Archetypes**:
  - *Mild*: Rowena (Domestic Brat), Clara (Mischievous Housewife), Darcy (Sassy Bistro Chef), Sylvie (Overthinking Academic).
  - *Medium*: Mara (Cabin Homesteader), Dr. Valerie (Overworked Trauma Surgeon), Corinne (Sensory Studio Artist), Tessa (Sarcastic Mechanic).
  - *Heavy*: Julianna (Overworked Surrender & Rope), Lady Vivienne (Aristocratic Consort & Collar), Captain Elena (Starship Commander), Genevieve (Victorian Ice Queen), Astrid (Valkyrie Shield-Maiden), Nadia (Syndicate Heiress), Seraphina (Captive Inquisitor Consort).
- **Infinite Combinatorial Synthesizer**: Procedurally synthesizes unique names, public facades, bratty provocations, calibrated reaction gradients (WON'T, CRAVES, NEUTRAL, WILL, TRUST GATE), internal psychological contradictions, and deep aftercare resolutions.

### 5. 🦙 Local LLM Integration (`llama-server`)
- Connects directly to `llama-server` on port `5001` (`http://localhost:5001/v1`).
- Custom uncensored prompt template designed specifically to prevent AI cliches and enforce psychological friction.
- Seamless automatic fallback to the offline procedural engine whenever `llama-server` is loading or offline.

### 6. 📋 Clipboard & History
- Click **"📋 Copy Premise"** to copy the formatted premise to clipboard.
- Saved concepts persist in `history.json` so you can retrieve or load them at any time.
