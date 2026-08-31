import { Edges, Grid, OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import {
  Box,
  ArrowDown,
  CloudSun,
  Eraser,
  Leaf,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MOUSE, type Mesh, Vector3 } from 'three';
import {
  BLOCK_RENDER_SIZE,
  MATERIALS,
  MATERIAL_KEYS,
  WORLD_SIZE,
  createStarterWorld,
  hasBlock,
  isInWorld,
  isValidWorld,
  settlePlacedBlock,
  settleWorld,
  type BlockMaterial,
  type Cell,
  type VoxelBlock,
} from './game/world';
import { getBlockTextures } from './visuals/blockTextures';

type Tool = 'place' | 'erase';
type HoverTarget = Cell & { blockId?: string; valid: boolean };

const STORAGE_KEY = 'voxel-world-v1';
const PAINT_INTERVAL_MS = 160;

function loadWorld() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : null;
    return isValidWorld(parsed) ? parsed : createStarterWorld();
  } catch {
    return createStarterWorld();
  }
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
  const mesh = useRef<Mesh>(null);
  const target = useMemo(
    () => new Vector3(block.x, block.y + BLOCK_RENDER_SIZE / 2, block.z),
    [block.x, block.y, block.z],
  );
  const colors = MATERIALS[block.material];
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
    if (!mesh.current) return;
    const strength = 1 - Math.exp(-delta * 13);
    mesh.current.position.lerp(target, strength);
  });

  return (
    <mesh
      ref={mesh}
      position={target}
      castShadow
      receiveShadow
      onPointerMove={(event) => onHover(event, block)}
      onPointerDown={(event) => onPaintStart(event, block)}
      onPointerOut={onLeave}
      onClick={(event) => onSelect(event, block)}
    >
      <boxGeometry args={[BLOCK_RENDER_SIZE, BLOCK_RENDER_SIZE, BLOCK_RENDER_SIZE]} />
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
          emissive={colors.emissive}
          emissiveIntensity={colors.emissiveIntensity ?? 0}
        />
      ))}
      {block.material === 'grass' && (
        <mesh position={[0, BLOCK_RENDER_SIZE / 2 + 0.012, 0]} castShadow>
          <boxGeometry
            args={[
              BLOCK_RENDER_SIZE * 1.035,
              Math.max(0.035, BLOCK_RENDER_SIZE * 0.06),
              BLOCK_RENDER_SIZE * 1.035,
            ]}
          />
          <meshStandardMaterial map={textures.top} color="#ffffff" roughness={0.94} />
        </mesh>
      )}
      <Edges threshold={22} color={colors.edge} opacity={0.42} transparent />
    </mesh>
  );
}

