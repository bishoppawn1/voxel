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
3. Left-click the plane or an exposed block face to place a block. Hold Shift
   while left-dragging to pour blocks at a calm, controlled rate.
4. Left-click a block with Erase selected to remove it.
5. Right-click and drag to orbit around the center of the world. Left-drag
   never changes the camera angle; it is reserved for world editing.
6. Scroll to zoom in and out.
7. Pause or resume gravity.
8. Undo, redo, clear, or restore the starter world.

The palette contains Grass, Dirt, Stone, Sand, Wood, Leaves, Brick, Clay, Snow, Ice, Water, Lava, Obsidian, Coal, Iron, Gold, Copper, Glass, Moss, Mud, Gravel, Marble, Basalt, and Crystal. A Delete block sits in the same palette and switches directly to Erase. Selecting any palette block displays a plain-language confirmation such as “Grass selected” or “Delete selected.”

The world is saved to local browser storage after each edit and restored on the same device the next time the game opens.

## World model

- Coordinates are integer grid cells, and every cell is 0.25 world units wide,
  tall, and deep.
- The build plane is level `y = 0`; rendered positions multiply cell
  coordinates by 0.25 and offset block centers upward by 0.125 world units.
- The 24 by 24 build plane contains a 96 by 96 quarter-unit grid. The playable
  horizontal cell range is `-47` through `47` on both the x and z axes.
- The maximum physical build height remains 12 world units, represented by 48
  levels (`y = 0` through `y = 47`).
- A cell contains at most one block.
- Every block has a stable ID, cell position, and material.
- Saved data must be validated before it is loaded. Invalid or outdated data falls back to the starter world.

## Structural gravity

Gravity is material-aware and connectivity-based rather than a full rigid-body simulation.

- A block touching the plane is grounded.
- Every material has a support tolerance describing how far it can carry a face-connected structure away from direct support. Each upward or sideways connection consumes that tolerance, so grass and dirt columns topple after only a few levels while marble, obsidian, wood, basalt, brick, and stone can carry taller or longer structures.
- Rigid and cohesive blocks can transmit support through face connections. Wood can carry a tree canopy, and leaves connect through neighboring wood and leaves within their shorter tolerance.
- Loose and fluid materials—including sand, gravel, snow, mud, water, and lava—do not receive or transmit sideways support. They fall and roll downhill until directly supported by the plane or a block below.
- When an edit disconnects a group from every grounded block, the whole disconnected group falls together one grid level at a time.
- The group stops once it touches the plane or reconnects to a supported structure.
- The group keeps its internal shape while falling.
- Pausing gravity allows unsupported structures to remain suspended. Resuming gravity settles all unsupported groups immediately, with a short visual fall animation.
- A freshly placed loose or fluid block can roll diagonally off an occupied
  cell before it becomes stable, so repeated placement forms a low pile
  instead of an implausibly thin tower. Rigid blocks remain on direct supports,
  and existing falling groups still preserve their shape.

## Liquids and fire

- Water and lava fall vertically whenever possible. When blocked, they travel
  across connected supported surfaces to the lowest reachable open drop rather
  than remaining perched on a ledge.
- Lava ignites face-adjacent grass, wood, leaves, moss, and coal. Burning blocks
  show visible flames, ignite adjacent flammable blocks, and disappear after a
  material-specific burn duration.
- Water touching a burning block extinguishes it. Stone, soil, metals, glass,
  and other nonflammable materials never ignite.
- When fire removes a supporting block, gravity settles the remaining structure
  and liquids again unless gravity is paused.

## Interface and visual direction

- Full-screen isometric world with soft sage sky, warm neutral plane, visible grid, subtle fog, and directional shadows.
- Compact translucent tool surfaces use cream, forest green, lime, soil brown, stone gray, and sand gold.
- Every material uses a distinct pixel texture rather than a flat color. Grass is a dirt block with a separate grassy cap, a green top, and an irregular grass fringe over its dirt sides; wood uses bark and growth rings, masonry uses joints, and ore blocks show mineral deposits embedded in stone.
- Rendered cubes fill quarter-unit grid cells and touch neighboring cubes.
  Their geometry, spacing, placement grid, and gravity steps are all 25% of the
  original one-unit block size. Palette tiles stay very small and compact
  enough to show the expanded collection without covering the world.
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
- Left-drag never rotates the camera, including while painting blocks.
- Liquids seek their lowest reachable level, flammable blocks burn and spread
  fire, and weak vertical columns cannot exceed their material tolerance.
- Removing the last connection beneath or beside a structure makes the detached group settle.
- Gravity pause and resume work as specified.
- Undo, redo, clear, reset, material selection, block count, and local persistence work.
- `npm test` and `npm run build` succeed.
- The GitHub Pages deployment succeeds from `main` and loads assets from the repository subpath.

## Future direction (not part of this release)

The architecture should leave room for god powers, living creatures, biomes,
weather, erosion, procedural terrain, larger worlds, time controls, and
shareable world files. These ideas must not be added until their behavior and
performance budgets are specified.
