import { describe, expect, it } from 'vitest';
import {
  ANIMALS,
  ANIMAL_BREEDING_MIN_HUNGER,
  ANIMAL_FEED_THRESHOLD,
  ANIMAL_KEYS,
  BABY_GROWTH_MEALS,
  HUMAN_CHILDHOOD_TICKS,
  HUMAN_HOUSE_BLUEPRINT,
  HUMAN_MAX_POPULATION,
  HUMAN_REPRODUCTION_MIN_HUNGER,
  HUMAN_WORKBENCH_SEARCH_RADIUS,
  HERBIVORE_FIGHT_BACK_CHANCE,
  HERBIVORE_KEYS,
  MAX_ANIMAL_HUNGER,
  PREDATOR_KEYS,
  SAPLING_MATURATION_TICKS,
  SHORT_GRASS_MATURATION_TICKS,
  advanceEcosystem,
  animalMovesOnTick,
  chooseHumanActivity,
  convertCoveredGrassToSoil,
  createAnimalSurfaceIndex,
  createFounderHumanTraits,
  createInitialEcosystem,
  inheritHumanTraits,
  isValidEcosystem,
  migrateEcosystem,
  spawnAnimal,
  type Animal,
  type AnimalKind,
  type EcosystemState,
  type VegetationKind,
} from './ecosystem';
import {
  advanceWorldStep,
  createStarterWorld,
  type BlockMaterial,
  type VoxelBlock,
} from './world';

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
  age: 0,
  health: ANIMALS[kind].maxHealth,
  facingX: 1,
  facingZ: 0,
  ...(kind === 'human' ? {
    tools: [],
    traits: createFounderHumanTraits(id),
    generation: 0,
  } : {}),
  ...overrides,
});

const emptyEcosystem = (): EcosystemState => ({
  tick: 0,
  vegetation: [],
  animals: [],
  nextEntityId: 0,
});

const GRAZER_KEYS = HERBIVORE_KEYS.filter((kind) => kind !== 'beaver');
const LAND_PREDATOR_KEYS = ['fox', 'wolf', 'bear', 'eagle', 'crocodile'] as const;

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
      {
        id: 'growth-0',
        blockId: 'grass',
        kind: 'grass',
        maturesAtTick: SHORT_GRASS_MATURATION_TICKS + 1,
      },
    ]);
  });

  it.each([
    ['tall-grass', 0.62],
    ['flower', 0.92],
    ['sapling', 0.99],
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

  it('matures short grass into tall grass after its growth period', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{
        id: 'short-grass',
        blockId: grassyDirt.id,
        kind: 'grass',
        maturesAtTick: SHORT_GRASS_MATURATION_TICKS,
      }],
      nextEntityId: 1,
    };

    for (let tick = 1; tick < SHORT_GRASS_MATURATION_TICKS; tick += 1) {
      ecosystem = advanceEcosystem([grassyDirt], ecosystem, () => 1).ecosystem;
    }
    expect(ecosystem.vegetation[0]).toMatchObject({
      id: 'short-grass',
      kind: 'grass',
    });

    ecosystem = advanceEcosystem([grassyDirt], ecosystem, () => 1).ecosystem;

    expect(ecosystem.vegetation).toEqual([
      { id: 'short-grass', blockId: grassyDirt.id, kind: 'tall-grass' },
    ]);
  });

  it('matures a sapling into a rooted wood-and-leaves tree', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{
        id: 'sapling',
        blockId: grassyDirt.id,
        kind: 'sapling',
        maturesAtTick: SAPLING_MATURATION_TICKS,
      }],
      nextEntityId: 1,
    };
    let world = [grassyDirt];

    for (let tick = 1; tick <= SAPLING_MATURATION_TICKS; tick += 1) {
      const result = advanceEcosystem(world, ecosystem, () => 0);
      world = result.blocks;
      ecosystem = result.ecosystem;
    }

    expect(ecosystem.vegetation).toEqual([]);
    expect(world.find(({ id }) => id === grassyDirt.id)).toMatchObject({
      material: 'soil',
    });
    expect(world.filter(({ material }) => material === 'wood').length).toBeGreaterThanOrEqual(8);
    expect(world.filter(({ material }) => material === 'leaves').length).toBeGreaterThan(0);
    expect(world).toContainEqual(expect.objectContaining({
      id: 'tree-sapling-0',
      x: 0,
      y: 1,
      z: 0,
      material: 'wood',
    }));
    expect(advanceWorldStep(world, false).structuresMoved).toBe(false);
  });

  it('uses multiple deterministic tree growth patterns', () => {
    const growTree = (patternRoll: number) => {
      const grassyDirt = block('grass', 0, 0, 'grass');
      const ecosystem: EcosystemState = {
        ...emptyEcosystem(),
        vegetation: [{
          id: 'sapling',
          blockId: grassyDirt.id,
          kind: 'sapling',
          maturesAtTick: 1,
        }],
        nextEntityId: 1,
      };
      const result = advanceEcosystem(
        [grassyDirt],
        ecosystem,
        (key) => key.startsWith('tree-pattern:') ? patternRoll : 0,
      );
      expect(advanceWorldStep(result.blocks, false).structuresMoved).toBe(false);
      return result.blocks
        .filter(({ id }) => id.startsWith('tree-'))
        .map(({ x, y, z, material }) => `${x},${y},${z}:${material}`)
        .sort();
    };

    const patterns = [growTree(0), growTree(0.4), growTree(0.8)];

    expect(new Set(patterns.map((pattern) => pattern.join('|'))).size).toBe(3);
  });

  it('waits to grow a mature sapling until its tree footprint is clear', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const obstruction = block('floating-block', 1, 0, 'stone', 7);
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{
        id: 'sapling',
        blockId: grassyDirt.id,
        kind: 'sapling',
        maturesAtTick: 1,
      }],
      nextEntityId: 1,
    };

    const blocked = advanceEcosystem([grassyDirt, obstruction], ecosystem, () => 0);
    expect(blocked.blocks).toEqual([grassyDirt, obstruction]);
    expect(blocked.ecosystem.vegetation).toEqual(ecosystem.vegetation);

    const grown = advanceEcosystem(
      [grassyDirt],
      blocked.ecosystem,
      () => 0,
    );
    expect(grown.ecosystem.vegetation).toEqual([]);
    expect(grown.blocks.some(({ material }) => material === 'wood')).toBe(true);
  });

  it('waits to grow while an animal occupies any tree footprint column', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const rabbitGround = block('rabbit-ground', 1, 0, 'stone');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{
        id: 'sapling',
        blockId: grassyDirt.id,
        kind: 'sapling',
        maturesAtTick: 1,
      }],
      animals: [animal('rabbit', 'rabbit-1', 1, 0)],
      nextEntityId: 2,
    };

    const result = advanceEcosystem([grassyDirt, rabbitGround], ecosystem, () => 0);

    expect(result.blocks).toEqual([grassyDirt, rabbitGround]);
    expect(result.ecosystem.vegetation).toEqual(ecosystem.vegetation);
    expect(result.ecosystem.animals[0]).toMatchObject({ x: 1, z: 0 });
  });

  it('keeps ground walkable below high canopies but blocks tree trunks', () => {
    const canopyGround = block('canopy-ground', 0, 0, 'stone');
    const trunkGround = block('trunk-ground', 1, 0, 'soil');
    const surfaces = createAnimalSurfaceIndex([
      canopyGround,
      block('tree-canopy', 0, 0, 'leaves', 8),
      trunkGround,
      block('tree-trunk', 1, 0, 'wood', 1),
    ]);

    expect(surfaces.get('0,0')).toEqual(canopyGround);
    expect(surfaces.has('1,0')).toBe(false);
  });

  it('keeps a hungry rabbit on the ground below a mature tree canopy', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const grown = advanceEcosystem(
      [grassyDirt],
      {
        ...emptyEcosystem(),
        vegetation: [{
          id: 'sapling',
          blockId: grassyDirt.id,
          kind: 'sapling',
          maturesAtTick: 1,
        }],
        nextEntityId: 1,
      },
      () => 0,
    );
    const rabbitGround = block('rabbit-ground', 2, 0, 'stone');
    const result = advanceEcosystem(
      [...grown.blocks, rabbitGround],
      {
        ...grown.ecosystem,
        animals: [animal('rabbit', 'rabbit-1', 2, 0, { hunger: 40 })],
        nextEntityId: 2,
      },
      () => 1,
    );

    expect(result.ecosystem.animals[0]).toMatchObject({
      x: 2,
      z: 0,
      eaten: 0,
    });
    expect(result.blocks.some(({ material }) => material === 'leaves')).toBe(true);
  });

  it('grows kelp as a water attachment without creating a block', () => {
    const water = block('water', 0, 0, 'water');
    const result = advanceEcosystem([water], emptyEcosystem(), () => 0);

    expect(result.blocks).toEqual([water]);
    expect(result.ecosystem.vegetation).toEqual([
      { id: 'growth-0', blockId: 'water', kind: 'kelp' },
    ]);
  });

});

