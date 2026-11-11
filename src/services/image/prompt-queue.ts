import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ImagePromptQueueItem, ImageQueueStatus } from "../../types/image-prompt";
import { getSavedCard, saveCardRecord, listSavedCards } from "../character/card-storage";

const QUEUE_FILE = path.resolve(process.cwd(), "data", "image_prompt_queue.json");
const DATA_DIR = path.resolve(process.cwd(), "data");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code !== "EEXIST") throw err;
  }
}

/**
 * Loads the current image prompt queue from persistent storage.
 */
export async function listPromptQueue(): Promise<ImagePromptQueueItem[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf-8");
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    console.warn("Failed to read image prompt queue:", err?.message);
    return [];
  }
}

/**
 * Saves the entire image prompt queue to persistent storage.
 */
async function savePromptQueue(items: ImagePromptQueueItem[]): Promise<void> {
  await ensureDataDir();
  const tmpFile = `${QUEUE_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tmpFile, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmpFile, QUEUE_FILE);
}

/**
 * Adds a new image prompt item to the queue.
 */
export async function addToPromptQueue(
  item: Omit<ImagePromptQueueItem, "id" | "createdAt" | "status"> & {
    id?: string;
    createdAt?: string;
    status?: ImageQueueStatus;
  }
): Promise<ImagePromptQueueItem> {
  const items = await listPromptQueue();
  const effectivePrompt = item.prompt || item.positivePrompt || "";
  const newItem: ImagePromptQueueItem = {
    id: item.id || `ipq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    characterId: item.characterId,
    characterName: item.characterName || "Unnamed Character",
    imagePurpose: item.imagePurpose || "avatar",
    createdAt: item.createdAt || new Date().toISOString(),
    targetModel: item.targetModel || "flux",
    artStyle: item.artStyle || "anime",
    shotType: item.shotType || "card_portrait",
    portraitIntent: item.portraitIntent || "standard_avatar",
    aspectRatio: item.aspectRatio || "2:3",
    dimensions: item.dimensions,
    recommendedSettings: item.recommendedSettings,
    prompt: effectivePrompt,
    positivePrompt: effectivePrompt,
    negativePrompt: item.negativePrompt || undefined,
    notes: item.notes,
    status: item.status || "queued",
    avatarDataUrl: item.avatarDataUrl,
    greetingDataUrl: item.greetingDataUrl,
    greetingBgDataUrl: item.greetingBgDataUrl,
    greetingIndex: item.greetingIndex,
  };

  items.unshift(newItem);
  await savePromptQueue(items);
  return newItem;
}

/**
 * Updates an existing prompt queue item.
 */
export async function updatePromptQueueItem(
  id: string,
  updates: Partial<ImagePromptQueueItem>
): Promise<ImagePromptQueueItem | null> {
  const items = await listPromptQueue();
  const index = items.findIndex(
    (i) => i.id === id || (i as any).name === id || i.characterName === id
  );
  if (index === -1) return null;

  const current = items[index];
  const effectivePrompt = updates.prompt || updates.positivePrompt || current.prompt || current.positivePrompt || "";
  const updated: ImagePromptQueueItem = {
    ...current,
    ...updates,
    prompt: effectivePrompt,
    positivePrompt: effectivePrompt,
    id: current.id,
    createdAt: current.createdAt,
  };

  items[index] = updated;
  await savePromptQueue(items);
  return updated;
}

/**
 * Removes an item from the image prompt queue.
 */
export async function removeFromPromptQueue(id: string): Promise<boolean> {
  const items = await listPromptQueue();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;

  await savePromptQueue(filtered);
  return true;
}

/**
 * Clears the image prompt queue.
 */
export async function clearPromptQueue(onlyCompleted = false): Promise<number> {
  const items = await listPromptQueue();
  let remaining: ImagePromptQueueItem[];
  if (onlyCompleted) {
    remaining = items.filter((i) => i.status !== "completed");
  } else {
    remaining = [];
  }

  const removedCount = items.length - remaining.length;
  await savePromptQueue(remaining);
  return removedCount;
}

/**
 * Attaches a generated image to a queue item and optionally updates the saved character card.
 */