function WorldScene({
  blocks,
  tool,
  onAdd,
  onRemove,
}: {
  blocks: VoxelBlock[];
  tool: Tool;
  onAdd: (cell: Cell) => void;
  onRemove: (id: string) => void;
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
    event.stopPropagation();
    if (tool === 'erase') {
      setHover({ x: block.x, y: block.y, z: block.z, blockId: block.id, valid: true });
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
    const cell = getAdjacentCell(event, block);
    if (isInWorld(cell) && !hasBlock(blocks, cell)) onAdd(cell);
  };

  const planeCell = (event: ThreeEvent<PointerEvent | MouseEvent>): Cell => ({
    x: Math.round(event.point.x),
    y: 0,
    z: Math.round(event.point.z),
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
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color="#e9e6d8" roughness={0.98} />
      </mesh>

      <Grid
        position={[0, 0.012, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1}
        sectionSize={4}
        cellColor="#aab9a6"
        sectionColor="#7f9681"
        cellThickness={0.55}
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

      {hover && (
        <mesh position={[hover.x, hover.y + BLOCK_RENDER_SIZE / 2, hover.z]}>
          <boxGeometry args={[BLOCK_RENDER_SIZE * 1.08, BLOCK_RENDER_SIZE * 1.08, BLOCK_RENDER_SIZE * 1.08]} />
          <meshStandardMaterial
            color={tool === 'erase' ? '#cc6d55' : hover.valid ? '#e6ed88' : '#cc6d55'}
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
          LEFT: MOUSE.PAN,
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
        {tool === 'erase' ? (
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
        <span><strong>{selectedLabel}</strong> selected</span>
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

export default function Game() {
  const [blocks, setBlocks] = useState<VoxelBlock[]>(loadWorld);
  const [tool, setTool] = useState<Tool>('place');
  const [material, setMaterial] = useState<BlockMaterial>('grass');
  const [gravityOn, setGravityOn] = useState(true);
  const [past, setPast] = useState<VoxelBlock[][]>([]);
  const [future, setFuture] = useState<VoxelBlock[][]>([]);
  const [settling, setSettling] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const idCounter = useRef(0);
  const settleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  useEffect(
    () => () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const markSettling = () => {
    setSettling(true);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettling(false), 650);
  };

  const commit = (next: VoxelBlock[], didMove = false) => {
    if (next === blocks) return;
    setPast((history) => [...history.slice(-29), blocks]);
    setFuture([]);
    setBlocks(next);
    setWelcomeVisible(false);
    if (didMove) markSettling();
  };

  const addBlock = (cell: Cell) => {
    if (hasBlock(blocks, cell) || !isInWorld(cell)) return;
    const placed: VoxelBlock = {
      id: `created-${Date.now()}-${idCounter.current++}`,
      ...cell,
      material,
    };
    const added = [...blocks, placed];
    const poured = gravityOn
      ? settlePlacedBlock(added, placed.id)
      : { blocks: added, moved: false };
    const settled = gravityOn
      ? settleWorld(poured.blocks)
      : { blocks: poured.blocks, moved: false };
    commit(settled.blocks, poured.moved || settled.moved);
  };

  const removeBlock = (id: string) => {
    const remaining = blocks.filter((block) => block.id !== id);
    const settled = gravityOn ? settleWorld(remaining) : { blocks: remaining, moved: false };
    commit(settled.blocks, settled.moved);
  };

  const toggleGravity = () => {
    if (gravityOn) {
      setGravityOn(false);
      return;
    }
    setGravityOn(true);
    const settled = settleWorld(blocks);
    if (settled.moved) commit(settled.blocks, true);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === '1') setTool('place');
      if (event.key === '2') setTool('erase');
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
    setBlocks(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((history) => history.slice(1));
    setPast((history) => [...history.slice(-29), blocks]);
    setBlocks(next);
  };

  const resetWorld = () => commit(createStarterWorld());
  const clearWorld = () => commit([]);
  const selectMaterial = (nextMaterial: BlockMaterial) => {
    setMaterial(nextMaterial);
    setTool('place');
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
          <WorldScene blocks={blocks} tool={tool} onAdd={addBlock} onRemove={removeBlock} />
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
          <button className="icon-button" type="button" aria-label="Reset starter world" onClick={resetWorld}>
            <RotateCcw size={17} />
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

        <div className="panel-rule" />
        <div className="material-heading">
          <p className="eyebrow">BLOCKS</p>
          <span>24 + delete</span>
        </div>
        <BlockPalette
          className="material-picker"
          material={material}
          tool={tool}
          onSelectMaterial={selectMaterial}
          onSelectDelete={() => setTool('erase')}
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

      <section className={`welcome-card ${welcomeVisible ? '' : 'dismissed'}`} aria-live="polite">
        <span className="welcome-icon"><Sparkles size={18} /></span>
        <div>
          <p>YOUR WORLD IS READY</p>
          <strong>Shape it any way you like.</strong>
        </div>
      </section>

      <div className="world-status" aria-label="World status">
        {settling ? <ArrowDown size={15} className="falling-icon" /> : <span className={`status-dot ${gravityOn ? '' : 'paused'}`} />}
        <span>{settling ? 'Blocks falling' : gravityOn ? 'Gravity on' : 'Gravity paused'}</span>
        <span className="status-rule" />
        <Leaf size={15} />
        <span>{blocks.length ? 'World calm' : 'Blank canvas'}</span>
        <span className="status-rule" />
        <CloudSun size={15} />
        <span>Clear skies</span>
      </div>

      <div className="controls-hint">
        <span><i className="mouse-icon right" /> Right-drag to orbit</span>
        <span><i className="mouse-icon left" /> Left-click to {tool}</span>
        {tool === 'place' && <span><kbd>Shift</kbd> + drag to pour</span>}
        <span><b>⌁</b> Scroll to zoom</span>
      </div>

      <BlockPalette
        className="mobile-material-picker"
        material={material}
        tool={tool}
        onSelectMaterial={selectMaterial}
        onSelectDelete={() => setTool('erase')}
      />
    </main>
  );
}
