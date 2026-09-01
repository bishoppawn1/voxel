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

On the first load, the player sees a newly generated compact island map on the
24 by 24 build plane, with an angled 3D camera and varied grass, dirt, stone,
sand, water, and low hills. The world—not marketing copy—is the main screen.

The player can:

1. Choose Place, Erase, or Animals.
2. Select one of 41 block materials from a compact block palette.
3. Left-click the plane or an exposed block face to place a block. Hold Shift
   while left-dragging to pour blocks at a calm, controlled rate.
4. Left-click a block with Erase selected to remove it.
5. Right-click and drag to orbit around the center of the world. Left-drag
   never changes the camera angle; it is reserved for world editing.
6. Scroll to zoom in and out.
7. Pause or resume gravity.
8. Undo, redo, clear, or use the visible Reset button to generate another
   random map with a fresh vegetation state and animals.
9. Select any power and left-click or left-drag its small circular area brush:
   Verdant Touch grassifies exposed Dirt, Wildfire ignites flammable blocks,
   Rain extinguishes fires, Deep Freeze turns Water into Ice and Lava into
   Obsidian, and Thaw melts Ice and Snow into Water.
10. Select one of 19 land or aquatic creatures from the animal palette,
    then left-click the top of an unoccupied block column to spawn it.

The palette contains Grass, Dirt, Stone, Sand, Wood, Leaves, Brick, Clay, Snow,
Ice, Water, Lava, Obsidian, Coal, Iron, Gold, Copper, Glass, Moss, Mud, Gravel,
Marble, Basalt, Crystal, Cobblestone, Limestone, Granite, Slate, Sandstone,
Planks, Basic Crafting Bench, Terracotta, Concrete, Steel, Glowstone, Diamond Ore, Emerald Ore,
Quartz, Bamboo, Peat, and Coral. A Delete block sits in the same palette and
switches directly to Erase. Selecting any palette block
displays a plain-language confirmation such as “Grass selected” or “Delete
selected.”

The world and ecosystem are saved to local browser storage and restored on the
same device the next time the game opens.

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
- Saved data must be validated before it is loaded. Compatible older ecosystem
  saves are upgraded with lifecycle defaults; invalid data falls back to a new
  procedurally generated map.

## Structural gravity

Gravity is material-aware and connectivity-based rather than a full rigid-body simulation.

- A block touching the plane is grounded.
- Every material has a support tolerance describing how far it can carry a face-connected structure away from direct support. Each upward or sideways connection consumes that tolerance, so grass and dirt columns topple after only a few levels while marble, obsidian, wood, basalt, brick, and stone can carry taller or longer structures.
- Rigid and cohesive blocks can transmit support through face connections. Wood can carry a tree canopy, and leaves connect through neighboring wood and leaves within their shorter tolerance.
- A vertical Wood trunk rooted directly on supported terrain begins with
  Wood's own support tolerance, allowing a grown tree to remain upright.
- Loose and fluid materials—including sand, gravel, snow, mud, water, and lava—do not receive or transmit sideways support. They fall and roll downhill until directly supported by the plane or a block below.
- When an edit disconnects a group from every grounded block, the whole disconnected group falls together one grid level at a time.
- The group stops once it touches the plane or reconnects to a supported structure.
- The group keeps its internal shape while falling.
- Pausing gravity allows unsupported structures to remain suspended. Resuming
  gravity advances unsupported groups one cell per simulation tick so the
  player can watch the complete fall.
- A freshly placed loose or fluid block can roll diagonally off an occupied
  cell before it becomes stable, so repeated placement forms a low pile
  instead of an implausibly thin tower. Rigid blocks remain on direct supports,
  and existing falling groups still preserve their shape.

## Liquids and fire

- Water and lava use four conserved depth levels: quarter, half, three-quarter,
  and full blocks. They fall vertically whenever possible; when blocked, a full
  cell balances its volume across all four horizontal directions at once.
  Thinner neighboring cells continue balancing only when their depth differs by
  at least two quarters, keeping flow finite and even without creating liquid.
- Liquid flow advances on a slower cadence than structural gravity. Each flow
  step remains visible, preserves an original stable ID when a cell moves or
  splits, and never places more than one liquid block in a cell.
- Placing a solid block directly on liquid displaces the complete liquid volume
  evenly into neighboring cells first, then lets the solid fall straight into
  the vacated cell instead of rolling off the liquid surface.
- Lava radiates heat up to two horizontal cells away and one level vertically,
  igniting nearby grass, wood, planks, leaves, moss, and coal. Burning blocks
  show visible flames and ignite adjacent flammable blocks. Wood, planks,
  leaves, moss, and coal disappear after a material-specific burn duration; grassy dirt loses
  only its grass layer and becomes an ordinary Dirt block with the same ID and
  position.
