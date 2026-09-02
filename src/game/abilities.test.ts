import { describe, expect, it } from 'vitest';
import {
  ABILITY_KEYS,
  DEFAULT_ABILITY_BRUSH_SIZE,
  applyAbility,
  applyAbilityToAnimals,
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
  const defaultRadius = Math.floor(DEFAULT_ABILITY_BRUSH_SIZE / 2);

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
      block('far-away', defaultRadius + 1, 0, 0, 'soil'),
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

  it('does not apply any ability without an area target', () => {
    const worlds = {
      'verdant-touch': [block('soil', 0, 0, 0, 'soil')],
      wildfire: [block('wood', 0, 0, 0, 'wood')],
      rain: [block('burning', 0, 0, 0, 'wood', 2)],
      'deep-freeze': [block('water', 0, 0, 0, 'water')],
      thaw: [block('ice', 0, 0, 0, 'ice')],
    } satisfies Record<(typeof ABILITY_KEYS)[number], VoxelBlock[]>;

    for (const ability of ABILITY_KEYS) {
      const world = worlds[ability];
      const result = applyAbility(world, ability);
      expect(result).toEqual({ blocks: world, changed: false, affected: 0 });
      expect(result.blocks).toBe(world);
    }
  });

  it('ignites only unlit flammable blocks in the targeted area', () => {
    const world = [
      block('grass', 0, 0, 0, 'grass'),
      block('planks', 1, 0, 0, 'planks'),
      block('already-burning', 2, 0, 0, 'wood', 3),
      block('stone', 3, 0, 0, 'stone'),
      block('far-wood', defaultRadius + 1, 0, 0, 'wood'),
    ];
    const result = applyAbility(world, 'wildfire', { x: 0, z: 0 });

    expect(result.affected).toBe(2);
    expect(result.blocks.find(({ id }) => id === 'grass')?.burning).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'planks')?.burning).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'already-burning')?.burning).toBe(3);
    expect(result.blocks.find(({ id }) => id === 'stone')?.burning).toBeUndefined();
    expect(result.blocks.find(({ id }) => id === 'far-wood')?.burning).toBeUndefined();
  });

  it('extinguishes fire in the targeted area without changing block material or position', () => {
    const burningWood = block('wood', 4, 2, -3, 'wood', 2);
    const farFire = block('far-fire', 4 + defaultRadius + 1, 2, -3, 'wood', 2);
    const result = applyAbility([burningWood, farFire], 'rain', { x: 4, z: -3 });

    expect(result).toEqual({
      blocks: [block('wood', 4, 2, -3, 'wood'), farFire],
      changed: true,
      affected: 1,
    });
  });

  it('freezes water and lava only in the targeted area', () => {
    const result = applyAbility([
      { ...block('water', 0, 0, 0, 'water'), liquidLevel: 2 },
      { ...block('lava', 1, 0, 0, 'lava'), liquidLevel: 1 },
      block('snow', 2, 0, 0, 'snow'),
      { ...block('far-water', defaultRadius + 1, 0, 0, 'water'), liquidLevel: 1 },
    ], 'deep-freeze', { x: 0, z: 0 });

    expect(result.affected).toBe(2);
    expect(result.blocks.map(({ id, material }) => [id, material])).toEqual([
      ['water', 'ice'],
      ['lava', 'obsidian'],
      ['snow', 'snow'],
      ['far-water', 'water'],
    ]);
    expect(result.blocks.find(({ id }) => id === 'water')?.liquidLevel).toBeUndefined();
    expect(result.blocks.find(({ id }) => id === 'lava')?.liquidLevel).toBeUndefined();
    expect(result.blocks.find(({ id }) => id === 'far-water')?.liquidLevel).toBe(1);
  });

  it('thaws ice and snow only in the targeted area', () => {
    const result = applyAbility([
      block('ice', 0, 1, 0, 'ice'),
      block('snow', 1, 1, 0, 'snow'),
      block('obsidian', 2, 1, 0, 'obsidian'),
      block('far-ice', defaultRadius + 1, 1, 0, 'ice'),
    ], 'thaw', { x: 0, z: 0 });

    expect(result.affected).toBe(2);
    expect(result.blocks.map(({ material }) => material)).toEqual([
      'water',
      'water',
      'obsidian',
      'ice',
    ]);
    expect(isValidWorld(result.blocks)).toBe(true);
  });

  it('returns the original world when a power has no eligible target', () => {
    const world = [block('stone', 0, 0, 0, 'stone')];
    const result = applyAbility(world, 'rain', { x: 0, z: 0 });

    expect(result).toEqual({ blocks: world, changed: false, affected: 0 });
    expect(result.blocks).toBe(world);
  });

  it('uses a square brush that includes its corner cells', () => {
    const world = [
      block('corner', defaultRadius, 0, defaultRadius, 'soil'),
      block('outside', defaultRadius + 1, 0, 0, 'soil'),
    ];

    const result = applyAbility(world, 'verdant-touch', { x: 0, z: 0 });

    expect(result.affected).toBe(1);
    expect(result.blocks.find(({ id }) => id === 'corner')?.material).toBe('grass');
    expect(result.blocks.find(({ id }) => id === 'outside')?.material).toBe('soil');
  });

  it.each([
    ['verdant-touch', 'soil', undefined],
    ['wildfire', 'wood', undefined],
    ['rain', 'wood', 1],
    ['deep-freeze', 'water', undefined],
    ['thaw', 'ice', undefined],
  ] as const)('uses the shared adjustable size for %s', (ability, material, burning) => {
    const world = [
      block('center', 0, 0, 0, material, burning),
      block('neighbor', 1, 0, 0, material, burning),
    ];

    expect(applyAbility(world, ability, { x: 0, z: 0 }, 1).affected).toBe(1);
    expect(applyAbility(world, ability, { x: 0, z: 0 }, 3).affected).toBe(2);
  });

  it('lights animals with Wildfire and lets Rain extinguish them', () => {
    const animals = [
      { id: 'near', x: 1, z: 1 },
      { id: 'far', x: 2, z: 0 },
    ];

    const wildfire = applyAbilityToAnimals(animals, 'wildfire', { x: 0, z: 0 }, 3);
    expect(wildfire).toEqual({
      animals: [{ ...animals[0], burning: 1 }, animals[1]],
      changed: true,
      affected: 1,
    });

    const rain = applyAbilityToAnimals(wildfire.animals, 'rain', { x: 0, z: 0 }, 3);
    expect(rain).toEqual({ animals, changed: true, affected: 1 });
  });
});
