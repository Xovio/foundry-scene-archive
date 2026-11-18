export default {
  packLabel: "Scene Archive",
  settings: {
    autoRestore: {
      name: "Load on expand",
      hint: "Archived scenes of a folder are loaded as soon as you expand that folder in the Scenes tab."
    }
  },
  badge: {
    own: "{own} scene(s) archived{more} – expanding the folder loads them",
    more: ", {count} more in subfolders",
    onlySub: "{count} scene(s) archived in subfolders"
  },
  menu: {
    archive: "Archive scenes",
    archiveRecursive: "Archive scenes (incl. subfolders)",
    restore: "Load archived scenes (incl. subfolders)"
  },
  dialog: {
    title: "Archive scenes",
    body: "<strong>{count}</strong> scene(s) from “{folder}”{sub} will be moved into the <em>Scene Archive</em> compendium. Fog of war, IDs, folders and permissions are preserved.",
    sub: " and its subfolders",
    links: "Links or stairways to these scenes only work again once the folder has been expanded (loaded).",
    staying: "Staying in the world:"
  },
  notify: {
    loaded: "Scene Archive: loaded {count} scene(s) from “{folder}”.",
    problems: "Scene Archive: {list}",
    archived: "Scene Archive: archived {count} scene(s).",
    notArchived: "Not archived: {list}"
  },
  block: {
    active: "active scene",
    viewing: "currently displayed",
    userThere: "{name} is there",
    combat: "has a combat"
  },
  error: {
    gmOnly: "Only the GM can use the Scene Archive.",
    busy: "The Scene Archive is busy – please wait a moment.",
    copyFailed: "Compendium copy could not be created",
    createFailed: "Scene could not be created",
    fogFailed: "Scene restored, but fog of war could not be restored (kept in a scene flag)",
    prefix: "Error: {message}"
  },
  progress: {
    archiving: "Archiving {name}",
    archived: "Archiving complete",
    loading: "Loading {name}",
    done: "Done"
  }
};
