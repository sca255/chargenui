#!/usr/bin/env python3
"""
sd.cpp / stable-diffusion.cpp HTTP Client.
Direct integration with sd-server's native /sdcpp/v1 API and /sdapi/v1 compatibility endpoints.
"""

import json
import time
import base64
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

class SdCppClient:
    def __init__(self, base_url: str = "http://127.0.0.1:1234", timeout: float = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None, timeout: Optional[float] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(data).encode("utf-8") if data is not None else None
        headers = {"Content-Type": "application/json"} if data is not None else {}
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        t = timeout if timeout is not None else self.timeout
        try:
            with urllib.request.urlopen(req, timeout=t) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                err_data = json.loads(raw)
                msg = err_data.get("error", {}).get("message") or err_data.get("message") or raw
            except Exception:
                msg = raw
            raise RuntimeError(f"HTTP {exc.code}: {msg}")

    def ping(self) -> bool:
        try:
            url = f"{self.base_url}/"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def get_capabilities(self) -> Dict[str, Any]:
        return self._request("GET", "/sdcpp/v1/capabilities", timeout=10)

    def fetch_models(self) -> Dict[str, Any]:
        """Maps sd.cpp capabilities to ComfyClient's expected model list format."""
        try:
            caps = self.get_capabilities()
            model_info = caps.get("model", {})
            model_name = model_info.get("name") or model_info.get("stem") or "sd.cpp-active-model"
            
            loras = []
            for l in caps.get("loras", []):
                # We can store the path or name
                path = l.get("path") or l.get("name")
                if path:
                    loras.append(path)
            loras.sort()

            samplers = caps.get("samplers", [])
            schedulers = caps.get("schedulers", [])

            return {
                "unets": [model_name],
                "standard_checkpoints": [model_name],
                "checkpoints": [model_name],
                "loras": loras,
                "samplers": samplers,
                "schedulers": schedulers,
                "error": None,
                "capabilities": caps,
            }
        except Exception as e:
            return {
                "unets": [],
                "standard_checkpoints": [],
                "checkpoints": [],
                "loras": [],
                "samplers": [],
                "schedulers": [],
                "error": str(e),
                "capabilities": {},
            }

    def submit_img_gen(self, payload: Dict[str, Any]) -> str:
        """Submits an img_gen job and returns the job ID."""
        resp = self._request("POST", "/sdcpp/v1/img_gen", data=payload, timeout=30)
        job_id = resp.get("id")
        if not job_id:
            raise RuntimeError(f"sd.cpp server did not return a job ID: {resp}")
        return job_id

    def get_job(self, job_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/sdcpp/v1/jobs/{job_id}", timeout=10)

    def cancel_job(self, job_id: str) -> bool:
        try:
            self._request("POST", f"/sdcpp/v1/jobs/{job_id}/cancel", data={}, timeout=5)
            return True
        except Exception:
            return False

