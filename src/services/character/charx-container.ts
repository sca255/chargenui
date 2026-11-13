import * as zlib from "node:zlib";
import { Buffer } from "node:buffer";
import type { RoleplayCharacter, TavernCardV3 } from "../../types/character";
import { characterToCardV3, cardV3ToCharacter } from "./card-parser";

/**
 * Pure TypeScript ZIP Archive Packer & Unpacker (Zero Dependencies)
 * Conforms to standard PKZIP specification for .charx (Character Card V3) files.
 */

export interface ZipFileEntry {
  name: string;
  data: Uint8Array | Buffer | string;
}

function computeCrc32(data: Buffer): number {
  return zlib.crc32(data);
}

/**
 * Creates a valid ZIP buffer from an array of file entries
 */
export function createZipArchive(files: ZipFileEntry[]): Uint8Array {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, "utf-8");
    const dataBuf = Buffer.isBuffer(file.data)
      ? file.data
      : typeof file.data === "string"
      ? Buffer.from(file.data, "utf-8")
      : Buffer.from(file.data);

    const uncompressedSize = dataBuf.length;
    const fileCrc = computeCrc32(dataBuf);
    const compressedData = zlib.deflateRawSync(dataBuf);
    const compressedSize = compressedData.length;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 filename flag (bit 11)
    localHeader.writeUInt16LE(8, 8);          // Compression: Deflate
    localHeader.writeUInt16LE(0, 10);         // Last mod time
    localHeader.writeUInt16LE(0, 12);         // Last mod date
    localHeader.writeUInt32LE(fileCrc, 14);   // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    filenameBuf.copy(localHeader, 30);

    const localRecord = Buffer.concat([localHeader, compressedData]);
    localHeaders.push(localRecord);

    // Central directory header (46 bytes + filename)
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    cdHeader.writeUInt16LE(20, 4);         // Version made by: 2.0
    cdHeader.writeUInt16LE(20, 6);         // Version needed: 2.0
    cdHeader.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    cdHeader.writeUInt16LE(8, 10);         // Compression: Deflate
    cdHeader.writeUInt16LE(0, 12);         // Time
    cdHeader.writeUInt16LE(0, 14);         // Date
    cdHeader.writeUInt32LE(fileCrc, 16);   // CRC-32
    cdHeader.writeUInt32LE(compressedSize, 20);
    cdHeader.writeUInt32LE(uncompressedSize, 24);
    cdHeader.writeUInt16LE(filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);         // Extra field length
    cdHeader.writeUInt16LE(0, 32);         // Comment length
    cdHeader.writeUInt16LE(0, 34);         // Disk start
    cdHeader.writeUInt16LE(0, 36);         // Internal attrs
    cdHeader.writeUInt32LE(0, 38);         // External attrs
    cdHeader.writeUInt32LE(offset, 42);    // Relative offset of local header
    filenameBuf.copy(cdHeader, 46);

    centralHeaders.push(cdHeader);
    offset += localRecord.length;
  }

  const cdBuf = Buffer.concat(centralHeaders);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of Central Directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // Disk number
  eocd.writeUInt16LE(0, 6);                // Start disk
  eocd.writeUInt16LE(files.length, 8);     // Entries on disk
  eocd.writeUInt16LE(files.length, 10);    // Total entries
  eocd.writeUInt32LE(cdSize, 12);          // CD size
  eocd.writeUInt32LE(cdOffset, 16);        // CD offset
  eocd.writeUInt16LE(0, 20);               // Comment length

  return new Uint8Array(Buffer.concat([...localHeaders, cdBuf, eocd]));
}

/**
 * Extracts all files from a ZIP buffer
 */
export function extractZipArchive(buffer: Uint8Array): Record<string, Buffer> {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const files: Record<string, Buffer> = {};
  let offset = 0;

  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Reached end of local files

    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const fnameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);

    const filename = buf.toString("utf-8", offset + 30, offset + 30 + fnameLen);
    const dataStart = offset + 30 + fnameLen + extraLen;
    const rawData = buf.slice(dataStart, dataStart + compSize);

    let fileData: Buffer;
    if (compression === 8) {
      fileData = zlib.inflateRawSync(rawData);
    } else {
      fileData = rawData;
    }

    files[filename] = fileData;
    offset = dataStart + compSize;
  }

  return files;
}

/**
 * Creates a standard .charx archive containing card.json (V3 spec) and assets/icon.png
 */
