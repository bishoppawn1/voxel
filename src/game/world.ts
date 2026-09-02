export const MATERIAL_KEYS = [
  'grass',
  'soil',
  'stone',
  'sand',
  'wood',
  'leaves',
  'brick',
  'clay',
  'snow',
  'ice',
  'water',
  'lava',
  'obsidian',
  'coal',
  'iron',
  'gold',
  'copper',
  'glass',
  'moss',
  'mud',
  'gravel',
  'marble',
  'basalt',
  'crystal',
  'cobblestone',
  'limestone',
  'granite',
  'slate',
  'sandstone',
  'planks',
  'crafting-bench',
  'terracotta',
  'concrete',
  'steel',
  'glowstone',
  'diamond',
  'emerald',
  'quartz',
  'bamboo',
  'peat',
  'coral',
] as const;

export type BlockMaterial = (typeof MATERIAL_KEYS)[number];

type MaterialDefinition = {
  label: string;
  color: string;
  edge: string;
  supportTolerance: number;
  gravityBehavior: 'structural' | 'cohesive' | 'loose' | 'fluid';
  burnDuration?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export type VoxelBlock = {
  id: string;
  x: number;
  y: number;
  z: number;
  material: BlockMaterial;
  burning?: number;
  leafDecay?: number;
  liquidLevel?: LiquidLevel;
};

export const MAX_LIQUID_LEVEL = 4;
export type LiquidLevel = 1 | 2 | 3 | 4;
export const LEAF_DECAY_TICKS = 6;

export type Cell = Pick<VoxelBlock, 'x' | 'y' | 'z'>;

export const BLOCK_SIZE = 0.25;
export const WORLD_RENDER_SIZE = 24;
export const WORLD_SIZE = WORLD_RENDER_SIZE / BLOCK_SIZE;
export const WORLD_RADIUS = WORLD_SIZE / 2;
export const MAX_HEIGHT = 12 / BLOCK_SIZE;
export const MAX_WORLD_BLOCKS = (WORLD_SIZE - 1) ** 2 * 3;

export const MATERIALS: Record<
  BlockMaterial,
  MaterialDefinition
> = {
  grass: { label: 'Grass', color: '#72a55a', edge: '#496f43', supportTolerance: 6, gravityBehavior: 'cohesive', burnDuration: 3 },
  soil: { label: 'Dirt', color: '#9a6845', edge: '#70482f', supportTolerance: 5, gravityBehavior: 'cohesive' },
  stone: { label: 'Stone', color: '#7d898e', edge: '#586468', supportTolerance: 16, gravityBehavior: 'structural' },
  sand: { label: 'Sand', color: '#d7bd76', edge: '#a88d4d', supportTolerance: 0, gravityBehavior: 'loose' },
  wood: { label: 'Wood', color: '#a8733f', edge: '#6f4626', supportTolerance: 32, gravityBehavior: 'structural', burnDuration: 6, roughness: 0.95 },
  leaves: { label: 'Leaves', color: '#477d46', edge: '#285532', supportTolerance: 12, gravityBehavior: 'cohesive', burnDuration: 3, roughness: 0.9 },
  brick: { label: 'Brick', color: '#a74f3f', edge: '#743327', supportTolerance: 18, gravityBehavior: 'structural', roughness: 0.92 },
  clay: { label: 'Clay', color: '#bf765d', edge: '#894f40', supportTolerance: 9, gravityBehavior: 'cohesive', roughness: 0.9 },
  snow: { label: 'Snow', color: '#f2f5ee', edge: '#b8c7c1', supportTolerance: 0, gravityBehavior: 'loose', roughness: 0.72 },
  ice: { label: 'Ice', color: '#a9dce5', edge: '#5f9eb2', supportTolerance: 12, gravityBehavior: 'structural', roughness: 0.25, opacity: 0.78 },
  water: { label: 'Water', color: '#4b9dc4', edge: '#267294', supportTolerance: 0, gravityBehavior: 'fluid', roughness: 0.18, opacity: 0.68 },
  lava: { label: 'Lava', color: '#f0682c', edge: '#a73520', supportTolerance: 0, gravityBehavior: 'fluid', roughness: 0.65, emissive: '#d33e14', emissiveIntensity: 0.48 },
  obsidian: { label: 'Obsidian', color: '#312b40', edge: '#17141f', supportTolerance: 28, gravityBehavior: 'structural', roughness: 0.35, metalness: 0.22 },
  coal: { label: 'Coal', color: '#3e4341', edge: '#1d211f', supportTolerance: 14, gravityBehavior: 'structural', burnDuration: 8, roughness: 0.96 },
  iron: { label: 'Iron', color: '#a8ada8', edge: '#666e6c', supportTolerance: 20, gravityBehavior: 'structural', roughness: 0.5, metalness: 0.55 },
  gold: { label: 'Gold', color: '#d9ad36', edge: '#8f6a17', supportTolerance: 16, gravityBehavior: 'structural', roughness: 0.34, metalness: 0.72 },
  copper: { label: 'Copper', color: '#bc6f46', edge: '#78442e', supportTolerance: 16, gravityBehavior: 'structural', roughness: 0.5, metalness: 0.5 },
  glass: { label: 'Glass', color: '#d8f0e9', edge: '#78a9a1', supportTolerance: 10, gravityBehavior: 'structural', roughness: 0.08, opacity: 0.42 },
  moss: { label: 'Moss', color: '#71883f', edge: '#485929', supportTolerance: 6, gravityBehavior: 'cohesive', burnDuration: 3, roughness: 1 },
  mud: { label: 'Mud', color: '#6f503b', edge: '#453125', supportTolerance: 0, gravityBehavior: 'loose', roughness: 1 },
  gravel: { label: 'Gravel', color: '#8d8880', edge: '#5d5954', supportTolerance: 0, gravityBehavior: 'loose', roughness: 1 },
  marble: { label: 'Marble', color: '#ddd9cf', edge: '#989990', supportTolerance: 30, gravityBehavior: 'structural', roughness: 0.38 },
  basalt: { label: 'Basalt', color: '#555a60', edge: '#2f3337', supportTolerance: 24, gravityBehavior: 'structural', roughness: 0.93 },
  crystal: { label: 'Crystal', color: '#9d75d5', edge: '#5e388f', supportTolerance: 14, gravityBehavior: 'structural', roughness: 0.18, opacity: 0.82, emissive: '#654098', emissiveIntensity: 0.22 },
  cobblestone: { label: 'Cobblestone', color: '#727976', edge: '#454c49', supportTolerance: 18, gravityBehavior: 'structural', roughness: 0.98 },
  limestone: { label: 'Limestone', color: '#c9bd99', edge: '#8d8062', supportTolerance: 18, gravityBehavior: 'structural', roughness: 0.88 },
  granite: { label: 'Granite', color: '#9a736c', edge: '#604842', supportTolerance: 24, gravityBehavior: 'structural', roughness: 0.78 },
  slate: { label: 'Slate', color: '#53616a', edge: '#303941', supportTolerance: 20, gravityBehavior: 'structural', roughness: 0.72 },
  sandstone: { label: 'Sandstone', color: '#c89f62', edge: '#8c6a3e', supportTolerance: 14, gravityBehavior: 'structural', roughness: 0.92 },
  planks: { label: 'Planks', color: '#b98249', edge: '#714526', supportTolerance: 24, gravityBehavior: 'structural', burnDuration: 6, roughness: 0.9 },
  'crafting-bench': { label: 'Basic Crafting Bench', color: '#8d5a32', edge: '#4e2e1b', supportTolerance: 24, gravityBehavior: 'structural', burnDuration: 6, roughness: 0.94 },
  terracotta: { label: 'Terracotta', color: '#bd6848', edge: '#7c3e2e', supportTolerance: 11, gravityBehavior: 'cohesive', roughness: 0.86 },
  concrete: { label: 'Concrete', color: '#a2a5a0', edge: '#646965', supportTolerance: 26, gravityBehavior: 'structural', roughness: 0.91 },
  steel: { label: 'Steel', color: '#89969c', edge: '#4a565d', supportTolerance: 30, gravityBehavior: 'structural', roughness: 0.25, metalness: 0.8 },
  glowstone: { label: 'Glowstone', color: '#d8a442', edge: '#94621d', supportTolerance: 14, gravityBehavior: 'structural', roughness: 0.55, emissive: '#e58a22', emissiveIntensity: 0.4 },
  diamond: { label: 'Diamond Ore', color: '#67cbd0', edge: '#286f78', supportTolerance: 26, gravityBehavior: 'structural', roughness: 0.28, metalness: 0.3 },
  emerald: { label: 'Emerald Ore', color: '#4bb875', edge: '#246842', supportTolerance: 24, gravityBehavior: 'structural', roughness: 0.3, metalness: 0.25 },
  quartz: { label: 'Quartz', color: '#e7dfd4', edge: '#aaa097', supportTolerance: 20, gravityBehavior: 'structural', roughness: 0.42 },
  bamboo: { label: 'Bamboo', color: '#85a83f', edge: '#4e6f2d', supportTolerance: 18, gravityBehavior: 'structural', burnDuration: 5, roughness: 0.9 },
  peat: { label: 'Peat', color: '#4f382d', edge: '#30221d', supportTolerance: 5, gravityBehavior: 'cohesive', burnDuration: 8, roughness: 1 },
  coral: { label: 'Coral', color: '#dd7f82', edge: '#984f5e', supportTolerance: 11, gravityBehavior: 'cohesive', roughness: 0.95 },
};

const NEIGHBORS: Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

const ROLL_DIRECTIONS: Cell[] = [
  { x: 1, y: -1, z: 0 },
  { x: -1, y: -1, z: 0 },
  { x: 0, y: -1, z: 1 },
  { x: 0, y: -1, z: -1 },
];

const HORIZONTAL_DIRECTIONS: Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

export const cellKey = ({ x, y, z }: Cell) => `${x},${y},${z}`;

export function advanceLeafDecay(input: VoxelBlock[]): {
  blocks: VoxelBlock[];
  changed: boolean;
  decayed: number;
} {
  const byCell = new Map(input.map((block) => [cellKey(block), block]));
  const supportedLeaves = new Set<string>();
  const queue = input.filter(({ material }) => material === 'wood');

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const offset of NEIGHBORS) {
      const neighbor = byCell.get(cellKey({
        x: current.x + offset.x,
        y: current.y + offset.y,
        z: current.z + offset.z,
      }));
      if (!neighbor || neighbor.material !== 'leaves' || supportedLeaves.has(neighbor.id)) {
        continue;
      }
      supportedLeaves.add(neighbor.id);
      queue.push(neighbor);
    }
  }

  let changed = false;
  let decayed = 0;
  const blocks = input.flatMap<VoxelBlock>((block) => {
    if (block.material !== 'leaves') return [block];
    if (supportedLeaves.has(block.id)) {
      if (block.leafDecay === undefined) return [block];
      const { leafDecay: _leafDecay, ...healthyLeaf } = block;
      changed = true;
      return [healthyLeaf];
    }

    const leafDecay = (block.leafDecay ?? 0) + 1;
    changed = true;
    if (leafDecay >= LEAF_DECAY_TICKS) {
      decayed += 1;
      return [];
    }
    return [{ ...block, leafDecay }];
  });

  return { blocks: changed ? blocks : input, changed, decayed };
}

