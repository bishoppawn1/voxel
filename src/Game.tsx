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
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Group, MOUSE, Vector3 } from 'three';
import {
  ANIMALS,
  ANIMAL_KEYS,
  ECOSYSTEM_TICK_MS,
  advanceEcosystem,
  convertCoveredGrassToSoil,
  createInitialEcosystem,
  getSurfaceBlock,
  migrateEcosystem,
  spawnAnimal,
  type Animal,
  type AnimalKind,
  type EcosystemState,
  type Vegetation,
} from './game/ecosystem';
import {
  BLOCK_SIZE,
  MATERIALS,
  MATERIAL_KEYS,
  WORLD_RENDER_SIZE,
  advanceFire,
  advanceWorldStep,
  cellToWorld,
  createStarterWorld,
  hasBlock,
  isInWorld,
  isValidWorld,
  worldToCell,
  type BlockMaterial,
  type Cell,
  type VoxelBlock,
} from './game/world';
import {
  ABILITIES,
  ABILITY_KEYS,
  applyAbility,
  type AbilityKey,
  type AbilityResult,
} from './game/abilities';
import { getBlockTextures } from './visuals/blockTextures';

type Tool = 'place' | 'erase' | 'animal';
type HoverTarget = Cell & { blockId?: string; valid: boolean };

const STORAGE_KEY = 'voxel-world-v1';
const ECOSYSTEM_STORAGE_KEY = 'voxel-ecosystem-v1';
const PAINT_INTERVAL_MS = 160;
const FIRE_TICK_MS = 650;
const WORLD_TICK_MS = 140;

function loadWorld() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    return isValidWorld(parsed) ? convertCoveredGrassToSoil(parsed) : createStarterWorld();
  } catch {
    return createStarterWorld();
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

function AnimatedBlock({
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
  const target = useMemo(
    () =>
      new Vector3(
        cellToWorld(block.x),
        cellToWorld(block.y) + BLOCK_SIZE / 2,
        cellToWorld(block.z),
      ),
    [block.x, block.y, block.z],
  );
  const initialPosition = useRef(target.clone()).current;
  const colors = MATERIALS[block.material];
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
        <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE - grassCapHeight, BLOCK_SIZE]} />
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
}

function VegetationSprout({
  growth,
  block,
}: {
  growth: Vegetation;
  block: VoxelBlock;
}) {
  const height = growth.kind === 'tall-grass' ? BLOCK_SIZE * 0.62 : BLOCK_SIZE * 0.38;
  const bladeColor = growth.kind === 'tall-grass' ? '#4f873e' : '#6da24b';

  return (
    <group
      position={[
        cellToWorld(block.x),
        cellToWorld(block.y + 1) + 0.003,
        cellToWorld(block.z),
      ]}
    >
      {growth.kind === 'flower' ? (
        <>
          <mesh position={[0, BLOCK_SIZE * 0.2, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.045, BLOCK_SIZE * 0.4, BLOCK_SIZE * 0.045]} />
            <meshStandardMaterial color="#4f873e" roughness={0.95} />
          </mesh>
          <mesh position={[0, BLOCK_SIZE * 0.42, 0]} castShadow>
            <sphereGeometry args={[BLOCK_SIZE * 0.11, 7, 5]} />
            <meshStandardMaterial color="#f2a6ba" roughness={0.8} />
          </mesh>
          <mesh position={[0, BLOCK_SIZE * 0.42, BLOCK_SIZE * 0.085]}>
            <sphereGeometry args={[BLOCK_SIZE * 0.045, 6, 4]} />
            <meshStandardMaterial color="#e5b83d" roughness={0.8} />
          </mesh>
        </>
      ) : (
        [-0.16, 0, 0.16].map((offset, index) => (
          <mesh
            key={offset}
            position={[BLOCK_SIZE * offset, height / 2, BLOCK_SIZE * (index === 1 ? 0.12 : -0.08)]}
            rotation={[index === 1 ? 0.08 : -0.06, index * 0.9, index === 2 ? -0.14 : 0.12]}
            castShadow
          >
            <boxGeometry args={[BLOCK_SIZE * 0.045, height, BLOCK_SIZE * 0.035]} />
            <meshStandardMaterial color={bladeColor} roughness={0.96} />
          </mesh>
        ))
      )}
    </group>
  );
}

