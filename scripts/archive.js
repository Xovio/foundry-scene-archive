/**
 * Core logic: move scenes into the archive compendium and bring them back.
 *
 * Stored with the compendium copy (flags["scene-archive"]):
 *  - original folder, sort order, ownership
 *  - fog of war of all users (the server deletes it whenever a scene with that ID is deleted)
 * The scene ID is kept (keepId) so links, stairways, notes etc. work again after restoring.
 */
import { t } from "./i18n.js";

export const MODULE_ID = "scene-archive";
const PACK_NAME = "scene-archive";
const LEGACY_PACK_NAMES = ["szenen-archiv"];
const FLAG_FOLDER = `flags.${MODULE_ID}.folder`;

let busy = false;
/** folderId (or "") → number of archived scenes directly in that folder */
export const archivedCounts = new Map();

export function getPack() {
  for (const name of [PACK_NAME, ...LEGACY_PACK_NAMES]) {
    const pack = game.packs.get(`world.${name}`);
    if (pack) return pack;
  }
  return null;
}

export async function ensurePack() {
  let pack = getPack();
  if (!pack) {
    pack = await CompendiumCollection.createCompendium({
      name: PACK_NAME,
      label: t("packLabel"),
      type: "Scene",
      ownership: { PLAYER: "NONE", TRUSTED: "NONE", ASSISTANT: "OWNER" }
    });
  }
  if (pack.locked) await pack.configure({ locked: false });
  return pack;
}

/** Re-reads the archive index and counts archived scenes per folder. */
export async function refreshIndex() {
  archivedCounts.clear();
  const pack = getPack();
  if (!pack) return archivedCounts;
  const index = await pack.getIndex({ fields: [FLAG_FOLDER] });
  for (const entry of index) {
    const folder = foundry.utils.getProperty(entry, FLAG_FOLDER) ?? "";
    archivedCounts.set(folder, (archivedCounts.get(folder) ?? 0) + 1);
  }
  return archivedCounts;
}

/** All scene folder IDs of a subtree (including the folder itself). */
export function subtreeFolderIds(folder) {
  const ids = [folder.id];
  for (const sub of folder.getSubfolders(true)) ids.push(sub.id);
  return ids;
}

export function archivedInSubtree(folder) {
  return subtreeFolderIds(folder).reduce((sum, id) => sum + (archivedCounts.get(id) ?? 0), 0);
}

/** Why a scene must not be archived right now – or null. */
export function blockReason(scene) {
  if (scene.active) return t("block.active");
  if (canvas.scene?.id === scene.id) return t("block.viewing");
  const viewer = game.users.find((u) => u.active && u.viewedScene === scene.id);
  if (viewer) return t("block.userThere", { name: viewer.name });
  if (game.combats.some((c) => c.scene?.id === scene.id)) return t("block.combat");
  return null;
}

function progress(label, done, total) {
  const pct = total ? Math.round((done / total) * 100) : 100;
  if (SceneNavigation.displayProgressBar) SceneNavigation.displayProgressBar({ label, pct });
}

/** Fog of war of all users for a scene, straight from the database (FogExploration.load only returns cached ones). */
async function loadFog(sceneId) {
  const docs = await FogExploration.database.get(FogExploration, { query: { scene: sceneId } });
  return docs.map((d) => d.toObject());
}

function guard() {
  if (!game.user.isGM) throw new Error(t("error.gmOnly"));
  if (busy) throw new Error(t("error.busy"));
}

/**
 * Archives the given scenes. Returns { archived: [names], skipped: [{ name, reason, error }] }.
 */
