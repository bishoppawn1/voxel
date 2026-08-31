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
};

export type Cell = Pick<VoxelBlock, 'x' | 'y' | 'z'>;

export const WORLD_SIZE = 24;
export const WORLD_RADIUS = WORLD_SIZE / 2;
export const MAX_HEIGHT = 12;
export const BLOCK_RENDER_SIZE = 0.58;

export const MATERIALS: Record<
  BlockMaterial,
  MaterialDefinition
> = {
  grass: { label: 'Grass', color: '#72a55a', edge: '#496f43' },
  soil: { label: 'Dirt', color: '#9a6845', edge: '#70482f' },
  stone: { label: 'Stone', color: '#7d898e', edge: '#586468' },
  sand: { label: 'Sand', color: '#d7bd76', edge: '#a88d4d' },
  wood: { label: 'Wood', color: '#a8733f', edge: '#6f4626', roughness: 0.95 },
  leaves: { label: 'Leaves', color: '#477d46', edge: '#285532', roughness: 0.9 },
  brick: { label: 'Brick', color: '#a74f3f', edge: '#743327', roughness: 0.92 },
  clay: { label: 'Clay', color: '#bf765d', edge: '#894f40', roughness: 0.9 },
  snow: { label: 'Snow', color: '#f2f5ee', edge: '#b8c7c1', roughness: 0.72 },
  ice: { label: 'Ice', color: '#a9dce5', edge: '#5f9eb2', roughness: 0.25, opacity: 0.78 },
  water: { label: 'Water', color: '#4b9dc4', edge: '#267294', roughness: 0.18, opacity: 0.68 },
  lava: { label: 'Lava', color: '#f0682c', edge: '#a73520', roughness: 0.65, emissive: '#d33e14', emissiveIntensity: 0.48 },
  obsidian: { label: 'Obsidian', color: '#312b40', edge: '#17141f', roughness: 0.35, metalness: 0.22 },
  coal: { label: 'Coal', color: '#3e4341', edge: '#1d211f', roughness: 0.96 },
  iron: { label: 'Iron', color: '#a8ada8', edge: '#666e6c', roughness: 0.5, metalness: 0.55 },
  gold: { label: 'Gold', color: '#d9ad36', edge: '#8f6a17', roughness: 0.34, metalness: 0.72 },
  copper: { label: 'Copper', color: '#bc6f46', edge: '#78442e', roughness: 0.5, metalness: 0.5 },
  glass: { label: 'Glass', color: '#d8f0e9', edge: '#78a9a1', roughness: 0.08, opacity: 0.42 },
  moss: { label: 'Moss', color: '#71883f', edge: '#485929', roughness: 1 },
  mud: { label: 'Mud', color: '#6f503b', edge: '#453125', roughness: 1 },
  gravel: { label: 'Gravel', color: '#8d8880', edge: '#5d5954', roughness: 1 },
  marble: { label: 'Marble', color: '#ddd9cf', edge: '#989990', roughness: 0.38 },
  basalt: { label: 'Basalt', color: '#555a60', edge: '#2f3337', roughness: 0.93 },
  crystal: { label: 'Crystal', color: '#9d75d5', edge: '#5e388f', roughness: 0.18, opacity: 0.82, emissive: '#654098', emissiveIntensity: 0.22 },
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

export const cellKey = ({ x, y, z }: Cell) => `${x},${y},${z}`;

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
 * cells and rolls diagonally off occupied cells, producing a low pile when a
 * player repeatedly pours blocks into the same area. Established structures
 * are not reshaped; their group gravity is handled by settleWorld below.
 */
export function settlePlacedBlock(input: VoxelBlock[], blockId: string) {
  const original = input.find((block) => block.id === blockId);
  if (!original) return { blocks: input, moved: false };

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

  queue.forEach((block) => anchored.add(block.id));

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
      if (neighbor && !anchored.has(neighbor.id)) {
        anchored.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return anchored;
}

/**
 * Drops every disconnected group until it reaches the plane or reconnects to
 * a grounded group. IDs are preserved so the renderer can animate the fall.
 */
export function settleWorld(input: VoxelBlock[]) {
  let blocks = input.map((block) => ({ ...block }));
  let moved = false;

  for (let step = 0; step < MAX_HEIGHT * 2; step += 1) {
    const anchored = anchoredBlockIds(blocks);
    const floating = blocks.filter((block) => !anchored.has(block.id));
    if (floating.length === 0) break;

    const floatingIds = new Set(floating.map((block) => block.id));
    blocks = blocks.map((block) =>
      floatingIds.has(block.id) ? { ...block, y: block.y - 1 } : block,
    );
    moved = true;
  }

  return { blocks, moved };
}

export function createStarterWorld(): VoxelBlock[] {
  const cells: Array<[number, number, number, BlockMaterial]> = [
    [-3, 0, 0, 'grass'],
    [-2, 0, 0, 'grass'],
    [-1, 0, 0, 'grass'],
    [-3, 0, 1, 'grass'],
    [-2, 0, 1, 'grass'],
    [-1, 0, 1, 'grass'],
    [-2, 1, 0, 'soil'],
    [-2, 1, 1, 'grass'],
    [-2, 2, 0, 'stone'],
    [1, 0, -2, 'stone'],
    [2, 0, -2, 'stone'],
    [2, 0, -1, 'stone'],
    [2, 1, -2, 'stone'],
    [4, 0, 2, 'sand'],
    [4, 0, 3, 'sand'],
    [5, 0, 2, 'sand'],
    [5, 0, 3, 'sand'],
    [4, 1, 2, 'sand'],
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
    const key = cellKey(block as Cell);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
