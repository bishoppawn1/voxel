import { Edges, Grid, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import {
  Box,
  ArrowDown,
  CloudRain,
  Eraser,
  Flame,
  Heart,
  Leaf,
  PawPrint,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Group, MOUSE, Vector3 } from 'three';
import {
  ANIMALS,
  ANIMAL_KEYS,
  ECOSYSTEM_TICK_MS,
  HUMAN_CHILDHOOD_TICKS,
  HUMAN_TRAITS,
  HUMAN_TRAIT_KEYS,
  advanceEcosystem,
  convertCoveredGrassToSoil,
  createAnimalSurfaceIndex,
  createInitialEcosystem,
  createSurfaceIndex,
  isAquaticAnimal,
  humanDisplayName,
  migrateEcosystem,
  spawnAnimal,
  type AnimalKind,
  type Animal,
  type EcosystemState,
  type Vegetation,
} from './game/ecosystem';
import {
  BLOCK_SIZE,
  MAX_LIQUID_LEVEL,
  MATERIALS,
  MATERIAL_KEYS,
  WORLD_RENDER_SIZE,
  advanceFire,
  advanceWorldStep,
  cellToWorld,
  createRandomWorld,
  getLiquidLevel,
  hasBlock,
  isInWorld,
  isValidWorld,
  settlePlacedBlockOnLiquid,
  worldToCell,
  type BlockMaterial,
  type Cell,
  type VoxelBlock,
} from './game/world';
import {
  ABILITIES,
  ABILITY_RADIUS,
  ABILITY_KEYS,
  applyAbility,
  countEligibleBlocks,
  type AbilityKey,
  type AbilityResult,
} from './game/abilities';
import { getBlockTextures } from './visuals/blockTextures';
import { AnimalModel } from './visuals/AnimalModel';

type Tool = 'place' | 'erase' | 'animal' | 'ability';
type HoverTarget = Cell & { blockId?: string; valid: boolean };

const STORAGE_KEY = 'voxel-world-v2';
const ECOSYSTEM_STORAGE_KEY = 'voxel-ecosystem-v2';
const PAINT_INTERVAL_MS = 160;
const ABILITY_PAINT_INTERVAL_MS = 180;
const FIRE_TICK_MS = 650;
const WORLD_TICK_MS = 140;
const LIQUID_TICK_DIVISOR = 3;
const CAMERA_MOVE_SPEED = 5;
const CAMERA_TARGET_LIMIT = WORLD_RENDER_SIZE / 2;
const CAMERA_MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const ABILITY_PREVIEW_COLORS: Record<AbilityKey, { fill: string; edge: string }> = {
  'verdant-touch': { fill: '#8dcc70', edge: '#3f754c' },
  wildfire: { fill: '#ee8a47', edge: '#a8442a' },
  rain: { fill: '#79b9d1', edge: '#3f7590' },
  'deep-freeze': { fill: '#8ed8e4', edge: '#487f9b' },
  thaw: { fill: '#edc45c', edge: '#9b6a22' },
};
const FLOWER_COLORS = ['#f2a6ba', '#f1ca54', '#9fb5ef', '#d99ee9', '#ef9366', '#f2eee1'] as const;
const SHORT_GRASS_BLADES = [
  [-0.18, -0.08, 0.08, 0.86],
  [-0.06, 0.13, -0.06, 0.74],
  [0.07, -0.03, 0.05, 1],
  [0.19, 0.11, -0.08, 0.82],
] as const;
const TALL_GRASS_BLADES = [
  [-0.22, -0.1, 0.07, 0.88],
  [-0.1, 0.15, -0.08, 0.76],
  [0, -0.02, 0.04, 1],
  [0.11, 0.14, 0.08, 0.82],
  [0.22, -0.1, -0.07, 0.9],
] as const;

function flowerColorFor(id: string) {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return FLOWER_COLORS[(hash >>> 0) % FLOWER_COLORS.length];
}

function loadWorld() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    return isValidWorld(parsed) ? convertCoveredGrassToSoil(parsed) : createRandomWorld();
  } catch {
    return createRandomWorld();
  }
}

function loadEcosystem(blocks: VoxelBlock[]) {
  try {
    const saved = localStorage.getItem(ECOSYSTEM_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    return migrateEcosystem(parsed) ?? createInitialEcosystem(blocks);
  } catch {
    return createInitialEcosystem(blocks);
  }
}

function BurningEffect() {
  const flames = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!flames.current) return;
    const flicker = 0.88 + Math.sin(clock.elapsedTime * 13) * 0.12;
    flames.current.scale.set(1, flicker, 1);
    flames.current.rotation.y = Math.sin(clock.elapsedTime * 4) * 0.16;
  });

  return (
    <group ref={flames} position={[0, BLOCK_SIZE * 0.72, 0]}>
      <mesh position={[-BLOCK_SIZE * 0.16, 0, 0]}>
        <coneGeometry args={[BLOCK_SIZE * 0.18, BLOCK_SIZE * 0.62, 5]} />
        <meshBasicMaterial color="#ff7a20" toneMapped={false} />
      </mesh>
      <mesh position={[BLOCK_SIZE * 0.13, -BLOCK_SIZE * 0.04, BLOCK_SIZE * 0.08]}>
        <coneGeometry args={[BLOCK_SIZE * 0.14, BLOCK_SIZE * 0.45, 5]} />
        <meshBasicMaterial color="#ffd34e" toneMapped={false} />
      </mesh>
      <pointLight color="#ff6b1a" intensity={0.9} distance={1.4} decay={2} />
    </group>
  );
}

