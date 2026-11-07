#!/usr/bin/env python3
"""
ComfyClient Queue & Settings Store.

Manages data/image_prompt_queue.json and data/settings.json.
Provides thread-safe atomic operations with item identity anchored on `id`.
"""

import os
import json
import time
import copy
import random
import tempfile
import threading
from typing import Any, Dict, List, Optional

RUNTIME_KEYS = (
    "status",
    "error",
    "outputs",
    "gallery",
    "promptId",
    "seed",
    "completed",
    "repeatCount",
    "repeatTotal",
)

DEFAULT_SETTINGS = {
    "comfyUrl": "http://127.0.0.1:8188",
    "timeout": 0,  # 0 = wait forever
    "output_format": "png",  # "png" or "webp"
    "default_workflow": {},
    "default_checkpoint": "",
    "default_width": 832,
    "default_height": 1216,
    "default_aspect_ratio": "2:3",
    "lora_config": {
        "node_id": "45",
        "sample_json": '{\n  "lora_1": {\n    "on": true,\n    "lora": "{{lora}}",\n    "strength": 1.0\n  }\n}',
    },
    "defaults_by_purpose": {
        "avatar": {
            "width": 832,
            "height": 1216,
            "checkpoint": "",
            "aspect_ratio": "2:3",
        },
        "greeting": {
            "width": 1216,
            "height": 832,
            "checkpoint": "",
            "aspect_ratio": "16:9",
        },
        "greeting_bg": {
            "width": 1216,
            "height": 832,
            "checkpoint": "",
            "aspect_ratio": "16:9",
        },
        "scenario_avatar": {
            "width": 832,
            "height": 1216,
            "checkpoint": "",
            "aspect_ratio": "2:3",
        },
        "default": {
            "width": 832,
            "height": 1216,
            "checkpoint": "",
            "aspect_ratio": "2:3",
        },
    },
}


