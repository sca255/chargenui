#!/usr/bin/env python3
"""
CharGenUI Unix Domain Socket IPC Client for Python Side Apps.

Provides high-speed local IPC to the CharGenUI dual-bind backend.
Supports both synchronous request-reply actions and background event subscriptions.
"""

import os
import sys
import json
import socket
import select
import tempfile
import threading
import time
from typing import Callable, Dict, Any, List, Optional


class CharGenUnixClient:
    """Client for CharGenUI's Unix Domain Socket IPC transport."""

    DEFAULT_SOCKET = os.environ.get("CHARGEN_IPC_SOCKET") or os.path.join(tempfile.gettempdir(), "chargenui-ipc.sock")

    def __init__(self, socket_path: Optional[str] = None):
        self.socket_path = socket_path or self.DEFAULT_SOCKET
        self._sock: Optional[socket.socket] = None
        self._lock = threading.Lock()
        self._running = False
        self._listener_thread: Optional[threading.Thread] = None
        self._handlers: Dict[str, List[Callable[[Any], None]]] = {}
        self._pending_replies: Dict[str, Dict[str, Any]] = {}
        self._reply_cond = threading.Condition(self._lock)

    def is_connected(self) -> bool:
        return self._sock is not None and self._running

    def connect(self, timeout: float = 5.0) -> bool:
        """Connects to the CharGenUI Unix socket."""
        if self._sock:
            return True

        if not os.path.exists(self.socket_path):
            raise FileNotFoundError(f"CharGenUI socket does not exist at {self.socket_path}. Is the backend running?")

        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect(self.socket_path)
        s.settimeout(None)

        self._sock = s
        self._running = True

        # Start listener thread for incoming events & action replies
        self._listener_thread = threading.Thread(target=self._read_loop, daemon=True, name="CharGenUnixIPC")
        self._listener_thread.start()
        return True

    def _read_loop(self):
        """Reads newline-delimited JSON messages from the Unix socket."""
        buffer = ""
        while self._running and self._sock:
            try:
                chunk = self._sock.recv(4096)
                if not chunk:
                    break
                buffer += chunk.decode("utf-8")
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        msg = json.loads(line)
                        self._dispatch(msg)
                    except Exception as e:
                        print(f"[CharGenUnixClient] Error decoding IPC message: {e}", file=sys.stderr)
            except Exception:
                break

        self._running = False
        if self._sock:
            try:
                self._sock.close()
            except Exception:
                pass
            self._sock = None

    def _dispatch(self, msg: Dict[str, Any]):
        msg_type = msg.get("type", "")
        payload = msg.get("payload", {})

        # Check if this resolves a pending request by reqId
        req_id = payload.get("reqId") if isinstance(payload, dict) else None
        if req_id:
            with self._reply_cond:
                self._pending_replies[req_id] = msg
                self._reply_cond.notify_all()

        # Dispatch to registered event handlers
        with self._lock:
            handlers = list(self._handlers.get(msg_type, []))
            all_handlers = list(self._handlers.get("*", []))

        for h in handlers + all_handlers:
            try:
                h(payload)
            except Exception as e:
                print(f"[CharGenUnixClient] Handler error for '{msg_type}': {e}", file=sys.stderr)

    def on(self, event_type: str, handler: Callable[[Any], None]):
        """Registers a callback for an event type (e.g. 'idea:received', 'character:changed')."""
        with self._lock:
            self._handlers.setdefault(event_type, []).append(handler)

    def send_action(self, action: str, payload: Optional[Dict[str, Any]] = None, timeout: float = 10.0) -> Any:
        """Sends an action request over the Unix socket and waits for typed response."""
        if not self.is_connected():
            self.connect()

        req_id = f"pyreq_{int(time.time() * 1000)}_{os.getpid()}"
        msg = {
            "action": action,
            "reqId": req_id,
            "payload": payload or {}
        }
        wire_data = json.dumps(msg).encode("utf-8") + b"\n"

        with self._reply_cond:
            self._sock.sendall(wire_data)
            start_time = time.time()

            while req_id not in self._pending_replies:
                remaining = timeout - (time.time() - start_time)
                if remaining <= 0:
                    raise TimeoutError(f"IPC action '{action}' timed out after {timeout}s")
                self._reply_cond.wait(timeout=remaining)

            reply = self._pending_replies.pop(req_id)
            if reply.get("type") == "ipc:error":
                raise RuntimeError(reply.get("payload", {}).get("error", "IPC Error"))
            return reply.get("payload")

    def ping(self) -> Dict[str, Any]:
        return self.send_action("ping")

    def get_status(self) -> Dict[str, Any]:
        return self.send_action("get_status")

    def get_themes(self) -> List[str]:
        res = self.send_action("get_themes")
        return res.get("themes", [])

    def get_active_card(self) -> Optional[Dict[str, Any]]:
        res = self.send_action("get_active_card")
        return res.get("character")

    def set_active_card(self, character: Dict[str, Any]) -> Dict[str, Any]:
        return self.send_action("set_active_card", {"character": character})

    def suggest_concept(
        self,
        concept: str,
        archetype: Optional[str] = None,
        themes: Optional[List[str]] = None,
        era: Optional[str] = None,
        suggested_by: str = "Python Side App",
        auto_generate: bool = False,
        timeout: float = 60.0
    ) -> Dict[str, Any]:
        """Pushes a character concept or seed to the CharGenUI idea queue via Unix socket."""
        payload = {
            "concept": concept,
            "archetype": archetype,
            "themes": themes or [],
            "era": era,
            "suggestedBy": suggested_by,
            "autoGenerate": auto_generate
        }
        return self.send_action("suggest_concept", payload, timeout=timeout)

    def get_last_idea(self) -> Optional[Dict[str, Any]]:
        res = self.send_action("get_last_idea")
        return res.get("idea")

    def get_ideas(self) -> List[Dict[str, Any]]:
        res = self.send_action("get_ideas")
        return res.get("ideas", [])

    def close(self):
        self._running = False
        if self._sock:
            try:
                self._sock.shutdown(socket.SHUT_RDWR)
                self._sock.close()
            except Exception:
                pass
            self._sock = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


if __name__ == "__main__":
    print(f"Connecting to CharGenUI Unix Socket at {CharGenUnixClient.DEFAULT_SOCKET}...")
    try:
        with CharGenUnixClient() as client:
            status = client.get_status()
            print("✓ Connected to server:", status.get("server"))
            print("  Socket Path:", status.get("socketPath"))
            print("  Active Idea:", status.get("activeIdea"))
            ping_res = client.ping()
            print("✓ Ping successful, server time:", ping_res.get("time"))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