- Water touching a burning block extinguishes it. Stone, soil, metals, glass,
  and other nonflammable materials never ignite.
- Animals standing on a burning surface catch fire, take damage, and ignore
  their normal activity while rushing one cell per ecosystem tick toward the
  nearest reachable water. Entering water extinguishes them. Land animals can
  cross connected water surfaces by swimming through them.
- When fire removes a supporting block, gravity settles the remaining structure
  and liquids again unless gravity is paused.

## First living ecosystem

- The Grass material represents grassy dirt. Every exposed Dirt block has a
  small deterministic chance on each ecosystem tick to become grassy dirt.
- If another block occupies the cell directly above grassy dirt, its covered
  grass layer disappears immediately and the supporting block becomes Dirt.
- Exposed grassy dirt without an existing growth has a small chance to sprout
  short grass, a flower, tall grass, or—rarely—a tree sapling. These growths
  are lightweight surface attachments keyed to stable block IDs; they do not
  occupy world cells and move with their supporting block. Short grass
  matures into tall grass after a short, deterministic growth period. A
  sapling matures into one of three tall Wood-and-Leaves tree patterns. Each
  keeps its canopy well above the reach of animals on level ground and grows
  only when its footprint is unobstructed;
  otherwise it waits and tries again on a later ecosystem tick. Generated
  canopies do not become animal platforms: animals walk on clear ground below
  high branches, cannot enter trunk columns, and move to nearby safe ground if
  an older save left them inside a trunk.
- A starter or newly reset world contains two adult sheep on grassy terrain,
  naturally seeded kelp, two small fish, and one big fish in its pond.
  The player can spawn Sheep, Cows, Pigs, Rabbits, Goats, Deer, Horses,
  Chickens, Ducks, Turtles, Beavers, Foxes, Wolves, Bears, Eagles, Crocodiles,
  and Humans on any
  unoccupied, non-burning surface, and Small Fish or Big Fish on Water. Only one
  animal may occupy a surface column at spawn time.
- Each herbivore follows a shortest reachable path toward food in its diet.
  Species prefer different combinations of short grass, tall grass, and
  flowers. The ten general grazers can also eat grassy dirt, Leaves, and Moss as
  shared plant-food categories. Beavers eat only tree saplings and exposed Wood
  blocks. Eating grassy dirt or Moss exposes Dirt, while
  eating Leaves removes that leaf block, so a block cannot provide unlimited
  meals. Animals remove what they eat and track their meal count.
- Every movement step crosses only one horizontal cell and can go up or down by
  at most one block level. Species take those steps at different cadences:
  Rabbits, Deer, Horses, Foxes, Wolves, and Eagles move every ecosystem tick;
  Sheep, Goats, Chickens, Ducks, Bears, and Crocodiles move every two; Cows and
  Pigs and Beavers move every three; and Turtles move every four. Slow animals are
  deterministically staggered by individual ID so a herd does not all move on
  the same tick. Predators are therefore faster on average, while the fastest
  herbivores can still match them. When no food is reachable, animals wait
  rather than pacing back and forth. Eating bare grassy dirt changes it back to
  Dirt, allowing the grass cycle to begin again. Animals avoid eating burning
  grass. Every animal visibly turns to face the direction it moves.
- Every animal has individual hunger, but no overhead health or hunger bar.
  Hunger falls by only one point per ecosystem tick, and animals do not consume
  food until they are missing a complete meal. Eating restores it up to its
  maximum, making meals much less frequent. A beaver's hunger falls only once
  every four ticks and it can eat only once every eight ticks. An animal dies
  and is removed from the world when its hunger reaches zero. Animals also die
  of old age after a species-specific long lifespan of
  300 to 600 ecosystem ticks; Humans live for 720 ticks. The same individual hunger and aging rules apply
  to future animal species.
- Two nearby adults of any non-human animal species become breeding partners when both
  have at least 70 hunger and their breeding cooldowns are ready. They approach
  one another, including predators choosing a mate before prey. When adjacent
  and a neighboring surface is open, each parent spends 30 hunger to create a
  visibly smaller baby of their species. Babies eat but do not breed; after
  three meals, a baby visibly grows into an adult and begins a short breeding
  cooldown.
- Humans use a deterministic work routine shaped by six individual inherited
  traits. A hungry Human seeks and attacks a nearby land animal; a crafted Spear
  increases its hunting damage. At other times it seeks Wood, chops one exposed
  Wood block at a time, and carries that one log in a single hand slot. Its
  first log becomes a Basic Crafting Bench on a neighboring safe surface.
