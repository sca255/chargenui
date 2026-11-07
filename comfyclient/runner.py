#!/usr/bin/env python3
"""
ComfyClient Job Runner.

Executes queue items against a ComfyUI instance via HTTP/WebSocket.
Supports {{placeholder}} templating, UNET model injection, ZodaPlus LoRA toggling,
and automatic image pushback into CharGenUI over IPC.
"""

import os
import re
import json
import time
import copy
import random
import base64
import urllib.request
import urllib.error
import urllib.parse
import threading
from collections import deque
from typing import Any, Dict, List, Optional, Tuple

from .config import PromptQueue, Settings
from .client import CharGenImageClient

PARAM_DEFAULTS = {
    "checkpoint": "",
    "positive": "",
    "negative": "",
    "seed": -1,
    "steps": 20,
    "cfg": 7.0,
    "sampler": "euler",
    "scheduler": "normal",
    "width": 512,
    "height": 512,
    "zoda_plus": True,
}

# Standard SD 1.5 txt2img workflow fallback
DEFAULT_WORKFLOW = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 7,
            "denoise": 1,
            "latent_image": ["5", 0],
            "model": ["4", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "sampler_name": "euler",
            "scheduler": "normal",
            "seed": 0,
            "steps": 20,
        },
    },
    "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "v1-5-pruned-emaonly.ckpt"}},
    "5": {"class_type": "EmptyLatentImage", "inputs": {"batch_size": 1, "height": 512, "width": 512}},
    "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": ""}},
    "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": ""}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
    "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "ComfyUI", "images": ["8", 0]}},
}


class Cancelled(Exception):
    pass


def _fill_placeholders(obj: Any, values: Dict[str, Any]) -> Any:
    """Recursively replaces {{key}} placeholders in workflow dictionaries/lists."""
    if isinstance(obj, str):
        s = obj.strip()
        # Direct exact match for number types
        for k in ("steps", "width", "height", "seed"):
            if s == f"{{{{{k}}}}}":
                return int(values.get(k, 0))
        if s == "{{cfg}}":
            return float(values.get("cfg", 7.0))
        if s in ("{{prompt}}", "{{positive}}"):
            return str(values.get("positive", ""))
        if s == "{{negative}}":
            return str(values.get("negative", ""))
        if s in ("{{checkpoint}}", "{{model}}"):
            return str(values.get("checkpoint", ""))
        if s == "{{sampler}}":
            return str(values.get("sampler", "euler"))
        if s == "{{scheduler}}":
            return str(values.get("scheduler", "normal"))

        # In-string substring replacements
        res = obj
        for k, v in values.items():
            res = res.replace(f"{{{{{k}}}}}", str(v))
        res = res.replace("{{prompt}}", str(values.get("positive", "")))
        res = res.replace("{{model}}", str(values.get("checkpoint", "")))
        return res
    elif isinstance(obj, dict):
        return {k: _fill_placeholders(v, values) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_fill_placeholders(v, values) for v in obj]
    return obj


def parse_lora_spec(spec: Any) -> List[Dict[str, Any]]:
    """Normalizes any LoRA spec into a list of dicts: [{'name': str, 'strength': float, 'strength_clip': float, 'on': bool}]."""
    if not spec:
        return []
    if isinstance(spec, str):
        parts = [p.strip() for p in spec.split(",") if p.strip()]
    elif isinstance(spec, (list, tuple)):
        parts = list(spec)
    elif isinstance(spec, dict):
        parts = [spec]
    else:
        return []

    parsed: List[Dict[str, Any]] = []
    for item in parts:
        if isinstance(item, dict):
            name = item.get("name") or item.get("lora") or item.get("lora_name") or ""
            if not name:
                continue
            st = float(item.get("strength") if item.get("strength") is not None else item.get("strength_model", 1.0))
            st_clip = float(item.get("strength_clip", st))
            on = bool(item.get("on", True))
            parsed.append({"name": str(name), "strength": st, "strength_clip": st_clip, "on": on})
        elif isinstance(item, str):
            s = item.strip()
            if not s:
                continue
            sub = s.split(":")
            name = sub[0].strip()
            st = 1.0
            st_clip = 1.0
            if len(sub) > 1:
                try:
                    st = float(sub[1].strip())
                    st_clip = st
                except ValueError:
                    pass
            if len(sub) > 2:
                try:
                    st_clip = float(sub[2].strip())
                except ValueError:
                    pass
            parsed.append({"name": name, "strength": st, "strength_clip": st_clip, "on": True})
    return parsed