export const cellToWorld = (coordinate: number) => coordinate * BLOCK_SIZE;

export const worldToCell = (coordinate: number) => Math.round(coordinate / BLOCK_SIZE);

export function getLiquidLevel(block: VoxelBlock): LiquidLevel {
  return block.liquidLevel ?? MAX_LIQUID_LEVEL;
}

export function isInWorld({ x, y, z }: Cell) {
  return (
    x >= -WORLD_RADIUS + 1 &&
    x <= WORLD_RADIUS - 1 &&
    z >= -WORLD_RADIUS + 1 &&
    z <= WORLD_RADIUS - 1 &&
    y >= 0 &&
    y < MAX_HEIGHT
  );
}

export function hasBlock(blocks: VoxelBlock[], cell: Cell) {
  const key = cellKey(cell);
  return blocks.some((block) => cellKey(block) === key);
}

/**
 * Settles one freshly placed, particle-sized block. It falls through open
 * cells and rolls diagonally off occupied cells when it is loose, fluid, or
 * beyond the support tolerance of the structure it touches. Established
 * structures are handled by settleWorld below.
 */
export function settlePlacedBlock(input: VoxelBlock[], blockId: string) {
  const original = input.find((block) => block.id === blockId);
  if (!original) return { blocks: input, moved: false };

  const behavior = MATERIALS[original.material].gravityBehavior;
  const isLoose = behavior === 'loose' || behavior === 'fluid';
  if (!isLoose && anchoredBlockIds(input).has(original.id)) {
    return { blocks: input, moved: false };
  }

  const occupied = new Set(
    input.filter((block) => block.id !== blockId).map((block) => cellKey(block)),
  );
  let moving = { ...original };
  let moved = false;

  while (moving.y > 0) {
    const below = { x: moving.x, y: moving.y - 1, z: moving.z };
    if (!occupied.has(cellKey(below))) {
      moving = { ...moving, ...below };
      moved = true;
      continue;
    }

    const directionOffset =
      Math.abs(moving.x * 31 + moving.y * 17 + moving.z * 13) % ROLL_DIRECTIONS.length;
    let rolled: Cell | undefined;

    for (let index = 0; index < ROLL_DIRECTIONS.length; index += 1) {
      const direction = ROLL_DIRECTIONS[(index + directionOffset) % ROLL_DIRECTIONS.length];
      const candidate = {
        x: moving.x + direction.x,
        y: moving.y + direction.y,
        z: moving.z + direction.z,
      };
      if (isInWorld(candidate) && !occupied.has(cellKey(candidate))) {
        rolled = candidate;
        break;
      }
    }

    if (!rolled) break;
    moving = { ...moving, ...rolled };
    moved = true;
  }

  if (!moved) return { blocks: input, moved: false };
  return {
    blocks: input.map((block) => (block.id === blockId ? moving : block)),
    moved: true,
  };
}