- A Human places one carried log into its own bench and leaves its hand empty
  while the bench works. The next tick it takes the result. Its first three
  recipes produce an Axe, Hammer, and Spear in that order; the Axe makes logging
  faster, the Hammer enables construction work, and the Spear improves hunting.
  Later logs become one Planks block each. Tools are worn equipment rather than
  extra hand inventory, so the Human still carries no more than one resource.
- Once equipped, a Human carries each Planks result to the next cell in a small
  square-house blueprint around its bench. It places only one Planks block per
  trip. Destroying the bench cancels anything left inside it.
- Every founder receives bounded individual Aggression, Caution, Exploration,
  Gathering, Craftsmanship, and Efficiency values. Aggression changes how early
  it hunts and its attack strength; Caution changes the health risk it accepts;
  Exploration sets its resource and mate search distance; Gathering changes
  logging cadence; Craftsmanship changes bench time; and Efficiency changes how
  often hunger falls. A colored sash makes individuals visually distinct.
- A healthy Human can reproduce after age 24 when it has at least 78 hunger,
  at least 60% health, no cooldown, and a reachable unrelated partner meeting
  the same rules. Parent-child and sibling pairs are rejected. Each parent
  spends 35 hunger and receives a 28-tick cooldown. Human population is capped
  at 40, including player-spawned founders and children.
- A Human child records both parent IDs and a generation number. Each of its six
  traits is the rounded mean of the parents plus a deterministic mutation of at
  most eight points, clamped from 0 to 100. Children are visibly smaller, do not
  work or reproduce, and grow up after 30 ecosystem ticks. Survival and access
  to food determine which traits continue; there is no hidden “best” score.
- Foxes, Wolves, Bears, Eagles, and Crocodiles are predators. Each has a listed
  prey category with multiple species and never treats plants or another land
  predator as food. All five can enter Water to hunt both Small Fish and Big
  Fish. A predator seeks the nearest listed prey and has higher
  health and attack damage than herbivores. When it reaches prey, that animal
  has a 15% deterministic chance to fight back and otherwise flees if its own
  movement cadence is ready. A fleeing animal moves to an open reachable
  surface farther from the predator, or is caught if no escape exists. A
  successful hunt feeds the predator.
  Wolves, Bears, and Crocodiles also treat Humans as prey, creating real
  selection pressure; cautious Humans avoid hunting dangerous predators unless
  their Aggression is at least as high and they have a Spear.
- Kelp grows as a lightweight attachment on exposed Water in the same
  deterministic cycle used for land vegetation. Small Fish remain in connected
  water and eat kelp; Big Fish remain in connected water and hunt Small Fish.
  Fish plan routes through occupied water as though other animals are temporary
  traffic: they wait when their next water cell is occupied and retry on later
  ticks instead of abandoning reachable prey or food. Dirt and other non-Water
  terrain remain permanent barriers. Both fish species can also be spawned from
  the animal palette, but only on an unoccupied Water surface.
- The ecosystem builds one surface index per tick and shares food-target indexes
  among animals of the same species. Rendering reuses the same surface and block
  indexes and skips unchanged block, vegetation, and animal models so larger
  populations do not trigger repeated whole-world scans or redraws.
- Vegetation, animal species, positions, facing, hunger, age, health, fire, meal
  counts, breeding cooldowns, and Human hands, tools, benches, unfinished
  recipes, traits, generation, and parent IDs persist with the local world.
  Older Human saves receive deterministic founder traits during migration. Reset restores a
  fresh ecosystem; Clear removes it.

## God powers

- Powers live in their own panel beside the creation tools on the left side of
  the screen, leaving the right side clear.
- All five powers are selected area tools with the same three-cell-radius
  circular preview. A left-click applies one patch, and a calm left-drag
  cadence paints adjacent patches without rotating the camera. No power affects
  the whole world at once.
- A power is disabled when the current world contains no eligible block. Every
  power button is labeled as an area action, exposes its selected state, and
  reports a plain-language result after each successful patch.
- Every power preserves stable block IDs and cell positions. Powers that create
  fluid or unsupported materials allow gravity to resume settling normally.
- Power changes participate in the same undo and redo history as direct edits.

## Interface and visual direction

- Full-screen isometric world with soft sage sky, warm neutral plane, visible grid, subtle fog, and directional shadows.
- Compact translucent tool surfaces use cream, forest green, lime, soil brown, stone gray, and sand gold.
- Creation tools and the separate Powers section are grouped on the left side;
  the right side remains open for viewing the world.