export async function attachImageToQueueItem(
  id: string,
  imageDataUrl: string,
  updateSavedCard = true,
  imageType: "avatar" | "greeting" | "greeting_bg" = "avatar"
): Promise<ImagePromptQueueItem | null> {
  const updates: Partial<ImagePromptQueueItem> = {
    status: "completed",
  };
  if (imageType === "greeting" || imageType === "greeting_bg") {
    if (imageType === "greeting_bg") {
      updates.greetingBgDataUrl = imageDataUrl;
    } else {
      updates.greetingDataUrl = imageDataUrl;
    }
  } else {
    updates.avatarDataUrl = imageDataUrl;
  }

  const item = await updatePromptQueueItem(id, updates);
  if (!item) return null;

  if (updateSavedCard) {
    try {
      let targetId = item.characterId;
      let cardRecord = targetId ? await getSavedCard(targetId) : null;

      // Fallback: search by characterName in saved library if targetId wasn't found or missing
      if (!cardRecord && item.characterName) {
        const savedCards = await listSavedCards();
        const match = savedCards.find((c) => c.name.trim().toLowerCase() === item.characterName.trim().toLowerCase());
        if (match) {
          targetId = match.id;
          cardRecord = await getSavedCard(targetId);
        }
      }

      if (cardRecord && targetId) {
        if (!cardRecord.character.extensions) cardRecord.character.extensions = {};
        if (imageType === "greeting_bg" || imageType === "greeting") {
          const charAny = cardRecord.character as any;
          if (!charAny.data) charAny.data = {};
          if (!charAny.data.extensions) charAny.data.extensions = {};

          if (imageType === "greeting_bg") {
            charAny.data.extensions.chat_background = imageDataUrl;
            cardRecord.character.extensions.chat_background = imageDataUrl;
            (cardRecord.character as any).chat_background = imageDataUrl;
          } else {
            // Determine greeting index: 0 = primary greeting (first_mes), 1+ = alternate greeting
            const gIdx = typeof item.greetingIndex === "number" ? item.greetingIndex : 0;
            if (gIdx === 0) {
              charAny.data.extensions.greeting_image = imageDataUrl;
              cardRecord.character.extensions.greeting_image = imageDataUrl;
              (cardRecord.character as any).greeting_image = imageDataUrl;
            }

            // Existing or next gallery image number
            const existingGal = Array.isArray(cardRecord.character.extensions?.gallery)
              ? cardRecord.character.extensions.gallery
              : [];
            const nextGalNum = existingGal.length + 1;
            const galleryTag = `![Gallery image](gallery://image-${nextGalNum})`;

            if (gIdx === 0) {
              // Populate first_mes with greeting image markdown format if not already present
              if (cardRecord.character.first_mes && !cardRecord.character.first_mes.includes("gallery://image-")) {
                cardRecord.character.first_mes = cardRecord.character.first_mes.trimEnd() + "\n\n" + galleryTag;
              }
              if (charAny.data && charAny.data.first_mes && !charAny.data.first_mes.includes("gallery://image-")) {
                charAny.data.first_mes = charAny.data.first_mes.trimEnd() + "\n\n" + galleryTag;
              }
            } else {
              // Alternate greeting at index (gIdx - 1)
              const altIdx = gIdx - 1;
              if (Array.isArray(cardRecord.character.alternate_greetings) && cardRecord.character.alternate_greetings[altIdx] !== undefined) {
                if (!cardRecord.character.alternate_greetings[altIdx].includes("gallery://image-")) {
                  cardRecord.character.alternate_greetings[altIdx] = cardRecord.character.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
                }
              }
              if (Array.isArray(charAny.data?.alternate_greetings) && charAny.data.alternate_greetings[altIdx] !== undefined) {
                if (!charAny.data.alternate_greetings[altIdx].includes("gallery://image-")) {
                  charAny.data.alternate_greetings[altIdx] = charAny.data.alternate_greetings[altIdx].trimEnd() + "\n\n" + galleryTag;
                }
              }
            }
          }

          // Add to CharX assets gallery
          const assets = Array.isArray(cardRecord.character.assets) ? [...cardRecord.character.assets] : [];
          const gIdx = typeof item.greetingIndex === "number" ? item.greetingIndex : 0;
          const assetName = imageType === "greeting_bg"
            ? (gIdx > 0 ? `chat_background_${gIdx}` : "chat_background")
            : (gIdx > 0 ? `greeting_${String(gIdx + 1).padStart(2, "0")}` : "greeting_01");
          const assetType = imageType === "greeting_bg" ? "background" : "other";
          const greetingUri = `embedded://assets/other/image/${assetName}.png`;
          if (!assets.some((a) => a.uri === greetingUri)) {
            assets.push({
              type: assetType,
              name: assetName,
              uri: greetingUri,
              ext: "png",
            });
          }
          cardRecord.character.assets = assets;

          // Also persist into extensions.gallery
          if (!Array.isArray(cardRecord.character.extensions.gallery)) {
            cardRecord.character.extensions.gallery = [];
          }
          if (!cardRecord.character.extensions.gallery.some((g: any) => g.dataUrl === imageDataUrl)) {
            const galNum = cardRecord.character.extensions.gallery.length + 1;
            cardRecord.character.extensions.gallery.push({
              id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: imageType === "greeting_bg" ? (gIdx > 0 ? `Chat Background #${gIdx}` : "Chat Background") : `gallery_image-${galNum}`,
              dataUrl: imageDataUrl,
              type: imageType === "greeting_bg" ? "background" : "scene",
              isBackground: imageType === "greeting_bg",
              greetingIndex: gIdx,
              createdAt: new Date().toISOString(),
            });
          }

          const avatarForSave = imageType === "avatar" ? imageDataUrl : (cardRecord.avatarBase64 || cardRecord.character.avatar);
          await saveCardRecord(cardRecord.character, avatarForSave, targetId);
        } else {
          cardRecord.character.avatar = imageDataUrl;
          const assets = Array.isArray(cardRecord.character.assets) ? [...cardRecord.character.assets] : [];
          if (!assets.some((a) => a.uri === "embedded://assets/icon/image/main.png" || a.type === "icon")) {
            assets.unshift({
              type: "icon",
              name: "main",
              uri: "embedded://assets/icon/image/main.png",
              ext: "png",
            });
          }
          cardRecord.character.assets = assets;

          // Also persist into extensions.gallery
          if (!Array.isArray(cardRecord.character.extensions.gallery)) {
            cardRecord.character.extensions.gallery = [];
          }
          if (!cardRecord.character.extensions.gallery.some((g: any) => g.dataUrl === imageDataUrl)) {
            const galNum = cardRecord.character.extensions.gallery.length + 1;
            cardRecord.character.extensions.gallery.push({
              id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: imageType === "greeting_bg" ? "Chat Background" : `gallery_image-${galNum}`,
              dataUrl: imageDataUrl,
              type: imageType === "greeting_bg" ? "background" : "scene",
              isBackground: imageType === "greeting_bg",
              createdAt: new Date().toISOString(),
            });
          }
          await saveCardRecord(cardRecord.character, imageDataUrl, targetId);
        }
      }
    } catch (err: any) {
      console.warn(`Failed to auto-update card with image:`, err?.message);
    }
  }

  return item;
}

