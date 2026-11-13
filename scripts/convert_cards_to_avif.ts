#!/usr/bin/env bun
/**
 * CharGen CLI Tool: Convert Existing Character Card Images to AVIF
 *
 * Scans `data/characters/*.json`, detects any legacy base64 PNG/JPEG/WebP avatars
 * or assets, compresses them losslessly/visually losslessly into AVIF, updates the card data,
 * and updates `.assets[]` URI extensions to `.avif`.
 *
 * Usage:
 *   bun run scripts/convert_cards_to_avif.ts [--dry-run]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { convertDataUrlToAvif } from "../src/services/image/avif-converter";

const CARDS_DIR = path.resolve(process.cwd(), "data", "cards");

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`🔍 Scanning ${CARDS_DIR} for PNG/JPEG images...`);

  let files: string[] = [];
  try {
    files = await fs.readdir(CARDS_DIR);
  } catch (err: any) {
    console.error("Could not read characters dir:", err.message);
    process.exit(1);
  }

  const jsonFiles = files.filter(f => f.endsWith(".json"));
  console.log(`Found ${jsonFiles.length} character cards to inspect.`);

  let convertedCards = 0;
  let totalSavedBytes = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(CARDS_DIR, file);
    const raw = await fs.readFile(filePath, "utf-8");
    let record: any;
    try {
      record = JSON.parse(raw);
    } catch {
      continue;
    }

    let modified = false;

    // 1. Convert avatarBase64
    const avatar = record.avatarBase64 || record.character?.avatar;
    if (avatar && typeof avatar === "string" && !avatar.startsWith("data:image/avif")) {
      const origLen = avatar.length;
      console.log(`  🔄 Converting avatar for '${record.character?.name || record.id}'...`);
      const avifDataUrl = await convertDataUrlToAvif(avatar, 85);
      const newLen = avifDataUrl.length;
      totalSavedBytes += Math.max(0, origLen - newLen);

      if (record.avatarBase64) record.avatarBase64 = avifDataUrl;
      if (record.character) record.character.avatar = avifDataUrl;
      modified = true;
    }

    // 2. Convert character assets[]
    if (record.character && Array.isArray(record.character.assets)) {
      record.character.assets = record.character.assets.map((asset: any) => {
        if (asset.uri && asset.uri.endsWith(".png")) {
          asset.uri = asset.uri.replace(/\.png$/i, ".avif");
          asset.ext = "avif";
          modified = true;
        }
        return asset;
      });
    }

    // 3. Convert gallery scenes
    if (record.character?.extensions?.gallery && Array.isArray(record.character.extensions.gallery)) {
      for (const item of record.character.extensions.gallery) {
        if (item.dataUrl && typeof item.dataUrl === "string" && !item.dataUrl.startsWith("data:image/avif")) {
          item.dataUrl = await convertDataUrlToAvif(item.dataUrl, 85);
          modified = true;
        }
      }
    }

    // 4. Convert expressions dictionary in extensions
    if (record.character?.extensions?.expressions && typeof record.character.extensions.expressions === "object") {
      for (const [expKey, dataUrl] of Object.entries(record.character.extensions.expressions)) {
        if (typeof dataUrl === "string" && !dataUrl.startsWith("data:image/avif")) {
          console.log(`  🔄 Converting expression '${expKey}' to AVIF...`);
          record.character.extensions.expressions[expKey] = await convertDataUrlToAvif(dataUrl, 85);
          modified = true;
        }
      }
    }

    // 5. Convert chat background / greeting image
    if (record.character?.chat_background && typeof record.character.chat_background === "string" && !record.character.chat_background.startsWith("data:image/avif")) {
      record.character.chat_background = await convertDataUrlToAvif(record.character.chat_background, 85);
      modified = true;
    }
    if (record.character?.greeting_image && typeof record.character.greeting_image === "string" && !record.character.greeting_image.startsWith("data:image/avif")) {
      record.character.greeting_image = await convertDataUrlToAvif(record.character.greeting_image, 85);
      modified = true;
    }

    if (modified) {
      convertedCards++;
      if (!isDryRun) {
        await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
        console.log(`  ✓ Updated ${file} with AVIF payload.`);
      } else {
        console.log(`  [DRY RUN] Would update ${file}.`);
      }
    }
  }

  console.log(`\n🎉 Completed! Converted ${convertedCards} cards to AVIF.`);
  if (totalSavedBytes > 0) {
    console.log(`💾 Estimated base64 payload reduced by ~${(totalSavedBytes / 1024).toFixed(1)} KB.`);
  }
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