describe('animal spawning and diets', () => {
  it('offers the beaver, two tiers of fish, and a human', () => {
    expect(ANIMAL_KEYS).toEqual([
      'sheep', 'cow', 'pig', 'rabbit', 'goat',
      'deer', 'horse', 'chicken', 'duck', 'turtle', 'beaver',
      'fox', 'wolf', 'bear', 'eagle', 'crocodile',
      'small-fish', 'big-fish',
      'human',
    ]);
    expect(ANIMAL_KEYS).toHaveLength(19);
    expect(ANIMALS.beaver).toMatchObject({
      vegetation: ['sapling'],
      materials: ['wood'],
      predator: false,
      hungerLossEveryTicks: 4,
      eatEveryTicks: 8,
    });
    expect(ANIMALS.fox).toMatchObject({
      predator: true,
      maxHealth: 12,
      attackDamage: 4,
    });
    expect(ANIMALS.fox.prey).toEqual([...HERBIVORE_KEYS, 'small-fish', 'big-fish']);
    for (const kind of HERBIVORE_KEYS) {
      expect(ANIMALS[kind]).toMatchObject({
        predator: false,
        attackDamage: 1,
      });
    }
    for (const kind of PREDATOR_KEYS) expect(ANIMALS[kind].predator).toBe(true);
    expect(ANIMALS['small-fish'].vegetation).toEqual(['kelp']);
    expect(ANIMALS['big-fish'].prey).toEqual(['small-fish']);
    expect(ANIMALS.human).toMatchObject({ canBreed: false, predator: false });
  });

  it('gives species distinct speeds while keeping predators faster on average', () => {
    expect(ANIMALS.rabbit.moveEveryTicks).toBe(1);
    expect(ANIMALS.horse.moveEveryTicks).toBe(1);
    expect(ANIMALS.sheep.moveEveryTicks).toBe(2);
    expect(ANIMALS.cow.moveEveryTicks).toBe(3);
    expect(ANIMALS.turtle.moveEveryTicks).toBe(4);
    expect(ANIMALS.fox.moveEveryTicks).toBe(1);
    expect(ANIMALS.bear.moveEveryTicks).toBe(2);

    const averageCadence = (kinds: readonly AnimalKind[]) =>
      kinds.reduce((total, kind) => total + ANIMALS[kind].moveEveryTicks, 0) / kinds.length;
    expect(averageCadence(PREDATOR_KEYS)).toBeLessThan(averageCadence(HERBIVORE_KEYS));
  });

  it('stagger slow animals so a herd does not move all at once', () => {
    const first = animal('sheep', 'sheep-0');
    const second = animal('sheep', 'sheep-1');

    expect(animalMovesOnTick(first, 1)).toBe(true);
    expect(animalMovesOnTick(second, 1)).toBe(false);
    expect(animalMovesOnTick(first, 2)).toBe(false);
    expect(animalMovesOnTick(second, 2)).toBe(true);
  });

  it('spawns the selected animal at full hunger on an open surface', () => {
    const world = [block('stone', 2, -1, 'stone')];
    const result = spawnAnimal(world, emptyEcosystem(), 'cow', 2, -1);

    expect(result.animals).toEqual([
      animal('cow', 'cow-0', 2, -1),
    ]);
    expect(result.nextEntityId).toBe(1);
  });

  it('spawns an animal on clear ground below a generated tree canopy', () => {
    const world = [
      block('ground', 0, 0, 'stone'),
      block('tree-canopy', 0, 0, 'leaves', 8),
    ];

    const result = spawnAnimal(world, emptyEcosystem(), 'sheep', 0, 0);

    expect(result.animals).toMatchObject([{ id: 'sheep-0', x: 0, z: 0 }]);
  });

  it('does not spawn without a surface or on an occupied animal cell', () => {
    const world = [block('stone', 0, 0, 'stone')];
    const occupied = spawnAnimal(world, emptyEcosystem(), 'pig', 0, 0);

    expect(spawnAnimal(world, occupied, 'rabbit', 0, 0)).toBe(occupied);
    expect(spawnAnimal(world, occupied, 'goat', 1, 0)).toBe(occupied);
  });

  it('spawns fish only in water while land animals may enter water to swim', () => {
    const water = [block('water', 0, 0, 'water')];
    const land = [block('land', 0, 0, 'stone')];

    expect(spawnAnimal(land, emptyEcosystem(), 'small-fish', 0, 0))
      .toEqual(emptyEcosystem());
    expect(spawnAnimal(water, emptyEcosystem(), 'small-fish', 0, 0).animals[0].kind)
      .toBe('small-fish');
    expect(spawnAnimal(water, emptyEcosystem(), 'sheep', 0, 0).animals[0].kind)
      .toBe('sheep');
  });

  it.each([
    ['sheep', 'grass'],
    ['cow', 'tall-grass'],
    ['pig', 'flower'],
    ['rabbit', 'grass'],
    ['goat', 'flower'],
    ['deer', 'tall-grass'],
    ['horse', 'grass'],
    ['chicken', 'flower'],
    ['duck', 'grass'],
    ['turtle', 'grass'],
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
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 73 });
  });

  it('keeps inedible surface growth while grazing the edible block beneath it', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'food', blockId: grassyDirt.id, kind: 'tall-grass' }],
      animals: [animal('rabbit', 'rabbit-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.ecosystem.vegetation).toEqual(ecosystem.vegetation);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 73 });
    expect(result.blocks[0].material).toBe('soil');
  });

  it.each(GRAZER_KEYS)(
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
      expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 73 });
    },
  );

  it('gives general grazers shared plant foods while keeping the beaver tree-only', () => {
    for (const kind of GRAZER_KEYS) {
      expect(ANIMALS[kind].materials).toEqual(
        expect.arrayContaining(['grass', 'leaves', 'moss']),
      );
    }
    expect(ANIMALS.beaver.materials).toEqual(['wood']);
    expect(ANIMALS.beaver.vegetation).toEqual(['sapling']);
    for (const kind of PREDATOR_KEYS) expect(ANIMALS[kind].materials).toEqual([]);
  });

  it.each([
    ['leaves', undefined],
    ['moss', 'soil'],
  ] as const)('consumes %s plant blocks instead of eating them forever', (material, remainder) => {
    const foodBlock = block('food', 0, 0, material);
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('rabbit', 'rabbit-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem([foodBlock], ecosystem, () => 1);

    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 73 });
    expect(result.blocks[0]?.material).toBe(remainder);
  });

  it('does not let a predator graze plant blocks', () => {
    const moss = block('moss', 0, 0, 'moss');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('fox', 'fox-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem([moss], ecosystem, () => 1);

    expect(result.blocks).toEqual([moss]);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 0, hunger: 39 });
  });

  it('does not consume food until an animal is missing a full meal', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'food', blockId: grassyDirt.id, kind: 'grass' }],
      animals: [animal('rabbit', 'rabbit-0')],
      nextEntityId: 1,
    };

    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.ecosystem.vegetation).toEqual([
      {
        ...ecosystem.vegetation[0],
        maturesAtTick: SHORT_GRASS_MATURATION_TICKS,
      },
    ]);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 0, hunger: 99 });
  });

  it('lets a beaver eat saplings only on its slow feeding cadence', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'sapling', blockId: grassyDirt.id, kind: 'sapling' }],
      animals: [animal('beaver', 'beaver-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    for (let tick = 1; tick < 8; tick += 1) {
      ecosystem = advanceEcosystem([grassyDirt], ecosystem, () => 1).ecosystem;
    }
    expect(ecosystem.vegetation).toHaveLength(1);
    expect(ecosystem.animals[0]).toMatchObject({ eaten: 0, hunger: 39 });

    ecosystem = advanceEcosystem([grassyDirt], ecosystem, () => 1).ecosystem;
    expect(ecosystem.vegetation).toEqual([]);
    expect(ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 72 });
  });

  it('lets a hungry beaver consume exposed wood', () => {
    const wood = block('wood', 0, 0, 'wood');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      tick: 7,
      animals: [animal('beaver', 'beaver-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem([wood], ecosystem, () => 1);

    expect(result.blocks).toEqual([]);
    expect(result.ecosystem.animals[0]).toMatchObject({ eaten: 1, hunger: 73 });
  });

  it('protects a sapling from ordinary grazers', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'sapling', blockId: grassyDirt.id, kind: 'sapling' }],
      animals: [animal('sheep', 'sheep-0', 0, 0, { hunger: ANIMAL_FEED_THRESHOLD })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem([grassyDirt], ecosystem, () => 1);

    expect(result.blocks).toEqual([grassyDirt]);
    expect(result.ecosystem.vegetation).toEqual([{
      ...ecosystem.vegetation[0],
      maturesAtTick: SAPLING_MATURATION_TICKS,
    }]);
    expect(result.ecosystem.animals[0].eaten).toBe(0);
  });
});

