import {
  MAX_WORLD_BLOCKS,
  cellKey,
  isInWorld,
  type BlockMaterial,
  type Cell,
  type VoxelBlock,
} from './world';

export const ECOSYSTEM_TICK_MS = 900;
export const ANIMAL_BREEDING_MIN_HUNGER = 70;
export const BABY_GROWTH_MEALS = 3;
export const MAX_ANIMAL_HUNGER = 100;
export const HERBIVORE_FIGHT_BACK_CHANCE = 0.15;
export const SHORT_GRASS_MATURATION_TICKS = 18;
export const SAPLING_MATURATION_TICKS = 28;

const SOIL_TO_GRASS_CHANCE = 0.012;
const VEGETATION_GROWTH_CHANCE = 0.028;
const KELP_GROWTH_CHANCE = 0.036;
const MATE_SEARCH_RADIUS = 20;
const BREEDING_COOLDOWN_TICKS = 16;
const BREEDING_HUNGER_COST = 30;
const HUNGER_PER_MEAL = 34;
const MAX_ANIMALS = 500;
export const ANIMAL_FEED_THRESHOLD = MAX_ANIMAL_HUNGER - HUNGER_PER_MEAL;
const ANIMAL_FIRE_DAMAGE = 1;
const HUMAN_TOOL_CRAFT_ORDER = ['axe', 'hammer', 'spear'] as const;
export const HUMAN_MAX_POPULATION = 40;
export const HUMAN_REPRODUCTION_MIN_HUNGER = 78;
export const HUMAN_CHILDHOOD_TICKS = 30;
const HUMAN_REPRODUCTION_HUNGER_COST = 35;
const HUMAN_REPRODUCTION_COOLDOWN_TICKS = 28;
const HUMAN_REPRODUCTION_AGE = 24;
const HUMAN_MUTATION_RANGE = 8;

const DIRECTIONS = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
] as const;

const HUMAN_HOUSE_BLUEPRINT = [
  { x: -1, y: 0, z: -1 },
  { x: -1, y: 0, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 1, y: 0, z: -1 },
  { x: 1, y: 0, z: 0 },
  { x: 1, y: 0, z: 1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: 1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: 1, y: 1, z: 1 },
  { x: 0, y: 2, z: 0 },
  { x: -1, y: 2, z: 0 },
  { x: 1, y: 2, z: 0 },
  { x: 0, y: 2, z: -1 },
  { x: 0, y: 2, z: 1 },
] as const;

export type VegetationKind = 'grass' | 'flower' | 'tall-grass' | 'sapling' | 'kelp';

export type Vegetation = {
  id: string;
  blockId: string;
  kind: VegetationKind;
  maturesAtTick?: number;
};

type TreeCell = Cell & { material: 'wood' | 'leaves' };

const treeTrunk = (height: number): TreeCell[] =>
  Array.from({ length: height }, (_, index) => ({
    x: 0,
    y: index + 1,
    z: 0,
    material: 'wood',
  }));

const treeRing = (y: number): TreeCell[] =>
  [-1, 0, 1].flatMap((x) =>
    [-1, 0, 1]
      .filter((z) => x !== 0 || z !== 0)
      .map((z) => ({ x, y, z, material: 'leaves' as const })));

