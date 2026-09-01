import { MATERIALS, type VoxelBlock } from './world';

export const ABILITY_KEYS = [
  'verdant-touch',
  'wildfire',
  'rain',
  'deep-freeze',
  'thaw',
] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const ABILITIES: Record<
  AbilityKey,
  { label: string; description: string; triggersGravity: boolean }
> = {
  'verdant-touch': {
    label: 'Verdant Touch',
    description: 'Grassify exposed dirt',
    triggersGravity: false,
  },
  wildfire: {
    label: 'Wildfire',
    description: 'Ignite flammable blocks',
    triggersGravity: false,
  },
  rain: {
    label: 'Rain',
    description: 'Extinguish every fire',
    triggersGravity: false,
  },
  'deep-freeze': {
    label: 'Deep Freeze',
    description: 'Solidify water and lava',
    triggersGravity: true,
  },
  thaw: {
    label: 'Thaw',
    description: 'Melt ice and snow',
    triggersGravity: true,
  },
};

export type AbilityResult = {
  blocks: VoxelBlock[];
  changed: boolean;
  affected: number;
};

export function applyAbility(input: VoxelBlock[], ability: AbilityKey): AbilityResult {
  const surfaceY = new Map<string, number>();
  if (ability === 'verdant-touch') {
    for (const block of input) {
      const key = `${block.x},${block.z}`;
      surfaceY.set(key, Math.max(surfaceY.get(key) ?? -1, block.y));
    }
  }
  let affected = 0;

  const blocks = input.map((block): VoxelBlock => {
    if (
      ability === 'verdant-touch' &&
      block.material === 'soil' &&
      surfaceY.get(`${block.x},${block.z}`) === block.y
    ) {
      affected += 1;
      return { ...block, material: 'grass' };
    }

    if (ability === 'wildfire' && MATERIALS[block.material].burnDuration && !block.burning) {
      affected += 1;
      return { ...block, burning: 1 };
    }

    if (ability === 'rain' && block.burning) {
      const { burning: _burning, ...extinguished } = block;
      affected += 1;
      return extinguished;
    }

    if (ability === 'deep-freeze' && block.material === 'water') {
      affected += 1;
      return { ...block, material: 'ice' };
    }

    if (ability === 'deep-freeze' && block.material === 'lava') {
      affected += 1;
      return { ...block, material: 'obsidian' };
    }

    if (ability === 'thaw' && (block.material === 'ice' || block.material === 'snow')) {
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
