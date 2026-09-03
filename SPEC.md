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
6. Hold W, A, S, or D to move the camera forward, left, backward, or right
   relative to its current view. Scroll to zoom in and out.
7. Pause or resume the complete simulation from the top bar, or separately
   pause only gravity from the creation panel.
8. Undo, redo, clear, use Reset to generate another compact starter island, or
   use New Seed to generate randomized terrain across the full build plane with
   a chance of starting wildlife.
9. Set one shared square brush size, then select any power and left-click or
   left-drag its area: Verdant Touch grassifies exposed Dirt, Wildfire ignites
   flammable blocks and animals, Rain extinguishes blocks and animals, Deep
   Freeze turns Water into Ice and Lava into Obsidian, and Thaw melts Ice and
   Snow into Water.
10. Select one of 19 land or aquatic creatures from the animal palette,
    then left-click the top of an unoccupied block column to spawn it.
11. Watch the persisted world clock move through sunrise, daylight, dusk, and
    a starry night with matching sky color, fog, shadows, and ambient light.

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
- New Seed fills every horizontal column of the playable build plane with a
  randomized mixture of plains, hills, lakes, beaches, soil, and stone.
- A cell contains at most one block.
- Every block has a stable ID, cell position, and material.
- Saved data must be validated before it is loaded. Compatible older ecosystem
  saves are upgraded with lifecycle defaults; invalid data falls back to a new
  procedurally generated map.

## Structural gravity

Gravity is material-aware and connectivity-based rather than a full rigid-body simulation.

- A block touching the plane is grounded.
- Every structural or cohesive material has a generous support tolerance
  describing how far it can carry a face-connected structure away from direct
  support. Each upward or sideways connection consumes that tolerance, but all
  solid materials are substantially more stable than the initial balance:
  even Dirt and Peat carry five connections, Grass carries six, common masonry
  carries long spans, Planks and Basic Crafting Benches carry 24, and Wood
  carries 32. Materials still differ in strength, but placed building blocks
  should rarely slide off ordinary walls, roofs, or narrow supports.
- Rigid and cohesive blocks can transmit support through face connections. Wood
  can carry a tree canopy, and Leaves can extend that canopy through neighboring
  Leaves within their shorter tolerance. Leaves never transmit structural
  support back into Wood or other materials, so touching canopies cannot brace
  a neighboring trunk after that trunk is chopped.
- Leaves remain healthy while their face-connected canopy reaches any Wood
  block. An orphaned canopy left after its Wood is chopped browns and fades
  through six ecosystem ticks, then its Leaves disappear.
- A vertical Wood trunk rooted directly on supported terrain begins with
  Wood's own support tolerance, allowing a grown tree to remain upright.
- Loose and fluid materials—including sand, gravel, snow, mud, water, and lava—do not receive or transmit sideways support. They fall and roll downhill until directly supported by the plane or a block below.
- When an edit disconnects a group from every grounded block, the whole disconnected group falls together one grid level at a time.
- The group stops once it touches the plane or reconnects to a supported structure.
- The group keeps its internal shape while falling.
- Pausing gravity allows unsupported structures to remain suspended. Resuming
  gravity advances unsupported groups one cell per simulation tick so the
  player can watch the complete fall.
- Gravity processing wakes after loading, terrain edits, structural ecosystem
  changes, fire damage, undo, redo, or resuming gravity. It stops scanning the
  world after both structures and the slower liquid pass report that nothing
  moved, then remains idle until another event can destabilize the world.
- A freshly placed loose or fluid block can roll diagonally off an occupied
  cell before it becomes stable, so repeated placement forms a low pile
  instead of an implausibly thin tower. Rigid blocks remain on direct supports,
  and existing falling groups still preserve their shape.

## Liquids and fire

