import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RoleplayCharacter } from "../../types/character";
import type { ProviderConfig } from "../../types/provider";
import { generateCharacterCard } from "../generator/quick-spark";
import { getSavedCard, saveCardRecord } from "../character/card-storage";
import { attachImageToQueueItem } from "../image/prompt-queue";
import { resolveEraInfo, formatEraPromptSnippet } from "../eras/eras-service";

export const PRESET_THEMES = [
  "Dominant / Submissive",
  "Master / Servant",
  "Captor / Captive",
  "Contractual Power Exchange",
  "Sensory Deprivation",
  "Degradation & Praise",
  "Femme Fatale",
  "Kuudere / Cold Analytical",
  "Tsundere / Defiant",
  "Yandere / Obsessive",
  "Gothic Aristocrat",
  "Rogue / Outlaw",
  "Slow Burn",
  "Enemies to Lovers",
  "Forbidden Attraction",
  "Dark Romance",
  "Unrequited Love",
  "Mutual Yearning",
  "Psychological Thriller",
  "Grimdark & Gritty",
  "Melancholic & Tragic",
  "Moral Ambiguity",
  "Wholesome & Cozy",
  "Dry Wit & Sarcasm"
];

export interface SuggestedIdea {
  id: string;
  concept: string;
  genre?: string;
  storyArc?: string;
  archetype?: string;
  themes?: string[];
  era?: string;
  eraData?: {
    id?: string;
    name?: string;
    short_name?: string;
    span?: string;
    category?: string;
    region?: string;
    aesthetic?: string;
    tech?: string;
    social_codes?: string;
    promptSnippet?: string;
  };
  suggestedBy?: string;
  avatar?: string;
  timestamp: string;
  autoGenerate?: boolean;
  characterId?: string;
  characterName?: string;
}

export interface IpcEventMessage {
  type: string;
  payload: any;
  timestamp: string;
}

class ServerIpcManager {
  private wsClients: Set<any> = new Set();
  private unixClients: Set<net.Socket> = new Set();
  private socketBuffers: Map<net.Socket, string> = new Map();
  private unixServer: net.Server | null = null;
  private socketPath: string | null = null;
  private activeIdea: SuggestedIdea | null = null;
  private ideaHistory: SuggestedIdea[] = [];
  private activeCharacter: RoleplayCharacter | null = null;
  private defaultProvider: ProviderConfig = {
    type: (process.env.DEFAULT_PROVIDER_TYPE as any) || (process.env.GEMINI_API_KEY ? "gemini" : "llamacpp"),
    apiKey: process.env.DEFAULT_API_KEY || process.env.GEMINI_API_KEY || "",
    model: process.env.DEFAULT_MODEL || (process.env.GEMINI_API_KEY ? "gemini-2.5-flash" : "local-model"),
    baseUrl: process.env.DEFAULT_BASE_URL || "http://127.0.0.1:8080/v1",
  };

  /**
   * Sets the default provider to use for automated background or IPC generation.
   */
  public setDefaultProvider(provider: ProviderConfig) {
    if (provider && provider.type && provider.type !== "none") {
      this.defaultProvider = { ...provider };
    }
  }

  public getDefaultProvider(): ProviderConfig {
    return { ...this.defaultProvider };
  }

  /**
   * Registers an open WebSocket client connection (existing WebUI and HTTP/WS apps).
   */
  public registerClient(ws: any): void {
    this.wsClients.add(ws);
    // Send welcome payload with current server state and active card
    this.sendToClient(ws, "ipc:connected", {
      server: "CharGenUI IPC Server (Dual Bind: HTTP/WS + Unix Socket)",
      version: "2.5.0",
      transport: "websocket",
      socketPath: this.socketPath,
      activeIdea: this.activeIdea,
      activeCharacterName: this.activeCharacter?.name || null,
      themes: PRESET_THEMES,
    });
  }

  /**
   * Unregisters a disconnected WebSocket client.
   */
  public unregisterClient(ws: any): void {
    this.wsClients.delete(ws);
  }

