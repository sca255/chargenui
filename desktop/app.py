#!/usr/bin/env python3
"""
CharGen Harness - Native Desktop Client (PySide6 + QML)
Runs a native desktop interface for character generation, Weaver interview workshops,
and card authoring, driving the local CharGen backend engine.
"""

import sys
import os
import json
import time
import threading
import subprocess
import atexit
import base64
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
import PySide6

from PySide6.QtCore import (
    QObject, Signal, Slot, Property, QUrl, QTimer, Qt,
    qInstallMessageHandler, QtMsgType
)
from PySide6.QtGui import QGuiApplication, QIcon, QImage
from PySide6.QtQuick import QQuickImageProvider
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtWebSockets import QWebSocket

BACKEND_DEFAULT_URL = os.environ.get("CHARGEN_BACKEND_URL", f"http://127.0.0.1:{os.environ.get('PORT', '3333')}")
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Ensure comfyclient from repository is discoverable
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
try:
    from comfyclient.client import ComfyClient
except Exception as _cc_err:
    ComfyClient = None
    print(f"[Desktop] comfyclient import notice: {_cc_err}")

def get_storage_path(filename: str) -> Path:
    """Returns a writable path, preferring ~/.chargen if writable, else project root data/."""
    candidates = [
        Path.home() / filename,
        PROJECT_ROOT / "data" / filename,
        PROJECT_ROOT / filename
    ]
    for p in candidates:
        if p.exists() and os.access(p, os.W_OK):
            return p
    for p in candidates:
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            test_file = p.parent / f".write_test_{os.getpid()}"
            test_file.write_text("test")
            test_file.unlink()
            return p
        except Exception:
            continue
    return PROJECT_ROOT / "data" / filename

CONFIG_FILE = get_storage_path(".chargen_desktop_config.json")
LAST_CARD_FILE = get_storage_path(".chargen_last_card.json")

# ------------------------------------------------------------------------------
# Generation Timeouts (seconds)
# Set generous limits (default 1200s = 20 mins) to support slow local models
# (Ollama, llama.cpp, LM Studio, etc.) and deep multi-pass Weaver synthesis.
# Set CHARGEN_TIMEOUT=0 or pass --no-timeout to completely disable timeouts (wait indefinitely).
# ------------------------------------------------------------------------------
_NO_TIMEOUT_FLAG = "--no-timeout" in sys.argv
_RAW_DEFAULT_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_TIMEOUT", "1200"))
FORGE_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_FORGE_TIMEOUT", str(_RAW_DEFAULT_TIMEOUT)))
INTERVIEW_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_INTERVIEW_TIMEOUT", "360"))
REROLL_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_REROLL_TIMEOUT", "180"))
IMAGE_PROMPT_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_IMAGE_TIMEOUT", "300"))
COMFY_TIMEOUT = 0 if _NO_TIMEOUT_FLAG else int(os.environ.get("CHARGEN_COMFY_TIMEOUT", "1200"))

def resolve_timeout(seconds: int):
    """Returns None if seconds <= 0 (completely disabling timeout in requests), else integer seconds."""
    return seconds if seconds > 0 else None

# ------------------------------------------------------------------------------
# CLI Logger with ANSI Color Styling & Trace Levels
# ------------------------------------------------------------------------------
class Log:
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40

    _level = INFO
    _use_color = True

    @classmethod
    def init(cls, level=None, color=None):
        env_level = os.environ.get("CHARGEN_LOG_LEVEL", "").upper()
        if os.environ.get("CHARGEN_DEBUG", "") == "1" or "--debug" in sys.argv or "-v" in sys.argv:
            cls._level = cls.DEBUG
        elif env_level == "DEBUG":
            cls._level = cls.DEBUG
        elif env_level in ("WARN", "WARNING"):
            cls._level = cls.WARN
        elif env_level == "ERROR":
            cls._level = cls.ERROR
        elif level is not None:
            cls._level = level

        if color is not None:
            cls._use_color = color
        else:
            cls._use_color = sys.stdout.isatty() and not os.environ.get("NO_COLOR")

    @classmethod
    def get_level_name(cls) -> str:
        if cls._level <= cls.DEBUG: return "DEBUG"
        if cls._level <= cls.INFO: return "INFO"
        if cls._level <= cls.WARN: return "WARN"
        return "ERROR"

    @classmethod
    def _format(cls, level_name: str, tag: str, msg: str, color_code: str = "") -> str:
        ts = time.strftime("%H:%M:%S") + f".{int(time.time() * 1000) % 1000:03d}"
        if cls._use_color:
            c_dim = "\033[90m"
            c_tag = "\033[1;36m"
            c_reset = "\033[0m"
            return f"{c_dim}[{ts}]{c_reset} {color_code}[{level_name:5s}]{c_reset} {c_tag}[{tag:11s}]{c_reset} {msg}"
        else:
            return f"[{ts}] [{level_name:5s}] [{tag:11s}] {msg}"

    @classmethod
    def debug(cls, tag: str, msg: str):
        if cls._level <= cls.DEBUG:
            code = "\033[36m" if cls._use_color else ""
            print(cls._format("DEBUG", tag, msg, code), flush=True)

    @classmethod
    def info(cls, tag: str, msg: str):
        if cls._level <= cls.INFO:
            code = "\033[32m" if cls._use_color else ""
            print(cls._format("INFO", tag, msg, code), flush=True)

    @classmethod
    def warn(cls, tag: str, msg: str):
        if cls._level <= cls.WARN:
            code = "\033[33m" if cls._use_color else ""
            print(cls._format("WARN", tag, msg, code), flush=True)

    @classmethod
    def error(cls, tag: str, msg: str):
        if cls._level <= cls.ERROR:
            code = "\033[1;31m" if cls._use_color else ""
            print(cls._format("ERROR", tag, msg, code), flush=True)


def setup_qt_message_handler():
    def handler(mode, context, message):
        # Filter out noisy benign Qt/KDE theme style binding notices
        if "org/kde/breeze" in message or "Unable to assign TextArea" in message:
            Log.debug("QtTheme", message)
            return

        tag = "QML"
        clean_msg = message
        if message.startswith("[") and "]" in message:
            end_bracket = message.find("]")
            tag = message[1:end_bracket]
            clean_msg = message[end_bracket + 1:].strip()

        if mode == QtMsgType.QtWarningMsg:
            Log.warn(tag, clean_msg)
        elif mode in (QtMsgType.QtCriticalMsg, QtMsgType.QtFatalMsg):
            Log.error(tag, clean_msg)
        elif mode == QtMsgType.QtDebugMsg:
            if clean_msg.startswith("[DEBUG]"):
                Log.debug(tag, clean_msg[7:].strip())
            else:
                Log.info(tag, clean_msg)
        elif mode == QtMsgType.QtInfoMsg:
            Log.info(tag, clean_msg)
        else:
            Log.info(tag, clean_msg)

    qInstallMessageHandler(handler)

class AvatarImageProvider(QQuickImageProvider):
    def __init__(self, bridge):
        super().__init__(QQuickImageProvider.Image)
        self._bridge = bridge

    def requestImage(self, id_str, size, requested_size):
        b64 = ""
        clean_id = id_str.split("?")[0]
        if clean_id == "active":
            b64 = self._bridge._card.get("avatar") or ""
        elif clean_id.startswith("card_"):
            cid = clean_id[5:]
            for c in self._bridge._library:
                if c.get("id") == cid:
                    b64 = c.get("avatarBase64") or ""
                    break
        elif clean_id.startswith("queue_"):
            qid = clean_id[6:]
            for item in self._bridge._image_queue:
                if item.get("id") == qid:
                    b64 = item.get("avatarDataUrl") or ""
                    break

        if b64:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            try:
                raw = base64.b64decode(b64)
                img = QImage()
                if img.loadFromData(raw):
                    return img
            except Exception as e:
                Log.debug("AvatarProvider", f"Failed decoding avatar: {e}")

        empty = QImage(1, 1, QImage.Format_ARGB32)
        empty.fill(0)
        return empty