export function createCharxArchive(
  character: RoleplayCharacter,
  avatarPngBytes?: Uint8Array
): Uint8Array {
  const cardV3: TavernCardV3 = characterToCardV3(character);
  const files: ZipFileEntry[] = [];

  // 1. Primary avatar
  let primaryAvatarData: Buffer | null = null;
  let primaryAvatarExt = "avif";
  if (avatarPngBytes && avatarPngBytes.length > 0) {
    primaryAvatarData = Buffer.from(avatarPngBytes);
    // Detect PNG header (0x89 0x50 0x4E 0x47)
    if (primaryAvatarData[0] === 0x89 && primaryAvatarData[1] === 0x50) {
      primaryAvatarExt = "png";
    }
  } else if (character.avatar && character.avatar.startsWith("data:image/")) {
    const mimeMatch = character.avatar.match(/^data:image\/([a-zA-Z0-9.-]+);base64,/);
    if (mimeMatch) {
      primaryAvatarExt = mimeMatch[1].replace("jpeg", "jpg");
    }
    const rawB64 = character.avatar.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, "");
    primaryAvatarData = Buffer.from(rawB64, "base64");
  }

  // Ensure assets array exists
  const existingAssets = Array.isArray(cardV3.data.assets) ? [...cardV3.data.assets] : [];

  // Add primary icon conforming to Lumiverse / CCv3: assets/icon/image/main.<ext>
  if (primaryAvatarData && primaryAvatarData.length > 0) {
    const iconPath = `assets/icon/image/main.${primaryAvatarExt}`;
    files.push({
      name: iconPath,
      data: primaryAvatarData,
    });
    if (!existingAssets.some((a) => a.uri === `embedded://${iconPath}` || a.type === "icon")) {
      existingAssets.unshift({
        type: "icon",
        name: "main",
        uri: `embedded://${iconPath}`,
        ext: primaryAvatarExt,
      });
    }
  }

  // 2. Multi-Emotion Expression Sprites (assets/expressions/<key>.<ext>)
  const ext = (character.extensions || {}) as Record<string, any>;
  if (!cardV3.data.extensions) {
    cardV3.data.extensions = {};
  }
  const targetExt = cardV3.data.extensions as Record<string, any>;

  const expressionsDict = ext.expressions || (character as any).expressions;
  const expressionsMeta = ext.expressions_meta || (character as any).expressions_meta || {};
  if (expressionsDict && typeof expressionsDict === "object") {
    if (!targetExt.expressions) targetExt.expressions = {};
    if (!targetExt.expressions_meta) targetExt.expressions_meta = {};
    for (const [key, dataUrlOrPath] of Object.entries(expressionsDict)) {
      if (typeof dataUrlOrPath === "string" && dataUrlOrPath.startsWith("data:image/")) {
        const mimeMatch = dataUrlOrPath.match(/^data:image\/([a-zA-Z0-9.-]+);base64,/);
        const expExt = (mimeMatch ? mimeMatch[1] : "avif").replace("jpeg", "jpg");
        const rawB64 = dataUrlOrPath.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, "");
        const expBuf = Buffer.from(rawB64, "base64");

        const expFilePath = `assets/expressions/${key}.${expExt}`;
        files.push({
          name: expFilePath,
          data: expBuf,
        });

        const expUri = `embedded://${expFilePath}`;
        targetExt.expressions[key] = expUri;

        // Propagate / inject classifier label descriptions
        const meta = expressionsMeta[key] || {};
        targetExt.expressions_meta[key] = {
          label: meta.label || key,
          description: meta.description || `Emotional sprite representing ${key}`,
          intensityTier: meta.intensityTier || (key.endsWith("_2") ? 2 : 1),
          uri: expUri,
        };

        // Register in CCv3 asset manifest
        const existingIdx = existingAssets.findIndex(
          (a) => a.name === key && (a.type === "expression" || a.type === "emotion" || a.type === "icon")
        );
        const assetEntry = {
          type: "expression",
          name: key,
          uri: expUri,
          ext: expExt,
        };
        if (existingIdx >= 0) {
          existingAssets[existingIdx] = assetEntry;
        } else {
          existingAssets.push(assetEntry);
        }
      }
    }
  }

  // 3. Extensions & Gallery Asset Tracking
  if (!targetExt.greeting_backgrounds) {
    targetExt.greeting_backgrounds = { ...(ext.greeting_backgrounds || {}) };
  }

  let nextGalleryNum = 1;
  const dataUrlToGalleryRef = new Map<string, string>();

  // Helper to append a gallery image to the zip and return its gallery link
  function addGalleryAsset(dataUrl: string, assetType: string = "other"): string {
    if (dataUrlToGalleryRef.has(dataUrl)) {
      return dataUrlToGalleryRef.get(dataUrl)!;
    }

    const rawB64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, "");
    const mimeMatch = dataUrl.match(/^data:image\/([a-zA-Z0-9.-]+);base64,/);
    const extName = (mimeMatch ? mimeMatch[1] : "png").replace("jpeg", "jpg");
    const buf = Buffer.from(rawB64, "base64");
    const currentNum = nextGalleryNum++;
    const galleryFileName = `gallery_image-${currentNum}.${extName}`;
    const filePath = `assets/other/image/${galleryFileName}`;

    files.push({
      name: filePath,
      data: buf,
    });

    if (!existingAssets.some((a) => a.uri === `embedded://${filePath}`)) {
      existingAssets.push({
        type: assetType,
        name: `gallery_image-${currentNum}`,
        uri: `embedded://${filePath}`,
        ext: extName,
      });
    }

    const ref = `gallery://image-${currentNum}`;
    dataUrlToGalleryRef.set(dataUrl, ref);
    return ref;
  }

  // Check extensions.gallery FIRST in exact array generation order (1, 2, ... N)
  if (Array.isArray(ext.gallery)) {
    ext.gallery.forEach((gItem: any) => {
      if (gItem && gItem.dataUrl && typeof gItem.dataUrl === "string" && gItem.dataUrl.startsWith("data:image/")) {
        const itemType = gItem.isBackground || gItem.type === "background" ? "background" : "other";
        const galleryRef = addGalleryAsset(gItem.dataUrl, itemType);

        if (gItem.greetingIndex !== undefined) {
          const gKey = String(gItem.greetingIndex);
          if (gItem.isBackground || gItem.isGreetingBg) {
            targetExt.greeting_backgrounds[gKey] = galleryRef;
          } else {
            // It's a greeting scene -> append markdown to greeting or alternate greeting if requested
            if (gItem.greetingIndex === 0) {
              if (cardV3.data.first_mes && !cardV3.data.first_mes.includes(galleryRef)) {
                cardV3.data.first_mes = cardV3.data.first_mes.trimEnd() + `\n![Gallery image](${galleryRef})`;
              }
            } else if (Array.isArray(cardV3.data.alternate_greetings)) {
              const altIdx = gItem.greetingIndex - 1;
              if (cardV3.data.alternate_greetings[altIdx] && !cardV3.data.alternate_greetings[altIdx].includes(galleryRef)) {
                cardV3.data.alternate_greetings[altIdx] = cardV3.data.alternate_greetings[altIdx].trimEnd() + `\n![Gallery image](${galleryRef})`;
              }
            }
          }
        }
      }
    });
  }

  // 3. Greeting Background for Chats (Fallback if not already in gallery)
  const greetingBg = ext.greeting_bg || (character as any).greeting_bg;
  if (greetingBg && typeof greetingBg === "string" && greetingBg.startsWith("data:image/")) {
    const bgGalleryRef = addGalleryAsset(greetingBg, "background");
    if (!targetExt.greeting_backgrounds["0"]) {
      targetExt.greeting_backgrounds["0"] = bgGalleryRef;
    }
  }

  // If chat_background is provided directly as dataUrl, store it into gallery as well
  const chatBg = ext.chat_background || (character as any).chat_background;
  if (chatBg && typeof chatBg === "string" && chatBg.startsWith("data:image/")) {
    const bgRef = addGalleryAsset(chatBg, "background");
    if (!targetExt.greeting_backgrounds["0"]) {
      targetExt.greeting_backgrounds["0"] = bgRef;
    }
  }

  // 4. Greeting Scenario Scene (Fallback if not already in gallery)
  const greetingImg = ext.greeting_image || (character as any).greeting_image;
  if (greetingImg && typeof greetingImg === "string" && greetingImg.startsWith("data:image/")) {
    const sceneGalleryRef = addGalleryAsset(greetingImg, "other");
    const galleryTag = `\n![Gallery image](${sceneGalleryRef})`;
    if (cardV3.data.first_mes && !cardV3.data.first_mes.includes("gallery://image-")) {
      cardV3.data.first_mes = cardV3.data.first_mes.trimEnd() + "\n" + galleryTag;
    }
  }

  cardV3.data.assets = existingAssets;
  const cardJsonStr = JSON.stringify(cardV3, null, 2);
  files.unshift({
    name: "card.json",
    data: cardJsonStr,
  });

  return createZipArchive(files);
}

