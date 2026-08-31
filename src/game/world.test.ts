import { describe, expect, it } from 'vitest';
import { createStarterWorld, isValidWorld, settleWorld, type VoxelBlock } from './world';

const block = (id: string, x: number, y: number, z: number): VoxelBlock => ({
  id,
  x,
  y,
  z,
  material: 'stone',
});

describe('voxel gravity', () => {
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
});

describe('world persistence validation', () => {
  it('accepts the starter world', () => {
    expect(isValidWorld(createStarterWorld())).toBe(true);
  });

  it('rejects duplicate and out-of-bounds cells', () => {
    expect(isValidWorld([block('a', 0, 0, 0), block('b', 0, 0, 0)])).toBe(false);
    expect(isValidWorld([block('a', 99, 0, 0)])).toBe(false);
  });
});
