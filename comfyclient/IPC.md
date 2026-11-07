# ComfyClient IPC Protocol

ComfyClient exposes a JSON-RPC 2.0 server over a **Unix domain socket** (Linux/macOS) or a **named pipe** (Windows). The main app connects to this socket to push prompts and edit the workflow queue.

## Transport

- Newline-delimited JSON (`\n` frame separator) over `SOCK_STREAM`.
- Low-level socket API — no high-level HTTP fetcher. Image-run timeouts are set by the caller and may be **as long as needed** (recommended `600s` default, `3600s` max).
- One persistent connection per client; each request is matched to its reply by `id`.

## Message formats

Request:
```json
{"jsonrpc": "2.0", "id": 1, "method": "run_prompt", "params": {"name": "avatar_01"}}
```

Result:
```json
{"jsonrpc": "2.0", "id": 1, "result": {"name": "avatar_01", "queued": true}}
```

Error:
```json
{"jsonrpc": "2.0", "id": 1, "error": {"code": -32601, "message": "Method 'run_prompt' not found"}}
```

## Methods

| Method | Params | Result | Description |
|--------|--------|--------|-------------|
| `ping` | — | `{ok, server}` | Liveness check |
| `list_prompts` | — | `{prompts: [str]}` | All prompt names in the queue |
| `load_prompt` | `{name}` | `{name, imagePurpose, workflow, lora}` | Fetch a workflow by name |
| `run_prompt` | `{name}` | `{name, queued, workflow}` | Queue a ComfyUI run (caller owns the long timeout) |
| `get_status` | — | `{running, prompts, socket_path}` | Server + queue status |
| `image:attach` | `{name|queueId, imageType, imageDataUrl}` | `{type: "image:attach_success", payload: {queueId, imageType, updatedActiveCard}}` | Push a completed image back to CharGenUI |
| custom | — | handler return | Register via `srv.register(name, fn)` |

## Queue item schema (replaces `image_prompt_queue.json`)

```json
{
  "name": "avatar_01",
  "imagePurpose": "avatar",
  "workflow": { "<comfyui graph json>" },
  "lora": [{"name": "sdxl_v0.6", "weight": 1.0}]
}
```

The queue file defaults to `data/image_prompt_queue.json` and is the single source of truth edited by the GUI and read/written over IPC.

## Connecting (main app)

```python
from comfyclient import ComfyClient

client = ComfyClient("/tmp/comfyclient.sock")
client.connect()
print(client.list_prompts())
print(client.run_prompt("avatar_01", timeout=3600))
client.close()
```

## Image return (post-render)

After a ComfyUI run finishes, push the generated image back into CharGenUI.
See `CHARGEN_IMAGE_IPC.md` for the full spec. Two transports are provided:

```python
# Option A — one-shot client aimed at CharGenUI's own socket:
from comfyclient import CharGenImageClient

client = CharGenImageClient()  # defaults to $CHARGEN_IPC_SOCKET or /tmp/chargenui-ipc.sock
reply = client.send_image("avatar_01", b64_png, image_type="avatar")
# -> {"type": "image:attach_success", "payload": {"queueId": "avatar_01", ...}}
```

The `image:attach` method is also available over the ComfyClient socket
(`ComfyClient.send_image(...)`) — the server marks the queue item completed and
returns the same `image:attach_success` payload.

## Running the server

```bash
python -m comfyclient --socket /tmp/comfyclient.sock --gui
```

`--gui` opens the QML editor (`qml/Main.qml`) bound to the same queue file the server serves over IPC.

## Queue & settings methods (added)

Same transport and framing as above. Existing methods are unchanged;
`list_prompts` still returns `prompts` and now also `items` and `runner`.

| Method | Params | Result |
| --- | --- | --- |
| `list_prompts` | – | `{prompts, items:[{name,imagePurpose,completed,status,error,outputs}], runner:{current,pending}}` |
| `save_prompt` | `{name, imagePurpose?, workflow?, lora?, params?}` | saved item (runtime fields kept) |
| `delete_prompt` | `{name}` | `{deleted, name}` |
| `run_prompt` | `{name}` | `{name, queued, workflow}` — now really queues the job (`queued:false` if already queued) |
| `run_all` | – | `{queued:[names]}` — everything not already `done` |
| `cancel_prompt` | `{name}` | `{name, cancelled}` — pending: removed; running: interrupts ComfyUI |
| `cancel_all` | – | `{cancelled}` |
| `get_settings` / `set_settings` | `{comfyUrl?, timeout?}` | current settings (`timeout` seconds, 0 = none) |
| `list_models` | – | `{checkpoints, samplers, schedulers, error}` from ComfyUI; never errors |

`params` keys: `checkpoint, positive, negative, seed (-1 = random), steps, cfg, sampler, scheduler, width, height`.
They override matching values in `workflow`; an empty workflow uses the built-in txt2img graph.

Item `status`: `pending → running → done | failed | cancelled`. `done` means ComfyUI produced
images (`outputs: [{filename, subfolder, type}]`); `completed` still means CharGenUI ingested one
via `image:attach`. Items left `pending`/`running` at startup are marked `failed` ("interrupted by restart").
Settings are stored in `settings.json` next to the queue file.

### Placeholders in custom workflows

If the workflow JSON contains `{{name}}` markers, they are replaced at run time and nothing else is
auto-patched. Names: `prompt` (or `positive`), `negative`, `seed`, `steps`, `cfg`, `width`, `height`,
`checkpoint` (or `model`), `sampler`, `scheduler`. A string that is only a marker becomes a real number
for numeric names (`"seed": "{{seed}}"` → `"seed": 1234`); inside longer text it is substituted as text.
Unknown `{{names}}` are left untouched.

An empty marker inside longer text is removed cleanly: `"lowres, {{negative}}"` with no negative
becomes `"lowres"` (no dangling comma). Put your fixed base text next to the marker to keep it.
