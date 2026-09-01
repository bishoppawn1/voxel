import { describe, expect, it } from 'vitest';
import {
  ANIMAL_BREEDING_MEALS,
  ANIMAL_KEYS,
  MAX_ANIMAL_HUNGER,
  advanceEcosystem,
  convertCoveredGrassToSoil,
  createInitialEcosystem,
  isValidEcosystem,
  spawnAnimal,
  type Animal,
  type AnimalKind,
  type EcosystemState,
  type VegetationKind,
} from './ecosystem';
import { createStarterWorld, type BlockMaterial, type VoxelBlock } from './world';

const block = (
  id: string,
  x: number,
  z: number,
  material: BlockMaterial,
  y = 0,
): VoxelBlock => ({ id, x, y, z, material });

const animal = (
  kind: AnimalKind,
  id: string,
  x = 0,
  z = 0,
  overrides: Partial<Animal> = {},
): Animal => ({
  id,
  kind,
  x,
  z,
  eaten: 0,
  hunger: MAX_ANIMAL_HUNGER,
  isBaby: false,
  breedingCooldown: 0,
  ...overrides,
});

const emptyEcosystem = (): EcosystemState => ({
  tick: 0,
  vegetation: [],
  animals: [],
  nextEntityId: 0,
});

describe('vegetation growth', () => {
  it('turns covered grassy dirt back into dirt while preserving block identity', () => {
    const grassyDirt = { ...block('grass', 0, 0, 'grass'), burning: 1 };
    const cover = block('cover', 0, 0, 'stone', 1);

    expect(convertCoveredGrassToSoil([grassyDirt, cover])).toEqual([
      block('grass', 0, 0, 'soil'),
      cover,
    ]);
  });

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

describe('animal spawning and diets', () => {
  it('offers sheep plus four new animal species', () => {
    expect(ANIMAL_KEYS).toEqual(['sheep', 'cow', 'pig', 'rabbit', 'goat']);
  });

  it('spawns the selected animal at full hunger on an open surface', () => {
    const world = [block('stone', 2, -1, 'stone')];
    const result = spawnAnimal(world, emptyEcosystem(), 'cow', 2, -1);

    expect(result.animals).toEqual([
      animal('cow', 'cow-0', 2, -1),
    ]);
    expect(result.nextEntityId).toBe(1);
  });

  it('does not spawn without a surface or on an occupied animal cell', () => {
    const world = [block('stone', 0, 0, 'stone')];
    const occupied = spawnAnimal(world, emptyEcosystem(), 'pig', 0, 0);

    expect(spawnAnimal(world, occupied, 'rabbit', 0, 0)).toBe(occupied);
    expect(spawnAnimal(world, occupied, 'goat', 1, 0)).toBe(occupied);
  });

  it.each([
    ['sheep', 'grass'],
    ['cow', 'tall-grass'],
    ['pig', 'flower'],
    ['rabbit', 'grass'],
    ['goat', 'flower'],
  ] as const)('%s eats its preferred vegetation', (kind, food) => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'food', blockId: grassyDirt.id, kind: food }],
      animals: [animal(kind, `${kind}-0`, 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.ecosystem.vegetation).toEqual([]);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 72 });
  });

  it('keeps inedible vegetation for another species', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'food', blockId: grassyDirt.id, kind: 'tall-grass' }],
      animals: [animal('rabbit', 'rabbit-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.ecosystem.vegetation).toEqual(ecosystem.vegetation);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 0, hunger: 38 });
    expect(result.blocks[0].material).toBe('grass');
  });

  it.each(['sheep', 'cow', 'pig', 'goat'] as const)(
    '%s can graze grassy dirt after surface growth is gone',
    (kind) => {
      const grassyDirt = block('grass', 0, 0, 'grass');
      const ecosystem: EcosystemState = {
        ...emptyEcosystem(),
        animals: [animal(kind, `${kind}-0`, 0, 0, { hunger: 40 })],
        nextEntityId: 1,
      };
      const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

      expect(result.blocks[0].material).toBe('soil');
      expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 72 });
    },
  );
});