function CameraKeyboardControls() {
  const pressedKeys = useRef(new Set<string>());
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const movement = useMemo(() => new Vector3(), []);
  const nextTarget = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]'),
      );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !CAMERA_MOVE_KEYS.has(event.code) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) return;
      event.preventDefault();
      pressedKeys.current.add(event.code);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };
    const clearKeys = () => pressedKeys.current.clear();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useFrame(({ camera, controls }, delta) => {
    const forwardAmount = Number(pressedKeys.current.has('KeyW')) -
      Number(pressedKeys.current.has('KeyS'));
    const rightAmount = Number(pressedKeys.current.has('KeyD')) -
      Number(pressedKeys.current.has('KeyA'));
    if ((!forwardAmount && !rightAmount) || !controls) return;

    const orbit = controls as { target?: Vector3; update?: () => void };
    if (!orbit.target) return;
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    movement
      .copy(forward)
      .multiplyScalar(forwardAmount)
      .addScaledVector(right, rightAmount);
    if (movement.lengthSq() > 1) movement.normalize();
    movement.multiplyScalar(CAMERA_MOVE_SPEED * Math.min(delta, 0.05));

    nextTarget.copy(orbit.target).add(movement);
    nextTarget.x = Math.max(-CAMERA_TARGET_LIMIT, Math.min(CAMERA_TARGET_LIMIT, nextTarget.x));
    nextTarget.z = Math.max(-CAMERA_TARGET_LIMIT, Math.min(CAMERA_TARGET_LIMIT, nextTarget.z));
    movement.set(
      nextTarget.x - orbit.target.x,
      0,
      nextTarget.z - orbit.target.z,
    );
    camera.position.add(movement);
    orbit.target.add(movement);
    orbit.update?.();
  });

  return null;
}

const AnimatedBlock = memo(function AnimatedBlock({
  block,
  onHover,
  onLeave,
  onSelect,
  onPaintStart,
}: {
  block: VoxelBlock;
  onHover: (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => void;
  onLeave: () => void;
  onSelect: (event: ThreeEvent<MouseEvent>, block: VoxelBlock) => void;
  onPaintStart: (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => void;
}) {
  const group = useRef<Group>(null);
  const colors = MATERIALS[block.material];
  const blockHeight = colors.gravityBehavior === 'fluid'
    ? BLOCK_SIZE * getLiquidLevel(block) / MAX_LIQUID_LEVEL
    : BLOCK_SIZE;
  const target = useMemo(
    () =>
      new Vector3(
        cellToWorld(block.x),
        cellToWorld(block.y) + blockHeight / 2,
        cellToWorld(block.z),
      ),
    [block.x, block.y, block.z, blockHeight],
  );
  const initialPosition = useRef(target.clone()).current;
  const grassCapHeight = block.material === 'grass' ? BLOCK_SIZE * 0.06 : 0;
  const textures = useMemo(() => getBlockTextures(block.material), [block.material]);
  const faceTextures = useMemo(
    () => [
      textures.side,
      textures.side,
      textures.top,
      textures.bottom,
      textures.side,
      textures.side,
    ],
    [textures],
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    const strength = 1 - Math.exp(-delta * 13);
    group.current.position.lerp(target, strength);
  });

  return (
    <group
      ref={group}
      position={initialPosition}
      onPointerMove={(event) => onHover(event, block)}
      onPointerDown={(event) => onPaintStart(event, block)}
      onPointerOut={onLeave}
      onClick={(event) => onSelect(event, block)}
    >
      <mesh position={[0, -grassCapHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BLOCK_SIZE, blockHeight - grassCapHeight, BLOCK_SIZE]} />
        {faceTextures.map((map, index) => (
          <meshStandardMaterial
            key={index}
            attach={`material-${index}`}
            map={map}
            color="#ffffff"
            roughness={colors.roughness ?? 0.82}
            metalness={colors.metalness ?? 0}
            transparent={(colors.opacity ?? 1) < 1}
            opacity={colors.opacity ?? 1}
            depthWrite={(colors.opacity ?? 1) >= 0.7}
            emissive={block.burning ? '#ff541c' : colors.emissive}
            emissiveIntensity={block.burning ? 0.72 : (colors.emissiveIntensity ?? 0)}
          />
        ))}
        <Edges threshold={22} color={colors.edge} opacity={0.42} transparent />
      </mesh>
      {block.material === 'grass' && (
        <mesh position={[0, BLOCK_SIZE / 2 - grassCapHeight / 2, 0]} castShadow>
          <boxGeometry args={[BLOCK_SIZE, grassCapHeight, BLOCK_SIZE]} />
          <meshStandardMaterial map={textures.top} color="#ffffff" roughness={0.94} />
        </mesh>
      )}
      {block.burning && <BurningEffect />}
    </group>
  );
});

const VegetationSprout = memo(function VegetationSprout({
  growth,
  block,
}: {
  growth: Vegetation;
  block: VoxelBlock;
}) {
  const kelp = growth.kind === 'kelp';
  const tallGrass = growth.kind === 'tall-grass';
  const height = tallGrass ? BLOCK_SIZE * 0.88 : BLOCK_SIZE * 0.46;
  const bladeWidth = tallGrass ? BLOCK_SIZE * 0.085 : BLOCK_SIZE * 0.075;
  const bladeColor = growth.kind === 'tall-grass' ? '#4f873e' : '#6da24b';
  const flowerColor = flowerColorFor(growth.id);
  const bladeOffsets = tallGrass ? TALL_GRASS_BLADES : SHORT_GRASS_BLADES;

  return (
    <group
      position={[
        cellToWorld(block.x),
        kelp ? cellToWorld(block.y) + 0.003 : cellToWorld(block.y + 1) + 0.003,
        cellToWorld(block.z),
      ]}
    >
      {kelp ? (
        <>
          {[-0.18, 0, 0.18].map((x, index) => (
            <mesh
              key={x}
              position={[BLOCK_SIZE * x, BLOCK_SIZE * (0.34 + index * 0.05), 0]}
              rotation={[0, 0, (index - 1) * 0.18]}
            >
              <boxGeometry args={[BLOCK_SIZE * 0.1, BLOCK_SIZE * (0.68 + index * 0.1), BLOCK_SIZE * 0.08]} />
              <meshStandardMaterial color={index === 1 ? '#377e5a' : '#4b9566'} roughness={0.88} />
            </mesh>
          ))}
        </>
      ) : growth.kind === 'sapling' ? (
        <>
          <mesh position={[0, BLOCK_SIZE * 0.22, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.1, BLOCK_SIZE * 0.44, BLOCK_SIZE * 0.1]} />
            <meshStandardMaterial color="#765038" roughness={0.96} />
          </mesh>
          <mesh position={[0, BLOCK_SIZE * 0.48, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.48, BLOCK_SIZE * 0.32, BLOCK_SIZE * 0.42]} />
            <meshStandardMaterial color="#5d8c47" roughness={0.94} />
          </mesh>
          <mesh position={[BLOCK_SIZE * 0.13, BLOCK_SIZE * 0.61, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.26, BLOCK_SIZE * 0.22, BLOCK_SIZE * 0.28]} />
            <meshStandardMaterial color="#78a454" roughness={0.94} />
          </mesh>
        </>
      ) : growth.kind === 'flower' ? (
        <>
          <mesh position={[0, BLOCK_SIZE * 0.2, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.045, BLOCK_SIZE * 0.4, BLOCK_SIZE * 0.045]} />
            <meshStandardMaterial color="#4f873e" roughness={0.95} />
          </mesh>
          <mesh position={[0, BLOCK_SIZE * 0.42, 0]} castShadow>
            <sphereGeometry args={[BLOCK_SIZE * 0.11, 7, 5]} />
            <meshStandardMaterial color={flowerColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, BLOCK_SIZE * 0.42, BLOCK_SIZE * 0.085]}>
            <sphereGeometry args={[BLOCK_SIZE * 0.045, 6, 4]} />
            <meshStandardMaterial color="#e5b83d" roughness={0.8} />
          </mesh>
        </>
      ) : (
        bladeOffsets.map(([x, z, tilt, heightScale], index) => (
          <mesh
            key={`${x}:${z}`}
            position={[BLOCK_SIZE * x, height * heightScale / 2, BLOCK_SIZE * z]}
            rotation={[index % 2 ? 0.08 : -0.06, index * 0.72, tilt]}
            castShadow
          >
            <boxGeometry args={[bladeWidth, height * heightScale, BLOCK_SIZE * 0.055]} />
            <meshStandardMaterial color={bladeColor} roughness={0.96} />
          </mesh>
        ))
      )}
    </group>
  );
});

