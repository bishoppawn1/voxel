import { MATERIALS, type VoxelBlock } from './world';

export const ABILITY_KEYS = [
  'verdant-touch',
  'wildfire',
  'rain',
  'deep-freeze',
  'thaw',
] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];
export type AbilityTarget = Pick<VoxelBlock, 'x' | 'z'>;
export const MIN_ABILITY_BRUSH_SIZE = 1;
export const MAX_ABILITY_BRUSH_SIZE = 15;
export const DEFAULT_ABILITY_BRUSH_SIZE = 7;

export const ABILITIES: Record<
  AbilityKey,
  { label: string; description: string; triggersGravity: boolean }
> = {
  'verdant-touch': {
    label: 'Verdant Touch',
    description: 'Brush grass onto nearby dirt',
    triggersGravity: false,
  },
  wildfire: {
    label: 'Wildfire',
    description: 'Ignite a nearby patch',
    triggersGravity: false,
  },
  rain: {
    label: 'Rain',
    description: 'Extinguish a nearby patch',
    triggersGravity: false,
  },
  'deep-freeze': {
    label: 'Deep Freeze',
    description: 'Freeze nearby water and lava',
    triggersGravity: true,
  },
  thaw: {
    label: 'Thaw',
    description: 'Melt nearby ice and snow',
    triggersGravity: true,
  },
};

export type AbilityResult = {
  blocks: VoxelBlock[];
  changed: boolean;
  affected: number;
};

export type AbilityAnimal = {
  x: number;
  z: number;
  burning?: number;
};

export type AnimalAbilityResult<T extends AbilityAnimal> = {
  animals: T[];
  changed: boolean;
  affected: number;
};

function normalizedBrushSize(size: number) {
  const clamped = Math.max(
    MIN_ABILITY_BRUSH_SIZE,
    Math.min(MAX_ABILITY_BRUSH_SIZE, Math.round(size)),
  );
  return clamped % 2 === 0 ? clamped - 1 : clamped;
}

export function isInsideAbilityBrush(
  position: AbilityTarget,
  target: AbilityTarget,
  brushSize = DEFAULT_ABILITY_BRUSH_SIZE,
) {
  const radius = Math.floor(normalizedBrushSize(brushSize) / 2);
  return (
    Math.abs(position.x - target.x) <= radius &&
    Math.abs(position.z - target.z) <= radius
  );
}

function getSurfaceY(input: VoxelBlock[]) {
  const surfaceY = new Map<string, number>();
  for (const block of input) {
    const key = `${block.x},${block.z}`;
    surfaceY.set(key, Math.max(surfaceY.get(key) ?? -1, block.y));
  }
  return surfaceY;
}

function isEligible(
  block: VoxelBlock,
  ability: AbilityKey,
  surfaceY: Map<string, number>,
  target?: AbilityTarget,
  brushSize = DEFAULT_ABILITY_BRUSH_SIZE,
) {
  if (!target) return false;
  if (!isInsideAbilityBrush(block, target, brushSize)) return false;
  if (ability === 'verdant-touch') {
    return (
      block.material === 'soil' &&
      surfaceY.get(`${block.x},${block.z}`) === block.y
    );
  }
  if (ability === 'wildfire') return Boolean(MATERIALS[block.material].burnDuration && !block.burning);
  if (ability === 'rain') return Boolean(block.burning);
  if (ability === 'deep-freeze') return block.material === 'water' || block.material === 'lava';
  return block.material === 'ice' || block.material === 'snow';
}

export function countEligibleBlocks(input: VoxelBlock[], ability: AbilityKey) {
  const surfaceY = getSurfaceY(input);
  return input.filter((block) => {
    if (ability === 'verdant-touch') {
      return (
        block.material === 'soil' &&
        surfaceY.get(`${block.x},${block.z}`) === block.y
      );
    }
    if (ability === 'wildfire') {
      return Boolean(MATERIALS[block.material].burnDuration && !block.burning);
    }
    if (ability === 'rain') return Boolean(block.burning);
    if (ability === 'deep-freeze') {
      return block.material === 'water' || block.material === 'lava';
    }
    return block.material === 'ice' || block.material === 'snow';
  }).length;
}

export function applyAbility(
  input: VoxelBlock[],
  ability: AbilityKey,
  target?: AbilityTarget,
  brushSize = DEFAULT_ABILITY_BRUSH_SIZE,
): AbilityResult {
  const surfaceY = getSurfaceY(input);
  let affected = 0;

  const blocks = input.map((block): VoxelBlock => {
    if (!isEligible(block, ability, surfaceY, target, brushSize)) return block;

    if (ability === 'verdant-touch') {
      affected += 1;
      return { ...block, material: 'grass' };
    }

    if (ability === 'wildfire') {
      affected += 1;
      return { ...block, burning: 1 };
    }

    if (ability === 'rain') {
      const { burning: _burning, ...extinguished } = block;
      affected += 1;
      return extinguished;
    }

    if (ability === 'deep-freeze') {
      const { liquidLevel: _liquidLevel, ...solid } = block;
      affected += 1;
      return { ...solid, material: block.material === 'water' ? 'ice' : 'obsidian' };
    }

    if (ability === 'thaw') {
      affected += 1;
      return { ...block, material: 'water' };
    }

    return block;
  });

  return {
    blocks: affected ? blocks : input,
    changed: affected > 0,
    affected,
  };
}

function animalIsEligible(animal: AbilityAnimal, ability: AbilityKey) {
  if (ability === 'wildfire') return !animal.burning;
  if (ability === 'rain') return Boolean(animal.burning);
  return false;
}

export function countEligibleAnimals(input: AbilityAnimal[], ability: AbilityKey) {
  return input.filter((animal) => animalIsEligible(animal, ability)).length;
}

export function applyAbilityToAnimals<T extends AbilityAnimal>(
  input: T[],
  ability: AbilityKey,
  target?: AbilityTarget,
  brushSize = DEFAULT_ABILITY_BRUSH_SIZE,
): AnimalAbilityResult<T> {
  if (!target || (ability !== 'wildfire' && ability !== 'rain')) {
    return { animals: input, changed: false, affected: 0 };
  }

  let affected = 0;
  const animals = input.map((animal) => {
    if (
      !isInsideAbilityBrush(animal, target, brushSize) ||
      !animalIsEligible(animal, ability)
    ) {
      return animal;
    }
    affected += 1;
    if (ability === 'wildfire') return { ...animal, burning: 1 };
    const { burning: _burning, ...extinguished } = animal;
    return extinguished as T;
  });

  return {
    animals: affected ? animals : input,
    changed: affected > 0,
    affected,
  };
}