describe('human crafting and building', () => {
  it('spawns a human with an empty one-item hand and no tools', () => {
    const world = [block('ground', 0, 0, 'stone')];
    const result = spawnAnimal(world, emptyEcosystem(), 'human', 0, 0);

    expect(result.animals).toEqual([
      animal('human', 'human-0', 0, 0, { tools: [] }),
    ]);
  });

  it('chops one adjacent log into its single hand slot', () => {
    const world = [
      block('ground', 0, 0, 'stone'),
      block('tree-ground', 1, 0, 'stone'),
      block('log', 1, 0, 'wood', 1),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, { tools: ['axe'] })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks.some(({ id }) => id === 'log')).toBe(false);
    expect(result.ecosystem.animals[0]).toMatchObject({
      heldItem: 'wood',
      activeTool: 'axe',
    });
  });

  it('switches from its spear back to its axe when logging resumes', () => {
    const world = [
      block('ground', 0, 0, 'stone'),
      block('tree-ground', 1, 0, 'stone'),
      block('log', 1, 0, 'wood', 1),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, {
        tools: ['axe', 'hammer', 'spear'],
        activeTool: 'spear',
        traits: { ...createFounderHumanTraits('human-0'), gathering: 100 },
      })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks.some(({ id }) => id === 'log')).toBe(false);
    expect(result.ecosystem.animals[0]).toMatchObject({
      heldItem: 'wood',
      activeTool: 'axe',
    });
  });

  it('uses its first log to build a basic crafting bench', () => {
    const world = [
      block('ground', 0, 0, 'stone'),
      block('bench-ground', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, {
        heldItem: 'wood',
        tools: [],
      })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);
    const human = result.ecosystem.animals[0];

    expect(result.blocks).toContainEqual({
      id: 'human-human-0-workbench',
      x: 1,
      y: 1,
      z: 0,
      material: 'crafting-bench',
    });
    expect(human).toMatchObject({ workbenchId: 'human-human-0-workbench' });
    expect(human.heldItem).toBeUndefined();
  });

  it('lets nearby humans adopt and simultaneously use one communal bench', () => {
    const bench = block('shared-bench', 0, 0, 'crafting-bench', 1);
    const world = [
      block('left-ground', -1, 0, 'stone'),
      block('bench-ground', 0, 0, 'stone'),
      block('right-ground', 1, 0, 'stone'),
      bench,
    ];
    const fastCrafting = { ...createFounderHumanTraits('fast'), craftsmanship: 100 };
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', -1, 0, {
          heldItem: 'wood',
          traits: fastCrafting,
        }),
        animal('human', 'human-1', 1, 0, {
          heldItem: 'wood',
          traits: fastCrafting,
        }),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks.filter(({ material }) => material === 'crafting-bench')).toEqual([bench]);
    expect(result.ecosystem.animals).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'human-0', workbenchId: bench.id, crafting: 'axe' }),
      expect.objectContaining({ id: 'human-1', workbenchId: bench.id, crafting: 'axe' }),
    ]));
  });

  it('adopts an existing crafting bench exactly ten spaces away', () => {
    const bench = block(
      'shared-bench',
      HUMAN_WORKBENCH_SEARCH_RADIUS,
      0,
      'crafting-bench',
      1,
    );
    const world = [
      ...Array.from({ length: HUMAN_WORKBENCH_SEARCH_RADIUS + 1 }, (_, x) =>
        block(`ground-${x}`, x, 0, 'stone')),
      bench,
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, { heldItem: 'wood' })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks.filter(({ material }) => material === 'crafting-bench')).toEqual([bench]);
    expect(result.ecosystem.animals[0]).toMatchObject({
      workbenchId: bench.id,
      heldItem: 'wood',
      x: 1,
      z: 0,
    });
  });

  it('builds its own crafting bench when the nearest one is eleven spaces away', () => {
    const distantBench = block(
      'distant-bench',
      HUMAN_WORKBENCH_SEARCH_RADIUS + 1,
      0,
      'crafting-bench',
      1,
    );
    const world = [
      ...Array.from({ length: HUMAN_WORKBENCH_SEARCH_RADIUS + 2 }, (_, x) =>
        block(`ground-${x}`, x, 0, 'stone')),
      distantBench,
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, { heldItem: 'wood' })],
      nextEntityId: 1,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks.filter(({ material }) => material === 'crafting-bench')).toEqual([
      distantBench,
      expect.objectContaining({
        id: 'human-human-0-workbench',
        x: 1,
        y: 1,
        z: 0,
      }),
    ]);
    expect(result.ecosystem.animals[0]).toMatchObject({
      workbenchId: 'human-human-0-workbench',
    });
  });

  it('puts one log into the bench, waits, and takes one plank out', () => {
    const bench = block('bench', 1, 0, 'crafting-bench', 1);
    const world = [block('ground', 0, 0, 'stone'), block('bench-ground', 1, 0, 'stone'), bench];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, {
        heldItem: 'wood',
        tools: ['axe', 'hammer', 'spear'],
        traits: { ...createFounderHumanTraits('human-0'), craftsmanship: 100 },
        workbenchId: bench.id,
      })],
      nextEntityId: 1,
    };

    const inserted = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(inserted.animals[0]).toMatchObject({ crafting: 'planks' });
    expect(inserted.animals[0].heldItem).toBeUndefined();

    const finished = advanceEcosystem(world, inserted, () => 1).ecosystem;
    expect(finished.animals[0]).toMatchObject({ heldItem: 'planks' });
    expect(finished.animals[0].crafting).toBeUndefined();
  });

  it('crafts the axe, hammer, and spear before producing house planks', () => {
    const bench = block('bench', 1, 0, 'crafting-bench', 1);
    const world = [block('ground', 0, 0, 'stone'), block('bench-ground', 1, 0, 'stone'), bench];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 0, {
        heldItem: 'wood',
        tools: [],
        traits: { ...createFounderHumanTraits('human-0'), craftsmanship: 100 },
        workbenchId: bench.id,
      })],
      nextEntityId: 1,
    };

    const inserted = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(inserted.animals[0]).toMatchObject({ crafting: 'axe', tools: [] });
    const finished = advanceEcosystem(world, inserted, () => 1).ecosystem;
    expect(finished.animals[0].tools).toEqual(['axe']);
  });

  it('places one carried plank into the next part of a roomy house outside the bench', () => {
    const bench = block('bench', 1, 0, 'crafting-bench', 1);
    const world = [
      block('ground', 0, 2, 'stone'),
      block('bench-ground', 1, 0, 'stone'),
      bench,
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0', 0, 2, {
        heldItem: 'planks',
        tools: ['axe', 'hammer', 'spear'],
        workbenchId: bench.id,
      })],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.blocks).toContainEqual({
      id: 'human-human-0-house-0',
      x: -1,
      y: 1,
      z: 2,
      material: 'planks',
    });
    expect(result.ecosystem.animals[0]).toMatchObject({ activeTool: 'hammer' });
    expect(result.ecosystem.animals[0].heldItem).toBeUndefined();
  });

  it('keeps the workbench outside a roofed cabin with a clear doorway and 3x3 interior', () => {
    const occupied = new Set(
      HUMAN_HOUSE_BLUEPRINT.map(({ x, y, z }) => `${x},${y},${z}`),
    );

    expect(occupied.size).toBe(HUMAN_HOUSE_BLUEPRINT.length);
    expect([...HUMAN_HOUSE_BLUEPRINT].every(({ z }) => z >= 2)).toBe(true);
    expect(occupied.has('0,0,0')).toBe(false);
    expect(occupied.has('0,0,2')).toBe(false);
    expect(occupied.has('0,1,2')).toBe(false);

    for (const x of [-1, 0, 1]) {
      for (const z of [3, 4, 5]) {
        expect(occupied.has(`${x},0,${z}`)).toBe(false);
        expect(occupied.has(`${x},1,${z}`)).toBe(false);
        expect(occupied.has(`${x},2,${z}`)).toBe(true);
      }
    }
  });

  it('hunts a neighboring animal and uses a spear for a clean kill', () => {
    const world = [block('human-ground', 0, 0, 'stone'), block('prey-ground', 1, 0, 'stone')];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { hunger: 30, tools: ['spear'] }),
        animal('rabbit', 'rabbit-1', 1, 0),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({
      kind: 'human',
      eaten: 1,
      hunger: 63,
      activeTool: 'spear',
    });
  });

  it('actively explores instead of standing still when no task is visible', () => {
    const world = Array.from({ length: 5 }, (_, index) =>
      block(`ground-${index}`, index - 2, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0')],
      nextEntityId: 1,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals[0];

    expect({ x: result.x, z: result.z }).not.toEqual({ x: 0, z: 0 });
  });

  it('uses intrinsic random rolls to choose between hunting, exploring, and working', () => {
    const human = animal('human', 'human-0', 0, 0, {
      hunger: 60,
      traits: {
        ...createFounderHumanTraits('human-0'),
        aggression: 100,
        exploration: 100,
      },
    });

    expect(chooseHumanActivity(human, 1, () => 0.1)).toBe('hunt');
    expect(chooseHumanActivity({ ...human, hunger: 100 }, 1, () => 0.1)).toBe('explore');
    expect(chooseHumanActivity({ ...human, hunger: 100 }, 1, () => 0.9)).toBe('work');
    expect(chooseHumanActivity({ ...human, hunger: 30 }, 1, () => 0.99)).toBe('hunt');
  });

  it('randomly varies its wandering destination', () => {
    const world = Array.from({ length: 5 }, (_, index) =>
      block(`ground-${index}`, index - 2, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-0')],
      nextEntityId: 1,
    };

    const left = advanceEcosystem(world, ecosystem, () => 0).ecosystem.animals[0];
    const right = advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals[0];

    expect(left).toMatchObject({ x: -1, z: 0 });
    expect(right).toMatchObject({ x: 1, z: 0 });
  });

  it('randomly chooses among several nearby prey', () => {
    const world = [-1, 0, 1].map((x) => block(`ground-${x}`, x, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, {
          hunger: 60,
          traits: {
            ...createFounderHumanTraits('human-0'),
            aggression: 100,
            caution: 0,
          },
        }),
        animal('rabbit', 'rabbit-left', -1, 0),
        animal('rabbit', 'rabbit-right', 1, 0),
      ],
      nextEntityId: 3,
    };
    const runWithPreyRoll = (preyRoll: number) =>
      advanceEcosystem(world, ecosystem, (key) => {
        if (key.startsWith('human-activity:')) return 0;
        if (key.startsWith('human-prey:')) return preyRoll;
        return 1;
      }).ecosystem.animals.map(({ id }) => id);

    expect(runWithPreyRoll(0)).toContain('rabbit-right');
    expect(runWithPreyRoll(0)).not.toContain('rabbit-left');
    expect(runWithPreyRoll(0.99)).toContain('rabbit-left');
    expect(runWithPreyRoll(0.99)).not.toContain('rabbit-right');
  });

  it('searches beyond its normal exploration range in a hunger emergency', () => {
    const world = Array.from({ length: 11 }, (_, x) => block(`ground-${x}`, x, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, {
          hunger: 36,
          traits: {
            ...createFounderHumanTraits('human-0'),
            aggression: 0,
            caution: 100,
            exploration: 0,
          },
        }),
        animal('rabbit', 'rabbit-1', 10, 0),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals.find(({ id }) => id === 'human-0')).toMatchObject({ x: 1, z: 0 });
  });
});