class PromptQueue:
    """Thread-safe JSON queue backed by data/image_prompt_queue.json."""

    DEFAULT_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "image_prompt_queue.json",
    )

    def __init__(self, path: Optional[str] = None):
        self.path = path or self.DEFAULT_PATH
        self._items: List[Dict[str, Any]] = []
        self._lock = threading.RLock()
        self._mtime: float = 0.0
        self._load()

    def _load(self):
        if os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                raw_items = data if isinstance(data, list) else []
                self._items = [self._normalize(it) for it in raw_items]
                self._mtime = os.path.getmtime(self.path)
            except Exception:
                self._items = []
        else:
            self._items = []

        # Interrupted jobs should be marked failed on fresh start
        for it in self._items:
            if it.get("status") in ("running", "pending"):
                it["status"] = "failed"
                it["error"] = "interrupted by restart"

    def _check_reload(self):
        """Live disk reload: checks if data/image_prompt_queue.json was updated on disk by CharGenUI.
        If file modification time is newer than self._mtime, reloads and merges with in-memory status."""
        if not os.path.exists(self.path):
            return
        try:
            current_mtime = os.path.getmtime(self.path)
        except OSError:
            return
        if current_mtime <= self._mtime:
            return

        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            raw_items = data if isinstance(data, list) else []
        except Exception:
            return

        runtime_by_id = {}
        for it in self._items:
            k = it.get("id") or it.get("name")
            if k:
                runtime_by_id[k] = it

        merged = []
        for raw in raw_items:
            k = raw.get("id") or raw.get("name")
            old = runtime_by_id.get(k) or {}
            merged.append(self._normalize(raw, old=old))

        self._items = merged
        self._mtime = current_mtime

    def save(self):
        folder = os.path.dirname(self.path) or "."
        os.makedirs(folder, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=folder, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(self._items, f, indent=2)
        os.replace(tmp, self.path)
        try:
            self._mtime = os.path.getmtime(self.path)
        except OSError:
            pass

    @staticmethod
    def _normalize(item: Dict[str, Any], old: Optional[Dict[str, Any]] = None, name: Optional[str] = None) -> Dict[str, Any]:
        old = old or {}
        item_id = item.get("id") or old.get("id") or f"ipq_{int(time.time()*1000)}_{random.randint(100, 999)}"
        char_name = item.get("characterName") or old.get("characterName") or ""
        purpose = item.get("imagePurpose") or old.get("imagePurpose") or "avatar"

        # Determine a human-readable display name
        item_name = name or item.get("name") or old.get("name")
        if not item_name or (char_name and item_name == char_name):
            purpose_label = (
                "Chat BG" if purpose == "greeting_bg" else (
                    "Greeting Scene" if purpose == "greeting" else (
                        "Scenario" if purpose == "scenario_avatar" else "Avatar"
                    )
                )
            )
            short_id = str(item_id).split("_")[-1][:5] if item_id else ""
            if char_name and short_id:
                item_name = f"{char_name} - {purpose_label} ({short_id})"
            elif char_name:
                item_name = f"{char_name} - {purpose_label}"
            else:
                item_name = item_id

        params = dict(old.get("params", {}))
        if isinstance(item.get("params"), dict):
            params.update(item["params"])

        # Bridge CharGenUI prompt fields into params
        pos_prompt = (
            item.get("positivePrompt")
            or item.get("prompt")
            or old.get("positivePrompt")
            or old.get("prompt")
        )
        if pos_prompt and "positive" not in params:
            params["positive"] = pos_prompt

        neg_prompt = item.get("negativePrompt") or old.get("negativePrompt")
        if neg_prompt is not None and "negative" not in params:
            params["negative"] = neg_prompt

        out: Dict[str, Any] = {
            "id": item_id,
            "name": item_name,
            "characterName": char_name or item_name,
            "characterId": item.get("characterId") or old.get("characterId") or "",
            "imagePurpose": purpose,
            "positivePrompt": params.get("positive", ""),
            "negativePrompt": params.get("negative", ""),
            "prompt": params.get("positive", ""),
            "workflow": item.get("workflow", old.get("workflow", {})),
            "lora": item.get("lora", old.get("lora", [])),
            "params": params,
            "targetModel": item.get("targetModel", old.get("targetModel", "flux")),
            "status": item.get("status", old.get("status", "queued")),
            "error": item.get("error", old.get("error", "")),
            "outputs": item.get("outputs", old.get("outputs", [])),
            "gallery": list(item.get("gallery") or old.get("gallery") or []),
            "promptId": item.get("promptId", old.get("promptId", None)),
            "seed": item.get("seed", old.get("seed", None)),
            "completed": bool(item.get("completed", old.get("completed", False))),
            "repeatCount": int(item.get("repeatCount") or old.get("repeatCount") or 0),
            "repeatTotal": int(item.get("repeatTotal") or old.get("repeatTotal") or 0),
        }

        for k in ("avatarDataUrl", "greetingDataUrl", "greetingBgDataUrl", "greetingIndex", "createdAt"):
            if k in item:
                out[k] = item[k]
            elif k in old:
                out[k] = old[k]

        for k in RUNTIME_KEYS:
            if k in item:
                out[k] = item[k]
            elif k in old:
                out[k] = old[k]

        return out

    # ── Reads ───────────────────────────────────────────────────────────

    def all(self) -> List[Dict[str, Any]]:
        with self._lock:
            self._check_reload()
            return [copy.deepcopy(it) for it in self._items]

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        with self._lock:
            self._check_reload()
            # 1. Exact match on id first (always unique)
            for it in self._items:
                if it.get("id") and it.get("id") == key:
                    return copy.deepcopy(it)
            # 2. Match on name
            for it in self._items:
                if it.get("name") == key:
                    return copy.deepcopy(it)
        return None

    def names(self) -> List[str]:
        with self._lock:
            self._check_reload()
            return [it.get("name", "") for it in self._items]

    def ids(self) -> List[str]:
        with self._lock:
            self._check_reload()
            return [it.get("id", "") for it in self._items]

    # ── Writes ──────────────────────────────────────────────────────────

    def mark_complete(self, key: str) -> bool:
        """Flag an item as ingested by CharGenUI and persist."""
        return self.set_runtime(key, completed=True)

    def set_runtime(self, key: str, **fields) -> bool:
        if not key:
            return False
        with self._lock:
            for it in self._items:
                if it.get("id") == key or it.get("name") == key:
                    it.update(fields)
                    self.save()
                    return True
            return False

    def clear_gallery(self, key: str) -> bool:
        """Clears all historical gallery images and outputs for an item."""
        with self._lock:
            for it in self._items:
                if it.get("id") == key or it.get("name") == key:
                    it["gallery"] = []
                    it["outputs"] = []
                    self.save()
                    return True
            return False

    def delete_gallery_image(self, key: str, filename: str) -> bool:
        """Deletes a specific image from an item's gallery by filename."""
        if not filename:
            return False
        with self._lock:
            for it in self._items:
                if it.get("id") == key or it.get("name") == key:
                    g = it.get("gallery", [])
                    it["gallery"] = [
                        img for img in g if isinstance(img, dict) and img.get("filename") != filename
                    ]
                    it["outputs"] = [
                        img
                        for img in it.get("outputs", [])
                        if isinstance(img, dict) and img.get("filename") != filename
                    ]
                    self.save()
                    return True
            return False

    def add(self, item: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            self._check_reload()
            new_item = self._normalize(item)
            self._items.append(new_item)
            self.save()
            return copy.deepcopy(new_item)

    def replace(self, item: Dict[str, Any], key: Optional[str] = None) -> Dict[str, Any]:
        """Replace an existing item matching key or item.id; append if new."""
        item_id = item.get("id")
        target_key = key or item_id or item.get("name")

        with self._lock:
            self._check_reload()
            target_idx = -1
            if item_id:
                for i, it in enumerate(self._items):
                    if it.get("id") == item_id:
                        target_idx = i
                        break
            if target_idx == -1 and target_key:
                for i, it in enumerate(self._items):
                    if it.get("id") == target_key or it.get("name") == target_key:
                        target_idx = i
                        break

            if target_idx != -1:
                old = self._items[target_idx]
                target_name = item.get("name") or old.get("name")
                self._items[target_idx] = self._normalize(item, old=old, name=target_name)
                self.save()
                return copy.deepcopy(self._items[target_idx])

            return self.add(item)

    def batch_update(
        self,
        item_keys: List[str],
        updates: Dict[str, Any],
        lora_action: str = "append",
    ) -> List[Dict[str, Any]]:
        """Batch update fields across multiple queue items.
        - item_keys: List of IDs or names to match. If empty or None, updates ALL items.
        - updates: Dictionary containing fields to update (e.g. lora, checkpoint, sampler, steps, cfg, width, height, positive_prefix, positive_suffix, negative_prefix, negative_suffix).
        - lora_action: 'append' (default: adds LoRA if not present), 'replace' (replaces whole LoRA list), 'remove' (removes matching LoRA).
        """
        keys_set = set(str(k) for k in item_keys) if item_keys else None
        updated_items: List[Dict[str, Any]] = []

        with self._lock:
            self._check_reload()
            for idx, it in enumerate(self._items):
                it_id = str(it.get("id") or "")
                it_name = str(it.get("name") or "")
                if keys_set is not None and it_id not in keys_set and it_name not in keys_set:
                    continue

                item_copy = copy.deepcopy(it)
                params = dict(item_copy.get("params") or {})

                # 1. Handle LoRA batch modification
                if "lora" in updates and updates["lora"] is not None:
                    raw_new_lora = updates["lora"]
                    if isinstance(raw_new_lora, str):
                        new_lora_list = [l.strip() for l in raw_new_lora.split(",") if l.strip()]
                    elif isinstance(raw_new_lora, list):
                        new_lora_list = [str(l).strip() for l in raw_new_lora if str(l).strip()]
                    else:
                        new_lora_list = []

                    existing_loras = item_copy.get("lora") or params.get("lora") or []
                    if isinstance(existing_loras, str):
                        existing_loras = [l.strip() for l in existing_loras.split(",") if l.strip()]
                    elif not isinstance(existing_loras, list):
                        existing_loras = []

                    if lora_action == "replace":
                        item_copy["lora"] = list(new_lora_list)
                        params["lora"] = list(new_lora_list)
                    elif lora_action == "remove":
                        # Strip weights for comparison: e.g. "my_lora" matches "my_lora:1.0"
                        def _base_name(s: str) -> str:
                            return s.split(":")[0].strip().lower().replace(".safetensors", "")
                        remove_bases = {_base_name(l) for l in new_lora_list}
                        filtered = [l for l in existing_loras if _base_name(l) not in remove_bases]
                        item_copy["lora"] = filtered
                        params["lora"] = filtered
                    else:
                        # append mode
                        merged = list(existing_loras)
                        def _base_name(s: str) -> str:
                            return s.split(":")[0].strip().lower().replace(".safetensors", "")
                        existing_bases = {_base_name(l) for l in existing_loras}
                        for nl in new_lora_list:
                            nb = _base_name(nl)
                            if nb not in existing_bases:
                                merged.append(nl)
                                existing_bases.add(nb)
                            else:
                                # Update weight of existing lora if specified
                                for mi, cur in enumerate(merged):
                                    if _base_name(cur) == nb:
                                        merged[mi] = nl
                                        break
                        item_copy["lora"] = merged
                        params["lora"] = merged

                # 2. Handle Checkpoint / Model
                if "checkpoint" in updates and updates["checkpoint"]:
                    params["checkpoint"] = updates["checkpoint"]

                # 3. Handle Sampler & Scheduler
                if "sampler" in updates and updates["sampler"]:
                    params["sampler"] = updates["sampler"]
                if "scheduler" in updates and updates["scheduler"]:
                    params["scheduler"] = updates["scheduler"]

                # 4. Handle Steps & CFG
                if "steps" in updates and updates["steps"] is not None:
                    try:
                        params["steps"] = int(updates["steps"])
                    except (ValueError, TypeError):
                        pass
                if "cfg" in updates and updates["cfg"] is not None:
                    try:
                        params["cfg"] = float(updates["cfg"])
                    except (ValueError, TypeError):
                        pass

                # 5. Handle Dimensions / Aspect Ratio
                if "width" in updates and updates["width"] is not None:
                    try:
                        params["width"] = int(updates["width"])
                    except (ValueError, TypeError):
                        pass
                if "height" in updates and updates["height"] is not None:
                    try:
                        params["height"] = int(updates["height"])
                    except (ValueError, TypeError):
                        pass
                if "aspect_ratio" in updates and updates["aspect_ratio"]:
                    params["aspect_ratio"] = updates["aspect_ratio"]

                # 6. Handle Positive Prompt additions / prepend / append
                if "positive_prefix" in updates and updates["positive_prefix"]:
                    cur_pos = str(params.get("positive") or "")
                    params["positive"] = f"{updates['positive_prefix'].strip()}, {cur_pos}".strip().strip(",")
                if "positive_suffix" in updates and updates["positive_suffix"]:
                    cur_pos = str(params.get("positive") or "")
                    params["positive"] = f"{cur_pos}, {updates['positive_suffix'].strip()}".strip().strip(",")

                # 7. Handle Negative Prompt additions
                if "negative_prefix" in updates and updates["negative_prefix"]:
                    cur_neg = str(params.get("negative") or "")
                    params["negative"] = f"{updates['negative_prefix'].strip()}, {cur_neg}".strip().strip(",")
                if "negative_suffix" in updates and updates["negative_suffix"]:
                    cur_neg = str(params.get("negative") or "")
                    params["negative"] = f"{cur_neg}, {updates['negative_suffix'].strip()}".strip().strip(",")

                # 8. Handle Status Reset (e.g. mark done -> pending to re-run)
                if "status" in updates and updates["status"]:
                    item_copy["status"] = updates["status"]
                    if updates["status"] == "pending":
                        item_copy["completed"] = False

                item_copy["params"] = params
                normalized = self._normalize(item_copy, old=it, name=it.get("name"))
                self._items[idx] = normalized
                updated_items.append(copy.deepcopy(normalized))

            if updated_items:
                self.save()
            return updated_items

    def remove(self, key: str) -> bool:
        """Remove EXACTLY ONE item matching key by id (preferred) or name. Prevents mass deletion."""
        if not key:
            return False
        with self._lock:
            self._check_reload()
            # 1. Exact match on id first
            for i, it in enumerate(self._items):
                if it.get("id") == key:
                    self._items.pop(i)
                    self.save()
                    return True
            # 2. Fallback match on name
            for i, it in enumerate(self._items):
                if it.get("name") == key:
                    self._items.pop(i)
                    self.save()
                    return True
            return False

    def clear(self, completed_only: bool = False) -> int:
        """Clear all or completed items from the queue and persist to disk."""
        with self._lock:
            self._check_reload()
            orig_len = len(self._items)
            if completed_only:
                self._items = [it for it in self._items if not it.get("completed")]
                removed = orig_len - len(self._items)
            else:
                removed = orig_len
                self._items = []
            self.save()
            return removed


class Settings:
    """Settings store backed by data/settings.json."""

    def __init__(self, queue_path: str):
        self.path = os.path.join(os.path.dirname(queue_path) or ".", "settings.json")
        self._lock = threading.RLock()
        self._data = copy.deepcopy(DEFAULT_SETTINGS)
        try:
            if os.path.exists(self.path):
                with open(self.path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    for k, v in saved.items():
                        if k == "default_workflow":
                            self._data[k] = copy.deepcopy(v)
                        elif isinstance(v, dict) and isinstance(self._data.get(k), dict):
                            self._merge(self._data[k], v)
                        else:
                            self._data[k] = v
        except Exception:
            pass

    @staticmethod
    def _merge(target: Dict[str, Any], source: Dict[str, Any]):
        for k, v in source.items():
            if isinstance(v, dict) and isinstance(target.get(k), dict):
                Settings._merge(target[k], v)
            else:
                target[k] = v

    def get(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._data)

    def update(self, values: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            for k, v in values.items():
                if k == "default_workflow":
                    # Workflow DAG graphs must be replaced wholesale, not merged
                    self._data[k] = copy.deepcopy(v)
                elif k in self._data:
                    if isinstance(v, dict) and isinstance(self._data.get(k), dict):
                        self._merge(self._data[k], v)
                    else:
                        self._data[k] = v
                elif k in DEFAULT_SETTINGS:
                    self._data[k] = v
            folder = os.path.dirname(self.path) or "."
            os.makedirs(folder, exist_ok=True)
            fd, tmp = tempfile.mkstemp(dir=folder, suffix=".tmp")
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2)
            os.replace(tmp, self.path)
            return copy.deepcopy(self._data)