- Water and lava use four conserved depth levels: quarter, half, three-quarter,
  and full blocks. They fall vertically whenever possible. On level ground,
  each shared horizontal edge transfers at most one quarter per flow step and
  only while neighboring depths differ by at least two quarters. Every transfer
  therefore reduces the local imbalance, allowing pools to become still
  instead of alternating between checkerboard patterns. A final quarter can
  still spill over a genuine ledge and fall to a lower open cell.
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
  nearest reachable water. Lava radiates the same two-cell horizontal and
  one-level vertical heat to animals that it does to flammable blocks. An
  animal beside lava or underneath newly placed lava catches fire and first
  runs away from the heat; animals cannot be spawned inside and never choose
  paths through lava or its heat zone. Entering water extinguishes them. Land
  animals can cross connected water surfaces by swimming through them.
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
  sapling matures after 56 ecosystem ticks into one of three tall
  Wood-and-Leaves tree patterns. Each
  keeps its canopy well above the reach of animals on level ground and grows
  only when its footprint is unobstructed;
  otherwise it waits and tries again on a later ecosystem tick. Generated
  canopies do not become animal platforms: animals walk on clear ground below
  high branches, can be spawned there, cannot enter trunk columns, and move to
  nearby safe ground if an older save left them inside a trunk.
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
  herbivores can still match them. Animals plan through cells occupied by other
  animals as temporary traffic, but wait before entering an occupied next cell
  and retry on later ticks. Missing or unsafe terrain and steps taller than one
  block remain permanent path barriers. When no food is reachable, animals wait
  rather than pacing back and forth. Eating bare grassy dirt changes it back to
  Dirt, allowing the grass cycle to begin again. Animals avoid eating burning
  grass. Every animal visibly turns to face the direction it moves.
- One full day and night lasts 80 ecosystem ticks and resumes from the saved
  ecosystem tick. At night ordinary animals sleep in place instead of feeding,
  moving, or breeding. Each predator has a deterministic 35% chance per night
  to remain awake as a night stalker. An awake predator can hunt sleeping prey,
  which does not wake in time to flee from that surprise attack. Burning
  animals always stay awake and continue rushing toward water.
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
  on surfaces no more than one block level apart, and a neighboring reachable
  surface is open, each parent spends 30 hunger to create a
  visibly smaller baby of their species. Babies eat but do not breed; after
  three meals, a baby visibly grows into an adult and begins a short breeding
  cooldown.
- Humans use a deterministic work routine shaped by six individual inherited
  traits. A hungry Human seeks and attacks a nearby animal, including fish it
  can reach by swimming; a crafted Spear
  increases its hunting damage. At other times it seeks Wood, chops one exposed
  Wood block at a time, and carries resources in a single-material stack of up
  to eight matching blocks. If no communal bench is nearby, its first log
  becomes a Basic Crafting Bench on a
  neighboring safe surface. A Human tracks whether its current task makes
  meaningful progress. After eight consecutive awake ticks without moving or
  advancing that task, it abandons the blocked commitment and explores toward
  another reachable destination before choosing fresh work.
- Before constructing a bench, a Human adopts the nearest existing Basic
  Crafting Bench within ten horizontal grid steps. If no bench is within ten
  steps, it uses its first log to build its own. Nearby Humans therefore share
  a communal workshop and contribute planks to the same house instead of each
  creating a duplicate bench. A Human places one carried log into its adopted
  bench and leaves its hand empty while the bench works. It takes the result
  when the recipe finishes. Its first three
  recipes produce an Axe, Hammer, and Spear in that order; the Axe makes logging
  faster, the Hammer enables construction work, and the Spear improves hunting.
  A Human equips only the tool for its current job and switches back to the Axe
  for logging, the Hammer for construction, or the Spear for hunting whenever
  its priority changes. Only the equipped tool provides its work bonus. Later
  logs become four Planks each. Owned tools remain worn equipment rather than
  occupying the single-material resource stack.
- Once equipped, a Human carries its Planks stack to the next cell in a
  five-by-five cabin blueprint. The cabin has a clear three-by-three interior,
  a two-block-tall front doorway, side and rear window openings, and a complete
  roof. Its doorway faces the communal Basic Crafting Bench, which remains
  outside with a clear cell between the workshop and house. A Human places only
  one Planks block per trip. Generated cabin roofs do not replace the walkable
  interior ground in the animal surface map; walls and furniture remain solid.
  Each blueprint cell containing Planks already counts as complete, regardless
  of which Human placed it, so a surviving Human can finish an abandoned
  partial cabin. If an incompatible block occupies the next required cell, the
  builder approaches and dismantles it before placing the correct part.
  Destroying the bench cancels anything left inside it.
- After the cabin shell is complete, Humans use later Planks to build a bed and
  pantry inside. At night a Human approaches its bed, sleeps, and recovers one
  health every four ticks. A completed pantry doubles the Human's overnight
  hunger-loss interval. Once the cabin and both furnishings are complete,
  Humans stop harvesting wood for that finished home and return to other work,
  hunting, or exploration.
