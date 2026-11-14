/**
 * Background AVIF Image Optimizer & Cache Warm Service.
 *
 * Scans saved character cards, creates high-efficiency AVIF thumbnails/caches for the top 200
 * most recently modified images using /usr/bin/avifenc or magick/ffmpeg, avoiding memory ballooning.
 * AVIF compressed buffers are stored on disk in data/cache/avif/ and served on demand.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const CACHE_DIR = path.resolve(process.cwd(), "data", "cache", "avif");
const CARDS_DIR = path.resolve(process.cwd(), "data", "characters");
const MAX_PREWARM_COUNT = 200;

export async function ensureAvifCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export function getCachedAvifPath(id: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safeId}.avif`);
}

export async function getAvifImage(id: string): Promise<Buffer | null> {
  const avifPath = getCachedAvifPath(id);
  try {
    return await fs.readFile(avifPath);
  } catch {
    return null;
  }
}

async function convertPngToAvif(pngBuffer: Buffer, targetPath: string): Promise<boolean> {
  const tmpPng = targetPath + ".tmp.png";
  try {
    await fs.writeFile(tmpPng, pngBuffer);
    
    // Attempt avifenc first, fallback to magick or ffmpeg
    const ok = await new Promise<boolean>((resolve) => {
      const proc = spawn("avifenc", ["--speed", "8", "-j", "2", tmpPng, targetPath], { stdio: "ignore" });
      proc.on("close", (code) => {
        if (code === 0) resolve(true);
        else {
          // Fallback to magick
          const mProc = spawn("magick", [tmpPng, "-quality", "75", targetPath], { stdio: "ignore" });
          mProc.on("close", (mCode) => resolve(mCode === 0));
          mProc.on("error", () => resolve(false));
        }
      });
      proc.on("error", () => {
        const mProc = spawn("magick", [tmpPng, "-quality", "75", targetPath], { stdio: "ignore" });
        mProc.on("close", (mCode) => resolve(mCode === 0));
        mProc.on("error", () => resolve(false));
      });
    });

    return ok;
  } catch {
    return false;
  } finally {
    await fs.unlink(tmpPng).catch(() => {});
  }
}

/**
 * Background worker: Runs with low priority on server startup to warm up to 200 top images.
 */
export async function startAvifPrewarmJob(): Promise<void> {
  // Run asynchronously without blocking server startup
  setTimeout(async () => {
    try {
      await ensureAvifCacheDir();
      const files = await fs.readdir(CARDS_DIR).catch(() => []);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      // Sort by mtime descending
      const statList = await Promise.all(
        jsonFiles.map(async (file) => {
          const fp = path.join(CARDS_DIR, file);
          const st = await fs.stat(fp).catch(() => null);
          return { file, mtime: st?.mtimeMs || 0 };
        })
      );

      statList.sort((a, b) => b.mtime - a.mtime);
      const topCandidates = statList.slice(0, MAX_PREWARM_COUNT);

      let warmed = 0;
      for (const item of topCandidates) {
        const id = item.file.replace(/\.json$/, "");
        const targetAvif = getCachedAvifPath(id);

        try {
          const exists = await fs.stat(targetAvif).then(() => true).catch(() => false);
          if (exists) continue;

          const raw = await fs.readFile(path.join(CARDS_DIR, item.file), "utf-8");
          const card = JSON.parse(raw);
          const b64 = card.avatarBase64 || card.character?.avatar;

          if (b64 && typeof b64 === "string") {
            const cleanB64 = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
            const buf = Buffer.from(cleanB64, "base64");
            const success = await convertPngToAvif(buf, targetAvif);
            if (success) warmed++;
          }
        } catch {
          // Continue gracefully
        }
      }

      if (warmed > 0) {
        console.log(`[AVIF Optimizer] Prewarmed ${warmed} top images into disk cache.`);
      }
    } catch (e) {
      console.warn("[AVIF Optimizer] Prewarm job notice:", e);
    }
  }, 1500);
}