describe('human inheritance and selection', () => {
  const traits = (value: number) => ({
    aggression: value,
    caution: value,
    exploration: value,
    gathering: value,
    craftsmanship: value,
    efficiency: value,
  });

  it('gives founders distinct bounded traits and combines both parents with mutation', () => {
    const first = animal('human', 'human-0', 0, 0, { traits: traits(20) });
    const second = animal('human', 'human-1', 1, 0, { traits: traits(80) });

    expect(createFounderHumanTraits('human-0')).not.toEqual(createFounderHumanTraits('human-1'));
    expect(Object.values(createFounderHumanTraits('human-0')).every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 100,
    )).toBe(true);
    expect(inheritHumanTraits(first, second, 'human-2', 1, () => 0.5)).toEqual(traits(50));
    expect(inheritHumanTraits(first, second, 'human-2', 1, () => 1)).toEqual(traits(58));
  });

  it('lets healthy mature unrelated humans create an inherited child', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { age: 24, traits: traits(20) }),
        animal('human', 'human-1', 1, 0, { age: 24, traits: traits(80) }),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 0.5).ecosystem;
    const child = result.animals.find(({ isBaby }) => isBaby);

    expect(result.animals).toHaveLength(3);
    expect(child).toMatchObject({
      id: 'human-2',
      kind: 'human',
      generation: 1,
      parentIds: ['human-0', 'human-1'],
      traits: traits(50),
    });
    expect(result.animals.filter(({ isBaby }) => !isBaby).every(
      ({ hunger }) => hunger < HUMAN_REPRODUCTION_MIN_HUNGER,
    )).toBe(true);
  });

  it('randomly chooses among eligible unrelated partners', () => {
    const world = Array.from({ length: 5 }, (_, index) =>
      block(`ground-${index}`, index - 2, 0, 'stone'));
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { age: 24 }),
        animal('human', 'human-1', 1, 0, { age: 24 }),
        animal('human', 'human-2', -1, 0, { age: 24 }),
      ],
      nextEntityId: 3,
    };
    const childForPartnerRoll = (partnerRoll: number) =>
      advanceEcosystem(world, ecosystem, (key) =>
        key === 'human-partner:1:human-0' ? partnerRoll : 0.5)
        .ecosystem.animals.find(({ isBaby }) => isBaby);

    expect(childForPartnerRoll(0)?.parentIds).toEqual(['human-0', 'human-1']);
    expect(childForPartnerRoll(0.99)?.parentIds).toEqual(['human-0', 'human-2']);
  });

  it('reaches reproduction age before ordinary hunger can block a founder pair', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, {
          age: 11,
          hunger: HUMAN_REPRODUCTION_MIN_HUNGER + 1,
          traits: { ...createFounderHumanTraits('human-0'), efficiency: 0 },
        }),
        animal('human', 'human-1', 1, 0, {
          age: 11,
          hunger: HUMAN_REPRODUCTION_MIN_HUNGER + 1,
          traits: { ...createFounderHumanTraits('human-1'), efficiency: 0 },
        }),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 0.5).ecosystem.animals)
      .toHaveLength(3);
  });

  it('lets a founder pair form one workshop and begin a family over time', () => {
    let world = [
      ...Array.from({ length: 9 }, (_, x) => block(`ground-${x}`, x, 0, 'stone')),
      block('log-0', 0, 0, 'wood', 1),
      block('log-1', 1, 0, 'wood', 1),
    ];
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 2, 0),
        animal('human', 'human-1', 3, 0),
      ],
      nextEntityId: 2,
    };

    for (let tick = 0; tick < 24; tick += 1) {
      const result = advanceEcosystem(world, ecosystem, () => 1);
      world = result.blocks;
      ecosystem = result.ecosystem;
    }

    expect(ecosystem.animals.filter(({ kind }) => kind === 'human').length)
      .toBeGreaterThanOrEqual(3);
    expect(world.filter(({ material }) => material === 'crafting-bench')).toHaveLength(1);
    const workbenchIds = new Set(
      ecosystem.animals
        .filter(({ kind, isBaby }) => kind === 'human' && !isBaby)
        .map(({ workbenchId }) => workbenchId)
        .filter(Boolean),
    );
    expect(workbenchIds.size).toBeLessThanOrEqual(1);
  });

  it('prevents siblings and parent-child pairs from reproducing', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const siblings: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-2', 0, 0, {
          age: 60,
          generation: 1,
          parentIds: ['human-0', 'human-1'],
        }),
        animal('human', 'human-3', 1, 0, {
          age: 60,
          generation: 1,
          parentIds: ['human-0', 'human-1'],
        }),
      ],
      nextEntityId: 4,
    };
    const parentAndChild: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { age: 60 }),
        animal('human', 'human-2', 1, 0, {
          age: 60,
          generation: 1,
          parentIds: ['human-0', 'human-1'],
        }),
      ],
      nextEntityId: 3,
    };

    expect(advanceEcosystem(world, siblings, () => 0.5).ecosystem.animals).toHaveLength(2);
    expect(advanceEcosystem(world, parentAndChild, () => 0.5).ecosystem.animals).toHaveLength(2);
  });

  it('uses inherited efficiency to slow hunger loss', () => {
    const world = [block('left', 0, 0, 'stone'), block('right', 2, 0, 'stone')];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { traits: { ...traits(50), efficiency: 0 } }),
        animal('human', 'human-1', 2, 0, { traits: { ...traits(50), efficiency: 100 } }),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals.find(({ id }) => id === 'human-0')?.hunger).toBe(99);
    expect(result.animals.find(({ id }) => id === 'human-1')?.hunger).toBe(100);
  });

  it('lets aggression change when a human starts hunting', () => {
    const world = [block('human-ground', 0, 0, 'stone'), block('prey-ground', 1, 0, 'stone')];
    const makeState = (aggression: number): EcosystemState => ({
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, {
          hunger: 60,
          traits: { ...traits(50), aggression, caution: 0, exploration: 100 },
        }),
        animal('rabbit', 'rabbit-1', 1, 0),
      ],
      nextEntityId: 2,
    });

    expect(advanceEcosystem(world, makeState(0), () => 0.4).ecosystem.animals).toHaveLength(2);
    expect(advanceEcosystem(world, makeState(100), () => 0.4).ecosystem.animals).toHaveLength(1);
  });

  it('grows a human child by age and enforces the population cap on spawning', () => {
    const world = [block('ground', 0, 0, 'stone')];
    const childState: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('human', 'human-2', 0, 0, {
        age: HUMAN_CHILDHOOD_TICKS - 1,
        isBaby: true,
        generation: 1,
        parentIds: ['human-0', 'human-1'],
      })],
      nextEntityId: 3,
    };
    const grown = advanceEcosystem(world, childState, () => 1).ecosystem.animals[0];
    expect(grown).toMatchObject({ isBaby: false, age: HUMAN_CHILDHOOD_TICKS });

    const capped: EcosystemState = {
      ...emptyEcosystem(),
      animals: Array.from({ length: HUMAN_MAX_POPULATION }, (_, index) =>
        animal('human', `human-${index}`, index, 0)),
      nextEntityId: HUMAN_MAX_POPULATION,
    };
    expect(spawnAnimal(world, capped, 'human', 0, 0)).toBe(capped);
  });
});