- Every founder receives bounded individual Aggression, Caution, Exploration,
  Gathering, Craftsmanship, and Efficiency values. Aggression changes how early
  it hunts and its attack strength; Caution changes the health risk it accepts;
  Exploration sets its resource and mate search distance; Gathering changes
  logging cadence; Craftsmanship changes bench time; and Efficiency changes how
  often hunger falls. On every free tick, a Human makes an intrinsic random,
  trait-weighted choice to hunt, work, or explore. It randomly chooses among a
  few nearby prey at the start of a hunt, then locks onto that individual until
  it catches it, the prey disappears, or the path stays blocked for eight awake
  ticks. This prevents a faster Human from wasting its movement by alternating
  between slower targets. It also randomly chooses among nearby Wood targets,
  wanders toward a random reachable destination, and chooses randomly among
  eligible unrelated partners. Active crafting and carrying jobs remain
  committed work, while emergency hunger always overrides the roll: the Human
  searches the entire reachable world for prey and accepts risks it would
  normally avoid. It spends one block from its carried Planks stack for each
  cabin or furniture block. A colored sash makes individuals visually distinct.
- A healthy Human can reproduce after age 12 when it has at least 70 hunger,
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
  must be on a horizontally neighboring surface no more than one block level
  higher or lower; predators cannot attack through cliffs or into canopies.
  Awake prey detects a predator that hunts its species within four cells and
  immediately tries to run one safe step farther away, even when that predator
  is not currently hungry. Prey never fights back against either an animal
  predator or a Human hunter. Cornered prey is caught when no escape exists. A
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
  recipes, current hunt targets, traits, generation, parent IDs, and task-stall
  counters persist with the local world. Older Human saves receive deterministic
  founder traits and a clear task-stall counter during migration. Reset restores
  a fresh ecosystem; Clear removes it.

## God powers

- Powers live in their own panel beside the creation tools on the left side of
  the screen, leaving the right side clear.
- All five powers share one adjustable odd-numbered brush size from one through
  fifteen cells. The preview and affected area are square and centered on the
  targeted cell. A left-click applies one patch, and a calm left-drag cadence
  paints adjacent patches without rotating the camera. No power affects the
  whole world at once.
- Wildfire ignites both flammable blocks and animals inside the square. Rain
  extinguishes either kind of burning target. Their combined changes use the
  same undo and redo snapshots as other world edits.
- A power is disabled when the current world contains no eligible target. Every
  power button is labeled as an area action, exposes its selected state, and
  reports a plain-language result after each successful patch.
- Every power preserves stable block IDs and cell positions. Powers that create
  fluid or unsupported materials allow gravity to resume settling normally.
- Power changes participate in the same undo and redo history as direct edits.

## Interface and visual direction

- Full-screen isometric world with a soft sage daytime sky, deep blue starry
  nights, a warm neutral plane, visible grid, time-varying fog, and directional
  sun or moon shadows. The world status shows Day or Night and the current time.
- Compact translucent tool surfaces use cream, forest green, lime, soil brown, stone gray, and sand gold.
- Creation tools and the separate Powers section are grouped on the left side;
  the right side remains open for viewing the world.
- Every material uses a distinct pixel texture rather than a flat color. Grass is a dirt block with a separate grassy cap, a green top, and an irregular grass fringe over its dirt sides; wood uses bark and growth rings, masonry uses joints, and ore blocks show mineral deposits embedded in stone.
- Short grass, tall grass, flowers, and tree saplings use hard-edged,
  axis-aligned cuboids so surface vegetation matches the world's pixelated
  voxel style. Flower colors remain varied between individual plants.
- Rendered cubes fill quarter-unit grid cells and touch neighboring cubes.
  Their geometry, spacing, placement grid, and gravity steps are all 25% of the
  original one-unit block size. Palette tiles stay very small and compact
  enough to show the expanded collection without covering the world.
- Controls must expose accessible names, selected states, disabled states, and keyboard shortcuts where applicable.
- The top bar exposes a persistent Pause button, with the P key as its shortcut.
  Pausing freezes the world clock, ecosystem, fire, leaf decay, structural
  gravity, and liquid flow while leaving direct editing controls available.
- Selecting an animal displays its name and diet, and the spawn preview clearly
  distinguishes a valid surface from an occupied or otherwise invalid one.