describe('animal life cycle', () => {
  it('starts the starter world with two adult sheep', () => {
    const ecosystem = createInitialEcosystem(createStarterWorld());
    expect(ecosystem.animals).toHaveLength(2);
    expect(ecosystem.animals.every(({ kind }) => kind === 'sheep')).toBe(true);
    expect(ecosystem.animals.every(({ isBaby }) => !isBaby)).toBe(true);
    expect(ecosystem.animals.every(({ hunger }) => hunger === MAX_ANIMAL_HUNGER)).toBe(true);
  });

  it('moves an animal onto adjacent preferred food before eating on the next tick', () => {
    const world = [
      block('stone', 0, 0, 'stone'),
      block('grass', 1, 0, 'grass'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('cow', 'cow-0')],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.animals[0]).toMatchObject({ x: 1, z: 0, eaten: 0 });
  });

  it('keeps following a reachable food path instead of pacing back to a dead end', () => {
    const world = [
      block('start', 0, 0, 'stone'),
      block('step-1', -1, 0, 'stone'),
      block('step-2', -1, 1, 'stone'),
      block('step-3', -1, 2, 'stone'),
      block('step-4', 0, 2, 'stone'),
      block('step-5', 1, 2, 'stone'),
      block('step-6', 2, 2, 'stone'),
      block('step-7', 2, 1, 'stone'),
      block('food', 2, 0, 'grass'),
      block('cliff', 1, 0, 'stone', 2),
    ];
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('sheep', 'sheep-0')],
      nextEntityId: 1,
    };

    ecosystem = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(ecosystem.animals[0]).toMatchObject({ x: -1, z: 0 });

    ecosystem = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(ecosystem.animals[0]).toMatchObject({ x: -1, z: 1 });
  });

  it('climbs one block level per step and refuses a two-level jump', () => {
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('sheep', 'sheep-0')],
      nextEntityId: 1,
    };
    const climbableWorld = [
      block('start', 0, 0, 'stone', 0),
      block('step', 1, 0, 'stone', 1),
      block('food', 2, 0, 'grass', 2),
    ];
    const tooSteepWorld = [
      block('start', 0, 0, 'stone', 0),
      block('food', 1, 0, 'grass', 2),
    ];
    const descendableWorld = [
      block('start', 0, 0, 'stone', 2),
      block('step', 1, 0, 'stone', 1),
      block('food', 2, 0, 'grass', 0),
    ];
    const tooFarDownWorld = [
      block('start', 0, 0, 'stone', 2),
      block('food', 1, 0, 'grass', 0),
    ];

    expect(advanceEcosystem(climbableWorld, ecosystem, () => 1).ecosystem.animals[0])
      .toMatchObject({ x: 1, z: 0 });
    expect(advanceEcosystem(tooSteepWorld, ecosystem, () => 1).ecosystem.animals[0])
      .toMatchObject({ x: 0, z: 0 });
    expect(advanceEcosystem(descendableWorld, ecosystem, () => 1).ecosystem.animals[0])
      .toMatchObject({ x: 1, z: 0 });
    expect(advanceEcosystem(tooFarDownWorld, ecosystem, () => 1).ecosystem.animals[0])
      .toMatchObject({ x: 0, z: 0 });
  });

  it('brings fed adults of the same species together and creates a baby', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('pig', 'pig-0', 0, 0, { eaten: ANIMAL_BREEDING_MEALS }),
        animal('pig', 'pig-1', 1, 0, { eaten: ANIMAL_BREEDING_MEALS }),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.animals).toHaveLength(3);
    expect(result.ecosystem.animals.find(({ isBaby }) => isBaby)).toMatchObject({
      id: 'pig-2',
      kind: 'pig',
      x: 2,
      z: 0,
      isBaby: true,
    });
  });

  it('does not breed animals of different species', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('cow', 'cow-0', 0, 0, { eaten: ANIMAL_BREEDING_MEALS }),
        animal('goat', 'goat-1', 1, 0, { eaten: ANIMAL_BREEDING_MEALS }),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals).toHaveLength(2);
  });

  it('removes only the individual animal whose hunger reaches zero', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('rabbit', 'hungry-rabbit', 0, 0, { hunger: 1 }),
        animal('cow', 'fed-cow', 2, 0),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals).toMatchObject([
      { id: 'fed-cow', hunger: MAX_ANIMAL_HUNGER - 2 },
    ]);
  });
});

describe('ecosystem persistence validation', () => {
  it('accepts initial state and rejects malformed or unknown animals', () => {
    expect(isValidEcosystem(createInitialEcosystem(createStarterWorld()))).toBe(true);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: [{ ...animal('sheep', 'bad'), kind: 'dragon' }],
    })).toBe(false);
    expect(isValidEcosystem({ ...emptyEcosystem(), animals: [{ id: 'bad' }] })).toBe(false);
  });

  it('accepts each supported animal kind', () => {
    const vegetationKinds: VegetationKind[] = ['grass', 'flower', 'tall-grass'];
    expect(vegetationKinds).toHaveLength(3);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: ANIMAL_KEYS.map((kind, index) => animal(kind, `${kind}-${index}`, index, 0)),
      nextEntityId: ANIMAL_KEYS.length,
    })).toBe(true);
  });
});