describe('animal life cycle', () => {
  it('starts the starter world with sheep, kelp, and both sizes of fish', () => {
    const ecosystem = createInitialEcosystem(createStarterWorld());
    expect(ecosystem.animals.filter(({ kind }) => kind === 'sheep')).toHaveLength(2);
    expect(ecosystem.animals.filter(({ kind }) => kind === 'small-fish')).toHaveLength(2);
    expect(ecosystem.animals.filter(({ kind }) => kind === 'big-fish')).toHaveLength(1);
    expect(ecosystem.vegetation.some(({ kind }) => kind === 'kelp')).toBe(true);
    expect(ecosystem.animals.every(({ isBaby }) => !isBaby)).toBe(true);
    expect(ecosystem.animals.every(({ hunger }) => hunger === MAX_ANIMAL_HUNGER)).toBe(true);
  });

  it('moves an animal saved inside a generated trunk to nearby safe ground', () => {
    const world = [
      block('tree-ground', 0, 0, 'soil'),
      block('tree-sapling-0', 0, 0, 'wood', 1),
      block('safe-ground', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('sheep', 'sheep-0', 0, 0)],
      nextEntityId: 1,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals[0]).toMatchObject({ x: 1, z: 0 });
  });

  it('lets land animals swim through water to reach food', () => {
    const world = [
      block('start', 0, 0, 'stone'),
      block('water', 1, 0, 'water'),
      block('food', 2, 0, 'grass'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('rabbit', 'rabbit-0')],
      nextEntityId: 1,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals[0]).toMatchObject({ x: 1, z: 0 });
  });

  it('ignites an animal on a burning surface and makes it rush into water', () => {
    const world = [
      { ...block('fire', 0, 0, 'grass'), burning: 1 },
      block('path', 1, 0, 'stone'),
      block('water', 2, 0, 'water'),
    ];
    let ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('sheep', 'sheep-0')],
      nextEntityId: 1,
    };

    ecosystem = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(ecosystem.animals[0]).toMatchObject({ x: 1, z: 0, burning: 1, health: 3 });

    ecosystem = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(ecosystem.animals[0]).toMatchObject({ x: 2, z: 0, health: 2 });
    expect(ecosystem.animals[0].burning).toBeUndefined();
  });

  it('keeps fish in connected water and lets small fish eat kelp', () => {
    const world = [
      block('start-water', 0, 0, 'water'),
      block('land-barrier', 1, 0, 'stone'),
      block('kelp-water', 2, 0, 'water'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'kelp', blockId: 'kelp-water', kind: 'kelp' }],
      animals: [animal('small-fish', 'small-fish-0', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    const blocked = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(blocked.animals[0]).toMatchObject({ x: 0, z: 0, eaten: 0 });

    const connectedWorld = [world[0], block('middle-water', 1, 0, 'water'), world[2]];
    const moved = advanceEcosystem(connectedWorld, ecosystem, () => 1).ecosystem;
    expect(moved.animals[0]).toMatchObject({ x: 1, z: 0 });
    const fed = advanceEcosystem(connectedWorld, moved, () => 1).ecosystem;
    expect(fed.animals[0]).toMatchObject({ x: 2, z: 0 });
    const ate = advanceEcosystem(connectedWorld, fed, () => 1).ecosystem;
    expect(ate.animals[0].eaten).toBe(1);
    expect(ate.vegetation).toEqual([]);
  });

  it('plans through fish traffic, waits at the occupied next cell, then resumes', () => {
    const world = Array.from({ length: 6 }, (_, x) => [
      block(`water-${x}-0`, x, 0, 'water'),
      block(`water-${x}-1`, x, 1, 'water'),
    ]).flat();
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('big-fish', 'big-fish-hunter', 0, 0, { hunger: 40 }),
        animal('big-fish', 'big-fish-traffic-0', 2, 0, { breedingCooldown: 99 }),
        animal('big-fish', 'big-fish-traffic-1', 2, 1, { breedingCooldown: 99 }),
        animal('small-fish', 'small-fish-prey', 5, 0),
      ],
      nextEntityId: 4,
    };

    const approaching = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(approaching.animals.find(({ id }) => id === 'big-fish-hunter'))
      .toMatchObject({ x: 1, z: 0 });

    const waiting = advanceEcosystem(world, approaching, () => 1).ecosystem;
    expect(waiting.animals.find(({ id }) => id === 'big-fish-hunter'))
      .toMatchObject({ x: 1, z: 0 });

    const clearedTraffic = {
      ...waiting,
      animals: waiting.animals.filter(({ id }) => !id.startsWith('big-fish-traffic')),
    };
    const resumed = advanceEcosystem(world, clearedTraffic, () => 1).ecosystem;
    expect(resumed.animals.find(({ id }) => id === 'big-fish-hunter'))
      .toMatchObject({ x: 2, z: 0 });
  });

  it('still treats non-water terrain as a permanent fish barrier', () => {
    const world = Array.from({ length: 6 }, (_, x) => [
      block(`channel-${x}-0`, x, 0, x === 2 ? 'soil' : 'water'),
      block(`channel-${x}-1`, x, 1, x === 2 ? 'soil' : 'water'),
    ]).flat();
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('big-fish', 'big-fish-hunter', 0, 0, { hunger: 40 }),
        animal('small-fish', 'small-fish-prey', 5, 0),
      ],
      nextEntityId: 2,
    };

    const blocked = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(blocked.animals.find(({ id }) => id === 'big-fish-hunter'))
      .toMatchObject({ x: 0, z: 0 });
  });

  it('plans land-animal routes through traffic, waits, then resumes', () => {
    const world = Array.from({ length: 6 }, (_, x) => [
      block(`ground-${x}-0`, x, 0, x === 5 ? 'grass' : 'stone'),
      block(`ground-${x}-1`, x, 1, 'stone'),
    ]).flat();
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('rabbit', 'rabbit-forager', 0, 0, { hunger: 40 }),
        animal('cow', 'cow-traffic', 2, 0, { breedingCooldown: 99 }),
        animal('goat', 'goat-traffic', 2, 1, { breedingCooldown: 99 }),
      ],
      nextEntityId: 3,
    };

    const approaching = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(approaching.animals.find(({ id }) => id === 'rabbit-forager'))
      .toMatchObject({ x: 1, z: 0 });

    const waiting = advanceEcosystem(world, approaching, () => 1).ecosystem;
    expect(waiting.animals.find(({ id }) => id === 'rabbit-forager'))
      .toMatchObject({ x: 1, z: 0 });

    const clearedTraffic = {
      ...waiting,
      animals: waiting.animals.filter(({ id }) => !id.endsWith('-traffic')),
    };
    const resumed = advanceEcosystem(world, clearedTraffic, () => 1).ecosystem;
    expect(resumed.animals.find(({ id }) => id === 'rabbit-forager'))
      .toMatchObject({ x: 2, z: 0 });
  });

  it('still treats an impassable dirt rise as a permanent land-animal barrier', () => {
    const world = Array.from({ length: 6 }, (_, x) => [
      block(
        `ground-${x}-0`,
        x,
        0,
        x === 5 ? 'grass' : x === 2 ? 'soil' : 'stone',
        x === 2 ? 2 : 0,
      ),
      block(`ground-${x}-1`, x, 1, x === 2 ? 'soil' : 'stone', x === 2 ? 2 : 0),
    ]).flat();
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [animal('rabbit', 'rabbit-forager', 0, 0, { hunger: 40 })],
      nextEntityId: 1,
    };

    const blocked = advanceEcosystem(world, ecosystem, () => 1).ecosystem;
    expect(blocked.animals[0]).toMatchObject({ x: 0, z: 0 });
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

    expect(result.ecosystem.animals[0]).toMatchObject({
      x: 1,
      z: 0,
      eaten: 0,
      facingX: 1,
      facingZ: 0,
    });
  });

  it('waits between movement steps according to its species cadence', () => {
    const world = [
      block('stone', 0, 0, 'stone'),
      block('grass', 1, 0, 'grass'),
    ];
    const cow = animal('cow', 'cow-0');
    const waiting = advanceEcosystem(world, {
      ...emptyEcosystem(),
      tick: 1,
      animals: [cow],
      nextEntityId: 1,
    }, () => 1).ecosystem;
    const moving = advanceEcosystem(world, {
      ...waiting,
      tick: 3,
    }, () => 1).ecosystem;

    expect(waiting.animals[0]).toMatchObject({ x: 0, z: 0 });
    expect(moving.animals[0]).toMatchObject({ x: 1, z: 0 });
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

  it.each(ANIMAL_KEYS.filter((kind) => kind !== 'human'))(
    'lets a well-fed pair of %s create a baby',
    (kind) => {
    const habitat: BlockMaterial = kind === 'small-fish' || kind === 'big-fish'
      ? 'water'
      : 'stone';
    const world = [
      block('left', 0, 0, habitat),
      block('middle', 1, 0, habitat),
      block('right', 2, 0, habitat),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal(kind, `${kind}-0`, 0, 0),
        animal(kind, `${kind}-1`, 1, 0),
      ],
      nextEntityId: 2,
    };
    const result = advanceEcosystem(world, ecosystem, () => 1);

    expect(result.ecosystem.animals).toHaveLength(3);
    expect(result.ecosystem.animals.find(({ isBaby }) => isBaby)).toMatchObject({
      id: `${kind}-2`,
      kind,
      x: 2,
      z: 0,
      isBaby: true,
    });
    expect(
      result.ecosystem.animals
        .filter(({ isBaby }) => !isBaby)
        .every(({ hunger }) => hunger <= ANIMAL_BREEDING_MIN_HUNGER),
    ).toBe(true);
    },
  );

  it('does not let newly spawned humans reproduce before maturity', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('human', 'human-0', 0, 0, { tools: [] }),
        animal('human', 'human-1', 1, 0, { tools: [] }),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals).toHaveLength(2);
  });

  it('does not breed a same-species pair without enough hunger', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('cow', 'cow-0', 0, 0, { hunger: ANIMAL_BREEDING_MIN_HUNGER - 1 }),
        animal('cow', 'cow-1', 1, 0, { hunger: ANIMAL_BREEDING_MIN_HUNGER - 1 }),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals).toHaveLength(2);
  });

  it('does not breed animals through a two-level cliff', () => {
    const world = [
      block('low-ground', 0, 0, 'stone'),
      block('high-ground', 1, 0, 'stone', 2),
      block('low-open-cell', -1, 0, 'stone'),
      block('high-open-cell', 2, 0, 'stone', 2),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('cow', 'cow-0', 0, 0),
        animal('cow', 'cow-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(2);
    expect(result.animals.every(({ isBaby }) => !isBaby)).toBe(true);
  });

  it('grows a baby into an adult after its third meal', () => {
    const grassyDirt = block('grass', 0, 0, 'grass');
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      vegetation: [{ id: 'meal', blockId: grassyDirt.id, kind: 'grass' }],
      animals: [animal('rabbit', 'rabbit-0', 0, 0, {
        isBaby: true,
        eaten: BABY_GROWTH_MEALS - 1,
        hunger: 40,
      })],
      nextEntityId: 1,
    };

    const grown = advanceEcosystem([grassyDirt], ecosystem, () => 1).ecosystem.animals[0];

    expect(grown).toMatchObject({ isBaby: false, eaten: 0, hunger: 73 });
    expect(grown.breedingCooldown).toBeGreaterThan(0);
  });

  it('removes an animal when it reaches the end of its lifespan', () => {
    const world = [
      block('left', 0, 0, 'stone'),
      block('right', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('rabbit', 'old-rabbit', 0, 0, { age: ANIMALS.rabbit.lifespan - 1 }),
        animal('cow', 'young-cow', 2, 0),
      ],
      nextEntityId: 2,
    };

    expect(advanceEcosystem(world, ecosystem, () => 1).ecosystem.animals).toMatchObject([
      { id: 'young-cow', age: 1 },
    ]);
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
        animal('cow', 'cow-0', 0, 0),
        animal('goat', 'goat-1', 1, 0),
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
      { id: 'fed-cow', hunger: MAX_ANIMAL_HUNGER - 1 },
    ]);
  });
});