export async function archiveScenes(scenes) {
  guard();
  busy = true;
  const archived = [];
  const skipped = [];
  try {
    const pack = await ensurePack();
    const todo = [];
    for (const scene of scenes) {
      const reason = blockReason(scene);
      if (reason) skipped.push({ name: scene.name, reason, error: false });
      else todo.push(scene);
    }

    let done = 0;
    for (const scene of todo) {
      progress(t("progress.archiving", { name: scene.name }), done, todo.length);
      try {
        const fog = await loadFog(scene.id);
        const data = scene.toObject();
        data.active = false;
        data.folder = null;
        foundry.utils.setProperty(data, `flags.${MODULE_ID}`, {
          folder: scene.folder?.id ?? null,
          folderPath: folderPath(scene.folder),
          sort: scene.sort,
          ownership: scene.ownership,
          fog,
          archivedAt: Date.now()
        });

        // Replace an older archive copy with the same ID, if any.
        // (Server-side this also deletes fog for that ID – which we already saved above.)
        if (pack.index.has(scene.id)) await Scene.deleteDocuments([scene.id], { pack: pack.collection });
        const [copy] = await Scene.createDocuments([data], { pack: pack.collection, keepId: true });
        if (!copy) throw new Error(t("error.copyFailed"));

        await scene.delete();
        archived.push(scene.name);
      } catch (err) {
        console.error(`${MODULE_ID} | Archiving ${scene.name} failed`, err);
        skipped.push({ name: scene.name, reason: t("error.prefix", { message: err.message }), error: true });
      }
      done++;
    }
    progress(t("progress.archived"), 1, 1);
  } finally {
    busy = false;
    await refreshIndex();
    ui.scenes?.render();
  }
  return { archived, skipped };
}

/**
 * Restores archived scenes that belong to the given folders ("" = no folder).
 * Returns { restored: [names], failed: [{ name, reason }] }.
 */
export async function restoreFolders(folderIds, { quiet = false } = {}) {
  guard();
  const pack = getPack();
  if (!pack) return { restored: [], failed: [] };
  busy = true;
  const restored = [];
  const failed = [];
  try {
    const wanted = new Set(folderIds.map((id) => id ?? ""));
    const index = await pack.getIndex({ fields: [FLAG_FOLDER] });
    const ids = index.filter((e) => wanted.has(foundry.utils.getProperty(e, FLAG_FOLDER) ?? "")).map((e) => e._id);
    if (!ids.length) return { restored, failed };

    let done = 0;
    for (const id of ids) {
      const doc = await pack.getDocument(id);
      if (!doc) continue;
      if (!quiet) progress(t("progress.loading", { name: doc.name }), done, ids.length);
      try {
        if (game.scenes.has(id)) {
          // Scene already exists in the world (e.g. imported manually) – just drop the archive copy
          await Scene.deleteDocuments([id], { pack: pack.collection });
          continue;
        }
        const data = doc.toObject();
        const meta = data.flags?.[MODULE_ID] ?? {};
        data.folder = meta.folder && game.folders.has(meta.folder) ? meta.folder : null;
        if (meta.sort !== undefined) data.sort = meta.sort;
        if (meta.ownership) data.ownership = meta.ownership;
        delete data.flags[MODULE_ID];

        const [scene] = await Scene.createDocuments([data], { keepId: true });
        if (!scene) throw new Error(t("error.createFailed"));

        // Careful: deleting a scene (even the compendium copy!) makes the server delete all fog with
        // that scene ID. So remove the archive copy first, then recreate the fog.
        await Scene.deleteDocuments([id], { pack: pack.collection });

        // Restore fog of war (only for users that still exist)
        const fog = (meta.fog ?? []).filter((f) => game.users.has(f.user));
        if (fog.length) {
          try {
            await FogExploration.createDocuments(fog, { keepId: true });
          } catch (err) {
            console.warn(`${MODULE_ID} | Fog for ${scene.name} not restored – kept as flag`, err);
            await scene.setFlag(MODULE_ID, "pendingFog", fog);
            failed.push({ name: scene.name, reason: t("error.fogFailed") });
          }
        }
        restored.push(scene.name);
      } catch (err) {
        console.error(`${MODULE_ID} | Restoring ${doc.name} failed`, err);
        failed.push({ name: doc.name, reason: err.message });
      }
      done++;
    }
    if (!quiet) progress(t("progress.done"), 1, 1);
  } finally {
    busy = false;
    await refreshIndex();
    ui.scenes?.render();
  }
  return { restored, failed };
}

export function folderPath(folder) {
  if (!folder) return "";
  return [...folder.ancestors].reverse().map((f) => f.name).concat(folder.name).join("/");
}

/** Scenes in a folder (directly or including subfolders). */
export function scenesIn(folder, recursive) {
  const ids = new Set(recursive ? subtreeFolderIds(folder) : [folder.id]);
  return game.scenes.filter((s) => s.folder && ids.has(s.folder.id));
}

export function isBusy() {
  return busy;
}
