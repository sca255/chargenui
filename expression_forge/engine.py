#!/usr/bin/env python3
"""
Expression Forge Engine & Bridge.
Handles:
1. ComfyUI REST/WebSocket communications (image upload, prompt queue, progress polling, output retrieval).
2. Unix Domain Socket IPC to /tmp/comfyclient.sock and /tmp/chargenui-ipc.sock.
3. Batch expression matrix dispatch with zero LLM overhead.
"""

import os
import sys
import json
import time
import uuid
import random
import socket
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable

from .presets import EXPRESSION_PRESETS, build_expression_prompt, build_expression_negative
from .workflows import build_img2img_workflow
from .sd_native_engine import SDCppNativeServerEngine


class ExpressionForgeEngine:
    def __init__(self, comfy_url: str = "http://127.0.0.1:8188", sd_server_url: str = "http://127.0.0.1:8080"):
        self.comfy_url = comfy_url.rstrip("/")
        self.chargen_socket_path = os.getenv("CHARGEN_IPC_SOCKET", "/tmp/chargenui-ipc.sock")
        self.comfyclient_socket_path = os.getenv("COMFYCLIENT_SOCKET", "/tmp/comfyclient.sock")
        self.sd_server = SDCppNativeServerEngine(sd_server_url)

    def upload_image(self, file_path: str) -> Optional[str]:
        """Uploads input avatar image to ComfyUI /upload/image endpoint and returns filename."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input image not found: {file_path}")

        filename = os.path.basename(file_path)
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        parts = []
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'.encode("utf-8"))
        parts.append(b"Content-Type: image/png\r\n\r\n")
        parts.append(file_bytes)
        parts.append(b"\r\n")
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(b'Content-Disposition: form-data; name="overwrite"\r\n\r\n')
        parts.append(b"true\r\n")
        parts.append(f"--{boundary}--\r\n".encode("utf-8"))

        body = b"".join(parts)
        req = urllib.request.Request(
            f"{self.comfy_url}/upload/image",
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Content-Length": str(len(body)),
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("name") or filename

    def get_checkpoints(self) -> List[str]:
        """Fetches available checkpoints from ComfyUI object_info."""
        try:
            req = urllib.request.Request(f"{self.comfy_url}/object_info/CheckpointLoaderSimple")
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("CheckpointLoaderSimple", {}).get("input", {}).get("required", {}).get("ckpt_name", [[]])[0]
        except Exception:
            return []

    def queue_prompt(self, workflow: Dict[str, Any]) -> str:
        """Submits prompt graph to ComfyUI /prompt endpoint."""
        payload = json.dumps({"prompt": workflow}).encode("utf-8")
        req = urllib.request.Request(
            f"{self.comfy_url}/prompt",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("prompt_id", "")

    def wait_for_prompt(self, prompt_id: str, poll_interval: float = 1.0, timeout: int = 180) -> Optional[Dict[str, Any]]:
        """Polls ComfyUI /history/{prompt_id} until generation completes."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                req = urllib.request.Request(f"{self.comfy_url}/history/{prompt_id}")
                with urllib.request.urlopen(req, timeout=5) as resp:
                    history = json.loads(resp.read().decode("utf-8"))
                    if prompt_id in history:
                        return history[prompt_id]
            except Exception:
                pass
            time.sleep(poll_interval)
        return None

    def download_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        """Retrieves raw image bytes from ComfyUI /view endpoint."""
        query = urllib.parse.urlencode({
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type
        })
        req = urllib.request.Request(f"{self.comfy_url}/view?{query}")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()

    def send_to_chargen_ipc(self, name: str, image_bytes: bytes, image_type: str = "expression") -> bool:
        """Sends generated image to CharGenUI over Unix socket IPC."""
        if not os.path.exists(self.chargen_socket_path):
            return False
        import base64
        b64 = base64.b64encode(image_bytes).decode("ascii")
        data_url = f"data:image/png;base64,{b64}"
        msg = {
            "action": "image:attach",
            "payload": {
                "name": name,
                "imageType": image_type,
                "imageDataUrl": data_url
            }
        }
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
                s.connect(self.chargen_socket_path)
                s.sendall((json.dumps(msg) + "\n").encode("utf-8"))
            return True
        except Exception:
            return False
