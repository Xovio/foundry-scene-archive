import {
  MODULE_ID, archiveScenes, archivedCounts, archivedInSubtree, blockReason, getPack,
  isBusy, refreshIndex, restoreFolders, scenesIn, subtreeFolderIds
} from "./archive.js";
import { initI18n, t } from "./i18n.js";

// foundry.utils.escapeHTML only exists from v13 on
const escapeHTML = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

Hooks.once("init", () => {
  initI18n(MODULE_ID);
  game.settings.register(MODULE_ID, "autoRestore", {
    name: t("settings.autoRestore.name"),
    hint: t("settings.autoRestore.hint"),
    scope: "client", config: true, type: Boolean, default: true
  });
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  await refreshIndex();
  ui.scenes?.render();
  game.modules.get(MODULE_ID).api = { archiveScenes, restoreFolders, refreshIndex, archivedCounts, scenesIn, getPack };
});

/* ------------------------------------------------------------------ Scenes tab */

Hooks.on("renderSceneDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html[0];

  for (const li of root.querySelectorAll(".directory-item.folder[data-folder-id]")) {
    const folder = game.folders.get(li.dataset.folderId);
    if (!folder) continue;
    const own = archivedCounts.get(folder.id) ?? 0;
    const total = archivedInSubtree(folder);
    if (!total) continue;

    const header = li.querySelector(":scope > .folder-header");
    if (!header) continue;
    li.classList.add("sa-has-archive");
    const badge = document.createElement("span");
    badge.className = `sa-badge${own ? "" : " sa-only-sub"}`;
    badge.innerHTML = `<i class="fas fa-box-archive"></i>${own || total}`;
    badge.title = own
      ? t("badge.own", { own, more: total > own ? t("badge.more", { count: total - own }) : "" })
      : t("badge.onlySub", { count: total });
    const title = header.querySelector("h3");
    if (title) title.after(badge);
    else header.append(badge);

    // Runs before Foundry's own click handler (capture phase): the folder expands normally, we load in parallel.
    if (own) {
      header.addEventListener("click", () => {
        if (!li.classList.contains("collapsed")) return; // folder is being collapsed
        if (!game.settings.get(MODULE_ID, "autoRestore") || isBusy()) return;
        loadFolder(folder, false);
      }, { capture: true });
    }
  }
});

async function loadFolder(folder, recursive) {
  const ids = recursive ? subtreeFolderIds(folder) : [folder.id];
  try {
    const { restored, failed } = await restoreFolders(ids);
    if (restored.length) ui.notifications.info(t("notify.loaded", { count: restored.length, folder: folder.name }));
    if (failed.length) ui.notifications.warn(t("notify.problems", { list: failed.map((f) => `${f.name} (${f.reason})`).join(", ") }));
  } catch (err) {
    ui.notifications.error(err.message);
  }
}

/* ------------------------------------------------------------------ Folder context menu */

Hooks.on("getSceneDirectoryFolderContext", (html, options) => {
  const folderOf = (header) => game.folders.get((header[0] ?? header).closest(".directory-item")?.dataset.folderId);

  options.push(
    {
      name: t("menu.archive"),
      icon: '<i class="fas fa-box-archive"></i>',
      condition: (header) => game.user.isGM && scenesIn(folderOf(header), false).length > 0,
      callback: (header) => confirmArchive(folderOf(header), false)
    },
    {
      name: t("menu.archiveRecursive"),
      icon: '<i class="fas fa-boxes-stacked"></i>',
      condition: (header) => {
        const folder = folderOf(header);
        return game.user.isGM && folder.getSubfolders().length > 0 && scenesIn(folder, true).length > 0;
      },
      callback: (header) => confirmArchive(folderOf(header), true)
    },
    {
      name: t("menu.restore"),
      icon: '<i class="fas fa-box-open"></i>',
      condition: (header) => game.user.isGM && archivedInSubtree(folderOf(header)) > 0,
      callback: (header) => loadFolder(folderOf(header), true)
    }
  );
});

async function confirmArchive(folder, recursive) {
  const scenes = scenesIn(folder, recursive);
  const blocked = scenes.map((s) => [s, blockReason(s)]).filter(([, r]) => r);
  const count = scenes.length - blocked.length;
  const blockedHtml = blocked.length
    ? `<p>${t("dialog.staying")}</p><ul>${blocked.map(([s, r]) => `<li>${escapeHTML(s.name)} – ${escapeHTML(r)}</li>`).join("")}</ul>`
    : "";

  const ok = await Dialog.confirm({
    title: t("dialog.title"),
    content: `
      <p>${t("dialog.body", { count, folder: escapeHTML(folder.name), sub: recursive ? t("dialog.sub") : "" })}</p>
      <p>${t("dialog.links")}</p>
      ${blockedHtml}`,
    defaultYes: false
  });
  if (!ok || !count) return;

  try {
    const { archived, skipped } = await archiveScenes(scenes);
    ui.notifications.info(t("notify.archived", { count: archived.length }));
    const errors = skipped.filter((s) => s.error);
    if (errors.length) ui.notifications.warn(t("notify.notArchived", { list: errors.map((s) => `${s.name} (${s.reason})`).join(", ") }));
  } catch (err) {
    ui.notifications.error(err.message);
  }
}

/* Recount when the archive compendium changes outside this module (e.g. deleted manually) */
Hooks.on("deleteCompendium", () => refreshIndex().then(() => ui.scenes?.render()));
Hooks.on("updateCompendium", (pack) => {
  if (pack?.collection === getPack()?.collection && !isBusy()) refreshIndex().then(() => ui.scenes?.render());
});
