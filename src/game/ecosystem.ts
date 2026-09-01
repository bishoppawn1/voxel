import type { BlockMaterial, VoxelBlock } from './world';

export const ECOSYSTEM_TICK_MS = 900;
export const ANIMAL_BREEDING_MEALS = 3;
export const BABY_GROWTH_MEALS = 3;
export const MAX_ANIMAL_HUNGER = 100;
export const HERBIVORE_FIGHT_BACK_CHANCE = 0.15;

const SOIL_TO_GRASS_CHANCE = 0.012;
const VEGETATION_GROWTH_CHANCE = 0.028;
const MATE_SEARCH_RADIUS = 20;
const BREEDING_COOLDOWN_TICKS = 16;
const HUNGER_LOSS_PER_TICK = 2;
const HUNGER_PER_MEAL = 34;
const MAX_ANIMALS = 500;

const DIRECTIONS = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
] as const;

export type VegetationKind = 'grass' | 'flower' | 'tall-grass';

export type Vegetation = {
  id: string;
  blockId: string;
  kind: VegetationKind;
};

export const HERBIVORE_KEYS = [
  'sheep',
  'cow',
  'pig',
  'rabbit',
  'goat',
  'deer',
  'horse',
  'chicken',
  'duck',
  'turtle',
] as const;
export const PREDATOR_KEYS = ['fox', 'wolf', 'bear', 'eagle', 'crocodile'] as const;
export const ANIMAL_KEYS = [...HERBIVORE_KEYS, ...PREDATOR_KEYS] as const;
export type AnimalKind = (typeof ANIMAL_KEYS)[number];

const HERBIVORE_MATERIALS = ['grass', 'leaves', 'moss'] as const satisfies
  readonly BlockMaterial[];