function anchoredBlockIds(blocks: VoxelBlock[]) {
  const byCell = new Map(blocks.map((block) => [cellKey(block), block]));
  const anchored = new Set<string>();
  const queue = blocks.filter((block) => block.y === 0);
  const remainingTolerance = new Map<string, number>();

  queue.forEach((block) => {
    anchored.add(block.id);
    remainingTolerance.set(block.id, MATERIALS[block.material].supportTolerance);
  });

  for (let index = 0; index < queue.length; index += 1) {
    const block = queue[index];
    for (const offset of NEIGHBORS) {
      const neighbor = byCell.get(
        cellKey({
          x: block.x + offset.x,
          y: block.y + offset.y,
          z: block.z + offset.z,
        }),
      );
      if (!neighbor) continue;

      const neighborTolerance = MATERIALS[neighbor.material].supportTolerance;
      const sourceTolerance = remainingTolerance.get(block.id) ?? 0;
      const rootedWoodTolerance =
        offset.y === 1 &&
        block.material !== 'wood' &&
        neighbor.material === 'wood'
          ? neighborTolerance
          : sourceTolerance;
      const nextTolerance = Math.min(rootedWoodTolerance, neighborTolerance) - 1;

      if (nextTolerance < 0) continue;
      if ((remainingTolerance.get(neighbor.id) ?? -1) >= nextTolerance) continue;

      anchored.add(neighbor.id);
      remainingTolerance.set(neighbor.id, nextTolerance);
      queue.push(neighbor);
    }
  }

  return anchored;
}

