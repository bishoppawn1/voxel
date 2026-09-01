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
export const ABILITY_RADIUS = 3;

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
) {
  if (!target) return false;
  const distanceSquared = (block.x - target.x) ** 2 + (block.z - target.z) ** 2;
  if (distanceSquared > ABILITY_RADIUS ** 2) return false;
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
): AbilityResult {
  const surfaceY = getSurfaceY(input);
  let affected = 0;

  const blocks = input.map((block): VoxelBlock => {
    if (!isEligible(block, ability, surfaceY, target)) return block;

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
