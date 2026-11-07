import sys
import os
import json
import time
import subprocess
from pathlib import Path
from PySide6.QtCore import QCoreApplication, QTimer

print("--- Testing Desktop Harness QML IPC Integration ---")

# Start Bun server on port 3336
test_port = 3336
server_proc = subprocess.Popen(
    ["bun", "run", "src/server.ts"],
    env={**os.environ, "PORT": str(test_port)},
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(1.0)

app = QCoreApplication([])

from desktop.app import BackendBridge
bridge = BackendBridge(backend_url=f"http://127.0.0.1:{test_port}")

toast_received = []
idea_received = []

def on_notification(msg):
    print("✓ QML Toast Banner triggered with message:", msg)
    toast_received.append(msg)

def on_idea_received(concept, archetype, themes):
    print(f"✓ QML Spark Generator filled with concept: '{concept[:40]}...', themes: {themes}")
    idea_received.append((concept, archetype, themes))

bridge.notification.connect(on_notification)
bridge.ideaReceived.connect(on_idea_received)

# Trigger backend check
bridge._check_backend()

def push_test_idea():
    import urllib.request
    payload = {
        "concept": "Sariyah, an arcane archivist uncovering forbidden soul-binding contracts.",
        "archetype": "Arcane Archivist",
        "themes": ["Sensory Deprivation", "Slow Burn"],
        "suggestedBy": "Idea Suggester QML App",
        "autoGenerate": False
    }
    req = urllib.request.Request(
        f"http://127.0.0.1:{test_port}/api/ipc/suggest-concept",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        print("✓ Pushed concept via IPC HTTP POST, status:", resp.status)

# Schedule pushing the idea after 1.5s
QTimer.singleShot(1500, push_test_idea)

# Stop after 3.5s
def finish():
    assert len(toast_received) >= 1, "Expected at least 1 toast notification in desktop QML app!"
    assert len(idea_received) >= 1, "Expected ideaReceived signal in desktop QML app!"
    print("\n🎉 DESKTOP HARNESS QML IPC TOAST VERIFIED SUCCESSFULLY!")
    server_proc.kill()
    app.quit()

QTimer.singleShot(3500, finish)

app.exec()