function floatingComponents(blocks: VoxelBlock[], floatingIds: Set<string>) {
  const byCell = new Map(blocks.map((block) => [cellKey(block), block]));
  const remaining = new Set(floatingIds);
  const components: VoxelBlock[][] = [];

  for (const seed of blocks) {
    if (!remaining.delete(seed.id)) continue;
    const component = [seed];

    for (let index = 0; index < component.length; index += 1) {
      const block = component[index];
      for (const offset of NEIGHBORS) {
        const neighbor = byCell.get(
          cellKey({
            x: block.x + offset.x,
            y: block.y + offset.y,
            z: block.z + offset.z,
          }),
        );
        if (neighbor && remaining.delete(neighbor.id)) component.push(neighbor);
      }
    }

    components.push(component);
  }

  return components;
}

function settleStructuresStep(input: VoxelBlock[]) {
  const anchored = anchoredBlockIds(input);
  const floating = input.filter(
    (block) =>
      !anchored.has(block.id) && MATERIALS[block.material].gravityBehavior !== 'fluid',
  );
  if (floating.length === 0) return { blocks: input, moved: false };

  const floatingIds = new Set(floating.map((block) => block.id));
  const components = floatingComponents(input, floatingIds);
  const occupied = new Set(input.map((block) => cellKey(block)));
  const byId = new Map(input.map((block) => [block.id, block]));
  let moved = false;

  for (const component of components) {
    component.forEach((block) => occupied.delete(cellKey(block)));
    const seed = component[0];
    const directionOffset =
      Math.abs(seed.x * 31 + seed.y * 17 + seed.z * 13) % ROLL_DIRECTIONS.length;
    const translations = [
      { x: 0, y: -1, z: 0 },
      ...ROLL_DIRECTIONS.map(
        (_, index) => ROLL_DIRECTIONS[(index + directionOffset) % ROLL_DIRECTIONS.length],
      ),
    ];
    const translation = translations.find((offset) =>
      component.every((block) => {
        const destination = {
          x: block.x + offset.x,
          y: block.y + offset.y,
          z: block.z + offset.z,
        };
        return isInWorld(destination) && !occupied.has(cellKey(destination));
      }),
    );

    if (translation) {
      component.forEach((block) => {
        const next = {
          ...block,
          x: block.x + translation.x,
          y: block.y + translation.y,
          z: block.z + translation.z,
        };
        byId.set(block.id, next);
        occupied.add(cellKey(next));
      });
      moved = true;
    } else {
      component.forEach((block) => occupied.add(cellKey(block)));
    }
  }

  return {
    blocks: moved ? input.map((block) => byId.get(block.id) ?? block) : input,
    moved,
  };
}

function settleStructures(input: VoxelBlock[]) {
  let blocks = input;
  let moved = false;

  for (let step = 0; step < MAX_HEIGHT * 2; step += 1) {
    const result = settleStructuresStep(blocks);
    if (!result.moved) break;
    blocks = result.blocks;
    moved = true;
  }

  return { blocks, moved };
}

type LiquidTransfer = {
  sourceId: string;
  target: Cell;
  targetKey: string;
  material: BlockMaterial;
};

function liquidDirections(block: VoxelBlock) {
  const offset = Math.abs(block.x * 31 + block.y * 17 + block.z * 13) % HORIZONTAL_DIRECTIONS.length;
  return HORIZONTAL_DIRECTIONS.map(
    (_, index) => HORIZONTAL_DIRECTIONS[(index + offset) % HORIZONTAL_DIRECTIONS.length],
  );
}

function flowBlockId(sourceId: string, target: Cell, usedIds: Set<string>) {
  const root = `${sourceId}:flow:${target.x}:${target.y}:${target.z}`;
  let id = root;
  let suffix = 1;
  while (usedIds.has(id)) {
    id = `${root}:${suffix}`;
    suffix += 1;
  }
  return id;
}