def _norm_lora(name: str) -> str:
    s = str(name).strip().lower()
    for ext in (".safetensors", ".pt", ".bin", ".ckpt"):
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    return s


def parse_sample_json(sample_json_str: str) -> Tuple[str, Any, Any]:
    """Analyzes a sample LoRA JSON string to determine structure and enumeration pattern."""
    if not sample_json_str or not sample_json_str.strip():
        return "nested_slot", "lora_{i}", {"on": True, "lora": "{{lora}}", "strength": 1.0}
    try:
        data = json.loads(sample_json_str.strip())
    except Exception:
        return "nested_slot", "lora_{i}", {"on": True, "lora": "{{lora}}", "strength": 1.0}

    if not isinstance(data, dict):
        return "nested_slot", "lora_{i}", {"on": True, "lora": "{{lora}}", "strength": 1.0}

    top_keys = list(data.keys())
    if len(top_keys) == 1 and isinstance(data[top_keys[0]], dict):
        raw_key = top_keys[0]
        key_pattern = re.sub(r"\d+", "{i}", raw_key)
        if "{i}" not in key_pattern:
            key_pattern += "_{i}"
        return "nested_slot", key_pattern, data[raw_key]
    elif any(isinstance(v, dict) for v in data.values()):
        first_k = top_keys[0]
        key_pattern = re.sub(r"\d+", "{i}", first_k)
        if "{i}" not in key_pattern:
            key_pattern += "_{i}"
        return "nested_slot", key_pattern, data[first_k]
    elif any(re.search(r"\d+", k) for k in data.keys()):
        patterns = {re.sub(r"\d+", "{i}", k): k for k in data.keys()}
        return "flat_numbered", patterns, data
    elif any(k in data for k in ("lora", "on", "strength")):
        return "nested_slot", "lora_{i}", data
    else:
        return "flat_single", None, data


def render_sample_slot(template: Dict[str, Any], lora: Dict[str, Any], idx: int) -> Dict[str, Any]:
    rendered = copy.deepcopy(template)
    for k, v in list(rendered.items()):
        if k in ("lora", "lora_name"):
            name = lora["name"]
            rendered[k] = name if name.endswith(".safetensors") else f"{name}.safetensors"
        elif k in ("strength", "strength_model", "lora_wt"):
            rendered[k] = lora["strength"]
        elif k in ("strengthTwo", "strength_clip", "clip_str"):
            rendered[k] = lora.get("strength_clip", lora["strength"])
        elif k == "on":
            rendered[k] = lora.get("on", True)
        elif isinstance(v, str):
            val = v.replace("{{lora}}", lora["name"])
            val = val.replace("{{strength}}", str(lora["strength"]))
            val = val.replace("{{strength_clip}}", str(lora.get("strength_clip", lora["strength"])))
            val = val.replace("{{i}}", str(idx))
            rendered[k] = val
    return rendered