/**
 * Exports the prompt queue in various formats for ComfyUI, WebUI, or text editors.
 */
export async function exportPromptQueue(
  format: "json" | "text" | "comfy_batch" = "json"
): Promise<string> {
  const items = await listPromptQueue();

  if (format === "json") {
    return JSON.stringify(items, null, 2);
  }

  if (format === "comfy_batch") {
    const batchList = items.map((item, idx) => ({
      index: idx + 1,
      character: item.characterName,
      model: item.targetModel,
      prompt: item.prompt || item.positivePrompt || "",
      negative: item.negativePrompt || "",
      aspect_ratio: item.aspectRatio,
    }));
    return JSON.stringify(batchList, null, 2);
  }

  // Text format for manual reading / copy-pasting
  const lines: string[] = [
    `# ==============================================================================`,
    `# CharGen Harness - Image Prompt Queue (ComfyUI / Diffusion)`,
    `# Total Prompts: ${items.length} | Exported: ${new Date().toLocaleString()}`,
    `# ==============================================================================`,
    ``,
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const promptText = item.prompt || item.positivePrompt || "";
    lines.push(`## [${i + 1}] ${item.characterName} (${item.targetModel.toUpperCase()}) - ${item.status.toUpperCase()}`);
    lines.push(`Model: ${item.targetModel} | Style: ${item.artStyle} | Shot: ${item.shotType} | Ratio: ${item.aspectRatio}`);
    lines.push(``);
    lines.push(`PROMPT:`);
    lines.push(promptText);
    if (item.negativePrompt) {
      lines.push(``);
      lines.push(`NEGATIVE PROMPT:`);
      lines.push(item.negativePrompt);
    }
    lines.push(``);
    lines.push(`------------------------------------------------------------------------------`);
    lines.push(``);
  }

  return lines.join("\n");
}
