import { Buffer } from "node:buffer";
import * as zlib from "node:zlib";
import type { TavernCardV2, TavernCardV3, RoleplayCharacter } from "../../types/character";

// CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Extracts raw string text chunks from a PNG buffer
 */
export function extractPngChunks(buffer: Uint8Array): Record<string, string> {
  const metadata: Record<string, string> = {};
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== sig[i]) return metadata;
  }

  let offset = 8;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  while (offset + 8 <= buffer.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7]
    );
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;
    if (dataEnd > buffer.length) break;

    if (type === "tEXt") {
      const chunkData = buffer.slice(dataOffset, dataEnd);
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIdx));
        const text = new TextDecoder().decode(chunkData.slice(nullIdx + 1));
        metadata[keyword] = text;
      }
    } else if (type === "zTXt") {
      const chunkData = buffer.slice(dataOffset, dataEnd);
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1 && chunkData[nullIdx + 1] === 0) {
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIdx));
        try {
          const decompressed = zlib.inflateSync(Buffer.from(chunkData.slice(nullIdx + 2)));
          metadata[keyword] = decompressed.toString("utf-8");
        } catch {}
      }
    }

    offset = dataEnd + 4; // skip CRC
    if (type === "IEND") break;
  }

  return metadata;
}

function buildPngTextChunk(keyword: string, textPayload: string): Uint8Array {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(textPayload);

  const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0;
  chunkData.set(textBytes, keywordBytes.length + 1);

  const chunkType = new TextEncoder().encode("tEXt");

  const crcPayload = new Uint8Array(4 + chunkData.length);
  crcPayload.set(chunkType, 0);
  crcPayload.set(chunkData, 4);
  const chunkCrc = crc32(crcPayload);

  const chunk = new Uint8Array(8 + chunkData.length + 4);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, chunkData.length);
  chunk.set(chunkType, 4);
  chunk.set(chunkData, 8);
  chunkView.setUint32(8 + chunkData.length, chunkCrc);

  return chunk;
}

/**
 * Extracts a Tavern Card (V3, V2, or V1) from a PNG buffer
 */
export function extractCardFromPngBuffer(buffer: Uint8Array): TavernCardV3 | TavernCardV2 | null {
  const chunks = extractPngChunks(buffer);

  // Check 'ccv3' keyword first (V3 standard)
  if (chunks.ccv3) {
    try {
      const decodedJson = Buffer.from(chunks.ccv3, "base64").toString("utf-8");
      const parsed = JSON.parse(decodedJson);
      if (parsed.spec === "chara_card_v3" && parsed.data) {
        return parsed as TavernCardV3;
      }
      if (parsed.spec === "chara_card_v2" && parsed.data) {
        return parsed as TavernCardV2;
      }
    } catch {}
  }

  // Check 'chara' keyword (V2 standard)
  if (chunks.chara) {
    try {
      const decodedJson = Buffer.from(chunks.chara, "base64").toString("utf-8");
      const parsed = JSON.parse(decodedJson);
      if (parsed.spec === "chara_card_v3" && parsed.data) {
        return parsed as TavernCardV3;
      }
      if (parsed.spec === "chara_card_v2" && parsed.data) {
        return parsed as TavernCardV2;
      }
      // V1 format wrapped into V2 structure
      return {
        spec: "chara_card_v2",
        spec_version: "2.0",
        data: {
          name: parsed.name || "",
          description: parsed.description || "",
          personality: parsed.personality || "",
          scenario: parsed.scenario || "",
          first_mes: parsed.first_mes || "",
          mes_example: parsed.mes_example || "",
          creator_notes: parsed.creator_notes || "",
          system_prompt: "",
          post_history_instructions: parsed.post_history_instructions || parsed.system_prompt || "",
          alternate_greetings: parsed.alternate_greetings || [],
          tags: parsed.tags || [],
        },
      };
    } catch (e) {
      console.warn("Failed to parse chara chunk:", e);
    }
  }

  return null;
}