const ANIMAL_COLORS: Record<AnimalKind, {
  body: string;
  head: string;
  legs: string;
  accent: string;
  scale: number;
}> = {
  sheep: { body: '#f5f1df', head: '#4a4942', legs: '#4a4942', accent: '#ded8c4', scale: 1 },
  cow: { body: '#f0e6d6', head: '#76513b', legs: '#5c4336', accent: '#684531', scale: 1.08 },
  pig: { body: '#e9a4a1', head: '#edaeaa', legs: '#bb7978', accent: '#c77778', scale: 0.9 },
  rabbit: { body: '#c9bba5', head: '#b9aa93', legs: '#9b8b75', accent: '#e1a3a5', scale: 0.7 },
  goat: { body: '#d8d0bc', head: '#b8aa8d', legs: '#625c50', accent: '#8c7655', scale: 0.94 },
  fox: { body: '#d9682f', head: '#df7439', legs: '#342d2a', accent: '#f5e8d0', scale: 0.82 },
};

function AnimalModel({ animal, surfaceY }: { animal: Animal; surfaceY: number }) {
  const group = useRef<Group>(null);
  const target = useMemo(
    () =>
      new Vector3(
        cellToWorld(animal.x),
        cellToWorld(surfaceY + 1),
        cellToWorld(animal.z),
      ),
    [animal.x, animal.z, surfaceY],
  );
  const initialPosition = useRef(target.clone()).current;
  const targetYaw = -Math.atan2(animal.facingZ, animal.facingX);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.lerp(target, 1 - Math.exp(-delta * 7));
    const turn = Math.atan2(
      Math.sin(targetYaw - group.current.rotation.y),
      Math.cos(targetYaw - group.current.rotation.y),
    );
    group.current.rotation.y += turn * (1 - Math.exp(-delta * 10));
  });

  const colors = ANIMAL_COLORS[animal.kind];
  const scale = colors.scale * (animal.isBaby ? 0.62 : 1);
  const rabbit = animal.kind === 'rabbit';
  const bodyLength = rabbit ? 0.82 : 1.08;
  const bodyHeight = rabbit ? 0.5 : 0.62;
  const headX = rabbit ? 0.5 : 0.63;
  return (
    <group ref={group} position={initialPosition} scale={scale}>
        <mesh position={[0, BLOCK_SIZE * 0.43, 0]} castShadow>
        <boxGeometry args={[BLOCK_SIZE * bodyLength, BLOCK_SIZE * bodyHeight, BLOCK_SIZE * 0.68]} />
        <meshStandardMaterial color={colors.body} roughness={0.92} />
      </mesh>
      <mesh position={[BLOCK_SIZE * headX, BLOCK_SIZE * (rabbit ? 0.49 : 0.45), 0]} castShadow>
        <boxGeometry args={[
          BLOCK_SIZE * (rabbit ? 0.34 : 0.38),
          BLOCK_SIZE * (rabbit ? 0.34 : 0.42),
          BLOCK_SIZE * (rabbit ? 0.38 : 0.46),
        ]} />
        <meshStandardMaterial color={colors.head} roughness={0.9} />
      </mesh>
      {[-0.36, 0.36].flatMap((x) =>
        [-0.22, 0.22].map((z) => (
          <mesh key={`${x}:${z}`} position={[BLOCK_SIZE * x, BLOCK_SIZE * 0.13, BLOCK_SIZE * z]} castShadow>
            <boxGeometry args={[
              BLOCK_SIZE * (rabbit ? 0.16 : 0.12),
              BLOCK_SIZE * (rabbit ? 0.22 : 0.3),
              BLOCK_SIZE * (rabbit ? 0.16 : 0.12),
            ]} />
            <meshStandardMaterial color={colors.legs} roughness={0.94} />
          </mesh>
        )),
      )}
      {animal.kind === 'cow' && (
        <>
          <mesh position={[-BLOCK_SIZE * 0.16, BLOCK_SIZE * 0.58, BLOCK_SIZE * 0.345]}>
            <boxGeometry args={[BLOCK_SIZE * 0.32, BLOCK_SIZE * 0.22, BLOCK_SIZE * 0.025]} />
            <meshStandardMaterial color={colors.accent} roughness={0.9} />
          </mesh>
          {[-0.17, 0.17].map((z) => (
            <mesh key={z} position={[BLOCK_SIZE * 0.69, BLOCK_SIZE * 0.72, BLOCK_SIZE * z]} rotation={[0, 0, -0.4]}>
              <coneGeometry args={[BLOCK_SIZE * 0.045, BLOCK_SIZE * 0.22, 5]} />
              <meshStandardMaterial color="#e4d5aa" roughness={0.82} />
            </mesh>
          ))}
        </>
      )}
      {animal.kind === 'pig' && (
        <mesh position={[BLOCK_SIZE * 0.84, BLOCK_SIZE * 0.43, 0]} castShadow>
          <boxGeometry args={[BLOCK_SIZE * 0.16, BLOCK_SIZE * 0.2, BLOCK_SIZE * 0.3]} />
          <meshStandardMaterial color={colors.accent} roughness={0.88} />
        </mesh>
      )}
      {animal.kind === 'rabbit' && [-0.11, 0.11].map((z) => (
        <mesh key={z} position={[BLOCK_SIZE * 0.5, BLOCK_SIZE * 0.82, BLOCK_SIZE * z]}>
          <boxGeometry args={[BLOCK_SIZE * 0.12, BLOCK_SIZE * 0.48, BLOCK_SIZE * 0.1]} />
          <meshStandardMaterial color={z < 0 ? colors.head : colors.accent} roughness={0.94} />
        </mesh>
      ))}
      {animal.kind === 'goat' && (
        <>
          {[-0.15, 0.15].map((z) => (
            <mesh key={z} position={[BLOCK_SIZE * 0.62, BLOCK_SIZE * 0.72, BLOCK_SIZE * z]} rotation={[0, 0, -0.35]}>
              <coneGeometry args={[BLOCK_SIZE * 0.04, BLOCK_SIZE * 0.3, 5]} />
              <meshStandardMaterial color={colors.accent} roughness={0.86} />
            </mesh>
          ))}
          <mesh position={[BLOCK_SIZE * 0.76, BLOCK_SIZE * 0.25, 0]} rotation={[0, 0, -0.22]}>
            <coneGeometry args={[BLOCK_SIZE * 0.07, BLOCK_SIZE * 0.26, 5]} />
            <meshStandardMaterial color="#766b5b" roughness={0.95} />
          </mesh>
        </>
      )}
      {animal.kind === 'fox' && (
        <>
          <mesh position={[BLOCK_SIZE * 0.86, BLOCK_SIZE * 0.41, 0]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.25, BLOCK_SIZE * 0.22, BLOCK_SIZE * 0.3]} />
            <meshStandardMaterial color={colors.accent} roughness={0.9} />
          </mesh>
          {[-0.14, 0.14].map((z) => (
            <mesh key={z} position={[BLOCK_SIZE * 0.63, BLOCK_SIZE * 0.77, BLOCK_SIZE * z]}>
              <coneGeometry args={[BLOCK_SIZE * 0.1, BLOCK_SIZE * 0.28, 4]} />
              <meshStandardMaterial color={colors.head} roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[-BLOCK_SIZE * 0.66, BLOCK_SIZE * 0.56, 0]} rotation={[0, 0, -0.5]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.6, BLOCK_SIZE * 0.2, BLOCK_SIZE * 0.24]} />
            <meshStandardMaterial color={colors.body} roughness={0.92} />
          </mesh>
          <mesh position={[-BLOCK_SIZE * 0.92, BLOCK_SIZE * 0.7, 0]} rotation={[0, 0, -0.5]} castShadow>
            <boxGeometry args={[BLOCK_SIZE * 0.22, BLOCK_SIZE * 0.21, BLOCK_SIZE * 0.25]} />
            <meshStandardMaterial color={colors.accent} roughness={0.94} />
          </mesh>
        </>
      )}
      <mesh position={[BLOCK_SIZE * (headX + 0.21), BLOCK_SIZE * 0.51, BLOCK_SIZE * 0.18]}>
        <sphereGeometry args={[BLOCK_SIZE * 0.035, 6, 4]} />
        <meshBasicMaterial color="#171a18" />
      </mesh>
    </group>
  );
}

