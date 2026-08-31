import { describe, expect, it } from 'vitest';
import {
  BLOCK_SIZE,
  MATERIALS,
  MATERIAL_KEYS,
  MAX_HEIGHT,
  WORLD_SIZE,
  advanceFire,
  advanceWorldStep,
  cellToWorld,
  createStarterWorld,
  isValidWorld,
  settleLiquids,
  settlePlacedBlock,
  settleWorld,
  worldToCell,
  type VoxelBlock,
} from './world';

const block = (
  id: string,
  x: number,
  y: number,
  z: number,
  material: VoxelBlock['material'] = 'stone',
): VoxelBlock => ({
  id,
  x,
  y,
  z,
  material,
});

describe('voxel gravity', () => {
  it('advances a falling block only one level per visible simulation step', () => {
    const first = advanceWorldStep([block('a', 0, 4, 0)]);
    const second = advanceWorldStep(first.blocks);

    expect(first.blocks[0].y).toBe(3);
    expect(second.blocks[0].y).toBe(2);
    expect(first.structuresMoved).toBe(true);
  });

  it('drops a lone floating block to the plane', () => {
    const result = settleWorld([block('a', 0, 4, 0)]);
    expect(result.moved).toBe(true);
    expect(result.blocks[0].y).toBe(0);
  });

  it('keeps a side-connected structure suspended from a grounded block', () => {
    const world = [block('root', 0, 0, 0), block('side', 1, 0, 0), block('top', 1, 1, 0)];
    expect(settleWorld(world)).toEqual({ blocks: world, moved: false });
  });

  it('drops a disconnected group together and preserves its shape', () => {
    const world = [block('a', 0, 3, 0), block('b', 1, 3, 0), block('c', 1, 4, 0)];
    const result = settleWorld(world);
    expect(result.blocks.map(({ x, y, z }) => [x, y, z])).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
    ]);
  });

  it('settles a structure after its only bridge to the plane is removed', () => {
    const remaining = [block('arm', 1, 2, 0), block('tip', 2, 2, 0)];
    const result = settleWorld(remaining);
    expect(result.blocks.map(({ x, y }) => [x, y])).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });

  it('lets marble carry a long cantilever without collapsing', () => {
    const world = [
      block('root', 0, 0, 0, 'marble'),
      block('column', 0, 1, 0, 'marble'),
      ...Array.from({ length: 10 }, (_, index) =>
        block(`span-${index}`, index + 1, 1, 0, 'marble'),
      ),
    ];

    expect(settleWorld(world)).toEqual({ blocks: world, moved: false });
  });

  it('lets wood support a connected leaf canopy', () => {
    const world = [
      block('trunk-0', 0, 0, 0, 'wood'),
      block('trunk-1', 0, 1, 0, 'wood'),
      block('trunk-2', 0, 2, 0, 'wood'),
      ...Array.from({ length: 5 }, (_, index) =>
        block(`leaf-${index}`, index + 1, 2, 0, 'leaves'),
      ),
    ];

    expect(settleWorld(world)).toEqual({ blocks: world, moved: false });
  });

  it.each(['sand', 'lava'] as const)(
    'does not let %s hang from the side of a wall',
    (material) => {
      const world = [
        block('root', 0, 0, 0),
        block('wall', 0, 1, 0),
        block('falling', 1, 1, 0, material),
      ];
      const result = settleWorld(world);

      expect(result.moved).toBe(true);
      expect(result.blocks.find(({ id }) => id === 'falling')?.y).toBe(0);
    },
  );

  it('spends dirt tolerance across vertical and horizontal connections', () => {
    const world = [
      block('root', 0, 0, 0, 'soil'),
      block('column', 0, 1, 0, 'soil'),
      block('near-1', 1, 1, 0, 'soil'),
      block('near-2', 2, 1, 0, 'soil'),
      block('far', 3, 1, 0, 'soil'),
    ];
    const result = settleWorld(world);

    expect(result.blocks.find(({ id }) => id === 'near-1')?.y).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'near-2')?.y).toBe(0);
    expect(result.blocks.find(({ id }) => id === 'far')?.y).toBe(0);
  });

  it('topples the overloaded top of a tall grass column without overlaps', () => {
    const world = Array.from({ length: 7 }, (_, y) =>
      block(`grass-${y}`, 0, y, 0, 'grass'),
    );
    const result = settleWorld(world);
    const occupied = new Set(result.blocks.map(({ x, y, z }) => `${x},${y},${z}`));

    expect(result.moved).toBe(true);
    expect(occupied.size).toBe(world.length);
    expect(Math.max(...result.blocks.filter(({ x, z }) => x === 0 && z === 0).map(({ y }) => y)))
      .toBeLessThan(6);
  });
});

