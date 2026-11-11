import net from "node:net";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { RoleplayCharacter } from "../../types/character";

export interface CharGenUnixClientOptions {
  socketPath?: string;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
}

/**
 * High-performance Unix Domain Socket client for new side apps, daemons, and microservices
 * communicating directly with the CharGenUI backend.
 */
export class CharGenUnixClient extends EventEmitter {
  private socketPath: string;
  private socket: net.Socket | null = null;
  private buffer: string = "";
  private autoReconnect: boolean;
  private reconnectIntervalMs: number;
  private isClosing: boolean = false;
  private pendingRequests: Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: any }
  > = new Map();

  constructor(options: CharGenUnixClientOptions = {}) {
    super();
    this.socketPath =
      options.socketPath ||
      process.env.CHARGEN_IPC_SOCKET ||
      path.join(os.tmpdir(), "chargenui-ipc.sock");
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 2000;
  }

  public getSocketPath(): string {
    return this.socketPath;
  }

  public isConnected(): boolean {
    return Boolean(this.socket && this.socket.writable && !this.socket.destroyed);
  }

  /**
   * Connects to the CharGenUI Unix Domain Socket.
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isClosing = false;
      this.socket = net.connect(this.socketPath);

      this.socket.once("connect", () => {
        this.emit("connect");
        resolve();
      });

      this.socket.once("error", (err) => {
        if (!this.socket?.connecting) {
          reject(err);
        }
      });

      this.socket.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString("utf-8");
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              const msg = JSON.parse(trimmed);
              this.handleIncoming(msg);
            } catch (e: any) {
              this.emit("error", new Error(`Failed to parse IPC message: ${e.message}`));
            }
          }
        }
      });

      this.socket.on("close", () => {
        this.socket = null;
        this.emit("disconnect");
        if (this.autoReconnect && !this.isClosing) {
          setTimeout(() => {
            if (!this.isClosing) {
              this.connect().catch(() => {});
            }
          }, this.reconnectIntervalMs);
        }
      });

      this.socket.on("error", (err) => {
        this.emit("error", err);
      });
    });
  }

  private handleIncoming(msg: { type: string; payload: any; timestamp: string }) {
    // If response payload contains a reqId, resolve matching pending request
    const reqId = msg.payload?.reqId;
    if (reqId && this.pendingRequests.has(reqId)) {
      const pending = this.pendingRequests.get(reqId)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(reqId);
      if (msg.type === "ipc:error") {
        pending.reject(new Error(msg.payload?.error || "IPC Error"));
      } else {
        pending.resolve(msg.payload);
      }
    }

    // Always emit the event by type as well as generic 'message'
    this.emit(msg.type, msg.payload);
    this.emit("message", msg);
  }

  /**
   * Sends an action request over the Unix domain socket and awaits the typed response.
   */
  public send(action: string, payload?: any, timeoutMs: number = 10000): Promise<any> {
    if (!this.socket || !this.socket.writable) {
      return Promise.reject(new Error(`Unix socket client is not connected to ${this.socketPath}`));
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const msg = {
      action,
      reqId,
      payload,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`IPC request '${action}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, { resolve, reject, timer });
      this.socket!.write(JSON.stringify(msg) + "\n");
    });
  }

  public async ping(): Promise<{ time: number }> {
    return await this.send("ping");
  }

  public async getStatus(): Promise<any> {
    return await this.send("get_status");
  }

  public async getThemes(): Promise<{ themes: string[] }> {
    return await this.send("get_themes");
  }

  public async getActiveCard(): Promise<{ character: RoleplayCharacter | null }> {
    return await this.send("get_active_card");
  }

  public async setActiveCard(character: RoleplayCharacter): Promise<{ name: string | null }> {
    return await this.send("set_active_card", { character });
  }

  public async suggestConcept(input: {
    concept: string;
    archetype?: string;
    themes?: string[];
    era?: string;
    suggestedBy?: string;
    autoGenerate?: boolean;
  }): Promise<{ idea: any; character?: RoleplayCharacter }> {
    return await this.send("suggest_concept", input, 60000);
  }

  public async getLastIdea(): Promise<{ idea: any }> {
    return await this.send("get_last_idea");
  }

  public async getIdeas(): Promise<{ ideas: any[] }> {
    return await this.send("get_ideas");
  }

  /**
   * Closes the Unix domain socket connection cleanly.
   */
  public close(): void {
    this.isClosing = true;
    for (const [_, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Socket client closed."));
    }
    this.pendingRequests.clear();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}
