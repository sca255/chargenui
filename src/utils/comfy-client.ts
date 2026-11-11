import * as fs from "node:fs";
import * as net from "node:net";

export const COMFYCLIENT_SOCKET = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";

/** Executes a JSON-RPC 2.0 call over the ComfyClient Unix domain socket. */
export function sendComfyClientRPC(method: string, params: Record<string, any> = {}, timeoutMs = 8000): Promise<any> {
  const socketPath = COMFYCLIENT_SOCKET;
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(socketPath)) {
      return reject(new Error(`ComfyClient socket not active at ${socketPath}`));
    }
    const client = net.connect(socketPath);
    let buf = "";
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("ComfyClient IPC timeout"));
    }, timeoutMs);

    client.on("connect", () => {
      const reqMsg = JSON.stringify({
        jsonrpc: "2.0",
        id: `rpc_${Date.now()}`,
        method,
        params,
      }) + "\n";
      client.write(reqMsg);
    });

    client.on("data", (chunk) => {
      buf += chunk.toString();
      if (buf.includes("\n")) {
        clearTimeout(timer);
        client.end();
        try {
          const parsed = JSON.parse(buf.trim());
          if (parsed.error) {
            reject(new Error(parsed.error.message || "ComfyClient RPC error"));
          } else {
            resolve(parsed.result);
          }
        } catch (err) {
          reject(err);
        }
      }
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Push a single item to comfyclient over IPC via save_prompt. Silently no-ops if comfyclient is offline. */
export function pushToComfyClientIPC(item: Record<string, any>): void {
  const socketPath = COMFYCLIENT_SOCKET;
  if (!fs.existsSync(socketPath)) return;
  let name = item.name;
  if (!name) {
    const charName = item.characterName || "Character";
    const purpose = item.imagePurpose || "avatar";
    const purposeLabel =
      purpose === "greeting_bg" ? "Chat BG" :
      purpose === "greeting" ? "Greeting Scene" :
      purpose === "scenario_avatar" ? "Scenario Profile" :
      "Avatar";
    const shortId = item.id ? String(item.id).replace(/^ipq_\d+_?/, "").slice(0, 5) : "";
    name = shortId ? `${charName} - ${purposeLabel} (${shortId})` : `${charName} - ${purposeLabel}`;
  }
  sendComfyClientRPC("save_prompt", { ...item, name, id: item.id }).catch(() => {});
}