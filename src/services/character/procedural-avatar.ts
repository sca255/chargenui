import * as zlib from "node:zlib";
import { Buffer } from "node:buffer";
import type { RoleplayCharacter } from "../../types/character";
import { writePngCharaCard } from "./png-card";
import { characterToCardV2, characterToCardV3 } from "./card-parser";

interface Palette {
  bgTop: [number, number, number];
  bgBottom: [number, number, number];
  accent: [number, number, number];
  glow: [number, number, number];
}

function selectPalette(char: RoleplayCharacter): Palette {
  const combined = `${char.tags.join(" ")} ${char.description} ${char.name}`.toLowerCase();

  // Scholar / Cryo / Cold / Ice / Endfield
  if (/cryo|ice|frost|scholar|endfield|cold|math|logic|clinical|academic/i.test(combined)) {
    return {
      bgTop: [10, 22, 38],        // Deep glacial midnight
      bgBottom: [4, 10, 20],      // Obsidian navy
      accent: [56, 189, 248],     // Glacial cyan
      glow: [165, 243, 252],      // Frosted mint
    };
  }

  // Cyberpunk / Sci-Fi / Mecha
  if (/cyber|sci-fi|scifi|tech|neon|hacker|android|future/i.test(combined)) {
    return {
      bgTop: [15, 12, 35],        // Neon void
      bgBottom: [7, 7, 20],       // Deep space
      accent: [99, 102, 241],     // Electric indigo
      glow: [236, 72, 153],       // Neon pink
    };
  }

  // Dark Fantasy / Vampire / Eldritch / Grim
  if (/dark fantasy|vampire|blood|eldritch|grim|demon|shadow|inquisitor|gothic/i.test(combined)) {
    return {
      bgTop: [32, 10, 18],        // Crimson obsidian
      bgBottom: [10, 4, 8],       // Abyss black
      accent: [225, 29, 72],      // Crimson velvet
      glow: [168, 85, 247],       // Eldritch violet
    };
  }

  // Celestial / Arcane / Holy / Priest
  if (/holy|celestial|angel|arcane|magic|paladin|solar|divine/i.test(combined)) {
    return {
      bgTop: [28, 22, 10],        // Deep bronze
      bgBottom: [12, 10, 6],       // Dark amber
      accent: [245, 158, 11],     // Solar gold
      glow: [253, 230, 138],      // Warm starlight
    };
  }

  // Default: Sovereign Obsidian & Purple
  return {
    bgTop: [22, 14, 38],          // Twilight indigo
    bgBottom: [8, 5, 18],         // Obsidian
    accent: [168, 85, 247],       // Vibrant purple
    glow: [52, 211, 153],         // Emerald accent
  };
}

/**
 * Creates a beautiful, stylized 400x400 procedural character card PNG
 * with ambient gradient, geometric framing, and card seal
 */
export function generateProceduralPngAvatar(char: RoleplayCharacter, width = 400, height = 400): Uint8Array {
  const palette = selectPalette(char);
  const bytesPerPixel = 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(scanlineLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte: None

    const vFactor = y / height;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;

      // Base vertical gradient
      let r = palette.bgTop[0] * (1 - vFactor) + palette.bgBottom[0] * vFactor;
      let g = palette.bgTop[1] * (1 - vFactor) + palette.bgBottom[1] * vFactor;
      let b = palette.bgTop[2] * (1 - vFactor) + palette.bgBottom[2] * vFactor;

      // Radial center ambient glow
      const distFromCenter = Math.hypot(x - cx, y - (cy - 20));
      const glowFactor = Math.max(0, 1 - distFromCenter / (width * 0.45));
      if (glowFactor > 0) {
        const glowStrength = Math.pow(glowFactor, 2) * 0.6;
        r = r * (1 - glowStrength) + palette.accent[0] * glowStrength;
        g = g * (1 - glowStrength) + palette.accent[1] * glowStrength;
        b = b * (1 - glowStrength) + palette.accent[2] * glowStrength;
      }

      // Elegant inner geometric circle ring (Avatar focal ring)
      const ringRadius = width * 0.30;
      const distToRing = Math.abs(distFromCenter - ringRadius);
      if (distToRing < 3) {
        const ringAlpha = (1 - distToRing / 3) * 0.75;
        r = r * (1 - ringAlpha) + palette.glow[0] * ringAlpha;
        g = g * (1 - ringAlpha) + palette.glow[1] * ringAlpha;
        b = b * (1 - ringAlpha) + palette.glow[2] * ringAlpha;
      }

      // Secondary outer subtle ring
      const outerRing = width * 0.36;
      const distToOuter = Math.abs(distFromCenter - outerRing);
      if (distToOuter < 1.5) {
        const outerAlpha = (1 - distToOuter / 1.5) * 0.35;
        r = r * (1 - outerAlpha) + palette.accent[0] * outerAlpha;
        g = g * (1 - outerAlpha) + palette.accent[1] * outerAlpha;
        b = b * (1 - outerAlpha) + palette.accent[2] * outerAlpha;
      }

      // Subtle border vignette
      const borderDist = Math.min(x, width - x, y, height - y);
      if (borderDist < 20) {
        const vignette = borderDist / 20;
        r *= vignette;
        g *= vignette;
        b *= vignette;
      }

      // Border outline
      if (borderDist <= 2) {
        r = palette.accent[0] * 0.8;
        g = palette.accent[1] * 0.8;
        b = palette.accent[2] * 0.8;
      }

      rawData[pxOffset] = Math.min(255, Math.max(0, Math.round(r)));
      rawData[pxOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      rawData[pxOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
      rawData[pxOffset + 3] = 255;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // Build standard PNG binary
  function makeChunk(typeStr: string, data: Buffer): Buffer {
    const typeBuf = Buffer.from(typeStr);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk("IHDR", ihdrData);
  const idatChunk = makeChunk("IDAT", deflated);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  const basePng = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  return new Uint8Array(basePng);
}

/**
 * Generates an embedded PNG card for a character containing both V2 and V3 spec metadata
 */
export function generateEmbeddedCharacterPng(char: RoleplayCharacter): {
  pngBuffer: Uint8Array;
  dataUrl: string;
} {
  const cardV2 = characterToCardV2(char);
  const cardV3 = characterToCardV3(char);

  let rawPng: Uint8Array;
  if (char.avatar && char.avatar.startsWith("data:image/png;base64,")) {
    const b64 = char.avatar.replace(/^data:image\/png;base64,/, "");
    rawPng = new Uint8Array(Buffer.from(b64, "base64"));
  } else {
    rawPng = generateProceduralPngAvatar(char);
  }

  const embeddedPng = writePngCharaCard(rawPng, cardV2, cardV3);
  const dataUrl = `data:image/png;base64,${Buffer.from(embeddedPng).toString("base64")}`;

  return {
    pngBuffer: embeddedPng,
    dataUrl,
  };
}
