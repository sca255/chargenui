#!/usr/bin/env python3
"""
ComfyClient Python Client & CharGenUI Image Pusher.

JSON-RPC 2.0 client over Unix socket.
"""

import os
import sys
import json
import time
import socket
import threading
from typing import Any, Dict, Optional, List


class ComfyClient:
    """Single-connection JSON-RPC 2.0 client to ComfyClient server."""

    def __init__(self, path: str = "/tmp/comfyclient.sock"):
        self.path = path
        self._sock: Optional[socket.socket] = None
        self._pending: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)
        self._reader: Optional[threading.Thread] = None
        self._running = False

    def is_connected(self) -> bool:
        return self._running and self._sock is not None

    def connect(self, timeout: float = 5.0):
        if self.is_connected():
            return
        if not os.path.exists(self.path):
            raise FileNotFoundError(f"Socket file not found at {self.path}")

        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect(self.path)
        sock.settimeout(None)
        self._sock = sock
        self._running = True
        self._reader = threading.Thread(target=self._recv_loop, daemon=True, name="ComfyClientReader")
        self._reader.start()

    def _recv_loop(self):
        buf = b""
        while self._running:
            try:
                chunk = self._sock.recv(4096)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        msg = json.loads(line.decode("utf-8"))
                        req_id = str(msg.get("id"))
                        with self._lock:
                            self._pending[req_id] = msg
                            self._cond.notify_all()
                    except Exception:
                        pass
            except Exception:
                break
        self.close()

    def send_action(self, method: str, params: Optional[Dict[str, Any]] = None, timeout: float = 600.0) -> Any:
        """Sends a JSON-RPC request and returns the result."""
        if not self.is_connected():
            self.connect()

        req_id = f"req_{int(time.time()*1000)}"
        msg = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
        with self._lock:
            self._sock.sendall((json.dumps(msg, default=str) + "\n").encode("utf-8"))
            deadline = time.time() + timeout
            while req_id not in self._pending and time.time() < deadline:
                self._cond.wait(timeout=min(0.5, deadline - time.time()))
            if req_id not in self._pending:
                raise TimeoutError(f"Action '{method}' timed out after {timeout}s")
            reply = self._pending.pop(req_id)

        if "error" in reply:
            raise RuntimeError(reply["error"].get("message") or "RPC Error")
        return reply.get("result")

    def ping(self) -> Dict:
        return self.send_action("ping")

    def list_prompts(self) -> List[str]:
        res = self.send_action("list_prompts")
        return res.get("prompts", []) if isinstance(res, dict) else []

    def load_prompt(self, key: str) -> Dict:
        return self.send_action("load_prompt", {"id": key, "name": key})

    def save_prompt(self, item: Dict) -> Dict:
        return self.send_action("save_prompt", item)

    def delete_prompt(self, key: str) -> Dict:
        return self.send_action("delete_prompt", {"id": key, "name": key})

    def run_prompt(self, key: str, timeout: float = 600.0) -> Dict:
        return self.send_action("run_prompt", {"id": key, "name": key}, timeout=timeout)

    def run_all(self) -> Dict:
        return self.send_action("run_all")

    def batch_edit(
        self,
        item_keys: Optional[List[str]] = None,
        updates: Optional[Dict[str, Any]] = None,
        lora_action: str = "append",
    ) -> Dict:
        """Batch edit properties (LoRA, checkpoint, sampler, steps, cfg, dimensions, prompt tags) across multiple prompts."""
        return self.send_action(
            "batch_edit",
            {"ids": item_keys or [], "updates": updates or {}, "lora_action": lora_action},
        )

    def close(self):
        self._running = False
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
            self._sock = None


class CharGenImageClient:
    """Sends generated images back to CharGenUI over its dedicated IPC socket."""

    CANDIDATE_SOCKETS = [
        os.environ.get("CHARGEN_IPC_SOCKET"),
        "/tmp/chargenui-ipc.sock",
        "/tmp/chargen.sock",
    ]

    def __init__(self, socket_path: Optional[str] = None):
        if socket_path:
            self.socket_path = socket_path
        else:
            self.socket_path = None
            for s in self.CANDIDATE_SOCKETS:
                if s and os.path.exists(s):
                    self.socket_path = s
                    break
            if not self.socket_path:
                self.socket_path = "/tmp/chargenui-ipc.sock"

    def send_image(
        self,
        prompt_name: str,
        image_b64: str,
        image_type: str = "avatar",
        mime_type: str = "image/png",
        timeout: float = 5.0,
        greeting_index: Optional[int] = None,
    ) -> Optional[Dict]:
        """Sends image to CharGenUI; returns reply or None."""
        if not os.path.exists(self.socket_path):
            return None

        # Auto-convert to AVIF if input is PNG or other format
        try:
            from PIL import Image
            import io
            import base64
            clean_b64 = image_b64.split(",", 1)[1] if "," in image_b64 else image_b64
            raw_bytes = base64.b64decode(clean_b64)
            pil_img = Image.open(io.BytesIO(raw_bytes))
            avif_io = io.BytesIO()
            pil_img.save(avif_io, format="AVIF", quality=85)
            avif_b64 = base64.b64encode(avif_io.getvalue()).decode("ascii")
            data_url = f"data:image/avif;base64,{avif_b64}"
        except Exception:
            data_url = image_b64 if image_b64.startswith("data:image") else f"data:{mime_type};base64,{image_b64}"

        payload_data = {
            "id": prompt_name,
            "queueId": prompt_name,
            "name": prompt_name,
            "imageType": image_type,
            "imageDataUrl": data_url,
        }
        if greeting_index is not None:
            payload_data["greetingIndex"] = greeting_index

        payload = {
            "action": "image:attach",
            "payload": payload_data,
        }

        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
                sock.settimeout(timeout)
                sock.connect(self.socket_path)
                sock.sendall((json.dumps(payload) + "\n").encode("utf-8"))

                buf = b""
                deadline = time.time() + timeout
                while time.time() < deadline:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    buf += chunk
                    while b"\n" in buf:
                        line, buf = buf.split(b"\n", 1)
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            msg = json.loads(line.decode("utf-8"))
                            msg_type = msg.get("type", "")
                            # Skip the connection handshake line
                            if msg_type == "ipc:connected":
                                continue
                            return msg
                        except Exception:
                            pass
                return None
        except Exception:
            return None
