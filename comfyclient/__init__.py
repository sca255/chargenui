"""ComfyUI Client — cross-platform Unix socket / named pipe server."""

from .config import PromptQueue, Settings
from .protocol import (
    BUILTIN_METHODS,
    ComfyClientError,
    METHOD_NOT_FOUND,
    INVALID_PARAMS,
    INTERNAL_ERROR,
)
from .server import ComfyClientServer
from .client import ComfyClient, CharGenImageClient
from .gui import run_editor, launch_bridge

__version__ = "0.2.0"
__all__ = [
    "PromptQueue",
    "Settings",
    "ComfyClientError",
    "BUILTIN_METHODS",
    "ComfyClientServer",
    "ComfyClient",
    "CharGenImageClient",
    "run_editor",
    "launch_bridge",
]
