export type BlockMaterial = 'grass' | 'soil' | 'stone' | 'sand';

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

export const MATERIALS: Record<
  BlockMaterial,
  { label: string; color: string; edge: string }
> = {
  grass: { label: 'Grass', color: '#72a55a', edge: '#496f43' },
  soil: { label: 'Soil', color: '#9a6845', edge: '#70482f' },
  stone: { label: 'Stone', color: '#7d898e', edge: '#586468' },
  sand: { label: 'Sand', color: '#d7bd76', edge: '#a88d4d' },
};

const NEIGHBORS: Cell[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
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
