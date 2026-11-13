/**
 * AVIF Image Converter Service (Bun / CLI).
 * Converts any PNG/JPEG image buffer or base64 data-URL directly into AVIF.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

export async function convertBufferToAvif(inputBuffer: Buffer, quality: number = 85): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const rnd = Math.random().toString(36).substring(2, 9);
  const tmpInput = path.join(tmpDir, `chargen_in_${Date.now()}_${rnd}.png`);
  const tmpOutput = path.join(tmpDir, `chargen_out_${Date.now()}_${rnd}.avif`);

  try {
    await fs.writeFile(tmpInput, inputBuffer);

    // Try avifenc first, fallback to magick or ffmpeg
    const ok = await new Promise<boolean>((resolve) => {
      const proc = spawn("avifenc", ["--speed", "8", "-j", "2", tmpInput, tmpOutput], { stdio: "ignore" });
      proc.on("close", (code) => {
        if (code === 0) resolve(true);
        else {
          const mProc = spawn("magick", [tmpInput, "-quality", String(quality), tmpOutput], { stdio: "ignore" });
          mProc.on("close", (mCode) => resolve(mCode === 0));
          mProc.on("error", () => resolve(false));
        }
      });
      proc.on("error", () => {
        const mProc = spawn("magick", [tmpInput, "-quality", String(quality), tmpOutput], { stdio: "ignore" });
        mProc.on("close", (mCode) => resolve(mCode === 0));
        mProc.on("error", () => resolve(false));
      });
    });

    if (ok) {
      const avifBytes = await fs.readFile(tmpOutput);
      return avifBytes;
    }
  } catch (err) {
    console.warn("AVIF conversion error:", err);
  } finally {
    await fs.unlink(tmpInput).catch(() => {});
    await fs.unlink(tmpOutput).catch(() => {});
  }

  // Fallback to original if conversion tool fails
  return inputBuffer;
}

export async function convertDataUrlToAvif(dataUrlOrB64: string, quality: number = 85): Promise<string> {
  if (!dataUrlOrB64 || typeof dataUrlOrB64 !== "string") return dataUrlOrB64;
  if (dataUrlOrB64.startsWith("data:image/avif")) return dataUrlOrB64;

  const parts = dataUrlOrB64.split(",");
  const b64 = parts.length > 1 ? parts[1] : parts[0];
  if (!b64) return dataUrlOrB64;
  const inBuf = Buffer.from(b64, "base64");
  const avifBuf = await convertBufferToAvif(inBuf, quality);
  return `data:image/avif;base64,${avifBuf.toString("base64")}`;
}
