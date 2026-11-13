#!/usr/bin/env python3
"""
CharGen Idea Forge - Desktop Application
PySide6 / QML GUI for the Character Idea Suggestion Pipeline.
Connects to:
1. llama-server (:5001) for uncensored local inference & prompt synthesis.
2. CharGenUI backend (:3333) via Server-Side IPC Bridge for instant card population.
"""

import sys
import os
import re
import json
import logging
import time
import uuid
from datetime import datetime
import threading
import urllib.request
import urllib.error
import base64
import requests
from pathlib import Path
from typing import Any, Optional, Dict, List
from PySide6.QtWidgets import QApplication
from PySide6.QtQml import QQmlApplicationEngine
from PySide6.QtCore import QObject, Signal, Slot, Property, QUrl
from PySide6.QtGui import QClipboard, QGuiApplication

# Import backend pipeline & ensure repository root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(Path(__file__).parent.resolve()))
from pipeline import (
    IdeaPipeline,
    load_config,
    save_config,
    format_concept_sauce,
    normalize_rp_macros,
    normalize_concept_dict_macros
)
from era_agent_harness import configure_logging
from media_utils import load_media_payload, extract_fallback_keyframes, is_video_file, is_image_file
from procedural_engine import (
    HISTORICAL_ERAS
)
from eras_data import (
    search_eras_semantic,
    load_user_eras,
    save_user_era,
    delete_user_era,
    get_era_info,
    get_all_eras,
    list_extension_files,
    save_extension_file,
    delete_extension_file,
    validate_era_compliance,
    get_era_categories,
    search_era_categories
)

HISTORY_FILE = Path(__file__).parent / "history.json"
GRIMOIRE_FILE = Path(__file__).parent / "grimoire.json"
HOUSEHOLDS_FILE = Path(__file__).parent / "households.json"
QUEUE_FILE = Path(__file__).parent / "dispatch_queue.json"
AGENT_ERA_SESSION_FILE = Path(__file__).parent / "agent_era_session.json"
AGENT_CHAR_SESSION_FILE = Path(__file__).parent / "agent_char_session.json"
LOGGER = logging.getLogger("chargenui.idea_generator")

CHARGEN_CANONICAL_GENRES = [
    "Dark Fantasy",
    "Cyberpunk",
    "Modern Dark / Noir",
    "Sci-Fi / Space Opera",
    "Psychological Horror",
    "Romance / Slice of Life",
    "Supernatural / Urban Fantasy",
    "Post-Apocalyptic",
    "Historical / Period",
    "Gothic / Cosmic Eldritch",
    "Mystery / Crime Thriller",
    "Anime / Action"
]

def classify_genre_from_context(character_data: dict, era_name: Optional[str] = None) -> Optional[str]:
    """
    Fast, deterministic System One decision classifier.
    Maps synthesized character context (tags, premise, archetype, setting/era)
    into one of the 12 canonical CharGenUI genres without forcing a domestic fallback.
    """
    if not isinstance(character_data, dict):
        return None

    # 1. If an era is provided, check era metadata category
    if era_name and str(era_name).lower() != "off":
        info = get_era_info(str(era_name))
        if info:
            cat = (info.get("category") or "").lower()
            if "fantasy" in cat:
                return "Dark Fantasy"
            if "scifi" in cat or "space" in cat or "cyber" in cat:
                return "Cyberpunk" if "cyber" in cat else "Sci-Fi / Space Opera"
            if "victorian" in cat or "gothic" in cat or "regency" in cat:
                return "Gothic / Cosmic Eldritch"
            if any(hist in cat for hist in ["ancient", "medieval", "feudal", "renaissance", "colonial", "historical", "period"]):
                return "Historical / Period"

    # 2. Extract full character text tokens
    tokens = []
    for key in ["genre", "setting", "archetype", "title", "tags", "premise", "central_contradiction"]:
        val = character_data.get(key)
        if isinstance(val, list):
            tokens.extend([str(v).lower() for v in val])
        elif isinstance(val, str):
            tokens.append(val.lower())
    full_text = " ".join(tokens)

    # 3. Decision scoring rules across canonical genres
    scores = {g: 0 for g in CHARGEN_CANONICAL_GENRES}

    # Cyberpunk
    if re.search(r"\b(cyberpunk|android|cyborg|neon|hacker|megacorp|prosthetic|netrunner|underworld)\b", full_text):
        scores["Cyberpunk"] += 3
    # Sci-Fi / Space Opera
    if re.search(r"\b(sci-fi|spaceship|starship|galaxy|space opera|orbital|extraterrestrial|mech|ftl|starlight)\b", full_text):
        scores["Sci-Fi / Space Opera"] += 3
    # Gothic / Eldritch
    if re.search(r"\b(gothic|eldritch|cosmic horror|cthulhu|manor|abyssal|bloodborne|victorian gothic|crypt)\b", full_text):
        scores["Gothic / Cosmic Eldritch"] += 3
    # Dark Fantasy / Grimdark
    if re.search(r"\b(dark fantasy|fantasy|elf|elven|fae|demon|inquisitor|dragon|sorcerer|magic|kingdom|swords?|grimoire|dungeon)\b", full_text):
        scores["Dark Fantasy"] += 3
    # Psychological Horror
    if re.search(r"\b(psychological horror|sanity|delusion|nightmare|obsession|psychosis|unhinged|paranoia)\b", full_text):
        scores["Psychological Horror"] += 3
    # Supernatural / Urban Fantasy
    if re.search(r"\b(vampire|werewolf|urban fantasy|witch|occult|paranormal|shifter|kitsune|ghost)\b", full_text):
        scores["Supernatural / Urban Fantasy"] += 3
    # Post-Apocalyptic
    if re.search(r"\b(post-apocalyptic|wasteland|fallout|scavenger|radiation|ruins|survivalist|ruin)\b", full_text):
        scores["Post-Apocalyptic"] += 3
    # Modern Dark / Noir
    if re.search(r"\b(noir|detective|mafia|crime boss|cartel|syndicate|hitman|smuggler|interrogation)\b", full_text):
        scores["Modern Dark / Noir"] += 2
    # Mystery / Crime Thriller
    if re.search(r"\b(mystery|investigator|thriller|conspiracy|suspect|sleuth|alibi)\b", full_text):
        scores["Mystery / Crime Thriller"] += 2
    # Romance / Slice of Life
    if re.search(r"\b(slice of life|domestic|marriage|spouse|husband|wife|dating|roommate|suburban|coffee shop|high school)\b", full_text):
        scores["Romance / Slice of Life"] += 2
    # Historical / Period
    if re.search(r"\b(historical|victorian|regency|roman|samurai|medieval|knight|feudal|1920s|renaissance)\b", full_text):
        scores["Historical / Period"] += 2
    # Anime / Action
    if re.search(r"\b(anime|action hero|martial arts|ninja|shonen|tournament|superhero)\b", full_text):
        scores["Anime / Action"] += 2

    best_genre = max(scores, key=scores.get)
    return best_genre if scores[best_genre] > 0 else None


def configure_app_logging() -> Path:
    """Enable diagnostics for QML-launched harness requests by default."""
    state_dir = Path(
        os.environ.get(
            "XDG_STATE_HOME",
            Path.home() / ".local" / "state",
        )
    ) / "chargenui"
    state_dir.mkdir(parents=True, exist_ok=True)
    log_path = state_dir / "idea-forge.log"
    configure_logging("INFO", str(log_path))
    LOGGER.info("Idea Forge logging enabled: %s", log_path)
    return log_path