def inject_loras(
    workflow: Dict[str, Any],
    loras: List[Dict[str, Any]],
    settings: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Injects LoRAs into the workflow based on configured or auto-detected strategy."""
    if not workflow or not isinstance(workflow, dict):
        return workflow

    settings = settings or {}
    params = params or {}
    lora_cfg = settings.get("lora_config") or settings.get("lora_loader") or {}
    target_node_id = str(lora_cfg.get("node_id") or "").strip()
    sample_json = lora_cfg.get("sample_json") or ""

    # Locate target node
    target_node = None
    if target_node_id and target_node_id in workflow:
        target_node = workflow[target_node_id]
    else:
        # Auto-detect target node if not specified
        for nid, node in workflow.items():
            if not isinstance(node, dict):
                continue
            ctype = node.get("class_type", "")
            title = node.get("_meta", {}).get("title", "") if isinstance(node.get("_meta"), dict) else ""
            inp = node.get("inputs", {})
            if (
                ctype in ("Power Lora Loader (rgthree)", "PowerLoraLoader")
                or "Power Lora Loader" in title
                or (isinstance(inp, dict) and ("PowerLoraLoaderHeaderWidget" in inp or "lora_1" in inp))
            ):
                target_node = node
                break
            elif ctype in ("LoraLoader", "LoraLoaderModelOnly") or (isinstance(inp, dict) and "lora_name" in inp):
                target_node = node
                break
            elif "Stack" in ctype or "Stack" in title:
                target_node = node
                break

    if not target_node:
        return workflow

    inp = target_node.setdefault("inputs", {})

    # ZodaPlus toggle handling if present on rgthree node
    if "zoda_plus" in params:
        for k, v in list(inp.items()):
            if isinstance(v, dict) and "zoda" in str(v.get("lora", "")).lower():
                v["on"] = bool(params["zoda_plus"])
        zoda_slot = lora_cfg.get("zoda_slot", "lora_2")
        if zoda_slot in inp and isinstance(inp[zoda_slot], dict) and "zoda" in str(inp[zoda_slot].get("lora", "")).lower():
            inp[zoda_slot]["on"] = bool(params["zoda_plus"])

    if not loras:
        return workflow

    # Parse sample JSON schema and enumerate
    kind, pattern, template = parse_sample_json(sample_json)

    if kind == "nested_slot":
        key_pattern = pattern or "lora_{i}"
        existing_slots = {}
        prefix = key_pattern.split("{i}")[0]
        suffix = key_pattern.split("{i}")[1] if "{i}" in key_pattern else ""

        for k, v in list(inp.items()):
            if isinstance(v, dict) and k.startswith(prefix):
                try:
                    num_str = k[len(prefix) : len(k) - len(suffix)] if suffix else k[len(prefix) :]
                    existing_slots[int(num_str)] = (k, v)
                except ValueError:
                    pass

        for lora in loras:
            norm_n = _norm_lora(lora["name"])
            matched = False
            for idx, (slot_k, slot_v) in existing_slots.items():
                if _norm_lora(slot_v.get("lora", "") or slot_v.get("lora_name", "")) == norm_n:
                    slot_v["on"] = lora.get("on", True)
                    for str_k in ("strength", "strength_model", "lora_wt"):
                        if str_k in slot_v:
                            slot_v[str_k] = lora["strength"]
                    if "strengthTwo" in slot_v:
                        slot_v["strengthTwo"] = lora.get("strength_clip", lora["strength"])
                    matched = True
                    break

            if not matched:
                next_idx = max(existing_slots.keys()) + 1 if existing_slots else 1
                new_slot = render_sample_slot(template, lora, next_idx)
                slot_k = key_pattern.replace("{i}", str(next_idx))
                inp[slot_k] = new_slot
                existing_slots[next_idx] = (slot_k, new_slot)

    elif kind == "flat_numbered":
        for idx, lora in enumerate(loras, start=1):
            name = lora["name"]
            full_name = name if name.endswith(".safetensors") else f"{name}.safetensors"
            for pat_k, orig_v in pattern.items():
                rendered_k = pat_k.replace("{i}", str(idx))
                if "name" in pat_k or "lora" in pat_k:
                    inp[rendered_k] = full_name
                elif "wt" in pat_k or "strength" in pat_k or "model" in pat_k:
                    inp[rendered_k] = lora["strength"]
                elif "clip" in pat_k:
                    inp[rendered_k] = lora.get("strength_clip", lora["strength"])

    elif kind == "flat_single":
        if loras:
            first = loras[0]
            name = first["name"]
            full_name = name if name.endswith(".safetensors") else f"{name}.safetensors"
            for k in template.keys():
                if "name" in k or "lora" in k:
                    inp[k] = full_name
                elif "clip" in k:
                    inp[k] = first.get("strength_clip", first["strength"])
                elif "model" in k or "strength" in k:
                    inp[k] = first["strength"]

    return workflow


def apply_params(
    workflow: Dict[str, Any], params: Dict[str, Any], settings: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], int]:
    """Patches workflow with params and LoRAs. Returns (patched_workflow, seed_used)."""
    p = {k: v for k, v in (params or {}).items() if v not in (None, "")}

    # Prepare values
    v = dict(PARAM_DEFAULTS)
    v.update(p)
    v["seed"] = int(v["seed"])
    if v["seed"] < 0:
        v["seed"] = random.randint(0, 2**32 - 1)
    v["steps"] = int(v["steps"])
    v["width"] = int(v["width"])
    v["height"] = int(v["height"])
    v["cfg"] = float(v["cfg"])

    loras = parse_lora_spec(p.get("lora"))

    wf_json = json.dumps(workflow) if workflow else ""
    if "{{" in wf_json and "}}" in wf_json:
        # Template placeholder mode
        patched = _fill_placeholders(workflow, v)

        # Inject LoRAs into loader node (rgthree / standard / stack)
        patched = inject_loras(patched, loras, settings=settings, params=p)

        # Inject checkpoint / UNET model into node 44:48 or any UNETLoader node
        if "checkpoint" in p and p["checkpoint"]:
            if "44:48" in patched and isinstance(patched["44:48"], dict):
                patched["44:48"].setdefault("inputs", {})["unet_name"] = p["checkpoint"]
            for node_id, node in patched.items():
                if isinstance(node, dict):
                    ctype = node.get("class_type", "")
                    if ctype in ("UNETLoader", "UnetLoaderGGUF"):
                        node.setdefault("inputs", {})["unet_name"] = p["checkpoint"]
                    elif ctype in ("CheckpointLoaderSimple", "CheckpointLoader", "ImageOnlyCheckpointLoader"):
                        node.setdefault("inputs", {})["ckpt_name"] = p["checkpoint"]

        return patched, v["seed"]

    # Graph node matching mode
    wf = copy.deepcopy(workflow) if workflow else copy.deepcopy(DEFAULT_WORKFLOW)

    def find_nodes(*types):
        return [n for n in wf.values() if isinstance(n, dict) and n.get("class_type") in types]

    # KSampler nodes
    for ks_node in find_nodes("KSampler", "KSamplerAdvanced"):
        ks = ks_node.setdefault("inputs", {})
        seed_key = "noise_seed" if "noise_seed" in ks else "seed"
        ks[seed_key] = v["seed"]
        ks["steps"] = v["steps"]
        ks["cfg"] = v["cfg"]
        if "sampler" in p:
            ks["sampler_name"] = p["sampler"]
        if "scheduler" in p:
            ks["scheduler"] = p["scheduler"]

        # Text prompt references connected to KSampler
        for key, text_key in (("positive", "positive"), ("negative", "negative")):
            if key in p:
                ref = ks.get(text_key)
                if isinstance(ref, list) and str(ref[0]) in wf:
                    target_node = wf[str(ref[0])]
                    if target_node.get("class_type", "").startswith("CLIPTextEncode"):
                        target_node.setdefault("inputs", {})["text"] = p[key]

    # Model Loaders
    if "checkpoint" in p:
        for n in find_nodes("CheckpointLoaderSimple", "CheckpointLoader", "ImageOnlyCheckpointLoader"):
            n.setdefault("inputs", {})["ckpt_name"] = p["checkpoint"]
        for n in find_nodes("UNETLoader", "UnetLoaderGGUF"):
            n.setdefault("inputs", {})["unet_name"] = p["checkpoint"]

    # Latent dimensions
    for n in find_nodes("EmptyLatentImage", "EmptySD3LatentImage"):
        inp = n.setdefault("inputs", {})
        if "width" in p:
            inp["width"] = v["width"]
        if "height" in p:
            inp["height"] = v["height"]

    # Inject LoRAs into loader node (rgthree / standard / stack)
    wf = inject_loras(wf, loras, settings=settings, params=p)

    if "checkpoint" in p and "44:48" in wf and p["checkpoint"] and isinstance(wf["44:48"], dict):
        wf["44:48"].setdefault("inputs", {})["unet_name"] = p["checkpoint"]

    return wf, v["seed"]


def http_json(url: str, data: Optional[dict] = None, timeout: float = 30) -> Dict[str, Any]:
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            err_data = json.loads(raw)
            msg = err_data.get("error", {}).get("message") or err_data.get("message") or raw
        except Exception:
            msg = raw
        raise RuntimeError(f"HTTP {exc.code}: {msg}")


def fetch_models(comfy_url: str) -> Dict[str, Any]:
    """Queries ComfyUI for installed UNETs, checkpoints, samplers, schedulers, and LoRAs."""
    res = {
        "unets": [],
        "standard_checkpoints": [],
        "checkpoints": [],
        "loras": [],
        "samplers": [],
        "schedulers": [],
        "error": None,
    }
    base = comfy_url.rstrip("/")

    # Query UNET loaders
    unets = []
    for endpoint in ("/object_info/UNETLoader", "/object_info/UnetLoaderGGUF"):
        try:
            info = http_json(f"{base}{endpoint}", timeout=5)
            node_key = endpoint.split("/")[-1]
            inputs = info.get(node_key, {}).get("input", {}).get("required", {})
            if "unet_name" in inputs and isinstance(inputs["unet_name"], list) and inputs["unet_name"]:
                for m in inputs["unet_name"][0]:
                    if m not in unets:
                        unets.append(m)
        except Exception:
            pass

    # Query standard CheckpointLoaderSimple
    ckpts = []
    try:
        info = http_json(f"{base}/object_info/CheckpointLoaderSimple", timeout=5)
        inputs = info.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {})
        if "ckpt_name" in inputs and isinstance(inputs["ckpt_name"], list) and inputs["ckpt_name"]:
            for m in inputs["ckpt_name"][0]:
                if m not in ckpts:
                    ckpts.append(m)
    except Exception:
        pass

    unets.sort()
    ckpts.sort()
    res["unets"] = unets
    res["standard_checkpoints"] = ckpts

    # Filter: Show UNETs if available; safely fallback to standard checkpoints if no UNETs found
    if unets:
        res["checkpoints"] = unets
    else:
        res["checkpoints"] = ckpts

    # Query installed LoRAs
    loras = []
    for endpoint in (
        "/object_info/LoraLoader",
        "/object_info/LoraLoaderModelOnly",
        "/object_info/Power Lora Loader (rgthree)",
    ):
        try:
            info = http_json(f"{base}{endpoint}", timeout=5)
            node_key = endpoint.split("/")[-1]
            inputs = info.get(node_key, {}).get("input", {}).get("required", {})
            if "lora_name" in inputs and isinstance(inputs["lora_name"], list) and inputs["lora_name"]:
                for l in inputs["lora_name"][0]:
                    if l not in loras:
                        loras.append(l)
        except Exception:
            pass
    loras.sort()
    res["loras"] = loras

    # Samplers & Schedulers
    try:
        ks_info = http_json(f"{base}/object_info/KSampler", timeout=5).get("KSampler", {})
        req = ks_info.get("input", {}).get("required", {})
        if "sampler_name" in req and isinstance(req["sampler_name"], list):
            res["samplers"] = req["sampler_name"][0]
        if "scheduler" in req and isinstance(req["scheduler"], list):
            res["schedulers"] = req["scheduler"][0]
    except Exception as e:
        res["error"] = str(e)

    return res


class JobRunner:
    """Background queue worker executing generation jobs on ComfyUI."""

    def __init__(self, queue: PromptQueue, settings: Settings):
        self.queue = queue
        self.settings = settings
        self.on_change: Optional[Any] = None
        self._pending: deque = deque()
        self._current: Optional[str] = None
        self._cancel = threading.Event()
        self._cv = threading.Condition()
        self._thread: Optional[threading.Thread] = None

    def notify_change(self):
        if self.on_change:
            try:
                self.on_change()
            except Exception:
                pass

    def enqueue(self, key: str, count: int = 1) -> bool:
        """Enqueues a prompt item by id or name, optionally specifying a repeat count."""
        with self._cv:
            item = self.queue.get(key)
            if not item:
                return False
            item_id = item.get("id") or item.get("name")
            pending_ids = [k[0] if isinstance(k, tuple) else k for k in self._pending]
            if item_id == self._current or item_id in pending_ids:
                return False
            self.queue.set_runtime(item_id, status="pending", error="", repeatTotal=count, repeatCount=0)
            self._pending.append((item_id, max(1, count)))
            self._ensure_thread()
            self._cv.notify()
            self.notify_change()
            return True

    def cancel(self, key: str) -> bool:
        """Cancels a pending or currently running job."""
        with self._cv:
            item = self.queue.get(key)
            item_id = (item.get("id") or item.get("name")) if item else key
            pending_ids = [k[0] if isinstance(k, tuple) else k for k in self._pending]
            if item_id in pending_ids:
                self._pending = deque([k for k in self._pending if (k[0] if isinstance(k, tuple) else k) != item_id])
                self.queue.set_runtime(item_id, status="cancelled", repeatCount=0, repeatTotal=0)
                self.notify_change()
                return True
            if item_id == self._current:
                self._cancel.set()
                try:
                    http_json(self._base() + "/interrupt", data={}, timeout=5)
                except Exception:
                    pass
                self.notify_change()
                return True
        return False

    def cancel_all(self) -> int:
        with self._cv:
            keys = [k[0] if isinstance(k, tuple) else k for k in self._pending] + ([self._current] if self._current else [])
        return sum(1 for k in keys if self.cancel(k))

    def state(self) -> Dict[str, Any]:
        with self._cv:
            return {
                "current": self._current,
                "pending": [k[0] if isinstance(k, tuple) else k for k in self._pending],
            }

    def _base(self) -> str:
        return self.settings.get()["comfyUrl"].rstrip("/")

    def _ensure_thread(self):
        if not self._thread or not self._thread.is_alive():
            self._thread = threading.Thread(target=self._loop, daemon=True, name="ComfyClientRunner")
            self._thread.start()

    def _loop(self):
        while True:
            with self._cv:
                while not self._pending:
                    self._cv.wait()
                entry = self._pending.popleft()
                if isinstance(entry, tuple):
                    key, count = entry
                else:
                    key, count = entry, 1
                self._current = key
                self._cancel.clear()
            try:
                self._run(key, count=count)
            finally:
                with self._cv:
                    self._current = None

    def _run(self, key: str, count: int = 1):
        item = self.queue.get(key)
        if not item:
            return
        item_id = item.get("id") or item.get("name")

        gallery = list(item.get("gallery") or [])
        known_filenames = {g.get("filename") for g in gallery if isinstance(g, dict)}
        latest_outputs = list(item.get("outputs") or [])

        for run_idx in range(count):
            if self._cancel.is_set():
                self.queue.set_runtime(item_id, status="cancelled", repeatCount=0, repeatTotal=0)
                self.notify_change()
                return

            self.queue.set_runtime(
                item_id,
                status="running",
                error="",
                repeatCount=run_idx + 1,
                repeatTotal=count,
            )
            self.notify_change()

            try:
                wf_template = item.get("workflow") or {}
                if not wf_template or not isinstance(wf_template, dict) or len(wf_template) == 0:
                    wf_template = self.settings.get().get("default_workflow") or {}

                s_data = self.settings.get()
                purpose = item.get("imagePurpose") or "default"
                defs_by_purpose = s_data.get("defaults_by_purpose", {})
                p_defs = defs_by_purpose.get(purpose) or defs_by_purpose.get("default") or {}

                raw_params = dict(item.get("params", {}))
                if "lora" not in raw_params and item.get("lora"):
                    raw_params["lora"] = item.get("lora")
                if not raw_params.get("width") or int(raw_params.get("width", 0)) <= 0:
                    raw_params["width"] = p_defs.get("width") or s_data.get("default_width") or 832
                if not raw_params.get("height") or int(raw_params.get("height", 0)) <= 0:
                    raw_params["height"] = p_defs.get("height") or s_data.get("default_height") or 1216
                if not raw_params.get("checkpoint"):
                    raw_params["checkpoint"] = p_defs.get("checkpoint") or s_data.get("default_checkpoint") or ""

                # When running multi-runs, use a new random seed for subsequent iterations
                if run_idx > 0:
                    raw_params["seed"] = random.randint(0, 2**32 - 1)

                patched_wf, seed = apply_params(wf_template, raw_params, settings=s_data)
                base = self._base()
                res = http_json(f"{base}/prompt", data={"prompt": patched_wf}, timeout=30)
                pid = res.get("prompt_id")
                if not pid:
                    raise RuntimeError("ComfyUI did not return a prompt_id")

                self.queue.set_runtime(item_id, promptId=pid, seed=seed)
                self.notify_change()
                timeout = float(self.settings.get().get("timeout") or 0)
                deadline = time.time() + timeout if timeout > 0 else None

                # Poll for completion
                run_finished = False
                while not run_finished:
                    if self._cancel.is_set():
                        raise Cancelled()
                    hist = http_json(f"{base}/history/{pid}", timeout=10)
                    entry = hist.get(pid)
                    if entry:
                        status = entry.get("status", {})
                        if status.get("status_str") == "error":
                            raise RuntimeError(self._error_from(status))
                        outputs = self._collect(entry)
                        if outputs or status.get("completed"):
                            if not outputs:
                                raise RuntimeError("Workflow finished but produced no images")
                            latest_outputs = outputs
                            for out in outputs:
                                fn = out.get("filename")
                                if fn and fn not in known_filenames:
                                    gallery.append({
                                        "filename": fn,
                                        "subfolder": out.get("subfolder", ""),
                                        "type": out.get("type", "output"),
                                        "seed": seed,
                                        "timestamp": int(time.time()),
                                        "promptId": pid,
                                    })
                                    known_filenames.add(fn)

                            is_last = (run_idx == count - 1)
                            self.queue.set_runtime(
                                item_id,
                                status="done" if is_last else "running",
                                outputs=latest_outputs,
                                gallery=gallery,
                                seed=seed,
                                error="",
                                repeatCount=run_idx + 1 if not is_last else 0,
                                repeatTotal=count if not is_last else 0,
                            )
                            self.notify_change()

                            # Auto-push generated image back to CharGenUI over IPC
                            self._push_to_chargenui(item, outputs, base)
                            run_finished = True
                            break

                    if deadline and time.time() > deadline:
                        raise TimeoutError(f"Timed out after {timeout}s waiting for ComfyUI")
                    self._cancel.wait(1.0)

            except Cancelled:
                self.queue.set_runtime(item_id, status="cancelled", repeatCount=0, repeatTotal=0)
                self.notify_change()
                return
            except Exception as exc:
                if self._cancel.is_set():
                    self.queue.set_runtime(item_id, status="cancelled", repeatCount=0, repeatTotal=0)
                else:
                    self.queue.set_runtime(item_id, status="failed", error=str(exc), repeatCount=0, repeatTotal=0)
                self.notify_change()
                return

        self.queue.set_runtime(
            item_id,
            status="done",
            outputs=latest_outputs,
            gallery=gallery,
            repeatCount=0,
            repeatTotal=0,
        )
        self.notify_change()

    def _push_to_chargenui(self, item: Dict[str, Any], outputs: List[Dict[str, str]], base: str):
        """Attempts to send completed image back to CharGenUI via IPC socket."""
        if not outputs:
            return
        try:
            im_meta = outputs[0]
            v_url = (
                f"{base}/view?filename={urllib.parse.quote(im_meta['filename'])}"
                f"&subfolder={urllib.parse.quote(im_meta.get('subfolder', ''))}"
                f"&type={urllib.parse.quote(im_meta.get('type', 'output'))}"
            )
            with urllib.request.urlopen(v_url, timeout=15) as r:
                im_bytes = r.read()

            output_format = self.settings.get().get("output_format", "png").lower()
            purpose = item.get("imagePurpose", "avatar")
            mime_type = "image/png"

            # Avatars need PNG if they are exported as Tavern character cards with embedded metadata,
            # but greetings, backgrounds, and scenes can optionally be converted to WebP.
            if output_format == "webp" and purpose != "avatar":
                try:
                    import io
                    from PIL import Image
                    im = Image.open(io.BytesIO(im_bytes))
                    webp_buf = io.BytesIO()
                    im.save(webp_buf, format="WEBP", quality=92, method=6)
                    im_bytes = webp_buf.getvalue()
                    mime_type = "image/webp"
                except Exception:
                    mime_type = "image/png"

            b64_str = base64.b64encode(im_bytes).decode("ascii")
            data_url = f"data:{mime_type};base64,{b64_str}"

            sender = CharGenImageClient()
            prompt_key = item.get("id") or item.get("name")
            reply = sender.send_image(
                prompt_name=prompt_key,
                image_b64=data_url,
                image_type=purpose,
                greeting_index=item.get("greetingIndex"),
            )
            if reply:
                self.queue.mark_complete(prompt_key)
        except Exception as e:
            # Non-fatal if CharGenUI IPC is currently offline
            pass

    @staticmethod
    def _collect(entry: Dict[str, Any]) -> List[Dict[str, str]]:
        imgs = []
        for node_out in (entry.get("outputs") or {}).values():
            for im in node_out.get("images", []):
                imgs.append({
                    "filename": im.get("filename", ""),
                    "subfolder": im.get("subfolder", ""),
                    "type": im.get("type", "output"),
                })
        return imgs

    @staticmethod
    def _error_from(status: Dict[str, Any]) -> str:
        for ev in status.get("messages", []):
            if ev and ev[0] == "execution_error":
                d = ev[1]
                return f"{d.get('node_type', 'node')}: {d.get('exception_message', 'execution error')}".strip()
        return "ComfyUI reported an execution error"
