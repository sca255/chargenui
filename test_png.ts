// Test PNG chunk reader and writer
import { Buffer } from "node:buffer";
import * as zlib from "node:zlib";

// CRC32 implementation for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
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

export function extractPngMetadata(buffer: Uint8Array): Record<string, string> {
  const metadata: Record<string, string> = {};
  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
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
      if (nullIdx !== -1 && chunkData[nullIdx + 1] === 0) { // compression method 0 = deflate
        const keyword = new TextDecoder().decode(chunkData.slice(0, nullIdx));
        try {
          const decompressed = zlib.inflateSync(Buffer.from(chunkData.slice(nullIdx + 2)));
          metadata[keyword] = decompressed.toString("utf-8");
        } catch {}
      }
    }

    offset = dataEnd + 4; // Skip CRC (4 bytes)
    if (type === "IEND") break;
  }

  return metadata;
}

export function writePngCharaChunk(pngBuffer: Uint8Array, charaJson: string): Uint8Array {
  // Base64 encode JSON
  const b64 = Buffer.from(charaJson, "utf-8").toString("base64");
  const keyword = "chara";
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(b64);

  // tEXt chunk data: keyword + 0x00 + text
  const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0;
  chunkData.set(textBytes, keywordBytes.length + 1);

  // Chunk type 'tEXt'
  const chunkType = new TextEncoder().encode("tEXt");

  // Calculate CRC over type + data
  const crcPayload = new Uint8Array(4 + chunkData.length);
  crcPayload.set(chunkType, 0);
  crcPayload.set(chunkData, 4);
  const chunkCrc = crc32(crcPayload);

  // Assemble chunk: 4 bytes length, 4 bytes type, data, 4 bytes crc
  const chunk = new Uint8Array(8 + chunkData.length + 4);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, chunkData.length);
  chunk.set(chunkType, 4);
  chunk.set(chunkData, 8);
  chunkView.setUint32(8 + chunkData.length, chunkCrc);

  // Locate insertion point: right after IHDR chunk
  // IHDR chunk is length (4) + type (4) + 13 bytes data + crc (4) = 25 bytes.
  // PNG sig is 8 bytes. So IHDR ends at 8 + 25 = 33.
  const insertOffset = 33;
  if (pngBuffer.length < insertOffset) {
    throw new Error("Invalid PNG: too short for IHDR");
  }

  const result = new Uint8Array(pngBuffer.length + chunk.length);
  result.set(pngBuffer.slice(0, insertOffset), 0);
  result.set(chunk, insertOffset);
  result.set(pngBuffer.slice(insertOffset), insertOffset + chunk.length);
  return result;
}

console.log("PNG metadata parser and writer initialized successfully!");