class Backend(QObject):
    # Signals
    generationStarted = Signal()
    generationFinished = Signal(bool, str)
    isGeneratingChanged = Signal(bool)
    ideaReceived = Signal(str)
    naturalIdeaReceived = Signal(str)
    scenarioHookReceived = Signal(str)
    storyArcReceived = Signal(str)
    statusChanged = Signal(str, bool)
    historyUpdated = Signal()
    toast = Signal(str)
    configChanged = Signal()

    # CharGenUI IPC Signals
    charGenStatusChanged = Signal(bool, str)
    charGenUrlChanged = Signal()
    ipcPushed = Signal(bool, str)

    # Agent Mode Signals
    agentMessageReceived = Signal(str, str)
    agentChatReset = Signal()
    agentChatHistoryChanged = Signal()
    agentModeChanged = Signal(str)
    eraAgentMessageReceived = Signal(str, str, str)
    eraToolStepsChanged = Signal()
    agentInstructionQueueChanged = Signal()

    # Grimoire & Sequential Dispatch Queue Signals
    grimoireUpdated = Signal()
    dispatchQueueUpdated = Signal()
    batchProgress = Signal(int, int, str)
    currentEraChanged = Signal(str)
    historicalErasUpdated = Signal()

    # Households & Multi-Character Signals
    householdsChanged = Signal()
    householdEncounterGenerated = Signal(str, str)

    def __init__(self):
        super().__init__()
        self._is_generating = False
        self._current_era = "off"
        self._cfg = load_config()
        self._endpoint = self._cfg.get("endpoint_url", "http://localhost:5001/v1")
        self._chargen_url = self._cfg.get("chargen_url", "http://localhost:3333")
        self._is_chargen_online = False
        self._model = self._cfg.get("model_name", "")
        self._pipeline = IdeaPipeline(endpoint_url=self._endpoint, model_name=self._model)
        self._history = self._load_history()
        self._grimoire = self._load_grimoire()
        self._households = self._load_households()
        self._dispatch_queue, self._active_queue_id = self._load_queue()
        self._agent_mode = "character"  # "character" | "era"
        self._agent_history, self._agent_character = self._load_agent_char_session()
        self._era_agent_history, self._agent_era_pair, self._era_tool_steps = self._load_agent_era_session()
        self._agent_cancel_event = None
        self._agent_instruction_queue = []
        self._agent_queue_lock = threading.Lock()

    def _load_grimoire(self) -> list:
        if GRIMOIRE_FILE.exists():
            try:
                with open(GRIMOIRE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and "character" in item:
                                item["character"] = normalize_concept_dict_macros(item["character"])
                                if "formatted_concept" in item["character"]:
                                    item["character"]["formatted_concept"] = normalize_rp_macros(item["character"]["formatted_concept"])
                        return data
            except Exception:
                pass
        return []

    def _save_grimoire(self):
        try:
            with open(GRIMOIRE_FILE, "w", encoding="utf-8") as f:
                json.dump(self._grimoire, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Backend] Failed to save grimoire: {e}")

    def _load_households(self) -> list:
        if HOUSEHOLDS_FILE.exists():
            try:
                with open(HOUSEHOLDS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception:
                pass
        return []

    def _save_households(self):
        try:
            with open(HOUSEHOLDS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._households, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Backend] Failed to save households: {e}")

    def _load_queue(self) -> tuple:
        if QUEUE_FILE.exists():
            try:
                with open(QUEUE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("queue", []), data.get("active_id", None)
            except Exception:
                pass
        return [], None

    def _save_queue(self):
        try:
            with open(QUEUE_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "queue": self._dispatch_queue,
                    "active_id": self._active_queue_id
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Backend] Failed to save queue: {e}")

    def _find_grimoire_item(self, item_id: str):
        for item in self._grimoire:
            if item.get("id") == item_id:
                return item
        return None

    def _add_to_grimoire_silent(self, data: dict, source: str = "studio", origin_prompt: str = "") -> str:
        if not data or not isinstance(data, dict):
            return ""
        name = data.get("name")
        if not name:
            return ""

        # Normalize macros across all fields
        data = normalize_concept_dict_macros(data)
        if "formatted_concept" in data:
            data["formatted_concept"] = normalize_rp_macros(data["formatted_concept"])

        # Attach origin_prompt if present
        if origin_prompt and not data.get("origin_prompt"):
            data["origin_prompt"] = origin_prompt.strip()

        # Stamp era if missing from data but present in active app state
        if ("era" not in data or not data["era"] or str(data["era"]).lower() == "off") and self._current_era and self._current_era.lower() != "off":
            info = get_era_info(self._current_era)
            data["era"] = info.get("name") if info else self._current_era

        # Avoid exact duplicates
        for item in self._grimoire:
            c = item.get("character", {})
            if c.get("name") == name and c.get("premise") == data.get("premise"):
                if data.get("era") and not c.get("era"):
                    c["era"] = data["era"]
                if data.get("story_arc") and not c.get("story_arc"):
                    c["story_arc"] = data["story_arc"]
                if origin_prompt and not c.get("origin_prompt"):
                    c["origin_prompt"] = origin_prompt.strip()
                if origin_prompt and not item.get("origin_prompt"):
                    item["origin_prompt"] = origin_prompt.strip()
                self._save_grimoire()
                return item.get("id", "")

        item_id = f"grim_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        new_entry = {
            "id": item_id,
            "timestamp": datetime.now().strftime("%b %d, %H:%M"),
            "source": source,
            "origin_prompt": origin_prompt.strip() if origin_prompt else data.get("origin_prompt", ""),
            "rating": 0,
            "triage": "inbox",
            "notes": "",
            "character": data,
            "queue_status": "idle"
        }
        self._grimoire.insert(0, new_entry)
        self._save_grimoire()
        self.grimoireUpdated.emit()
        return item_id

    def _load_history(self) -> list:
        if HISTORY_FILE.exists():
            try:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_history(self):
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(self._history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Backend] Failed to save history: {e}")

    def _load_agent_era_session(self):
        history, era_pair, tool_steps = [], None, []
        if AGENT_ERA_SESSION_FILE.exists():
            try:
                with open(AGENT_ERA_SESSION_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        history = data.get("history", []) if isinstance(data.get("history"), list) else []
                        era_pair = data.get("era_pair") if isinstance(data.get("era_pair"), dict) else None
                        tool_steps = data.get("tool_steps", []) if isinstance(data.get("tool_steps"), list) else []
            except Exception as e:
                LOGGER.warning("Failed to load agent era session: %s", e)
        return history, era_pair, tool_steps

    def _save_agent_era_session(self):
        try:
            data = {
                "history": self._era_agent_history,
                "era_pair": self._agent_era_pair,
                "tool_steps": self._era_tool_steps,
            }
            with open(AGENT_ERA_SESSION_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            LOGGER.warning("Failed to save agent era session: %s", e)

    def _load_agent_char_session(self):
        history, character = [], None
        if AGENT_CHAR_SESSION_FILE.exists():
            try:
                with open(AGENT_CHAR_SESSION_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        history = data.get("history", []) if isinstance(data.get("history"), list) else []
                        character = data.get("character") if isinstance(data.get("character"), dict) else None
            except Exception as e:
                LOGGER.warning("Failed to load agent char session: %s", e)
        return history, character

    def _save_agent_char_session(self):
        try:
            data = {
                "history": self._agent_history,
                "character": self._agent_character,
            }
            with open(AGENT_CHAR_SESSION_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            LOGGER.warning("Failed to save agent char session: %s", e)

    # Properties & State Mutators
    def get_is_generating(self) -> bool:
        return self._is_generating

    def _set_generating(self, val: bool):
        if self._is_generating != val:
            self._is_generating = val
            self.isGeneratingChanged.emit(val)

    isGenerating = Property(bool, get_is_generating, notify=isGeneratingChanged)

    def get_endpoint(self) -> str:
        return self._endpoint

    def set_endpoint(self, val: str):
        if self._endpoint != val:
            self._endpoint = val
            self._cfg["endpoint_url"] = val
            save_config(self._cfg)
            self._pipeline = IdeaPipeline(endpoint_url=self._endpoint, model_name=self._model)
            self.configChanged.emit()

    endpointUrl = Property(str, get_endpoint, set_endpoint, notify=configChanged)

    def get_chargen_url(self) -> str:
        return self._chargen_url

    def set_chargen_url(self, val: str):
        if self._chargen_url != val:
            self._chargen_url = val
            self._cfg["chargen_url"] = val
            save_config(self._cfg)
            self.charGenUrlChanged.emit()

    charGenUrl = Property(str, get_chargen_url, set_chargen_url, notify=charGenUrlChanged)

    def get_is_chargen_online(self) -> bool:
        return self._is_chargen_online

    isCharGenOnline = Property(bool, get_is_chargen_online, notify=charGenStatusChanged)

    def get_current_era(self) -> str:
        return self._current_era

    def set_current_era(self, val: str):
        cleaned = str(val or "off").strip()
        if self._current_era != cleaned:
            self._current_era = cleaned
            self.currentEraChanged.emit(self._current_era)

    currentEra = Property(str, get_current_era, set_current_era, notify=currentEraChanged)

    def get_households(self) -> list:
        return self._households

    households = Property(list, get_households, notify=householdsChanged)

    # Slots
    @Slot(str)
    def updateEndpoint(self, endpoint: str):
        cleaned = endpoint.strip()
        if cleaned:
            self.set_endpoint(cleaned)
            self.checkConnection()
            self.toast.emit(f"⚙️ Endpoint saved to config.json: {cleaned}")

    @Slot(str)
    def updateCharGenUrl(self, url: str):
        cleaned = url.strip()
        if cleaned:
            self.set_chargen_url(cleaned)
            self.checkCharGenConnection()
            self.toast.emit(f"⚙️ CharGenUI URL saved: {cleaned}")

    @Slot()
    def checkConnection(self):
        def _check():
            try:
                conn = self._pipeline.check_connection()
                if conn["online"]:
                    raw_model = conn.get("current_model", "")
                    clean_model = Path(raw_model).name
                    if clean_model.endswith(".gguf"):
                        clean_model = clean_model[:-5]
                    if len(clean_model) > 22:
                        clean_model = clean_model[:19] + "..."
                    self.statusChanged.emit(f"llama-server :5001 ({clean_model})", True)
                else:
                    self.statusChanged.emit("Offline (:5001) - Procedural Ready", False)
            except RuntimeError:
                pass
            except Exception:
                pass

        threading.Thread(target=_check, daemon=True).start()

    @Slot()
    def checkCharGenConnection(self):
        """Checks if CharGenUI backend (:3333) is reachable over HTTP REST."""
        def _check():
            try:
                url = f"{self._chargen_url.rstrip('/')}/api/ipc/status"
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "IdeaSuggesterQML/1.0"})
                    with urllib.request.urlopen(req, timeout=2.5) as resp:
                        if resp.status == 200:
                            self._is_chargen_online = True
                            self.charGenStatusChanged.emit(True, "CharGenUI :3333 (Online)")
                            return
                except Exception:
                    pass

                self._is_chargen_online = False
                self.charGenStatusChanged.emit(False, "CharGenUI :3333 (Standby)")
            except RuntimeError:
                pass

        threading.Thread(target=_check, daemon=True).start()

    @Slot(str, result=str)
    def formatConceptSauce(self, idea_json: str) -> str:
        """Formats a character concept JSON string into the complete rich sauce dossier."""
        try:
            data = json.loads(idea_json)
            data = normalize_concept_dict_macros(data)
            return format_concept_sauce(data)
        except Exception:
            return normalize_rp_macros(idea_json or "")

    @Slot(str, str, str, bool, str)
    @Slot(str, str, str, bool)
    @Slot(str, str, str)
    @Slot(str, bool)
    @Slot(str)
    def pushToCharGenUI(self, arg1: str, arg2: Any = None, arg3: Any = None, arg4: Any = False, arg5: Any = None):
        """
        Pushes character concept directly to CharGenUI (:3333) via HTTP REST.
        Supports:
          pushToCharGenUI(char_json, auto_generate) -> Formats full-fidelity sauce dossier
          pushToCharGenUI(concept, archetype, themes_json, auto_generate, era)
          pushToCharGenUI(concept, archetype, themes_json, auto_generate)
          pushToCharGenUI(idea_json)
        """
        def _worker():
            era = None
            auto_generate = False
            concept = ""
            archetype = "Character"
            themes_raw = []

            # Check if arg1 is a JSON object / character dossier
            is_json_dossier = False
            parsed_data = None
            if isinstance(arg1, str) and (arg1.strip().startswith("{") or arg1.strip().startswith("[")):
                try:
                    parsed_data = json.loads(arg1)
                    if isinstance(parsed_data, dict) and (parsed_data.get("name") or parsed_data.get("premise") or parsed_data.get("title")):
                        is_json_dossier = True
                except Exception:
                    is_json_dossier = False

            bot_mode = None
            genre = None
            story_arc = None
            if is_json_dossier and parsed_data:
                # Format the COMPLETE character sauce with all rich fields!
                parsed_data = normalize_concept_dict_macros(parsed_data)
                concept = format_concept_sauce(parsed_data)
                char_name = parsed_data.get("name", "Character")
                char_title = parsed_data.get("title", "Concept")
                archetype = f"{char_name} ({char_title})"
                themes_raw = parsed_data.get("tags", [])
                era = parsed_data.get("era", None)
                genre = parsed_data.get("genre") or parsed_data.get("setting")
                story_arc = parsed_data.get("story_arc") or parsed_data.get("storyArc")
                bot_mode = parsed_data.get("bot_mode") or parsed_data.get("botMode")
                if arg2 is not None and isinstance(arg2, bool):
                    auto_generate = arg2
                elif arg4 is not None and isinstance(arg4, bool):
                    auto_generate = arg4
                if arg5 and isinstance(arg5, str):
                    era = arg5.strip()
            elif isinstance(arg2, str) and arg3 is not None:
                # 4- or 5-argument call: (concept, archetype, themes_json, auto_generate, era)
                concept = arg1
                archetype = arg2
                themes_raw = arg3
                auto_generate = bool(arg4)
                if arg5 and isinstance(arg5, str):
                    era = arg5.strip()
                # Ensure archetype and title are in concept if not already present
                if archetype and archetype not in concept:
                    concept = f"Character: {archetype}\n\n{concept}"
            else:
                # Fallback / 1 or 2 arg call with plain string
                concept = arg1
                auto_generate = bool(arg2) if isinstance(arg2, bool) else False
                themes_raw = []

            # Ensure all macros in concept are canonical double braces ({{user}}, {{char}})
            concept = normalize_rp_macros(concept)

            # If no era passed explicitly, fall back to active app era
            if not era or str(era).lower().strip() == "off":
                if self._current_era and self._current_era.lower() != "off":
                    era = self._current_era

            # Resolve era ID into full formatted era name if possible
            if era and str(era).lower().strip() != "off":
                info = get_era_info(str(era))
                if info and info.get("name"):
                    era = info["name"]
                else:
                    era = str(era).strip()
            else:
                era = None

            try:
                if isinstance(themes_raw, list):
                    themes = themes_raw
                else:
                    themes = json.loads(themes_raw) if themes_raw else []
            except Exception:
                themes = [t.strip() for t in str(themes_raw).split(",") if t.strip()]

            # Determine genre intelligently from character context if not explicitly set
            resolved_genre = None
            if genre and str(genre).strip():
                resolved_genre = str(genre).strip()
            elif is_json_dossier and parsed_data:
                resolved_genre = classify_genre_from_context(parsed_data, era_name=era)

            payload = {
                "concept": concept,
                "archetype": archetype,
                "themes": themes,
                "suggestedBy": "Idea Suggester QML App",
                "autoGenerate": auto_generate
            }
            if resolved_genre:
                payload["genre"] = resolved_genre
            if story_arc:
                payload["storyArc"] = str(story_arc).strip()
            if era:
                payload["era"] = era
            if bot_mode:
                payload["botMode"] = bot_mode

            url = f"{self._chargen_url.rstrip('/')}/api/ipc/suggest-concept"

            try:
                data_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=data_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "IdeaSuggesterQML/1.0"
                    },
                    method="POST"
                )

                with urllib.request.urlopen(req, timeout=6.0) as resp:
                    if resp.status == 200:
                        raw_resp = resp.read().decode("utf-8")
                        res_data = json.loads(raw_resp) if raw_resp else {}
                        idea_id = res_data.get("idea", {}).get("id", "idea_ok")

                        self._is_chargen_online = True
                        self.charGenStatusChanged.emit(True, "CharGenUI :3333 (Online)")
                        self.ipcPushed.emit(True, idea_id)
                        
                        arch_label = archetype if archetype else "Concept"
                        era_suffix = f" [{era}]" if era else ""
                        self.toast.emit(f"🚀 Sent '{arch_label}'{era_suffix} directly to CharGenUI (:3333)!")
                        return
                    else:
                        self.toast.emit(f"⚠️ CharGenUI responded with HTTP {resp.status}")
                        self.ipcPushed.emit(False, f"HTTP {resp.status}")

            except urllib.error.URLError as e:
                try:
                    self._is_chargen_online = False
                    self.charGenStatusChanged.emit(False, "CharGenUI :3333 (Standby)")
                    self.ipcPushed.emit(False, str(e.reason))
                    self.toast.emit(f"⚠️ Could not reach CharGenUI on {self._chargen_url}. Is CharGenUI running?")
                except RuntimeError:
                    pass
            except Exception as e:
                self.ipcPushed.emit(False, str(e))
                self.toast.emit(f"⚠️ Network error sending concept: {e}")

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, str, str, str, float, str, str, str, str, str, str, str)
    @Slot(str, str, str, str, float, str, str, str, str, str, str)
    @Slot(str, str, str, str, float, str, str, str, str, str)
    @Slot(str, str, str, str, float, str, str, str, str)
    @Slot(str, str, str, str, float, str, str, str)
    @Slot(str, str, str, str, float, str)
    def generateIdea(
        self,
        genre: str,
        dynamic: str,
        tropes_json: str,
        custom_seed: str,
        temperature: float,
        intensity: str = "any",
        locks_json: str = "{}",
        current_idea_json: str = "{}",
        focus_mode: str = "psychometric",
        correction_tier: str = "off",
        era: str = "off",
        bot_mode: str = "single"
    ):
        if self._is_generating:
            return

        self._set_generating(True)
        self.generationStarted.emit()

        try:
            tropes = json.loads(tropes_json) if tropes_json else []
        except Exception:
            tropes = [t.strip() for t in tropes_json.split(",") if t.strip()]

        try:
            locks = json.loads(locks_json) if locks_json else {}
        except Exception:
            locks = {}

        try:
            current_idea = json.loads(current_idea_json) if current_idea_json else {}
        except Exception:
            current_idea = {}

        params = {
            "genre": genre,
            "dynamic": dynamic,
            "tropes": tropes,
            "custom_seed": custom_seed,
            "temperature": temperature,
            "intensity": intensity,
            "correction_tier": correction_tier,
            "era": era,
            "bot_mode": bot_mode,
            "locks": locks,
            "current_idea": current_idea,
            "focus_mode": focus_mode
        }

        def _worker():
            try:
                result = self._pipeline.generate_idea(params)
                if bot_mode and bot_mode != "single":
                    result["bot_mode"] = bot_mode
                self._add_to_grimoire_silent(result, source="studio")
                result_json = json.dumps(result, ensure_ascii=False)
                self.ideaReceived.emit(result_json)
                self.generationFinished.emit(True, "")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Generation error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, str, str, str, str, str, str, str)
    @Slot(str, str, str, str, str, str, str)
    @Slot(str, str, str, str, str, str)
    def rerollIdea(self, idea_json: str, locks_json: str, genre: str, dynamic: str, seed: str, intensity: str, correction_tier: str = "off", era: str = "off"):
        """Rerolls unlocked components via local LLM while preserving locked slots."""
        try:
            current_idea = json.loads(idea_json) if idea_json else {}
        except Exception:
            current_idea = {}

        try:
            locks = json.loads(locks_json) if locks_json else {}
        except Exception:
            locks = {}

        self.generateIdea(
            genre=genre,
            dynamic=dynamic,
            tropes_json="[]",
            custom_seed=seed,
            temperature=0.85,
            intensity=intensity,
            locks_json=locks_json,
            current_idea_json=idea_json,
            focus_mode="psychometric",
            correction_tier=correction_tier,
            era=era,
            bot_mode=current_idea.get("bot_mode", "single")
        )

    @Slot(str)
    @Slot(str, str)
    @Slot(str, str, str)
    def generateStoryArc(self, idea_json: str, rough_story_hint: str = "", min_acts_str: str = "3"):
        """Generates a narrative story arc trajectory from character dossier with optional rough story guidance and minimum act count."""
        try:
            min_acts = max(1, int(min_acts_str))
        except (ValueError, TypeError):
            min_acts = 3
        if self._is_generating:
            return

        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit(f"⚡ Drafting story arc ({min_acts} acts)...")

        def _worker():
            try:
                char_data = json.loads(idea_json) if idea_json else {}
                arc = self._pipeline.generate_story_arc(char_data, rough_story_hint=rough_story_hint, min_acts=min_acts)
                self.storyArcReceived.emit(arc)
                self.generationFinished.emit(True, "")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Story arc error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str)
    def generateScenarioHook(self, idea_json: str):
        """Generates an immersive opening scenario / first message hook from character dossier."""
        if self._is_generating:
            return

        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit("⚡ Drafting opening roleplay scenario...")

        def _worker():
            try:
                char_data = json.loads(idea_json) if idea_json else {}
                hook = self._pipeline.generate_scenario_hook(char_data)
                self.scenarioHookReceived.emit(hook)
                self.generationFinished.emit(True, "")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Scenario hook error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot()
    def cancelGeneration(self):
        """Allows user to cancel or reset generation state."""
        event = self._agent_cancel_event
        if event is not None:
            event.set()
            self.toast.emit("🛑 Cancellation requested; waiting for the current model call to return.")
            return
        self._set_generating(False)
        self.generationFinished.emit(False, "Cancelled by user")
        self.toast.emit("🛑 Generation reset")

    def _drain_agent_instructions(self):
        with self._agent_queue_lock:
            queued = list(self._agent_instruction_queue)
            self._agent_instruction_queue.clear()
        self.agentInstructionQueueChanged.emit()
        return queued

    @Slot(str)
    def copyToClipboard(self, text: str):
        clipboard = QGuiApplication.clipboard()
        if clipboard:
            clipboard.setText(text)
            self.toast.emit("📋 Copied to clipboard! Ready to paste into CharGen UI.")

    @Slot(str)
    def saveToHistory(self, idea_json: str):
        try:
            idea = json.loads(idea_json)
            if not self._history or self._history[0].get("name") != idea.get("name") or self._history[0].get("title") != idea.get("title"):
                self._history.insert(0, idea)
                self._save_history()
                self.historyUpdated.emit()
                self.toast.emit(f"⭐ Saved '{idea.get('name')}' to History.")
            else:
                self.toast.emit("Already saved to History.")
        except Exception as e:
            self.toast.emit(f"Failed to save: {e}")

    @Slot(int)
    def deleteHistoryItem(self, index: int):
        if 0 <= index < len(self._history):
            deleted = self._history.pop(index)
            self._save_history()
            self.historyUpdated.emit()
            self.toast.emit(f"Removed '{deleted.get('name', 'Item')}' from History.")

    @Slot()
    def clearHistory(self):
        self._history = []
        self._save_history()
        self.historyUpdated.emit()
        self.toast.emit("History cleared.")

    @Slot(result=str)
    def getHistoryJson(self) -> str:
        return json.dumps(self._history, ensure_ascii=False)

    @Slot(str, result=str)
    def readExistingEraJson(self, era_id: str) -> str:
        """Reads full specification of an existing era from eras_db.json."""
        info = get_era_info(era_id)
        return json.dumps(info or {}, ensure_ascii=False)

    @Slot(result=str)
    def getHistoricalErasJson(self) -> str:
        """Returns JSON array of all eras (built-in + user custom) with detailed metadata."""
        all_eras = get_all_eras(include_user=True)
        return json.dumps(list(all_eras.values()), ensure_ascii=False)

    @Slot(result=str)
    def getUserErasJson(self) -> str:
        """Returns JSON array of custom user-created eras."""
        user_eras = load_user_eras()
        return json.dumps(list(user_eras.values()), ensure_ascii=False)

    @Slot(str, result=str)
    def saveUserEra(self, era_json: str) -> str:
        """Saves a custom user era template from JSON."""
        try:
            data = json.loads(era_json)
            saved = save_user_era(data)
            self.toast.emit(f"✅ Saved custom era: {saved.get('short_name') or saved.get('name')}")
            return json.dumps(saved, ensure_ascii=False)
        except Exception as e:
            self.toast.emit(f"⚠️ Error saving custom era: {e}")
            return ""

    @Slot(str, result=bool)
    def deleteUserEra(self, era_id: str) -> bool:
        """Deletes a custom user era template by ID."""
        success = delete_user_era(era_id)
        if success:
            self.toast.emit("🗑️ Custom era template deleted.")
        else:
            self.toast.emit("⚠️ Could not delete era template.")
        return success

    @Slot(str, result=str)
    def getEraByIdJson(self, era_id: str) -> str:
        """Returns JSON metadata for a specific era ID (built-in or user)."""
        info = get_era_info(era_id)
        return json.dumps(info or {}, ensure_ascii=False)

    @Slot(str, str, str, bool, result=str)
    def searchEras(self, query: str, category: str = "", region: str = "", only_user: bool = False) -> str:
        """Full era search used by the Era Picker modal (QML passes "" for 'All' filters)."""
        try:
            results = search_eras_semantic(
                query=query or "",
                category_filter=category or "All",
                region_filter=region or "All",
                only_user=bool(only_user),
            )
        except Exception as e:
            print(f"[Backend] searchEras failed: {e}", file=sys.stderr)
            results = []
        return json.dumps(results, ensure_ascii=False)

    @Slot(str, int, str, result=str)
    @Slot(str, int, result=str)
    @Slot(str, result=str)
    def searchErasForAutocomplete(self, query: str, max_results: int = 8, variant: str = "all") -> str:
        """Performs semantic search across eras for autocomplete suggestions, with optional variant filtering ('poly' or 'mono')."""
        results = search_eras_semantic(query=query, variant_filter=variant)
        # Filter and format results for autocomplete
        formatted_results = []
        for era in results[:max_results]:
            source_type = "extension" if era.get("is_extension", False) else "built-in"
            formatted_results.append({
                "id": era.get("id", ""),
                "name": era.get("name", ""),
                "category": era.get("category", ""),
                "region": era.get("region", ""),
                "source": source_type
            })
        return json.dumps(formatted_results, ensure_ascii=False)

    @Slot(str, int, result=str)
    def searchEraCategoriesForAutocomplete(self, query: str, max_results: int = 8) -> str:
        """Searches categories across all eras for 'erac:' category autocomplete suggestions."""
        results = search_era_categories(query=query)
        formatted_results = []
        for cat in results[:max_results]:
            formatted_results.append({
                "id": cat.get("name", ""),
                "name": f"📁 {cat.get('name')} ({cat.get('count')} eras)",
                "category": cat.get("name", ""),
                "source": "category"
            })
        return json.dumps(formatted_results, ensure_ascii=False)

    @Slot(str, result=str)
    def insertEraIntoAgenticMessage(self, era_id: str) -> str:
        """Inserts an era reference into the current agent message (if any)."""
        # This method could be enhanced to actually modify the agentic message
        # For now, return confirmation that the era was inserted
        # The actual insertion logic would depend on how agentic messages are stored and edited
        return json.dumps({"inserted_era_id": era_id, "status": "success"}, ensure_ascii=False)

    @Slot(str, str, str, str, float, str, str, str)
    @Slot(str, str, str, float, str, str, str)
    @Slot(str, str, str, float, str, str)
    @Slot(str, str, str, float, str)
    @Slot(str, str, str, float)
    @Slot(str, str, str)
    @Slot(str, str)
    @Slot(str)
    def brainstormNaturalLanguage(
        self,
        prompt: str,
        mode_or_image: str = "psychometric",
        intensity_or_mode: str = "any",
        temperature_or_intensity: Any = 0.85,
        correction_tier_or_temp: Any = "off",
        era_or_tier: str = "off",
        bot_mode_or_era: str = "single",
        maybe_bot_mode: str = "single",
        image_notes: str = ""
    ):
        """Forges a rich character concept dossier from freeform natural language text and optional visual evidence."""
        # Overload handling if image_path is passed as second argument:
        # brainstormNaturalLanguage(prompt, image_path, mode, intensity, temperature, correction_tier, era, bot_mode, image_notes)
        if isinstance(temperature_or_intensity, str) and (isinstance(correction_tier_or_temp, (int, float))):
            image_path = mode_or_image
            mode = intensity_or_mode
            intensity = temperature_or_intensity
            temperature = float(correction_tier_or_temp)
            correction_tier = era_or_tier
            era = bot_mode_or_era
            bot_mode = maybe_bot_mode
            visual_notes = image_notes.strip()
        else:
            image_path = ""
            mode = mode_or_image
            intensity = intensity_or_mode
            temperature = float(temperature_or_intensity) if isinstance(temperature_or_intensity, (int, float)) else 0.85
            correction_tier = str(correction_tier_or_temp)
            era = era_or_tier
            bot_mode = bot_mode_or_era
            visual_notes = ""

        if self._is_generating:
            return

        self._set_generating(True)
        self.generationStarted.emit()
        mode_label = "Multi-Character Cast" if bot_mode == "multi_character" else ("RPG World / GM" if bot_mode == "rpg_world" else "Character")
        if image_path:
            self.toast.emit(f"👁️ Deconstructing visual seed & forging {mode_label} concept...")
        else:
            self.toast.emit(f"🧠 Forging {mode_label} concept from natural language prompt...")

        def _worker():
            try:
                effective_prompt = prompt.strip()
                media_blocks = []
                fallback_blocks = []

                # If an image or video was attached in the Natural Language tab
                if image_path:
                    local_img = QUrl(image_path).toLocalFile() if image_path.startswith("file:") else image_path
                    if os.path.exists(local_img):
                        payload_info = load_media_payload(local_img)
                        if payload_info and "native_block" in payload_info:
                            media_blocks.append(payload_info["native_block"])
                            if payload_info.get("type") == "video":
                                fallback_blocks = extract_fallback_keyframes(local_img)

                augmented_prompt = effective_prompt
                if visual_notes:
                    if augmented_prompt:
                        augmented_prompt = f"{augmented_prompt}\n\n[VISUAL SEED DETAILS & CONTEXT]:\n{visual_notes}"
                    else:
                        augmented_prompt = f"[VISUAL SEED DETAILS & CONTEXT]:\n{visual_notes}"

                result = self._pipeline.brainstorm_natural_language(
                    prompt=augmented_prompt,
                    mode=mode,
                    intensity=intensity,
                    temperature=temperature,
                    correction_tier=correction_tier,
                    era=era,
                    bot_mode=bot_mode,
                    media_blocks=media_blocks,
                    fallback_media_blocks=fallback_blocks
                )
                if bot_mode and bot_mode != "single":
                    result["bot_mode"] = bot_mode
                result["origin_prompt"] = effective_prompt
                if image_path:
                    result["visual_seed_image"] = image_path
                self._add_to_grimoire_silent(result, source="natural_language", origin_prompt=effective_prompt)
                result_json = json.dumps(result, ensure_ascii=False)
                self.naturalIdeaReceived.emit(result_json)
                self.generationFinished.emit(True, "")
                self.toast.emit(f"✨ Forged: {result.get('name')} ({result.get('title')})")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Brainstorm error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, str, str, str, float, str, str, str, str)
    def brainstormNaturalLanguageWithVision(
        self,
        prompt: str,
        image_path: str,
        mode: str = "psychometric",
        intensity: str = "any",
        temperature: float = 0.85,
        correction_tier: str = "off",
        era: str = "off",
        bot_mode: str = "single",
        image_notes: str = ""
    ):
        """Explicit entrypoint for forging with an attached image seed in the Natural Language tab."""
        self.brainstormNaturalLanguage(
            prompt=prompt,
            mode_or_image=image_path,
            intensity_or_mode=mode,
            temperature_or_intensity=intensity,
            correction_tier_or_temp=temperature,
            era_or_tier=correction_tier,
            bot_mode_or_era=era,
            maybe_bot_mode=bot_mode,
            image_notes=image_notes
        )

    @Slot(str)
    def loadIdeaIntoStudio(self, idea_json: str):
        """Loads an idea (e.g. from the Natural Language tab) into the main Studio/Forge tab."""
        self.ideaReceived.emit(idea_json)
        self.toast.emit("📥 Concept loaded into Main Studio!")

    # Agent Mode Properties & Slots
    @Property(str, notify=agentModeChanged)
    def agentMode(self) -> str:
        return self._agent_mode

    @agentMode.setter
    def agentMode(self, val: str):
        if val != self._agent_mode:
            self._agent_mode = val
            self.agentModeChanged.emit(val)

    @Property(str, notify=eraToolStepsChanged)
    def eraToolStepsJson(self) -> str:
        return json.dumps(self._era_tool_steps, ensure_ascii=False)

    @Property(str, notify=agentInstructionQueueChanged)
    def queuedAgentInstruction(self) -> str:
        with self._agent_queue_lock:
            return self._agent_instruction_queue[-1] if self._agent_instruction_queue else ""

    @Property(int, notify=agentInstructionQueueChanged)
    def queuedAgentInstructionCount(self) -> int:
        with self._agent_queue_lock:
            return len(self._agent_instruction_queue)

    @Slot()
    def clearQueuedAgentInstruction(self):
        with self._agent_queue_lock:
            self._agent_instruction_queue.clear()
        self.agentInstructionQueueChanged.emit()
        self.toast.emit("🗑️ Queued instruction cancelled.")

    @Slot()
    def clearEraToolSteps(self):
        self._era_tool_steps = []
        self.eraToolStepsChanged.emit()

    @Slot(str, float, str)
    @Slot(str, float)
    @Slot(str)
    def sendAgentMessage(self, message: str, temperature: float = 0.85, media_path: str = ""):
        """Sends a message to the AI Character Architect or Era Architect Agent with optional media (image/video)."""
        cleaned = message.strip()
        if not cleaned and not media_path:
            return
        if self._is_generating and self._agent_mode == "era":
            with self._agent_queue_lock:
                self._agent_instruction_queue.append(cleaned)
            self._era_agent_history.append({"role": "user", "content": cleaned})
            self.agentChatHistoryChanged.emit()
            self.agentInstructionQueueChanged.emit()
            self.toast.emit("📥 Instruction queued for the next agent step.")
            return
        if self._is_generating:
            return

        # 1. Era Architect Mode
        if self._agent_mode == "era":
            user_turn = {
                "role": "user",
                "content": cleaned
            }
            self._era_agent_history.append(user_turn)
            self._save_agent_era_session()
            self.agentChatHistoryChanged.emit()

            self._set_generating(True)
            self._agent_cancel_event = threading.Event()
            with self._agent_queue_lock:
                self._agent_instruction_queue = []
            self.agentInstructionQueueChanged.emit()
            self.generationStarted.emit()
            self.toast.emit("📜 Era Architect is deliberating (:5001)...")

            def _era_worker():
                try:
                    self._era_tool_steps = []
                    self.eraToolStepsChanged.emit()

                    def _on_step(step_obj):
                        sid = step_obj.get("id")
                        found = False
                        for i, s in enumerate(self._era_tool_steps):
                            if s.get("id") == sid:
                                self._era_tool_steps[i] = step_obj
                                found = True
                                break
                        if not found:
                            self._era_tool_steps.append(step_obj)
                        self._save_agent_era_session()
                        self.eraToolStepsChanged.emit()
                        title = step_obj.get("title", "Tool")
                        status = step_obj.get("status", "")
                        if status == "running":
                            self.toast.emit(f"🛠️ Executing: {title}...")
                        elif status == "done":
                            self.toast.emit(f"✅ {title} complete")

                    past_turns = self._era_agent_history[:-1]
                    result = self._pipeline.era_agent_chat_turn(
                        user_message=cleaned,
                        chat_history=past_turns,
                        current_era_pair=self._agent_era_pair,
                        temperature=temperature,
                        status_cb=lambda s: self.toast.emit(s),
                        step_cb=_on_step,
                        cancel_event=self._agent_cancel_event,
                        instruction_queue=self._drain_agent_instructions
                    )

                    if self._agent_cancel_event and self._agent_cancel_event.is_set():
                        return

                    agent_msg = result.get("agent_message", "I have synthesized the paired era setting.")
                    era_pair = result.get("era_pair")
                    compliance = result.get("compliance", {})
                    if era_pair:
                        self._agent_era_pair = era_pair

                    assistant_turn = {
                        "role": "assistant",
                        "content": agent_msg
                    }
                    self._era_agent_history.append(assistant_turn)
                    self._save_agent_era_session()
                    self.agentChatHistoryChanged.emit()

                    era_json = json.dumps(era_pair, ensure_ascii=False) if era_pair else "{}"
                    comp_json = json.dumps(compliance, ensure_ascii=False) if compliance else "{}"

                    self.eraAgentMessageReceived.emit(agent_msg, era_json, comp_json)
                    self.historicalErasUpdated.emit()
                    self.generationFinished.emit(True, "")
                    if era_pair:
                        poly = era_pair.get("polygyny", {})
                        self.toast.emit(f"✨ Era Architect: Forged {poly.get('name', 'Era Pair')}")
                    else:
                        self.toast.emit("⚠️ AI Server Offline (:5001)")
                except Exception as e:
                    err_msg = f"⚠️ Era Agent processing failed: {e}"
                    print(f"[Backend] {err_msg}")
                    self.generationFinished.emit(False, str(e))
                    self.toast.emit(err_msg)
                finally:
                    self._agent_cancel_event = None
                    self._set_generating(False)

            threading.Thread(target=_era_worker, daemon=True).start()
            return

        # 2. Character Architect Mode
        display_msg = cleaned if cleaned else "(Attached visual media)"
        user_turn = {
            "role": "user",
            "content": display_msg
        }
        self._agent_history.append(user_turn)
        self._save_agent_char_session()
        self.agentChatHistoryChanged.emit()

        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit("🤖 AI Agent is deliberating (:5001)...")

        def _worker():
            try:
                past_turns = self._agent_history[:-1]
                media_blocks = []
                fallback_blocks = []
                if media_path:
                    local_p = QUrl(media_path).toLocalFile() if media_path.startswith("file:") else media_path
                    if os.path.exists(local_p):
                        payload_info = load_media_payload(local_p)
                        if payload_info and "native_block" in payload_info:
                            media_blocks.append(payload_info["native_block"])
                            if payload_info.get("type") == "video":
                                fallback_blocks = extract_fallback_keyframes(local_p)

                effective_user_msg = cleaned if cleaned else "Examine the attached visual media and author a rich, deeply developed character dossier matching the aesthetic and demeanor."

                result = self._pipeline.agent_chat_turn(
                    user_message=effective_user_msg,
                    chat_history=past_turns,
                    current_character=self._agent_character,
                    temperature=temperature,
                    media_blocks=media_blocks,
                    fallback_media_blocks=fallback_blocks
                )

                agent_msg = result.get("agent_message", "I have updated the character dossier.")
                char_obj = result.get("character", {})
                self._agent_character = char_obj

                assistant_turn = {
                    "role": "assistant",
                    "content": agent_msg
                }
                self._agent_history.append(assistant_turn)
                self._save_agent_char_session()
                self.agentChatHistoryChanged.emit()

                char_json = json.dumps(char_obj, ensure_ascii=False)
                if char_obj and char_obj.get("name"):
                    self._add_to_grimoire_silent(char_obj, source="agent")
                self.agentMessageReceived.emit(agent_msg, char_json)
                self.generationFinished.emit(True, "")
                if char_obj and char_obj.get("name"):
                    self.toast.emit(f"✨ AI Agent: Updated {char_obj.get('name')}")
                else:
                    self.toast.emit("⚠️ AI Server Offline (:5001)")
            except Exception as e:
                err_msg = f"⚠️ Agent processing failed: {e}"
                print(f"[Backend] {err_msg}")
                self.generationFinished.emit(False, str(e))
                self.toast.emit(err_msg)
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(result=str)
    def pasteMediaFromClipboard(self) -> str:
        """Reads image or file paths from system clipboard and saves to temporary file if raw image."""
        app = QGuiApplication.instance()
        if not app:
            return ""
        cb = app.clipboard()
        if not cb:
            return ""
        mime = cb.mimeData()
        if not mime:
            return ""

        # 1. Check if clipboard has file URLs
        if mime.hasUrls():
            for u in mime.urls():
                p = u.toLocalFile()
                if os.path.exists(p) and (is_image_file(p) or is_video_file(p)):
                    return p

        # 2. Check if clipboard has raw image (e.g. screenshot or copied image from browser)
        if mime.hasImage():
            qimg = cb.image()
            if not qimg.isNull():
                import tempfile
                tmp_dir = tempfile.gettempdir()
                out_path = os.path.join(tmp_dir, f"cg_clip_{int(time.time()*1000)}.png")
                if qimg.save(out_path, "PNG"):
                    return out_path

        # 3. Check plain text for file path
        if mime.hasText():
            t = mime.text().strip().replace("file://", "")
            if os.path.exists(t) and (is_image_file(t) or is_video_file(t)):
                return t

        return ""

    @Slot()
    def resetAgentSession(self):
        """Clears the active Agent Mode conversation history and active state."""
        if self._agent_mode == "era":
            self._era_agent_history = []
            self._agent_era_pair = None
            self._era_tool_steps = []
            self._save_agent_era_session()
            self.eraToolStepsChanged.emit()
            self.agentChatReset.emit()
            self.agentChatHistoryChanged.emit()
            self.toast.emit("🧹 Era Architect session reset.")
            return

        self._agent_history = []
        self._agent_character = None
        self._save_agent_char_session()
        self.agentChatReset.emit()
        self.agentChatHistoryChanged.emit()
        self.toast.emit("🧹 Agent session reset.")

    @Slot(result=str)
    def getAgentChatHistoryJson(self) -> str:
        """Returns JSON-encoded list of conversation turns in the active Agent session."""
        if self._agent_mode == "era":
            return json.dumps(self._era_agent_history, ensure_ascii=False)
        return json.dumps(self._agent_history, ensure_ascii=False)

    @Slot(result=str)
    def getActiveAgentEraPairJson(self) -> str:
        """Returns JSON-encoded active era pair staged in Era Architect mode."""
        if self._agent_era_pair:
            return json.dumps(self._agent_era_pair, ensure_ascii=False)
        return "{}"

    @Slot(result=str)
    def getActiveAgentCharacterJson(self) -> str:
        """Returns JSON-encoded active character in Character Agent mode."""
        if self._agent_character:
            return json.dumps(self._agent_character, ensure_ascii=False)
        return "{}"

    @Slot(str)
    def primeAgentWithCharacter(self, character_json: str):
        """Seeds the Agent session with an existing character (e.g. from Studio or History)."""
        try:
            char_obj = json.loads(character_json)
            self._agent_character = char_obj
            name = char_obj.get("name", "Character")
            intro = f"I've loaded **{name}** ({char_obj.get('title', 'Role')}) into our active session. What would you like to steer, critique, or evolve?"
            self._agent_history = [{
                "role": "assistant",
                "content": intro
            }]
            self.agentChatHistoryChanged.emit()
            self.agentMessageReceived.emit(intro, character_json)
            self.toast.emit(f"🤖 Loaded '{name}' into Agent Mode.")
        except Exception as e:
            self.toast.emit(f"Failed to prime agent: {e}")

    @Slot()
    def loadCurrentCardIntoAgent(self):
        """Loads the active RoleplayCharacter card from CharGenUI into Character Agent mode."""
        try:
            res = requests.get(f"{self._chargen_url}/api/ipc/active-card", timeout=10)
            if res.status_code != 200:
                self.toast.emit(f"Could not load active card (HTTP {res.status_code}).")
                return
            character = res.json().get("character")
            if not isinstance(character, dict) or not character.get("name"):
                self.toast.emit("No active character card is available.")
                return
            self._agent_mode = "character"
            self.agentModeChanged.emit(self._agent_mode)
            self.primeAgentWithCharacter(json.dumps(character, ensure_ascii=False))
            self.toast.emit(f"🤖 Loaded current card '{character.get('name')}' into Agent Mode.")
        except Exception as e:
            self.toast.emit(f"Failed to load current card: {e}")

    @Slot(str)
    def importCardIntoAgent(self, file_url: str):
        """Parse PNG, JSON, or CharX with the shared backend parser, then seed Agent mode."""
        try:
            path = file_url.replace("file://", "")
            with open(path, "rb") as handle:
                res = requests.post(
                    f"{self._chargen_url}/api/parse-card",
                    files={"file": (os.path.basename(path), handle)},
                    timeout=30,
                )
            if res.status_code != 200:
                self.toast.emit(f"Card import failed (HTTP {res.status_code}).")
                return
            character = res.json().get("character")
            if not isinstance(character, dict):
                self.toast.emit("The imported file did not contain a character card.")
                return
            self._agent_mode = "character"
            self.agentModeChanged.emit(self._agent_mode)
            self.primeAgentWithCharacter(json.dumps(character, ensure_ascii=False))
            self.toast.emit(f"🤖 Imported '{character.get('name', 'Character')}' into Agent Mode.")
        except Exception as e:
            self.toast.emit(f"Failed to import card: {e}")

    @Slot(str, str, str, result=str)
    @Slot(str, str, result=str)
    def saveEraPairToExtension(self, filename: str, era_pair_json: str, destination: str = "project_data") -> str:
        """Saves era definitions into data/eras_extensions/<filename>.json or user external directory."""
        try:
            data = json.loads(era_pair_json)
            res = save_extension_file(filename, data, destination=destination)
            self.historicalErasUpdated.emit()
            loc_label = "user app data (~/.local or AppData)" if res.get("destination") == "local_user" else filename
            self.toast.emit(f"💾 Saved era pack to {loc_label}!")
            return json.dumps(res)
        except Exception as e:
            self.toast.emit(f"Failed to save extension: {e}")
            return json.dumps({"success": False, "error": str(e)})

    @Slot(result=str)
    def getInstalledEraExtensionsJson(self) -> str:
        """Returns JSON array of all installed extension packs."""
        try:
            files = list_extension_files()
            return json.dumps(files, ensure_ascii=False)
        except Exception as e:
            return "[]"

    @Slot(str, str, result=bool)
    @Slot(str, result=bool)
    def deleteEraExtension(self, filename: str, destination: Optional[str] = None) -> bool:
        """Deletes an extension file from data/eras_extensions/ or user external directory."""
        ok = delete_extension_file(filename, destination=destination)
        if ok:
            self.historicalErasUpdated.emit()
            self.toast.emit(f"Deleted extension pack {filename}")
        return ok

    # ==========================================
    # BATCH FORGE & IDEA GRIMOIRE SLOTS
    # ==========================================

    @Slot(int, str, str, str, str, float, str, str, str, str, str, str)
    @Slot(int, str, str, str, str, float, str, str, str, str, str)
    def generateBatch(
        self,
        count: int,
        genre: str,
        dynamic: str,
        tropes_json: str,
        custom_seed: str,
        temperature: float,
        intensity: str = "any",
        locks_json: str = "{}",
        current_idea_json: str = "{}",
        focus_mode: str = "psychometric",
        correction_tier: str = "off",
        era: str = "off"
    ):
        """Generates a batch of distinct ideas in the background and stages them directly into the Grimoire."""
        if self._is_generating:
            return

        batch_count = max(1, min(10, int(count)))
        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit(f"🎲 Launching Batch Forge ({batch_count} concepts)...")

        try:
            tropes = json.loads(tropes_json) if tropes_json else []
        except Exception:
            tropes = [t.strip() for t in tropes_json.split(",") if t.strip()]

        try:
            locks = json.loads(locks_json) if locks_json else {}
        except Exception:
            locks = {}

        try:
            current_idea = json.loads(current_idea_json) if current_idea_json else {}
        except Exception:
            current_idea = {}

        def _worker():
            success_count = 0
            for i in range(batch_count):
                item_temp = min(1.05, max(0.65, temperature + (i - 1) * 0.06))
                params = {
                    "genre": genre,
                    "dynamic": dynamic,
                    "tropes": tropes,
                    "custom_seed": custom_seed,
                    "temperature": item_temp,
                    "intensity": intensity,
                    "correction_tier": correction_tier,
                    "era": era,
                    "locks": locks,
                    "current_idea": current_idea,
                    "focus_mode": focus_mode
                }
                self.batchProgress.emit(i + 1, batch_count, f"Synthesizing concept {i + 1} of {batch_count}...")
                try:
                    result = self._pipeline.generate_idea(params)
                    self._add_to_grimoire_silent(result, source="batch_forge")
                    success_count += 1
                    if i == 0:
                        self.ideaReceived.emit(json.dumps(result, ensure_ascii=False))
                except Exception as e:
                    print(f"[BatchForge] Concept {i + 1} failed: {e}")
                    if i == 0 and batch_count == 1:
                        self.generationFinished.emit(False, str(e))
                        self.toast.emit(f"⚠️ Batch Forge error: {e}")
                        self._set_generating(False)
                        return

            self._save_grimoire()
            self.grimoireUpdated.emit()
            self.generationFinished.emit(True, "")
            self.toast.emit(f"✨ Batch Forge complete: {success_count} concepts saved to Grimoire!")
            self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, str, str, result=str)
    @Slot(str, str, result=str)
    @Slot(str, result=str)
    def addToGrimoire(self, idea_json: str, source: str = "manual", origin_prompt: str = "") -> str:
        """Manually adds an idea JSON into the Grimoire with optional origin prompt."""
        try:
            data = json.loads(idea_json)
        except Exception:
            return ""
        item_id = self._add_to_grimoire_silent(data, source=source, origin_prompt=origin_prompt)
        if item_id:
            name = data.get("name", "Character")
            self.toast.emit(f"📖 Added '{name}' to Grimoire!")
        return item_id

    @Slot(str, int, str, str)
    def updateGrimoireItem(self, item_id: str, rating: int, triage: str, notes: str):
        """Updates ratings (0-5 stars), triage tag, and scratchpad notes for a Grimoire entry."""
        item = self._find_grimoire_item(item_id)
        if item:
            item["rating"] = max(0, min(5, int(rating)))
            item["triage"] = triage
            item["notes"] = notes
            self._save_grimoire()
            self.grimoireUpdated.emit()
            self.toast.emit("💾 Grimoire item updated.")

    @Slot(str, str)
    def updateGrimoireHousehold(self, item_id: str, household_name: str):
        """Assigns an arbitrary household / court binder tag to a Grimoire entry."""
        item = self._find_grimoire_item(item_id)
        if item:
            item["household"] = household_name.strip()
            self._save_grimoire()
            # Also sync into household binder members
            if household_name.strip():
                self._sync_grimoire_item_to_household(item, household_name.strip())
            self.grimoireUpdated.emit()
            self.toast.emit(f"👑 Assigned to household: {household_name.strip() or 'None'}")

    def _sync_grimoire_item_to_household(self, item: dict, hh_name_or_id: str):
        target_hh = None
        for h in self._households:
            if h.get("id") == hh_name_or_id or h.get("name") == hh_name_or_id:
                target_hh = h
                break
        if not target_hh:
            target_hh = {
                "id": "hh_" + uuid.uuid4().hex[:8],
                "name": hh_name_or_id,
                "category_label": "Household / Court",
                "description": "",
                "user_title": "{{user}}",
                "rules_and_etiquette": [],
                "cardIds": []
            }
            self._households.append(target_hh)
        card_name = item.get("character", {}).get("name", "Companion")
        card_ids = target_hh.setdefault("cardIds", [])
        if card_name not in card_ids:
            card_ids.append(card_name)
        self._save_households()
        self.householdsChanged.emit()

    # -------------------------------------------------------------
    # Household & Court Binders
    # -------------------------------------------------------------
    @Slot()
    def fetchHouseholds(self):
        """Fetches households from CharGenUI (:3333) or loads local households.json."""
        def run():
            if self._is_chargen_online:
                try:
                    res = requests.get(f"{self._chargen_url}/api/households", timeout=4)
                    if res.status_code == 200:
                        data = res.json()
                        remote_hhs = data.get("households", [])
                        if remote_hhs:
                            # Merge remote households into local memory
                            existing_ids = {h.get("id") for h in self._households}
                            for rh in remote_hhs:
                                if rh.get("id") not in existing_ids:
                                    # Normalize member cardIds
                                    if "cardIds" not in rh and "members" in rh:
                                        rh["cardIds"] = [m.get("card_name") for m in rh.get("members", [])]
                                    self._households.append(rh)
                            self._save_households()
                            self.householdsChanged.emit()
                            return
                except Exception as e:
                    LOGGER.warning("Failed to fetch remote households: %s", e)
            self._households = self._load_households()
            self.householdsChanged.emit()
        threading.Thread(target=run, daemon=True).start()

    @Slot(str)
    def saveHouseholdJson(self, household_json: str):
        """Saves a household definition locally and attempts to sync to CharGenUI (:3333)."""
        try:
            hh = json.loads(household_json)
            if not isinstance(hh, dict) or not hh.get("name"):
                self.toast.emit("❌ Household must have a name.")
                return

            hh_id = hh.get("id") or ("hh_" + uuid.uuid4().hex[:8])
            hh["id"] = hh_id
            if "cardIds" not in hh and "members" in hh:
                hh["cardIds"] = [m.get("card_name") for m in hh.get("members", [])]

            existing_idx = next((i for i, h in enumerate(self._households) if h.get("id") == hh_id), -1)
            if existing_idx >= 0:
                self._households[existing_idx] = hh
            else:
                self._households.append(hh)

            self._save_households()
            self.householdsChanged.emit()
            self.toast.emit(f"👑 Household '{hh.get('name')}' saved!")

            # Try syncing with CharGenUI if online
            if self._is_chargen_online:
                def sync():
                    try:
                        requests.post(f"{self._chargen_url}/api/households", json=hh, timeout=5)
                    except Exception:
                        pass
                threading.Thread(target=sync, daemon=True).start()
        except Exception as e:
            LOGGER.error("Failed to save household: %s", e)
            self.toast.emit(f"❌ Error saving household: {e}")

    @Slot(str)
    def deleteHousehold(self, household_id: str):
        """Deletes a household locally and syncs deletion if backend is online."""
        initial_len = len(self._households)
        self._households = [h for h in self._households if h.get("id") != household_id]
        if len(self._households) < initial_len:
            self._save_households()
            self.householdsChanged.emit()
            self.toast.emit("🗑️ Household deleted.")

            if self._is_chargen_online:
                def del_sync():
                    try:
                        requests.delete(f"{self._chargen_url}/api/households/{household_id}", timeout=5)
                    except Exception:
                        pass
                threading.Thread(target=del_sync, daemon=True).start()

    @Slot(str, str, str)
    @Slot(str, str)
    def generateHouseholdEncounter(self, household_id: str, scenario_goal: str = "", participating_ids_json: str = "[]"):
        """
        Orchestrates a group encounter scene among companions in a household.
        Uses CharGenUI (:3333) endpoint if available, or falls back to local pipeline (:5001).
        """
        if self._is_generating:
            return

        target_hh = next((h for h in self._households if h.get("id") == household_id), None)
        if not target_hh:
            self.toast.emit("❌ Household not found.")
            return

        participating_names = []
        try:
            participating_names = json.loads(participating_ids_json)
        except Exception:
            pass
        if not participating_names:
            participating_names = target_hh.get("cardIds", [])

        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit(f"👑 Orchestrating Group Encounter for '{target_hh.get('name')}'...")

        def _worker():
            try:
                # 1. First try CharGenUI if backend is reachable
                if self._is_chargen_online:
                    try:
                        payload = {
                            "scenarioGoal": scenario_goal.strip() or None,
                            "saveToAlternateGreetings": False
                        }
                        res = requests.post(f"{self._chargen_url}/api/households/{household_id}/encounter", json=payload, timeout=60)
                        if res.status_code == 200:
                            data = res.json()
                            enc = data.get("encounter", {})
                            scenario = enc.get("scenario", "")
                            first_mes = enc.get("first_mes", "")
                            self.householdEncounterGenerated.emit(scenario, first_mes)
                            self.toast.emit("✨ Multi-character group encounter forged!")
                            return
                    except Exception as ex:
                        LOGGER.warning("CharGenUI encounter route failed, falling back to local llama: %s", ex)

                # 2. Local Llama-Server Pipeline synthesis
                participating_members = []
                for name in participating_names:
                    # Look up from Grimoire first
                    member_data = {"name": name, "role": "Companion", "standing": "Standard"}
                    for g in self._grimoire:
                        char = g.get("character", {})
                        if char.get("name") == name:
                            member_data["premise"] = char.get("premise", "")
                            member_data["central_contradiction"] = char.get("central_contradiction", "")
                            member_data["vocal_idiolect"] = char.get("vocal_idiolect", "")
                            break
                    participating_members.append(member_data)

                enc = self._pipeline.generate_household_encounter(
                    household_data=target_hh,
                    participating_members=participating_members,
                    scenario_goal=scenario_goal,
                    status_cb=lambda s: self.statusChanged.emit(s, True)
                )
                self.householdEncounterGenerated.emit(enc.get("scenario", ""), enc.get("first_mes", ""))
                self.toast.emit("✨ Multi-character group encounter forged!")
            except Exception as e:
                LOGGER.error("Group encounter failed: %s", e)
                self.toast.emit(f"❌ Encounter generation failed: {e}")
            finally:
                self._set_generating(False)
                self.generationFinished.emit(True, "")

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, int, str, str, str, str)
    @Slot(str, int, str, str, str)
    @Slot(str, int, str, str)
    @Slot(str, int)
    @Slot(str)
    def generateGroupChatCast(
        self,
        premise: str,
        cast_size: int = 3,
        genre: str = "Fantasy",
        intensity: str = "medium",
        correction_tier: str = "off",
        era: str = "off"
    ):
        """
        Forges multiple distinct individual character cards designed specifically
        for group chats (SillyTavern, etc.) and binds them together in a Household binder.
        """
        if self._is_generating:
            return

        cleaned_premise = premise.strip()
        if not cleaned_premise:
            self.toast.emit("❌ Please provide a premise or scenario for the group chat cast.")
            return

        cast_count = max(2, min(6, int(cast_size)))
        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit(f"👥 Forging coordinated cast of {cast_count} individual characters for group chats...")

        def _worker():
            try:
                cast_result = self._pipeline.generate_group_chat_cast(
                    theme_or_premise=cleaned_premise,
                    cast_size=cast_count,
                    genre=genre,
                    intensity=intensity,
                    correction_tier=correction_tier,
                    era=era,
                    status_cb=lambda s: self.statusChanged.emit(s, True)
                )

                group_name = cast_result.get("group_name") or f"Group Chat Ensemble ({genre})"
                group_lore = cast_result.get("group_premise") or cleaned_premise
                characters = cast_result.get("characters", [])

                if not characters:
                    raise RuntimeError("No characters were returned by the generator.")

                # Create or update household binder for this group
                hh_id = "hh_" + uuid.uuid4().hex[:8]
                hh = {
                    "id": hh_id,
                    "name": group_name,
                    "category_label": "Group Chat Ensemble",
                    "description": group_lore,
                    "user_title": "{{user}}",
                    "rules_and_etiquette": [],
                    "cardIds": [c.get("name", f"Member {idx+1}") for idx, c in enumerate(characters)]
                }
                self._households.append(hh)
                self._save_households()
                self.householdsChanged.emit()

                # Add each individual character to Grimoire
                added_ids = []
                for idx, c in enumerate(characters):
                    c["household"] = group_name
                    if "era" not in c and era and era != "off":
                        c["era"] = era
                    # Attach peer dynamics and group-only greeting if present
                    if "peer_dynamics" in c:
                        c["brainstorm_notes"] = f"Group Dynamic & Peers:\n{c.get('peer_dynamics')}\n\nAttitude to {{user}}:\n{c.get('attitude_to_user', 'Neutral')}"
                    item_id = self._add_to_grimoire_silent(c, source="group_chat_cast")
                    added_ids.append(item_id)
                    # Automatically enqueue into dispatch queue so user can 1-click push all of them to CharGenUI
                    if item_id and item_id not in self._dispatch_queue:
                        self._dispatch_queue.append(item_id)
                        item = self._find_grimoire_item(item_id)
                        if item:
                            item["queue_status"] = "queued"

                self._save_grimoire()
                self._save_queue()
                self.grimoireUpdated.emit()
                self.dispatchQueueUpdated.emit()

                # Load the first character into Studio view
                if characters:
                    first_char = characters[0]
                    self.ideaReceived.emit(json.dumps(first_char, ensure_ascii=False))

                self.generationFinished.emit(True, "")
                self.toast.emit(f"✨ Created {len(characters)} individual cards bound in '{group_name}' & queued for CharGenUI!")
            except Exception as e:
                LOGGER.error("Group chat cast generation failed: %s", e)
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"❌ Ensemble generation failed: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str)
    def deleteGrimoireItem(self, item_id: str):
        """Removes an entry from Grimoire and cleans it from the dispatch queue if present."""
        self._grimoire = [item for item in self._grimoire if item.get("id") != item_id]
        if item_id in self._dispatch_queue:
            self._dispatch_queue.remove(item_id)
        if self._active_queue_id == item_id:
            self._active_queue_id = None
        self._save_grimoire()
        self._save_queue()
        self.grimoireUpdated.emit()
        self.dispatchQueueUpdated.emit()
        self.toast.emit("🗑️ Concept removed from Grimoire.")

    @Slot(str)
    @Slot()
    def clearGrimoire(self, filter_mode: str = "all"):
        """Cleans Grimoire items based on filter ('discard', 'completed', or 'all')."""
        if filter_mode == "discard":
            self._grimoire = [item for item in self._grimoire if item.get("triage") != "discard"]
            self.toast.emit("🧹 Cleared discarded items from Grimoire.")
        elif filter_mode == "completed":
            self._grimoire = [item for item in self._grimoire if item.get("queue_status") != "completed"]
            self.toast.emit("🧹 Cleared completed items from Grimoire.")
        else:
            self._grimoire = []
            self._dispatch_queue = []
            self._active_queue_id = None
            self._save_queue()
            self.dispatchQueueUpdated.emit()
            self.toast.emit("🗑️ All Grimoire concepts cleared.")
        self._save_grimoire()
        self.grimoireUpdated.emit()

    @Slot(result=str)
    def getGrimoireJson(self) -> str:
        """Returns JSON array of all Grimoire entries."""
        return json.dumps(self._grimoire, ensure_ascii=False)

    @Slot(str)
    def loadGrimoireItemIntoStudio(self, item_id: str):
        """Loads a Grimoire entry directly into the main Studio Forge active view."""
        item = self._find_grimoire_item(item_id)
        if item and item.get("character"):
            self.ideaReceived.emit(json.dumps(item["character"], ensure_ascii=False))
            self.toast.emit(f"📥 Loaded '{item['character'].get('name', 'Concept')}' into Studio Forge!")

    @Slot(str)
    def loadGrimoireItemIntoNaturalLanguage(self, item_id: str):
        """Loads a Grimoire entry into the Natural Language tab."""
        item = self._find_grimoire_item(item_id)
        if item and item.get("character"):
            char_data = item["character"]
            origin = item.get("origin_prompt") or char_data.get("origin_prompt") or ""
            self.naturalIdeaReceived.emit(json.dumps(char_data, ensure_ascii=False))
            self.toast.emit(f"📥 Loaded '{char_data.get('name', 'Concept')}' into Natural Language Forge!")

    @Slot(str)
    def loadGrimoireItemIntoAgent(self, item_id: str):
        """Loads a Grimoire entry into AI Agent mode."""
        item = self._find_grimoire_item(item_id)
        if item and item.get("character"):
            char_data = item["character"]
            self.primeAgentWithCharacter(json.dumps(char_data, ensure_ascii=False))

    @Slot(str, float, str)
    @Slot(str, str)
    @Slot(str, float)
    @Slot(str)
    def generateConceptVariance(self, idea_json: str, *args):
        """Generates a fresh, nuanced variance of an existing concept via llama-server with optional guidance."""
        if self._is_generating:
            return

        temperature = 0.9
        guidance = ""
        for arg in args:
            if isinstance(arg, (int, float)):
                temperature = float(arg)
            elif isinstance(arg, str):
                guidance = arg

        self._set_generating(True)
        self.generationStarted.emit()
        status_msg = "✨ Synthesizing guided concept variance (:5001)..." if guidance else "✨ Synthesizing concept variance with AI (:5001)..."
        self.toast.emit(status_msg)

        def _worker():
            try:
                char_data = json.loads(idea_json) if idea_json else {}
                variant = self._pipeline.generate_concept_variance(char_data, temperature=temperature, guidance=guidance)
                if guidance:
                    variant["variance_guidance"] = guidance
                self._add_to_grimoire_silent(variant, source="concept_variance")
                variant_json = json.dumps(variant, ensure_ascii=False)
                self.naturalIdeaReceived.emit(variant_json)
                self.ideaReceived.emit(variant_json)
                self.generationFinished.emit(True, "")
                self.toast.emit(f"✨ Variance Created: {variant.get('name')} ({variant.get('title')})")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Variance error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    @Slot(str, str)
    def tweakConceptAspect(self, idea_json: str, instruction: str):
        """Applies a targeted surgical modification to an existing concept via llama-server."""
        if self._is_generating:
            return

        if not instruction or not instruction.strip():
            self.toast.emit("⚠️ Please specify what part of the idea to change.")
            return

        self._set_generating(True)
        self.generationStarted.emit()
        self.toast.emit(f"🔧 Applying targeted modification with AI (:5001)...")

        def _worker():
            try:
                char_data = json.loads(idea_json) if idea_json else {}
                updated = self._pipeline.tweak_character_aspect(char_data, instruction.strip())
                self._add_to_grimoire_silent(updated, source="concept_tweak")
                updated_json = json.dumps(updated, ensure_ascii=False)
                self.naturalIdeaReceived.emit(updated_json)
                self.ideaReceived.emit(updated_json)
                self.generationFinished.emit(True, "")
                self.toast.emit(f"✨ Concept Updated: {updated.get('name')}")
            except Exception as e:
                self.generationFinished.emit(False, str(e))
                self.toast.emit(f"⚠️ Tweak error: {e}")
            finally:
                self._set_generating(False)

        threading.Thread(target=_worker, daemon=True).start()

    # ==========================================
    # SEQUENTIAL CHARGENUI DISPATCH QUEUE SLOTS
    # ==========================================

    @Slot(str)
    def enqueueGrimoireItem(self, item_id: str):
        """Adds a Grimoire item to the sequential CharGenUI dispatch queue."""
        if item_id in self._dispatch_queue:
            self.toast.emit("Already in CharGenUI Dispatch Queue.")
            return
        item = self._find_grimoire_item(item_id)
        if not item:
            return
        self._dispatch_queue.append(item_id)
        item["queue_status"] = "queued"
        self._save_queue()
        self._save_grimoire()
        self.dispatchQueueUpdated.emit()
        self.grimoireUpdated.emit()
        name = item.get("character", {}).get("name", "Concept")
        self.toast.emit(f"📥 Added '{name}' to Dispatch Queue (#{len(self._dispatch_queue)})")

    @Slot(str)
    def dequeueGrimoireItem(self, item_id: str):
        """Removes a Grimoire item from the dispatch queue."""
        if item_id in self._dispatch_queue:
            self._dispatch_queue.remove(item_id)
        if self._active_queue_id == item_id:
            self._active_queue_id = None
        item = self._find_grimoire_item(item_id)
        if item:
            item["queue_status"] = "idle"
            self._save_grimoire()
            self.grimoireUpdated.emit()
        self._save_queue()
        self.dispatchQueueUpdated.emit()
        self.toast.emit("Removed from Dispatch Queue.")

    @Slot(int, int)
    def reorderQueue(self, from_idx: int, to_idx: int):
        """Reorders items in the dispatch queue."""
        if 0 <= from_idx < len(self._dispatch_queue) and 0 <= to_idx < len(self._dispatch_queue):
            item_id = self._dispatch_queue.pop(from_idx)
            self._dispatch_queue.insert(to_idx, item_id)
            self._save_queue()
            self.dispatchQueueUpdated.emit()

    @Slot(bool)
    @Slot()
    def sendActiveQueueItem(self, auto_generate: bool = False):
        """Dispatches the active (or next) queued Grimoire concept to CharGenUI (:3333)."""
        if not self._dispatch_queue:
            self.toast.emit("⚠️ Dispatch Queue is empty. Add concepts from the Grimoire first!")
            return
        if not self._active_queue_id or self._active_queue_id not in self._dispatch_queue:
            self._active_queue_id = self._dispatch_queue[0]

        item = self._find_grimoire_item(self._active_queue_id)
        if not item:
            return

        item["queue_status"] = "active"
        self._save_queue()
        self._save_grimoire()
        self.dispatchQueueUpdated.emit()
        self.grimoireUpdated.emit()

        char_data = item.get("character", {})
        self.pushToCharGenUI(json.dumps(char_data, ensure_ascii=False), auto_generate)
        name = char_data.get("name", "Concept")
        self.toast.emit(f"🚀 Dispatched '{name}' to CharGenUI (:3333)!")

    @Slot(bool, bool)
    @Slot(bool)
    @Slot()
    def completeActiveAndAdvance(self, auto_send_next: bool = True, auto_generate: bool = False):
        """Marks active card completed in CharGenUI and advances queue to next card."""
        if not self._active_queue_id and not self._dispatch_queue:
            self.toast.emit("⚠️ No active card in queue.")
            return

        current_id = self._active_queue_id or (self._dispatch_queue[0] if self._dispatch_queue else None)
        item = self._find_grimoire_item(current_id) if current_id else None
        completed_name = item.get("character", {}).get("name", "Card") if item else "Card"

        if item:
            item["queue_status"] = "completed"

        if current_id in self._dispatch_queue:
            self._dispatch_queue.remove(current_id)

        self._active_queue_id = None
        self._save_grimoire()
        self._save_queue()

        if self._dispatch_queue:
            next_id = self._dispatch_queue[0]
            next_item = self._find_grimoire_item(next_id)
            next_name = next_item.get("character", {}).get("name", "Next Card") if next_item else "Next Card"
            self._active_queue_id = next_id
            if next_item:
                next_item["queue_status"] = "active"
            self._save_queue()
            self._save_grimoire()
            self.dispatchQueueUpdated.emit()
            self.grimoireUpdated.emit()

            if auto_send_next and next_item:
                char_data = next_item.get("character", {})
                self.pushToCharGenUI(json.dumps(char_data, ensure_ascii=False), auto_generate)
                self.toast.emit(f"✅ Marked '{completed_name}' done! Dispatched next: '{next_name}' to CharGenUI.")
            else:
                self.toast.emit(f"✅ Marked '{completed_name}' done! '{next_name}' is ready to send.")
        else:
            self.dispatchQueueUpdated.emit()
            self.grimoireUpdated.emit()
            self.toast.emit(f"🏁 Finished '{completed_name}'! All queued concepts crafted in CharGenUI!")

    @Slot()
    def clearQueue(self):
        """Clears all pending items from the dispatch queue."""
        for qid in self._dispatch_queue:
            item = self._find_grimoire_item(qid)
            if item and item.get("queue_status") != "completed":
                item["queue_status"] = "idle"
        self._dispatch_queue = []
        self._active_queue_id = None
        self._save_queue()
        self._save_grimoire()
        self.dispatchQueueUpdated.emit()
        self.grimoireUpdated.emit()
        self.toast.emit("🧹 Dispatch Queue cleared.")

    @Slot(result=str)
    def getDispatchQueueJson(self) -> str:
        """Returns JSON object of active and queued items."""
        queue_items = []
        for qid in self._dispatch_queue:
            item = self._find_grimoire_item(qid)
            if item:
                queue_items.append(item)
        active_item = self._find_grimoire_item(self._active_queue_id) if self._active_queue_id else None
        return json.dumps({
            "queue": queue_items,
            "active_id": self._active_queue_id,
            "active_item": active_item
        }, ensure_ascii=False)


def main():
    os.environ["QT_QUICK_CONTROLS_STYLE"] = "Basic"
    log_path = configure_app_logging()
    LOGGER.info("Starting CharGen Idea Forge")
    app = QApplication(sys.argv)
    app.setApplicationName("CharGen Idea Forge")
    app.setOrganizationName("CharGen")

    # Hard-cap Qt Pixmap Cache & periodic memory trim
    try:
        from PySide6.QtGui import QPixmapCache
        QPixmapCache.setCacheLimit(32 * 1024)
    except Exception:
        pass

    backend = Backend()

    engine = QQmlApplicationEngine()
    engine.rootContext().setContextProperty("backend", backend)

    qml_file = Path(__file__).parent / "qml" / "Main.qml"
    engine.load(QUrl.fromLocalFile(str(qml_file.resolve())))

    if not engine.rootObjects():
        LOGGER.error("Failed to load QML root object")
        print(f"[Error] Failed to load QML root object. See {log_path}")
        sys.exit(-1)

    backend.checkConnection()
    backend.checkCharGenConnection()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