- Every material uses a distinct pixel texture rather than a flat color. Grass is a dirt block with a separate grassy cap, a green top, and an irregular grass fringe over its dirt sides; wood uses bark and growth rings, masonry uses joints, and ore blocks show mineral deposits embedded in stone.
- Rendered cubes fill quarter-unit grid cells and touch neighboring cubes.
  Their geometry, spacing, placement grid, and gravity steps are all 25% of the
  original one-unit block size. Palette tiles stay very small and compact
  enough to show the expanded collection without covering the world.
- Controls must expose accessible names, selected states, disabled states, and keyboard shortcuts where applicable.
- Selecting an animal displays its name and diet, and the spawn preview clearly
  distinguishes a valid surface from an occupied or otherwise invalid one.
- Every animal has a species-specific low-poly silhouette rather than sharing a
  recolored quadruped body. Large identifying features stay readable at the
  normal camera distance: horns and antlers, ears and muzzles, manes and tails,
  wings and beaks, shells and flippers, and the Crocodile's long body and snout.
  Humans have an upright silhouette and visibly show a carried log or plank and
  their most recently crafted tool. Clicking a Human opens a compact individual
  inspector with its name, activity, generation, parents, vitals, equipment,
  and six trait values.
- The first-use message should leave after the first world edit.
- Motion should honor the operating system's reduced-motion preference.

## Technical architecture

- React and TypeScript for UI and state.
- Three.js through React Three Fiber and Drei for rendering, raycasting, and orbit controls.
- Vite emits a fully static `dist/` bundle with `/voxel/` as the public base path.
- Vitest covers deterministic world rules independently from rendering.
- A GitHub Actions workflow tests, builds, uploads, and deploys the Pages artifact on every push to `main`.

## Acceptance criteria

- A fresh game and every Reset produce a valid, varied procedural island with
  supported hills, grassy terrain, a pond, and two starter sheep.
- Place and Erase work on valid grid cells without duplicates.
- Right-drag orbits; left-click never rotates the camera.
- Left-drag never rotates the camera, including while painting blocks.
- Liquids conserve four quarter-block depth levels, spread evenly on their
  slower cadence, and seek lower open cells. Lava heat ignites nearby
  flammables, fire spreads, and weak vertical columns cannot exceed their
  material tolerance.
- Dirt can become grassy dirt, grassy dirt can sprout non-block vegetation, and
  covered grassy dirt returns to Dirt. Short grass matures into tall grass, and
  rare tree saplings mature into several tall Wood-and-Leaves tree shapes on
  exposed grass. All nineteen creatures can be spawned and face
  their movement direction. Herbivores seek their species-specific growths plus
  shared grassy dirt, Leaves, and Moss without crossing steps taller than one
  block, while beavers slowly eat only saplings or Wood, land predators hunt
  their listed land prey plus both fish species, and prey randomly
  fight or flee. Species use distinct, staggered movement cadences, with
  predators faster on average but fast herbivores able to keep pace. Animals
  starve at zero and die of old age. Every non-human animal species can produce
  smaller babies from a well-fed same-species adult pair and grow those babies into adults
  without displaying overhead bars. Burning animals rush into
  reachable water and extinguish; land animals swim across water. Kelp regrows
  on Water, Small Fish eat kelp, and Big Fish hunt Small Fish without leaving
  connected water. Fish keep planning through temporary animal traffic, wait
  before entering an occupied cell, and never plan through solid terrain.
- Humans carry one resource, hunt land animals, chop Wood, build and use a Basic
  Crafting Bench, craft an Axe, Hammer, and Spear, turn later logs into Planks,
  and place those planks into a small house one trip at a time. Healthy mature
  unrelated pairs can produce children whose six behavior traits average both
  parents with bounded mutation. Parent-child and sibling pairing is blocked,
  childhood takes 30 ticks, and total Human population never exceeds 40.
- Removing the last connection beneath or beside a structure makes the detached group settle.
- Gravity pause and resume work as specified.
- Verdant Touch, Wildfire, Rain, Deep Freeze, and Thaw affect only eligible
  blocks inside their small drag brush; all five preserve IDs and positions and
  can be undone or redone.
- Undo, redo, clear, reset, material selection, block count, and local persistence work.
- `npm test` and `npm run build` succeed.
- The GitHub Pages deployment succeeds from `main` and loads assets from the repository subpath.

## Future direction (not part of this release)

The architecture should leave room for more god powers, additional creatures, biomes,
weather, erosion, richer terrain generation, larger worlds, time controls, and
shareable world files. Broader genetics, multi-generation ancestry graphs,
social groups, settlements, and warfare remain outside this release. These
ideas must not be added until their behavior and performance budgets are
specified.