function WorldScene({
  blocks,
  ecosystem,
  tool,
  animalKind,
  activeAbility,
  onAdd,
  onRemove,
  onSpawnAnimal,
  onApplyAbility,
  onInspectHuman,
}: {
  blocks: VoxelBlock[];
  ecosystem: EcosystemState;
  tool: Tool;
  animalKind: AnimalKind;
  activeAbility: AbilityKey;
  onAdd: (cell: Cell) => void;
  onRemove: (id: string) => void;
  onSpawnAnimal: (x: number, z: number) => void;
  onApplyAbility: (x: number, z: number) => void;
  onInspectHuman: (animal: Animal) => void;
}) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const painting = useRef(false);
  const lastPaintAt = useRef(-Infinity);
  const surfaceByColumn = useMemo(() => createSurfaceIndex(blocks), [blocks]);
  const animalSurfaceByColumn = useMemo(
    () => createAnimalSurfaceIndex(blocks),
    [blocks],
  );
  const blocksById = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks],
  );
  const surfaceAt = useCallback(
    (x: number, z: number) => surfaceByColumn.get(`${x},${z}`),
    [surfaceByColumn],
  );
  const animalSurfaceAt = useCallback(
    (x: number, z: number) => animalSurfaceByColumn.get(`${x},${z}`),
    [animalSurfaceByColumn],
  );

  useEffect(() => {
    const stopPainting = () => {
      painting.current = false;
    };
    window.addEventListener('pointerup', stopPainting);
    window.addEventListener('pointercancel', stopPainting);
    return () => {
      window.removeEventListener('pointerup', stopPainting);
      window.removeEventListener('pointercancel', stopPainting);
    };
  }, []);

  const getAdjacentCell = useCallback(
    (event: ThreeEvent<PointerEvent | MouseEvent>, block: VoxelBlock): Cell => {
      const normal = event.face?.normal;
      return {
        x: block.x + Math.round(normal?.x ?? 0),
        y: block.y + Math.round(normal?.y ?? 1),
        z: block.z + Math.round(normal?.z ?? 0),
      };
    },
    [],
  );

  const paintCell = (event: ThreeEvent<PointerEvent>, cell: Cell, immediate = false) => {
    if (
      tool !== 'place' ||
      !event.shiftKey ||
      (!immediate && (!painting.current || (event.buttons & 1) === 0))
    ) {
      if (!event.shiftKey || (event.buttons & 1) === 0) painting.current = false;
      return;
    }

    const now = performance.now();
    if (!immediate && now - lastPaintAt.current < PAINT_INTERVAL_MS) return;
    lastPaintAt.current = now;
    if (isInWorld(cell) && !hasBlock(blocks, cell)) onAdd(cell);
  };

  const paintAbility = (
    event: ThreeEvent<PointerEvent>,
    target: Pick<Cell, 'x' | 'z'>,
    immediate = false,
  ) => {
    if (
      tool !== 'ability' ||
      (!immediate && (!painting.current || (event.buttons & 1) === 0))
    ) {
      if ((event.buttons & 1) === 0) painting.current = false;
      return;
    }

    const now = performance.now();
    if (!immediate && now - lastPaintAt.current < ABILITY_PAINT_INTERVAL_MS) return;
    lastPaintAt.current = now;
    onApplyAbility(target.x, target.z);
  };

  const hoverBlock = (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => {
    if ((event.buttons & 2) !== 0) {
      setHover(null);
      return;
    }
    event.stopPropagation();
    if (tool === 'ability') {
      const surface = surfaceAt(block.x, block.z) ?? block;
      const target = { x: block.x, z: block.z };
      setHover({
        ...target,
        y: surface.y,
        blockId: surface.id,
        valid: applyAbility(blocks, activeAbility, target).changed,
      });
      paintAbility(event, target);
      return;
    }
    if (tool === 'erase') {
      setHover({ x: block.x, y: block.y, z: block.z, blockId: block.id, valid: true });
      return;
    }
    if (tool === 'animal') {
      const surface = animalSurfaceAt(block.x, block.z);
      const occupied = ecosystem.animals.some(
        (animal) => animal.x === block.x && animal.z === block.z,
      );
      setHover({
        x: block.x,
        y: block.y + 1,
        z: block.z,
        blockId: block.id,
        valid:
          surface?.id === block.id &&
          !block.burning &&
          block.material !== 'lava' &&
          (!isAquaticAnimal(animalKind) || block.material === 'water') &&
          !occupied,
      });
      return;
    }
    const cell = getAdjacentCell(event, block);
    setHover({ ...cell, valid: isInWorld(cell) && !hasBlock(blocks, cell) });
    paintCell(event, cell);
  };

  const startPaintingOnBlock = (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => {
    if (tool === 'ability' && event.button === 0) {
      event.stopPropagation();
      painting.current = true;
      paintAbility(event, { x: block.x, z: block.z }, true);
      return;
    }
    if (tool !== 'place' || event.button !== 0 || !event.shiftKey) return;
    event.stopPropagation();
    painting.current = true;
    paintCell(event, getAdjacentCell(event, block), true);
  };

  const selectBlock = (event: ThreeEvent<MouseEvent>, block: VoxelBlock) => {
    event.stopPropagation();
    if (event.delta > 3 || event.shiftKey) return;
    if (tool === 'ability') return;
    if (tool === 'erase') {
      onRemove(block.id);
      setHover(null);
      return;
    }
    if (tool === 'animal') {
      const surface = animalSurfaceAt(block.x, block.z);
      const occupied = ecosystem.animals.some(
        (animal) => animal.x === block.x && animal.z === block.z,
      );
      if (
        surface?.id === block.id &&
        !block.burning &&
        block.material !== 'lava' &&
        (!isAquaticAnimal(animalKind) || block.material === 'water') &&
        !occupied
      ) {
        onSpawnAnimal(block.x, block.z);
        setHover(null);
      }
      return;
    }
    const cell = getAdjacentCell(event, block);
    if (isInWorld(cell) && !hasBlock(blocks, cell)) onAdd(cell);
  };

  const planeCell = (event: ThreeEvent<PointerEvent | MouseEvent>): Cell => ({
    x: worldToCell(event.point.x),
    y: 0,
    z: worldToCell(event.point.z),
  });
  const blockInteractions = useRef({ hoverBlock, startPaintingOnBlock, selectBlock });
  blockInteractions.current = { hoverBlock, startPaintingOnBlock, selectBlock };
  const handleBlockHover = useCallback(
    (event: ThreeEvent<PointerEvent>, block: VoxelBlock) =>
      blockInteractions.current.hoverBlock(event, block),
    [],
  );
  const handleBlockPaintStart = useCallback(
    (event: ThreeEvent<PointerEvent>, block: VoxelBlock) =>
      blockInteractions.current.startPaintingOnBlock(event, block),
    [],
  );
  const handleBlockSelect = useCallback(
    (event: ThreeEvent<MouseEvent>, block: VoxelBlock) =>
      blockInteractions.current.selectBlock(event, block),
    [],
  );
  const handlePointerLeave = useCallback(() => setHover(null), []);

  return (
    <>
      <color attach="background" args={['#dfeee5']} />
      <fog attach="fog" args={['#dfeee5', 19, 38]} />
      <ambientLight intensity={1.55} />
      <hemisphereLight args={['#f6fff5', '#789180', 1.2]} />
      <directionalLight
        position={[9, 15, 7]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />

      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(event) => {
          if (tool !== 'place' && tool !== 'ability') return;
          if ((event.buttons & 2) !== 0) {
            setHover(null);
            return;
          }
          event.stopPropagation();
          const cell = planeCell(event);
          if (tool === 'ability') {
            const target = { x: cell.x, z: cell.z };
            setHover({
              ...cell,
              valid: applyAbility(blocks, activeAbility, target).changed,
            });
            paintAbility(event, target);
          } else {
            setHover({ ...cell, valid: isInWorld(cell) && !hasBlock(blocks, cell) });
            paintCell(event, cell);
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (tool === 'ability') {
            event.stopPropagation();
            painting.current = true;
            const cell = planeCell(event);
            paintAbility(event, { x: cell.x, z: cell.z }, true);
            return;
          }
          if (tool !== 'place' || !event.shiftKey) return;
          event.stopPropagation();
          painting.current = true;
          paintCell(event, planeCell(event), true);
        }}
        onPointerOut={() => setHover(null)}
        onClick={(event) => {
          if (tool === 'ability') {
            event.stopPropagation();
            return;
          }
          if (tool !== 'place' || event.delta > 3 || event.shiftKey) return;
          event.stopPropagation();
          const cell = planeCell(event);
          if (isInWorld(cell) && !hasBlock(blocks, cell)) onAdd(cell);
        }}
      >
        <planeGeometry args={[WORLD_RENDER_SIZE, WORLD_RENDER_SIZE]} />
        <meshStandardMaterial color="#e9e6d8" roughness={0.98} />
      </mesh>

      <Grid
        position={[0, 0.012, 0]}
        args={[WORLD_RENDER_SIZE, WORLD_RENDER_SIZE]}
        cellSize={BLOCK_SIZE}
        sectionSize={1}
        cellColor="#aab9a6"
        sectionColor="#7f9681"
        cellThickness={0.3}
        sectionThickness={0.9}
        fadeDistance={31}
        infiniteGrid={false}
      />

      {blocks.map((block) => (
        <AnimatedBlock
          key={block.id}
          block={block}
          onHover={handleBlockHover}
          onLeave={handlePointerLeave}
          onSelect={handleBlockSelect}
          onPaintStart={handleBlockPaintStart}
        />
      ))}

      {ecosystem.vegetation.map((growth) => {
        const block = blocksById.get(growth.blockId);
        const surface = block && surfaceAt(block.x, block.z);
        const supported = growth.kind === 'kelp'
          ? block?.material === 'water'
          : block?.material === 'grass';
        return supported && block && !block.burning && surface?.id === block.id
          ? <VegetationSprout key={growth.id} growth={growth} block={block} />
          : null;
      })}

      {ecosystem.animals.map((animal) => {
        const surface = animalSurfaceAt(animal.x, animal.z);
        return surface
          ? (
              <AnimalModel
                key={animal.id}
                animal={animal}
                surfaceY={surface.y}
                inWater={surface.material === 'water'}
                onInspect={onInspectHuman}
              />
            )
          : null;
      })}

      {hover && tool === 'ability' && (
        <group
          position={[
            cellToWorld(hover.x),
            hover.blockId ? cellToWorld(hover.y) + BLOCK_SIZE + 0.012 : 0.012,
            cellToWorld(hover.z),
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <mesh>
            <circleGeometry args={[(ABILITY_RADIUS + 0.5) * BLOCK_SIZE, 32]} />
            <meshBasicMaterial
              color={hover.valid ? ABILITY_PREVIEW_COLORS[activeAbility].fill : '#b96a57'}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.003]}>
            <ringGeometry
              args={[
                (ABILITY_RADIUS + 0.34) * BLOCK_SIZE,
                (ABILITY_RADIUS + 0.5) * BLOCK_SIZE,
                32,
              ]}
            />
            <meshBasicMaterial
              color={hover.valid ? ABILITY_PREVIEW_COLORS[activeAbility].edge : '#914c3d'}
              transparent
              opacity={0.78}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {hover && tool !== 'ability' && (
        <mesh
          position={[
            cellToWorld(hover.x),
            cellToWorld(hover.y) + BLOCK_SIZE / 2,
            cellToWorld(hover.z),
          ]}
        >
          <boxGeometry args={[BLOCK_SIZE * 1.08, BLOCK_SIZE * 1.08, BLOCK_SIZE * 1.08]} />
          <meshStandardMaterial
            color={
              tool === 'erase'
                ? '#cc6d55'
                : hover.valid
                  ? tool === 'animal' ? '#a9df9a' : '#e6ed88'
                  : '#cc6d55'
            }
            transparent
            opacity={0.48}
            depthWrite={false}
          />
          <Edges color={tool === 'erase' || !hover.valid ? '#974b3d' : '#557348'} />
        </mesh>
      )}

      <OrbitControls
        makeDefault
        target={[0, 0.8, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={7}
        maxDistance={28}
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI / 2.08}
        mouseButtons={{
          LEFT: -1 as MOUSE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.ROTATE,
        }}
      />
      <CameraKeyboardControls />
    </>
  );
}

function BlockPalette({
  className,
  material,
  tool,
  activeAbility,
  onSelectMaterial,
  onSelectDelete,
}: {
  className: string;
  material: BlockMaterial;
  tool: Tool;
  activeAbility: AbilityKey;
  onSelectMaterial: (material: BlockMaterial) => void;
  onSelectDelete: () => void;
}) {
  const selectedLabel = tool === 'erase' ? 'Delete' : MATERIALS[material].label;

  return (
    <div className={className}>
      <div className="selection-readout" role="status" aria-live="polite" aria-atomic="true">
        {tool === 'animal' ? (
          <span className="selection-chip animal-chip"><PawPrint size={10} /></span>
        ) : tool === 'ability' ? (
          <span className="selection-chip ability-chip"><Sparkles size={10} /></span>
        ) : tool === 'erase' ? (
          <span className="selection-chip delete-chip"><Trash2 size={12} /></span>
        ) : (
          <span
            className="selection-chip"
            style={{
              backgroundColor: MATERIALS[material].color,
              backgroundImage: `url(${getBlockTextures(material).preview})`,
            }}
          />
        )}
        <span>
          {tool === 'animal'
            ? <><strong>Animal</strong> tool active</>
            : tool === 'ability'
              ? <><strong>{ABILITIES[activeAbility].label}</strong> brush active</>
            : <><strong>{selectedLabel}</strong> selected</>}
        </span>
      </div>
      <div className="swatches" aria-label="Block material">
        <button
          className={`swatch delete-swatch ${tool === 'erase' ? 'selected' : ''}`}
          aria-label="Delete block"
          aria-pressed={tool === 'erase'}
          title="Delete"
          type="button"
          onClick={onSelectDelete}
        >
          <Trash2 size={13} />
        </button>
        {MATERIAL_KEYS.map((key) => (
          <button
            key={key}
            className={`swatch ${tool === 'place' && material === key ? 'selected' : ''}`}
            aria-label={`${MATERIALS[key].label} block`}
            aria-pressed={tool === 'place' && material === key}
            title={MATERIALS[key].label}
            type="button"
            style={{
              backgroundColor: MATERIALS[key].color,
              backgroundImage: `url(${getBlockTextures(key).preview})`,
            }}
            onClick={() => onSelectMaterial(key)}
          />
        ))}
      </div>
    </div>
  );
}

const ABILITY_ICONS = {
  'verdant-touch': Sprout,
  wildfire: Flame,
  rain: CloudRain,
  'deep-freeze': Snowflake,
  thaw: Sun,
} satisfies Record<AbilityKey, typeof Sprout>;

function PowerPanel({
  results,
  message,
  activeAbility,
  onActivate,
}: {
  results: Record<AbilityKey, AbilityResult>;
  message: string;
  activeAbility: AbilityKey | null;
  onActivate: (ability: AbilityKey) => void;
}) {
  return (
    <aside className="power-panel" aria-label="God powers">
      <div className="power-heading">
        <p className="eyebrow">POWERS</p>
        <span>{ABILITY_KEYS.length} abilities</span>
      </div>
      <div className="power-list">
        {ABILITY_KEYS.map((key) => {
          const ability = ABILITIES[key];
          const result = results[key];
          const Icon = ABILITY_ICONS[key];
          const isActive = activeAbility === key;
          return (
            <button
              key={key}
              className={`power-button power-${key} ${isActive ? 'active' : ''}`}
              type="button"
              disabled={!result.changed}
              aria-pressed={isActive}
              aria-label={`${ability.label}: ${ability.description}`}
              title={`${ability.label} — ${ability.description}`}
              onClick={() => onActivate(key)}
            >
              <span className="power-icon"><Icon size={16} /></span>
              <span>
                <strong>{ability.label}</strong>
                <small>{ability.description}</small>
              </span>
              <b className="power-count">area</b>
            </button>
          );
        })}
      </div>
      <p className="power-status" role="status" aria-live="polite" aria-atomic="true">
        {message || 'Choose a power, then left-click or drag its area brush over the world.'}
      </p>
    </aside>
  );
}

function HumanInspector({ human, onClose }: { human: Animal; onClose: () => void }) {
  if (human.kind !== 'human' || !human.traits) return null;
  const activity = human.isBaby
    ? `Growing up — ${Math.max(0, HUMAN_CHILDHOOD_TICKS - human.age)} ticks left`
    : human.crafting
      ? `Crafting ${human.crafting}`
      : human.heldItem
        ? `Carrying ${human.heldItem}`
        : 'Choosing the next task';
  const parents = human.parentIds?.map((id) => humanDisplayName({ id })).join(' + ');

  return (
    <aside className="human-inspector" aria-label={`${humanDisplayName(human)} traits`}>
      <div className="human-inspector-heading">
        <span className="human-portrait" aria-hidden="true">🧑</span>
        <span>
          <small>HUMAN · GENERATION {human.generation ?? 0}</small>
          <strong>{humanDisplayName(human)}</strong>
        </span>
        <button type="button" onClick={onClose} aria-label="Close human details">
          <X size={14} />
        </button>
      </div>
      <p className="human-activity">{activity}</p>
      <div className="human-vitals">
        <span>Hunger <strong>{human.hunger}</strong></span>
        <span>Health <strong>{human.health}</strong></span>
        <span>Tools <strong>{human.tools?.length ?? 0}/3</strong></span>
        <span>Equipped <strong>{human.activeTool ?? 'none'}</strong></span>
      </div>
      <div className="human-traits">
        {HUMAN_TRAIT_KEYS.map((trait) => {
          const value = human.traits![trait];
          const definition = HUMAN_TRAITS[trait];
          return (
            <div className="human-trait" key={trait} title={`${definition.low} ↔ ${definition.high}`}>
              <span>{definition.label}</span>
              <i><b style={{ width: `${value}%` }} /></i>
              <em>{value}</em>
            </div>
          );
        })}
      </div>
      <p className="human-lineage">
        {parents ? `Parents: ${parents}` : 'Founder — no recorded parents'}
      </p>
    </aside>
  );
}

export default function Game() {
  const [blocks, setBlocks] = useState<VoxelBlock[]>(loadWorld);
  const [ecosystem, setEcosystem] = useState<EcosystemState>(() => loadEcosystem(blocks));
  const [tool, setTool] = useState<Tool>('place');
  const [material, setMaterial] = useState<BlockMaterial>('grass');
  const [animalKind, setAnimalKind] = useState<AnimalKind>('sheep');
  const [activeAbility, setActiveAbility] = useState<AbilityKey>('verdant-touch');
  const [gravityOn, setGravityOn] = useState(true);
  const [past, setPast] = useState<VoxelBlock[][]>([]);
  const [future, setFuture] = useState<VoxelBlock[][]>([]);
  const [settling, setSettling] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [powerMessage, setPowerMessage] = useState('');
  const [inspectedHumanId, setInspectedHumanId] = useState<string | null>(null);
  const idCounter = useRef(0);
  const worldTickCounter = useRef(0);
  const blocksRef = useRef(blocks);
  const ecosystemRef = useRef(ecosystem);
  const burningCount = blocks.filter((block) => block.burning).length;
  const fireActive = useMemo(() => advanceFire(blocks).changed, [blocks]);
  const abilityResults = useMemo(
    () => ABILITY_KEYS.reduce((results, key) => {
      const affected = countEligibleBlocks(blocks, key);
      results[key] = { blocks, changed: affected > 0, affected };
      return results;
    }, {} as Record<AbilityKey, AbilityResult>),
    [blocks],
  );
  const inspectedHuman = inspectedHumanId
    ? ecosystem.animals.find((animal) => animal.id === inspectedHumanId && animal.kind === 'human')
    : undefined;

  useEffect(() => {
    if (inspectedHumanId && !inspectedHuman) setInspectedHumanId(null);
  }, [inspectedHuman, inspectedHumanId]);

  useEffect(() => {
    blocksRef.current = blocks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    ecosystemRef.current = ecosystem;
    localStorage.setItem(ECOSYSTEM_STORAGE_KEY, JSON.stringify(ecosystem));
  }, [ecosystem]);

  useEffect(() => {
    if (!fireActive) return;
    const fireTimer = window.setInterval(() => {
      const fire = advanceFire(blocksRef.current);
      if (!fire.changed) return;
      blocksRef.current = fire.blocks;
      setBlocks(fire.blocks);
      if (gravityOn && fire.burned > 0) setSettling(true);
    }, FIRE_TICK_MS);

    return () => window.clearInterval(fireTimer);
  }, [fireActive, gravityOn]);

  useEffect(() => {
    if (!gravityOn) {
      worldTickCounter.current = 0;
      setSettling(false);
      return;
    }

    const worldTimer = window.setInterval(() => {
      worldTickCounter.current = (worldTickCounter.current + 1) % LIQUID_TICK_DIVISOR;
      const step = advanceWorldStep(
        blocksRef.current,
        worldTickCounter.current === 0,
      );
      if (!step.moved) {
        setSettling(false);
        return;
      }
      const nextBlocks = convertCoveredGrassToSoil(step.blocks);
      blocksRef.current = nextBlocks;
      setBlocks(nextBlocks);
      setSettling(true);
    }, WORLD_TICK_MS);

    return () => window.clearInterval(worldTimer);
  }, [gravityOn]);

  useEffect(() => {
    const ecosystemTimer = window.setInterval(() => {
      const result = advanceEcosystem(blocksRef.current, ecosystemRef.current);
      blocksRef.current = result.blocks;
      ecosystemRef.current = result.ecosystem;
      setBlocks(result.blocks);
      setEcosystem(result.ecosystem);
    }, ECOSYSTEM_TICK_MS);

    return () => window.clearInterval(ecosystemTimer);
  }, []);

  const commit = (next: VoxelBlock[], didMove = false) => {
    const nextBlocks = convertCoveredGrassToSoil(next);
    if (nextBlocks === blocks) return;
    setPast((history) => [...history.slice(-29), blocks]);
    setFuture([]);
    blocksRef.current = nextBlocks;
    setBlocks(nextBlocks);
    setWelcomeVisible(false);
    if (didMove) setSettling(true);
  };

  const addBlock = (cell: Cell) => {
    if (hasBlock(blocks, cell) || !isInWorld(cell)) return;
    const placed: VoxelBlock = {
      id: `created-${Date.now()}-${idCounter.current++}`,
      ...cell,
      material,
    };
    const added = [...blocks, placed];
    const displaced = settlePlacedBlockOnLiquid(added, placed.id);
    commit(displaced.blocks, gravityOn || displaced.moved);
  };

  const removeBlock = (id: string) => {
    const remaining = blocks.filter((block) => block.id !== id);
    commit(remaining, gravityOn);
  };

  const selectAnimal = (kind: AnimalKind) => {
    setAnimalKind(kind);
    setTool('animal');
  };

  const spawnSelectedAnimal = (x: number, z: number) => {
    const next = spawnAnimal(blocks, ecosystem, animalKind, x, z);
    if (next === ecosystem) return;
    ecosystemRef.current = next;
    setEcosystem(next);
    setWelcomeVisible(false);
  };

  const toggleGravity = () => {
    if (gravityOn) {
      setGravityOn(false);
      setSettling(false);
      return;
    }
    setGravityOn(true);
    setSettling(true);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === '1') setTool('place');
      if (event.key === '2') setTool('erase');
      if (event.key === '3') setTool('animal');
      if (event.key.toLowerCase() === 'g') toggleGravity();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [blocks, gravityOn]);

  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setPast((history) => history.slice(0, -1));
    setFuture((history) => [blocks, ...history].slice(0, 30));
    blocksRef.current = previous;
    setBlocks(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((history) => history.slice(1));
    setPast((history) => [...history.slice(-29), blocks]);
    blocksRef.current = next;
    setBlocks(next);
  };

  const resetWorld = () => {
    const starter = createRandomWorld();
    const freshEcosystem = createInitialEcosystem(starter);
    commit(starter);
    ecosystemRef.current = freshEcosystem;
    setEcosystem(freshEcosystem);
  };
  const clearWorld = () => {
    const emptyEcosystem = createInitialEcosystem([]);
    commit([]);
    ecosystemRef.current = emptyEcosystem;
    setEcosystem(emptyEcosystem);
  };
  const selectMaterial = (nextMaterial: BlockMaterial) => {
    setMaterial(nextMaterial);
    setTool('place');
  };
  const activateAbility = (ability: AbilityKey) => {
    if (!abilityResults[ability].changed) return;
    setActiveAbility(ability);
    setTool('ability');
    setPowerMessage(`${ABILITIES[ability].label} selected. Left-click or drag over the area to apply it.`);
  };
  const applyActiveAbilityAt = (x: number, z: number) => {
    const result = applyAbility(blocks, activeAbility, { x, z });
    if (!result.changed) return;
    commit(result.blocks, gravityOn && ABILITIES[activeAbility].triggersGravity);
    setPowerMessage(
      `${ABILITIES[activeAbility].label} affected ${result.affected} ${result.affected === 1 ? 'block' : 'blocks'}. Keep dragging to brush another area.`,
    );
  };

  return (
    <main className="game-shell">
      <div className="world-canvas" onContextMenu={(event) => event.preventDefault()}>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [11, 8.5, 11], fov: 42 }}
          gl={{ antialias: true, alpha: false }}
        >
          <WorldScene
            blocks={blocks}
            ecosystem={ecosystem}
            tool={tool}
            animalKind={animalKind}
            activeAbility={activeAbility}
            onAdd={addBlock}
            onRemove={removeBlock}
            onSpawnAnimal={spawnSelectedAnimal}
            onApplyAbility={applyActiveAbilityAt}
            onInspectHuman={(human) => setInspectedHumanId(human.id)}
          />
        </Canvas>
      </div>

      <header className="topbar">
        <div className="brand" aria-label="Voxel">
          <span className="brand-mark"><Box size={19} strokeWidth={2.4} /></span>
          <span className="brand-word">VOXEL</span>
        </div>
        <div className="world-title" aria-live="polite">
          <span>Procedural world</span>
          <small>{blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}</small>
        </div>
        <div className="top-actions">
          <button className="icon-button" type="button" aria-label="Undo" disabled={!past.length} onClick={undo}>
            <Undo2 size={17} />
          </button>
          <button className="icon-button" type="button" aria-label="Redo" disabled={!future.length} onClick={redo}>
            <Redo2 size={17} />
          </button>
          <button className="icon-button reset-button" type="button" aria-label="Generate a new random map and ecosystem" onClick={resetWorld}>
            <RotateCcw size={17} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      <aside className="tool-panel" aria-label="Creation tools">
        <p className="eyebrow tool-heading">CREATE</p>
        <button className={`tool ${tool === 'place' ? 'active' : ''}`} type="button" onClick={() => setTool('place')} aria-pressed={tool === 'place'}>
          <span className="tool-icon"><Box size={20} /></span>
          <span><strong>Place</strong><small>Add blocks</small></span>
          <kbd>1</kbd>
        </button>
        <button className={`tool ${tool === 'erase' ? 'active' : ''}`} type="button" onClick={() => setTool('erase')} aria-pressed={tool === 'erase'}>
          <span className="tool-icon"><Eraser size={20} /></span>
          <span><strong>Erase</strong><small>Remove blocks</small></span>
          <kbd>2</kbd>
        </button>
        <button className={`tool ${tool === 'animal' ? 'active' : ''}`} type="button" onClick={() => setTool('animal')} aria-pressed={tool === 'animal'}>
          <span className="tool-icon"><PawPrint size={20} /></span>
          <span><strong>Animals</strong><small>Spawn creatures</small></span>
          <kbd>3</kbd>
        </button>

        <div className="panel-rule" />
        <div className="material-heading">
          <p className="eyebrow">BLOCKS</p>
          <span>{MATERIAL_KEYS.length} + delete</span>
        </div>
        <BlockPalette
          className="material-picker"
          material={material}
          tool={tool}
          activeAbility={activeAbility}
          onSelectMaterial={selectMaterial}
          onSelectDelete={() => setTool('erase')}
        />

        <div className="panel-rule" />
        <div className="material-heading">
          <p className="eyebrow">ANIMALS</p>
          <span>{ANIMAL_KEYS.length} species</span>
        </div>
        <AnimalPalette
          className="animal-picker"
          animalKind={animalKind}
          tool={tool}
          onSelect={selectAnimal}
        />

        <div className="panel-rule action-rule" />
        <div className="world-actions">
          <button type="button" onClick={toggleGravity} className={gravityOn ? 'enabled' : ''}>
            {gravityOn ? <Pause size={15} /> : <Play size={15} />}
            {gravityOn ? 'Pause gravity' : 'Resume gravity'}
          </button>
          <button type="button" onClick={clearWorld} disabled={!blocks.length}>
            <Trash2 size={15} /> Clear world
          </button>
        </div>
      </aside>

      <PowerPanel
        results={abilityResults}
        message={powerMessage}
        activeAbility={tool === 'ability' ? activeAbility : null}
        onActivate={activateAbility}
      />

      <section className={`welcome-card ${welcomeVisible ? '' : 'dismissed'}`} aria-live="polite">
        <span className="welcome-icon"><Sparkles size={18} /></span>
        <div>
          <p>A NEW MAP IS READY</p>
          <strong>Shape it—and watch it grow.</strong>
        </div>
      </section>

      <div className="world-status" aria-label="World status">
        {settling ? <ArrowDown size={15} className="falling-icon" /> : <span className={`status-dot ${gravityOn ? '' : 'paused'}`} />}
        <span>{settling ? 'Blocks falling' : gravityOn ? 'Gravity on' : 'Gravity paused'}</span>
        <span className="status-rule" />
        {burningCount ? <Flame size={15} className="fire-icon" /> : <Leaf size={15} />}
        <span>
          {burningCount
            ? `${burningCount} ${burningCount === 1 ? 'block' : 'blocks'} burning`
            : ecosystem.vegetation.length
              ? `${ecosystem.vegetation.length} growing`
            : blocks.length
              ? 'World calm'
              : 'Blank canvas'}
        </span>
        <span className="status-rule" />
        <Heart size={15} />
        <span>{ecosystem.animals.length} {ecosystem.animals.length === 1 ? 'animal' : 'animals'}</span>
      </div>

      {inspectedHuman && (
        <HumanInspector human={inspectedHuman} onClose={() => setInspectedHumanId(null)} />
      )}

      <div className="controls-hint">
        <span><kbd>WASD</kbd> Move camera</span>
        <span><i className="mouse-icon right" /> Right-drag to orbit · right-click Humans for stats</span>
        <span>
          <i className="mouse-icon left" /> Left-click to {tool === 'animal'
            ? `spawn ${ANIMALS[animalKind].label.toLowerCase()}`
            : tool === 'ability'
              ? `use ${ABILITIES[activeAbility].label.toLowerCase()}`
            : tool}
        </span>
        {tool === 'place' && <span><kbd>Shift</kbd> + drag to pour</span>}
        {tool === 'ability' && <span>Drag to brush a small area</span>}
        <span><b>⌁</b> Scroll to zoom</span>
      </div>

      {tool === 'animal' ? (
        <AnimalPalette
          className="mobile-animal-picker"
          animalKind={animalKind}
          tool={tool}
          onSelect={selectAnimal}
        />
      ) : (
        <BlockPalette
          className="mobile-material-picker"
          material={material}
          tool={tool}
          activeAbility={activeAbility}
          onSelectMaterial={selectMaterial}
          onSelectDelete={() => setTool('erase')}
        />
      )}
    </main>
  );
}

function AnimalPalette({
  className,
  animalKind,
  tool,
  onSelect,
}: {
  className: string;
  animalKind: AnimalKind;
  tool: Tool;
  onSelect: (kind: AnimalKind) => void;
}) {
  const selected = ANIMALS[animalKind];

  return (
    <div className={className}>
      <div className="animal-selection" role="status" aria-live="polite" aria-atomic="true">
        <span className="animal-selection-emoji" aria-hidden="true">{selected.emoji}</span>
        <span>
          <strong>{selected.label}{tool === 'animal' ? ' selected' : ''}</strong>
          <small>
            Eats {selected.dietLabel}
            {animalKind === 'human' ? ' · Right-click a human to inspect stats' : ''}
          </small>
        </span>
      </div>
      <div className="animal-buttons" aria-label="Animals to spawn">
        {ANIMAL_KEYS.map((kind) => {
          const animal = ANIMALS[kind];
          const isSelected = tool === 'animal' && animalKind === kind;
          return (
            <button
              key={kind}
              className={`animal-button ${isSelected ? 'selected' : ''}`}
              type="button"
              aria-label={`Spawn ${animal.label}. Eats ${animal.dietLabel}.`}
              aria-pressed={isSelected}
              title={`${animal.label} — eats ${animal.dietLabel}`}
              onClick={() => onSelect(kind)}
            >
              <span aria-hidden="true">{animal.emoji}</span>
              <small>{animal.label}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