const TREE_PATTERNS: readonly (readonly TreeCell[])[] = [
  [
    ...treeTrunk(8),
    ...treeRing(7),
    ...treeRing(8),
    { x: 0, y: 9, z: 0, material: 'leaves' },
    { x: 1, y: 9, z: 0, material: 'leaves' },
    { x: -1, y: 9, z: 0, material: 'leaves' },
    { x: 0, y: 9, z: 1, material: 'leaves' },
    { x: 0, y: 9, z: -1, material: 'leaves' },
  ],
  [
    ...treeTrunk(10),
    { x: 1, y: 7, z: 0, material: 'wood' },
    { x: -1, y: 8, z: 0, material: 'wood' },
    { x: 0, y: 7, z: 1, material: 'wood' },
    { x: 2, y: 7, z: 0, material: 'leaves' },
    { x: 1, y: 7, z: -1, material: 'leaves' },
    { x: 1, y: 8, z: 0, material: 'leaves' },
    { x: -2, y: 8, z: 0, material: 'leaves' },
    { x: -1, y: 8, z: 1, material: 'leaves' },
    { x: -1, y: 8, z: -1, material: 'leaves' },
    { x: 0, y: 7, z: 2, material: 'leaves' },
    { x: 1, y: 7, z: 1, material: 'leaves' },
    { x: -1, y: 7, z: 1, material: 'leaves' },
    { x: 1, y: 10, z: 0, material: 'leaves' },
    { x: -1, y: 10, z: 0, material: 'leaves' },
    { x: 0, y: 10, z: 1, material: 'leaves' },
    { x: 0, y: 10, z: -1, material: 'leaves' },
    { x: 0, y: 11, z: 0, material: 'leaves' },
  ],
  [
    ...treeTrunk(12),
    ...treeRing(8),
    ...treeRing(9),
    ...treeRing(10),
    { x: 1, y: 11, z: 0, material: 'leaves' },
    { x: -1, y: 11, z: 0, material: 'leaves' },
    { x: 0, y: 11, z: 1, material: 'leaves' },
    { x: 0, y: 11, z: -1, material: 'leaves' },
    { x: 1, y: 12, z: 0, material: 'leaves' },
    { x: -1, y: 12, z: 0, material: 'leaves' },
    { x: 0, y: 12, z: 1, material: 'leaves' },
    { x: 0, y: 12, z: -1, material: 'leaves' },
    { x: 0, y: 13, z: 0, material: 'leaves' },
  ],
] as const;

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
  'beaver',
] as const;
const LAND_PREDATOR_KEYS = ['fox', 'wolf', 'bear', 'eagle', 'crocodile'] as const;
export const AQUATIC_KEYS = ['small-fish', 'big-fish'] as const;
export const PREDATOR_KEYS = [...LAND_PREDATOR_KEYS, 'big-fish'] as const;
export const HUMAN_KEYS = ['human'] as const;
export const ANIMAL_KEYS = [
  ...HERBIVORE_KEYS,
  ...LAND_PREDATOR_KEYS,
  ...AQUATIC_KEYS,
  ...HUMAN_KEYS,
] as const;
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
  hungerLossEveryTicks?: number;
  eatEveryTicks?: number;
  canBreed?: boolean;
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
  beaver: {
    label: 'Beaver',
    emoji: '🦫',
    dietLabel: 'tree saplings and exposed tree wood',
    vegetation: ['sapling'],
    materials: ['wood'],
    prey: [],
    predator: false,
    moveEveryTicks: 3,
    lifespan: 540,
    maxHealth: 6,
    attackDamage: 1,
    hungerLossEveryTicks: 4,
    eatEveryTicks: 8,
  },
  fox: {
    label: 'Fox',
    emoji: '🦊',
    dietLabel: 'fish, rabbits, sheep, and other prey animals',
    vegetation: [],
    materials: [],
    prey: [...HERBIVORE_KEYS, ...AQUATIC_KEYS],
    predator: true,
    moveEveryTicks: 1,
    lifespan: 360,
    maxHealth: 12,
    attackDamage: 4,
  },
  wolf: {
    label: 'Wolf',
    emoji: '🐺',
    dietLabel: 'fish, rabbits, deer, livestock, and other prey animals',
    vegetation: [],
    materials: [],
    prey: [...HERBIVORE_KEYS, ...AQUATIC_KEYS, 'human'],
    predator: true,
    moveEveryTicks: 1,
    lifespan: 420,
    maxHealth: 14,
    attackDamage: 5,
  },
  bear: {
    label: 'Bear',
    emoji: '🐻',
    dietLabel: 'fish, deer, livestock, birds, and other prey animals',
    vegetation: [],
    materials: [],
    prey: [...HERBIVORE_KEYS, ...AQUATIC_KEYS, 'human'],
    predator: true,
    moveEveryTicks: 2,
    lifespan: 540,
    maxHealth: 20,
    attackDamage: 6,
  },
  eagle: {
    label: 'Eagle',
    emoji: '🦅',
    dietLabel: 'fish, rabbits, chickens, and ducks',
    vegetation: [],
    materials: [],
    prey: ['rabbit', 'chicken', 'duck', ...AQUATIC_KEYS],
    predator: true,
    moveEveryTicks: 1,
    lifespan: 360,
    maxHealth: 10,
    attackDamage: 4,
  },
  crocodile: {
    label: 'Crocodile',
    emoji: '🐊',
    dietLabel: 'fish, livestock, birds, turtles, and other prey animals',
    vegetation: [],
    materials: [],
    prey: [...HERBIVORE_KEYS, ...AQUATIC_KEYS, 'human'],
    predator: true,
    moveEveryTicks: 2,
    lifespan: 600,
    maxHealth: 20,
    attackDamage: 6,
  },
  'small-fish': {
    label: 'Small Fish',
    emoji: '🐟',
    dietLabel: 'kelp',
    vegetation: ['kelp'],
    materials: [],
    prey: [],
    predator: false,
    moveEveryTicks: 1,
    lifespan: 300,
    maxHealth: 3,
    attackDamage: 1,
  },
  'big-fish': {
    label: 'Big Fish',
    emoji: '🐠',
    dietLabel: 'small fish',
    vegetation: [],
    materials: [],
    prey: ['small-fish'],
    predator: true,
    moveEveryTicks: 2,
    lifespan: 420,
    maxHealth: 8,
    attackDamage: 3,
  },
  human: {
    label: 'Human',
    emoji: '🧑',
    dietLabel: 'animals hunted with a crafted spear',
    vegetation: [],
    materials: [],
    prey: [...HERBIVORE_KEYS, ...LAND_PREDATOR_KEYS],
    predator: false,
    moveEveryTicks: 1,
    lifespan: 720,
    maxHealth: 10,
    attackDamage: 2,
    canBreed: false,
  },
};

export const HUMAN_TOOL_KEYS = ['axe', 'hammer', 'spear'] as const;
export type HumanTool = (typeof HUMAN_TOOL_KEYS)[number];
export type HumanHeldItem = 'wood' | 'planks';
export type HumanCraft = HumanTool | 'planks';
export const HUMAN_TRAIT_KEYS = [
  'aggression',
  'caution',
  'exploration',
  'gathering',
  'craftsmanship',
  'efficiency',
] as const;
export type HumanTraitKey = (typeof HUMAN_TRAIT_KEYS)[number];
export type HumanTraits = Record<HumanTraitKey, number>;
export const HUMAN_TRAITS: Record<HumanTraitKey, { label: string; low: string; high: string }> = {
  aggression: { label: 'Aggression', low: 'patient hunter', high: 'hunts early' },
  caution: { label: 'Caution', low: 'takes risks', high: 'avoids danger' },
  exploration: { label: 'Exploration', low: 'stays nearby', high: 'searches far' },
  gathering: { label: 'Gathering', low: 'slow logger', high: 'fast logger' },
  craftsmanship: { label: 'Craftsmanship', low: 'slow crafter', high: 'fast crafter' },
  efficiency: { label: 'Efficiency', low: 'gets hungry fast', high: 'needs less food' },
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
  burning?: number;
  heldItem?: HumanHeldItem;
  tools?: HumanTool[];
  workbenchId?: string;
  crafting?: HumanCraft;
  craftingReadyTick?: number;
  traits?: HumanTraits;
  generation?: number;
  parentIds?: [string, string];
};

export type EcosystemState = {
  tick: number;
  vegetation: Vegetation[];
  animals: Animal[];
  nextEntityId: number;
};

export type RandomSource = (key: string) => number;
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

