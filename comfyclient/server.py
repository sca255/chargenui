#!/usr/bin/env python3
"""
ComfyClient Server — Unix Domain Socket host for prompt queue + JSON-RPC IPC.
"""

import os
import sys
import json
import time
import socket
import threading
import argparse
from typing import Any, Callable, Dict, List, Optional

from .config import PromptQueue, Settings
from .runner import JobRunner, fetch_models, apply_params
from .sdcpp_util import build_sdcpp_payload
from .protocol import (
    BUILTIN_METHODS,
    ComfyClientError,
    METHOD_NOT_FOUND,
    INVALID_PARAMS,
    INTERNAL_ERROR,
)


class ComfyClientServer:
    """Accepts connections and routes JSON-RPC 2.0 requests to handlers."""

    def __init__(self, socket_path: str, queue: Optional[PromptQueue] = None, config_path: Optional[str] = None):
        self.socket_path = socket_path
        self.queue = queue or PromptQueue(config_path)
        self.settings = Settings(self.queue.path)
        self.runner = JobRunner(self.queue, self.settings)
        self.on_change: Optional[Callable[[], None]] = None
        self.runner.on_change = self.notify_change
        self._server: Optional[socket.socket] = None
        self._listener: Optional[threading.Thread] = None
        self._running = False
        self._handlers: Dict[str, Callable[[Dict], Any]] = {}

    def notify_change(self):
        if self.on_change:
            try:
                self.on_change()
            except Exception:
                pass

    def register(self, method: str, fn: Callable[[Dict], Any]):
        self._handlers[method] = fn

    def start(self):
        self._running = True
        self._server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        if os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except OSError:
                pass
        self._server.bind(self.socket_path)
        os.chmod(self.socket_path, 0o777)
        self._server.listen(16)
        self._listener = threading.Thread(target=self._accept_loop, daemon=True, name="ComfyClientAcceptLoop")
        self._listener.start()

    def stop(self):
        self._running = False
        if self._server:
            try:
                self._server.close()
            except Exception:
                pass
        if self._listener:
            self._listener.join(timeout=2)
        if os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except OSError:
                pass

    def _accept_loop(self):
        while self._running:
            try:
                client, _ = self._server.accept()
            except OSError:
                break
            threading.Thread(target=self._handle_client, args=(client,), daemon=True).start()

    def _handle_client(self, client: socket.socket):
        buf = b""
        while self._running:
            try:
                chunk = client.recv(8192)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    self._dispatch(client, line)
            except Exception:
                break
        try:
            client.close()
        except Exception:
            pass

    def _dispatch(self, client: socket.socket, raw: bytes):
        try:
            msg = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send(client, {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}})
            return

        if not isinstance(msg, dict):
            self._send(client, {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}})
            return

        req_id = msg.get("id")
        method = msg.get("method", "")
        params = msg.get("params", {}) or {}

        # Support {action, payload} framing
        if not method and msg.get("action"):
            method = msg["action"]
            params = msg.get("payload", {}) or {}

        try:
            result = self._route(method, params)
            self._send(client, {"jsonrpc": "2.0", "id": req_id, "result": result})
        except ComfyClientError as exc:
            self._send(client, {"jsonrpc": "2.0", "id": req_id, "error": {"code": exc.code, "message": str(exc)}})
        except Exception as exc:
            self._send(client, {"jsonrpc": "2.0", "id": req_id, "error": {"code": INTERNAL_ERROR, "message": str(exc)}})

    def _send(self, client: socket.socket, obj: dict):
        try:
            client.sendall((json.dumps(obj, default=str) + "\n").encode("utf-8"))
        except Exception:
            pass

    def _route(self, method: str, params: Dict) -> Any:
        clean_method = method.replace(":", "_")
        attr = f"method_{clean_method}"
        if hasattr(self, attr):
            return getattr(self, attr)(params)
        if method in self._handlers:
            return self._handlers[method](params)
        raise ComfyClientError(METHOD_NOT_FOUND, f"Method '{method}' not found")

    # ── Built-in handlers ───────────────────────────────────────────────

    def method_ping(self, params: Dict) -> Dict:
        return {"ok": True, "server": "comfyclient"}

    def method_list_prompts(self, params: Dict) -> Dict:
        return {
            "prompts": self.queue.names(),
            "runner": self.runner.state(),
            "items": [
                {
                    "id": it.get("id") or it.get("name"),
                    "name": it.get("name"),
                    "characterName": it.get("characterName", ""),
                    "characterId": it.get("characterId", ""),
                    "imagePurpose": it.get("imagePurpose", ""),
                    "positivePrompt": it.get("positivePrompt") or it.get("params", {}).get("positive", ""),
                    "negativePrompt": it.get("negativePrompt") or it.get("params", {}).get("negative", ""),
                    "prompt": it.get("positivePrompt") or it.get("params", {}).get("positive", ""),
                    "targetModel": it.get("targetModel", "flux"),
                    "artStyle": it.get("artStyle", "anime"),
                    "aspectRatio": it.get("aspectRatio", "2:3"),
                    "dimensions": it.get("dimensions"),
                    "lora": it.get("lora") or it.get("params", {}).get("lora") or [],
                    "params": it.get("params", {}),
                    "avatarDataUrl": it.get("avatarDataUrl") or "",
                    "greetingDataUrl": it.get("greetingDataUrl") or "",
                    "greetingBgDataUrl": it.get("greetingBgDataUrl") or "",
                    "completed": bool(it.get("completed")),
                    "status": it.get("status", ""),
                    "error": it.get("error", ""),
                    "outputs": len(it.get("outputs") or []),
                    "createdAt": it.get("createdAt", ""),
                }
                for it in self.queue.all()
            ],
        }

    def method_load_prompt(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        item = self.queue.get(key)
        if not item:
            raise ComfyClientError(METHOD_NOT_FOUND, f"Prompt '{key}' not found")
        return item

    def method_save_prompt(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        saved = self.queue.replace(params, key=key)
        self.notify_change()
        return saved

    def method_dispatch_prompt(self, params: Dict) -> Dict:
        """Saves prompt(s) over IPC and immediately enqueues them for processing."""
        items = params.get("items")
        auto_run = params.get("auto_run", True)
        dispatched = []

        if items and isinstance(items, list):
            for raw_item in items:
                k = raw_item.get("id") or raw_item.get("name")
                saved = self.queue.replace(raw_item, key=k)
                item_key = saved.get("id") or saved.get("name")
                if auto_run:
                    self.runner.enqueue(item_key)
                dispatched.append(item_key)
        else:
            key = params.get("id") or params.get("name")
            if not key:
                if auto_run:
                    return self.method_run_all(params)
                raise ComfyClientError(INVALID_PARAMS, "'id', 'name', or 'items' is required")
            if len(params) > 2 or "prompt" in params or "positivePrompt" in params or "params" in params:
                saved = self.queue.replace(params, key=key)
                item_key = saved.get("id") or saved.get("name")
            else:
                item = self.queue.get(key)
                if not item:
                    raise ComfyClientError(METHOD_NOT_FOUND, f"Prompt '{key}' not found")
                item_key = item.get("id") or item.get("name")
            if auto_run:
                self.runner.enqueue(item_key)
            dispatched.append(item_key)

        self.notify_change()
        return {"dispatched": dispatched, "count": len(dispatched)}

    def method_delete_prompt(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        ok = self.queue.remove(key)
        self.notify_change()
        return {"deleted": ok, "key": key}

    def method_batch_edit(self, params: Dict) -> Dict:
        """Batch edit fields (LoRA, checkpoint, steps, aspect ratio, prompt affixes) across multiple items."""
        item_keys = params.get("ids") or params.get("items") or params.get("keys") or []
        updates = params.get("updates") or {}
        lora_action = str(params.get("lora_action") or params.get("loraAction") or "append")

        if not isinstance(updates, dict):
            raise ComfyClientError(INVALID_PARAMS, "'updates' must be an object dictionary")

        updated = self.queue.batch_update(item_keys, updates, lora_action=lora_action)
        self.notify_change()
        return {
            "success": True,
            "updated_count": len(updated),
            "updated_ids": [it.get("id") for it in updated],
        }

    def method_clear_queue(self, params: Dict) -> Dict:
        completed_only = bool(params.get("completed_only") or params.get("completedOnly"))
        removed = self.queue.clear(completed_only=completed_only)
        self.notify_change()
        return {"cleared": removed}

    def method_run_prompt(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        count = int(params.get("count") or 1)
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        item = self.queue.get(key)
        if not item:
            if "prompt" in params or "positivePrompt" in params or "params" in params:
                item = self.queue.replace(params, key=key)
            else:
                raise ComfyClientError(METHOD_NOT_FOUND, f"Prompt '{key}' not found")
        queued = self.runner.enqueue(item.get("id") or item.get("name"), count=max(1, count))
        self.notify_change()
        return {
            "id": item.get("id"),
            "name": item.get("name"),
            "queued": queued,
            "count": count,
            "workflow": item.get("workflow"),
        }

    def method_clear_gallery(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        ok = self.queue.clear_gallery(key)
        self.notify_change()
        return {"ok": ok, "key": key}

    def method_delete_gallery_image(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        filename = params.get("filename")
        if not key or not filename:
            raise ComfyClientError(INVALID_PARAMS, "'id' and 'filename' are required")
        ok = self.queue.delete_gallery_image(key, filename)
        self.notify_change()
        return {"ok": ok, "key": key, "filename": filename}

    def method_dry_run_prompt(self, params: Dict) -> Dict:
        """Generates the exact ComfyUI or sd.cpp API payload JSON for a prompt without executing it."""
        key = params.get("id") or params.get("name")
        item = self.queue.get(key) if key else None

        # Base parameters from item or incoming params
        merged_params = {}
        if item and isinstance(item.get("params"), dict):
            merged_params.update(item["params"])
        if "params" in params and isinstance(params["params"], dict):
            merged_params.update(params["params"])
        else:
            for k in ("checkpoint", "positive", "negative", "sampler", "scheduler", "steps", "cfg", "width", "height", "seed", "zoda_plus"):
                if k in params:
                    merged_params[k] = params[k]

        s_data = self.settings.get()
        engine_mode = s_data.get("engine_mode", "comfy")

        purpose = params.get("imagePurpose") or (item.get("imagePurpose") if item else None) or "default"
        defs_by_purpose = s_data.get("defaults_by_purpose", {})
        p_defs = defs_by_purpose.get(purpose) or defs_by_purpose.get("default") or {}

        raw_params = dict(merged_params)
        if "lora" not in raw_params and item and item.get("lora"):
            raw_params["lora"] = item.get("lora")
        if not raw_params.get("width") or int(raw_params.get("width", 0)) <= 0:
            raw_params["width"] = p_defs.get("width") or s_data.get("default_width") or 832
        if not raw_params.get("height") or int(raw_params.get("height", 0)) <= 0:
            raw_params["height"] = p_defs.get("height") or s_data.get("default_height") or 1216
        if not raw_params.get("checkpoint"):
            raw_params["checkpoint"] = p_defs.get("checkpoint") or s_data.get("default_checkpoint") or ""

        if engine_mode == "sdcpp":
            output_format = s_data.get("output_format", "png").lower()
            sd_payload = build_sdcpp_payload(
                raw_params,
                lora_spec=raw_params.get("lora"),
                seed=raw_params.get("seed"),
                output_format=output_format,
            )
            json_str = json.dumps(sd_payload, indent=2, ensure_ascii=False)
            return {
                "key": key,
                "engine": "sdcpp",
                "seed": sd_payload.get("seed"),
                "params": raw_params,
                "payload": sd_payload,
                "json_str": json_str,
                "node_count": len(sd_payload.get("lora", [])),
            }

        # Determine workflow template
        wf_template = params.get("workflow")
        if isinstance(wf_template, str) and wf_template.strip():
            try:
                wf_template = json.loads(wf_template)
            except Exception:
                wf_template = None
        if not wf_template or not isinstance(wf_template, dict):
            wf_template = (item.get("workflow") if item else None) or {}
        if not wf_template or not isinstance(wf_template, dict) or len(wf_template) == 0:
            wf_template = s_data.get("default_workflow") or {}

        patched_wf, seed = apply_params(wf_template, raw_params, settings=s_data)

        payload = {"prompt": patched_wf}
        json_str = json.dumps(payload, indent=2, ensure_ascii=False)

        return {
            "key": key,
            "engine": "comfy",
            "seed": seed,
            "params": raw_params,
            "payload": payload,
            "json_str": json_str,
            "node_count": len(patched_wf) if isinstance(patched_wf, dict) else 0,
        }

    def method_run_all(self, params: Dict) -> Dict:
        items = params.get("items")
        if items and isinstance(items, list):
            for raw in items:
                k = raw.get("id") or raw.get("name")
                self.queue.replace(raw, key=k)

        queued = [
            it.get("id") or it.get("name")
            for it in self.queue.all()
            if it.get("status") != "done" and self.runner.enqueue(it.get("id") or it.get("name"))
        ]
        self.notify_change()
        return {"queued": queued, "count": len(queued)}

    def method_cancel_prompt(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id' or 'name' is required")
        cancelled = self.runner.cancel(key)
        self.notify_change()
        return {"key": key, "cancelled": cancelled}

    def method_cancel_all(self, params: Dict) -> Dict:
        cancelled = self.runner.cancel_all()
        self.notify_change()
        return {"cancelled": cancelled}

    def method_get_settings(self, params: Dict) -> Dict:
        return self.settings.get()

    def method_set_settings(self, params: Dict) -> Dict:
        return self.settings.update(params)

    def method_list_models(self, params: Dict) -> Dict:
        s = self.settings.get()
        engine_mode = s.get("engine_mode", "comfy")
        sdcpp_url = s.get("sdcppUrl", "http://127.0.0.1:1234")
        return fetch_models(s["comfyUrl"].rstrip("/"), engine_mode=engine_mode, sdcpp_url=sdcpp_url)

    def method_get_status(self, params: Dict) -> Dict:
        return {
            "running": self._running,
            "prompts": self.queue.names(),
            "runner": self.runner.state(),
            "socket_path": self.socket_path,
        }

    def method_image_attach(self, params: Dict) -> Dict:
        key = params.get("id") or params.get("queueId") or params.get("name")
        if not key:
            raise ComfyClientError(INVALID_PARAMS, "'id', 'queueId' or 'name' is required")
        completed = self.queue.mark_complete(key)
        self.notify_change()
        return {"ok": completed, "key": key}


def main():
    parser = argparse.ArgumentParser(description="ComfyClient daemon & editor")
    parser.add_argument("--socket", help="Path to Unix domain socket (default: /tmp/comfyclient.sock)")
    parser.add_argument("--config", help="Path to image_prompt_queue.json")
    parser.add_argument("--gui", action="store_true", help="Launch QML editor UI")
    parser.add_argument("--gui-path", help="Path to Main.qml")
    args = parser.parse_args()

    socket_path = args.socket or "/tmp/comfyclient.sock"
    config_path = args.config or PromptQueue.DEFAULT_PATH

    queue = PromptQueue(config_path)
    srv = ComfyClientServer(socket_path, queue=queue)
    srv.start()
    print(f"[comfyclient] Listening on {socket_path}")
    print(f"[comfyclient] Queue file: {queue.path}")

    if args.gui:
        from .gui import run_editor
        gui_path = args.gui_path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "qml", "Main.qml"
        )
        try:
            run_editor(srv, gui_path)
        finally:
            srv.stop()
        return

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        srv.stop()


if __name__ == "__main__":
    main()