describe('predator hunting', () => {
  it('lets big fish hunt small fish without leaving the water', () => {
    const world = [
      block('big-water', 0, 0, 'water'),
      block('small-water', 1, 0, 'water'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('big-fish', 'big-fish-0', 0, 0, { hunger: 40 }),
        animal('small-fish', 'small-fish-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({ kind: 'big-fish', eaten: 1 });
  });

  it.each(
    LAND_PREDATOR_KEYS.flatMap((predatorKind) =>
      (['small-fish', 'big-fish'] as const).map((fishKind) => [predatorKind, fishKind] as const)),
  )('%s eats %s at the water edge', (predatorKind, fishKind) => {
    const world = [
      block('predator-ground', 0, 0, 'stone'),
      block('fish-water', 1, 0, 'water'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal(predatorKind, `${predatorKind}-0`, 0, 0, { hunger: 40 }),
        animal(fishKind, `${fishKind}-1`, 1, 0, { health: 1 }),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({
      id: `${predatorKind}-0`,
      eaten: 1,
    });
  });

  it('lets a fox swim toward fish farther into the water', () => {
    const world = [
      block('fox-ground', 0, 0, 'stone'),
      block('near-water', 1, 0, 'water'),
      block('fish-water', 2, 0, 'water'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('small-fish', 'small-fish-1', 2, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals.find(({ id }) => id === 'fox-0')).toMatchObject({
      x: 1,
      z: 0,
    });
  });

  it.each(HERBIVORE_KEYS)(
    'recognizes %s as prey',
    (preyKind) => {
      const world = [
        block('fox-cell', 0, 0, 'stone'),
        block('prey-cell', 1, 0, 'stone'),
      ];
      const ecosystem: EcosystemState = {
        ...emptyEcosystem(),
        animals: [
          animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
          animal(preyKind, `${preyKind}-1`, 1, 0, { health: 1 }),
        ],
        nextEntityId: 2,
      };

      const result = advanceEcosystem(world, ecosystem, () => 0).ecosystem;

      expect(result.animals).toHaveLength(1);
      expect(result.animals[0]).toMatchObject({ id: 'fox-0', eaten: 1 });
    },
  );

  it.each([
    ['wolf', 'rabbit'],
    ['bear', 'deer'],
    ['eagle', 'chicken'],
    ['crocodile', 'duck'],
  ] as const)('%s hunts an animal in its prey category', (predatorKind, preyKind) => {
    const world = [
      block('predator-cell', 0, 0, 'stone'),
      block('prey-cell', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal(predatorKind, `${predatorKind}-0`, 0, 0, { hunger: 40 }),
        animal(preyKind, `${preyKind}-1`, 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 0).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({ kind: predatorKind, eaten: 1 });
  });

  it('walks toward the nearest prey and faces its movement direction', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('middle', 1, 0, 'stone'),
      block('sheep-cell', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('sheep', 'sheep-1', 2, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals.find(({ id }) => id === 'fox-0')).toMatchObject({
      x: 1,
      z: 0,
      facingX: 1,
      facingZ: 0,
    });
  });

  it('does not attack prey across a two-level cliff', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('rabbit-cell', 1, 0, 'stone', 2),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('rabbit', 'rabbit-1', 1, 0, { health: 1 }),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(2);
    expect(result.animals.find(({ id }) => id === 'rabbit-1')).toMatchObject({ health: 1 });
    expect(result.animals.find(({ id }) => id === 'fox-0')).toMatchObject({
      x: 0,
      z: 0,
      eaten: 0,
    });
  });

  it('can attack prey across a traversable one-level step', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('rabbit-cell', 1, 0, 'stone', 1),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('rabbit', 'rabbit-1', 1, 0, { health: 1 }),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({ id: 'fox-0', eaten: 1 });
  });

  it('survives multiple counterattacks because it has tank-like health', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('sheep-cell', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('sheep', 'sheep-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 0).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({ id: 'fox-0', health: 11, eaten: 1 });
  });

  it('gives herbivores only a fifteen-percent chance to fight back', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('sheep-cell', 1, 0, 'stone'),
      block('escape-cell', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      tick: 1,
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('sheep', 'sheep-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const fighter = advanceEcosystem(
      world,
      ecosystem,
      (key) => key.startsWith('defend:') ? HERBIVORE_FIGHT_BACK_CHANCE - 0.001 : 1,
    ).ecosystem;
    const runner = advanceEcosystem(
      world,
      ecosystem,
      (key) => key.startsWith('defend:') ? HERBIVORE_FIGHT_BACK_CHANCE : 1,
    ).ecosystem;

    expect(fighter.animals.find(({ id }) => id === 'fox-0')?.health).toBe(11);
    expect(fighter.animals.some(({ id }) => id === 'sheep-1')).toBe(false);
    expect(runner.animals.find(({ id }) => id === 'sheep-1')).toMatchObject({ x: 2, z: 0 });
  });

  it('lets sheep randomly flee to a safe neighboring cell', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('sheep-cell', 1, 0, 'stone'),
      block('escape-cell', 2, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      tick: 1,
      animals: [
        animal('fox', 'fox-0', 0, 0, { hunger: 40 }),
        animal('sheep', 'sheep-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 1).ecosystem;

    expect(result.animals).toHaveLength(2);
    expect(result.animals.find(({ id }) => id === 'sheep-1')).toMatchObject({
      x: 2,
      z: 0,
      facingX: 1,
      facingZ: 0,
    });
  });

  it('lets a fighting sheep defeat a fox that is down to its last health', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('sheep-cell', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0, { health: 1, hunger: 40 }),
        animal('sheep', 'sheep-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 0).ecosystem;

    expect(result.animals).toHaveLength(1);
    expect(result.animals[0]).toMatchObject({ id: 'sheep-1' });
  });

  it('does not let a well-fed predator consume prey', () => {
    const world = [
      block('fox-cell', 0, 0, 'stone'),
      block('rabbit-cell', 1, 0, 'stone'),
    ];
    const ecosystem: EcosystemState = {
      ...emptyEcosystem(),
      animals: [
        animal('fox', 'fox-0', 0, 0),
        animal('rabbit', 'rabbit-1', 1, 0),
      ],
      nextEntityId: 2,
    };

    const result = advanceEcosystem(world, ecosystem, () => 0).ecosystem;

    expect(result.animals).toHaveLength(2);
    expect(result.animals.find(({ id }) => id === 'fox-0')).toMatchObject({
      eaten: 0,
      hunger: 99,
    });
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

  it('rejects malformed short-grass maturation deadlines', () => {
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      vegetation: [{
        id: 'bad-grass',
        blockId: 'grass',
        kind: 'grass',
        maturesAtTick: -1,
      }],
      nextEntityId: 1,
    })).toBe(false);
  });

  it('accepts each supported animal kind', () => {
    const vegetationKinds: VegetationKind[] = [
      'grass', 'flower', 'tall-grass', 'sapling', 'kelp',
    ];
    expect(vegetationKinds).toHaveLength(5);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: ANIMAL_KEYS.map((kind, index) => animal(kind, `${kind}-${index}`, index, 0)),
      nextEntityId: ANIMAL_KEYS.length,
    })).toBe(true);
  });

  it('validates the human one-item hand, equipment, and in-bench crafting state', () => {
    const human = animal('human', 'human-0', 0, 0, {
      heldItem: 'wood',
      tools: ['axe', 'hammer'],
      activeTool: 'axe',
      workbenchId: 'bench-0',
    });
    expect(isValidEcosystem({ ...emptyEcosystem(), animals: [human] })).toBe(true);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: [{ ...human, heldItem: 'stone' }],
    })).toBe(false);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: [{ ...human, crafting: 'planks' }],
    })).toBe(false);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: [{ ...human, activeTool: 'spear' }],
    })).toBe(false);
    expect(isValidEcosystem({
      ...emptyEcosystem(),
      animals: [{ ...animal('sheep', 'sheep-0'), activeTool: 'axe' }],
    })).toBe(false);
  });

  it('upgrades saved animals from before age, health, and facing were added', () => {
    const legacy = createInitialEcosystem(createStarterWorld()) as unknown as {
      animals: Array<Partial<Animal>>;
    } & Omit<EcosystemState, 'animals'>;
    for (const savedAnimal of legacy.animals) {
      delete savedAnimal.age;
      delete savedAnimal.health;
      delete savedAnimal.facingX;
      delete savedAnimal.facingZ;
    }

    expect(isValidEcosystem(legacy)).toBe(false);
    const migrated = migrateEcosystem(legacy);
    expect(isValidEcosystem(migrated)).toBe(true);
    expect(migrated?.animals[0]).toMatchObject({
      age: 0,
      health: 4,
      facingX: 1,
      facingZ: 0,
    });
  });

  it('upgrades first-generation human saves with deterministic genetics', () => {
    const legacyHuman = animal('human', 'human-7', 0, 0, {
      crafting: 'axe',
    });
    delete legacyHuman.traits;
    delete legacyHuman.generation;
    delete legacyHuman.craftingReadyTick;
    const legacy: EcosystemState = {
      ...emptyEcosystem(),
      tick: 12,
      animals: [legacyHuman],
      nextEntityId: 8,
    };

    expect(isValidEcosystem(legacy)).toBe(false);
    const migrated = migrateEcosystem(legacy);
    expect(isValidEcosystem(migrated)).toBe(true);
    expect(migrated?.animals[0]).toMatchObject({
      traits: createFounderHumanTraits('human-7'),
      generation: 0,
      crafting: 'axe',
      craftingReadyTick: 12,
    });
  });
});