describe('quarter-scale world grid', () => {
  it('uses actual quarter-unit cells for geometry, spacing, and placement', () => {
    expect(BLOCK_SIZE).toBe(0.25);
    expect(cellToWorld(1) - cellToWorld(0)).toBe(0.25);
    expect(worldToCell(1)).toBe(4);
    expect(worldToCell(0.87)).toBe(3);
  });

  it('provides four times the cells across the same physical world dimensions', () => {
    expect(WORLD_SIZE).toBe(96);
    expect(MAX_HEIGHT).toBe(48);
    expect(isValidWorld([block('edge', 47, 47, -47)])).toBe(true);
    expect(isValidWorld([block('outside', 48, 0, 0)])).toBe(false);
  });
});

describe('fresh block pouring', () => {
  it('drops a newly placed block while preserving its stable ID', () => {
    const result = settlePlacedBlock([block('seed', 2, 5, -1, 'sand')], 'seed');
    expect(result).toEqual({
      blocks: [block('seed', 2, 0, -1, 'sand')],
      moved: true,
    });
  });

  it('rolls loose sand off a narrow tower instead of stacking it', () => {
    const world = [block('base', 0, 0, 0), block('seed', 0, 1, 0, 'sand')];
    const result = settlePlacedBlock(world, 'seed');
    const seed = result.blocks.find(({ id }) => id === 'seed');

    expect(result.moved).toBe(true);
    expect(seed?.y).toBe(0);
    expect(Math.abs(seed?.x ?? 0) + Math.abs(seed?.z ?? 0)).toBe(1);
    expect(new Set(result.blocks.map(({ x, y, z }) => `${x},${y},${z}`)).size).toBe(2);
  });

  it('keeps rigid marble on a narrow support', () => {
    const world = [
      block('base', 0, 0, 0, 'marble'),
      block('seed', 0, 1, 0, 'marble'),
    ];

    expect(settlePlacedBlock(world, 'seed')).toEqual({ blocks: world, moved: false });
  });

  it('rolls grass away when a weak column has exhausted its tolerance', () => {
    const world = [
      ...Array.from({ length: 4 }, (_, y) => block(`grass-${y}`, 0, y, 0, 'grass')),
      block('seed', 0, 4, 0, 'grass'),
    ];
    const result = settlePlacedBlock(world, 'seed');
    const seed = result.blocks.find(({ id }) => id === 'seed');

    expect(result.moved).toBe(true);
    expect(seed?.y).toBe(0);
    expect(Math.abs(seed?.x ?? 0) + Math.abs(seed?.z ?? 0)).toBe(1);
  });

  it('leaves a fresh block in place when a pile contains every downhill cell', () => {
    const world = [
      block('support', 0, 0, 0),
      block('east', 1, 0, 0),
      block('west', -1, 0, 0),
      block('south', 0, 0, 1),
      block('north', 0, 0, -1),
      block('seed', 0, 1, 0),
    ];

    expect(settlePlacedBlock(world, 'seed')).toEqual({ blocks: world, moved: false });
  });

  it('spreads repeated pours into a mound instead of a thin tower', () => {
    let world = [block('base', 0, 0, 0)];

    for (let index = 0; index < 12; index += 1) {
      const centerTop = Math.max(
        ...world.filter(({ x, z }) => x === 0 && z === 0).map(({ y }) => y),
      );
      const poured = block(`seed-${index}`, 0, centerTop + 1, 0, 'sand');
      world = settlePlacedBlock([...world, poured], poured.id).blocks;
    }

    const occupiedColumns = new Set(world.map(({ x, z }) => `${x},${z}`));
    expect(occupiedColumns.size).toBeGreaterThan(5);
    expect(Math.max(...world.map(({ y }) => y))).toBeLessThanOrEqual(1);
  });
});

