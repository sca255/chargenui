# Agent Guidelines & Memory

## Environment & System Architecture
- **Operating System**: Native Linux environment (NOT WSL / Windows Subsystem for Linux).
- **Filesystem Mounts**: The user uses `/mnt/...` mount paths by convention (e.g., `/mnt/d/projects/chargenui`), but it is a native Linux filesystem and kernel.
- **Process Communication & Applications**:
  - **ComfyClient Definition**: When the user refers to "comfyclient" / "ComfyClient", they ALWAYS mean the separate standalone Python/PySide6 QML application located in `comfyclient/` (not the web UI).
  - Always prefer Unix Domain Socket IPC (`/tmp/comfyclient.sock` for ComfyClient, `/tmp/chargenui-ipc.sock` for CharGenUI) over file polling or disk-based syncing.
  - ComfyClient manages the image prompt queue directly over IPC and handles persistence to `data/image_prompt_queue.json`.
  - CharGenUI delegates prompt operations (queue, dispatch, delete, list) to ComfyClient via IPC when active.
