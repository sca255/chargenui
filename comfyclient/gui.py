#!/usr/bin/env python3
"""
ComfyClient QML GUI Host.
Runs PySide6 engine hosting qml/Main.qml connected to the in-process server.
"""

import os
import sys
import json
import time

from .protocol import ComfyClientError, INTERNAL_ERROR


def run_editor(server, gui_path: str) -> int:
    """Host the QML editor in this process; calls server._route directly."""
    try:
        from PySide6.QtCore import QObject, Property, Slot, Signal, QUrl
        from PySide6.QtGui import QGuiApplication, QImage
        from PySide6.QtQml import QQmlApplicationEngine
        from PySide6.QtQuick import QQuickImageProvider
        from PySide6.QtQuickControls2 import QQuickStyle
    except ImportError:
        print("[comfyclient] PySide6 not installed: pip install PySide6")
        print("[comfyclient] Running in daemon mode without GUI.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            return 0

    class LocalImageProvider(QQuickImageProvider):
        def __init__(self, outputs_dir: str):
            super().__init__(QQuickImageProvider.ImageType.Image)
            self.outputs_dir = outputs_dir

        def requestImage(self, id_str, size, requestedSize):
            filename = id_str.split("?")[0]
            path = os.path.join(self.outputs_dir, filename)
            if os.path.exists(path):
                img = QImage(path)
                return img
            return QImage()

    class Backend(QObject):
        queueChanged = Signal()

        @Slot(str, str, result=str)
        def call(self, method, params_json):
            try:
                params = json.loads(params_json or "{}")
                result = server._route(method, params)
                return json.dumps({"result": result}, default=str)
            except ComfyClientError as exc:
                return json.dumps({"error": {"code": exc.code, "message": str(exc)}})
            except Exception as exc:
                return json.dumps({"error": {"code": INTERNAL_ERROR, "message": str(exc)}})

        @Property(str, constant=True)
        def socketPath(self):
            return server.socket_path

    if not os.path.exists(gui_path):
        print(f"[comfyclient] QML file not found: {gui_path}")
        return 1

    QQuickStyle.setStyle("Material")
    app = QGuiApplication(sys.argv[:1])

    # Hard-cap Qt Pixmap Cache to 32MB
    try:
        from PySide6.QtGui import QPixmapCache
        QPixmapCache.setCacheLimit(32 * 1024)
    except Exception:
        pass
    engine = QQmlApplicationEngine()
    backend = Backend()
    server.on_change = lambda: backend.queueChanged.emit()

    outputs_dir = os.path.join(os.path.dirname(server.queue.path), "outputs")
    os.makedirs(outputs_dir, exist_ok=True)
    engine.addImageProvider("localfile", LocalImageProvider(outputs_dir))

    engine.rootContext().setContextProperty("backend", backend)
    engine.load(QUrl.fromLocalFile(gui_path))
    if not engine.rootObjects():
        return 1
    return app.exec()


def launch_bridge(socket_path: str, gui_path: str, queue=None):
    from .server import ComfyClientServer
    srv = ComfyClientServer(socket_path, queue=queue)
    srv.start()
    try:
        return run_editor(srv, gui_path)
    finally:
        srv.stop()