function displaceLiquidCell(
  liquid: VoxelBlock,
  byId: Map<string, VoxelBlock>,
  byCell: Map<string, VoxelBlock>,
  usedIds: Set<string>,
) {
  const candidates = liquidDirections(liquid).map((offset) => {
    const cell = {
      x: liquid.x + offset.x,
      y: liquid.y,
      z: liquid.z + offset.z,
    };
    const existing = isInWorld(cell) ? byCell.get(cellKey(cell)) : undefined;
    const capacity = !isInWorld(cell) || (existing && existing.material !== liquid.material)
      ? 0
      : existing
        ? MAX_LIQUID_LEVEL - getLiquidLevel(existing)
        : MAX_LIQUID_LEVEL;
    return { cell, existing, capacity, amount: 0 };
  });
  let remaining: number = getLiquidLevel(liquid);
  if (candidates.reduce((capacity, candidate) => capacity + candidate.capacity, 0) < remaining) {
    return false;
  }

  while (remaining > 0) {
    for (const candidate of candidates) {
      if (remaining === 0) break;
      if (candidate.amount >= candidate.capacity) continue;
      candidate.amount += 1;
      remaining -= 1;
    }
  }

  byId.delete(liquid.id);
  byCell.delete(cellKey(liquid));
  usedIds.delete(liquid.id);
  let inheritedId = false;

  for (const candidate of candidates) {
    if (candidate.amount === 0) continue;
    if (candidate.existing) {
      const filled = {
        ...candidate.existing,
        liquidLevel: (getLiquidLevel(candidate.existing) + candidate.amount) as LiquidLevel,
      };
      byId.set(filled.id, filled);
      byCell.set(cellKey(filled), filled);
      continue;
    }

    const id = inheritedId
      ? flowBlockId(liquid.id, candidate.cell, usedIds)
      : liquid.id;
    inheritedId = true;
    const displaced = {
      ...candidate.cell,
      id,
      material: liquid.material,
      liquidLevel: candidate.amount as LiquidLevel,
    };
    usedIds.add(id);
    byId.set(id, displaced);
    byCell.set(cellKey(displaced), displaced);
  }

  return true;
}

/**
 * Lets a freshly placed solid sink through liquid cells by pushing each
 * displaced quarter-unit evenly into neighboring cells. Nothing moves when
 * the surrounding cells cannot hold the complete liquid volume.
 */
export function settlePlacedBlockOnLiquid(input: VoxelBlock[], blockId: string) {
  const original = input.find((block) => block.id === blockId);
  if (!original || MATERIALS[original.material].gravityBehavior === 'fluid') {
    return { blocks: input, moved: false };
  }

  const byId = new Map(input.map((block) => [block.id, block]));
  const byCell = new Map(input.map((block) => [cellKey(block), block]));
  const usedIds = new Set(byId.keys());
  let moving = original;
  let moved = false;

  while (moving.y > 0) {
    const destination = { x: moving.x, y: moving.y - 1, z: moving.z };
    const liquid = byCell.get(cellKey(destination));
    if (!liquid || MATERIALS[liquid.material].gravityBehavior !== 'fluid') break;
    if (!displaceLiquidCell(liquid, byId, byCell, usedIds)) break;

    byCell.delete(cellKey(moving));
    moving = { ...moving, ...destination };
    byId.set(moving.id, moving);
    byCell.set(cellKey(moving), moving);
    moved = true;
  }

  if (!moved) return { blocks: input, moved: false };
  const originalIds = new Set(input.map((block) => block.id));
  return {
    blocks: [
      ...input.flatMap((block) => {
        const next = byId.get(block.id);
        return next ? [next] : [];
      }),
      ...[...byId.values()].filter((block) => !originalIds.has(block.id)),
    ],
    moved: true,
  };
}

/**
 * Advances fluid by one visible step while conserving quarter-block units.
 * Full cells split across all four horizontal directions at once; thinner
 * cells settle only when they are at least two quarters deeper than a neighbor.
 */