/**
 * Parses a .charx archive into a RoleplayCharacter
 */
export function parseCharxArchive(zipBytes: Uint8Array): {
  character: RoleplayCharacter;
  avatarDataUrl?: string;
  format: "charx_v3";
  raw_system_prompt?: string;
} {
  const files = extractZipArchive(zipBytes);

  // Find card.json (or first .json file in root)
  const jsonKey = Object.keys(files).find(
    (k) => k === "card.json" || k.endsWith(".json")
  );

  if (!jsonKey || !files[jsonKey]) {
    throw new Error("Invalid .charx bundle: Missing card.json at archive root.");
  }

  const rawJson = files[jsonKey].toString("utf-8");
  const parsed = JSON.parse(rawJson);

  // Locate avatar image from assets
  let avatarDataUrl: string | undefined;

  // Try finding assets/icon/image/main.*, assets/icon.*, or any image in assets/icon
  const iconKey = Object.keys(files).find(
    (k) =>
      k === "assets/icon/image/main.avif" ||
      k === "assets/icon/image/main.png" ||
      k === "assets/icon.avif" ||
      k === "assets/icon.png" ||
      (k.startsWith("assets/icon/") &&
        (k.endsWith(".avif") || k.endsWith(".png") || k.endsWith(".jpg") || k.endsWith(".webp")))
  ) || Object.keys(files).find(
    (k) => k.startsWith("assets/") && (k.endsWith(".avif") || k.endsWith(".png") || k.endsWith(".jpg") || k.endsWith(".webp"))
  );

  if (iconKey && files[iconKey]) {
    const mime = iconKey.endsWith(".jpg") || iconKey.endsWith(".jpeg")
      ? "image/jpeg"
      : iconKey.endsWith(".webp")
      ? "image/webp"
      : iconKey.endsWith(".avif")
      ? "image/avif"
      : "image/png";
    avatarDataUrl = `data:${mime};base64,${files[iconKey].toString("base64")}`;
  }

  let character: RoleplayCharacter;
  if (parsed.spec === "chara_card_v3" && parsed.data) {
    character = cardV3ToCharacter(parsed as TavernCardV3, avatarDataUrl);
  } else if (parsed.spec === "chara_card_v2" && parsed.data) {
    // V2 fallback inside charx
    const { cardV2ToCharacter } = require("./card-parser");
    character = cardV2ToCharacter(parsed, avatarDataUrl);
  } else if (parsed.name || parsed.description) {
    // Raw JSON fallback
    const { cardV2ToCharacter } = require("./card-parser");
    character = cardV2ToCharacter({ spec: "chara_card_v2", spec_version: "2.0", data: parsed }, avatarDataUrl);
  } else {
    throw new Error("Invalid character card schema inside .charx archive.");
  }

  // Extract expressions and gallery images from CharX assets
  if (!character.extensions) character.extensions = {};
  if (!character.extensions.expressions) character.extensions.expressions = {};
  if (!Array.isArray(character.extensions.gallery)) character.extensions.gallery = [];

  for (const [key, buf] of Object.entries(files)) {
    if (key === iconKey) continue;
    if (
      key.startsWith("assets/") &&
      (key.endsWith(".png") || key.endsWith(".jpg") || key.endsWith(".jpeg") || key.endsWith(".webp") || key.endsWith(".gif") || key.endsWith(".avif"))
    ) {
      const mime = key.endsWith(".jpg") || key.endsWith(".jpeg")
        ? "image/jpeg"
        : key.endsWith(".webp")
        ? "image/webp"
        : key.endsWith(".gif")
        ? "image/gif"
        : key.endsWith(".avif")
        ? "image/avif"
        : "image/png";
      const b64 = `data:${mime};base64,${buf.toString("base64")}`;
      const baseName = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";

      // Check if this is an expression sprite (e.g. assets/expressions/<emotion>.<ext>)
      if (key.startsWith("assets/expressions/")) {
        const exprKey = baseName.toLowerCase();
        character.extensions.expressions[exprKey] = b64;
        continue;
      }

      const isBg = key.includes("/background/") || baseName.includes("background") || baseName.includes("chat_bg");

      if (!character.extensions.gallery.some((g: any) => g.dataUrl === b64)) {
        character.extensions.gallery.push({
          id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: baseName,
          dataUrl: b64,
          type: isBg ? "background" : "scene",
          isBackground: isBg,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  const rawSysPrompt = (parsed.data?.system_prompt || parsed.system_prompt || "").trim();

  return {
    character,
    avatarDataUrl,
    format: "charx_v3",
    raw_system_prompt: rawSysPrompt || undefined,
  };
}
