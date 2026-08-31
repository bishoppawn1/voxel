import type { BlockMaterial, VoxelBlock } from './world';

export const ECOSYSTEM_TICK_MS = 900;
export const SHEEP_BREEDING_MEALS = 3;
export const MAX_ANIMAL_HUNGER = 100;

const SOIL_TO_GRASS_CHANCE = 0.012;
const VEGETATION_GROWTH_CHANCE = 0.028;
const MATE_SEARCH_RADIUS = 20;
const BREEDING_COOLDOWN_TICKS = 16;
const HUNGER_LOSS_PER_TICK = 2;
const HUNGER_PER_MEAL = 34;

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

export type Sheep = {
  id: string;
  x: number;
  z: number;
  eaten: number;
  hunger: number;
  isBaby: boolean;
  breedingCooldown: number;
};

export type EcosystemState = {
  tick: number;
  vegetation: Vegetation[];
  sheep: Sheep[];
  nextEntityId: number;
};

type RandomSource = (key: string) => number;

const columnKey = (x: number, z: number) => `${x},${z}`;
const distance = (a: Pick<Sheep, 'x' | 'z'>, b: Pick<Sheep, 'x' | 'z'>) =>
  Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

function deterministicRandom(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function surfaceMap(blocks: VoxelBlock[]) {
  const surfaces = new Map<string, VoxelBlock>();
  for (const block of blocks) {
    const key = columnKey(block.x, block.z);
    const current = surfaces.get(key);
    if (!current || block.y > current.y) surfaces.set(key, block);
  }
  return surfaces;
}

export function getSurfaceBlock(blocks: VoxelBlock[], x: number, z: number) {
  return surfaceMap(blocks).get(columnKey(x, z));
}

export function createInitialEcosystem(blocks: VoxelBlock[]): EcosystemState {
  const grassSurfaces = [...surfaceMap(blocks).values()]
    .filter(({ material }) => material === 'grass')
    .sort((a, b) => a.x - b.x || a.z - b.z || a.id.localeCompare(b.id));
  const startingSurfaces = grassSurfaces.length > 1
    ? [grassSurfaces[0], grassSurfaces.at(-1)!]
    : grassSurfaces;

  return {
    tick: 0,
    vegetation: [],
    sheep: startingSurfaces.map((block, index) => ({
      id: `sheep-${index}`,
      x: block.x,
      z: block.z,
      eaten: 0,
      hunger: MAX_ANIMAL_HUNGER,
      isBaby: false,
      breedingCooldown: 0,
    })),
    nextEntityId: startingSurfaces.length,
  };
}

function chooseVegetation(value: number): VegetationKind {
  if (value < 0.5) return 'grass';
  if (value < 0.78) return 'tall-grass';
  return 'flower';
}

function moveToward(
  sheep: Sheep,
  target: Pick<Sheep, 'x' | 'z'>,
  surfaces: Map<string, VoxelBlock>,
  occupied: Set<string>,
  stopDistance = 0,
) {
  if (distance(sheep, target) <= stopDistance) return sheep;
  const currentSurface = surfaces.get(columnKey(sheep.x, sheep.z));
  if (!currentSurface) return sheep;

  const candidates = DIRECTIONS.map((direction, order) => ({
    x: sheep.x + direction.x,
    z: sheep.z + direction.z,
    order,
  }))
    .filter((candidate) => {
      const surface = surfaces.get(columnKey(candidate.x, candidate.z));
      return (
        surface &&
        Math.abs(surface.y - currentSurface.y) <= 1 &&
        !occupied.has(columnKey(candidate.x, candidate.z))
      );
    })
    .sort(
      (a, b) =>
        distance(a, target) - distance(b, target) ||
        a.order - b.order,
    );

  const next = candidates[0];
  return next ? { ...sheep, x: next.x, z: next.z } : sheep;
}

function nearestTarget(
  sheep: Sheep,
  targets: Array<{ x: number; z: number }>,
) {
  return targets
    .filter((target) => target.x !== sheep.x || target.z !== sheep.z)
    .sort(
      (a, b) =>
        distance(sheep, a) - distance(sheep, b) ||
        a.x - b.x ||
        a.z - b.z,
    )[0];
}

function findBabyCell(
  parents: [Sheep, Sheep],
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

export function advanceEcosystem(
  blocks: VoxelBlock[],
  state: EcosystemState,
  random: RandomSource = deterministicRandom,
) {
  const tick = state.tick + 1;
  let nextEntityId = state.nextEntityId;
  const surfaces = surfaceMap(blocks);
  const surfaceIds = new Set([...surfaces.values()].map(({ id }) => id));
  const blocksById = new Map(blocks.map((block) => [block.id, block]));
  const materialChanges = new Map<string, BlockMaterial>();
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
  let sheep = state.sheep.flatMap((animal) => {
    const hunger = animal.hunger - HUNGER_LOSS_PER_TICK;
    if (hunger <= 0) return [];
    if (surfaces.has(columnKey(animal.x, animal.z))) {
      return [{
        ...animal,
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
      ? [{ ...animal, x: nearest.x, z: nearest.z, hunger, breedingCooldown: 0 }]
      : [];
  });

  const ateThisTick = new Set<string>();
  for (const animal of sheep) {
    const surface = surfaces.get(columnKey(animal.x, animal.z));
    if (!surface) continue;
    const growthIndex = vegetation.findIndex(({ blockId }) => blockId === surface.id);
    if (growthIndex >= 0) {
      vegetation = vegetation.filter((_, index) => index !== growthIndex);
      animal.eaten += 1;
      animal.hunger = Math.min(MAX_ANIMAL_HUNGER, animal.hunger + HUNGER_PER_MEAL);
      ateThisTick.add(animal.id);
      continue;
    }
    const material = materialChanges.get(surface.id) ?? surface.material;
    if (material === 'grass' && !surface.burning) {
      materialChanges.set(surface.id, 'soil');
      animal.eaten += 1;
      animal.hunger = Math.min(MAX_ANIMAL_HUNGER, animal.hunger + HUNGER_PER_MEAL);
      ateThisTick.add(animal.id);
    }
  }

  const sheepById = new Map(sheep.map((animal) => [animal.id, animal]));
  const occupied = new Set(sheep.map(({ x, z }) => columnKey(x, z)));
  const paired = new Set<string>();
  const eligible = sheep
    .filter(
      ({ eaten, isBaby, breedingCooldown }) =>
        !isBaby && eaten >= SHEEP_BREEDING_MEALS && breedingCooldown === 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const first of eligible) {
    if (paired.has(first.id)) continue;
    const currentFirst = sheepById.get(first.id)!;
    const partner = eligible
      .filter(
        (candidate) =>
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
    let currentPartner = sheepById.get(partner.id)!;

    if (distance(currentFirst, currentPartner) <= 1) {
      const babyCell = findBabyCell([currentFirst, currentPartner], surfaces, occupied);
      if (babyCell) {
        sheepById.set(first.id, {
          ...currentFirst,
          eaten: 0,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        });
        sheepById.set(partner.id, {
          ...currentPartner,
          eaten: 0,
          breedingCooldown: BREEDING_COOLDOWN_TICKS,
        });
        const baby: Sheep = {
          id: `sheep-${nextEntityId++}`,
          ...babyCell,
          eaten: 0,
          hunger: Math.round(MAX_ANIMAL_HUNGER * 0.7),
          isBaby: true,
          breedingCooldown: 0,
        };
        sheepById.set(baby.id, baby);
        occupied.add(columnKey(baby.x, baby.z));
      }
      continue;
    }

    occupied.delete(columnKey(currentFirst.x, currentFirst.z));
    const movedFirst = moveToward(currentFirst, currentPartner, surfaces, occupied, 1);
    sheepById.set(first.id, movedFirst);
    occupied.add(columnKey(movedFirst.x, movedFirst.z));

    currentPartner = sheepById.get(partner.id)!;
    occupied.delete(columnKey(currentPartner.x, currentPartner.z));
    const movedPartner = moveToward(currentPartner, movedFirst, surfaces, occupied, 1);
    sheepById.set(partner.id, movedPartner);
    occupied.add(columnKey(movedPartner.x, movedPartner.z));
  }

  const remainingGrowthIds = new Set(vegetation.map(({ blockId }) => blockId));
  const foodTargets = [...surfaces.values()]
    .filter((block) => {
      const material = materialChanges.get(block.id) ?? block.material;
      return !block.burning && (remainingGrowthIds.has(block.id) || material === 'grass');
    })
    .map(({ x, z }) => ({ x, z }));

  for (const animal of sheepById.values()) {
    if (paired.has(animal.id) || ateThisTick.has(animal.id)) continue;
    const target = nearestTarget(animal, foodTargets);
    if (!target && tick % 4 !== 0) continue;
    const wanderTarget = target ?? {
      x: animal.x + DIRECTIONS[tick % DIRECTIONS.length].x,
      z: animal.z + DIRECTIONS[tick % DIRECTIONS.length].z,
    };
    occupied.delete(columnKey(animal.x, animal.z));
    const moved = moveToward(animal, wanderTarget, surfaces, occupied);
    sheepById.set(animal.id, moved);
    occupied.add(columnKey(moved.x, moved.z));
  }

  sheep = [...sheepById.values()].sort((a, b) => a.id.localeCompare(b.id));
  const nextBlocks = materialChanges.size
    ? blocks.map((block) => {
        const material = materialChanges.get(block.id);
        return material ? { ...block, material } : block;
      })
    : blocks;

  return {
    blocks: nextBlocks,
    ecosystem: {
      tick,
      vegetation,
      sheep,
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
    !Array.isArray(state.sheep) ||
    state.vegetation.length > 5000 ||
    state.sheep.length > 500
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

  const sheepValid = state.sheep.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const sheep = item as Partial<Sheep>;
    if (
      typeof sheep.id !== 'string' ||
      !Number.isInteger(sheep.x) ||
      !Number.isInteger(sheep.z) ||
      !Number.isInteger(sheep.eaten) ||
      (sheep.eaten ?? -1) < 0 ||
      !Number.isInteger(sheep.hunger) ||
      (sheep.hunger ?? -1) < 1 ||
      (sheep.hunger ?? MAX_ANIMAL_HUNGER + 1) > MAX_ANIMAL_HUNGER ||
      typeof sheep.isBaby !== 'boolean' ||
      !Number.isInteger(sheep.breedingCooldown) ||
      (sheep.breedingCooldown ?? -1) < 0 ||
      entityIds.has(sheep.id)
    ) {
      return false;
    }
    entityIds.add(sheep.id);
    return true;
  });

  return vegetationValid && sheepValid;
}