export function settleLiquidsStep(input: VoxelBlock[]) {
  const byId = new Map(input.map((block) => [block.id, block]));
  const byCell = new Map(input.map((block) => [cellKey(block), block]));
  const verticallyChanged = new Set<string>();
  let moved = false;

  const liquids = input
    .filter((block) => MATERIALS[block.material].gravityBehavior === 'fluid')
    .sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));

  for (const original of liquids) {
    const block = byId.get(original.id);
    if (!block || block.y === 0) continue;
    const below = { x: block.x, y: block.y - 1, z: block.z };
    const belowKey = cellKey(below);
    const target = byCell.get(belowKey);

    if (!target) {
      byCell.delete(cellKey(block));
      const next = { ...block, ...below, liquidLevel: getLiquidLevel(block) };
      byId.set(block.id, next);
      byCell.set(belowKey, next);
      verticallyChanged.add(block.id);
      moved = true;
      continue;
    }

    if (
      target.material !== block.material ||
      MATERIALS[target.material].gravityBehavior !== 'fluid'
    ) {
      continue;
    }

    const sourceLevel = getLiquidLevel(block);
    const targetLevel = getLiquidLevel(target);
    const transferred = Math.min(sourceLevel, MAX_LIQUID_LEVEL - targetLevel);
    if (transferred === 0) continue;

    const filledTarget = {
      ...target,
      liquidLevel: (targetLevel + transferred) as LiquidLevel,
    };
    byId.set(target.id, filledTarget);
    byCell.set(belowKey, filledTarget);
    verticallyChanged.add(target.id);

    if (transferred === sourceLevel) {
      byId.delete(block.id);
      byCell.delete(cellKey(block));
    } else {
      const remainder = {
        ...block,
        liquidLevel: (sourceLevel - transferred) as LiquidLevel,
      };
      byId.set(block.id, remainder);
      byCell.set(cellKey(block), remainder);
      verticallyChanged.add(block.id);
    }
    moved = true;
  }

  const snapshot = [...byId.values()];
  const snapshotById = new Map(snapshot.map((block) => [block.id, block]));
  const snapshotByCell = new Map(snapshot.map((block) => [cellKey(block), block]));
  const proposals: LiquidTransfer[] = [];

  for (const source of snapshot) {
    if (
      MATERIALS[source.material].gravityBehavior !== 'fluid' ||
      verticallyChanged.has(source.id)
    ) {
      continue;
    }

    const sourceLevel = getLiquidLevel(source);
    const eligible = liquidDirections(source)
      .map((offset): Cell => ({
        x: source.x + offset.x,
        y: source.y,
        z: source.z + offset.z,
      }))
      .filter((target) => {
        if (!isInWorld(target)) return false;
        const neighbor = snapshotByCell.get(cellKey(target));
        if (neighbor && neighbor.material !== source.material) return false;
        const neighborLevel = neighbor ? getLiquidLevel(neighbor) : 0;
        return sourceLevel > neighborLevel + 1;
      })
      .slice(0, sourceLevel);

    for (const target of eligible) {
      proposals.push({
        sourceId: source.id,
        target,
        targetKey: cellKey(target),
        material: source.material,
      });
    }
  }

  proposals.sort(
    (a, b) => a.targetKey.localeCompare(b.targetKey) || a.sourceId.localeCompare(b.sourceId),
  );

  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  const targetMaterials = new Map<string, BlockMaterial>();
  const targetCells = new Map<string, Cell>();
  const contributors = new Map<string, string[]>();

  for (const proposal of proposals) {
    const source = snapshotById.get(proposal.sourceId);
    if (!source) continue;
    const sent = outgoing.get(source.id) ?? 0;
    if (sent >= getLiquidLevel(source)) continue;

    const existingTarget = snapshotByCell.get(proposal.targetKey);
    const targetMaterial = existingTarget?.material ?? targetMaterials.get(proposal.targetKey);
    if (targetMaterial && targetMaterial !== proposal.material) continue;
    const targetLevel = existingTarget ? getLiquidLevel(existingTarget) : 0;
    const received = incoming.get(proposal.targetKey) ?? 0;
    if (targetLevel + received >= MAX_LIQUID_LEVEL) continue;

    outgoing.set(source.id, sent + 1);
    incoming.set(proposal.targetKey, received + 1);
    targetMaterials.set(proposal.targetKey, proposal.material);
    targetCells.set(proposal.targetKey, proposal.target);
    contributors.set(proposal.targetKey, [
      ...(contributors.get(proposal.targetKey) ?? []),
      source.id,
    ]);
  }

  const nextById = new Map<string, VoxelBlock>();
  const finalLevels = new Map<string, number>();
  for (const block of snapshot) {
    if (MATERIALS[block.material].gravityBehavior !== 'fluid') {
      nextById.set(block.id, block);
      continue;
    }
    const level = getLiquidLevel(block) - (outgoing.get(block.id) ?? 0) +
      (incoming.get(cellKey(block)) ?? 0);
    finalLevels.set(block.id, level);
    if (level > 0) {
      nextById.set(block.id, level === getLiquidLevel(block)
        ? block
        : { ...block, liquidLevel: level as LiquidLevel });
    }
  }

  const usedIds = new Set(nextById.keys());
  const inheritedIds = new Set<string>();
  const created: VoxelBlock[] = [];
  const emptyTargets = [...incoming.keys()]
    .filter((key) => !snapshotByCell.has(key))
    .sort();

  for (const key of emptyTargets) {
    const target = targetCells.get(key);
    const material = targetMaterials.get(key);
    const level = incoming.get(key) ?? 0;
    if (!target || !material || level === 0) continue;
    const sources = contributors.get(key) ?? [];
    const inheritedSource = sources.find(
      (id) => finalLevels.get(id) === 0 && !inheritedIds.has(id) && !usedIds.has(id),
    );
    const sourceId = sources[0] ?? material;
    const id = inheritedSource ?? flowBlockId(sourceId, target, usedIds);
    if (inheritedSource) inheritedIds.add(inheritedSource);
    usedIds.add(id);
    created.push({ ...target, id, material, liquidLevel: level as LiquidLevel });
  }

  if (outgoing.size > 0) moved = true;
  if (!moved) return { blocks: input, moved: false };

  const blocks = input.flatMap((block) => {
    const next = nextById.get(block.id);
    return next ? [next] : [];
  });
  blocks.push(...created);
  return { blocks, moved: true };
}

