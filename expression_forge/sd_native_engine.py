"""
stable-diffusion.cpp (sd.cpp) Native Server Engine.

Directly implements the native sdcpp API specification documented in:
stable-diffusion.cpp/examples/server/api.md

Endpoints used:
- GET  /sdcpp/v1/capabilities
- POST /sdcpp/v1/img_gen (Async 202 submission with init_image, strength, sample_params)
- GET  /sdcpp/v1/jobs/{id} (Polls job status until completed)
- POST /sdcpp/v1/jobs/{id}/cancel

This uses the native C++ HTTP server with models kept permanently in RAM/VRAM.
Zero disk reloading, zero compatibility translation overhead.
"""

import os
import sys
import json
import time
import base64
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Dict, List, Optional


class SDCppNativeServerEngine:
    def __init__(self, server_url: str = "http://127.0.0.1:8080"):
        self.server_url = server_url.rstrip("/")

    def check_connection(self) -> Dict[str, Any]:
        """Tests native /sdcpp/v1/capabilities endpoint."""
        try:
            req = urllib.request.Request(f"{self.server_url}/sdcpp/v1/capabilities")
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    model_name = data.get("model", {}).get("name", "active model")
                    return {"status": "ok", "model": model_name, "raw": data}
        except Exception as e:
            return {"status": "error", "message": f"Native sdcpp server unreachable: {e}"}
        return {"status": "error", "message": "Unknown server response"}

    def run_img2img(
        self,
        input_image_path: str,
        output_image_path: str,
        positive_prompt: str,
        negative_prompt: str,
        denoise_strength: float = 0.38,
        steps: int = 24,
        cfg_scale: float = 7.0,
        sampler_name: str = "euler_a",
        scheduler: str = "discrete",
        seed: int = -1,
        width: int = 0,
        height: int = 0,
        poll_interval: float = 0.5,
        timeout: int = 180
    ) -> bool:
        """
        Executes img2img via native POST /sdcpp/v1/img_gen and polls /sdcpp/v1/jobs/{id}.
        The model remains permanently resident in RAM/VRAM on the server.
        """
        if not os.path.exists(input_image_path):
            raise FileNotFoundError(f"Source image not found: {input_image_path}")

        with open(input_image_path, "rb") as f:
            raw_input_bytes = f.read()
        b64_input = base64.b64encode(raw_input_bytes).decode("ascii")

        # Native /sdcpp/v1/img_gen payload format per api.md
        payload: Dict[str, Any] = {
            "prompt": positive_prompt,
            "negative_prompt": negative_prompt,
            "init_image": f"data:image/png;base64,{b64_input}",
            "strength": float(denoise_strength),
            "seed": int(seed),
            "batch_count": 1,
            "sample_params": {
                "scheduler": scheduler,
                "sample_method": sampler_name,
                "sample_steps": int(steps),
                "guidance": {
                    "txt_cfg": float(cfg_scale),
                    "img_cfg": float(cfg_scale),
                }
            },
            "output_format": "png",
            "output_compression": 100
        }

        if width > 0 and height > 0:
            payload["width"] = int(width)
            payload["height"] = int(height)

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.server_url}/sdcpp/v1/img_gen",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                job_id = res.get("id")
                poll_url = res.get("poll_url") or f"/sdcpp/v1/jobs/{job_id}"
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"sdcpp native submit failed HTTP {err.code}: {err_body}")

        if not job_id:
            raise RuntimeError("sdcpp server did not return a job id")

        # Poll /sdcpp/v1/jobs/{id}
        start_time = time.time()
        job_endpoint = f"{self.server_url}{poll_url}" if not poll_url.startswith("http") else poll_url

        while time.time() - start_time < timeout:
            try:
                poll_req = urllib.request.Request(job_endpoint)
                with urllib.request.urlopen(poll_req, timeout=5) as poll_resp:
                    job = json.loads(poll_resp.read().decode("utf-8"))
                    status = job.get("status")

                    if status == "completed":
                        result = job.get("result", {})
                        images = result.get("images", [])
                        if not images:
                            raise RuntimeError("sdcpp completed job contains no images")

                        img_obj = images[0]
                        b64_str = img_obj.get("b64_json") or img_obj.get("data") or ""
                        if "," in b64_str:
                            b64_str = b64_str.split(",", 1)[1]

                        img_bytes = base64.b64decode(b64_str)
                        with open(output_image_path, "wb") as out_f:
                            out_f.write(img_bytes)
                        return True

                    elif status == "failed":
                        err_info = job.get("error", {})
                        raise RuntimeError(f"sdcpp job failed: {err_info.get('message', 'unknown error')}")

                    elif status == "cancelled":
                        raise RuntimeError("sdcpp job was cancelled")

            except urllib.error.HTTPError as he:
                if he.code == 404:
                    raise RuntimeError(f"sdcpp job {job_id} not found (404)")
                raise
            except Exception as e:
                # transient network glitch during polling
                if "job failed" in str(e) or "cancelled" in str(e):
                    raise

            time.sleep(poll_interval)

        raise TimeoutError(f"sdcpp job {job_id} timed out after {timeout}s")
