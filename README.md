# Scene Archive

Large **Foundry VTT** worlds load slowly because every scene – with all its tokens, walls and lights – is sent to every client on each load. Scene Archive moves scene folders you are not using into a compendium and brings them back the moment you need them.

In the world it was built for, archiving 204 of 232 scenes cut the load time from 66 to 27 seconds. Your results will depend on your world.

## How it works

- **Archive:** right-click a scene folder and choose *Archive scenes*, with or without subfolders.
- **The folder stays visible** with a small badge showing how many scenes are archived.
- **Expand the folder** and its scenes are restored automatically.
- **Done with them?** Archive the folder again.

## What is preserved

- Scene IDs, so links, stairways and notes work again after restoring
- Fog of war of every user
- Folder, sort order and permissions
- Tokens, walls, lights and data from other modules

Scenes are skipped while they are active, being viewed by a user, or have a combat.

## Good to know

- Links and stairways to an archived scene do not work until its folder has been restored.
- Archived scenes do not appear in the scene search.
- **Back up your world before archiving for the first time.**

## Requirements

- Foundry VTT v12 (tested with build 343)
- Works with any game system

## Installation

In Foundry, go to **Add-on Modules → Install Module** and paste this manifest URL:

```
https://github.com/Xovio/foundry-scene-archive/releases/latest/download/module.json
```

## License

[MIT](LICENSE) – use it, change it, build on it.
