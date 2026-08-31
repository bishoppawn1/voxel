# Voxel

A calm, browser-based 3D god game where you shape a gravity-aware block world directly.

Play it at [bishoppawn1.github.io/voxel](https://bishoppawn1.github.io/voxel/).

## Controls

- Left-click to place or erase with the selected tool.
- Right-click and drag to orbit around the world.
- Scroll to zoom.
- Press `1` for Place, `2` for Erase, and `G` to pause or resume gravity.

## Development

```sh
npm install
npm run dev
```

Before pushing:

```sh
npm test
npm run build
```

The game is deployed only through the GitHub Pages workflow on `main`. See `SPEC.md` for gameplay rules and `AGENTS.md` for repository workflow.
