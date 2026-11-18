export default {
  packLabel: "Szenen-Archiv",
  settings: {
    autoRestore: {
      name: "Beim Aufklappen automatisch laden",
      hint: "Archivierte Szenen eines Ordners werden geladen, sobald du den Ordner im Szenen-Tab aufklappst."
    }
  },
  badge: {
    own: "{own} Szene(n) archiviert{more} – Aufklappen lädt sie",
    more: ", {count} weitere in Unterordnern",
    onlySub: "{count} Szene(n) in Unterordnern archiviert"
  },
  menu: {
    archive: "Szenen archivieren",
    archiveRecursive: "Szenen archivieren (mit Unterordnern)",
    restore: "Archivierte Szenen laden (mit Unterordnern)"
  },
  dialog: {
    title: "Szenen archivieren",
    body: "<strong>{count}</strong> Szene(n) aus „{folder}“{sub} werden ins Kompendium <em>Szenen-Archiv</em> verschoben. Nebel des Krieges, IDs, Ordner und Rechte bleiben erhalten.",
    sub: " und Unterordnern",
    links: "Links oder Treppen zu diesen Szenen funktionieren erst wieder, wenn der Ordner aufgeklappt (geladen) wurde.",
    staying: "Bleiben in der Welt:"
  },
  notify: {
    loaded: "Szenen-Archiv: {count} Szene(n) aus „{folder}“ geladen.",
    problems: "Szenen-Archiv: {list}",
    archived: "Szenen-Archiv: {count} Szene(n) archiviert.",
    notArchived: "Nicht archiviert: {list}"
  },
  block: {
    active: "aktive Szene",
    viewing: "wird gerade angezeigt",
    userThere: "{name} ist dort",
    combat: "hat einen Kampf"
  },
  error: {
    gmOnly: "Nur der GM kann das Szenen-Archiv benutzen.",
    busy: "Das Szenen-Archiv ist gerade beschäftigt – bitte kurz warten.",
    copyFailed: "Kopie im Kompendium konnte nicht angelegt werden",
    createFailed: "Szene konnte nicht angelegt werden",
    fogFailed: "Szene da, Nebel nicht wiederhergestellt (in Szenen-Flag gesichert)",
    prefix: "Fehler: {message}"
  },
  progress: {
    archiving: "Archiviere {name}",
    archived: "Archivieren abgeschlossen",
    loading: "Lade {name}",
    done: "Fertig"
  }
};
