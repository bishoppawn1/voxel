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
};

export type Cell = Pick<VoxelBlock, 'x' | 'y' | 'z'>;

export const BLOCK_SIZE = 0.25;
export const WORLD_RENDER_SIZE = 24;
export const WORLD_SIZE = WORLD_RENDER_SIZE / BLOCK_SIZE;
export const WORLD_RADIUS = WORLD_SIZE / 2;
export const MAX_HEIGHT = 12 / BLOCK_SIZE;

export const MATERIALS: Record<
  BlockMaterial,
  MaterialDefinition
> = {
  grass: { label: 'Grass', color: '#72a55a', edge: '#496f43', supportTolerance: 3, gravityBehavior: 'cohesive', burnDuration: 3 },
  soil: { label: 'Dirt', color: '#9a6845', edge: '#70482f', supportTolerance: 2, gravityBehavior: 'cohesive' },
  stone: { label: 'Stone', color: '#7d898e', edge: '#586468', supportTolerance: 7, gravityBehavior: 'structural' },
  sand: { label: 'Sand', color: '#d7bd76', edge: '#a88d4d', supportTolerance: 0, gravityBehavior: 'loose' },
  wood: { label: 'Wood', color: '#a8733f', edge: '#6f4626', supportTolerance: 10, gravityBehavior: 'structural', burnDuration: 6, roughness: 0.95 },
  leaves: { label: 'Leaves', color: '#477d46', edge: '#285532', supportTolerance: 5, gravityBehavior: 'cohesive', burnDuration: 3, roughness: 0.9 },
  brick: { label: 'Brick', color: '#a74f3f', edge: '#743327', supportTolerance: 8, gravityBehavior: 'structural', roughness: 0.92 },
  clay: { label: 'Clay', color: '#bf765d', edge: '#894f40', supportTolerance: 4, gravityBehavior: 'cohesive', roughness: 0.9 },
  snow: { label: 'Snow', color: '#f2f5ee', edge: '#b8c7c1', supportTolerance: 0, gravityBehavior: 'loose', roughness: 0.72 },
  ice: { label: 'Ice', color: '#a9dce5', edge: '#5f9eb2', supportTolerance: 5, gravityBehavior: 'structural', roughness: 0.25, opacity: 0.78 },
  water: { label: 'Water', color: '#4b9dc4', edge: '#267294', supportTolerance: 0, gravityBehavior: 'fluid', roughness: 0.18, opacity: 0.68 },
  lava: { label: 'Lava', color: '#f0682c', edge: '#a73520', supportTolerance: 0, gravityBehavior: 'fluid', roughness: 0.65, emissive: '#d33e14', emissiveIntensity: 0.48 },
  obsidian: { label: 'Obsidian', color: '#312b40', edge: '#17141f', supportTolerance: 12, gravityBehavior: 'structural', roughness: 0.35, metalness: 0.22 },
  coal: { label: 'Coal', color: '#3e4341', edge: '#1d211f', supportTolerance: 6, gravityBehavior: 'structural', burnDuration: 8, roughness: 0.96 },
  iron: { label: 'Iron', color: '#a8ada8', edge: '#666e6c', supportTolerance: 9, gravityBehavior: 'structural', roughness: 0.5, metalness: 0.55 },
  gold: { label: 'Gold', color: '#d9ad36', edge: '#8f6a17', supportTolerance: 7, gravityBehavior: 'structural', roughness: 0.34, metalness: 0.72 },
  copper: { label: 'Copper', color: '#bc6f46', edge: '#78442e', supportTolerance: 7, gravityBehavior: 'structural', roughness: 0.5, metalness: 0.5 },
  glass: { label: 'Glass', color: '#d8f0e9', edge: '#78a9a1', supportTolerance: 4, gravityBehavior: 'structural', roughness: 0.08, opacity: 0.42 },
  moss: { label: 'Moss', color: '#71883f', edge: '#485929', supportTolerance: 3, gravityBehavior: 'cohesive', burnDuration: 3, roughness: 1 },
  mud: { label: 'Mud', color: '#6f503b', edge: '#453125', supportTolerance: 0, gravityBehavior: 'loose', roughness: 1 },
  gravel: { label: 'Gravel', color: '#8d8880', edge: '#5d5954', supportTolerance: 0, gravityBehavior: 'loose', roughness: 1 },
  marble: { label: 'Marble', color: '#ddd9cf', edge: '#989990', supportTolerance: 12, gravityBehavior: 'structural', roughness: 0.38 },
  basalt: { label: 'Basalt', color: '#555a60', edge: '#2f3337', supportTolerance: 10, gravityBehavior: 'structural', roughness: 0.93 },
  crystal: { label: 'Crystal', color: '#9d75d5', edge: '#5e388f', supportTolerance: 6, gravityBehavior: 'structural', roughness: 0.18, opacity: 0.82, emissive: '#654098', emissiveIntensity: 0.22 },
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

export const cellToWorld = (coordinate: number) => coordinate * BLOCK_SIZE;

export const worldToCell = (coordinate: number) => Math.round(coordinate / BLOCK_SIZE);

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
      const nextTolerance = Math.min(sourceTolerance, neighborTolerance) - 1;

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

function verticalLanding(cell: Cell, occupied: Set<string>) {
  let y = cell.y;
  while (y > 0 && !occupied.has(cellKey({ x: cell.x, y: y - 1, z: cell.z }))) {
    y -= 1;
  }
  return y;
}

function nextLiquidCell(block: VoxelBlock, occupied: Set<string>): Cell | null {
  const directY = verticalLanding(block, occupied);
  if (directY < block.y) return { x: block.x, y: block.y - 1, z: block.z };

  const start = { x: block.x, y: block.y, z: block.z };
  const queue: Array<Cell & { distance: number; firstStep?: Cell }> = [
    { ...start, distance: 0 },
  ];
  const visited = new Set([cellKey(start)]);
  let best: { landing: Cell; distance: number; next: Cell } | null = null;

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const offset of HORIZONTAL_DIRECTIONS) {
      const candidate = {
        x: current.x + offset.x,
        y: block.y,
        z: current.z + offset.z,
      };
      const key = cellKey(candidate);
      if (!isInWorld(candidate) || occupied.has(key) || visited.has(key)) continue;
      visited.add(key);

      const distance = current.distance + 1;
      const landingY = verticalLanding(candidate, occupied);
      if (landingY < block.y) {
        const landing = { ...candidate, y: landingY };
        const next = current.firstStep ?? {
          x: candidate.x,
          y: block.y - 1,
          z: candidate.z,
        };
        if (
          !best ||
          landing.y < best.landing.y ||
          (landing.y === best.landing.y && distance < best.distance) ||
          (landing.y === best.landing.y &&
            distance === best.distance &&
            cellKey(landing) < cellKey(best.landing))
        ) {
          best = { landing, distance, next };
        }
        continue;
      }

      queue.push({
        ...candidate,
        distance,
        firstStep: current.firstStep ?? candidate,
      });
    }
  }

  return best?.next ?? null;
}

