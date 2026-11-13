#!/usr/bin/env python3
"""
CharGen Expression Forge - Standalone QML App / PySide6 Bridge.
Zero-LLM Fast Img2Img Facial Variant Studio.
"""

import os
import sys
import json
import time
import socket
import threading
from pathlib import Path
from typing import Any, Dict, List

from PySide6.QtCore import QObject, Signal, Slot, Property, QUrl
from PySide6.QtGui import QGuiApplication, QIcon
from PySide6.QtQml import QQmlApplicationEngine

from expression_forge.presets import EXPRESSION_PRESETS, build_expression_prompt, build_expression_negative
from expression_forge.workflows import build_img2img_workflow
from expression_forge.engine import ExpressionForgeEngine


class ExpressionForgeBridge(QObject):
    engineModeChanged = Signal()
    sdServerUrlChanged = Signal()
    comfyUrlChanged = Signal()
    sourceImagePathChanged = Signal()
    checkpointsChanged = Signal()
    expressionListChanged = Signal()
    generatedResultsChanged = Signal()
    statusMessageChanged = Signal()
    isGeneratingChanged = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._engine_mode = "sdcpp_server"  # Default: stable-diffusion.cpp server (fast, model stays in RAM)
        self._sd_server_url = os.getenv("SD_CPP_SERVER", "http://127.0.0.1:8080")
        self._comfy_url = "http://127.0.0.1:8188"
        self._source_image_path = ""
        self._checkpoints: List[str] = []
        self._status_message = "Ready (Engine: stable-diffusion.cpp server)"
        self._is_generating = False
        self._generated_results: List[Dict[str, Any]] = []

        # Initialize selection states
        self._selected_keys = {"joy", "smug", "angry", "sad", "surprised", "blushing"}
        self._expression_list: List[Dict[str, Any]] = []
        self._rebuild_expression_list()

        self.engine = ExpressionForgeEngine(self._comfy_url, self._sd_server_url)
        self.output_dir = Path("data/expression_outputs")
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass

        # Background test connection
        threading.Thread(target=self._check_sd_server_worker, daemon=True).start()
        threading.Thread(target=self._fetch_checkpoints_worker, daemon=True).start()

    def _check_sd_server_worker(self):
        res = self.engine.sd_server.check_connection()
        if res.get("status") == "ok":
            self._status_message = f"Connected to sd.cpp server at {self._sd_server_url}"
        else:
            self._status_message = f"sd.cpp server standby at {self._sd_server_url} (or switch to ComfyUI)"
        self.statusMessageChanged.emit()

    @Property(str, notify=engineModeChanged)
    def engineMode(self):
        return self._engine_mode

    @engineMode.setter
    def engineMode(self, val):
        if self._engine_mode != val:
            self._engine_mode = val
            self.engineModeChanged.emit()
            mode_name = "stable-diffusion.cpp server" if val == "sdcpp_server" else "ComfyUI (img2img)"
            self._status_message = f"Switched engine to {mode_name}"
            self.statusMessageChanged.emit()

    @Property(str, notify=sdServerUrlChanged)
    def sdServerUrl(self):
        return self._sd_server_url

    @sdServerUrl.setter
    def sdServerUrl(self, val):
        if self._sd_server_url != val:
            self._sd_server_url = val
            self.engine.sd_server.server_url = val.rstrip("/")
            self.sdServerUrlChanged.emit()

    def _rebuild_expression_list(self):
        el = []
        for key, p in EXPRESSION_PRESETS.items():
            el.append({
                "key": key,
                "label": p["label"],
                "category": p["category"],
                "selected": key in self._selected_keys
            })
        self._expression_list = el
        self.expressionListChanged.emit()

    def _fetch_checkpoints_worker(self):
        ckpts = self.engine.get_checkpoints()
        if ckpts:
            self._checkpoints = ckpts
            self.checkpointsChanged.emit()
            self._status_message = f"Connected to ComfyUI ({len(ckpts)} models found)"
            self.statusMessageChanged.emit()

    # Properties
    @Property(str, notify=comfyUrlChanged)
    def comfyUrl(self):
        return self._comfy_url

    @comfyUrl.setter
    def comfyUrl(self, val):
        if self._comfy_url != val:
            self._comfy_url = val
            self.engine.comfy_url = val.rstrip("/")
            self.comfyUrlChanged.emit()

    @Property(str, notify=sourceImagePathChanged)
    def sourceImagePath(self):
        if self._source_image_path and os.path.exists(self._source_image_path):
            return QUrl.fromLocalFile(os.path.abspath(self._source_image_path)).toString()
        return ""

    @Property(list, notify=checkpointsChanged)
    def checkpoints(self):
        return self._checkpoints

    @Property(list, notify=expressionListChanged)
    def expressionList(self):
        return self._expression_list

    @Property(list, notify=generatedResultsChanged)
    def generatedResults(self):
        return self._generated_results

    @Property(str, notify=statusMessageChanged)
    def statusMessage(self):
        return self._status_message

    @Property(bool, notify=isGeneratingChanged)
    def isGenerating(self):
        return self._is_generating

    # Slots
    @Slot(str)
    def setSourceImage(self, path: str):
        clean_path = path.replace("file://", "").strip()
        if os.path.exists(clean_path):
            self._source_image_path = clean_path
            self.sourceImagePathChanged.emit()
            self._status_message = f"Loaded base avatar: {os.path.basename(clean_path)}"
            self.statusMessageChanged.emit()

    @Slot()
    def syncFromCharGen(self):
        """Attempts to pull active character avatar path from CharGenUI IPC."""
        sock_path = os.getenv("CHARGEN_IPC_SOCKET", "/tmp/chargenui-ipc.sock")
        if not os.path.exists(sock_path):
            self._status_message = "CharGenUI IPC socket not found."
            self.statusMessageChanged.emit()
            return

        def _worker():
            try:
                with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
                    s.settimeout(3.0)
                    s.connect(sock_path)
                    s.sendall(b'{"action":"state:get"}\n')
                    resp = s.recv(65536).decode("utf-8")
                    data = json.loads(resp)
                    char = data.get("character", {})
                    # If avatar is stored or there is a local file
                    avatar_url = char.get("avatar") or ""
                    if avatar_url.startswith("data:image"):
                        # Save temp png
                        tmp_path = "data/expression_outputs/current_active_avatar.png"
                        import base64
                        b64_data = avatar_url.split(",", 1)[1]
                        with open(tmp_path, "wb") as f:
                            f.write(base64.b64decode(b64_data))
                        self.setSourceImage(tmp_path)
                    else:
                        self._status_message = "Active card has no embedded avatar."
                        self.statusMessageChanged.emit()
            except Exception as e:
                self._status_message = f"CharGen sync error: {e}"
                self.statusMessageChanged.emit()

        threading.Thread(target=_worker, daemon=True).start()

    @Slot()
    def checkConnection(self):
        threading.Thread(target=self._fetch_checkpoints_worker, daemon=True).start()

    @Slot(str, bool)
    def toggleExpression(self, key: str, checked: bool):
        if checked:
            self._selected_keys.add(key)
        else:
            self._selected_keys.discard(key)
        self._rebuild_expression_list()

    @Slot(bool)
    def selectAllExpressions(self, select_all: bool):
        if select_all:
            self._selected_keys = set(EXPRESSION_PRESETS.keys())
        else:
            self._selected_keys.clear()
        self._rebuild_expression_list()

    @Slot(str, str, float)
    def generateSelected(self, checkpoint: str, base_prompt: str, denoise: float):
        if not self._source_image_path:
            self._status_message = "Please select a base avatar image first!"
            self.statusMessageChanged.emit()
            return
        if not self._selected_keys:
            self._status_message = "Please select at least one expression preset!"
            self.statusMessageChanged.emit()
            return

        self._is_generating = True
        self.isGeneratingChanged.emit()

        def _batch_worker():
            try:
                selected_keys = list(self._selected_keys)
                total = len(selected_keys)
                default_neg = "worst quality, low quality, bad quality, jpeg artifacts, blurry, bad anatomy, deformed"

                if self._engine_mode == "sdcpp_server":
                    # stable-diffusion.cpp HTTP server mode (Model permanently stays loaded in RAM/VRAM)
                    for idx, exp_key in enumerate(selected_keys, 1):
                        preset = EXPRESSION_PRESETS.get(exp_key, {})
                        label = preset.get("label", exp_key)

                        self._status_message = f"[sd.cpp server] {idx}/{total}: {label} (strength: {denoise:.2f})..."
                        self.statusMessageChanged.emit()

                        pos = build_expression_prompt(base_prompt, exp_key)
                        neg = build_expression_negative(default_neg, exp_key)
                        out_filename = f"sdcpp_{exp_key}_{int(time.time())}.png"
                        out_filepath = self.output_dir / out_filename

                        ok = self.engine.sd_server.run_img2img(
                            input_image_path=self._source_image_path,
                            output_image_path=str(out_filepath.resolve()),
                            positive_prompt=pos,
                            negative_prompt=neg,
                            denoise_strength=denoise,
                            steps=20,
                            cfg_scale=7.0
                        )

                        if ok and out_filepath.exists():
                            self._generated_results.append({
                                "key": exp_key,
                                "label": label,
                                "imagePath": QUrl.fromLocalFile(str(out_filepath.resolve())).toString(),
                                "rawBytesPath": str(out_filepath.resolve())
                            })
                            self.generatedResultsChanged.emit()

                else:
                    # ComfyUI mode
                    self._status_message = "Uploading base avatar to ComfyUI..."
                    self.statusMessageChanged.emit()

                    uploaded_filename = self.engine.upload_image(self._source_image_path)

                    for idx, exp_key in enumerate(selected_keys, 1):
                        preset = EXPRESSION_PRESETS.get(exp_key, {})
                        label = preset.get("label", exp_key)

                        self._status_message = f"[ComfyUI] {idx}/{total}: {label} (denoise: {denoise:.2f})..."
                        self.statusMessageChanged.emit()

                        pos = build_expression_prompt(base_prompt, exp_key)
                        neg = build_expression_negative(default_neg, exp_key)

                        workflow = build_img2img_workflow(
                            checkpoint=checkpoint,
                            positive_prompt=pos,
                            negative_prompt=neg,
                            input_image_name=uploaded_filename,
                            denoise=denoise,
                        )

                        prompt_id = self.engine.queue_prompt(workflow)
                        history = self.engine.wait_for_prompt(prompt_id)

                        if history and "outputs" in history:
                            # Extract output image
                            for nid, out in history["outputs"].items():
                                images = out.get("images", [])
                                if images:
                                    img_info = images[0]
                                    raw_bytes = self.engine.download_image(
                                        img_info["filename"],
                                        img_info.get("subfolder", ""),
                                        img_info.get("type", "output")
                                    )
                                    out_filename = f"comfy_{exp_key}_{int(time.time())}.png"
                                    out_filepath = self.output_dir / out_filename
                                    with open(out_filepath, "wb") as f:
                                        f.write(raw_bytes)

                                    # Append to results
                                    self._generated_results.append({
                                        "key": exp_key,
                                        "label": label,
                                        "imagePath": QUrl.fromLocalFile(str(out_filepath.resolve())).toString(),
                                        "rawBytesPath": str(out_filepath.resolve())
                                    })
                                    self.generatedResultsChanged.emit()

                self._status_message = f"Completed batch of {total} expressions!"
            except Exception as e:
                self._status_message = f"Error during generation: {e}"
            finally:
                self._is_generating = False
                self.isGeneratingChanged.emit()
                self.statusMessageChanged.emit()

        threading.Thread(target=_batch_worker, daemon=True).start()

    @Slot(str, str)
    def sendToCard(self, key: str, img_url: str):
        local_path = img_url.replace("file://", "").strip()
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                img_bytes = f.read()
            ok = self.engine.send_to_chargen_ipc(f"expression_{key}", img_bytes, image_type="expression")
            if ok:
                self._status_message = f"Expression '{key}' sent to CharGen card!"
            else:
                self._status_message = "CharGenUI IPC not reachable."
            self.statusMessageChanged.emit()


def main():
    app = QGuiApplication(sys.argv)
    engine = QQmlApplicationEngine()

    bridge = ExpressionForgeBridge()
    engine.rootContext().setContextProperty("backend", bridge)

    qml_file = Path(__file__).parent / "qml" / "Main.qml"
    engine.load(QUrl.fromLocalFile(str(qml_file.resolve())))

    if not engine.rootObjects():
        sys.exit(1)

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