- Every animal is assembled entirely from hard-edged, grid-snapped cuboids so
  its pixelated voxel style matches the ground. Each still has a
  species-specific silhouette rather than sharing a recolored quadruped body.
  Large identifying features stay readable at the
  normal camera distance: horns and antlers, ears and muzzles, manes and tails,
  wings and beaks, shells and flippers, and the Crocodile's long body and snout.
  Humans have an upright silhouette and visibly show a carried log or plank and
  the tool equipped for their current job. Right-clicking a Human without
  dragging opens a compact individual inspector with its name, activity,
  generation, parents, vitals, equipment, and six trait values. The same
  right-button gesture continues orbiting the camera when dragged.
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
- New Seed produces a valid randomized map spanning the complete playable
  horizontal range and may begin with a small random wildlife population.
- Place and Erase work on valid grid cells without duplicates.
- Right-drag orbits; left-click never rotates the camera.
- Left-drag never rotates the camera, including while painting blocks.
- Liquids conserve four quarter-block depth levels, converge to a stable pool
  on their slower cadence without oscillating, and seek lower open cells. Lava
  heat ignites nearby flammables and animals, including animals underneath
  newly placed lava. Animals avoid lava heat zones, fire spreads, and weak
  vertical columns cannot exceed their material tolerance.
- Wood supports its Leaves, but Leaves never hold up Wood or other solid blocks;
  a chopped trunk falls even when its canopy touches a neighboring tree.
- Dirt can become grassy dirt, grassy dirt can sprout non-block vegetation, and
  covered grassy dirt returns to Dirt. Short grass matures into tall grass, and
  rare tree saplings mature into several tall Wood-and-Leaves tree shapes on
  exposed grass. All nineteen creatures can be spawned and face
  their movement direction. Herbivores seek their species-specific growths plus
  shared grassy dirt, Leaves, and Moss without crossing steps taller than one
  block, while beavers slowly eat only saplings or Wood, land predators hunt
  their listed land prey plus both fish species, and awake prey runs from nearby
  predators without ever fighting back. Species use distinct, staggered
  movement cadences, with
  predators faster on average but fast herbivores able to keep pace. Animals
  plan through temporary animal traffic, wait before entering an occupied
  cell, and never plan through impassable terrain. Ordinary animals sleep at
  night while a deterministic minority of predators remain awake to surprise
  sleeping prey. The visible clock, sky, stars, fog, and lighting complete the
  same persisted 160-tick cycle. Animals starve at zero and die of old age.
  Every non-human animal species can produce
  smaller babies from a well-fed same-species adult pair and grow those babies into adults
  without displaying overhead bars. Burning animals rush into
  reachable water and extinguish; land animals swim across water. Kelp regrows
  on Water, Small Fish eat kelp, and Big Fish hunt Small Fish without leaving
  connected water. Fish keep planning through temporary animal traffic, wait
  before entering an occupied cell, and never plan through solid terrain.
- Humans carry one material type at a time, hunt animals, chop Wood, share and use a nearby
  Basic Crafting Bench, craft an Axe, Hammer, and Spear, turn each later log
  into four Planks, carry up to eight matching resource blocks, randomly choose
  among available work, hunting, and exploration tasks,
  switch among tools as their job changes, and place planks into a roomy
  five-by-five cabin while keeping the shared bench outside. Finished cabins
  contain a visible bed and pantry; Humans use the bed to heal while sleeping
  and the pantry to reduce overnight hunger loss. Right-clicking a Human
  without dragging opens its individual stats. A Human that makes no progress
  on a task for eight awake ticks abandons it and retries reachable work.
  A hunter keeps one prey target throughout a chase instead of zig-zagging
  between nearby animals.
  Surviving builders reuse Planks in abandoned cabin blueprint cells, skip
  completed parts, and dismantle incompatible blocks before continuing.
  Leaves cut off from every Wood block visibly decay over six ecosystem ticks
  before disappearing.
  Healthy mature
  unrelated pairs can produce children whose six behavior traits average both
  parents with bounded mutation. Parent-child and sibling pairing is blocked,
  childhood takes 30 ticks, and total Human population never exceeds 40.
- Removing the last connection beneath or beside a structure makes the detached group settle.
- Whole-world pause freezes all simulation systems and resumes them together;
  gravity-only pause and resume also work as specified.
- Verdant Touch, Wildfire, Rain, Deep Freeze, and Thaw affect only eligible
  targets inside their shared adjustable square drag brush; Wildfire and Rain
  also affect animals. All five preserve IDs and positions and can be undone or
  redone.
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