describe('liquid flow', () => {
  it('advances falling liquid one visible cell per simulation step', () => {
    const world = [block('water', 0, 5, 0, 'water')];
    const first = advanceWorldStep(world);
    const second = advanceWorldStep(first.blocks);

    expect(first.blocks[0]).toMatchObject({ id: 'water', y: 4 });
    expect(second.blocks[0]).toMatchObject({ id: 'water', y: 3 });
    expect(first.liquidsMoved).toBe(true);
  });

  it('shows liquid flowing over a ledge before it reaches the ground', () => {
    const world = [
      block('base', 0, 0, 0),
      block('ledge', 0, 1, 0),
      block('water', 0, 2, 0, 'water'),
    ];
    const first = advanceWorldStep(world);
    const water = first.blocks.find(({ id }) => id === 'water');

    expect(water?.y).toBe(1);
    expect(Math.abs(water?.x ?? 0) + Math.abs(water?.z ?? 0)).toBe(1);
  });

  it.each(['water', 'lava'] as const)(
    'moves %s over a ledge to the lowest reachable level',
    (material) => {
      const world = [
        block('base', 0, 0, 0),
        block('ledge', 0, 1, 0),
        block('liquid', 0, 2, 0, material),
      ];
      const result = settleLiquids(world);
      const liquid = result.blocks.find(({ id }) => id === 'liquid');

      expect(result.moved).toBe(true);
      expect(liquid?.y).toBe(0);
      expect(liquid?.x === 0 && liquid?.z === 0).toBe(false);
      expect(new Set(result.blocks.map(({ x, y, z }) => `${x},${y},${z}`)).size).toBe(3);
    },
  );

  it('keeps contained water in place when no lower cell is reachable', () => {
    const world = [
      block('floor', 0, 0, 0),
      block('east', 1, 1, 0),
      block('west', -1, 1, 0),
      block('south', 0, 1, 1),
      block('north', 0, 1, -1),
      block('water', 0, 1, 0, 'water'),
    ];

    expect(settleLiquids(world)).toEqual({ blocks: world, moved: false });
  });
});

describe('fire', () => {
  it('burns the grass layer into dirt without deleting the block', () => {
    let world = [
      block('lava', 0, 0, 0, 'lava'),
      block('grassy-dirt', 1, 0, 0, 'grass'),
    ];

    for (let tick = 0; tick <= (MATERIALS.grass.burnDuration ?? 0); tick += 1) {
      world = advanceFire(world).blocks;
    }

    expect(world.find(({ id }) => id === 'grassy-dirt')).toEqual(
      block('grassy-dirt', 1, 0, 0, 'soil'),
    );
  });

  it('ignites wood beside lava and consumes it after its burn duration', () => {
    let world = [block('lava', 0, 0, 0, 'lava'), block('wood', 1, 0, 0, 'wood')];

    world = advanceFire(world).blocks;
    expect(world.find(({ id }) => id === 'wood')?.burning).toBe(1);

    for (let tick = 0; tick < (MATERIALS.wood.burnDuration ?? 0); tick += 1) {
      world = advanceFire(world).blocks;
    }
    expect(world.some(({ id }) => id === 'wood')).toBe(false);
  });

  it('spreads fire through flammable neighbors but not stone', () => {
    const world = [
      { ...block('wood', 0, 0, 0, 'wood'), burning: 1 },
      block('leaves', 1, 0, 0, 'leaves'),
      block('stone', -1, 0, 0, 'stone'),
    ];
    const result = advanceFire(world);

    expect(result.blocks.find(({ id }) => id === 'leaves')?.burning).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'stone')?.burning).toBeUndefined();
  });

  it('lets adjacent water extinguish a burning block', () => {
    const world = [
      { ...block('wood', 0, 0, 0, 'wood'), burning: 2 },
      block('water', 1, 0, 0, 'water'),
    ];

    expect(advanceFire(world).blocks.find(({ id }) => id === 'wood')?.burning)
      .toBeUndefined();
  });
});

describe('world persistence validation', () => {
  it('accepts the starter world', () => {
    expect(isValidWorld(createStarterWorld())).toBe(true);
  });

  it('rejects duplicate and out-of-bounds cells', () => {
    expect(isValidWorld([block('a', 0, 0, 0), block('b', 0, 0, 0)])).toBe(false);
    expect(isValidWorld([block('a', 99, 0, 0)])).toBe(false);
  });

  it('supports 24 selectable materials, including dirt and wood', () => {
    expect(MATERIAL_KEYS).toHaveLength(24);
    expect(MATERIALS.soil.label).toBe('Dirt');
    expect(MATERIALS.wood.label).toBe('Wood');
    expect(
      isValidWorld([{ ...block('wood', 0, 0, 0), material: 'wood' }]),
    ).toBe(true);
  });

  it('validates persisted fire state only on flammable materials', () => {
    expect(isValidWorld([{ ...block('wood', 0, 0, 0, 'wood'), burning: 2 }])).toBe(true);
    expect(isValidWorld([{ ...block('stone', 0, 0, 0), burning: 1 }])).toBe(false);
  });
});
