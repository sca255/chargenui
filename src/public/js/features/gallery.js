// Character Gallery Management & Lightbox
import { state } from "../core/state.js";
import { el } from "../core/dom.js";
import { syncStateToUI } from "../core/ui-sync.js";
import { scheduleCardAutosave } from "./autosave.js";
import { showIpcToast } from "./ipc.js";

export function getCharacterGalleryImages() {
  const c = state.character;
  if (!c) return [];

  if (!c.extensions) c.extensions = {};
  if (!Array.isArray(c.extensions.gallery)) {
    c.extensions.gallery = [];
  }

  // Ensure mirrored on c.data.extensions
  if (!c.data) c.data = {};
  if (!c.data.extensions) c.data.extensions = {};
  c.data.extensions.gallery = c.extensions.gallery;

  return c.extensions.gallery;
}

export function renderGallery() {
  if (!el.galleryGrid) return;
  const gallery = getCharacterGalleryImages();
  const count = gallery.length;

  if (el.galleryTabCount) el.galleryTabCount.textContent = count.toString();
  if (el.galleryCountPill) el.galleryCountPill.textContent = `${count} image${count === 1 ? "" : "s"}`;

  if (count === 0) {
    if (el.galleryEmptyState) el.galleryEmptyState.style.display = "block";
    el.galleryGrid.style.display = "none";
    el.galleryGrid.innerHTML = "";
    return;
  }

  if (el.galleryEmptyState) el.galleryEmptyState.style.display = "none";
  el.galleryGrid.style.display = "grid";
  el.galleryGrid.innerHTML = "";

  gallery.forEach((item, idx) => {
    const isAvatar = state.character.avatar === item.dataUrl;
    const isGreetingScene = item.type === "scene" || item.greetingIndex !== undefined || item.dataUrl === state.character.greeting_image;
    const isBg = item.isBackground || item.type === "background" || item.dataUrl === state.character.chat_background;
    const galleryTag = `gallery://image-${idx + 1}`;
    const markdownSnippet = `![Gallery image](${galleryTag})`;

    let roleBadge = "";
    if (isAvatar) {
      roleBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; font-size: 10px;">👤 Active Avatar</span>`;
    } else if (isGreetingScene) {
      roleBadge = `<span class="badge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.5); color: #d8b4fe; font-size: 10px;">💬 Greeting Scene</span>`;
    } else if (isBg) {
      roleBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); color: #fcd34d; font-size: 10px;">🌆 Chat Background</span>`;
    } else {
      roleBadge = `<span class="badge" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.5); color: #38bdf8; font-size: 10px;">🖼️ Gallery Asset</span>`;
    }

    const card = document.createElement("div");
    card.style = "background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s ease, border-color 0.15s ease;";
    card.innerHTML = `
      <div style="position: relative; height: 160px; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;" class="gallery-thumb-container" title="Click to view full image">
        <img src="${item.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.name || 'Gallery image'}">
        <div style="position: absolute; top: 6px; left: 6px; display: flex; gap: 4px; z-index: 2;">
          ${roleBadge}
        </div>
        <div style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #fff; font-family: monospace;">
          #${idx + 1}
        </div>
      </div>

      <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <input type="text" class="gal-name-input" data-id="${item.id}" value="${item.name || `gallery_image-${idx + 1}`}" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 4px; width: 100%;" title="Edit asset label">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 4px 6px; border-radius: 4px;">
          <code style="font-size: 10px; color: var(--accent-cyan);">${galleryTag}</code>
          <button type="button" class="btn btn-xs btn-copy-gal-tag" data-snippet="${encodeURIComponent(markdownSnippet)}" style="padding: 1px 6px; font-size: 9px;" title="Copy markdown tag for greetings or messages">📋 Copy Tag</button>
        </div>

        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: auto;">
          ${!isAvatar ? `<button type="button" class="btn btn-xs btn-gal-set-avatar" data-id="${item.id}" style="flex: 1; font-size: 10px; justify-content: center;" title="Set this image as card avatar">👤 Avatar</button>` : ""}
          <button type="button" class="btn btn-xs btn-gal-add-greeting" data-tag="${galleryTag}" style="flex: 1; font-size: 10px; justify-content: center; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;" title="Append this gallery image to First Message">💬 In Starter</button>
          ${!isBg ? `<button type="button" class="btn btn-xs btn-gal-set-bg" data-id="${item.id}" style="flex: 1; font-size: 10px; justify-content: center;" title="Set as chat ambient wallpaper">🌆 Chat BG</button>` : ""}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 2px;">
          <button type="button" class="btn btn-xs btn-gal-download" data-url="${item.dataUrl}" data-name="${item.name || `image_${idx + 1}`}" style="font-size: 10px; padding: 2px 6px;">⬇️ Download</button>
          <button type="button" class="btn btn-xs btn-danger btn-gal-remove" data-id="${item.id}" data-url="${item.dataUrl}" style="font-size: 10px; padding: 2px 6px;">🗑️ Remove</button>
        </div>
      </div>
    `;

    // Click on thumbnail opens lightbox
    card.querySelector(".gallery-thumb-container").addEventListener("click", () => {
      openGalleryLightbox(item.dataUrl, item.name || `Gallery Image #${idx + 1}`);
    });

    // Name change listener
    const nameInput = card.querySelector(".gal-name-input");
    nameInput.addEventListener("change", (e) => {
      item.name = e.target.value.trim() || item.name;
      const targetInExt = state.character.extensions?.gallery?.find((g) => g.id === item.id || g.dataUrl === item.dataUrl);
      if (targetInExt) targetInExt.name = item.name;
      scheduleCardAutosave();
    });

    // Copy Tag
    card.querySelector(".btn-copy-gal-tag").addEventListener("click", (e) => {
      e.stopPropagation();
      const snippet = decodeURIComponent(e.currentTarget.dataset.snippet);
      navigator.clipboard.writeText(snippet);
      const original = e.currentTarget.textContent;
      e.currentTarget.textContent = "✓ Copied!";
      setTimeout(() => (e.currentTarget.textContent = original), 1500);
    });

    // Set Avatar
    const btnSetAvatar = card.querySelector(".btn-gal-set-avatar");
    if (btnSetAvatar) {
      btnSetAvatar.addEventListener("click", (e) => {
        e.stopPropagation();
        state.character.avatar = item.dataUrl;
        syncStateToUI();
        scheduleCardAutosave();
        showIpcToast("✓ Set gallery image as character profile avatar!", "success");
      });
    }

    // Add to Greeting Starter
    card.querySelector(".btn-gal-add-greeting").addEventListener("click", (e) => {
      e.stopPropagation();
      const tag = e.currentTarget.dataset.tag;
      const markdown = `\n\n![Gallery image](${tag})`;
      if (!state.character.first_mes) state.character.first_mes = "";
      if (!state.character.first_mes.includes(tag)) {
        state.character.first_mes = state.character.first_mes.trimEnd() + markdown;
        if (el.fieldFirstMes) el.fieldFirstMes.value = state.character.first_mes;
        scheduleCardAutosave();
        showIpcToast(`✓ Inserted ${tag} into character starter message!`, "success");
      } else {
        showIpcToast(`${tag} is already in the starter message!`, "info");
      }
    });

    // Set Chat BG
    const btnSetBg = card.querySelector(".btn-gal-set-bg");
    if (btnSetBg) {
      btnSetBg.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!state.character.extensions) state.character.extensions = {};
        state.character.chat_background = item.dataUrl;
        state.character.extensions.chat_background = item.dataUrl;
        if (!state.character.data) state.character.data = {};
        if (!state.character.data.extensions) state.character.data.extensions = {};
        state.character.data.extensions.chat_background = item.dataUrl;
        renderGallery();
        scheduleCardAutosave();
        showIpcToast("✓ Set image as chat background wallpaper!", "success");
      });
    }

    // Download
    card.querySelector(".btn-gal-download").addEventListener("click", (e) => {
      e.stopPropagation();
      const a = document.createElement("a");
      a.href = item.dataUrl;
      a.download = `${(state.character.name || "character").replace(/[^a-zA-Z0-9_-]/g, "_")}_${item.name || `image_${idx + 1}`}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // Remove
    card.querySelector(".btn-gal-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeGalleryImage(item.id, item.dataUrl);
    });

    el.galleryGrid.appendChild(card);
  });
}

export async function addImagesToGallery(files) {
  if (!files || files.length === 0) return;
  if (!state.character.extensions) state.character.extensions = {};
  if (!Array.isArray(state.character.extensions.gallery)) state.character.extensions.gallery = [];

  const readPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name.replace(/\.[^.]+$/, "") || "gallery_image",
          dataUrl: e.target.result,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  });

  const results = (await Promise.all(readPromises)).filter(Boolean);
  if (results.length === 0) return;

  results.forEach((res) => {
    if (!state.character.extensions.gallery.some((g) => g.dataUrl === res.dataUrl)) {
      const idx = state.character.extensions.gallery.length + 1;
      state.character.extensions.gallery.push({
        id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: res.name || `gallery_image-${idx}`,
        dataUrl: res.dataUrl,
        type: "scene",
        createdAt: new Date().toISOString(),
      });
    }
  });

  if (!state.character.data) state.character.data = {};
  if (!state.character.data.extensions) state.character.data.extensions = {};
  state.character.data.extensions.gallery = state.character.extensions.gallery;

  renderGallery();
  scheduleCardAutosave();
  showIpcToast(`✓ Added ${results.length} image(s) to character gallery!`, "success");
}

export function removeGalleryImage(id, dataUrl) {
  if (!state.character.extensions) state.character.extensions = {};
  if (Array.isArray(state.character.extensions.gallery)) {
    state.character.extensions.gallery = state.character.extensions.gallery.filter(
      (g) => (id ? g.id !== id : g.dataUrl !== dataUrl)
    );
  }

  if (state.character.data?.extensions?.gallery) {
    state.character.data.extensions.gallery = state.character.extensions.gallery;
  }

  // Also remove from greeting_image or chat_background if matching
  if (state.character.greeting_image === dataUrl) {
    delete state.character.greeting_image;
    if (state.character.extensions) delete state.character.extensions.greeting_image;
    if (state.character.data?.extensions) delete state.character.data.extensions.greeting_image;
  }
  if (state.character.chat_background === dataUrl) {
    delete state.character.chat_background;
    if (state.character.extensions) delete state.character.extensions.chat_background;
    if (state.character.data?.extensions) delete state.character.data.extensions.chat_background;
  }

  renderGallery();
  scheduleCardAutosave();
  showIpcToast("✓ Removed image from gallery", "info");
}

export function clearAllGalleryImages() {
  const current = getCharacterGalleryImages();
  if (current.length === 0) {
    alert("Gallery is already empty!");
    return;
  }
  if (!confirm(`Are you sure you want to remove all ${current.length} gallery images from this character?`)) return;

  if (state.character.extensions) {
    state.character.extensions.gallery = [];
    delete state.character.extensions.greeting_image;
    delete state.character.extensions.chat_background;
  }
  if (state.character.data?.extensions) {
    state.character.data.extensions.gallery = [];
    delete state.character.data.extensions.greeting_image;
    delete state.character.data.extensions.chat_background;
  }
  delete state.character.greeting_image;
  delete state.character.chat_background;

  renderGallery();
  scheduleCardAutosave();
  showIpcToast("✓ Cleared character image gallery", "info");
}

export function openGalleryLightbox(dataUrl, title = "Image Preview") {
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxTitle = document.getElementById("lightbox-title");
  const modalGalleryLightbox = document.getElementById("modal-gallery-lightbox");
  if (lightboxImg) lightboxImg.src = dataUrl;
  if (lightboxTitle) lightboxTitle.textContent = title;
  if (modalGalleryLightbox) modalGalleryLightbox.classList.remove("hidden");
}

export function closeGalleryLightbox() {
  const modalGalleryLightbox = document.getElementById("modal-gallery-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  if (modalGalleryLightbox) modalGalleryLightbox.classList.add("hidden");
  if (lightboxImg) lightboxImg.src = "";
}

// Local Fast Audit (100% matched to backend diagnostic.ts auditCharacterCard)

