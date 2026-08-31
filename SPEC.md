# Voxel game specification

## Product vision

Voxel is a browser-native god game about shaping a small block world. It combines the freedom and playful simulation of a world sandbox with a tactile, cubic building language. The player is not represented by a character; they act directly on the world.

The first release is a focused creative sandbox. It should feel immediately playable, calm, and understandable without a tutorial screen.

## Platform

- The game runs as a static website on GitHub Pages.
- The canonical URL is `https://bishoppawn1.github.io/voxel/`.
- Desktop pointer controls are the primary input. The layout must remain usable on smaller screens.
- No application server, account system, database, or non-GitHub hosting service is part of the product.

## First-release player experience

On load, the player sees a 24 by 24 build plane, an angled 3D camera, and a few small starter structures made from grass, dirt, stone, and sand blocks. The world—not marketing copy—is the main screen.

The player can:

1. Choose Place or Erase.
2. Select one of 24 block materials from a compact block palette.
3. Left-click the plane or an exposed block face to place a block.
4. Left-click a block with Erase selected to remove it.
5. Right-click and drag to orbit around the center of the world.
6. Scroll to zoom in and out.
7. Pause or resume gravity.
8. Undo, redo, clear, or restore the starter world.

The palette contains Grass, Dirt, Stone, Sand, Wood, Leaves, Brick, Clay, Snow, Ice, Water, Lava, Obsidian, Coal, Iron, Gold, Copper, Glass, Moss, Mud, Gravel, Marble, Basalt, and Crystal. A Delete block sits in the same palette and switches directly to Erase. Selecting any palette block displays a plain-language confirmation such as “Grass selected” or “Delete selected.”

The world is saved to local browser storage after each edit and restored on the same device the next time the game opens.

## World model

- Coordinates are integer grid cells.
- The build plane is level `y = 0`; rendered block centers are offset upward by half a unit.
- The playable horizontal range is `-11` through `11` on both the x and z axes.
- The maximum build height is 12 levels (`y = 0` through `y = 11`).
- A cell contains at most one block.
- Every block has a stable ID, cell position, and material.
- Saved data must be validated before it is loaded. Invalid or outdated data falls back to the starter world.

## Structural gravity

Gravity is connectivity-based rather than a full rigid-body simulation.

- A block touching the plane is grounded.
- Face-adjacent blocks support one another on all six faces: left, right, front, back, above, and below.
- Any group connected through those faces to a grounded block is supported.
- When an edit disconnects a group from every grounded block, the whole disconnected group falls together one grid level at a time.
- The group stops once it touches the plane or reconnects to a supported structure.
- The group keeps its internal shape while falling.
- Pausing gravity allows unsupported structures to remain suspended. Resuming gravity settles all unsupported groups immediately, with a short visual fall animation.

## Interface and visual direction

- Full-screen isometric world with soft sage sky, warm neutral plane, visible grid, subtle fog, and directional shadows.
- Compact translucent tool surfaces use cream, forest green, lime, soil brown, stone gray, and sand gold.
- Rendered cubes fill their grid cells and touch neighboring cubes without a visible gap. Palette tiles stay compact enough to show the expanded collection without covering the world.
- Controls must expose accessible names, selected states, disabled states, and keyboard shortcuts where applicable.
- The first-use message should leave after the first world edit.
- Motion should honor the operating system's reduced-motion preference.

## Technical architecture

- React and TypeScript for UI and state.
- Three.js through React Three Fiber and Drei for rendering, raycasting, and orbit controls.
- Vite emits a fully static `dist/` bundle with `/voxel/` as the public base path.
- Vitest covers deterministic world rules independently from rendering.
- A GitHub Actions workflow tests, builds, uploads, and deploys the Pages artifact on every push to `main`.

## Acceptance criteria

- The default view contains the plane and at least three recognizable starter block clusters.
- Place and Erase work on valid grid cells without duplicates.
- Right-drag orbits; left-click never rotates the camera.
- Removing the last connection beneath or beside a structure makes the detached group settle.
- Gravity pause and resume work as specified.
- Undo, redo, clear, reset, material selection, block count, and local persistence work.
- `npm test` and `npm run build` succeed.
- The GitHub Pages deployment succeeds from `main` and loads assets from the repository subpath.

## Future direction (not part of this release)

The architecture should leave room for god powers, living creatures, biomes, weather, erosion, fire, water, procedural terrain, larger worlds, time controls, and shareable world files. These ideas must not be added until their behavior and performance budgets are specified.
