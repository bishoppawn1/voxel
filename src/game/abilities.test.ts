import { describe, expect, it } from 'vitest';
import {
  ABILITY_KEYS,
  VERDANT_TOUCH_RADIUS,
  applyAbility,
  countEligibleBlocks,
} from './abilities';
import { isValidWorld, type BlockMaterial, type VoxelBlock } from './world';

const block = (
  id: string,
  x: number,
  y: number,
  z: number,
  material: BlockMaterial,
  burning?: number,
): VoxelBlock => ({ id, x, y, z, material, ...(burning ? { burning } : {}) });

describe('god powers', () => {
  it('offers exactly five abilities', () => {
    expect(ABILITY_KEYS).toEqual([
      'verdant-touch',
      'wildfire',
      'rain',
      'deep-freeze',
      'thaw',
    ]);
  });

  it('brushes only nearby exposed dirt and preserves stable IDs', () => {
    const world = [
      block('exposed', 0, 0, 0, 'soil'),
      block('covered', 1, 0, 0, 'soil'),
      block('cover', 1, 2, 0, 'stone'),
      block('far-away', VERDANT_TOUCH_RADIUS + 1, 0, 0, 'soil'),
    ];
    const result = applyAbility(world, 'verdant-touch', { x: 0, z: 0 });

    expect(result.affected).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'exposed')).toMatchObject({
      id: 'exposed',
      material: 'grass',
    });
    expect(result.blocks.find(({ id }) => id === 'covered')?.material).toBe('soil');
    expect(result.blocks.find(({ id }) => id === 'far-away')?.material).toBe('soil');
    expect(countEligibleBlocks(world, 'verdant-touch')).toBe(2);
  });

  it('does not apply Verdant Touch without a brush target', () => {
    const world = [block('soil', 0, 0, 0, 'soil')];
    const result = applyAbility(world, 'verdant-touch');

    expect(result).toEqual({ blocks: world, changed: false, affected: 0 });
    expect(result.blocks).toBe(world);
  });

  it('ignites every unlit flammable block without touching stone', () => {
    const world = [
      block('grass', 0, 0, 0, 'grass'),
      block('planks', 1, 0, 0, 'planks'),
      block('already-burning', 2, 0, 0, 'wood', 3),
      block('stone', 3, 0, 0, 'stone'),
    ];
    const result = applyAbility(world, 'wildfire');

    expect(result.affected).toBe(2);
    expect(result.blocks.find(({ id }) => id === 'grass')?.burning).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'planks')?.burning).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'already-burning')?.burning).toBe(3);
    expect(result.blocks.find(({ id }) => id === 'stone')?.burning).toBeUndefined();
  });

  it('extinguishes every fire without changing block material or position', () => {
    const burningWood = block('wood', 4, 2, -3, 'wood', 2);
    const result = applyAbility([burningWood], 'rain');

    expect(result).toEqual({
      blocks: [block('wood', 4, 2, -3, 'wood')],
      changed: true,
      affected: 1,
    });
  });

  it('freezes water into ice and lava into obsidian', () => {
    const result = applyAbility([
      { ...block('water', 0, 0, 0, 'water'), liquidLevel: 2 },
      { ...block('lava', 1, 0, 0, 'lava'), liquidLevel: 1 },
      block('snow', 2, 0, 0, 'snow'),
    ], 'deep-freeze');

    expect(result.affected).toBe(2);
    expect(result.blocks.map(({ id, material }) => [id, material])).toEqual([
      ['water', 'ice'],
      ['lava', 'obsidian'],
      ['snow', 'snow'],
    ]);
    expect(result.blocks.every(({ liquidLevel }) => liquidLevel === undefined)).toBe(true);
  });

  it('thaws ice and snow into flowing water', () => {
    const result = applyAbility([
      block('ice', 0, 1, 0, 'ice'),
      block('snow', 1, 1, 0, 'snow'),
      block('obsidian', 2, 1, 0, 'obsidian'),
    ], 'thaw');

    expect(result.affected).toBe(2);
    expect(result.blocks.map(({ material }) => material)).toEqual([
      'water',
      'water',
      'obsidian',
    ]);
    expect(isValidWorld(result.blocks)).toBe(true);
  });

  it('returns the original world when a power has no eligible target', () => {
    const world = [block('stone', 0, 0, 0, 'stone')];
    const result = applyAbility(world, 'rain');

    expect(result).toEqual({ blocks: world, changed: false, affected: 0 });
    expect(result.blocks).toBe(world);
  });
});