class BackendBridge(QObject):
    statusChanged = Signal(str, bool)
    cardChanged = Signal()
    libraryChanged = Signal()
    providerChanged = Signal()
    weaverQuestionsReady = Signal(dict)
    weaverQuestionRerolled = Signal(int, list, int)
    imageQueueChanged = Signal()
    imagePromptReady = Signal(dict)
    comfyStatusChanged = Signal(bool, str)
    comfyAnalysisReady = Signal(dict)
    comfyExecutionFinished = Signal(int, int)
    comfyClientStatusChanged = Signal(bool, str)
    comfyClientPromptsReady = Signal(list)
    errorOccurred = Signal(str)
    notification = Signal(str)
    ideaReceived = Signal(str, str, list, str, str)
    ipcStatusChanged = Signal(bool)
    multiverseUniversesReady = Signal(list)
    multiverseForkFinished = Signal(dict)
    worldNodesGenerated = Signal(list, str, str)
    voiceSpecStamped = Signal(dict)
    cardAuditFinished = Signal(dict)
    loreSearchStarted = Signal(str)
    loreSearchFinished = Signal(dict)
    reimagineFinished = Signal(dict)
    activeLoreChanged = Signal(str)
    avatarTimestampChanged = Signal()
    promptProfilesChanged = Signal()
    householdsChanged = Signal()
    scenarioMatrixReady = Signal(dict)
    agentModifyFinished = Signal(dict)
    visionScanFinished = Signal(dict)
    lorebookAnalyzed = Signal(dict)
    lorebookCompanionFinished = Signal(dict)
    llmCacheChanged = Signal(bool, int)

    def __init__(self, parent=None, backend_url=BACKEND_DEFAULT_URL):
        super().__init__(parent)
        self._backend_url = backend_url
        self._is_busy = False
        self._task_type = ""
        self._status_text = "Ready"
        self._backend_connected = False
        self._active_card_id = ""
        self._active_lore = ""
        self._last_lore_result = {}
        self._avatar_timestamp = int(time.time() * 1000)
        self._thread_pool = ThreadPoolExecutor(max_workers=4)
        self._cancel_event = threading.Event()

        default_card = {
            "name": "New Character",
            "tags": [],
            "description": "",
            "personality": "",
            "scenario": "",
            "first_mes": "",
            "mes_example": "",
            "creator_notes": "",
            "post_history_instructions": "",
            "system_prompt": "",
            "alternate_greetings": [],
            "character_book": {"name": "", "entries": []}
        }
        cached = self._load_last_card_cache()
        if cached and isinstance(cached, dict) and cached.get("character") and cached.get("character", {}).get("name"):
            self._card = {**default_card, **cached.get("character", {})}
            self._active_card_id = cached.get("id", "")
            Log.info("Bridge", f"Restored active card from cache: '{self._card.get('name')}' (id='{self._active_card_id}')")
        else:
            self._card = default_card
        self._library = []
        self._image_queue = []
        self._last_img_prompt = {}
        self._prompt_profiles = []
        self._active_prompt_profile = "default"
        self._households = []
        self._scenario_matrix = None
        self._provider = self._load_provider_config()

        # IPC State
        self._ws = None
        self._last_processed_idea_id = None

        Log.info("Bridge", f"Initialized bridge connected to engine at {backend_url}")
        p_type = self._provider.get("type", "none")
        if p_type and p_type != "none":
            Log.info("Bridge", f"Active AI Provider: {p_type} (model: '{self._provider.get('model', '')}')")
        else:
            Log.warn("Bridge", "No AI Provider configured. Open Settings (⚙️) to configure API keys or local LLM.")

        # Check backend readiness
        QTimer.singleShot(500, self._check_backend)

        # Periodic timer for backend health & IPC polling fallback
        self._backend_timer = QTimer(self)
        self._backend_timer.timeout.connect(self._check_backend)
        self._backend_timer.start(2500)

    # -------------------------------------------------------------
    # Slots - Agentic Reimagine
    # -------------------------------------------------------------
    @Slot(str, str)
    def reimagineCard(self, mode: str, prompt: str):
        mode = mode if mode in ("redesign", "inspire") else "redesign"
        self._set_status(f"✨ {mode.title()}ing card...", True, "reimagine")

        def run():
            try:
                payload = {
                    "character": self._card,
                    "mode": mode,
                    "prompt": prompt or "",
                    "provider": self._provider,
                }
                res = requests.post(
                    f"{self._backend_url}/api/agent/reimagine",
                    json=payload,
                    timeout=resolve_timeout(FORGE_TIMEOUT),
                )
                if res.status_code != 200:
                    self.errorOccurred.emit("Reimagine failed: " + res.text)
                    return
                data = res.json()
                character = data.get("character")
                if isinstance(character, dict) and character:
                    self._card = character
                    self._active_card_id = character.get("id") or self._active_card_id
                    self.cardChanged.emit()
                    self._notify_ipc_active_card()
                    self._save_last_card_cache()
                    self._auto_save_to_library(self._card)
                self.reimagineFinished.emit(data)
                self.notification.emit(f"✨ {mode.title()} complete for '{self._card.get('name', 'Character')}'")
            except Exception as e:
                self.errorOccurred.emit(f"Reimagine error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)


    # -------------------------------------------------------------
    # Properties
    # -------------------------------------------------------------
    def get_is_busy(self):
        return self._is_busy

    def get_task_type(self):
        return self._task_type

    def get_status_text(self):
        return self._status_text

    def get_backend_connected(self):
        return self._backend_connected

    def get_card(self):
        return self._card

    def get_library(self):
        return self._library

    def get_provider(self):
        return self._provider

    def get_active_card_id(self):
        return self._active_card_id

    def get_image_queue(self):
        return self._image_queue

    def get_active_lore(self):
        return self._active_lore

    def get_last_lore_result(self):
        return self._last_lore_result

    def get_avatar_timestamp(self):
        return self._avatar_timestamp

    def get_prompt_profiles(self):
        return self._prompt_profiles

    def get_active_prompt_profile(self):
        return self._active_prompt_profile

    def get_households(self):
        return self._households

    def get_scenario_matrix(self):
        return self._scenario_matrix or {}

    isBusy = Property(bool, get_is_busy, notify=statusChanged)
    taskType = Property(str, get_task_type, notify=statusChanged)
    statusText = Property(str, get_status_text, notify=statusChanged)
    backendConnected = Property(bool, get_backend_connected, notify=statusChanged)
    card = Property("QVariantMap", get_card, notify=cardChanged)
    library = Property("QVariantList", get_library, notify=libraryChanged)
    provider = Property("QVariantMap", get_provider, notify=providerChanged)
    activeCardId = Property(str, get_active_card_id, notify=cardChanged)
    imageQueue = Property("QVariantList", get_image_queue, notify=imageQueueChanged)
    activeLore = Property(str, get_active_lore, notify=activeLoreChanged)
    lastLoreResult = Property("QVariantMap", get_last_lore_result, notify=loreSearchFinished)
    avatarTimestamp = Property(int, get_avatar_timestamp, notify=avatarTimestampChanged)
    promptProfiles = Property("QVariantList", get_prompt_profiles, notify=promptProfilesChanged)
    activePromptProfile = Property(str, get_active_prompt_profile, notify=promptProfilesChanged)
    households = Property("QVariantList", get_households, notify=householdsChanged)
    scenarioMatrix = Property("QVariantMap", get_scenario_matrix, notify=scenarioMatrixReady)

    # -------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------
    def _set_status(self, text: str, busy: bool = False, task_type: str = ""):
        if busy:
            self._cancel_event = threading.Event()
        self._status_text = text
        self._is_busy = busy
        self._task_type = task_type if busy else ""
        self.statusChanged.emit(text, busy)
        Log.debug("Bridge", f"Status changed -> '{text}' (busy={busy}, task='{self._task_type}')")

    @Slot()
    def cancelCurrentTask(self):
        """Request cooperative cancellation of the active network generation."""
        if self._is_busy:
            self._cancel_event.set()
            self._status_text = "🛑 Cancellation requested..."
            self.statusChanged.emit(self._status_text, True)
            self.notification.emit("Cancellation requested; waiting for the current request to return.")

    def _load_provider_config(self) -> dict:
        default = {
            "type": "none",
            "apiKey": "",
            "baseUrl": "",
            "model": "",
            "temperature": 0.85
        }
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    cfg = {**default, **json.load(f)}
                    if cfg.get("type") and cfg.get("type") != "none":
                        return cfg
            except Exception as e:
                Log.warn("Settings", f"Failed to load config file: {e}")

        # Environment variable auto-fallbacks
        if os.environ.get("GEMINI_API_KEY"):
            default["type"] = "gemini"
            default["apiKey"] = os.environ["GEMINI_API_KEY"]
            default["model"] = "gemini-2.5-flash"
            Log.info("Settings", "Auto-detected GEMINI_API_KEY from environment")
        elif os.environ.get("OPENROUTER_API_KEY"):
            default["type"] = "openrouter"
            default["apiKey"] = os.environ["OPENROUTER_API_KEY"]
            default["model"] = "anthropic/claude-3.5-sonnet"
            Log.info("Settings", "Auto-detected OPENROUTER_API_KEY from environment")
        elif os.environ.get("OPENAI_API_KEY"):
            default["type"] = "openai"
            default["apiKey"] = os.environ["OPENAI_API_KEY"]
            default["model"] = "gpt-4o"
            Log.info("Settings", "Auto-detected OPENAI_API_KEY from environment")
        elif os.environ.get("ANTHROPIC_API_KEY"):
            default["type"] = "anthropic"
            default["apiKey"] = os.environ["ANTHROPIC_API_KEY"]
            default["model"] = "claude-3-5-sonnet-20241022"
            Log.info("Settings", "Auto-detected ANTHROPIC_API_KEY from environment")
        return default

    def _save_provider_config(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self._provider, f, indent=2)
            Log.info("Settings", f"Saved provider config to {CONFIG_FILE.name}")
        except Exception as e:
            Log.error("Settings", f"Failed to save provider config: {e}")

    def _save_last_card_cache(self):
        try:
            cache_data = {
                "id": self._active_card_id,
                "character": self._card,
                "savedAt": time.time()
            }
            with open(LAST_CARD_FILE, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            Log.debug("Cache", f"Cached active card '{self._card.get('name')}' to {LAST_CARD_FILE.name}")

            # Also sync to backend autosave slot asynchronously
            def sync_server_autosave():
                try:
                    requests.post(
                        f"{self._backend_url}/api/cards/autosave",
                        json={
                            "character": self._card,
                            "avatarBase64": self._card.get("avatar") or None
                        },
                        timeout=5
                    )
                except Exception:
                    pass
            self._thread_pool.submit(sync_server_autosave)
        except Exception as e:
            Log.debug("Cache", f"Failed to cache last card: {e}")

    def _load_last_card_cache(self) -> dict:
        if LAST_CARD_FILE.exists():
            try:
                with open(LAST_CARD_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
            except Exception as e:
                Log.warn("Cache", f"Failed to read last card cache: {e}")
        return None

    def _auto_save_to_library(self, char_to_save: dict):
        def run():
            try:
                res = requests.post(
                    f"{self._backend_url}/api/cards",
                    json={
                        "character": char_to_save,
                        "avatarBase64": char_to_save.get("avatar") or None,
                        "id": self._active_card_id or None
                    },
                    timeout=10
                )
                if res.status_code == 200 and not self._cancel_event.is_set():
                    data = res.json()
                    saved_id = data.get("record", {}).get("id") or data.get("id")
                    if saved_id:
                        self._active_card_id = saved_id
                        self.cardChanged.emit()
                        self.refreshLibrary()
                        self._save_last_card_cache()
                        Log.info("Library", f"✓ Auto-persisted forged card '{char_to_save.get('name')}' to library (id: {self._active_card_id})")
            except Exception as e:
                Log.warn("Library", f"Auto-save to library failed: {e}")

        self._thread_pool.submit(run)



    def _check_backend(self):
        try:
            r = requests.get(f"{self._backend_url}/api/env-keys", timeout=2)
            if r.status_code == 200:
                was_disconnected = not self._backend_connected
                self._backend_connected = True
                if was_disconnected:
                    Log.info("Backend", f"✓ Connected to CharGen Engine at {self._backend_url}")
                    self._set_status("Connected to CharGen Engine", False)
                    self.refreshLibrary()
                    self.fetchImageQueue()
                    self.fetchPromptProfiles()
                    self.fetchHouseholds()
                    self.getLlmCacheStats()
                    self._init_ipc_websocket()

                    # If provider is unconfigured, check if backend has active keys
                    if self._provider.get("type") in ("none", "", None):
                        env_data = r.json()
                        if env_data.get("hasGemini"):
                            self._provider["type"] = "gemini"
                            self._provider["model"] = "gemini-2.5-flash"
                            self.providerChanged.emit()
                            Log.info("Backend", "Engine has GEMINI_API_KEY; auto-configured desktop provider to Gemini")
                        elif env_data.get("hasOpenRouter"):
                            self._provider["type"] = "openrouter"
                            self._provider["model"] = "anthropic/claude-3.5-sonnet"
                            self.providerChanged.emit()
                            Log.info("Backend", "Engine has OPENROUTER_API_KEY; auto-configured desktop provider to OpenRouter")
                        elif env_data.get("hasOpenAI"):
                            self._provider["type"] = "openai"
                            self._provider["model"] = "gpt-4o"
                            self.providerChanged.emit()
                            Log.info("Backend", "Engine has OPENAI_API_KEY; auto-configured desktop provider to OpenAI")
                        elif env_data.get("hasAnthropic"):
                            self._provider["type"] = "anthropic"
                            self._provider["model"] = "claude-3-5-sonnet-20241022"
                            self.providerChanged.emit()
                            Log.info("Backend", "Engine has ANTHROPIC_API_KEY; auto-configured desktop provider to Anthropic")
                elif self._ws is None or not self._ws.isValid():
                    self._init_ipc_websocket()

                # Always poll fallback to ensure 100% idea delivery
                self._poll_last_idea_fallback()
                return
        except Exception:
            pass
        if self._backend_connected:
            Log.warn("Backend", "⚠️ Lost connection to CharGen Engine")
        self._backend_connected = False
        self._set_status("Engine offline (starting...)", False)

    # -------------------------------------------------------------
    # Inter-Process Communication (IPC) Bridge
    # -------------------------------------------------------------
    def _init_ipc_websocket(self):
        if self._ws is not None:
            try:
                self._ws.close()
            except Exception:
                pass

        self._ws = QWebSocket()
        self._ws.connected.connect(self._on_ws_connected)
        self._ws.disconnected.connect(self._on_ws_disconnected)
        self._ws.textMessageReceived.connect(self._on_ws_message)
        self._ws.errorOccurred.connect(self._on_ws_error)

        ws_url = self._backend_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_endpoint = f"{ws_url}/api/ipc/ws"
        Log.debug("IPC", f"Opening WebSocket connection to {ws_endpoint}...")
        self._ws.open(QUrl(ws_endpoint))

    def _on_ws_connected(self):
        Log.info("IPC", f"✓ WebSocket connected to CharGen IPC Hub at {self._backend_url}")
        self.ipcStatusChanged.emit(True)
        self._notify_ipc_active_card()

    def _on_ws_disconnected(self):
        Log.warn("IPC", "⚠️ WebSocket disconnected from CharGen IPC Hub")
        self.ipcStatusChanged.emit(False)

    def _on_ws_error(self, error):
        Log.error("IPC", f"❌ WebSocket error: {error}")

    def _on_ws_message(self, message_str):
        try:
            data = json.loads(message_str)
            msg_type = data.get("type")
            payload = data.get("payload", {})

            if msg_type == "idea:received":
                idea = payload.get("idea", {})
                idea_id = idea.get("id")
                if idea_id and idea_id == self._last_processed_idea_id:
                    return
                self._last_processed_idea_id = idea_id

                concept = idea.get("concept", "")
                suggester = idea.get("suggestedBy", "Idea Suggester")
                archetype = idea.get("archetype", "")
                themes = idea.get("themes", [])

                short_concept = (concept[:55] + "...") if len(concept) > 55 else concept
                title = f" [{archetype}]" if archetype else ""
                era = idea.get("era") or ""
                era_data = idea.get("eraData") or {}
                era_data_json = json.dumps(era_data) if isinstance(era_data, dict) else ""
                era_tag = f" <{era}>" if era else ""
                Log.info("IPC", f"💡 Idea received from {suggester}{title}{era_tag}: \"{short_concept}\" (themes: {themes})")

                # Emit ideaReceived signal to QML
                self.ideaReceived.emit(concept, archetype, themes, era, era_data_json)

                # Emit notification to display toast banner!
                self.notification.emit(f"💡 Idea received from {suggester}{title}{era_tag}: \"{short_concept}\"")

            elif msg_type == "character:generated":
                character = payload.get("character", {})
                if character and isinstance(character, dict) and character.get("name"):
                    self._card = character
                    self.cardChanged.emit()
                    Log.info("IPC", f"🎉 Auto-generated card received: '{character.get('name')}'")
                    self.notification.emit(f"🎉 Auto-generated card '{character.get('name')}' from Idea Suggester!")

            elif msg_type == "ipc:connected":
                active_name = payload.get("activeCharacterName")
                if active_name:
                    Log.info("IPC", f"✓ Registered with server. Active card in sync: '{active_name}'")
        except Exception as e:
            Log.error("IPC", f"Error processing IPC message: {e}")

    def _poll_last_idea_fallback(self):
        try:
            r = requests.get(f"{self._backend_url}/api/ipc/last-idea", timeout=1)
            if r.status_code == 200:
                data = r.json()
                idea = data.get("idea")
                if idea and idea.get("id") and idea.get("id") != self._last_processed_idea_id:
                    self._last_processed_idea_id = idea.get("id")
                    concept = idea.get("concept", "")
                    suggester = idea.get("suggestedBy", "Idea Suggester")
                    archetype = idea.get("archetype", "")
                    themes = idea.get("themes", [])

                    short_concept = (concept[:55] + "...") if len(concept) > 55 else concept
                    title = f" [{archetype}]" if archetype else ""
                    era = idea.get("era") or ""
                    era_data = idea.get("eraData") or {}
                    era_data_json = json.dumps(era_data) if isinstance(era_data, dict) else ""
                    era_tag = f" <{era}>" if era else ""
                    Log.info("IPC", f"💡 Fallback polled idea from {suggester}{title}{era_tag}: \"{short_concept}\"")

                    self.ideaReceived.emit(concept, archetype, themes, era, era_data_json)
                    self.notification.emit(f"💡 Idea received from {suggester}{title}{era_tag}: \"{short_concept}\"")
        except Exception:
            pass

    def _notify_ipc_active_card(self):
        if hasattr(self, "_ws") and self._ws and self._ws.isValid():
            try:
                card_name = self._card.get("name", "Untitled")
                msg = {
                    "action": "set_active_card",
                    "payload": {"character": self._card}
                }
                self._ws.sendTextMessage(json.dumps(msg))
                Log.debug("IPC", f"Pushed active card '{card_name}' to server")
            except Exception as e:
                Log.debug("IPC", f"Failed to push active card: {e}")

    @Slot(str, result=str)
    def getEraInfoJson(self, era_query: str) -> str:
        if not era_query or not era_query.strip() or era_query.strip().lower() == "off":
            return ""
        try:
            res = requests.get(f"{self._backend_url}/api/eras/resolve", params={"q": era_query.strip()}, timeout=5)
            if res.status_code == 200:
                return res.text
        except Exception as e:
            Log.debug("Eras", f"Failed to resolve era '{era_query}': {e}")
        return ""

    @Slot(result=dict)
    def getLlmCacheStats(self) -> dict:
        try:
            r = requests.get(f"{self._backend_url}/api/llm/cache", timeout=2)
            if r.status_code == 200:
                data = r.json()
                self.llmCacheChanged.emit(data.get("enabled", True), data.get("totalEntries", 0))
                return data
        except Exception:
            pass
        return {"enabled": True, "totalEntries": 0}

    @Slot(bool)
    def toggleLlmCache(self, enabled: bool):
        def run():
            try:
                r = requests.post(f"{self._backend_url}/api/llm/cache/toggle", json={"enabled": enabled}, timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    self.llmCacheChanged.emit(data.get("enabled", True), data.get("totalEntries", 0))
                    state_str = "ACTIVE" if enabled else "DISABLED"
                    self.notification.emit(f"⚡ LLM Response Cache is now {state_str}")
                    Log.info("LLMCache", f"Toggled persistent LLM cache: {state_str}")
            except Exception as e:
                Log.error("LLMCache", f"Failed toggling cache: {e}")
        self._thread_pool.submit(run)

    @Slot()
    def clearLlmCache(self):
        def run():
            try:
                r = requests.post(f"{self._backend_url}/api/llm/cache/clear", json={}, timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    self.llmCacheChanged.emit(data.get("enabled", True), 0)
                    self.notification.emit(f"🧹 Cleared {data.get('cleared', 0)} cached responses from disk")
                    Log.info("LLMCache", f"Cleared {data.get('cleared', 0)} cached LLM responses")
            except Exception as e:
                Log.error("LLMCache", f"Failed clearing cache: {e}")
        self._thread_pool.submit(run)

    # -------------------------------------------------------------
    # Slots - Generation & Weaver Workshop
    # -------------------------------------------------------------
    @Slot(str, str, list, str, str, bool)
    @Slot(str, str, list, str, str, bool, str)
    @Slot(str, str, list, str, str, bool, str, str)
    @Slot(str, str, list, str, str, bool, str, str, str)
    def generateCard(self, concept, genre, themes, tone, format_type, nsfw, retrieved_lore="", bot_mode="single", era=""):
        if not concept.strip():
            self.errorOccurred.emit("Please enter a character concept!")
            Log.warn("QuickForge", "Aborted: concept was empty")
            return

        concept_preview = (concept[:60] + "...") if len(concept) > 60 else concept
        lore_to_use = (retrieved_lore or self._active_lore or "").strip()
        lore_msg = f", lore={len(lore_to_use)}c" if lore_to_use else ""
        era_msg = f", era='{era}'" if era else ""
        Log.info("QuickForge", f"⚡ Quick Forge initiated [{bot_mode}] for: \"{concept_preview}\" | genre='{genre}', format='{format_type}', nsfw={nsfw}, themes={list(themes)}{era_msg}{lore_msg}")
        self._set_status(f"⚡ Engineering {bot_mode.replace('_', ' ').title()} Card...", True, "quick_forge")

        def run():
            t0 = time.time()
            payload = {
                "concept": concept,
                "genre": genre,
                "themes": list(themes),
                "tone": tone,
                "format": format_type,
                "nsfw": nsfw,
                "botMode": bot_mode or "single",
                "provider": self._provider
            }
            if era and era.strip():
                payload["era"] = era.strip()
            if lore_to_use:
                payload["retrievedLore"] = lore_to_use
                payload["enableWebSearch"] = True
            success_msg = ""
            try:
                tout = resolve_timeout(FORGE_TIMEOUT)
                Log.debug("QuickForge", f"Sending POST {self._backend_url}/api/generate (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/generate", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200 and not self._cancel_event.is_set():
                    data = res.json()
                    if "character" in data:
                        self._card = data["character"]
                        self._active_card_id = self._card.get("id") or f"char_{int(time.time())}"
                        self._card["id"] = self._active_card_id
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                        char_name = self._card.get("name", "Character")
                        desc_len = len(self._card.get("description", ""))
                        pers_len = len(self._card.get("personality", ""))
                        alt_cnt = len(self._card.get("alternate_greetings", []))
                        success_msg = f"🎉 Forged '{char_name}'!"
                        Log.info("QuickForge", f"✓ Character '{char_name}' forged in {elapsed:.2f}s (desc: {desc_len}c, pers: {pers_len}c, alts: {alt_cnt})")
                        self.notification.emit(f"Successfully forged '{char_name}'!")
                        return
                elapsed = time.time() - t0
                content_type = res.headers.get("Content-Type", "")
                err = res.json().get("error", res.text) if "application/json" in content_type else res.text
                Log.error("QuickForge", f"❌ Generation failed after {elapsed:.2f}s (HTTP {res.status_code}): {err}")
                self.errorOccurred.emit(f"Generation failed: {err}")
                self._set_status(f"❌ Failed: {err[:60]}", False)
                return
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("QuickForge", f"❌ Connection / Generation exception after {elapsed:.2f}s: {str(e)}")
                if "Read timed out" in str(e) or "ConnectTimeout" in str(e):
                    msg = f"Generation timed out after {int(elapsed)}s. Increase CHARGEN_TIMEOUT or run with --no-timeout."
                    self.errorOccurred.emit(msg)
                    self._set_status(f"❌ Timed out ({int(elapsed)}s)", False)
                else:
                    self.errorOccurred.emit(f"Connection error: {str(e)}")
                    self._set_status(f"❌ Error: {str(e)[:60]}", False)
                return
            finally:
                if success_msg:
                    self._set_status(success_msg, False)

        self._thread_pool.submit(run)

    # -------------------------------------------------------------
    # Slots - Spine Synthesis (Retroactive)
    # -------------------------------------------------------------
    @Slot(str, str, str, str, list, str, str, bool, str)
    @Slot(str, str, str, str, list, str, str, bool, str, str)
    def synthesizeSpine(self, originalConcept, originalStoryArc, genre, themes, tone, intensity, era, nsfw, botMode):
        if not self._card or not self._card.get("name"):
            self.errorOccurred.emit("No active character loaded. Please create or load a character first.")
            return

        self._set_status("🧬 Synthesizing Authoring Spine...", True, "spine_synthesize")

        def run():
            t0 = time.time()
            payload = {
                "character": self._card,
                "originalConcept": originalConcept or "",
                "originalStoryArc": originalStoryArc or "",
                "genre": genre or "Fantasy",
                "themes": list(themes),
                "tone": tone or "Atmospheric, psychologically nuanced",
                "nsfw": nsfw,
                "intensity": intensity or "balanced",
                "era": era or "",
                "botMode": botMode or "single",
                "provider": self._provider
            }
            try:
                tout = resolve_timeout(FORGE_TIMEOUT)
                Log.debug("SpineSynth", f"Sending POST {self._backend_url}/api/spine/synthesize (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/spine/synthesize", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200 and not self._cancel_event.is_set():
                    data = res.json()
                    if "character" in data:
                        self._card = data["character"]
                        self._active_card_id = self._card.get("id") or self._active_card_id
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        char_name = self._card.get("name", "Character")
                        hasSpine = bool(self._card.get("extensions", {}).get("chargenui:authoringSpine"))
                        Log.info("SpineSynth", f"✓ Spine synthesized for '{char_name}' in {elapsed:.2f}s (hasSpine={hasSpine})")
                        self.notification.emit(f"✅ Authoring Spine synthesized for '{char_name}'! Ready for 'Regenerate with Spine'.")
                        return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("SpineSynth", f"❌ Spine synthesis failed after {elapsed:.2f}s (HTTP {res.status_code}): {err}")
                self.errorOccurred.emit(f"Spine synthesis failed: {err}")
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("SpineSynth", f"❌ Spine synthesis exception after {elapsed:.2f}s: {str(e)}")
                if "Read timed out" in str(e) or "ConnectTimeout" in str(e):
                    self.errorOccurred.emit(f"Spine synthesis timed out after {int(elapsed)}s. Increase CHARGEN_TIMEOUT or run with --no-timeout.")
                else:
                    self.errorOccurred.emit(f"Spine synthesis error: {str(e)}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)





    @Slot(str, str, list, str, bool)
    @Slot(str, str, list, str, bool, str)
    @Slot(str, str, list, str, bool, str, str)
    @Slot(str, str, list, str, bool, str, str, str)
    @Slot(str, str, list, str, bool, str, str, str, list)
    def fetchWeaverQuestions(self, concept, genre, themes, tone, nsfw, retrieved_lore="", bot_mode="single", era="", existing_questions=None):
        if not concept.strip():
            self.errorOccurred.emit("Please enter a character concept for Weaver to analyze!")
            Log.warn("Weaver", "Aborted: concept was empty")
            return

        is_asking_more = bool(existing_questions and len(existing_questions) > 0)
        action_verb = "deepening" if is_asking_more else "analyzing"
        concept_preview = (concept[:60] + "...") if len(concept) > 60 else concept
        lore_to_use = (retrieved_lore or self._active_lore or "").strip()
        lore_msg = f", lore={len(lore_to_use)}c" if lore_to_use else ""
        era_msg = f", era='{era}'" if era else ""
        Log.info("Weaver", f"🧠 Requesting Weaver interview questions ({action_verb}) [{bot_mode}] for: \"{concept_preview}\" | genre='{genre}', tone='{tone}', nsfw={nsfw}{era_msg}{lore_msg}")
        self._set_status(f"🧠 Weaver is {action_verb} concept...", True, "weaver_questions")

        def run():
            t0 = time.time()
            payload = {
                "concept": concept,
                "genre": genre,
                "themes": list(themes),
                "tone": tone,
                "nsfw": nsfw,
                "botMode": bot_mode or "single",
                "provider": self._provider
            }
            if existing_questions and isinstance(existing_questions, list):
                payload["existingQuestions"] = existing_questions
            if era and era.strip():
                payload["era"] = era.strip()
            if lore_to_use:
                payload["retrievedLore"] = lore_to_use
                payload["enableWebSearch"] = True
            success_msg = ""
            try:
                tout = resolve_timeout(INTERVIEW_TIMEOUT)
                Log.debug("Weaver", f"Sending POST {self._backend_url}/api/weaver/interview-questions (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/weaver/interview-questions", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200 and not self._cancel_event.is_set():
                    data = res.json()
                    questions = data.get("questions", [])
                    vision = data.get("preliminaryVision", "")
                    Log.info("Weaver", f"✓ Received {len(questions)} interview questions in {elapsed:.2f}s")
                    if vision:
                        vision_preview = (vision[:70] + "...") if len(vision) > 70 else vision
                        Log.info("Weaver", f"  Preliminary Vision: \"{vision_preview}\"")
                    for idx, q in enumerate(questions):
                        Log.debug("Weaver", f"  Q{idx+1} [{q.get('category')}]: \"{q.get('question')}\" (recommended: #{q.get('recommendedOptionIndex')})")
                    self.weaverQuestionsReady.emit(data)
                    success_msg = "Weaver questions ready"
                    return
                elapsed = time.time() - t0
                content_type = res.headers.get("Content-Type", "")
                err = res.json().get("error", res.text) if "application/json" in content_type else res.text
                Log.error("Weaver", f"❌ Failed to fetch interview questions after {elapsed:.2f}s (HTTP {res.status_code}): {err}")
                self.errorOccurred.emit(f"Weaver analysis failed: {err}")
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("Weaver", f"❌ Error fetching interview questions after {elapsed:.2f}s: {str(e)}")
                if "Read timed out" in str(e) or "ConnectTimeout" in str(e):
                    msg = f"Weaver analysis timed out after {int(elapsed)}s. Increase CHARGEN_TIMEOUT or run with --no-timeout."
                    self.errorOccurred.emit(msg)
                    self._set_status(f"❌ Analysis timed out ({int(elapsed)}s)", False)
                else:
                    self.errorOccurred.emit(f"Error fetching questions: {str(e)}")
            finally:
                if success_msg:
                    self._set_status(success_msg, False)
                else:
                    self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(int, str, str, str, list, str, str, str, bool)
    def rerollWeaverQuestion(self, question_index, question_id, category, question_text, current_options, concept, genre, tone, nsfw):
        Log.info("Weaver", f"🎲 Rerolling choices for Q{question_index + 1} [{category}]...")
        self._set_status(f"🎲 Rerolling choices for Q{question_index + 1}...", True, "weaver_reroll")

        def run():
            t0 = time.time()
            payload = {
                "concept": concept,
                "category": category,
                "question": question_text,
                "currentOptions": list(current_options),
                "genre": genre,
                "tone": tone,
                "nsfw": nsfw,
                "provider": self._provider
            }
            try:
                tout = resolve_timeout(REROLL_TIMEOUT)
                Log.debug("WeaverReroll", f"Sending POST {self._backend_url}/api/weaver/reroll-options (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/weaver/reroll-options", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200 and not self._cancel_event.is_set():
                    data = res.json()
                    new_options = data.get("options", [])
                    rec_idx = data.get("recommendedOptionIndex", 0)
                    Log.info("Weaver", f"✓ Received {len(new_options)} new options for Q{question_index + 1} in {elapsed:.2f}s")
                    self.weaverQuestionRerolled.emit(question_index, new_options, rec_idx)
                    return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("Weaver", f"❌ Reroll failed: {err}")
                self.errorOccurred.emit(f"Reroll failed: {err}")
            except Exception as e:
                Log.error("Weaver", f"❌ Reroll exception: {e}")
                self.errorOccurred.emit(f"Reroll error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str, str, list, str, str, bool, list)
    @Slot(str, str, list, str, str, bool, list, str)
    @Slot(str, str, list, str, str, bool, list, str, bool)
    @Slot(str, str, list, str, str, bool, list, str, bool, str)
    @Slot(str, str, list, str, str, bool, list, str, bool, str, str)
    def forgeWeaverCard(self, concept, genre, themes, tone, format_type, nsfw, answers, retrieved_lore="", include_lorebook=False, bot_mode="single", era=""):
        concept_preview = (concept[:60] + "...") if len(concept) > 60 else concept
        lore_to_use = (retrieved_lore or self._active_lore or "").strip()
        lore_msg = f", lore={len(lore_to_use)}c" if lore_to_use else ""
        era_msg = f", era='{era}'" if era else ""
        Log.info("WeaverForge", f"⚡ Weaver Bible synthesis & card forge initiated [{bot_mode}] with {len(answers)} design decisions (concept: \"{concept_preview}\", genre='{genre}'{era_msg}{lore_msg})")
        for idx, a in enumerate(answers):
            Log.debug("WeaverForge", f"  Decision {idx+1} [{a.get('category')}]: \"{a.get('selectedAnswer')}\" (Addressing: \"{a.get('question')}\")")

        self._set_status(f"🧠 Weaver is synthesizing {bot_mode.replace('_', ' ').title()} Card...", True, "weaver_forge")

        def run():
            t0 = time.time()
            payload = {
                "concept": concept,
                "genre": genre,
                "themes": list(themes),
                "tone": tone,
                "format": format_type,
                "nsfw": nsfw,
                "interviewAnswers": list(answers),
                "includeLorebook": bool(include_lorebook),
                "botMode": bot_mode or "single",
                "provider": self._provider
            }
            if era and era.strip():
                payload["era"] = era.strip()
            if lore_to_use:
                payload["retrievedLore"] = lore_to_use
                payload["enableWebSearch"] = True
            success_msg = ""
            try:
                tout = resolve_timeout(FORGE_TIMEOUT)
                Log.debug("WeaverForge", f"Sending POST {self._backend_url}/api/weaver/forge (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/weaver/forge", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    if "character" in data:
                        self._card = data["character"]
                        self._active_card_id = self._card.get("id") or f"char_{int(time.time())}"
                        self._card["id"] = self._active_card_id
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                        char_name = self._card.get("name", "Character")
                        desc_len = len(self._card.get("description", ""))
                        pers_len = len(self._card.get("personality", ""))
                        alt_cnt = len(self._card.get("alternate_greetings", []))
                        bible_entries = len(self._card.get("character_book", {}).get("entries", []))
                        success_msg = f"🎉 Weaver successfully forged '{char_name}'!"
                        Log.info("WeaverForge", f"🎉 Weaver card '{char_name}' forged successfully in {elapsed:.2f}s!")
                        Log.info("WeaverForge", f"  Summary: {desc_len} desc chars, {pers_len} pers chars, {alt_cnt} alts, {bible_entries} bible entries")
                        self.notification.emit(f"Weaver successfully forged '{char_name}' with Character Bible embedded!")
                        return
                elapsed = time.time() - t0
                content_type = res.headers.get("Content-Type", "")
                err = res.json().get("error", res.text) if "application/json" in content_type else res.text
                Log.error("WeaverForge", f"❌ Weaver card forge failed after {elapsed:.2f}s (HTTP {res.status_code}): {err}")
                self.errorOccurred.emit(f"Weaver forge failed: {err}")
                self._set_status(f"❌ Weaver Failed: {err[:60]}", False)
                return
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("WeaverForge", f"❌ Forge exception after {elapsed:.2f}s: {str(e)}")
                if "Read timed out" in str(e) or "ConnectTimeout" in str(e):
                    msg = f"Weaver forge timed out after {int(elapsed)}s. Increase CHARGEN_TIMEOUT or run with --no-timeout."
                    self.errorOccurred.emit(msg)
                    self._set_status(f"❌ Timed out ({int(elapsed)}s)", False)
                else:
                    self.errorOccurred.emit(f"Forge error: {str(e)}")
                    self._set_status(f"❌ Forge Error: {str(e)[:60]}", False)
                return
            finally:
                if success_msg:
                    self._set_status(success_msg, False)

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - Lorebook Companion Creator
    # -------------------------------------------------------------
    @Slot(result=str)
    def getActiveCardLorebook(self):
        cb = self._card.get("character_book") or {}
        return json.dumps(cb)

    @Slot(str)
    @Slot(str, str)
    def analyzeLorebook(self, lorebook_str: str, name: str = "World Lorebook"):
        if not lorebook_str.strip():
            self.errorOccurred.emit("Please provide a lorebook or world text to analyze!")
            return

        def run():
            try:
                res = requests.post(
                    f"{self._backend_url}/api/lorebook/analyze",
                    json={"lorebook": lorebook_str, "name": name},
                    timeout=30
                )
                if res.status_code == 200:
                    data = res.json()
                    self.lorebookAnalyzed.emit(data)
                else:
                    self.errorOccurred.emit(f"Failed to analyze lorebook: {res.text}")
            except Exception as e:
                self.errorOccurred.emit(f"Lorebook analysis error: {str(e)}")

        self._thread_pool.submit(run)

    @Slot(str, str, str, str, str, str, str, bool, str)
    def generateLorebookCompanion(self, lorebook_str, role, custom_role, user_relation, custom_relation, gender, tone, nsfw, steering=""):
        if not lorebook_str.strip():
            self.errorOccurred.emit("Please provide or load a lorebook before forging a companion!")
            return

        role_display = custom_role if (role == "custom" and custom_role) else role.replace("_", " ").title()
        Log.info("LoreCompanion", f"⚡ Forging Companion [{role_display}] for Lorebook...")
        self._set_status(f"⚡ Forging {role_display} Lorebook Companion...", True, "companion_forge")

        def run():
            t0 = time.time()
            payload = {
                "lorebook": lorebook_str,
                "companionRole": role,
                "customRole": custom_role,
                "userRelation": user_relation,
                "customRelation": custom_relation,
                "companionGender": gender,
                "tone": tone,
                "nsfw": nsfw,
                "steeringInstructions": steering,
                "provider": self._provider
            }
            try:
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/lorebook/generate-companion", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    if "character" in data:
                        self._card = data["character"]
                        self._active_card_id = self._card.get("id") or f"char_{int(time.time())}"
                        self._card["id"] = self._active_card_id
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                        char_name = self._card.get("name", "Companion")
                        entries_cnt = len(self._card.get("character_book", {}).get("entries", []))
                        Log.info("LoreCompanion", f"✓ Companion '{char_name}' forged in {elapsed:.2f}s with {entries_cnt} lorebook entries!")
                        self.lorebookCompanionFinished.emit(data)
                        self.notification.emit(f"Successfully forged companion '{char_name}' with {entries_cnt} embedded lorebook entries!")
                        self._set_status(f"🎉 Forged Companion '{char_name}'!", False)
                        return
                content_type = res.headers.get("Content-Type", "")
                err = res.json().get("error", res.text) if "application/json" in content_type else res.text
                Log.error("LoreCompanion", f"❌ Companion generation failed after {elapsed:.2f}s (HTTP {res.status_code}): {err}")
                self.errorOccurred.emit(f"Companion generation failed: {err}")
                self._set_status(f"❌ Failed: {err[:60]}", False)
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("LoreCompanion", f"❌ Exception during companion forge: {str(e)}")
                self.errorOccurred.emit(f"Companion generation error: {str(e)}")
                self._set_status(f"❌ Error: {str(e)[:60]}", False)

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - Card Fields & Management
    # -------------------------------------------------------------
    @Slot(str, str)
    def updateCardField(self, field_name: str, value: str):
        if field_name == "tags":
            self._card["tags"] = [t.strip() for t in value.split(",") if t.strip()]
        else:
            self._card[field_name] = value
        self.cardChanged.emit()
        self._save_last_card_cache()
        Log.debug("CardEditor", f"✏️ Field '{field_name}' updated (new length: {len(str(value))})")

    @Slot()
    def newBlankCard(self):
        self._card = {
            "id": f"char_{int(time.time())}",
            "name": "New Character",
            "tags": [],
            "description": "",
            "personality": "",
            "scenario": "",
            "first_mes": "",
            "mes_example": "",
            "creator_notes": "",
            "post_history_instructions": "",
            "system_prompt": "",
            "alternate_greetings": [],
            "character_book": {"name": "", "entries": []}
        }
        self._active_card_id = ""
        self.cardChanged.emit()
        self._set_status("Blank card initialized", False)
        self._save_last_card_cache()
        Log.info("CardEditor", "📄 Blank character card initialized")

    @Slot(bool)
    def saveCard(self, as_new: bool = False):
        self._set_status("Saving card to library...", True, "saving")

        def run():
            card_to_save = dict(self._card)
            if as_new or not self._active_card_id:
                card_to_save["id"] = f"char_{int(time.time())}"

            success_msg = ""
            try:
                Log.debug("Library", f"Saving card '{card_to_save.get('name')}' (id='{card_to_save.get('id')}') to backend...")
                res = requests.post(
                    f"{self._backend_url}/api/cards",
                    json={
                        "character": card_to_save,
                        "avatarBase64": card_to_save.get("avatar") or None,
                        "id": card_to_save.get("id") or None
                    },
                    timeout=10
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("record"):
                        self._active_card_id = data["record"]["id"]
                    elif data.get("id"):
                        self._active_card_id = data["id"]
                    self.cardChanged.emit()
                    self.refreshLibrary()
                    success_msg = f"Saved '{card_to_save.get('name')}' to library!"
                    Log.info("Library", f"✓ Saved '{card_to_save.get('name')}' to library (id: {self._active_card_id})")
                    self.notification.emit(success_msg)
                    return
                Log.error("Library", f"❌ Failed to save card (HTTP {res.status_code}): {res.text}")
                self.errorOccurred.emit("Failed to save card: " + res.text)
            except Exception as e:
                Log.error("Library", f"❌ Save error exception: {str(e)}")
                self.errorOccurred.emit("Save error: " + str(e))
            finally:
                if success_msg:
                    self._set_status(success_msg, False)
                else:
                    self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot()
    def refreshLibrary(self):
        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/cards", timeout=10)
                if res.status_code == 200:
                    self._library = res.json().get("cards", [])
                    self.libraryChanged.emit()
                    Log.debug("Library", f"Fetched {len(self._library)} cards from deck")
            except Exception as e:
                Log.warn("Library", f"Failed to fetch library: {e}")

        self._thread_pool.submit(run)



    @Slot(str)
    def loadCard(self, card_id: str):
        self._set_status("Loading card...", True)
        Log.info("Library", f"📂 Loading card '{card_id}' from deck...")

        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/cards/{card_id}", timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    if "card" in data and isinstance(data["card"], dict):
                        data = data["card"]
                    if "character" in data:
                        self._card = data["character"]
                        if data.get("avatarBase64") and not self._card.get("avatar"):
                            self._card["avatar"] = data.get("avatarBase64")
                        self._active_card_id = card_id
                        self._avatar_timestamp = int(time.time() * 1000)
                        self.avatarTimestampChanged.emit()
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        Log.info("Library", f"✓ Loaded card '{self._card.get('name')}' (id: {card_id})")
                        self.notification.emit(f"Loaded '{self._card.get('name')}'")
                        self._set_status("Ready", False)
                        return
                Log.error("Library", f"❌ Failed to load card (HTTP {res.status_code}): {res.text}")
                self.errorOccurred.emit("Failed to load card: " + res.text)
            except Exception as e:
                Log.error("Library", f"❌ Load error exception: {str(e)}")
                self.errorOccurred.emit("Load error: " + str(e))
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str)
    def duplicateCard(self, card_id: str):
        Log.info("Library", f"📋 Duplicating card '{card_id}'...")

        def run():
            try:
                res = requests.post(f"{self._backend_url}/api/cards/{card_id}/duplicate", json={}, timeout=10)
                if res.status_code == 200:
                    dup_record = res.json()
                    dup_char = dup_record.get("character", {}) if isinstance(dup_record, dict) else {}
                    name = dup_char.get("name") or dup_record.get("name") or "Duplicated Card"
                    self.refreshLibrary()
                    Log.info("Library", f"✓ Duplicated card '{card_id}' -> '{name}'")
                    self.notification.emit(f"Duplicated '{name}'")
                else:
                    Log.error("Library", f"❌ Duplicate failed (HTTP {res.status_code}): {res.text}")
                    self.errorOccurred.emit("Duplicate failed: " + res.text)
            except Exception as e:
                Log.error("Library", f"❌ Duplicate error: {str(e)}")
                self.errorOccurred.emit("Duplicate error: " + str(e))

        self._thread_pool.submit(run)



    @Slot(str)
    def deleteCard(self, card_id: str):
        Log.info("Library", f"🗑️ Deleting card '{card_id}'...")

        def run():
            try:
                res = requests.delete(f"{self._backend_url}/api/cards/{card_id}", timeout=10)
                if res.status_code == 200:
                    if self._active_card_id == card_id:
                        self._active_card_id = ""
                        self.cardChanged.emit()
                    self.refreshLibrary()
                    Log.info("Library", f"✓ Deleted card '{card_id}'")
                    self.notification.emit("Card deleted from library")
            except Exception as e:
                Log.error("Library", f"❌ Delete error: {str(e)}")
                self.errorOccurred.emit("Delete error: " + str(e))

        self._thread_pool.submit(run)



    @Slot(str)
    def setCardAvatar(self, file_url_str: str):
        local_path = QUrl(file_url_str).toLocalFile() if str(file_url_str).startswith("file:") else str(file_url_str)
        path = Path(local_path)
        if not path.exists():
            Log.error("Avatar", f"❌ Avatar file not found: {local_path}")
            self.errorOccurred.emit(f"Avatar file not found: {local_path}")
            return
        try:
            with open(path, "rb") as f:
                raw_bytes = f.read()
            mime = "image/png"
            if path.suffix.lower() in (".jpg", ".jpeg"):
                mime = "image/jpeg"
            elif path.suffix.lower() == ".webp":
                mime = "image/webp"
            elif path.suffix.lower() == ".gif":
                mime = "image/gif"
            b64 = base64.b64encode(raw_bytes).decode("ascii")
            data_url = f"data:{mime};base64,{b64}"
            self._card["avatar"] = data_url
            self._avatar_timestamp = int(time.time() * 1000)
            self.avatarTimestampChanged.emit()
            self.cardChanged.emit()
            self._save_last_card_cache()
            self._auto_save_to_library(self._card)
            Log.info("Avatar", f"✓ Updated avatar for '{self._card.get('name')}' ({len(raw_bytes)} bytes)")
            self.notification.emit("Avatar updated!")
        except Exception as e:
            Log.error("Avatar", f"❌ Failed to set avatar: {e}")
            self.errorOccurred.emit(f"Failed to set avatar: {e}")



    @Slot()
    def removeCardAvatar(self):
        if "avatar" in self._card:
            del self._card["avatar"]
        self._avatar_timestamp = int(time.time() * 1000)
        self.avatarTimestampChanged.emit()
        self.cardChanged.emit()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        Log.info("Avatar", f"✓ Removed avatar for '{self._card.get('name')}'")
        self.notification.emit("Avatar removed")



    # -------------------------------------------------------------
    # File Import & Export
    # -------------------------------------------------------------
    @Slot(str)
    def importCard(self, file_url_str: str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str
        path = Path(local_path)
        if not path.exists():
            Log.error("Import", f"❌ File not found: {local_path}")
            self.errorOccurred.emit(f"File not found: {local_path}")
            return

        Log.info("Import", f"📥 Importing card file: '{path.name}' ({path.stat().st_size} bytes)")
        self._set_status("Importing card...", True)

        def run():
            try:
                with open(path, "rb") as f:
                    files = {"file": (path.name, f.read())}
                res = requests.post(f"{self._backend_url}/api/parse-card", files=files, timeout=30)
                if res.status_code == 200:
                    parsed = res.json()
                    char = parsed.get("character") or parsed
                    if parsed.get("avatarDataUrl"):
                        char["avatar"] = parsed.get("avatarDataUrl")
                    self._card = char
                    self._active_card_id = self._card.get("id") or f"char_{int(time.time())}"
                    self._card["id"] = self._active_card_id
                    self._avatar_timestamp = int(time.time() * 1000)
                    self.avatarTimestampChanged.emit()
                    self.cardChanged.emit()
                    self._notify_ipc_active_card()
                    self._save_last_card_cache()
                    self._auto_save_to_library(self._card)
                    Log.info("Import", f"✓ Imported card '{self._card.get('name')}' successfully")
                    self.notification.emit(f"Imported '{self._card.get('name')}' successfully!")
                    self._set_status("Card imported", False)
                    return
                Log.error("Import", f"❌ Import parse failed (HTTP {res.status_code}): {res.text}")
                self.errorOccurred.emit("Import parse failed: " + res.text)
            except Exception as e:
                Log.error("Import", f"❌ Import error: {str(e)}")
                self.errorOccurred.emit("Import error: " + str(e))
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str)
    def exportCardPng(self, file_url_str: str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str
        Log.info("Export", f"📤 Exporting card as PNG (with CCv2 & CCv3 metadata) to: '{Path(local_path).name}'")
        self._set_status("Exporting PNG card...", True)

        def run():
            try:
                res = requests.post(
                    f"{self._backend_url}/api/export-png",
                    json={
                        "character": self._card,
                        "avatarDataUrl": self._card.get("avatar") or None
                    },
                    timeout=30
                )
                if res.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(res.content)
                    Log.info("Export", f"✓ PNG exported successfully ({len(res.content)} bytes)")
                    self.notification.emit(f"Exported PNG to {Path(local_path).name}!")
                    self._set_status("Ready", False)
                    return
                Log.error("Export", f"❌ Export failed (HTTP {res.status_code}): {res.text}")
                self.errorOccurred.emit("Export PNG failed: " + res.text)
            except Exception as e:
                Log.error("Export", f"❌ Export error: {str(e)}")
                self.errorOccurred.emit("Export error: " + str(e))
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str)
    def exportCardJson(self, file_url_str: str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str
        Log.info("Export", f"📤 Exporting card as raw JSON to: '{Path(local_path).name}'")
        try:
            with open(local_path, "w", encoding="utf-8") as f:
                json.dump(self._card, f, indent=2, ensure_ascii=False)
            Log.info("Export", "✓ JSON exported successfully")
            self.notification.emit(f"Exported JSON to {Path(local_path).name}!")
        except Exception as e:
            Log.error("Export", f"❌ Save error: {e}")
            self.errorOccurred.emit(f"Save error: {e}")

    @Slot(str)
    def exportCardCharx(self, file_url_str: str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str
        Log.info("Export", f"📦 Exporting card as .charx container to: '{Path(local_path).name}'")
        self._set_status("Exporting CharX archive...", True)

        def run():
            try:
                res = requests.post(
                    f"{self._backend_url}/api/export-charx",
                    json={
                        "character": self._card,
                        "avatarDataUrl": self._card.get("avatar") or None
                    },
                    timeout=30
                )
                if res.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(res.content)
                    Log.info("Export", f"✓ .charx exported successfully ({len(res.content)} bytes)")
                    self.notification.emit(f"Exported .charx to {Path(local_path).name}!")
                    self._set_status("Ready", False)
                    return
                Log.error("Export", f"❌ CharX export failed (HTTP {res.status_code}): {res.text}")
                self.errorOccurred.emit("Export .charx failed: " + res.text)
            except Exception as e:
                Log.error("Export", f"❌ Export error: {str(e)}")
                self.errorOccurred.emit("Export error: " + str(e))
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)

    # -------------------------------------------------------------
    # Settings / Provider & Prompt Profiles
    # -------------------------------------------------------------
    @Slot()
    def fetchPromptProfiles(self):
        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/prompts", timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    self._prompt_profiles = data.get("profiles", [])
                    self._active_prompt_profile = data.get("activeProfile", "default")
                    self.promptProfilesChanged.emit()
            except Exception as e:
                Log.warn("Settings", f"Failed to fetch prompt profiles: {e}")
        self._thread_pool.submit(run)

    @Slot(str)
    def selectPromptProfile(self, profile_id: str):
        if not profile_id:
            return
        def run():
            try:
                res = requests.post(f"{self._backend_url}/api/prompts/select", json={"profileId": profile_id}, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    self._active_prompt_profile = data.get("activeProfile", profile_id)
                    self._prompt_profiles = data.get("profiles", self._prompt_profiles)
                    self.promptProfilesChanged.emit()
                    profile_name = profile_id
                    for p in self._prompt_profiles:
                        if p.get("id") == profile_id:
                            profile_name = p.get("name", profile_id)
                            break
                    self.notification.emit(f"Switched prompt profile to '{profile_name}'")
                    Log.info("Settings", f"✓ Switched prompt profile to '{profile_name}' ({profile_id})")
            except Exception as e:
                Log.error("Settings", f"Failed to select prompt profile: {e}")
                self.errorOccurred.emit(f"Failed to switch profile: {e}")
        self._thread_pool.submit(run)

    @Slot(str, str, str, str, float)
    def updateProvider(self, p_type, api_key, base_url, model, temp):
        self._provider = {
            "type": p_type,
            "apiKey": api_key.strip(),
            "baseUrl": base_url.strip(),
            "model": model.strip(),
            "temperature": temp
        }
        self._save_provider_config()
        self.providerChanged.emit()
        self.notification.emit(f"AI Provider updated ({p_type})")

    # -------------------------------------------------------------
    # Slots - Image Prompt Generation & Offline Queue
    # -------------------------------------------------------------
    @Slot()
    def fetchImageQueue(self):
        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/image-prompts/queue", timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    self._image_queue = data.get("queue", [])
                    self.imageQueueChanged.emit()
            except Exception as e:
                print("Failed to fetch image queue:", e)

        self._thread_pool.submit(run)



    @Slot(str, str, str, str, str, bool)
    @Slot(str, str, str, str, str, str, bool)
    @Slot(str, str, str, str, str, str, str, bool)
    def generateImagePrompt(self, target_model, *args):
        self._set_status("🎨 Generating diffusion image prompt...", True)

        if len(args) == 7:
            image_purpose, portrait_intent, art_style, shot_type, aspect_ratio, custom_steering, nsfw = args
        elif len(args) == 6:
            portrait_intent, art_style, shot_type, aspect_ratio, custom_steering, nsfw = args
            image_purpose = "avatar"
        elif len(args) == 5:
            art_style, shot_type, aspect_ratio, custom_steering, nsfw = args
            image_purpose = "avatar"
            portrait_intent = "standard_avatar"
        else:
            image_purpose = "avatar"
            portrait_intent = "standard_avatar"
            art_style = "anime"
            shot_type = "card_portrait"
            aspect_ratio = "2:3"
            custom_steering = ""
            nsfw = False

        def run():
            payload = {
                "character": self._card,
                "characterId": self._active_card_id or None,
                "imagePurpose": image_purpose or "avatar",
                "targetModel": target_model or "flux",
                "portraitIntent": portrait_intent or "standard_avatar",
                "artStyle": art_style or "anime",
                "shotType": shot_type or "card_portrait",
                "aspectRatio": aspect_ratio or "2:3",
                "customSteering": custom_steering.strip() or None,
                "nsfw": bool(nsfw),
                "provider": self._provider
            }
            try:
                tout = resolve_timeout(IMAGE_PROMPT_TIMEOUT)
                Log.debug("ImageGen", f"Sending POST {self._backend_url}/api/image-prompts/generate (timeout {f'{tout}s' if tout else 'NONE'})...")
                res = requests.post(f"{self._backend_url}/api/image-prompts/generate", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    result = data.get("result", {})
                    self._last_img_prompt = result
                    self.imagePromptReady.emit(result)
                    self._set_status("Image prompt generated", False)
                    self.notification.emit("✓ Diffusion image prompt ready!")
                    return
                self.errorOccurred.emit(f"Image prompt generation failed: {res.text}")
            except Exception as e:
                self.errorOccurred.emit(f"Generation error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str, str)
    def addPromptToQueue(self, positive, negative):
        if not self._last_img_prompt:
            self.errorOccurred.emit("Please generate a prompt first!")
            return

        def run():
            item_payload = dict(self._last_img_prompt)
            if positive.strip():
                item_payload["positivePrompt"] = positive.strip()
            if negative.strip():
                item_payload["negativePrompt"] = negative.strip()

            try:
                res = requests.post(f"{self._backend_url}/api/image-prompts/queue", json=item_payload, timeout=10)
                if res.status_code == 200:
                    self.fetchImageQueue()
                    self.notification.emit("✓ Added prompt to offline queue!")
                    return
                self.errorOccurred.emit("Failed to add to queue: " + res.text)
            except Exception as e:
                self.errorOccurred.emit("Queue error: " + str(e))

        self._thread_pool.submit(run)

    @Slot(str)
    @Slot(str, str)
    @Slot(str, str, str)
    def queueGreetingImage(self, greeting_text: str = "", shot_type: str = "action_scene", image_purpose: str = "greeting"):
        """
        Generates and queues a diffusion prompt specifically designed for an opening greeting scene or chat background.
        image_purpose: "greeting" (active scene scenario) or "greeting_bg" (chat background wallpaper)
        """
        purpose_label = "chat background" if image_purpose == "greeting_bg" else "greeting scene"
        self._set_status(f"🎨 Generating and queueing {purpose_label} image...", True)

        def run():
            greeting = (greeting_text or "").strip() or self._card.get("first_mes", "")
            steering = (
                f"Atmospheric environmental landscape / architecture backdrop for chat wallpaper during this greeting encounter:\n{greeting[:600]}"
                if image_purpose == "greeting_bg" and greeting
                else (f"Vivid scene illustration depicting the opening greeting encounter:\n{greeting[:600]}" if greeting else None)
            )
            target_model = (
                self._last_img_prompt.get("targetModel")
                if isinstance(self._last_img_prompt, dict) and self._last_img_prompt.get("targetModel")
                else "flux"
            )
            payload = {
                "character": self._card,
                "characterId": self._active_card_id or None,
                "imagePurpose": image_purpose or "greeting",
                "targetModel": target_model,
                "portraitIntent": "standard_avatar",
                "artStyle": "anime",
                "shotType": shot_type or "action_scene",
                "aspectRatio": "16:9",
                "customSteering": steering,
                "nsfw": False,
                "provider": self._provider
            }
            try:
                tout = resolve_timeout(IMAGE_PROMPT_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/image-prompts/generate", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    result = data.get("result", {})
                    self._last_img_prompt = result
                    self.imagePromptReady.emit(result)

                    # Automatically enqueue to offline queue
                    q_res = requests.post(f"{self._backend_url}/api/image-prompts/queue", json=result, timeout=10)
                    if q_res.status_code == 200:
                        self.fetchImageQueue()
                        self.notification.emit(f"✓ Queued greeting image prompt for '{self._card.get('name', 'Character')}'!")
                    return
                self.errorOccurred.emit(f"Greeting image prompt generation failed: {res.text}")
            except Exception as e:
                self.errorOccurred.emit(f"Greeting image error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str, str)
    def toggleQueueItemStatus(self, item_id, current_status):
        next_status = "queued" if current_status == "completed" else "completed"

        def run():
            try:
                res = requests.put(
                    f"{self._backend_url}/api/image-prompts/queue/{item_id}",
                    json={"status": next_status},
                    timeout=10
                )
                if res.status_code == 200:
                    self.fetchImageQueue()
            except Exception as e:
                print("Failed to toggle queue status:", e)

        self._thread_pool.submit(run)



    @Slot(str, str, str)
    def attachImageToQueueItem(self, item_id, file_path_or_url, purpose="avatar"):
        clean_path = QUrl(file_path_or_url).toLocalFile() if file_path_or_url.startswith("file:") else file_path_or_url

        def run():
            try:
                data_url = clean_path
                if not data_url.startswith("data:image"):
                    with open(clean_path, "rb") as f:
                        raw_bytes = f.read()
                    b64 = base64.b64encode(raw_bytes).decode("utf-8")
                    mime = "image/png" if clean_path.lower().endswith(".png") else "image/jpeg"
                    data_url = f"data:{mime};base64,{b64}"

                res = requests.post(
                    f"{self._backend_url}/api/image-prompts/queue/{item_id}/attach-image",
                    json={"avatarDataUrl": data_url, "imageType": purpose, "updateSavedCard": True},
                    timeout=20
                )
                if res.status_code == 200:
                    Log.info("ImageQueue", f"✓ Attached image to queue item {item_id} and updated library card")
                    self.fetchImageQueue()
                    self.refreshLibrary()
                    # If this is the active card in editor, update its avatar too
                    if self._card.get("name"):
                        for it in self._image_queue:
                            if it.get("id") == item_id and it.get("characterName") == self._card.get("name"):
                                if purpose == "avatar":
                                    self._card["avatar"] = data_url
                                    self.cardChanged.emit()
                                    self._save_last_card_cache()
                    self.notification.emit(f"✓ Attached image as {purpose} and updated Library card!")
                else:
                    self.errorOccurred.emit(f"Failed to attach image: {res.text}")
            except Exception as e:
                Log.error("ImageQueue", f"Attach image error: {e}")
                self.errorOccurred.emit(f"Error attaching image: {e}")

        self._thread_pool.submit(run)



    @Slot(str)
    def deleteQueueItem(self, item_id):
        def run():
            try:
                res = requests.delete(f"{self._backend_url}/api/image-prompts/queue/{item_id}", timeout=10)
                if res.status_code == 200:
                    self.fetchImageQueue()
                    self.notification.emit("Removed item from prompt queue")
            except Exception as e:
                print("Failed to delete queue item:", e)

        self._thread_pool.submit(run)



    @Slot(bool)
    def clearQueue(self, completed_only):
        def run():
            try:
                url = f"{self._backend_url}/api/image-prompts/queue"
                if completed_only:
                    url += "?completedOnly=true"
                res = requests.delete(url, timeout=10)
                if res.status_code == 200:
                    self.fetchImageQueue()
                    self.notification.emit("Queue cleared")
            except Exception as e:
                print("Failed to clear queue:", e)

        self._thread_pool.submit(run)



    @Slot(str)
    def copyToClipboard(self, text):
        clipboard = QGuiApplication.clipboard()
        if clipboard:
            clipboard.setText(text)
            self.notification.emit("✓ Copied to clipboard!")

    @Slot(str, str)
    def exportQueue(self, format_type, file_url_str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str

        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/image-prompts/export?format={format_type}", timeout=15)
                if res.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(res.content)
                    self.notification.emit(f"Exported prompt queue to {Path(local_path).name}!")
                    return
                self.errorOccurred.emit("Export failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Export error: {e}")

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - ComfyClient Dedicated IPC Connection (/tmp/comfyclient.sock)
    # -------------------------------------------------------------
    @Slot(str)
    def testComfyClientIPC(self, socket_path_str: str = ""):
        sock_path = (socket_path_str or "").strip() or os.environ.get("COMFYCLIENT_SOCKET", "/tmp/comfyclient.sock")

        def run():
            if not ComfyClient:
                self.comfyClientStatusChanged.emit(False, "ComfyClient library not imported")
                self.errorOccurred.emit("ComfyClient library could not be imported")
                return
            try:
                client = ComfyClient(sock_path)
                client.connect(timeout=3.0)
                status = client.get_status()
                prompts = client.list_prompts()
                client.close()
                self.comfyClientStatusChanged.emit(True, f"Connected ({len(prompts)} prompts in queue)")
                self.comfyClientPromptsReady.emit(prompts)
                self.notification.emit(f"✓ Connected to ComfyClient socket at {sock_path}!")
            except Exception as e:
                self.comfyClientStatusChanged.emit(False, f"Offline ({e})")
                self.errorOccurred.emit(f"ComfyClient socket connection failed: {e}")

        self._thread_pool.submit(run)

    @Slot(str, str)
    def runComfyClientPrompt(self, prompt_name: str, socket_path_str: str = ""):
        name = (prompt_name or "").strip()
        if not name:
            self.errorOccurred.emit("Please provide a prompt name to run in ComfyClient")
            return
        sock_path = (socket_path_str or "").strip() or os.environ.get("COMFYCLIENT_SOCKET", "/tmp/comfyclient.sock")

        def run():
            if not ComfyClient:
                self.errorOccurred.emit("ComfyClient library not imported")
                return
            self._set_status(f"⚡ Queueing '{name}' in ComfyClient...", True)
            try:
                client = ComfyClient(sock_path)
                client.connect(timeout=5.0)
                res = client.run_prompt(name, timeout=3600.0)
                client.close()
                self.notification.emit(f"🚀 Prompt '{name}' queued in ComfyClient!")
            except Exception as e:
                self.errorOccurred.emit(f"ComfyClient run failed: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)

    @Slot()
    def fetchComfyClientPrompts(self):
        sock_path = os.environ.get("COMFYCLIENT_SOCKET", "/tmp/comfyclient.sock")

        def run():
            if not ComfyClient:
                return
            try:
                client = ComfyClient(sock_path)
                client.connect(timeout=3.0)
                prompts = client.list_prompts()
                client.close()
                self.comfyClientPromptsReady.emit(prompts)
            except Exception:
                pass

        self._thread_pool.submit(run)

    @Slot(str)
    def testComfyConnection(self, comfy_url):
        # Redirect connection test to ComfyClient IPC socket
        self.testComfyClientIPC()

    @Slot(str)
    def analyzeComfyWorkflow(self, workflow_str):
        def run():
            try:
                workflow = json.loads(workflow_str)
                res = requests.post(f"{self._backend_url}/api/comfyui/analyze", json={"workflow": workflow}, timeout=10)
                if res.status_code == 200:
                    analysis = res.json()
                    self.comfyAnalysisReady.emit(analysis)
                    return
                self.errorOccurred.emit("Workflow analysis failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Invalid workflow JSON: {e}")

        self._thread_pool.submit(run)

    @Slot(str, str, str, str, bool)
    def dispatchComfyBatch(self, comfy_url, workflow_str, pos_node, neg_node, randomize_seed):
        # Forward execution to ComfyClient IPC socket
        sock_path = os.environ.get("COMFYCLIENT_SOCKET", "/tmp/comfyclient.sock")
        self._set_status("🚀 Queueing batch via ComfyClient IPC...", True)

        def run():
            try:
                if not ComfyClient:
                    raise RuntimeError("ComfyClient library unavailable")
                client = ComfyClient(sock_path)
                client.connect(timeout=5.0)
                prompts = client.list_prompts()
                if not prompts:
                    # Sync prompts from offline image queue if prompt list empty
                    self.fetchImageQueue()
                    prompts = client.list_prompts()
                success_count = 0
                for p_name in prompts:
                    try:
                        client.run_prompt(p_name)
                        success_count += 1
                    except Exception:
                        pass
                client.close()
                self.fetchImageQueue()
                self.comfyExecutionFinished.emit(success_count, 0)
                self.notification.emit(f"✓ Queued {success_count} runs via ComfyClient!")
            except Exception as e:
                self.errorOccurred.emit(f"ComfyClient IPC dispatch error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)

    @Slot(str, str, str, bool, str)
    def exportComfyBatchJson(self, workflow_str, pos_node, neg_node, randomize_seed, file_url_str):
        local_path = QUrl(file_url_str).toLocalFile() if file_url_str.startswith("file:") else file_url_str

        def run():
            try:
                workflow = json.loads(workflow_str)
                payload = {
                    "workflow": workflow,
                    "positiveNodeId": pos_node,
                    "negativeNodeId": neg_node or None,
                    "randomizeSeed": bool(randomize_seed)
                }
                res = requests.post(f"{self._backend_url}/api/comfyui/export-batch", json=payload, timeout=20)
                if res.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(res.content)
                    self.notification.emit(f"Exported ComfyUI batch payload to {Path(local_path).name}!")
                    return
                self.errorOccurred.emit("Export batch failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Export batch error: {e}")

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - Multiverse / AU Forker (Feature #3)
    # -------------------------------------------------------------
    @Slot()
    def fetchMultiverseUniverses(self):
        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/multiverse/universes", timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    self.multiverseUniversesReady.emit(data.get("universes", []))
            except Exception as e:
                Log.error("Multiverse", f"Failed to fetch universes: {e}")
        self._thread_pool.submit(run)



    @Slot(str, str)
    def forkMultiverse(self, universe_id: str, custom_prompt: str):
        char_name = self._card.get("name", "Character")
        Log.info("Multiverse", f"🌌 Forking '{char_name}' into universe '{universe_id}'...")
        self._set_status(f"🌌 Forking into AU...", True, "multiverse_fork")

        def run():
            t0 = time.time()
            try:
                payload = {
                    "character": self._card,
                    "universeId": universe_id,
                    "customPrompt": custom_prompt.strip() or None,
                    "provider": self._provider
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/multiverse/fork", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    forked = data.get("forkedCharacter")
                    if forked:
                        self._card = forked
                        self._active_card_id = forked.get("id") or f"char_au_{int(time.time())}"
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        self.fetchLibrary()
                        self.multiverseForkFinished.emit(data)
                        uni_label = data.get("universeLabel", universe_id)
                        Log.info("Multiverse", f"✓ Forked '{forked.get('name')}' successfully in {elapsed:.2f}s!")
                        self.notification.emit(f"🎉 Forked '{forked.get('name')}' into {uni_label}!")
                        self._set_status(f"🎉 Forked into {uni_label}", False)
                        return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("Multiverse", f"❌ Multiverse fork failed: {err}")
                self.errorOccurred.emit(f"Multiverse fork failed: {err}")
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("Multiverse", f"❌ Multiverse fork exception: {e}")
                self.errorOccurred.emit(f"Multiverse error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - Deep Lorebook & World Nodes (Feature #4)
    # -------------------------------------------------------------
    @Slot(str, str)
    def generateWorldNodes(self, category: str, custom_context: str):
        char_name = self._card.get("name", "Character")
        Log.info("WorldNodes", f"📚 Synthesizing '{category}' world nodes for '{char_name}'...")
        self._set_status(f"📚 Synthesizing {category} nodes...", True, "world_nodes")

        def run():
            t0 = time.time()
            try:
                payload = {
                    "character": self._card,
                    "category": category or "general",
                    "customContext": custom_context.strip() or None,
                    "provider": self._provider
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/lorebook/generate-nodes", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    new_nodes = data.get("nodes", [])
                    if new_nodes:
                        book = self._card.get("character_book") or {"name": f"{char_name} Lorebook", "entries": []}
                        existing_entries = book.get("entries", [])
                        existing_entries.extend(new_nodes)
                        book["entries"] = existing_entries
                        self._card["character_book"] = book
                        self.cardChanged.emit()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                        self.worldNodesGenerated.emit(new_nodes, category, data.get("summary", ""))
                        Log.info("WorldNodes", f"✓ Added {len(new_nodes)} {category} nodes to Character Bible in {elapsed:.2f}s!")
                        self.notification.emit(f"📚 Added {len(new_nodes)} world nodes to Character Bible!")
                        self._set_status("World nodes added", False)
                        return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("WorldNodes", f"❌ Node synthesis failed: {err}")
                self.errorOccurred.emit(f"Node synthesis failed: {err}")
            except Exception as e:
                Log.error("WorldNodes", f"❌ Node synthesis exception: {e}")
                self.errorOccurred.emit(f"Node synthesis error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    @Slot(str, str, str, str)
    def addBibleEntry(self, title: str, keys_csv: str, content: str, position: str):
        book = self._card.get("character_book") or {"name": f"{self._card.get('name', 'Character')} Lorebook", "entries": []}
        entries = book.get("entries", [])
        next_id = max([e.get("id", 0) for e in entries] + [0]) + 1
        keys = [k.strip().lower() for k in keys_csv.split(",") if k.strip()]
        if not keys:
            keys = [self._card.get("name", "character").lower()]
        new_entry = {
            "id": next_id,
            "comment": title or f"Custom Entry #{next_id}",
            "keys": keys,
            "content": content,
            "position": position or "before_char",
            "enabled": True
        }
        entries.append(new_entry)
        book["entries"] = entries
        self._card["character_book"] = book
        self.cardChanged.emit()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        self.notification.emit(f"✓ Added entry '{new_entry['comment']}' to Character Bible!")

    @Slot(int)
    def deleteBibleEntry(self, entry_id: int):
        book = self._card.get("character_book") or {"entries": []}
        entries = book.get("entries", [])
        filtered = [e for e in entries if e.get("id") != entry_id]
        book["entries"] = filtered
        self._card["character_book"] = book
        self.cardChanged.emit()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        self.notification.emit(f"Removed Bible entry #{entry_id}.")

    @Slot()
    def clearCharacterBook(self):
        self._card["character_book"] = {"name": "", "entries": []}
        self.cardChanged.emit()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        self.notification.emit("Cleared all Character Bible / Lorebook entries.")
        Log.info("Bible", f"✓ Cleared all Character Bible entries for '{self._card.get('name')}'")

    # -------------------------------------------------------------
    # Slots - TTS Voice Spec & Qwen3-TTS Stamping (Feature #5)
    # -------------------------------------------------------------
    @Slot(str)
    def stampVoiceSpec(self, custom_preferences: str):
        char_name = self._card.get("name", "Character")
        Log.info("VoiceSpec", f"🎙️ Generating TTS voice spec & Qwen prompt for '{char_name}'...")
        self._set_status("🎙️ Stamping TTS voice spec...", True, "voice_spec")

        def run():
            t0 = time.time()
            try:
                payload = {
                    "character": self._card,
                    "customPreferences": custom_preferences.strip() or None,
                    "provider": self._provider
                }
                tout = resolve_timeout(IMAGE_PROMPT_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/voice/spec", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    stamped = data.get("stampedCharacter")
                    vspec = data.get("voiceSpec")
                    if stamped and vspec:
                        self._card = stamped
                        self.cardChanged.emit()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                        self.voiceSpecStamped.emit(vspec)
                        Log.info("VoiceSpec", f"✓ Stamped voice '{vspec.get('voiceName')}' (Kokoro: {vspec.get('kokoroVoice')}) in {elapsed:.2f}s!")
                        self.notification.emit(f"🎙️ Stamped TTS Voice: '{vspec.get('voiceName')}' (Qwen-TTS ready)!")
                        self._set_status(f"✓ Voice stamped: {vspec.get('voiceName')}", False)
                        return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("VoiceSpec", f"❌ Voice spec failed: {err}")
                self.errorOccurred.emit(f"Voice spec failed: {err}")
            except Exception as e:
                Log.error("VoiceSpec", f"❌ Voice spec exception: {e}")
                self.errorOccurred.emit(f"Voice spec error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)



    # -------------------------------------------------------------
    # Slots - Psychometric Radar Scorecard Audit (Feature #6)
    # -------------------------------------------------------------
    @Slot()
    def runCardAudit(self):
        char_name = self._card.get("name", "Character")
        Log.info("CardAudit", f"📊 Conducting 6-axis psychometric audit on '{char_name}'...")
        self._set_status("📊 Auditing card health...", True, "card_audit")

        def run():
            try:
                payload = {"character": self._card}
                res = requests.post(f"{self._backend_url}/api/audit", json=payload, timeout=10)
                if res.status_code == 200:
                    diag = res.json()
                    grade = diag.get("grade", "B")
                    score = diag.get("score", 70)
                    Log.info("CardAudit", f"✓ Audit finished: Grade {grade} ({score}/100) on '{char_name}'")
                    self.cardAuditFinished.emit(diag)
                    self.notification.emit(f"📊 Audit Grade: {grade} ({score}/100) — {len(diag.get('weaknesses', []))} recommendations")
                    self._set_status(f"Audit: Grade {grade} ({score}/100)", False)
                    return
                self.errorOccurred.emit("Card audit failed: " + res.text)
            except Exception as e:
                Log.error("CardAudit", f"Audit error: {e}")
                self.errorOccurred.emit(f"Audit error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)






    # -------------------------------------------------------------
    # Slots - Fandom Lore & Canon/Headcanon Search
    # -------------------------------------------------------------
    @Slot(str)
    @Slot(str, bool)
    @Slot(str, bool, str)
    def searchLore(self, query: str, include_headcanons: bool = True, provider_type: str = "duckduckgo"):
        if not query.strip():
            self.errorOccurred.emit("Please enter a character name or franchise query to search!")
            return

        clean_q = query.strip()
        Log.info("LoreSearch", f"🔎 Researching fandom lore & headcanons for: '{clean_q}' (include_headcanons={include_headcanons}, provider={provider_type})...")
        self._set_status(f"🔎 Researching '{clean_q[:30]}'...", True, "lore_search")
        self.loreSearchStarted.emit(clean_q)

        def run():
            t0 = time.time()
            try:
                payload = {
                    "query": clean_q,
                    "providerType": provider_type or "duckduckgo",
                    "includeHeadcanons": bool(include_headcanons),
                    "provider": self._provider
                }
                tout = resolve_timeout(IMAGE_PROMPT_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/search-lore", json=payload, timeout=tout)
                elapsed = time.time() - t0
                if res.status_code == 200:
                    data = res.json()
                    self._last_lore_result = data
                    combined = data.get("condensedLore") or ""
                    if not combined:
                        c_text = data.get("canonLore", "")
                        h_text = data.get("fanHeadcanons", "")
                        parts = []
                        if c_text:
                            parts.append(f"=== CANON LORE & OFFICIAL BACKGROUND ===\n{c_text}")
                        if h_text:
                            parts.append(f"=== FAN HEADCANONS & COMMUNITY TROPES ===\n{h_text}")
                        combined = "\n\n".join(parts)
                    self._active_lore = combined
                    self.activeLoreChanged.emit(self._active_lore)
                    self.loreSearchFinished.emit(data)
                    sources_count = len(data.get("results", []))
                    Log.info("LoreSearch", f"✓ Retrieved {sources_count} lore sources for '{clean_q}' in {elapsed:.2f}s!")
                    self.notification.emit(f"🔎 Found {sources_count} canon lore & headcanon sources for '{clean_q}'!")
                    self._set_status(f"✓ Lore ready ({sources_count} sources)", False)
                    return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                Log.error("LoreSearch", f"❌ Lore search failed: {err}")
                self.errorOccurred.emit(f"Lore search failed: {err}")
            except Exception as e:
                elapsed = time.time() - t0
                Log.error("LoreSearch", f"❌ Lore search exception: {e}")
                self.errorOccurred.emit(f"Lore search error: {e}")
            finally:
                self._set_status("Ready", False)

        self._thread_pool.submit(run)

    @Slot(str, int, result=str)
    @Slot(str, result=str)
    def searchErasForAutocomplete(self, query: str, max_results: int = 8) -> str:
        """Performs semantic search across eras for autocomplete suggestions in SparkGenerator."""
        try:
            res = requests.get(
                f"{self._backend_url}/api/eras/search",
                params={"q": query.strip()},
                timeout=5
            )
            if res.status_code == 200:
                results = res.json().get("results", [])
                formatted = []
                for era in results[:max_results]:
                    formatted.append({
                        "id": era.get("id", ""),
                        "name": era.get("name", ""),
                        "region": era.get("region", ""),
                        "category": era.get("category", ""),
                        "is_extension": bool(era.get("is_extension", False)),
                        "source": "extension" if era.get("is_extension") else "built-in"
                    })
                return json.dumps(formatted, ensure_ascii=False)
        except Exception as e:
            Log.error("EraAutocomplete", f"Failed to search eras: {e}")
        return "[]"

    @Slot(str, result=str)
    def searchEraCategoriesForAutocomplete(self, query: str, max_results: int = 8) -> str:
        """Searches categories across eras for 'erac:' autocomplete suggestions in SparkGenerator."""
        try:
            res = requests.get(
                f"{self._backend_url}/api/eras/categories",
                params={"q": query.strip()},
                timeout=5
            )
            if res.status_code == 200:
                categories = res.json().get("categories", [])
                formatted = []
                for cat in categories[:max_results]:
                    formatted.append({
                        "id": cat.get("name", ""),
                        "name": f"📁 {cat.get('name')} ({cat.get('count')} eras)",
                        "region": "",
                        "category": cat.get("name", ""),
                        "is_extension": False,
                        "source": "category"
                    })
                return json.dumps(formatted, ensure_ascii=False)
        except Exception as e:
            Log.error("EraCategoryAutocomplete", f"Failed to search era categories: {e}")
        return "[]"

    @Slot(result=str)
    def getHistoricalErasJson(self) -> str:
        """Returns JSON array of all eras (built-in + user custom) with detailed metadata."""
        try:
            res = requests.get(f"{self._backend_url}/api/eras", timeout=5)
            if res.status_code == 200:
                eras = res.json().get("eras", [])
                return json.dumps(eras, ensure_ascii=False)
        except Exception as e:
            Log.error("Eras", f"Failed to load eras from backend: {e}")
        return "[]"

    @Slot(str, str, str, bool, result=str)
    def searchEras(self, query: str = "", category: str = "", region: str = "", only_user: bool = False) -> str:
        """Full era search used by the Era Picker modal."""
        try:
            params = {
                "q": query or "",
                "category": category or "All",
                "region": region or "All",
                "onlyUser": "true" if only_user else "false"
            }
            res = requests.get(f"{self._backend_url}/api/eras/search", params=params, timeout=5)
            if res.status_code == 200:
                results = res.json().get("results", [])
                return json.dumps(results, ensure_ascii=False)
        except Exception as e:
            Log.error("Eras", f"Failed to search eras: {e}")
        return "[]"

    @Slot(str, result=str)
    def getEraByIdJson(self, era_id: str) -> str:
        """Returns JSON metadata for a specific era ID."""
        if not era_id or era_id == "off":
            return "{}"
        try:
            res = requests.get(f"{self._backend_url}/api/eras/id/{era_id}", timeout=5)
            if res.status_code == 200:
                era = res.json().get("era")
                if era:
                    return json.dumps(era, ensure_ascii=False)
        except Exception as e:
            Log.error("Eras", f"Failed to get era {era_id}: {e}")
        return "{}"

    @Slot(str, result=str)
    def saveUserEra(self, era_json: str) -> str:
        """Saves a custom user era template from JSON."""
        try:
            data = json.loads(era_json)
            res = requests.post(f"{self._backend_url}/api/eras/user", json=data, timeout=5)
            if res.status_code == 200:
                saved = res.json().get("era", {})
                self.notification.emit(f"✅ Saved custom era: {saved.get('short_name') or saved.get('name')}")
                return json.dumps(saved, ensure_ascii=False)
            else:
                self.notification.emit(f"⚠️ Error saving custom era: {res.text}")
        except Exception as e:
            Log.error("Eras", f"Error saving custom era: {e}")
            self.notification.emit(f"⚠️ Error saving custom era: {e}")
        return ""

    @Slot(str, result=bool)
    def deleteUserEra(self, era_id: str) -> bool:
        """Deletes a custom user era template by ID."""
        try:
            res = requests.delete(f"{self._backend_url}/api/eras/user/{era_id}", timeout=5)
            if res.status_code == 200:
                self.notification.emit("🗑️ Custom era template deleted.")
                return True
        except Exception as e:
            Log.error("Eras", f"Failed to delete era {era_id}: {e}")
        self.notification.emit("⚠️ Could not delete era template.")
        return False

    @Slot(str)
    def setActiveLore(self, lore_text: str):
        self._active_lore = lore_text or ""
        self.activeLoreChanged.emit(self._active_lore)
        if self._active_lore:
            self.notification.emit("✓ Lore loaded as active generation context!")
        else:
            self.notification.emit("Cleared active lore context.")

    @Slot()
    def clearActiveLore(self):
        self._active_lore = ""
        self.activeLoreChanged.emit("")
        self.notification.emit("Cleared active lore context.")

    @Slot(str, str)
    @Slot(str, str, str)
    def injectLoreToCharacterBible(self, canon_lore: str, fan_headcanons: str, char_name: str = ""):
        char_name = char_name or self._card.get("name", "Character")
        book = self._card.get("character_book") or {"name": f"{char_name} Lorebook", "entries": []}
        entries = book.get("entries", [])
        next_id = max([e.get("id", 0) for e in entries] + [0]) + 1
        added = 0

        clean_canon = canon_lore.strip()
        if clean_canon:
            entries.append({
                "id": next_id,
                "comment": f"Canon Lore & Wiki Background ({char_name})",
                "keys": [char_name.lower(), "canon", "lore", "background", "wiki"],
                "content": clean_canon,
                "position": "before_char",
                "enabled": True
            })
            next_id += 1
            added += 1

        clean_fan = fan_headcanons.strip()
        if clean_fan:
            entries.append({
                "id": next_id,
                "comment": f"Fan Headcanons & Community Dynamics ({char_name})",
                "keys": [char_name.lower(), "headcanon", "fan theory", "trope", "dynamic"],
                "content": clean_fan,
                "position": "before_char",
                "enabled": True
            })
            added += 1

        if added > 0:
            book["entries"] = entries
            self._card["character_book"] = book
            self.cardChanged.emit()
            self._save_last_card_cache()
            self._auto_save_to_library(self._card)
            Log.info("LoreSearch", f"✓ Injected {added} lore entries into Character Bible for '{char_name}'")
            self.notification.emit(f"📚 Injected {added} lore entries into Character Bible!")
        else:
            self.errorOccurred.emit("No lore text provided to inject.")

    # -------------------------------------------------------------
    # Household & Court Binders
    # -------------------------------------------------------------
    @Slot()
    def fetchHouseholds(self):
        def run():
            try:
                res = requests.get(f"{self._backend_url}/api/households", timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    self._households = data.get("households", [])
                    self.householdsChanged.emit()
            except Exception as e:
                Log.warn("Households", f"Failed to fetch households: {e}")
        self._thread_pool.submit(run)

    @Slot(str)
    def saveHouseholdJson(self, household_json: str):
        def run():
            try:
                hh = json.loads(household_json)
                res = requests.post(f"{self._backend_url}/api/households", json=hh, timeout=10)
                if res.status_code == 200:
                    self.fetchHouseholds()
                    self.notification.emit(f"✓ Household '{hh.get('name')}' saved!")
                else:
                    self.errorOccurred.emit("Failed to save household: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Save household error: {e}")
        self._thread_pool.submit(run)

    @Slot(str)
    def deleteHousehold(self, household_id: str):
        def run():
            try:
                res = requests.delete(f"{self._backend_url}/api/households/{household_id}", timeout=10)
                if res.status_code == 200:
                    self.fetchHouseholds()
                    self.notification.emit("Household deleted")
            except Exception as e:
                self.errorOccurred.emit(f"Delete household error: {e}")
        self._thread_pool.submit(run)

    @Slot(str, str, bool)
    @Slot(str, str, bool, list)
    def generateHouseholdEncounter(self, household_id: str, scenario_goal: str, save_alt: bool, card_ids=None):
        self._set_status("👑 Orchestrating Household group encounter...", True, "household_encounter")
        def run():
            try:
                payload = {
                    "scenarioGoal": scenario_goal.strip() if scenario_goal else None,
                    "saveToAlternateGreetings": bool(save_alt),
                    "participatingCardIds": card_ids if card_ids else None,
                    "provider": self._provider
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/households/{household_id}/encounter", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    encounter = data.get("encounter", {})
                    # If saved to alternate greetings, refresh library and card
                    if save_alt:
                        self.refreshLibrary()
                        if self._active_card_id and card_ids and self._active_card_id in card_ids:
                            self.loadCard(self._active_card_id)
                    self.notification.emit("✓ Group encounter forged successfully!")
                    self._set_status("Group encounter ready", False)
                    return
                self.errorOccurred.emit("Encounter generation failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Encounter generation error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)

    # -------------------------------------------------------------
    # Scenario Matrix
    # -------------------------------------------------------------
    @Slot()
    @Slot(str)
    def generateScenarioMatrix(self, custom_steering: str = ""):
        char_name = self._card.get("name", "Character")
        self._set_status(f"🎲 Generating 4-Package Scenario Matrix for '{char_name}'...", True, "scenario_matrix")

        def run():
            try:
                payload = {
                    "character": self._card,
                    "provider": self._provider,
                    "customSteering": custom_steering.strip() or None,
                    "searchOptions": {
                        "enableWebSearch": bool(self._active_lore),
                        "retrievedLore": self._active_lore or None
                    }
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/scenario-matrix", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    self._scenario_matrix = data
                    self.scenarioMatrixReady.emit(data)
                    packages_count = len(data.get("packages", []))
                    self.notification.emit(f"✓ Generated {packages_count} scenario packages!")
                    self._set_status(f"✓ Scenario matrix ready ({packages_count} packages)", False)
                    return
                self.errorOccurred.emit("Scenario matrix generation failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Scenario matrix error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)

    @Slot(str, str)
    def applyScenarioPackage(self, package_scenario: str, package_first_mes: str):
        if package_scenario:
            self._card["scenario"] = package_scenario
        if package_first_mes:
            self._card["first_mes"] = package_first_mes
        self.cardChanged.emit()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        self.notification.emit("✓ Applied scenario package to active card!")

    # -------------------------------------------------------------
    # Interactive Agent Co-Pilot (Doctoring & Turn Modifying)
    # -------------------------------------------------------------
    @Slot(str, list, str, list, bool, bool, bool)
    @Slot(str, list, str, list, bool, bool)
    @Slot(str, list, str, list, bool)
    @Slot(str, list, str, list)
    @Slot(str, list, str)
    def executeAgentModify(self, instruction: str, target_fields=None, scope: str = "auto", pinned_rules=None, enforce_natural_voice: bool = True, two_takes: bool = False, review_diffs: bool = True):
        char_name = self._card.get("name", "Character")
        self._set_status(f"🤖 Agent modifying '{char_name}'...", True, "agent_modify")

        def run():
            try:
                fields = target_fields if target_fields else ["description", "personality", "first_mes", "scenario"]
                payload = {
                    "character": self._card,
                    "instruction": instruction.strip(),
                    "userPrompt": instruction.strip(),
                    "scope": scope or "auto",
                    "targetFields": fields,
                    "pinnedDirectives": pinned_rules or [],
                    "enforceNaturalVoice": bool(enforce_natural_voice),
                    "twoTakes": bool(two_takes),
                    "provider": self._provider
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/agent/modify", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    stamped = data.get("character")
                    if not review_diffs and stamped and isinstance(stamped, dict):
                        self._card = stamped
                        self.cardChanged.emit()
                        self._notify_ipc_active_card()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                    data["reviewDiffs"] = review_diffs
                    data["twoTakes"] = two_takes
                    self.agentModifyFinished.emit(data)
                    msg = data.get("agentMessage", "Agent response ready.")
                    self.notification.emit(f"🤖 {msg[:80]}")
                    self._set_status("Agent response ready", False)
                    return
                err = res.json().get("error", res.text) if "application/json" in res.headers.get("Content-Type", "") else res.text
                self.errorOccurred.emit(f"Agent modify failed: {err}")
            except Exception as e:
                self.errorOccurred.emit(f"Agent modify error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)

    @Slot(str, str)
    def applyFieldDiff(self, field_name: str, after_text: str):
        self._card[field_name] = after_text
        self.cardChanged.emit()
        self._notify_ipc_active_card()
        self._save_last_card_cache()
        self._auto_save_to_library(self._card)
        self.notification.emit(f"✓ Applied {field_name} revision to card")

    @Slot(str)
    def applyFullCard(self, card_json_str: str):
        try:
            parsed = json.loads(card_json_str)
            if isinstance(parsed, dict):
                self._card.update(parsed)
                self.cardChanged.emit()
                self._notify_ipc_active_card()
                self._save_last_card_cache()
                self._auto_save_to_library(self._card)
                self.notification.emit("✓ Applied all proposed changes to card")
        except Exception as e:
            self.errorOccurred.emit(f"Failed to apply card changes: {e}")

    # -------------------------------------------------------------
    # Vision Image Scan & Deconstruction
    # -------------------------------------------------------------
    @Slot(str)
    def scanImage(self, image_url_or_path: str):
        local_path = QUrl(image_url_or_path).toLocalFile() if image_url_or_path.startswith("file:") else image_url_or_path
        self._set_status("👁️ Scanning and deconstructing image...", True, "vision_scan")

        def run():
            try:
                b64 = ""
                if local_path.startswith("data:image"):
                    b64 = local_path.split(",", 1)[1] if "," in local_path else local_path
                else:
                    with open(local_path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")

                payload = {
                    "imageBase64": b64,
                    "provider": self._provider
                }
                tout = resolve_timeout(IMAGE_PROMPT_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/scan-image", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    analysis = data.get("analysis", {})
                    self.visionScanFinished.emit(analysis)
                    self.notification.emit("✓ Vision image deconstructed into character seed!")
                    self._set_status("Vision scan ready", False)
                    return
                self.errorOccurred.emit("Vision scan failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Vision scan error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)

    # -------------------------------------------------------------
    # Incorporate System Prompt
    # -------------------------------------------------------------
    @Slot(str, str)
    def incorporatePrompt(self, prompt_text: str, target: str = "both"):
        self._set_status("⚙️ Incorporating system directives...", True, "incorporate_prompt")

        def run():
            try:
                payload = {
                    "character": self._card,
                    "prompt": prompt_text.strip(),
                    "target": target or "both",
                    "provider": self._provider
                }
                tout = resolve_timeout(FORGE_TIMEOUT)
                res = requests.post(f"{self._backend_url}/api/incorporate-prompt", json=payload, timeout=tout)
                if res.status_code == 200:
                    data = res.json()
                    stamped = data.get("character")
                    if stamped and isinstance(stamped, dict):
                        self._card = stamped
                        self.cardChanged.emit()
                        self._save_last_card_cache()
                        self._auto_save_to_library(self._card)
                    self.notification.emit("✓ System prompt incorporated into card!")
                    self._set_status("Prompt incorporated", False)
                    return
                self.errorOccurred.emit("Incorporate prompt failed: " + res.text)
            except Exception as e:
                self.errorOccurred.emit(f"Incorporate prompt error: {e}")
            finally:
                self._set_status("Ready", False)
        self._thread_pool.submit(run)


def ensure_backend_process():
    """Checks if Bun backend is active; if not, starts it as a background process."""
    try:
        r = requests.get(f"{BACKEND_DEFAULT_URL}/api/env-keys", timeout=1)
        if r.status_code == 200:
            Log.info("Backend", f"✓ CharGen engine already active at {BACKEND_DEFAULT_URL}")
            return None
    except Exception:
        pass

    Log.info("Backend", "⚡ Starting CharGen engine background daemon (bun run src/server.ts)...")
    try:
        proc = subprocess.Popen(
            ["bun", "run", "src/server.ts"],
            cwd=str(PROJECT_ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except FileNotFoundError:
        Log.error("Backend", "❌ 'bun' was not found on PATH. Install Bun (https://bun.sh) or start the engine manually "
                             "with `bun run src/server.ts`. Continuing without a local engine.")
        return None

    # Clean up child process on exit
    def cleanup():
        if proc.poll() is None:
            Log.info("Backend", "Stopping CharGen engine background process...")
            proc.terminate()
    atexit.register(cleanup)

    # Wait briefly for startup
    for attempt in range(1, 21):
        time.sleep(0.2)
        try:
            r = requests.get(f"{BACKEND_DEFAULT_URL}/api/env-keys", timeout=0.5)
            if r.status_code == 200:
                Log.info("Backend", f"✓ CharGen engine started successfully (ready in {attempt * 0.2:.1f}s)")
                break
        except Exception:
            pass

    return proc


def main():
    # Initialize CLI Logger and QML Message Handler
    Log.init()
    setup_qt_message_handler()

    # Set default style and enable High-DPI scaling
    os.environ["QT_QUICK_CONTROLS_STYLE"] = "Basic"
    os.environ["QT_ENABLE_HIGHDPI_SCALING"] = "1"
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"

    Log.info("Studio", "==================================================")
    Log.info("Studio", f"⚡ CharGen Native Studio (PySide6 v{PySide6.__version__})")
    Log.info("Studio", f"Target backend: {BACKEND_DEFAULT_URL}")
    Log.info("Studio", f"Log level: {Log.get_level_name()} (pass --debug or CHARGEN_DEBUG=1 for trace logs)")
    tout_desc = "DISABLED (wait indefinitely)" if FORGE_TIMEOUT <= 0 else f"{FORGE_TIMEOUT}s ({FORGE_TIMEOUT // 60} mins)"
    Log.info("Studio", f"Forge Timeout: {tout_desc} (pass --no-timeout or CHARGEN_TIMEOUT=0 to disable)")
    Log.info("Studio", "==================================================")

    backend_proc = ensure_backend_process()

    app = QGuiApplication(sys.argv)
    app.setApplicationName("CharGen Harness Native")
    app.setOrganizationName("CharGenUI")

    engine = QQmlApplicationEngine()
    bridge = BackendBridge(app)
    engine.addImageProvider("avatar", AvatarImageProvider(bridge))

    # Expose bridge to QML context
    engine.rootContext().setContextProperty("bridge", bridge)

    qml_file = Path(__file__).parent / "qml" / "Main.qml"
    Log.debug("Studio", f"Loading QML interface from {qml_file.name}...")
    engine.load(QUrl.fromLocalFile(str(qml_file)))

    if not engine.rootObjects():
        Log.error("Studio", "❌ Failed to load QML interface. Check console for QML syntax errors.")
        sys.exit(1)

    Log.info("Studio", "✓ QML interface loaded successfully. Ready for prompt engineering.")
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