export const ANIMALS: Record<AnimalKind, {
  label: string;
  emoji: string;
  dietLabel: string;
  vegetation: readonly VegetationKind[];
  materials: readonly BlockMaterial[];
  prey: readonly AnimalKind[];
  predator: boolean;
  moveEveryTicks: number;
  lifespan: number;
  maxHealth: number;
  attackDamage: number;
}> = {
  sheep: {
    label: 'Sheep',
    emoji: '🐑',
    dietLabel: 'grass, grassy dirt, leaves, and moss',
    vegetation: ['grass', 'tall-grass'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 2,
    lifespan: 480,
    maxHealth: 4,
    attackDamage: 1,
  },
  cow: {
    label: 'Cow',
    emoji: '🐄',
    dietLabel: 'tall grass, grassy dirt, leaves, and moss',
    vegetation: ['tall-grass'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 3,
    lifespan: 540,
    maxHealth: 4,
    attackDamage: 1,
  },
  pig: {
    label: 'Pig',
    emoji: '🐖',
    dietLabel: 'flowers, grassy dirt, leaves, and moss',
    vegetation: ['flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 3,
    lifespan: 420,
    maxHealth: 4,
    attackDamage: 1,
  },
  rabbit: {
    label: 'Rabbit',
    emoji: '🐇',
    dietLabel: 'short grass, flowers, grassy dirt, leaves, and moss',
    vegetation: ['grass', 'flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 1,
    lifespan: 300,
    maxHealth: 4,
    attackDamage: 1,
  },
  goat: {
    label: 'Goat',
    emoji: '🐐',
    dietLabel: 'tall grass, flowers, grassy dirt, leaves, and moss',
    vegetation: ['tall-grass', 'flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 2,
    lifespan: 480,
    maxHealth: 4,
    attackDamage: 1,
  },
  deer: {
    label: 'Deer',
    emoji: '🦌',
    dietLabel: 'grass, flowers, grassy dirt, leaves, and moss',
    vegetation: ['grass', 'tall-grass', 'flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 1,
    lifespan: 480,
    maxHealth: 4,
    attackDamage: 1,
  },
  horse: {
    label: 'Horse',
    emoji: '🐎',
    dietLabel: 'grass, tall grass, grassy dirt, leaves, and moss',
    vegetation: ['grass', 'tall-grass'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 1,
    lifespan: 540,
    maxHealth: 4,
    attackDamage: 1,
  },
  chicken: {
    label: 'Chicken',
    emoji: '🐔',
    dietLabel: 'short grass, flowers, leaves, and moss',
    vegetation: ['grass', 'flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 2,
    lifespan: 300,
    maxHealth: 4,
    attackDamage: 1,
  },
  duck: {
    label: 'Duck',
    emoji: '🦆',
    dietLabel: 'grass, flowers, grassy dirt, leaves, and moss',
    vegetation: ['grass', 'flower'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 2,
    lifespan: 330,
    maxHealth: 4,
    attackDamage: 1,
  },
  turtle: {
    label: 'Turtle',
    emoji: '🐢',
    dietLabel: 'short grass, grassy dirt, leaves, and moss',
    vegetation: ['grass'],
    materials: HERBIVORE_MATERIALS,
    prey: [],
    predator: false,
    moveEveryTicks: 4,
    lifespan: 600,
    maxHealth: 6,
    attackDamage: 1,
  },
  fox: {
    label: 'Fox',
    emoji: '🦊',
    dietLabel: 'rabbits, sheep, and other prey animals',
    vegetation: [],
    materials: [],
    prey: HERBIVORE_KEYS,
    predator: true,
    moveEveryTicks: 1,
    lifespan: 360,
    maxHealth: 12,
    attackDamage: 4,
  },
  wolf: {
    label: 'Wolf',
    emoji: '🐺',
    dietLabel: 'rabbits, deer, livestock, and other prey animals',
    vegetation: [],
    materials: [],
    prey: HERBIVORE_KEYS,
    predator: true,
    moveEveryTicks: 1,
    lifespan: 420,
    maxHealth: 14,
    attackDamage: 5,
  },
  bear: {
    label: 'Bear',
    emoji: '🐻',
    dietLabel: 'deer, livestock, birds, and other prey animals',
    vegetation: [],
    materials: [],
    prey: HERBIVORE_KEYS,
    predator: true,
    moveEveryTicks: 2,
    lifespan: 540,
    maxHealth: 20,
    attackDamage: 6,
  },
  eagle: {
    label: 'Eagle',
    emoji: '🦅',
    dietLabel: 'rabbits, chickens, and ducks',
    vegetation: [],
    materials: [],
    prey: ['rabbit', 'chicken', 'duck'],
    predator: true,
    moveEveryTicks: 1,
    lifespan: 360,
    maxHealth: 10,
    attackDamage: 4,
  },
  crocodile: {
    label: 'Crocodile',
    emoji: '🐊',
    dietLabel: 'livestock, birds, turtles, and other prey animals',
    vegetation: [],
    materials: [],
    prey: HERBIVORE_KEYS,
    predator: true,
    moveEveryTicks: 2,
    lifespan: 600,
    maxHealth: 20,
    attackDamage: 6,
  },
};

export type Animal = {
  id: string;
  kind: AnimalKind;
  x: number;
  z: number;
  eaten: number;
  hunger: number;
  isBaby: boolean;
  breedingCooldown: number;
  age: number;
  health: number;
  facingX: number;
  facingZ: number;
};

export type EcosystemState = {
  tick: number;
  vegetation: Vegetation[];
  animals: Animal[];
  nextEntityId: number;
};

type RandomSource = (key: string) => number;
type Position = Pick<Animal, 'x' | 'z'>;

const columnKey = (x: number, z: number) => `${x},${z}`;
const distance = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

function hashString(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicRandom(key: string) {
  return hashString(key) / 4294967296;
}

export function animalMovesOnTick(animal: Pick<Animal, 'id' | 'kind'>, tick: number) {
  const interval = ANIMALS[animal.kind].moveEveryTicks;
  return interval === 1 || tick % interval === hashString(animal.id) % interval;
}

export function createSurfaceIndex(blocks: VoxelBlock[]) {
  const surfaces = new Map<string, VoxelBlock>();
  for (const block of blocks) {
    const key = columnKey(block.x, block.z);
    const current = surfaces.get(key);
    if (!current || block.y > current.y) surfaces.set(key, block);
  }
  return surfaces;
}

export function getSurfaceBlock(blocks: VoxelBlock[], x: number, z: number) {
  return createSurfaceIndex(blocks).get(columnKey(x, z));
}

export function convertCoveredGrassToSoil(blocks: VoxelBlock[]) {
  const cells = new Set(blocks.map((block) => `${block.x},${block.y},${block.z}`));
  let changed = false;
  const converted = blocks.map((block) => {
    if (
      block.material === 'grass' &&
      cells.has(`${block.x},${block.y + 1},${block.z}`)
    ) {
      changed = true;
      const covered = { ...block, material: 'soil' as const };
      delete covered.burning;
      return covered;
    }
    return block;
  });
  return changed ? converted : blocks;
}

function createAnimal(kind: AnimalKind, idNumber: number, position: Position): Animal {
  return {
    id: `${kind}-${idNumber}`,
    kind,
    ...position,
    eaten: 0,
    hunger: MAX_ANIMAL_HUNGER,
    isBaby: false,
    breedingCooldown: 0,
    age: 0,
    health: ANIMALS[kind].maxHealth,
    facingX: 1,
    facingZ: 0,
  };
}

export function createInitialEcosystem(blocks: VoxelBlock[]): EcosystemState {
  const grassSurfaces = [...createSurfaceIndex(blocks).values()]
    .filter(({ material }) => material === 'grass')
    .sort((a, b) => a.x - b.x || a.z - b.z || a.id.localeCompare(b.id));
  const startingSurfaces = grassSurfaces.length > 1
    ? [grassSurfaces[0], grassSurfaces.at(-1)!]
    : grassSurfaces;

  return {
    tick: 0,
    vegetation: [],
    animals: startingSurfaces.map((block, index) =>
      createAnimal('sheep', index, { x: block.x, z: block.z })),
    nextEntityId: startingSurfaces.length,
  };
}

export function spawnAnimal(
  blocks: VoxelBlock[],
  state: EcosystemState,
  kind: AnimalKind,
  x: number,
  z: number,
) {
  const surface = getSurfaceBlock(blocks, x, z);
  if (
    state.animals.length >= MAX_ANIMALS ||
    !surface ||
    surface.burning ||
    state.animals.some((animal) => animal.x === x && animal.z === z)
  ) {
    return state;
  }

  return {
    ...state,
    animals: [...state.animals, createAnimal(kind, state.nextEntityId, { x, z })],
    nextEntityId: state.nextEntityId + 1,
  };
}

function chooseVegetation(value: number): VegetationKind {
  if (value < 0.5) return 'grass';
  if (value < 0.78) return 'tall-grass';
  return 'flower';
}

function withMovementFacing(animal: Animal, position: Position): Animal {
  const xMovement = position.x - animal.x;
  const zMovement = position.z - animal.z;
  if (xMovement === 0 && zMovement === 0) return animal;
  return {
    ...animal,
    ...position,
    facingX: Math.sign(xMovement),
    facingZ: Math.sign(zMovement),
  };
}

function faceToward(animal: Animal, target: Position): Animal {
  const xDistance = target.x - animal.x;
  const zDistance = target.z - animal.z;
  if (xDistance === 0 && zDistance === 0) return animal;
  return {
    ...animal,
    facingX: Math.abs(xDistance) >= Math.abs(zDistance) ? Math.sign(xDistance) : 0,
    facingZ: Math.abs(zDistance) > Math.abs(xDistance) ? Math.sign(zDistance) : 0,
  };
}

function moveTowardGoal(
  animal: Animal,
  isGoal: (position: Position) => boolean,
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
) {
  if (isGoal(animal)) return animal;
  const startKey = columnKey(animal.x, animal.z);
  if (!surfaces.has(startKey)) return animal;

  const visited = new Set([startKey]);
  const queue: Array<Position & { firstStep?: Position }> = [{ x: animal.x, z: animal.z }];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentSurface = surfaces.get(columnKey(current.x, current.z))!;
    for (const direction of DIRECTIONS) {
      const next = { x: current.x + direction.x, z: current.z + direction.z };
      const key = columnKey(next.x, next.z);
      const nextSurface = surfaces.get(key);
      if (
        visited.has(key) ||
        occupied.has(key) ||
        !nextSurface ||
        Math.abs(nextSurface.y - currentSurface.y) > 1
      ) {
        continue;
      }
      visited.add(key);
      const firstStep = current.firstStep ?? next;
      if (isGoal(next)) return withMovementFacing(animal, firstStep);
      queue.push({ ...next, firstStep });
    }
  }

  return animal;
}

function moveToward(
  animal: Animal,
  target: Position,
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
  stopDistance = 0,
) {
  return moveTowardGoal(
    animal,
    (position) => distance(position, target) <= stopDistance,
    surfaces,
    occupied,
  );
}

function moveTowardNearestFood(
  animal: Animal,
  targetKeys: ReadonlySet<string>,
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
) {
  if (!targetKeys.size) return animal;
  return moveTowardGoal(
    animal,
    ({ x, z }) => targetKeys.has(columnKey(x, z)),
    surfaces,
    occupied,
  );
}

function fleeFrom(
  animal: Animal,
  predator: Animal,
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
) {
  const currentSurface = surfaces.get(columnKey(animal.x, animal.z));
  if (!currentSurface) return animal;
  const currentDistance = distance(animal, predator);
  const escape = DIRECTIONS
    .map(({ x, z }, order) => ({ x: animal.x + x, z: animal.z + z, order }))
    .filter((position) => {
      const surface = surfaces.get(columnKey(position.x, position.z));
      return Boolean(
        surface &&
        !surface.burning &&
        !occupied.has(columnKey(position.x, position.z)) &&
        Math.abs(surface.y - currentSurface.y) <= 1 &&
        distance(position, predator) > currentDistance,
      );
    })
    .sort(
      (a, b) =>
        distance(b, predator) - distance(a, predator) ||
        a.order - b.order,
    )[0];
  return escape ? withMovementFacing(animal, escape) : animal;
}

function findBabyCell(
  parents: [Animal, Animal],
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
) {
  for (const parent of parents) {
    for (const direction of DIRECTIONS) {
      const cell = { x: parent.x + direction.x, z: parent.z + direction.z };
      if (surfaces.has(columnKey(cell.x, cell.z)) && !occupied.has(columnKey(cell.x, cell.z))) {
        return cell;
      }
    }
  }
  return undefined;
}

function vegetationIsEdible(animal: Animal, kind: VegetationKind) {
  return ANIMALS[animal.kind].vegetation.includes(kind);
}

function materialIsEdible(animal: Animal, material: BlockMaterial) {
  return ANIMALS[animal.kind].materials.includes(material);
}

export function advanceEcosystem(
  blocks: VoxelBlock[],
  state: EcosystemState,
  random: RandomSource = deterministicRandom,
) {
  const tick = state.tick + 1;
  let nextEntityId = state.nextEntityId;
  const surfaces = createSurfaceIndex(blocks);
  const surfaceIds = new Set([...surfaces.values()].map(({ id }) => id));
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const materialChanges = new Map<string, BlockMaterial>();
  const consumedBlockIds = new Set<string>();
  const convertedToGrass = new Set<string>();

  let vegetation = state.vegetation.filter((growth) => {
    const block = blocksById.get(growth.blockId);
    return block?.material === 'grass' && !block.burning && surfaceIds.has(block.id);
  });

  for (const block of surfaces.values()) {
    if (
      block.material === 'soil' &&
      random(`soil:${tick}:${block.id}`) < SOIL_TO_GRASS_CHANCE
    ) {
      materialChanges.set(block.id, 'grass');
      convertedToGrass.add(block.id);
    }
  }

  const vegetationBlockIds = new Set(vegetation.map(({ blockId }) => blockId));
  for (const block of surfaces.values()) {
    const material = materialChanges.get(block.id) ?? block.material;
    if (
      material !== 'grass' ||
      block.burning ||
      convertedToGrass.has(block.id) ||
      vegetationBlockIds.has(block.id) ||
      random(`sprout:${tick}:${block.id}`) >= VEGETATION_GROWTH_CHANCE
    ) {
      continue;
    }
    vegetation.push({
      id: `growth-${nextEntityId++}`,
      blockId: block.id,
      kind: chooseVegetation(random(`sprout-kind:${tick}:${block.id}`)),
    });
    vegetationBlockIds.add(block.id);
  }

  const availableSurfaces = [...surfaces.values()];
  let animals = state.animals.flatMap((animal) => {
    const age = animal.age + 1;
    if (age >= ANIMALS[animal.kind].lifespan) return [];
    const hunger = animal.hunger - HUNGER_LOSS_PER_TICK;
    if (hunger <= 0) return [];
    if (surfaces.has(columnKey(animal.x, animal.z))) {
      return [{
        ...animal,
        age,
        hunger,
        breedingCooldown: Math.max(0, animal.breedingCooldown - 1),
      }];
    }
    const nearest = availableSurfaces
      .slice()
      .sort(
        (a, b) =>
          distance(animal, a) - distance(animal, b) ||
          a.x - b.x ||
          a.z - b.z,
      )[0];
    return nearest
      ? [{
          ...withMovementFacing(animal, nearest),
          age,
          hunger,
          breedingCooldown: 0,
        }]
      : [];
  });

  const ateThisTick = new Set<string>();
  for (const animal of animals) {
    const surface = surfaces.get(columnKey(animal.x, animal.z));
    if (!surface || surface.burning) continue;
    const growthIndex = vegetation.findIndex(
      (growth) => growth.blockId === surface.id && vegetationIsEdible(animal, growth.kind),
    );
    if (growthIndex >= 0) {
      vegetation = vegetation.filter((_, index) => index !== growthIndex);
      animal.eaten += 1;
      animal.hunger = Math.min(MAX_ANIMAL_HUNGER, animal.hunger + HUNGER_PER_MEAL);
      ateThisTick.add(animal.id);
      continue;
    }
    const material = materialChanges.get(surface.id) ?? surface.material;
    if (materialIsEdible(animal, material)) {
      if (material === 'grass' || material === 'moss') {
        materialChanges.set(surface.id, 'soil');
      } else if (material === 'leaves') {
        consumedBlockIds.add(surface.id);
      }
      animal.eaten += 1;
      animal.hunger = Math.min(MAX_ANIMAL_HUNGER, animal.hunger + HUNGER_PER_MEAL);
      ateThisTick.add(animal.id);
    }
  }

  animals = animals.map((animal) =>
    animal.isBaby && animal.eaten >= BABY_GROWTH_MEALS
      ? {
          ...animal,
          eaten: 0,
          isBaby: false,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        }
      : animal,
  );

  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const occupied = new Set(animals.map(({ x, z }) => columnKey(x, z)));
  const actedThisTick = new Set<string>();

  const predators = [...animalsById.values()]
    .filter((animal) => ANIMALS[animal.kind].predator)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const originalPredator of predators) {
    let predator = animalsById.get(originalPredator.id);
    if (!predator) continue;
    const preyKinds = ANIMALS[predator.kind].prey;
    const prey = [...animalsById.values()]
      .filter((animal) => preyKinds.includes(animal.kind))
      .sort(
        (a, b) =>
          distance(predator!, a) - distance(predator!, b) ||
          a.id.localeCompare(b.id),
      )[0];
    if (!prey) continue;

    actedThisTick.add(predator.id);
    if (distance(predator, prey) > 1) {
      if (!animalMovesOnTick(predator, tick)) continue;
      occupied.delete(columnKey(predator.x, predator.z));
      const moved = moveToward(predator, prey, surfaces, occupied, 1);
      animalsById.set(predator.id, moved);
      occupied.add(columnKey(moved.x, moved.z));
      continue;
    }

    predator = faceToward(predator, prey);
    const defendingPrey = faceToward(prey, predator);
    animalsById.set(predator.id, predator);
    animalsById.set(defendingPrey.id, defendingPrey);
    actedThisTick.add(defendingPrey.id);

    const fightsBack =
      random(`defend:${tick}:${predator.id}:${defendingPrey.id}`) <
      HERBIVORE_FIGHT_BACK_CHANCE;
    if (!fightsBack) {
      occupied.delete(columnKey(defendingPrey.x, defendingPrey.z));
      const escaped = animalMovesOnTick(defendingPrey, tick)
        ? fleeFrom(defendingPrey, predator, surfaces, occupied)
        : defendingPrey;
      animalsById.set(escaped.id, escaped);
      occupied.add(columnKey(escaped.x, escaped.z));
      if (escaped.x !== defendingPrey.x || escaped.z !== defendingPrey.z) continue;
    } else {
      predator = {
        ...predator,
        health: predator.health - ANIMALS[defendingPrey.kind].attackDamage,
      };
      if (predator.health <= 0) {
        animalsById.delete(predator.id);
        occupied.delete(columnKey(predator.x, predator.z));
        continue;
      }
      animalsById.set(predator.id, predator);
    }

    const attackedPrey = {
      ...defendingPrey,
      health: defendingPrey.health - ANIMALS[predator.kind].attackDamage,
    };
    if (attackedPrey.health > 0) {
      animalsById.set(attackedPrey.id, attackedPrey);
      continue;
    }

    animalsById.delete(defendingPrey.id);
    occupied.delete(columnKey(defendingPrey.x, defendingPrey.z));
    animalsById.set(predator.id, {
      ...predator,
      eaten: predator.eaten + 1,
      hunger: Math.min(MAX_ANIMAL_HUNGER, predator.hunger + HUNGER_PER_MEAL),
    });
  }

  const paired = new Set<string>();
  const eligible = [...animalsById.values()]
    .filter(
      (animal) =>
        !ANIMALS[animal.kind].predator &&
        !actedThisTick.has(animal.id) &&
        !animal.isBaby &&
        animal.eaten >= ANIMAL_BREEDING_MEALS &&
        animal.breedingCooldown === 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const first of eligible) {
    if (paired.has(first.id)) continue;
    const currentFirst = animalsById.get(first.id)!;
    const partner = eligible
      .filter(
        (candidate) =>
          candidate.kind === currentFirst.kind &&
          candidate.id !== first.id &&
          !paired.has(candidate.id) &&
          distance(currentFirst, candidate) <= MATE_SEARCH_RADIUS,
      )
      .sort(
        (a, b) =>
          distance(currentFirst, a) - distance(currentFirst, b) ||
          a.id.localeCompare(b.id),
      )[0];
    if (!partner) continue;

    paired.add(first.id);
    paired.add(partner.id);
    let currentPartner = animalsById.get(partner.id)!;

    if (distance(currentFirst, currentPartner) <= 1) {
      const babyCell = findBabyCell([currentFirst, currentPartner], surfaces, occupied);
      if (babyCell) {
        animalsById.set(first.id, {
          ...currentFirst,
          eaten: 0,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        });
        animalsById.set(partner.id, {
          ...currentPartner,
          eaten: 0,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        });
        const baby: Animal = {
          id: `${currentFirst.kind}-${nextEntityId++}`,
          kind: currentFirst.kind,
          ...babyCell,
          eaten: 0,
          hunger: Math.round(MAX_ANIMAL_HUNGER * 0.7),
          isBaby: true,
          breedingCooldown: 0,
          age: 0,
          health: ANIMALS[currentFirst.kind].maxHealth,
          facingX: currentFirst.facingX,
          facingZ: currentFirst.facingZ,
        };
        animalsById.set(baby.id, baby);
        occupied.add(columnKey(baby.x, baby.z));
      }
      continue;
    }

    occupied.delete(columnKey(currentFirst.x, currentFirst.z));
    const movedFirst = animalMovesOnTick(currentFirst, tick)
      ? moveToward(currentFirst, currentPartner, surfaces, occupied, 1)
      : currentFirst;
    animalsById.set(first.id, movedFirst);
    occupied.add(columnKey(movedFirst.x, movedFirst.z));

    currentPartner = animalsById.get(partner.id)!;
    occupied.delete(columnKey(currentPartner.x, currentPartner.z));
    const movedPartner = animalMovesOnTick(currentPartner, tick)
      ? moveToward(currentPartner, movedFirst, surfaces, occupied, 1)
      : currentPartner;
    animalsById.set(partner.id, movedPartner);
    occupied.add(columnKey(movedPartner.x, movedPartner.z));
  }

  const growthByBlockId = new Map(vegetation.map((growth) => [growth.blockId, growth]));
  const foodTargetsByKind = new Map<AnimalKind, ReadonlySet<string>>();
  const foodTargetsFor = (animal: Animal) => {
    const cached = foodTargetsByKind.get(animal.kind);
    if (cached) return cached;
    const targetKeys = new Set<string>();
    for (const block of surfaces.values()) {
      if (block.burning || consumedBlockIds.has(block.id)) continue;
      const growth = growthByBlockId.get(block.id);
      const material = materialChanges.get(block.id) ?? block.material;
      if (
        (growth && vegetationIsEdible(animal, growth.kind)) ||
        materialIsEdible(animal, material)
      ) {
        targetKeys.add(columnKey(block.x, block.z));
      }
    }
    foodTargetsByKind.set(animal.kind, targetKeys);
    return targetKeys;
  };
  for (const animal of animalsById.values()) {
    if (
      ANIMALS[animal.kind].predator ||
      paired.has(animal.id) ||
      ateThisTick.has(animal.id) ||
      actedThisTick.has(animal.id) ||
      !animalMovesOnTick(animal, tick)
    ) {
      continue;
    }
    occupied.delete(columnKey(animal.x, animal.z));
    const moved = moveTowardNearestFood(animal, foodTargetsFor(animal), surfaces, occupied);
    animalsById.set(animal.id, moved);
    occupied.add(columnKey(moved.x, moved.z));
  }

  animals = [...animalsById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const survivingBlocks = consumedBlockIds.size
    ? blocks.filter((block) => !consumedBlockIds.has(block.id))
    : blocks;
  const nextBlocks = materialChanges.size
    ? survivingBlocks.map((block) => {
        const material = materialChanges.get(block.id);
        return material ? { ...block, material } : block;
      })
    : survivingBlocks;

  return {
    blocks: nextBlocks,
    ecosystem: {
      tick,
      vegetation,
      animals,
      nextEntityId,
    } satisfies EcosystemState,
  };
}

export function isValidEcosystem(value: unknown): value is EcosystemState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<EcosystemState>;
  if (
    !Number.isInteger(state.tick) ||
    (state.tick ?? -1) < 0 ||
    !Number.isInteger(state.nextEntityId) ||
    (state.nextEntityId ?? -1) < 0 ||
    !Array.isArray(state.vegetation) ||
    !Array.isArray(state.animals) ||
    state.vegetation.length > 5000 ||
    state.animals.length > MAX_ANIMALS
  ) {
    return false;
  }

  const entityIds = new Set<string>();
  const vegetationValid = state.vegetation.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const growth = item as Partial<Vegetation>;
    if (
      typeof growth.id !== 'string' ||
      typeof growth.blockId !== 'string' ||
      !['grass', 'flower', 'tall-grass'].includes(growth.kind ?? '') ||
      entityIds.has(growth.id)
    ) {
      return false;
    }
    entityIds.add(growth.id);
    return true;
  });

  const animalsValid = state.animals.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const animal = item as Partial<Animal>;
    const definition = ANIMALS[animal.kind as AnimalKind];
    if (
      typeof animal.id !== 'string' ||
      !definition ||
      !Number.isInteger(animal.x) ||
      !Number.isInteger(animal.z) ||
      !Number.isInteger(animal.eaten) ||
      (animal.eaten ?? -1) < 0 ||
      !Number.isInteger(animal.hunger) ||
      (animal.hunger ?? -1) < 1 ||
      (animal.hunger ?? MAX_ANIMAL_HUNGER + 1) > MAX_ANIMAL_HUNGER ||
      typeof animal.isBaby !== 'boolean' ||
      !Number.isInteger(animal.breedingCooldown) ||
      (animal.breedingCooldown ?? -1) < 0 ||
      !Number.isInteger(animal.age) ||
      (animal.age ?? -1) < 0 ||
      (animal.age ?? Number.POSITIVE_INFINITY) >= definition.lifespan ||
      !Number.isInteger(animal.health) ||
      (animal.health ?? 0) < 1 ||
      (animal.health ?? Number.POSITIVE_INFINITY) > definition.maxHealth ||
      !Number.isInteger(animal.facingX) ||
      !Number.isInteger(animal.facingZ) ||
      Math.abs(animal.facingX ?? 0) + Math.abs(animal.facingZ ?? 0) !== 1 ||
      entityIds.has(animal.id)
    ) {
      return false;
    }
    entityIds.add(animal.id);
    return true;
  });

  return vegetationValid && animalsValid;
}

export function migrateEcosystem(value: unknown): EcosystemState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const state = value as Partial<EcosystemState>;
  if (!Array.isArray(state.animals)) return undefined;
  const animals = state.animals.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const animal = item as Partial<Animal>;
    const definition = ANIMALS[animal.kind as AnimalKind];
    return {
      ...animal,
      age: Number.isInteger(animal.age) ? animal.age : 0,
      health: Number.isInteger(animal.health)
        ? animal.health
        : definition?.maxHealth ?? 1,
      facingX: Number.isInteger(animal.facingX) ? animal.facingX : 1,
      facingZ: Number.isInteger(animal.facingZ) ? animal.facingZ : 0,
    };
  });
  const migrated = { ...state, animals };
  return isValidEcosystem(migrated) ? migrated : undefined;
}
