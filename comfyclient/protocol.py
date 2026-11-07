#!/usr/bin/env python3
"""
ComfyClient JSON-RPC 2.0 Protocol Layer.
"""

BUILTIN_METHODS = {
    "ping",
    "list_prompts",
    "load_prompt",
    "save_prompt",
    "delete_prompt",
    "run_prompt",
    "dry_run_prompt",
    "run_all",
    "cancel_prompt",
    "cancel_all",
    "get_settings",
    "set_settings",
    "list_models",
    "get_status",
    "image:attach",
    "clear_gallery",
    "delete_gallery_image",
}

# Standard JSON-RPC 2.0 error codes
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32000


class ComfyClientError(Exception):
    """Raised inside handlers to return a structured JSON-RPC error."""

    def __init__(self, code: int, message: str):
        self.code = code
        super().__init__(message)
