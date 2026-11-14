# Agent Guidelines & Memory

## Environment & System Architecture
- **Process Communication & Applications**: Always prefer Unix Domain Socket IPC (`/tmp/comfyclient.sock` for ComfyClient, `/tmp/chargenui-ipc.sock` for CharGenUI) over file polling or disk-based syncing.
- **Data Safety**: NEVER delete or corrupt files under `data/`.

---

## Core Applications & Architecture

### 1. CharGen Web Harness (`src/`)
- **Runtime**: Bun (`bun run src/server.ts` or `bun run src/main.ts`).
- **Role**: Primary full-stack character card generator, editor, health auditor, and agent workspace.
- **Dual-Bind IPC**:
  - Binds HTTP/WS on port `:3333` (or configured `PORT`).
  - Simultaneously binds Unix Domain Socket at `/tmp/chargenui-ipc.sock` (`CHARGEN_IPC_SOCKET`).
  - Supports live bidirectional synchronization with Desktop and external clients via WebSocket (`/api/ipc/ws`) and Unix Socket.
- **Agent Co-Pilot & Generation Pipeline**:
  - Surgical card modifications (`/api/agent/modify`), reimagine (`/api/agent/reimagine`), and executive summary compaction (`/api/agent/compact`).
  - Long LLM inferences use `rawHttpPost` with TCP keep-alive (`req.setSocketKeepAlive(true, 15000)`) and a 30-minute timeout to avoid premature connection drops.
  - Granular alternate greeting actions: `add_alternate_greeting`, `update_alternate_greeting`, `delete_alternate_greeting`, `prepend_alternate_greeting_header`, and `append_alternate_greeting_footer`.
- **Architecture**:
  - `src/`: Clean modular codebase (`routes/`, `services/`, `middleware/`, `utils/`, `config/`, and `public/`).
  - `src.old/`: Preserved legacy monolithic reference codebase.

---

## Companion / Sidecar Applications

### 2. ComfyClient (`comfyclient/`)
- **Runtime**: Standalone Python 3 / PySide6 QML application.
- **Socket Path**: `/tmp/comfyclient.sock` (`COMFYCLIENT_SOCKET`).
- **Definition & Identity**: When the user refers to "comfyclient" or "ComfyClient", they **ALWAYS** mean this standalone Python application, NOT the web UI or web routes.
- **Role & Responsibilities**:
  - Manages ComfyUI diffusion workflows, hardware dispatch, and image prompt batch execution.
  - Owns and directly manages the persistent image prompt queue in `data/image_prompt_queue.json`.
  - CharGenUI and Desktop delegate all image prompt generation tasks (queue, dispatch, delete, list, progress tracking) to ComfyClient via Unix socket IPC.
  - Runs in headless server mode (`python -m comfyclient --socket /tmp/comfyclient.sock`) or with rich native GUI (`./run.sh` / `--gui`).

### 3. CharGen Desktop Studio (`desktop/`)
- **Runtime**: Standalone Python 3 / PySide6 QML application (`desktop/app.py`).
- **Role**: Native desktop studio offering fullscreen authoring, Weaver analysis, spine synthesis, and vision scanning.
- **IPC Integration**:
  - Uses `desktop/unix_ipc.py` to bridge to `/tmp/chargenui-ipc.sock` (CharGenUI backend) for card synchronization, prompt profiles, and theme tokens.
  - Connects directly to `/tmp/comfyclient.sock` for image generation queue management and ComfyUI status.
- **Offscreen Verification**: Runs in native Linux or headless test suites via `QT_QPA_PLATFORM=offscreen python3 desktop/app.py`.

### 4. Idea Generator & Era Forge (`idea_generator/`)
- **Runtime**: Python 3 / PySide6 QML application (`idea_generator/app.py`).
- **Role**: Autonomous character brainstorming, procedural archetype generation, and Era Architect co-pilot.
- **Era Agent Loop (`idea_generator/era_agent_harness.py`)**:
  - Automated agent turns for worldbuilding, setting creation, and cultural code generation against `eras_db.json`.
  - Communicates directly with local `llama-server` (typically port `:5001` or `:8080`) or exports paired Polygyny/Monogamy era extensions into `idea_generator/eras_extensions/` and `src/services/eras/eras_data.json`.

### 5. Reference Weaver (`reference_weaver/`)
- **Status & Policy**: **DO NOT TOUCH**. Reference Weaver has served its purpose and is frozen/archived. Do not modify, scan, refactor, or touch `reference_weaver/` unless the user explicitly asks.
- **Runtime**: TypeScript pipeline service.
- **Role**: Deep psychometric Weaver engine, dynamic question-gate interview trees, and Character Card V2/V3 extraction service.
- **Integration**: Powers Weaver interviews, story arc synthesis, reaction gradients, and relational tension building across both web and desktop runtimes.

---

## IPC Socket Quick Reference

| Service | Protocol / Transport | Socket / Endpoint | Notes |
| :--- | :--- | :--- | :--- |
| **CharGenUI Backend** | Unix Domain Socket | `/tmp/chargenui-ipc.sock` | Governed by `server-ipc.ts` / `unix_ipc.py` |
| **CharGenUI Web / WS** | HTTP + WebSocket | `http://localhost:3333` & `/api/ipc/ws` | Dual-bound with Unix socket |
| **ComfyClient** | Unix Domain Socket | `/tmp/comfyclient.sock` | Governed by `comfyclient/server.py` |
| **llama-server (LLM)** | HTTP REST / OpenAI API | `http://127.0.0.1:5001` or `:8080` | Local GGUF backend |
