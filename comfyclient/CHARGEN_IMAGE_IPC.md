# CharGenUI Image Return IPC Specification

This document instructs the `comfyclient` developer or local agent on how to transmit generated images (avatars, greeting scenes, gallery images) back into **CharGenUI** over its local Unix Domain Socket IPC interface.

---

## 1. Socket Endpoint & Transport

CharGenUI runs a dedicated newline-delimited JSON IPC server over a Unix Domain Socket:

- **Socket Path**: `/tmp/chargenui-ipc.sock`  
  *(Can be overridden by the environment variable `$CHARGEN_IPC_SOCKET`)*
- **Socket Type**: Unix Domain Stream Socket (`socket.AF_UNIX`, `socket.SOCK_STREAM`)
- **Protocol**: Single newline (`\n`)-terminated JSON messages.

---

## 2. Message Format

To send an image back to CharGenUI, send a single JSON line with `action: "image:attach"` (or `image:generated`):

```json
{
  "action": "image:attach",
  "payload": {
    "name": "<prompt_name_or_queue_id>",
    "imageType": "avatar",
    "imageDataUrl": "data:image/png;base64,<base64_encoded_image>"
  }
}
```

### Greeting Scene Images:

```json
{
  "action": "image:attach",
  "payload": {
    "name": "<prompt_name_or_queue_id>",
    "imageType": "greeting",
    "imageDataUrl": "data:image/png;base64,<base64_encoded_image>"
  }
}
```

---

## 3. Payload Fields Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | `string` | **Yes** | Use `"image:attach"`, `"image:generated"`, or `"attach_generated_image"`. |
| `payload.name` / `payload.queueId` | `string` | Optional | The prompt identifier / name from `data/image_prompt_queue.json` (e.g. `"avatar_01"`). If provided, CharGenUI marks that item as completed and links the image to it. |
| `payload.imageType` | `string` | Optional | `"avatar"` (default) for character avatar, or `"greeting"` for opening greeting scene illustrations. Also accepts `"background"` or `"other"`. |
| `payload.imageDataUrl` | `string` | **Yes** | Standard Data URL with base64 payload, e.g. `data:image/png;base64,...` or `data:image/jpeg;base64,...`. |
| `payload.characterId` | `string` | Optional | Target character ID in library. If omitted, CharGenUI automatically updates the currently open/active character card. |

---

## 4. CharGenUI Behavior on Receipt

Upon receiving this IPC message, CharGenUI will:
1. **CharX (CCv3) Asset Ingestion**: Automatically pack the image into the character's CharX asset manifest:
   - For `avatar`: maps to `assets/icon.png` (`embedded://assets/icon.png`).
   - For `greeting`: maps to `assets/greeting/greeting_01.png` (`embedded://assets/greeting/greeting_01.png`).
   - For other types: maps to `assets/{type}/{name}.png`.
2. **Library Persistence**: Updates the character card record on disk in `data/cards/`.
3. **Live UI Refresh**: Updates the avatar preview, greeting section, and offline prompt queue in both the Desktop application (PySide6) and Web UI in real-time.
4. **IPC Response**: Responds over the socket with:
   ```json
   {
     "type": "image:attach_success",
     "payload": {
       "queueId": "<name>",
       "imageType": "avatar",
       "updatedActiveCard": true
     }
   }
   ```

---

## 5. Python Implementation Example for `comfyclient`

You can integrate this helper function into `comfyclient`:

```python
import os
import json
import socket
from typing import Optional

CHARGEN_IPC_SOCKET = os.environ.get("CHARGEN_IPC_SOCKET", "/tmp/chargenui-ipc.sock")

def send_image_to_chargenui(
    prompt_name: str,
    base64_data: str,
    image_type: str = "avatar",
    mime_type: str = "image/png",
    socket_path: str = CHARGEN_IPC_SOCKET
) -> Optional[dict]:
    """
    Sends a generated image from ComfyClient back into CharGenUI.
    
    :param prompt_name: The name/id of the queue prompt (e.g. "avatar_01")
    :param base64_data: Raw base64 string of the image (or full data:image URL)
    :param image_type: "avatar" or "greeting"
    :param mime_type: "image/png", "image/jpeg", or "image/webp"
    :param socket_path: Path to the CharGenUI IPC socket (/tmp/chargenui-ipc.sock)
    :return: Parsed response dictionary from CharGenUI, or None on error
    """
    if not os.path.exists(socket_path):
        print(f"[ComfyClient] CharGenUI socket not found at {socket_path}")
        return None

    if not base64_data.startswith("data:image"):
        data_url = f"data:{mime_type};base64,{base64_data}"
    else:
        data_url = base64_data

    payload = {
        "action": "image:attach",
        "payload": {
            "name": prompt_name,
            "imageType": "greeting" if image_type == "greeting" else "avatar",
            "imageDataUrl": data_url
        }
    }

    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
            sock.settimeout(5.0)
            sock.connect(socket_path)
            message = json.dumps(payload) + "\n"
            sock.sendall(message.encode("utf-8"))
            
            # Read reply line
            response_data = b""
            while b"\n" not in response_data:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response_data += chunk
            
            if response_data:
                return json.loads(response_data.decode("utf-8").strip())
    except Exception as e:
        print(f"[ComfyClient] Failed to send image to CharGenUI: {e}")
        return None
```
