import type { RequestHandler } from "../utils/router";
import type { RoleplayCharacter } from "../types/character";
import { parseCharacterFromInput } from "../services/character/card-parser";
import {
  characterToCardV2,
  characterToCardV3,
} from "../services/character/card-parser";
import { writePngCharaCard } from "../services/character/png-card";
import { generateProceduralPngAvatar } from "../services/character/procedural-avatar";
import { createCharxArchive } from "../services/character/charx-container";
import * as Buffer from "node:buffer";

export const cardRoutes: RequestHandler[] = [
  {
    method: "POST",
    path: "/api/parse-card",
    handler: async (req) => {
      const contentType = req.headers.get("content-type") || "";

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) {
          return Response.json({ error: "No file provided" }, { status: 400 });
        }
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const parsed = parseCharacterFromInput(uint8, file.name);
        return Response.json(parsed);
      } else {
        const body = (await req.json().catch(() => ({})))  as { data: string; filename?: string };
        let raw: Uint8Array | string = body.data;
        if (body.data.startsWith("data:image/")) {
          const b64 = body.data.replace(/^data:[^;]+;base64,/, "");
          raw = new Uint8Array(Buffer.Buffer.from(b64, "base64"));
        }
        const parsed = parseCharacterFromInput(raw, body.filename);
        return Response.json(parsed);
      }
    },
  },
  {
    method: "POST",
    path: "/api/export-png",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter; avatarDataUrl?: string };
      const cardV2 = characterToCardV2(body.character);
      const cardV3 = characterToCardV3(body.character);

      let basePng: Uint8Array;
      if (body.avatarDataUrl && body.avatarDataUrl.startsWith("data:image/png;base64,")) {
        const b64 = body.avatarDataUrl.replace(/^data:image\/png;base64,/, "");
        basePng = new Uint8Array(Buffer.Buffer.from(b64, "base64"));
      } else if (body.character.avatar && body.character.avatar.startsWith("data:image/png;base64,")) {
        const b64 = body.character.avatar.replace(/^data:image\/png;base64,/, "");
        basePng = new Uint8Array(Buffer.Buffer.from(b64, "base64"));
      } else {
        basePng = generateProceduralPngAvatar(body.character);
      }

      const embeddedPng = writePngCharaCard(basePng, cardV2, cardV3);
      return new Response(embeddedPng as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(body.character.name || "character")}.png"`,
        },
      });
    },
  },
  {
    method: "POST",
    path: "/api/export-charx",
    handler: async (req) => {
      const body = (await req.json().catch(() => ({})))  as { character: RoleplayCharacter; avatarDataUrl?: string };
      let avatarPngBytes: Uint8Array | undefined;
      const avatarUrl = body.avatarDataUrl || body.character.avatar;
      if (avatarUrl && avatarUrl.startsWith("data:image/png;base64,")) {
        const b64 = avatarUrl.replace(/^data:image\/png;base64,/, "");
        avatarPngBytes = new Uint8Array(Buffer.Buffer.from(b64, "base64"));
      } else {
        avatarPngBytes = generateProceduralPngAvatar(body.character);
      }

      const charxZip = createCharxArchive(body.character, avatarPngBytes);
      return new Response(charxZip as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(body.character.name || "character")}.charx"`,
        },
      });
    },
  },
];