function clampTrait(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createFounderHumanTraits(seed: string): HumanTraits {
  return Object.fromEntries(HUMAN_TRAIT_KEYS.map((trait) => [
    trait,
    35 + hashString(`${seed}:${trait}`) % 31,
  ])) as HumanTraits;
}

function traitsFor(human: Pick<Animal, 'id' | 'traits'>) {
  return human.traits ?? createFounderHumanTraits(human.id);
}

export function inheritHumanTraits(
  first: Pick<Animal, 'id' | 'traits'>,
  second: Pick<Animal, 'id' | 'traits'>,
  childId: string,
  tick: number,
  random: RandomSource = deterministicRandom,
): HumanTraits {
  const firstTraits = traitsFor(first);
  const secondTraits = traitsFor(second);
  return Object.fromEntries(HUMAN_TRAIT_KEYS.map((trait) => {
    const inherited = (firstTraits[trait] + secondTraits[trait]) / 2;
    const mutation = Math.round(
      (random(`human-mutation:${tick}:${childId}:${trait}`) * 2 - 1) *
      HUMAN_MUTATION_RANGE,
    );
    return [trait, clampTrait(inherited + mutation)];
  })) as HumanTraits;
}

const HUMAN_NAMES = [
  'Ada', 'Ash', 'Briar', 'Cleo', 'Dara', 'Ember', 'Finn', 'Iris',
  'Jules', 'Kai', 'Lark', 'Mira', 'Nico', 'Orin', 'Pax', 'Quinn',
  'Rowan', 'Sage', 'Tala', 'Vale', 'Wren', 'Yara',
] as const;

export function humanDisplayName(human: Pick<Animal, 'id'>) {
  const hash = hashString(human.id);
  return `${HUMAN_NAMES[hash % HUMAN_NAMES.length]} ${10 + hash % 90}`;
}

export function isAquaticAnimal(kind: AnimalKind) {
  return (AQUATIC_KEYS as readonly AnimalKind[]).includes(kind);
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

/** Keeps high generated canopies from becoming animal platforms while treating
 * a trunk directly above the ground as a blocked column. */
export function createAnimalSurfaceIndex(blocks: VoxelBlock[]) {
  const surfaces = new Map<string, VoxelBlock>();
  const generatedTreeYByColumn = new Map<string, number[]>();

  for (const block of blocks) {
    const key = columnKey(block.x, block.z);
    if (block.id.startsWith('tree-')) {
      const treeLevels = generatedTreeYByColumn.get(key) ?? [];
      treeLevels.push(block.y);
      generatedTreeYByColumn.set(key, treeLevels);
      continue;
    }
    const current = surfaces.get(key);
    if (!current || block.y > current.y) surfaces.set(key, block);
  }

  for (const [key, surface] of surfaces) {
    if (generatedTreeYByColumn.get(key)?.includes(surface.y + 1)) {
      surfaces.delete(key);
    }
  }

  return surfaces;
}

export function getSurfaceBlock(blocks: VoxelBlock[], x: number, z: number) {
  return createSurfaceIndex(blocks).get(columnKey(x, z));
}

export function getAnimalSurfaceBlock(blocks: VoxelBlock[], x: number, z: number) {
  return createAnimalSurfaceIndex(blocks).get(columnKey(x, z));
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
  const animal: Animal = {
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
  if (kind === 'human') {
    animal.tools = [];
    animal.traits = createFounderHumanTraits(animal.id);
    animal.generation = 0;
  }
  return animal;
}

export function createInitialEcosystem(blocks: VoxelBlock[]): EcosystemState {
  const indexedSurfaces = [...createSurfaceIndex(blocks).values()];
  const grassSurfaces = indexedSurfaces
    .filter(({ material }) => material === 'grass')
    .sort((a, b) => a.x - b.x || a.z - b.z || a.id.localeCompare(b.id));
  const startingSurfaces = grassSurfaces.length > 1
    ? [grassSurfaces[0], grassSurfaces.at(-1)!]
    : grassSurfaces;
  const waterSurfaces = indexedSurfaces
    .filter(({ material }) => material === 'water')
    .sort((a, b) => a.x - b.x || a.z - b.z || a.id.localeCompare(b.id));
  let nextEntityId = 0;
  const sheep = startingSurfaces.map((block) =>
    createAnimal('sheep', nextEntityId++, block));
  const vegetation = waterSurfaces
    .filter((_, index) => index % 3 === 0)
    .slice(0, 4)
    .map((block) => ({
      id: `growth-${nextEntityId++}`,
      blockId: block.id,
      kind: 'kelp' as const,
    }));
  const smallFishSurfaces = waterSurfaces.length > 1
    ? [waterSurfaces[0], waterSurfaces.at(-1)!]
    : waterSurfaces;
  const smallFish = smallFishSurfaces.map((block) =>
    createAnimal('small-fish', nextEntityId++, block));
  const occupiedWater = new Set(smallFishSurfaces.map(({ x, z }) => columnKey(x, z)));
  const bigFishSurface = waterSurfaces.find(
    ({ x, z }) => !occupiedWater.has(columnKey(x, z)),
  );
  const bigFish = bigFishSurface
    ? [createAnimal('big-fish', nextEntityId++, bigFishSurface)]
    : [];

  return {
    tick: 0,
    vegetation,
    animals: [...sheep, ...smallFish, ...bigFish],
    nextEntityId,
  };
}

export function spawnAnimal(
  blocks: VoxelBlock[],
  state: EcosystemState,
  kind: AnimalKind,
  x: number,
  z: number,
) {
  const surface = getAnimalSurfaceBlock(blocks, x, z);
  if (
    state.animals.length >= MAX_ANIMALS ||
    (kind === 'human' &&
      state.animals.filter((animal) => animal.kind === 'human').length >= HUMAN_MAX_POPULATION) ||
    !surface ||
    surface.burning ||
    surface.material === 'lava' ||
    (isAquaticAnimal(kind) && surface.material !== 'water') ||
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
  if (value < 0.48) return 'grass';
  if (value < 0.76) return 'tall-grass';
  if (value < 0.97) return 'flower';
  return 'sapling';
}

function advanceVegetationMaturation(
  growth: Vegetation,
  currentTick: number,
  nextTick: number,
): Vegetation {
  if (growth.kind !== 'grass' && growth.kind !== 'sapling') return growth;
  const maturationTicks = growth.kind === 'grass'
    ? SHORT_GRASS_MATURATION_TICKS
    : SAPLING_MATURATION_TICKS;
  const maturesAtTick = growth.maturesAtTick ?? currentTick + maturationTicks;
  if (nextTick < maturesAtTick) {
    return growth.maturesAtTick === maturesAtTick
      ? growth
      : { ...growth, maturesAtTick };
  }
  if (growth.kind === 'sapling') {
    return growth.maturesAtTick === maturesAtTick
      ? growth
      : { ...growth, maturesAtTick };
  }
  return { id: growth.id, blockId: growth.blockId, kind: 'tall-grass' };
}

function rotateTreeCell(cell: TreeCell, quarterTurns: number): TreeCell {
  let { x, z } = cell;
  for (let turn = 0; turn < quarterTurns; turn += 1) {
    [x, z] = [-z, x];
  }
  return { ...cell, x, z };
}

function growMatureSaplings(
  blocks: VoxelBlock[],
  vegetation: Vegetation[],
  animals: Animal[],
  tick: number,
  random: RandomSource,
) {
  let nextBlocks = blocks;
  const remainingVegetation: Vegetation[] = [];
  const occupiedCells = new Set(blocks.map(cellKey));
  const animalColumns = new Set(animals.map(({ x, z }) => columnKey(x, z)));

  for (const growth of vegetation) {
    if (
      growth.kind !== 'sapling' ||
      growth.maturesAtTick === undefined ||
      tick < growth.maturesAtTick
    ) {
      remainingVegetation.push(growth);
      continue;
    }

    const support = nextBlocks.find(({ id }) => id === growth.blockId);
    if (!support || support.material !== 'grass') continue;

    const patternIndex = Math.min(
      TREE_PATTERNS.length - 1,
      Math.floor(random(`tree-pattern:${growth.id}`) * TREE_PATTERNS.length),
    );
    const quarterTurns = Math.min(
      3,
      Math.floor(random(`tree-rotation:${growth.id}`) * 4),
    );
    const treeCells = TREE_PATTERNS[patternIndex].map((relativeCell) => {
      const rotated = rotateTreeCell(relativeCell, quarterTurns);
      return {
        x: support.x + rotated.x,
        y: support.y + rotated.y,
        z: support.z + rotated.z,
        material: rotated.material,
      };
    });
    const obstructed =
      nextBlocks.length + treeCells.length > MAX_WORLD_BLOCKS ||
      treeCells.some(
        (cell) =>
          !isInWorld(cell) ||
          occupiedCells.has(cellKey(cell)) ||
          animalColumns.has(columnKey(cell.x, cell.z)),
      );
    if (obstructed) {
      remainingVegetation.push(growth);
      continue;
    }

    nextBlocks = nextBlocks.map((block) =>
      block.id === support.id
        ? { ...block, material: 'soil' as const }
        : block);
    const treeBlocks = treeCells.map((cell, index) => ({
      id: `tree-${growth.id}-${index}`,
      ...cell,
    }));
    nextBlocks = [...nextBlocks, ...treeBlocks];
    for (const treeBlock of treeBlocks) occupiedCells.add(cellKey(treeBlock));
  }

  return { blocks: nextBlocks, vegetation: remainingVegetation };
}

function vegetationCanGrowOn(kind: VegetationKind, block: VoxelBlock) {
  return kind === 'kelp' ? block.material === 'water' : block.material === 'grass';
}

function surfaceSupportsAnimal(animal: Pick<Animal, 'kind'>, surface: VoxelBlock) {
  if (surface.material === 'lava') return false;
  return !isAquaticAnimal(animal.kind) || surface.material === 'water';
}

function surfaceIsTraversable(animal: Pick<Animal, 'kind'>, surface: VoxelBlock) {
  return !surface.burning && surfaceSupportsAnimal(animal, surface);
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
  const occupantsAreTemporaryTraffic = isAquaticAnimal(animal.kind);
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
        (!occupantsAreTemporaryTraffic && occupied.has(key)) ||
        !nextSurface ||
        !surfaceIsTraversable(animal, nextSurface) ||
        Math.abs(nextSurface.y - currentSurface.y) > 1
      ) {
        continue;
      }
      visited.add(key);
      const firstStep = current.firstStep ?? next;
      if (isGoal(next)) {
        return occupied.has(columnKey(firstStep.x, firstStep.z))
          ? animal
          : withMovementFacing(animal, firstStep);
      }
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
        surfaceIsTraversable(animal, surface) &&
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
      const surface = surfaces.get(columnKey(cell.x, cell.z));
      if (
        surface &&
        surfaceIsTraversable(parent, surface) &&
        !occupied.has(columnKey(cell.x, cell.z))
      ) {
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

function animalNeedsMeal(animal: Animal) {
  return animal.hunger <= ANIMAL_FEED_THRESHOLD;
}

function animalCanEatOnTick(animal: Animal, tick: number) {
  return tick % (ANIMALS[animal.kind].eatEveryTicks ?? 1) === 0;
}

function humanHungerLossEveryTicks(human: Animal) {
  return 1 + Math.floor(traitsFor(human).efficiency / 40);
}

function humanHuntThreshold(human: Animal) {
  return 35 + Math.round(traitsFor(human).aggression * 0.4);
}

function humanSearchRadius(human: Animal) {
  return 6 + Math.floor(traitsFor(human).exploration / 4);
}

function humanCraftingTicks(human: Animal) {
  return Math.max(1, 3 - Math.floor(traitsFor(human).craftsmanship / 40));
}

function humanLoggingInterval(human: Animal) {
  const skilled = traitsFor(human).gathering >= 55;
  return (human.tools ?? []).includes('axe')
    ? (skilled ? 1 : 2)
    : (skilled ? 2 : 3);
}

function humanCanWorkOnTick(human: Animal, tick: number) {
  const interval = humanLoggingInterval(human);
  return interval === 1 || tick % interval === hashString(human.id) % interval;
}

function humansAreCloseFamily(first: Animal, second: Animal) {
  if (first.parentIds?.includes(second.id) || second.parentIds?.includes(first.id)) {
    return true;
  }
  return Boolean(
    first.parentIds?.some((parentId) => second.parentIds?.includes(parentId)),
  );
}

function humanIsReadyToReproduce(human: Animal) {
  return (
    human.kind === 'human' &&
    !human.isBaby &&
    human.age >= HUMAN_REPRODUCTION_AGE &&
    human.hunger >= HUMAN_REPRODUCTION_MIN_HUNGER &&
    human.health >= Math.ceil(ANIMALS.human.maxHealth * 0.6) &&
    human.breedingCooldown === 0
  );
}

function createHumanChild(
  idNumber: number,
  position: Position,
  parents: [Animal, Animal],
  tick: number,
  random: RandomSource,
): Animal {
  const id = `human-${idNumber}`;
  return {
    id,
    kind: 'human',
    ...position,
    eaten: 0,
    hunger: 70,
    isBaby: true,
    breedingCooldown: 0,
    age: 0,
    health: ANIMALS.human.maxHealth,
    facingX: parents[0].facingX,
    facingZ: parents[0].facingZ,
    tools: [],
    traits: inheritHumanTraits(parents[0], parents[1], id, tick, random),
    generation: Math.max(parents[0].generation ?? 0, parents[1].generation ?? 0) + 1,
    parentIds: parents.map(({ id: parentId }) => parentId).sort() as [string, string],
  };
}

function isReadyToBreed(animal: Animal) {
  return (
    ANIMALS[animal.kind].canBreed !== false &&
    !animal.isBaby &&
    animal.hunger >= ANIMAL_BREEDING_MIN_HUNGER &&
    animal.breedingCooldown === 0
  );
}

function hasBreedingPartner(
  animal: Animal,
  animalsById: ReadonlyMap<string, Animal>,
) {
  if (!isReadyToBreed(animal)) return false;
  return [...animalsById.values()].some(
    (candidate) =>
      candidate.id !== animal.id &&
      candidate.kind === animal.kind &&
      isReadyToBreed(candidate) &&
      distance(animal, candidate) <= MATE_SEARCH_RADIUS,
  );
}

function nextHumanCraft(tools: readonly HumanTool[]): HumanCraft {
  return HUMAN_TOOL_CRAFT_ORDER.find((tool) => !tools.includes(tool)) ?? 'planks';
}

function findWorkbenchCell(
  human: Animal,
  surfaces: Map<string, VoxelBlock>,
  occupiedAnimals: ReadonlySet<string>,
  occupiedBlocks: ReadonlySet<string>,
) {
  const currentSurface = surfaces.get(columnKey(human.x, human.z));
  if (!currentSurface) return undefined;
  for (const direction of DIRECTIONS) {
    const x = human.x + direction.x;
    const z = human.z + direction.z;
    const ground = surfaces.get(columnKey(x, z));
    if (
      !ground ||
      ground.burning ||
      ground.material === 'water' ||
      ground.material === 'lava' ||
      Math.abs(ground.y - currentSurface.y) > 1 ||
      occupiedAnimals.has(columnKey(x, z))
    ) {
      continue;
    }
    const cell = { x, y: ground.y + 1, z };
    if (isInWorld(cell) && !occupiedBlocks.has(`${cell.x},${cell.y},${cell.z}`)) {
      return cell;
    }
  }
  return undefined;
}

function findHouseTarget(
  human: Animal,
  workbench: VoxelBlock,
  occupiedBlocks: ReadonlySet<string>,
) {
  for (let index = 0; index < HUMAN_HOUSE_BLUEPRINT.length; index += 1) {
    const offset = HUMAN_HOUSE_BLUEPRINT[index];
    const cell = {
      x: workbench.x + offset.x,
      y: workbench.y + offset.y,
      z: workbench.z + offset.z,
    };
    if (
      isInWorld(cell) &&
      !occupiedBlocks.has(`${cell.x},${cell.y},${cell.z}`)
    ) {
      return {
        ...cell,
        id: `human-${human.id}-house-${index}`,
        material: 'planks' as const,
      };
    }
  }
  return undefined;
}

export function advanceEcosystem(
  blocks: VoxelBlock[],
  state: EcosystemState,
  random: RandomSource = deterministicRandom,
) {
  const tick = state.tick + 1;
  let nextEntityId = state.nextEntityId;
  const workingBlocks = blocks;
  const worldSurfaces = createSurfaceIndex(workingBlocks);
  const surfaces = createAnimalSurfaceIndex(workingBlocks);
  const surfaceIds = new Set([...worldSurfaces.values()].map(({ id }) => id));
  const blocksById = new Map(workingBlocks.map((block) => [block.id, block]));
  const materialChanges = new Map<string, BlockMaterial>();
  const consumedBlockIds = new Set<string>();
  const convertedToGrass = new Set<string>();
  const createdBlocks: VoxelBlock[] = [];
  const occupiedBlockCells = new Set(
    workingBlocks.map((block) => `${block.x},${block.y},${block.z}`),
  );

  let vegetation = state.vegetation
    .filter((growth) => {
      const block = blocksById.get(growth.blockId);
      return Boolean(
        block &&
        vegetationCanGrowOn(growth.kind, block) &&
        !block.burning &&
        surfaceIds.has(block.id),
      );
    })
    .map((growth) => advanceVegetationMaturation(growth, state.tick, tick));

  for (const block of worldSurfaces.values()) {
    if (
      block.material === 'soil' &&
      random(`soil:${tick}:${block.id}`) < SOIL_TO_GRASS_CHANCE
    ) {
      materialChanges.set(block.id, 'grass');
      convertedToGrass.add(block.id);
    }
  }

  const vegetationBlockIds = new Set(vegetation.map(({ blockId }) => blockId));
  for (const block of worldSurfaces.values()) {
    const material = materialChanges.get(block.id) ?? block.material;
    if (block.burning || vegetationBlockIds.has(block.id)) continue;
    if (material === 'water') {
      if (random(`kelp:${tick}:${block.id}`) >= KELP_GROWTH_CHANCE) continue;
      vegetation.push({
        id: `growth-${nextEntityId++}`,
        blockId: block.id,
        kind: 'kelp',
      });
      vegetationBlockIds.add(block.id);
      continue;
    }
    if (
      material !== 'grass' ||
      convertedToGrass.has(block.id) ||
      random(`sprout:${tick}:${block.id}`) >= VEGETATION_GROWTH_CHANCE
    ) {
      continue;
    }
    const kind = chooseVegetation(random(`sprout-kind:${tick}:${block.id}`));
    const sprout: Vegetation = {
      id: `growth-${nextEntityId++}`,
      blockId: block.id,
      kind,
    };
    if (kind === 'grass') {
      sprout.maturesAtTick = tick + SHORT_GRASS_MATURATION_TICKS;
    } else if (kind === 'sapling') {
      sprout.maturesAtTick = tick + SAPLING_MATURATION_TICKS;
    }
    vegetation.push(sprout);
    vegetationBlockIds.add(block.id);
  }

  const availableSurfaces = [...surfaces.values()];
  let animals = state.animals.flatMap((animal) => {
    const age = animal.age + 1;
    if (age >= ANIMALS[animal.kind].lifespan) return [];
    const hungerLossEveryTicks = animal.kind === 'human'
      ? humanHungerLossEveryTicks(animal)
      : ANIMALS[animal.kind].hungerLossEveryTicks ?? 1;
    const hunger = animal.hunger - (tick % hungerLossEveryTicks === 0 ? 1 : 0);
    if (hunger <= 0) return [];
    const surface = surfaces.get(columnKey(animal.x, animal.z));
    if (surface && surfaceSupportsAnimal(animal, surface)) {
      const inWater = surface.material === 'water';
      const burning = !inWater && (animal.burning || surface.burning)
        ? (animal.burning ?? 0) + 1
        : undefined;
      const health = animal.health - (burning ? ANIMAL_FIRE_DAMAGE : 0);
      if (health <= 0) return [];
      const nextAnimal: Animal = {
        ...animal,
        age,
        hunger,
        health,
        breedingCooldown: Math.max(0, animal.breedingCooldown - 1),
      };
      if (burning) nextAnimal.burning = burning;
      else delete nextAnimal.burning;
      return [nextAnimal];
    }
    const nearest = availableSurfaces
      .filter((candidate) => surfaceSupportsAnimal(animal, candidate))
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

  const rushing = new Set<string>();
  const rushOccupied = new Set(animals.map(({ x, z }) => columnKey(x, z)));
  const waterTargetKeys = new Set(
    [...surfaces.values()]
      .filter(({ material }) => material === 'water')
      .map(({ x, z }) => columnKey(x, z)),
  );
  animals = animals.map((animal) => {
    if (!animal.burning) return animal;
    rushing.add(animal.id);
    rushOccupied.delete(columnKey(animal.x, animal.z));
    const moved = moveTowardNearestFood(animal, waterTargetKeys, surfaces, rushOccupied);
    rushOccupied.add(columnKey(moved.x, moved.z));
    const surface = surfaces.get(columnKey(moved.x, moved.z));
    if (surface?.material !== 'water') return moved;
    const extinguished = { ...moved };
    delete extinguished.burning;
    return extinguished;
  });

  const ateThisTick = new Set<string>();
  for (const animal of animals) {
    if (
      rushing.has(animal.id) ||
      !animalNeedsMeal(animal) ||
      !animalCanEatOnTick(animal, tick)
    ) continue;
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
    const growth = vegetation.find(({ blockId }) => blockId === surface.id);
    const protectedSapling = growth?.kind === 'sapling' && !vegetationIsEdible(animal, 'sapling');
    if (!protectedSapling && materialIsEdible(animal, material)) {
      if (material === 'grass' || material === 'moss') {
        materialChanges.set(surface.id, 'soil');
      } else {
        consumedBlockIds.add(surface.id);
        occupiedBlockCells.delete(`${surface.x},${surface.y},${surface.z}`);
      }
      animal.eaten += 1;
      animal.hunger = Math.min(MAX_ANIMAL_HUNGER, animal.hunger + HUNGER_PER_MEAL);
      ateThisTick.add(animal.id);
    }
  }

  animals = animals.map((animal) => {
    const finishedGrowing = animal.isBaby && (
      animal.kind === 'human'
        ? animal.age >= HUMAN_CHILDHOOD_TICKS
        : animal.eaten >= BABY_GROWTH_MEALS
    );
    return finishedGrowing
      ? {
          ...animal,
          eaten: 0,
          isBaby: false,
          breedingCooldown: animal.kind === 'human'
            ? HUMAN_REPRODUCTION_COOLDOWN_TICKS
            : BREEDING_COOLDOWN_TICKS,
        }
      : animal;
  });

  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const occupied = new Set(animals.map(({ x, z }) => columnKey(x, z)));
  const actedThisTick = new Set(rushing);

  const predators = [...animalsById.values()]
    .filter(
      (animal) =>
        ANIMALS[animal.kind].predator &&
        animalNeedsMeal(animal) &&
        animalCanEatOnTick(animal, tick),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const originalPredator of predators) {
    let predator = animalsById.get(originalPredator.id);
    if (!predator) continue;
    if (hasBreedingPartner(predator, animalsById)) continue;
    const preyKinds = ANIMALS[predator.kind].prey;
    const prey = [...animalsById.values()]
      .filter(
        (animal) =>
          preyKinds.includes(animal.kind) &&
          !actedThisTick.has(animal.id),
      )
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

  let humanPopulation = [...animalsById.values()]
    .filter(({ kind }) => kind === 'human').length;
  const pairedHumans = new Set<string>();
  if (humanPopulation < HUMAN_MAX_POPULATION) {
    const eligibleHumans = [...animalsById.values()]
      .filter(
        (human) =>
          human.kind === 'human' &&
          !actedThisTick.has(human.id) &&
          humanIsReadyToReproduce(human),
      )
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const first of eligibleHumans) {
      if (pairedHumans.has(first.id) || humanPopulation >= HUMAN_MAX_POPULATION) continue;
      const currentFirst = animalsById.get(first.id);
      if (!currentFirst || !humanIsReadyToReproduce(currentFirst)) continue;
      const partner = eligibleHumans
        .filter((candidate) => {
          if (
            candidate.id === currentFirst.id ||
            pairedHumans.has(candidate.id) ||
            humansAreCloseFamily(currentFirst, candidate)
          ) {
            return false;
          }
          const sharedSearchRadius = Math.min(
            humanSearchRadius(currentFirst),
            humanSearchRadius(candidate),
          );
          return distance(currentFirst, candidate) <= sharedSearchRadius;
        })
        .sort(
          (a, b) =>
            distance(currentFirst, a) - distance(currentFirst, b) ||
            a.id.localeCompare(b.id),
        )[0];
      if (!partner) continue;
      const currentPartner = animalsById.get(partner.id);
      if (!currentPartner || !humanIsReadyToReproduce(currentPartner)) continue;

      pairedHumans.add(currentFirst.id);
      pairedHumans.add(currentPartner.id);
      actedThisTick.add(currentFirst.id);
      actedThisTick.add(currentPartner.id);

      if (distance(currentFirst, currentPartner) <= 1) {
        const babyCell = findBabyCell([currentFirst, currentPartner], surfaces, occupied);
        if (!babyCell) continue;
        animalsById.set(currentFirst.id, {
          ...currentFirst,
          hunger: currentFirst.hunger - HUMAN_REPRODUCTION_HUNGER_COST,
          breedingCooldown: HUMAN_REPRODUCTION_COOLDOWN_TICKS,
        });
        animalsById.set(currentPartner.id, {
          ...currentPartner,
          hunger: currentPartner.hunger - HUMAN_REPRODUCTION_HUNGER_COST,
          breedingCooldown: HUMAN_REPRODUCTION_COOLDOWN_TICKS,
        });
        const child = createHumanChild(
          nextEntityId++,
          babyCell,
          [currentFirst, currentPartner],
          tick,
          random,
        );
        animalsById.set(child.id, child);
        occupied.add(columnKey(child.x, child.z));
        humanPopulation += 1;
        continue;
      }

      occupied.delete(columnKey(currentFirst.x, currentFirst.z));
      const movedFirst = moveToward(currentFirst, currentPartner, surfaces, occupied, 1);
      animalsById.set(currentFirst.id, movedFirst);
      occupied.add(columnKey(movedFirst.x, movedFirst.z));

      occupied.delete(columnKey(currentPartner.x, currentPartner.z));
      const movedPartner = moveToward(currentPartner, movedFirst, surfaces, occupied, 1);
      animalsById.set(currentPartner.id, movedPartner);
      occupied.add(columnKey(movedPartner.x, movedPartner.z));
    }
  }

  const humans = [...animalsById.values()]
    .filter(
      (animal) =>
        animal.kind === 'human' &&
        !animal.isBaby &&
        !actedThisTick.has(animal.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const originalHuman of humans) {
    let human = animalsById.get(originalHuman.id);
    if (!human) continue;
    actedThisTick.add(human.id);
    occupied.delete(columnKey(human.x, human.z));
    const saveHuman = (nextHuman: Animal) => {
      human = nextHuman;
      animalsById.set(nextHuman.id, nextHuman);
      occupied.add(columnKey(nextHuman.x, nextHuman.z));
    };

    let workbench = human.workbenchId
      ? blocksById.get(human.workbenchId)
      : undefined;
    if (
      !workbench ||
      workbench.material !== 'crafting-bench' ||
      consumedBlockIds.has(workbench.id)
    ) {
      const resetHuman = { ...human };
      delete resetHuman.workbenchId;
      delete resetHuman.crafting;
      delete resetHuman.craftingReadyTick;
      human = resetHuman;
      workbench = undefined;
      animalsById.set(human.id, human);
    }

    const humanTraits = traitsFor(human);
    const huntHealthFloor = Math.ceil(
      ANIMALS.human.maxHealth * (0.25 + humanTraits.caution * 0.004),
    );
    if (human.hunger <= humanHuntThreshold(human) && human.health >= huntHealthFloor) {
      const prey = [...animalsById.values()]
        .filter(
          (candidate) => {
            const dangerous = ANIMALS[candidate.kind].predator;
            const acceptsDanger =
              (human!.tools ?? []).includes('spear') &&
              humanTraits.aggression >= humanTraits.caution;
            return (
            candidate.id !== human!.id &&
            ANIMALS.human.prey.includes(candidate.kind) &&
            distance(human!, candidate) <= humanSearchRadius(human!) &&
            (!dangerous || acceptsDanger)
            );
          },
        )
        .sort(
          (a, b) =>
            distance(human!, a) - distance(human!, b) ||
            a.id.localeCompare(b.id),
        )[0];
      if (prey) {
        if (distance(human, prey) > 1) {
          saveHuman(moveToward(human, prey, surfaces, occupied, 1));
          continue;
        }
        const huntingHuman = faceToward(human, prey);
        human = huntingHuman;
        const defendingPrey = faceToward(prey, huntingHuman);
        const fightBackChance = (ANIMALS[prey.kind].predator ? 0.55 : 0.14) *
          (1 - humanTraits.caution * 0.006);
        if (
          random(`human-defend:${tick}:${huntingHuman.id}:${prey.id}`) <
          fightBackChance
        ) {
          const injuredHuman = {
            ...huntingHuman,
            health: huntingHuman.health - ANIMALS[prey.kind].attackDamage,
          };
          if (injuredHuman.health <= 0) {
            animalsById.delete(huntingHuman.id);
            continue;
          }
          human = injuredHuman;
        }
        const damage = ((huntingHuman.tools ?? []).includes('spear') ? 4 : 2) +
          Math.floor(humanTraits.aggression / 50);
        const attackedPrey = { ...defendingPrey, health: defendingPrey.health - damage };
        actedThisTick.add(prey.id);
        if (attackedPrey.health > 0) {
          animalsById.set(prey.id, attackedPrey);
          saveHuman(human);
          continue;
        }
        animalsById.delete(prey.id);
        occupied.delete(columnKey(prey.x, prey.z));
        saveHuman({
          ...human,
          eaten: human.eaten + 1,
          hunger: Math.min(MAX_ANIMAL_HUNGER, human.hunger + HUNGER_PER_MEAL),
        });
        continue;
      }
    }

    if (human.crafting && workbench) {
      if (distance(human, workbench) > 1) {
        saveHuman(moveToward(human, workbench, surfaces, occupied, 1));
        continue;
      }
      if (tick < (human.craftingReadyTick ?? tick)) {
        saveHuman(human);
        continue;
      }
      const finishedHuman = { ...human };
      if (human.crafting === 'planks') finishedHuman.heldItem = 'planks';
      else finishedHuman.tools = [...new Set([...(human.tools ?? []), human.crafting])];
      delete finishedHuman.crafting;
      delete finishedHuman.craftingReadyTick;
      saveHuman(finishedHuman);
      continue;
    }

    if (human.heldItem === 'wood') {
      if (!workbench) {
        const cell = findWorkbenchCell(human, surfaces, occupied, occupiedBlockCells);
        if (!cell) {
          saveHuman(human);
          continue;
        }
        const block: VoxelBlock = {
          id: `human-${human.id}-workbench`,
          ...cell,
          material: 'crafting-bench',
        };
        createdBlocks.push(block);
        blocksById.set(block.id, block);
        occupiedBlockCells.add(`${block.x},${block.y},${block.z}`);
        const builder = { ...human, workbenchId: block.id };
        delete builder.heldItem;
        saveHuman(builder);
        continue;
      }
      if (distance(human, workbench) > 1) {
        saveHuman(moveToward(human, workbench, surfaces, occupied, 1));
        continue;
      }
      const crafter = {
        ...human,
        crafting: nextHumanCraft(human.tools ?? []),
        craftingReadyTick: tick + humanCraftingTicks(human),
      };
      delete crafter.heldItem;
      saveHuman(crafter);
      continue;
    }

    if (
      human.heldItem === 'planks' &&
      workbench &&
      (human.tools ?? []).includes('hammer')
    ) {
      const target = findHouseTarget(human, workbench, occupiedBlockCells);
      if (!target) {
        saveHuman(human);
        continue;
      }
      if (distance(human, target) > 1) {
        saveHuman(moveToward(human, target, surfaces, occupied, 1));
        continue;
      }
      createdBlocks.push(target);
      blocksById.set(target.id, target);
      occupiedBlockCells.add(`${target.x},${target.y},${target.z}`);
      const builder = { ...human };
      delete builder.heldItem;
      saveHuman(builder);
      continue;
    }

    if (human.heldItem) {
      saveHuman(human);
      continue;
    }

    const wood = workingBlocks
      .filter(
        (block) =>
          block.material === 'wood' &&
          !consumedBlockIds.has(block.id) &&
          distance(human!, block) <= humanSearchRadius(human!),
      )
      .sort(
        (a, b) =>
          distance(human!, a) - distance(human!, b) ||
          a.y - b.y ||
          a.id.localeCompare(b.id),
      )[0];
    if (!wood) {
      saveHuman(human);
      continue;
    }
    if (distance(human, wood) > 1) {
      saveHuman(moveToward(human, wood, surfaces, occupied, 1));
      continue;
    }
    if (!humanCanWorkOnTick(human, tick)) {
      saveHuman(human);
      continue;
    }
    consumedBlockIds.add(wood.id);
    occupiedBlockCells.delete(`${wood.x},${wood.y},${wood.z}`);
    saveHuman({ ...human, heldItem: 'wood' });
  }

  const paired = new Set<string>();
  const eligible = [...animalsById.values()]
    .filter(
      (animal) =>
        !actedThisTick.has(animal.id) &&
        isReadyToBreed(animal),
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
          hunger: currentFirst.hunger - BREEDING_HUNGER_COST,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        });
        animalsById.set(partner.id, {
          ...currentPartner,
          eaten: 0,
          hunger: currentPartner.hunger - BREEDING_HUNGER_COST,
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
      const protectedSapling =
        growth?.kind === 'sapling' && !vegetationIsEdible(animal, 'sapling');
      if (
        (growth && vegetationIsEdible(animal, growth.kind)) ||
        (!protectedSapling && materialIsEdible(animal, material))
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
    ? workingBlocks.filter((block) => !consumedBlockIds.has(block.id))
    : workingBlocks;
  const changedBlocks = materialChanges.size
    ? survivingBlocks.map((block) => {
        const material = materialChanges.get(block.id);
        return material ? { ...block, material } : block;
      })
    : survivingBlocks;
  const nextBlocks = createdBlocks.length
    ? [...changedBlocks, ...createdBlocks]
    : changedBlocks;

  const treeGrowth = growMatureSaplings(
    nextBlocks,
    vegetation,
    animals,
    tick,
    random,
  );

  return {
    blocks: treeGrowth.blocks,
    ecosystem: {
      tick,
      vegetation: treeGrowth.vegetation,
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
      !['grass', 'flower', 'tall-grass', 'sapling', 'kelp'].includes(growth.kind ?? '') ||
      (growth.maturesAtTick !== undefined &&
        (!['grass', 'sapling'].includes(growth.kind ?? '') ||
          !Number.isInteger(growth.maturesAtTick) ||
          growth.maturesAtTick < 0)) ||
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
    const tools = animal.tools;
    const traits = animal.traits;
    const traitsValid = Boolean(
      traits &&
      typeof traits === 'object' &&
      HUMAN_TRAIT_KEYS.every(
        (trait) =>
          Number.isInteger(traits[trait]) &&
          traits[trait] >= 0 &&
          traits[trait] <= 100,
      ),
    );
    const parentsValid = animal.parentIds === undefined || (
      Array.isArray(animal.parentIds) &&
      animal.parentIds.length === 2 &&
      animal.parentIds.every((parentId) => typeof parentId === 'string') &&
      animal.parentIds[0] !== animal.parentIds[1]
    );
    const humanStateValid = animal.kind === 'human'
      ? (
          (animal.heldItem === undefined || ['wood', 'planks'].includes(animal.heldItem)) &&
          (tools === undefined || (
            Array.isArray(tools) &&
            tools.length <= HUMAN_TOOL_KEYS.length &&
            new Set(tools).size === tools.length &&
            tools.every((tool) => HUMAN_TOOL_KEYS.includes(tool))
          )) &&
          (animal.workbenchId === undefined || typeof animal.workbenchId === 'string') &&
          (animal.crafting === undefined || [...HUMAN_TOOL_KEYS, 'planks'].includes(animal.crafting)) &&
          ((animal.crafting === undefined && animal.craftingReadyTick === undefined) || (
            animal.crafting !== undefined &&
            Number.isInteger(animal.craftingReadyTick) &&
            (animal.craftingReadyTick ?? -1) >= 0
          )) &&
          !(animal.heldItem && animal.crafting) &&
          traitsValid &&
          Number.isInteger(animal.generation) &&
          (animal.generation ?? -1) >= 0 &&
          parentsValid &&
          ((animal.generation ?? 0) === 0 || animal.parentIds !== undefined)
        )
      : animal.heldItem === undefined &&
        animal.tools === undefined &&
        animal.workbenchId === undefined &&
        animal.crafting === undefined &&
        animal.craftingReadyTick === undefined &&
        animal.traits === undefined &&
        animal.generation === undefined &&
        animal.parentIds === undefined;
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
      (animal.burning !== undefined &&
        (!Number.isInteger(animal.burning) || animal.burning < 1)) ||
      !humanStateValid ||
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
    const isHuman = animal.kind === 'human';
    return {
      ...animal,
      age: Number.isInteger(animal.age) ? animal.age : 0,
      health: Number.isInteger(animal.health)
        ? animal.health
        : definition?.maxHealth ?? 1,
      facingX: Number.isInteger(animal.facingX) ? animal.facingX : 1,
      facingZ: Number.isInteger(animal.facingZ) ? animal.facingZ : 0,
      ...(isHuman && animal.tools === undefined ? { tools: [] } : {}),
      ...(isHuman && animal.traits === undefined
        ? { traits: createFounderHumanTraits(animal.id ?? 'human-legacy') }
        : {}),
      ...(isHuman && animal.generation === undefined ? { generation: 0 } : {}),
      ...(isHuman && animal.crafting !== undefined && animal.craftingReadyTick === undefined
        ? { craftingReadyTick: Number.isInteger(state.tick) ? state.tick : 0 }
        : {}),
    };
  });
  const migrated = { ...state, animals };
  return isValidEcosystem(migrated) ? migrated : undefined;
}