/** Settles water and lava while conserving quarter-block volume. */
export function settleLiquids(input: VoxelBlock[]) {
  let blocks = input;
  let moved = false;

  for (let step = 0; step < MAX_HEIGHT + WORLD_SIZE * 2; step += 1) {
    const result = settleLiquidsStep(blocks);
    if (!result.moved) break;
    blocks = result.blocks;
    moved = true;
  }

  return { blocks, moved };
}

/** Advances gravity and, on slower liquid ticks, one visible flow step. */
export function advanceWorldStep(input: VoxelBlock[], flowLiquids = true) {
  const structures = settleStructuresStep(input);
  const liquids = flowLiquids
    ? settleLiquidsStep(structures.blocks)
    : { blocks: structures.blocks, moved: false };
  return {
    blocks: liquids.blocks,
    moved: structures.moved || liquids.moved,
    structuresMoved: structures.moved,
    liquidsMoved: liquids.moved,
  };
}

/**
 * Settles overloaded or disconnected groups, then lets liquids seek the
 * lowest reachable cells. IDs and falling group shapes are preserved.
 */
export function settleWorld(input: VoxelBlock[]) {
  let blocks = input.map((block) => ({ ...block }));
  let moved = false;

  for (let step = 0; step < MAX_HEIGHT; step += 1) {
    const structures = settleStructures(blocks);
    const liquids = settleLiquids(structures.blocks);
    blocks = liquids.blocks;
    moved ||= structures.moved || liquids.moved;
    if (!structures.moved && !liquids.moved) break;
  }

  return { blocks, moved };
}

export function advanceFire(input: VoxelBlock[]): {
  blocks: VoxelBlock[];
  changed: boolean;
  ignited: number;
  burned: number;
} {
  const byCell = new Map(input.map((block) => [cellKey(block), block]));
  const lavaSources = input.filter((block) => block.material === 'lava');
  let ignited = 0;
  let burned = 0;
  let changed = false;

  const blocks = input.flatMap<VoxelBlock>((block) => {
    const burnDuration = MATERIALS[block.material].burnDuration;
    if (!burnDuration) return [block];

    const neighbors = NEIGHBORS.map((offset) =>
      byCell.get(
        cellKey({
          x: block.x + offset.x,
          y: block.y + offset.y,
          z: block.z + offset.z,
        }),
      ),
    ).filter((neighbor): neighbor is VoxelBlock => Boolean(neighbor));

    if (block.burning && neighbors.some((neighbor) => neighbor.material === 'water')) {
      const { burning: _burning, ...extinguished } = block;
      changed = true;
      return [extinguished];
    }

    if (block.burning) {
      changed = true;
      if (block.burning >= burnDuration) {
        burned += 1;
        if (block.material === 'grass') {
          const { burning: _burning, ...scorched } = block;
          return [{ ...scorched, material: 'soil' }];
        }
        return [];
      }
      return [{ ...block, burning: block.burning + 1 }];
    }

    const heatedByLava = lavaSources.some(
      (lava) =>
        Math.abs(lava.x - block.x) <= 2 &&
        Math.abs(lava.z - block.z) <= 2 &&
        Math.abs(lava.y - block.y) <= 1,
    );
    const catchesFire = heatedByLava || neighbors.some((neighbor) => Boolean(neighbor.burning));
    if (!catchesFire) return [block];

    changed = true;
    ignited += 1;
    return [{ ...block, burning: 1 }];
  });

  return { blocks: changed ? blocks : input, changed, ignited, burned };
}

const GENERATED_MAP_RADIUS = 16;
const FULL_MAP_MIN = -WORLD_RADIUS + 1;
const FULL_MAP_MAX = WORLD_RADIUS - 1;

export function createRandomWorld(random: () => number = Math.random): VoxelBlock[] {
  const generationId = Math.floor(random() * 0xffffff).toString(36);
  const pond = {
    x: Math.round((random() - 0.5) * 8),
    z: Math.round((random() - 0.5) * 8),
    radius: 2 + Math.floor(random() * 2),
  };
  const blocks: VoxelBlock[] = [];

  for (let x = -GENERATED_MAP_RADIUS; x <= GENERATED_MAP_RADIUS; x += 1) {
    for (let z = -GENERATED_MAP_RADIUS; z <= GENERATED_MAP_RADIUS; z += 1) {
      const distanceFromCenter = Math.hypot(x, z);
      const coastWobble = 0.88 + random() * 0.12;
      if (distanceFromCenter > GENERATED_MAP_RADIUS * coastWobble) continue;

      const terrainRoll = random();
      const materialRoll = random();
      const pondDistance = Math.hypot(x - pond.x, z - pond.z);
      const isPond = pondDistance <= pond.radius;
      let topY = distanceFromCenter < 5 ? 2 : distanceFromCenter < 10 ? 1 : 0;
      if (distanceFromCenter < 12 && terrainRoll > 0.82) topY += 1;
      if (isPond) topY = 0;

      for (let y = 0; y <= topY; y += 1) {
        const isSurface = y === topY;
        let material: BlockMaterial;
        if (!isSurface) {
          material = y === 0 && topY > 1 ? 'stone' : 'soil';
        } else if (isPond) {
          material = 'water';
        } else if (distanceFromCenter > GENERATED_MAP_RADIUS * 0.72) {
          material = 'sand';
        } else if (materialRoll < 0.12) {
          material = 'soil';
        } else if (topY >= 2 && materialRoll < 0.24) {
          material = 'stone';
        } else {
          material = 'grass';
        }

        blocks.push({
          id: `map-${generationId}-${x}-${y}-${z}`,
          x,
          y,
          z,
          material,
        });
      }
    }
  }

  return blocks;
}