/** Advances every water and lava block at most one visible cell. */
export function settleLiquidsStep(input: VoxelBlock[]) {
  const occupied = new Set(input.map((block) => cellKey(block)));
  const byId = new Map(input.map((block) => [block.id, block]));
  let moved = false;

  for (const original of input) {
    const block = byId.get(original.id) ?? original;
    if (MATERIALS[block.material].gravityBehavior !== 'fluid') continue;

    occupied.delete(cellKey(block));
    const destination = nextLiquidCell(block, occupied);
    if (destination) {
      const next = { ...block, ...destination };
      byId.set(block.id, next);
      occupied.add(cellKey(next));
      moved = true;
    } else {
      occupied.add(cellKey(block));
    }
  }

  return {
    blocks: moved ? input.map((block) => byId.get(block.id) ?? block) : input,
    moved,
  };
}

/** Moves water and lava to the lowest reachable drop without changing IDs. */
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

/** Advances gravity and liquid flow by one cell for visible simulation. */
export function advanceWorldStep(input: VoxelBlock[]) {
  const structures = settleStructuresStep(input);
  const liquids = settleLiquidsStep(structures.blocks);
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

    const catchesFire = neighbors.some(
      (neighbor) => neighbor.material === 'lava' || Boolean(neighbor.burning),
    );
    if (!catchesFire) return [block];

    changed = true;
    ignited += 1;
    return [{ ...block, burning: 1 }];
  });

  return { blocks: changed ? blocks : input, changed, ignited, burned };
}

export function createStarterWorld(): VoxelBlock[] {
  const cells: Array<[number, number, number, BlockMaterial]> = [
    [-12, 0, 0, 'grass'],
    [-11, 0, 0, 'grass'],
    [-10, 0, 0, 'grass'],
    [-12, 0, 1, 'grass'],
    [-11, 0, 1, 'grass'],
    [-10, 0, 1, 'grass'],
    [-11, 1, 0, 'soil'],
    [-11, 1, 1, 'grass'],
    [-11, 2, 0, 'stone'],
    [4, 0, -8, 'stone'],
    [5, 0, -8, 'stone'],
    [5, 0, -7, 'stone'],
    [5, 1, -8, 'stone'],
    [16, 0, 8, 'sand'],
    [16, 0, 9, 'sand'],
    [17, 0, 8, 'sand'],
    [17, 0, 9, 'sand'],
    [16, 1, 8, 'sand'],
  ];

  return cells.map(([x, y, z, material], index) => ({
    id: `starter-${index}`,
    x,
    y,
    z,
    material,
  }));
}

export function isValidWorld(value: unknown): value is VoxelBlock[] {
  if (!Array.isArray(value) || value.length > 2000) return false;
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
    if (
      block.burning !== undefined &&
      (!Number.isInteger(block.burning) ||
        block.burning < 1 ||
        !MATERIALS[material].burnDuration ||
        block.burning > (MATERIALS[material].burnDuration ?? 0))
    ) {
      return false;
    }
    const key = cellKey(block as Cell);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
