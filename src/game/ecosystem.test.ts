import { describe, expect, it } from 'vitest';
import {
  MAX_ANIMAL_HUNGER,
  SHEEP_BREEDING_MEALS,
  advanceEcosystem,
  createInitialEcosystem,
  isValidEcosystem,
  type EcosystemState,
} from './ecosystem';
import { createStarterWorld, type BlockMaterial, type VoxelBlock } from './world';

const block = (
  id: string,
  x: number,
  z: number,
  material: BlockMaterial,
  y = 0,
): VoxelBlock => ({ id, x, y, z, material });

const emptyEcosystem = (): EcosystemState => ({
  tick: 0,
  vegetation: [],
  sheep: [],
  nextEntityId: 0,
});

describe('vegetation growth', () => {
  it('turns exposed dirt into grassy dirt without adding a block', () => {
    const dirt = block('dirt', 0, 0, 'soil');
    const result = advanceEcosystem([dirt], emptyEcosystem(), () => 0);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].material).toBe('grass');
    expect(result.ecosystem.vegetation).toEqual([]);
  });

  it('grows a separate vegetation attachment on exposed grassy dirt', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const result = advanceEcosystem([grassyDirt], emptyEcosystem(), () => 0);

    expect(result.blocks).toEqual([grassyDirt]);
    expect(result.ecosystem.vegetation).toEqual([
      { id: 'growth-0', blockId: 'grass', kind: 'grass' },
    ]);
  });

  it.each([
    ['tall-grass', 0.62],
    ['flower', 0.92],
  ] as const)('can grow %s vegetation without occupying another cell', (kind, kindRoll) => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const result = advanceEcosystem(
      [grassyDirt],
      emptyEcosystem(),
      (key) => key.startsWith('sprout-kind:') ? kindRoll : 0,
    );

    expect(result.blocks).toEqual([grassyDirt]);
    expect(result.ecosystem.vegetation[0].kind).toBe(kind);
  });
});

describe('sheep life cycle', () => {
  it('starts the starter world with two adult sheep', () => {
    const ecosystem = createInitialEcosystem(createStarterWorld());
    expect(ecosystem.sheep).toHaveLength(2);
    expect(ecosystem.sheep.every(({ isBaby }) => !isBaby)).toBe(true);
    expect(ecosystem.sheep.every(({ hunger }) => hunger === MAX_ANIMAL_HUNGER)).toBe(true);
  });

  it('lets a sheep eat grassy dirt and tracks the meal', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      sheep: [{
        id: 'sheep-0',
        x: 0,
        z: 0,
        eaten: 0,
        hunger: 40,
        isBaby: false,
        breedingCooldown: 0,
      }],
      nextEntityId: 1,
    };
    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.blocks[0].material).toBe('soil');
    expect(result.ecosystem.sheep[0].eaten).toBe(1);
    expect(result.ecosystem.sheep[0].hunger).toBe(72);
  });

  it('moves a sheep onto adjacent food before it eats on the next tick', () => {
    const world = [
      block('stone', 0, 0, 'stone'),
      block('grass', 1, 0, 'grass'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      sheep: [{
        id: 'sheep-0',
        x: 0,
        z: 0,
        eaten: 0,
        hunger: MAX_ANIMAL_HUNGER,
        isBaby: false,
        breedingCooldown: 0,
      }],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.sheep[0]).toMatchObject({ x: 1, z: 0, eaten: 0 });
  });

  it('brings fed adults together and creates a smaller baby sheep', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      sheep: [
        {
          id: 'sheep-0',
          x: 0,
          z: 0,
          eaten: SHEEP_BREEDING_MEALS,
          hunger: MAX_ANIMAL_HUNGER,
          isBaby: false,
          breedingCooldown: 0,
        },
        {
          id: 'sheep-1',
          x: 1,
          z: 0,
          eaten: SHEEP_BREEDING_MEALS,
          hunger: MAX_ANIMAL_HUNGER,
          isBaby: false,
          breedingCooldown: 0,
        },
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.sheep).toHaveLength(3);
    expect(result.ecosystem.sheep.find(({ isBaby }) => isBaby)).toMatchObject({
      id: 'sheep-2',
      x: 2,
      z: 0,
      isBaby: true,
    });
    expect(
      result.ecosystem.sheep.filter(({ isBaby }) => !isBaby).map(({ eaten }) => eaten),
    ).toEqual([0, 0]);
  });

  it('moves two fed adults toward each other before breeding', () => {
    const world = Array.from({ length: 5 }, (_, x) => block(`stone-${x}`, x, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      sheep: [
        {
          id: 'sheep-0',
          x: 0,
          z: 0,
          eaten: SHEEP_BREEDING_MEALS,
          hunger: MAX_ANIMAL_HUNGER,
          isBaby: false,
          breedingCooldown: 0,
        },
        {
          id: 'sheep-1',
          x: 4,
          z: 0,
          eaten: SHEEP_BREEDING_MEALS,
          hunger: MAX_ANIMAL_HUNGER,
          isBaby: false,
          breedingCooldown: 0,
        },
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.sheep).toMatchObject([
      { id: 'sheep-0', x: 1, z: 0 },
      { id: 'sheep-1', x: 3, z: 0 },
    ]);
  });

  it('eventually produces a lamb in the deterministic starter ecosystem', () => {
    let blocks = createStarterWorld();
    let ecosystem = createInitialEcosystem(blocks);

    for (let tick = 0; tick < 8 && ecosystem.sheep.length < 3; tick += 1) {
      const next = advanceEcosystem(blocks, ecosystem);
      blocks = next.blocks;
      ecosystem = next.ecosystem;
    }

    expect(ecosystem.sheep.some(({ isBaby }) => isBaby)).toBe(true);
  });

  it('removes only the individual animal whose hunger reaches zero', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      sheep: [
        {
          id: 'hungry-sheep',
          x: 0,
          z: 0,
          eaten: 0,
          hunger: 1,
          isBaby: false,
          breedingCooldown: 0,
        },
        {
          id: 'fed-sheep',
          x: 2,
          z: 0,
          eaten: 0,
          hunger: MAX_ANIMAL_HUNGER,
          isBaby: false,
          breedingCooldown: 0,
        },
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.sheep).toMatchObject([
      { id: 'fed-sheep', hunger: MAX_ANIMAL_HUNGER - 2 },
    ]);
  });
});

describe('ecosystem persistence validation', () => {
  it('accepts initial state and rejects malformed entities', () => {
    expect(isValidEcosystem(createInitialEcosystem(createStarterWorld()))).toBe(true);
    expect(isValidEcosystem({ ...emptyEcosystem(), sheep: [{ id: 'bad' }] })).toBe(false);
  });
});