export function createSeedWorld(random: () => number = Math.random): VoxelBlock[] {
  const generationId = Math.floor(random() * 0xffffff).toString(36);
  const coordinateSpan = FULL_MAP_MAX - FULL_MAP_MIN;
  const randomCoordinate = () => Math.round(FULL_MAP_MIN + random() * coordinateSpan);
  const hills = Array.from({ length: 8 }, () => ({
    x: randomCoordinate(),
    z: randomCoordinate(),
    radius: 7 + Math.floor(random() * 10),
    peakHeight: 1 + Math.floor(random() * 2),
  }));
  const lakes = Array.from({ length: 6 }, () => ({
    x: randomCoordinate(),
    z: randomCoordinate(),
    radiusX: 3 + Math.floor(random() * 6),
    radiusZ: 3 + Math.floor(random() * 6),
  }));
  const blocks: VoxelBlock[] = [];

  for (let x = FULL_MAP_MIN; x <= FULL_MAP_MAX; x += 1) {
    for (let z = FULL_MAP_MIN; z <= FULL_MAP_MAX; z += 1) {
      const lakeDistance = Math.min(...lakes.map((lake) => Math.hypot(
        (x - lake.x) / lake.radiusX,
        (z - lake.z) / lake.radiusZ,
      )));
      const isWater = lakeDistance <= 1;
      const isShore = lakeDistance <= 1.42;
      let topY = 0;

      if (!isWater) {
        for (const hill of hills) {
          const distance = Math.hypot(x - hill.x, z - hill.z);
          if (distance >= hill.radius) continue;
          topY = Math.max(
            topY,
            Math.ceil((1 - distance / hill.radius) * hill.peakHeight),
          );
        }
      }

      const materialRoll = random();
      for (let y = 0; y <= topY; y += 1) {
        const isSurface = y === topY;
        let material: BlockMaterial;
        if (!isSurface) {
          material = y === 0 && topY > 1 ? 'stone' : 'soil';
        } else if (isWater) {
          material = 'water';
        } else if (isShore) {
          material = 'sand';
        } else if (topY >= 2 && materialRoll < 0.38) {
          material = 'stone';
        } else if (materialRoll < 0.08) {
          material = 'soil';
        } else {
          material = 'grass';
        }

        blocks.push({
          id: `seed-${generationId}-${x}-${y}-${z}`,
          x,
          y,
          z,
          material,
        });
      }
    }
  }

  return blocks;
}

export function createStarterWorld(random: () => number = Math.random) {
  return createRandomWorld(random);
}

export function isValidWorld(value: unknown): value is VoxelBlock[] {
  if (!Array.isArray(value) || value.length > MAX_WORLD_BLOCKS) return false;
  const seen = new Set<string>();

  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const block = item as Partial<VoxelBlock>;
    if (
      typeof block.id !== 'string' ||
      !Number.isInteger(block.x) ||
      !Number.isInteger(block.y) ||
      !Number.isInteger(block.z) ||
      !block.material ||
      !(block.material in MATERIALS) ||
      !isInWorld(block as Cell)
    ) {
      return false;
    }
    const material = block.material as BlockMaterial;
    const isFluid = MATERIALS[material].gravityBehavior === 'fluid';
    if (
      block.burning !== undefined &&
      (!Number.isInteger(block.burning) ||
        block.burning < 1 ||
        !MATERIALS[material].burnDuration ||
        block.burning > (MATERIALS[material].burnDuration ?? 0))
    ) {
      return false;
    }
    if (
      block.liquidLevel !== undefined &&
      (!isFluid ||
        !Number.isInteger(block.liquidLevel) ||
        block.liquidLevel < 1 ||
        block.liquidLevel > MAX_LIQUID_LEVEL)
    ) {
      return false;
    }
    if (
      block.leafDecay !== undefined &&
      (material !== 'leaves' ||
        !Number.isInteger(block.leafDecay) ||
        block.leafDecay < 1 ||
        block.leafDecay >= LEAF_DECAY_TICKS)
    ) {
      return false;
    }
    const key = cellKey(block as Cell);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