  /**
   * Registers a connected Unix domain socket client connection (new side apps).
   */
  public registerUnixClient(socket: net.Socket): void {
    this.unixClients.add(socket);
    this.socketBuffers.set(socket, "");

    // Welcome message to Unix client
    this.sendToUnixClient(socket, "ipc:connected", {
      server: "CharGenUI IPC Server (Dual Bind: HTTP/WS + Unix Socket)",
      version: "2.5.0",
      transport: "unix_socket",
      socketPath: this.socketPath,
      activeIdea: this.activeIdea,
      activeCharacterName: this.activeCharacter?.name || null,
      themes: PRESET_THEMES,
    });
  }

  /**
   * Unregisters a disconnected Unix domain socket client.
   */
  public unregisterUnixClient(socket: net.Socket): void {
    this.unixClients.delete(socket);
    this.socketBuffers.delete(socket);
  }

  /**
   * Sends a structured JSON message to a single WebSocket client.
   */
  public sendToClient(ws: any, type: string, payload: any): void {
    try {
      const msg: IpcEventMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(msg));
    } catch (err) {
      this.wsClients.delete(ws);
    }
  }

  /**
   * Sends a structured JSON message to a single Unix domain socket client (newline-delimited).
   */
  public sendToUnixClient(socket: net.Socket, type: string, payload: any): void {
    try {
      if (socket.writable && !socket.destroyed) {
        const msg: IpcEventMessage = {
          type,
          payload,
          timestamp: new Date().toISOString(),
        };
        socket.write(JSON.stringify(msg) + "\n");
      }
    } catch {
      this.unregisterUnixClient(socket);
    }
  }

  /**
   * Broadcasts an event to all connected clients across both transports:
   * 1. Existing WebSocket clients (WebUI, existing desktop apps on HTTP/WS)
   * 2. Unix Domain Socket clients (new side apps, daemons, CLI tools)
   */
  public broadcast(type: string, payload: any): void {
    const msg: IpcEventMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    const serialized = JSON.stringify(msg);

    // 1. WebSocket clients (WebUI, desktop app)
    for (const ws of this.wsClients) {
      try {
        ws.send(serialized);
      } catch {
        this.wsClients.delete(ws);
      }
    }

    // 2. Unix Domain Socket clients (newline-delimited JSON)
    const ndjson = serialized + "\n";
    for (const sock of this.unixClients) {
      try {
        if (sock.writable && !sock.destroyed) {
          sock.write(ndjson);
        } else {
          this.unregisterUnixClient(sock);
        }
      } catch {
        this.unregisterUnixClient(sock);
      }
    }
  }

  /**
   * Handles incoming message from a WebSocket client.
   */
  public async handleMessage(ws: any, rawMessage: string | Buffer): Promise<void> {
    try {
      const text = typeof rawMessage === "string" ? rawMessage : rawMessage.toString("utf-8");
      const data = JSON.parse(text);
      const action = data.action || data.type;
      const payload = data.payload || data;

      switch (action) {
        case "suggest_concept":
        case "idea:submit": {
          const result = await this.submitConcept(payload);
          this.sendToClient(ws, "idea:submitted", result);
          break;
        }

        case "get_active_card":
        case "card:get_active": {
          this.sendToClient(ws, "card:active", { character: this.activeCharacter });
          break;
        }

        case "set_active_card":
        case "card:set_active": {
          if (payload.character) {
            this.setActiveCharacter(payload.character);
          }
          break;
        }

        case "get_themes": {
          this.sendToClient(ws, "themes:list", { themes: PRESET_THEMES });
          break;
        }

        case "ping": {
          this.sendToClient(ws, "pong", { time: Date.now() });
          break;
        }

        default:
          this.sendToClient(ws, "ipc:unknown_action", { action });
      }
    } catch (err: any) {
      this.sendToClient(ws, "ipc:error", { error: err?.message || "Invalid IPC message format" });
    }
  }

  /**
   * Handles incoming message from a Unix domain socket client (newline-delimited JSON).
   */
  public async handleUnixMessage(socket: net.Socket, rawMessage: string | Buffer): Promise<void> {
    try {
      const text = typeof rawMessage === "string" ? rawMessage : rawMessage.toString("utf-8");
      const data = JSON.parse(text);
      const action = data.action || data.type;
      const payload = data.payload || data;
      const reqId = data.reqId || data.requestId;

      const reply = (type: string, resPayload: any) => {
        this.sendToUnixClient(socket, type, reqId ? { ...resPayload, reqId } : resPayload);
      };

      switch (action) {
        case "suggest_concept":
        case "idea:submit": {
          const result = await this.submitConcept(payload);
          reply("idea:submitted", result);
          break;
        }

        case "get_active_card":
        case "card:get_active": {
          reply("card:active", { character: this.activeCharacter });
          break;
        }

        case "set_active_card":
        case "card:set_active": {
          if (payload.character) {
            this.setActiveCharacter(payload.character);
          }
          reply("card:set_success", { name: this.activeCharacter?.name || null });
          break;
        }

        case "get_themes": {
          reply("themes:list", { themes: PRESET_THEMES });
          break;
        }

        case "get_status":
        case "status:get": {
          reply("status:info", this.getStatus());
          break;
        }

        case "get_ideas":
        case "ideas:get": {
          reply("ideas:list", { ideas: this.getRecentIdeas() });
          break;
        }

        case "get_last_idea":
        case "idea:get_last": {
          reply("idea:last", { idea: this.getLastIdea() });
          break;
        }

        case "ping": {
          reply("pong", { time: Date.now() });
          break;
        }

        case "image:generated":
        case "image:attach":
        case "attach_generated_image": {
          const queueId = payload.queueId || payload.id || payload.name;
          const imgData = payload.imageDataUrl || payload.dataUrl || payload.avatarDataUrl || payload.image;
          const imgType = payload.imageType || payload.imagePurpose || (payload.purpose === "greeting_bg" ? "greeting_bg" : payload.purpose === "greeting" ? "greeting" : "avatar");
          const targetCharId = payload.characterId;
          let greetingIndex = typeof payload.greetingIndex === "number" ? payload.greetingIndex : undefined;

          if (!imgData) {
            reply("image:attach_error", { error: "Missing imageDataUrl / image payload" });
            break;
          }

          let attached = null;
          if (queueId) {
            try {
              attached = await attachImageToQueueItem(queueId, imgData, true, imgType === "greeting_bg" ? "greeting_bg" : imgType === "greeting" ? "greeting" : "avatar");
              if (greetingIndex === undefined && typeof attached?.greetingIndex === "number") {
                greetingIndex = attached.greetingIndex;
              }
            } catch (err: any) {
              console.warn("Could not attach to queue item directly:", err.message);
            }
          }
          if (greetingIndex === undefined) {
            greetingIndex = 0;
          }

          // If activeCharacter matches or was specified, update it directly too
          if (this.activeCharacter) {
            if (!this.activeCharacter.extensions) this.activeCharacter.extensions = {};
            if (imgType === "greeting_bg") {
              (this.activeCharacter as any).chat_background = imgData;
              this.activeCharacter.extensions.chat_background = imgData;
              const assets = Array.isArray(this.activeCharacter.assets) ? [...this.activeCharacter.assets] : [];
              const bgUri = "embedded://assets/other/image/chat_background.png";
              if (!assets.some((a) => a.uri === bgUri)) {
                assets.push({
                  type: "background",
                  name: "chat_background",
                  uri: bgUri,
                  ext: "png",
                });
              }
              this.activeCharacter.assets = assets;
            } else if (imgType === "greeting") {
              const assets = Array.isArray(this.activeCharacter.assets) ? [...this.activeCharacter.assets] : [];
              const assetName = greetingIndex > 0 ? `greeting_${String(greetingIndex + 1).padStart(2, "0")}` : "greeting_01";
              const greetingUri = `embedded://assets/other/image/${assetName}.png`;
              if (!assets.some((a) => a.uri === greetingUri)) {
                assets.push({
                  type: "other",
                  name: assetName,
                  uri: greetingUri,
                  ext: "png",
                });
              }
              this.activeCharacter.assets = assets;

              if (greetingIndex === 0) {
                (this.activeCharacter as any).greeting_image = imgData;
                this.activeCharacter.extensions.greeting_image = imgData;
              }

              // Determine gallery tag number
              if (!Array.isArray(this.activeCharacter.extensions.gallery)) {
                this.activeCharacter.extensions.gallery = [];
              }
              const gNum = this.activeCharacter.extensions.gallery.length + 1;
              const galleryTag = `![Gallery image](gallery://image-${gNum})`;

              if (greetingIndex === 0) {
                // Populate first_mes with greeting image markdown tag if not already present
                if (this.activeCharacter.first_mes && !this.activeCharacter.first_mes.includes("gallery://image-")) {
                  this.activeCharacter.first_mes = this.activeCharacter.first_mes.trimEnd() + "\n\n" + galleryTag;
                }
                const charData = (this.activeCharacter as any).data;
                if (charData && charData.first_mes && !charData.first_mes.includes("gallery://image-")) {
                  charData.first_mes = charData.first_mes.trimEnd() + "\n\n" + galleryTag;
                }
              } else {
                // Alternate greeting
                const altIdx = greetingIndex - 1;
                if (!Array.isArray(this.activeCharacter.alternate_greetings)) {
                  this.activeCharacter.alternate_greetings = [];
                }
                if (this.activeCharacter.alternate_greetings[altIdx] !== undefined) {
                  if (!this.activeCharacter.alternate_greetings[altIdx].includes("gallery://image-")) {
                    this.activeCharacter.alternate_greetings[altIdx] = this.activeCharacter.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
                  }
                }
                const charData = (this.activeCharacter as any).data;
                if (charData) {
                  if (!Array.isArray(charData.alternate_greetings)) charData.alternate_greetings = [];
                  if (charData.alternate_greetings[altIdx] !== undefined) {
                    if (!charData.alternate_greetings[altIdx].includes("gallery://image-")) {
                      charData.alternate_greetings[altIdx] = charData.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
                    }
                  }
                }
              }

              // Also persist into extensions.gallery
              if (!this.activeCharacter.extensions.gallery.some((g: any) => g.dataUrl === imgData)) {
                this.activeCharacter.extensions.gallery.push({
                  id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  name: `gallery_image-${gNum}`,
                  dataUrl: imgData,
                  type: "scene",
                  greetingIndex,
                  createdAt: new Date().toISOString(),
                });
              }
            } else {
              this.activeCharacter.avatar = imgData;
              const assets = Array.isArray(this.activeCharacter.assets) ? [...this.activeCharacter.assets] : [];
              if (!assets.some((a) => a.uri === "embedded://assets/icon/image/main.png" || a.type === "icon")) {
                assets.unshift({
                  type: "icon",
                  name: "main",
                  uri: "embedded://assets/icon/image/main.png",
                  ext: "png",
                });
              }
              this.activeCharacter.assets = assets;
            }
            if (this.activeCharacter.id) {
              await saveCardRecord(this.activeCharacter, this.activeCharacter.avatar, this.activeCharacter.id);
            }
          }

          // Broadcast to WebUI and Desktop clients
          this.broadcast("image:attached", {
            queueId,
            imageType: imgType,
            characterName: this.activeCharacter?.name,
            characterId: this.activeCharacter?.id || targetCharId,
            imageDataUrl: imgData,
            greetingIndex,
          });

          reply("image:attach_success", {
            queueId,
            imageType: imgType,
            greetingIndex,
            updatedActiveCard: Boolean(this.activeCharacter),
          });
          break;
        }

        case "synthesize_spine":
        case "spine:synthesize": {
          if (!payload.character) {
            reply("spine:synthesize_error", { error: "Missing character in payload" });
            break;
          }
          if (!this.defaultProvider || this.defaultProvider.type === "none") {
            reply("spine:synthesize_error", { error: "No default provider configured" });
            break;
          }

          try {
            const { synthesizeSpineFromCharacter } = await import("../generator/spine");
            const spine = await synthesizeSpineFromCharacter({
              character: payload.character,
              originalConcept: payload.originalConcept,
              originalStoryArc: payload.originalStoryArc,
              genre: payload.genre,
              themes: payload.themes,
              tone: payload.tone,
              nsfw: payload.nsfw,
              intensity: payload.intensity,
              era: payload.era,
              botMode: payload.botMode,
              provider: this.defaultProvider,
            });

            // Attach spine + creationInputs to character extensions
            const updatedChar: RoleplayCharacter = {
              ...payload.character,
              extensions: {
                ...(payload.character.extensions || {}),
                "chargenui:authoringSpine": spine,
                "chargenui:creationInputs": {
                  concept: payload.originalConcept,
                  genre: payload.genre,
                  themes: payload.themes,
                  tone: payload.tone,
                  nsfw: payload.nsfw,
                  intensity: payload.intensity,
                  era: payload.era,
                  botMode: payload.botMode,
                  storyArc: payload.originalStoryArc,
                },
              },
            };

            this.setActiveCharacter(updatedChar);

            reply("spine:synthesize_success", {
              character: updatedChar,
              spine,
            });
          } catch (err: any) {
            console.error("Spine synthesis failed:", err);
            reply("spine:synthesize_error", { error: err?.message || "Synthesis failed" });
          }
          break;
        }

        default:
          reply("ipc:unknown_action", { action });
      }
    } catch (err: any) {
      this.sendToUnixClient(socket, "ipc:error", { error: err?.message || "Invalid IPC message format" });
    }
  }

  /**
   * Submits a concept from an external idea suggester.
   * Dispatches events to WebUI and optionally triggers immediate character generation.
   */
  public async submitConcept(
    input: {
      concept: string;
      genre?: string;
      storyArc?: string;
      story_arc?: string;
      archetype?: string;
      themes?: string[];
      tags?: string[];
      era?: string;
      botMode?: "single" | "multi_character" | "rpg_world";
      suggestedBy?: string;
      avatar?: string;
      autoGenerate?: boolean;
      provider?: ProviderConfig;
    }
  ): Promise<{ idea: SuggestedIdea; character?: RoleplayCharacter }> {
    if (!input.concept || typeof input.concept !== "string" || !input.concept.trim()) {
      throw new Error("Concept string is required.");
    }

    let resolvedEraData: SuggestedIdea["eraData"] = undefined;
    if (input.era && input.era.trim() && input.era.trim().toLowerCase() !== "off") {
      const trimmedEra = input.era.trim();
      const resolved = resolveEraInfo(trimmedEra);
      if (resolved) {
        resolvedEraData = {
          id: resolved.id,
          name: resolved.name,
          short_name: resolved.short_name,
          span: resolved.span,
          category: resolved.category,
          region: resolved.region,
          aesthetic: resolved.aesthetic,
          tech: resolved.tech,
          social_codes: resolved.social_codes,
          promptSnippet: formatEraPromptSnippet(resolved),
        };
      } else {
        resolvedEraData = {
          id: "custom",
          name: trimmedEra,
          short_name: trimmedEra,
          promptSnippet: formatEraPromptSnippet(trimmedEra),
        };
      }
    }

    const storyArcVal = input.storyArc?.trim() || input.story_arc?.trim() || undefined;

    // Merge themes and tags
    const incomingThemes = Array.isArray(input.themes) ? input.themes : [];
    const incomingTags = Array.isArray(input.tags) ? input.tags : [];
    const mergedThemes = Array.from(new Set([...incomingThemes, ...incomingTags])).filter(Boolean);

    const idea: SuggestedIdea = {
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      concept: input.concept.trim(),
      genre: input.genre?.trim() || undefined,
      storyArc: storyArcVal,
      archetype: input.archetype?.trim(),
      themes: mergedThemes,
      era: input.era?.trim() || undefined,
      eraData: resolvedEraData,
      suggestedBy: input.suggestedBy || "Idea Suggester QML App",
      avatar: input.avatar,
      timestamp: new Date().toISOString(),
      autoGenerate: !!input.autoGenerate,
    };

    this.activeIdea = idea;
    this.ideaHistory.unshift(idea);
    if (this.ideaHistory.length > 50) this.ideaHistory.pop();

    // Broadcast idea:received to all connected clients
    this.broadcast("idea:received", { idea });

    let character: RoleplayCharacter | undefined;

    // If autoGenerate is requested, run character generation immediately
    if (input.autoGenerate) {
      try {
        const providerToUse: ProviderConfig = (input.provider && input.provider.type !== "none")
          ? input.provider
          : this.getDefaultProvider();

        character = await generateCharacterCard({
          concept: idea.concept,
          genre: idea.genre,
          storyArc: idea.storyArc,
          themes: idea.themes,
          era: idea.era,
          botMode: input.botMode || "single",
          format: "prose",
          provider: providerToUse,
        });

        if (idea.avatar) {
          character.avatar = idea.avatar;
        }

        idea.characterId = character.id;
        idea.characterName = character.name;
        this.activeCharacter = character;

        // Broadcast character:generated so WebUI and Desktop apps can load it immediately
        this.broadcast("character:generated", {
          ideaId: idea.id,
          character,
        });
      } catch (err: any) {
        console.warn("Auto-generation of suggested idea failed:", err?.message);
        this.broadcast("idea:generation_error", {
          ideaId: idea.id,
          error: err?.message || "Generation error",
        });
      }
    }

    return { idea, character };
  }

  public getActiveCharacter(): RoleplayCharacter | null {
    return this.activeCharacter;
  }

  public setActiveCharacter(char: RoleplayCharacter): void {
    this.activeCharacter = char;
    this.broadcast("character:changed", { character: char });
  }

  public getLastIdea(): SuggestedIdea | null {
    return this.activeIdea;
  }

  public getRecentIdeas(): SuggestedIdea[] {
    return this.ideaHistory;
  }

  public getClientCount(): number {
    return this.wsClients.size + this.unixClients.size;
  }

  public getSocketPath(): string | null {
    return this.socketPath;
  }

  /**
   * Binds and starts the Unix Domain Socket IPC server for local side apps.
   */
  public startUnixServer(customSocketPath?: string): net.Server {
    if (this.unixServer) {
      return this.unixServer;
    }

    const defaultPath = path.join(os.tmpdir(), "chargenui-ipc.sock");
    const socketPath = customSocketPath || process.env.CHARGEN_IPC_SOCKET || defaultPath;
    this.socketPath = socketPath;

    // Unlink old socket file if it exists
    try {
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    } catch (e: any) {
      console.warn(`Could not unlink stale socket ${socketPath}:`, e.message);
    }

    this.unixServer = net.createServer((socket) => {
      this.registerUnixClient(socket);

      socket.on("data", (chunk: Buffer) => {
        const curBuf = (this.socketBuffers.get(socket) || "") + chunk.toString("utf-8");
        const lines = curBuf.split("\n");
        const remaining = lines.pop() || "";
        this.socketBuffers.set(socket, remaining);

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.handleUnixMessage(socket, trimmed);
          }
        }
      });

      socket.on("close", () => {
        this.unregisterUnixClient(socket);
      });

      socket.on("error", () => {
        this.unregisterUnixClient(socket);
      });
    });

    this.unixServer.listen(socketPath, () => {
      try {
        fs.chmodSync(socketPath, 0o777);
      } catch {}
      console.log(`🔌 Unix Domain Socket IPC bound to: ${socketPath}`);
    });

    this.unixServer.on("error", (err: any) => {
      console.error(`Unix Domain Socket IPC error on ${socketPath}:`, err.message);
    });

    return this.unixServer;
  }

  /**
   * Stops the Unix Domain Socket IPC server and unlinks the socket file.
   */
  public stopUnixServer(): void {
    if (this.unixServer) {
      for (const sock of this.unixClients) {
        try {
          sock.end();
          sock.destroy();
        } catch {}
      }
      this.unixClients.clear();
      this.socketBuffers.clear();

      try {
        this.unixServer.close();
      } catch {}
      this.unixServer = null;
    }

    if (this.socketPath) {
      try {
        if (fs.existsSync(this.socketPath)) {
          fs.unlinkSync(this.socketPath);
        }
      } catch {}
    }
  }

  public getStatus(): any {
    return {
      status: "online",
      server: "CharGenUI IPC Server (Dual Bind: HTTP/WS + Unix Socket)",
      connectedClients: this.wsClients.size + this.unixClients.size,
      connectedWsClients: this.wsClients.size,
      connectedUnixClients: this.unixClients.size,
      socketPath: this.socketPath || null,
      activeIdea: this.activeIdea,
      activeCharacterName: this.activeCharacter?.name || null,
      availableThemesCount: PRESET_THEMES.length,
      timestamp: new Date().toISOString(),
    };
  }
}

export const serverIpc = new ServerIpcManager();