function WorldScene({
  blocks,
  ecosystem,
  tool,
  onAdd,
  onRemove,
  onSpawnAnimal,
}: {
  blocks: VoxelBlock[];
  ecosystem: EcosystemState;
  tool: Tool;
  onAdd: (cell: Cell) => void;
  onRemove: (id: string) => void;
  onSpawnAnimal: (x: number, z: number) => void;
}) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const painting = useRef(false);
  const lastPaintAt = useRef(-Infinity);

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

  const hoverBlock = (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => {
    if ((event.buttons & 2) !== 0) {
      setHover(null);
      return;
    }
    event.stopPropagation();
    if (tool === 'erase') {
      setHover({ x: block.x, y: block.y, z: block.z, blockId: block.id, valid: true });
      return;
    }
    if (tool === 'animal') {
      const surface = getSurfaceBlock(blocks, block.x, block.z);
      const occupied = ecosystem.animals.some(
        (animal) => animal.x === block.x && animal.z === block.z,
      );
      setHover({
        x: block.x,
        y: block.y + 1,
        z: block.z,
        blockId: block.id,
        valid: surface?.id === block.id && !block.burning && !occupied,
      });
      return;
    }
    const cell = getAdjacentCell(event, block);
    setHover({ ...cell, valid: isInWorld(cell) && !hasBlock(blocks, cell) });
    paintCell(event, cell);
  };

  const startPaintingOnBlock = (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => {
    if (tool !== 'place' || event.button !== 0 || !event.shiftKey) return;
    event.stopPropagation();
    painting.current = true;
    paintCell(event, getAdjacentCell(event, block), true);
  };

  const selectBlock = (event: ThreeEvent<MouseEvent>, block: VoxelBlock) => {
    event.stopPropagation();
    if (event.delta > 3 || event.shiftKey) return;
    if (tool === 'erase') {
      onRemove(block.id);
      setHover(null);
      return;
    }
    if (tool === 'animal') {
      const surface = getSurfaceBlock(blocks, block.x, block.z);
      const occupied = ecosystem.animals.some(
        (animal) => animal.x === block.x && animal.z === block.z,
      );
      if (surface?.id === block.id && !block.burning && !occupied) {
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
          if (tool !== 'place') return;
          if ((event.buttons & 2) !== 0) {
            setHover(null);
            return;
          }
          event.stopPropagation();
          const cell = planeCell(event);
          setHover({ ...cell, valid: isInWorld(cell) && !hasBlock(blocks, cell) });
          paintCell(event, cell);
        }}
        onPointerDown={(event) => {
          if (tool !== 'place' || event.button !== 0 || !event.shiftKey) return;
          event.stopPropagation();
          painting.current = true;
          paintCell(event, planeCell(event), true);
        }}
        onPointerOut={() => setHover(null)}
        onClick={(event) => {
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
          onHover={hoverBlock}
          onLeave={() => setHover(null)}
          onSelect={selectBlock}
          onPaintStart={startPaintingOnBlock}
        />
      ))}

      {ecosystem.vegetation.map((growth) => {
        const block = blocks.find(({ id }) => id === growth.blockId);
        const surface = block && getSurfaceBlock(blocks, block.x, block.z);
        return block?.material === 'grass' && !block.burning && surface?.id === block.id
          ? <VegetationSprout key={growth.id} growth={growth} block={block} />
          : null;
      })}

      {ecosystem.animals.map((animal) => {
        const surface = getSurfaceBlock(blocks, animal.x, animal.z);
        return surface ? <AnimalModel key={animal.id} animal={animal} surfaceY={surface.y} /> : null;
      })}

      {hover && (
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
    </>
  );
}

function BlockPalette({
  className,
  material,
  tool,
  onSelectMaterial,
  onSelectDelete,
}: {
  className: string;
  material: BlockMaterial;
  tool: Tool;
  onSelectMaterial: (material: BlockMaterial) => void;
  onSelectDelete: () => void;
}) {
  const selectedLabel = tool === 'erase' ? 'Delete' : MATERIALS[material].label;

  return (
    <div className={className}>
      <div className="selection-readout" role="status" aria-live="polite" aria-atomic="true">
        {tool === 'animal' ? (
          <span className="selection-chip animal-chip"><PawPrint size={10} /></span>
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
  onActivate,
}: {
  results: Record<AbilityKey, AbilityResult>;
  message: string;
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
          return (
            <button
              key={key}
              className={`power-button power-${key}`}
              type="button"
              disabled={!result.changed}
              aria-label={`${ability.label}: ${ability.description}`}
              title={`${ability.label} — ${ability.description}`}
              onClick={() => onActivate(key)}
            >
              <span className="power-icon"><Icon size={16} /></span>
              <span>
                <strong>{ability.label}</strong>
                <small>{ability.description}</small>
              </span>
              <b className="power-count">{result.affected || '—'}</b>
            </button>
          );
        })}
      </div>
      <p className="power-status" role="status" aria-live="polite" aria-atomic="true">
        {message || 'Powers affect the whole world.'}
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
  const [gravityOn, setGravityOn] = useState(true);
  const [past, setPast] = useState<VoxelBlock[][]>([]);
  const [future, setFuture] = useState<VoxelBlock[][]>([]);
  const [settling, setSettling] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [powerMessage, setPowerMessage] = useState('');
  const idCounter = useRef(0);
  const blocksRef = useRef(blocks);
  const ecosystemRef = useRef(ecosystem);
  const burningCount = blocks.filter((block) => block.burning).length;
  const fireActive = useMemo(() => advanceFire(blocks).changed, [blocks]);
  const abilityResults = useMemo(
    () => ABILITY_KEYS.reduce((results, key) => {
      results[key] = applyAbility(blocks, key);
      return results;
    }, {} as Record<AbilityKey, AbilityResult>),
    [blocks],
  );

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
      setSettling(false);
      return;
    }

    const worldTimer = window.setInterval(() => {
      const step = advanceWorldStep(blocksRef.current);
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
    commit(added, gravityOn);
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
    const starter = createStarterWorld();
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
    const result = abilityResults[ability];
    if (!result.changed) return;
    commit(result.blocks, gravityOn && ABILITIES[ability].triggersGravity);
    setPowerMessage(
      `${ABILITIES[ability].label} affected ${result.affected} ${result.affected === 1 ? 'block' : 'blocks'}.`,
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
            onAdd={addBlock}
            onRemove={removeBlock}
            onSpawnAnimal={spawnSelectedAnimal}
          />
        </Canvas>
      </div>

      <header className="topbar">
        <div className="brand" aria-label="Voxel">
          <span className="brand-mark"><Box size={19} strokeWidth={2.4} /></span>
          <span className="brand-word">VOXEL</span>
        </div>
        <div className="world-title" aria-live="polite">
          <span>New world</span>
          <small>{blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}</small>
        </div>
        <div className="top-actions">
          <button className="icon-button" type="button" aria-label="Undo" disabled={!past.length} onClick={undo}>
            <Undo2 size={17} />
          </button>
          <button className="icon-button" type="button" aria-label="Redo" disabled={!future.length} onClick={redo}>
            <Redo2 size={17} />
          </button>
          <button className="icon-button reset-button" type="button" aria-label="Reset world and ecosystem" onClick={resetWorld}>
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
        onActivate={activateAbility}
      />

      <section className={`welcome-card ${welcomeVisible ? '' : 'dismissed'}`} aria-live="polite">
        <span className="welcome-icon"><Sparkles size={18} /></span>
        <div>
          <p>YOUR WORLD IS READY</p>
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

      <div className="controls-hint">
        <span><i className="mouse-icon right" /> Right-drag to orbit</span>
        <span>
          <i className="mouse-icon left" /> Left-click to {tool === 'animal'
            ? `spawn ${ANIMALS[animalKind].label.toLowerCase()}`
            : tool}
        </span>
        {tool === 'place' && <span><kbd>Shift</kbd> + drag to pour</span>}
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
          <small>Eats {selected.dietLabel}</small>
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