/**
 * Injects a Tavern Card JSON into a PNG buffer.
 * Automatically injects BOTH 'chara' (V2 spec) and 'ccv3' (V3 spec) chunks
 * ensuring universal cross-platform compatibility across all frontends.
 */
export function writePngCharaCard(
  pngBuffer: Uint8Array,
  cardV2: TavernCardV2,
  cardV3?: TavernCardV3
): Uint8Array {
  // 1. Build V2 'chara' chunk
  const jsonStrV2 = JSON.stringify(cardV2);
  const b64V2 = Buffer.from(jsonStrV2, "utf-8").toString("base64");
  const chunkChara = buildPngTextChunk("chara", b64V2);

  // 2. Build V3 'ccv3' chunk
  const v3Data: TavernCardV3 = cardV3 || {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      ...cardV2.data,
      nickname: cardV2.data.name,
      group_only_greetings: [],
      creation_date: new Date().toISOString(),
      modification_date: new Date().toISOString(),
      assets: [
        {
          type: "icon",
          uri: "embedded://assets/icon.png",
          name: "main",
          ext: "png",
        },
      ],
      extensions: cardV2.data.extensions || { fav: false, world: "" },
    },
  };
  const jsonStrV3 = JSON.stringify(v3Data);
  const b64V3 = Buffer.from(jsonStrV3, "utf-8").toString("base64");
  const chunkCcv3 = buildPngTextChunk("ccv3", b64V3);

  // Remove existing 'chara' or 'ccv3' chunks to avoid duplication
  const cleanedChunks: Uint8Array[] = [];
  const sig = pngBuffer.slice(0, 8);
  cleanedChunks.push(sig);

  let offset = 8;
  const view = new DataView(pngBuffer.buffer, pngBuffer.byteOffset, pngBuffer.byteLength);

  let ihdrHandled = false;

  while (offset + 8 <= pngBuffer.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      pngBuffer[offset + 4],
      pngBuffer[offset + 5],
      pngBuffer[offset + 6],
      pngBuffer[offset + 7]
    );
    const chunkFullLength = 12 + length;
    const rawChunk = pngBuffer.slice(offset, offset + chunkFullLength);

    if (type === "IHDR") {
      cleanedChunks.push(rawChunk);
      // Immediately append both our new chara (V2) and ccv3 (V3) chunks after IHDR
      cleanedChunks.push(chunkChara);
      cleanedChunks.push(chunkCcv3);
      ihdrHandled = true;
    } else if (type === "tEXt" || type === "zTXt") {
      const data = pngBuffer.slice(offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf(0);
      const kw = nullIdx !== -1 ? new TextDecoder().decode(data.slice(0, nullIdx)) : "";
      if (kw !== "chara" && kw !== "ccv3") {
        cleanedChunks.push(rawChunk);
      }
    } else {
      cleanedChunks.push(rawChunk);
    }

    offset += chunkFullLength;
    if (type === "IEND") break;
  }

  // If IHDR was not found (malformed), fallback to standard insertion
  if (!ihdrHandled) {
    const result = new Uint8Array(pngBuffer.length + chunkChara.length + chunkCcv3.length);
    result.set(pngBuffer.slice(0, 33), 0);
    result.set(chunkChara, 33);
    result.set(chunkCcv3, 33 + chunkChara.length);
    result.set(pngBuffer.slice(33), 33 + chunkChara.length + chunkCcv3.length);
    return result;
  }

  // Combine cleaned chunks
  const totalLength = cleanedChunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let cur = 0;
  for (const c of cleanedChunks) {
    out.set(c, cur);
    cur += c.length;
  }
  return out;
}

/**
 * Creates a minimal 1x1 transparent PNG if no image is supplied
 */
export function createBlankPngBuffer(): Uint8Array {
  // 1x1 PNG transparent
  return new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0,
    0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0, 2, 0, 1,
    229, 39, 222, 250, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
  ]);
}
