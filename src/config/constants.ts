import * as os from "node:os";
import * as path from "node:path";

export const PORT = parseInt(process.env.PORT || "3333", 10);
// PUBLIC_DIR is src/public relative to the project root or import.meta.dir
export const PUBLIC_DIR = path.resolve(import.meta.dir, "..", "public");

export const COMFYCLIENT_SOCKET = process.env.COMFYCLIENT_SOCKET || "/tmp/comfyclient.sock";
export const CHARGEN_IPC_SOCKET = process.env.CHARGEN_IPC_SOCKET || path.join(os.tmpdir(), "chargenui-ipc.sock");

export const DATA_DIR = path.resolve(process.cwd(), "data");
export const CARDS_DIR = path.join(DATA_DIR, "cards");
export const QUEUE_FILE = path.join(DATA_DIR, "image_prompt_queue.json");
export const AUTOSAVE_FILE = path.join(DATA_DIR, ".autosave_card.json");
export const SCRIPTS_DIR = path.resolve(process.cwd(), "scripts");