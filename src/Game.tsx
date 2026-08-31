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
  MATERIALS,
  WORLD_SIZE,
  createStarterWorld,
  hasBlock,
  isInWorld,
  isValidWorld,
  settleWorld,
  type BlockMaterial,
  type Cell,
  type VoxelBlock,
} from './game/world';

type Tool = 'place' | 'erase';
type HoverTarget = Cell & { blockId?: string; valid: boolean };

const STORAGE_KEY = 'voxel-world-v1';

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
}: {
  block: VoxelBlock;
  onHover: (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => void;
  onLeave: () => void;
  onSelect: (event: ThreeEvent<MouseEvent>, block: VoxelBlock) => void;
}) {
  const mesh = useRef<Mesh>(null);
  const target = useMemo(
    () => new Vector3(block.x, block.y + 0.5, block.z),
    [block.x, block.y, block.z],
  );
  const colors = MATERIALS[block.material];

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
      onPointerOut={onLeave}
      onClick={(event) => onSelect(event, block)}
    >
      <boxGeometry args={[0.94, 0.94, 0.94]} />
      <meshStandardMaterial color={colors.color} roughness={0.82} />
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

  const hoverBlock = (event: ThreeEvent<PointerEvent>, block: VoxelBlock) => {
    event.stopPropagation();
    if (tool === 'erase') {
      setHover({ x: block.x, y: block.y, z: block.z, blockId: block.id, valid: true });
      return;
    }
    const cell = getAdjacentCell(event, block);
    setHover({ ...cell, valid: isInWorld(cell) && !hasBlock(blocks, cell) });
  };

  const selectBlock = (event: ThreeEvent<MouseEvent>, block: VoxelBlock) => {
    event.stopPropagation();
    if (event.delta > 3) return;
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
        }}
        onPointerOut={() => setHover(null)}
        onClick={(event) => {
          if (tool !== 'place' || event.delta > 3) return;
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
        />
      ))}

      {hover && (
        <mesh position={[hover.x, hover.y + 0.5, hover.z]}>
          <boxGeometry args={[0.98, 0.98, 0.98]} />
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
    const added: VoxelBlock[] = [
      ...blocks,
      {
        id: `created-${Date.now()}-${idCounter.current++}`,
        ...cell,
        material,
      },
    ];
    const settled = gravityOn ? settleWorld(added) : { blocks: added, moved: false };
    commit(settled.blocks, settled.moved);
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
        <p className="eyebrow material-heading">MATERIAL</p>
        <div className="swatches" aria-label="Block material">
          {(Object.keys(MATERIALS) as BlockMaterial[]).map((key) => (
            <button
              key={key}
              className={`swatch ${key} ${material === key ? 'selected' : ''}`}
              aria-label={`${MATERIALS[key].label} block`}
              aria-pressed={material === key}
              title={MATERIALS[key].label}
              type="button"
              onClick={() => { setMaterial(key); setTool('place'); }}
            />
          ))}
        </div>

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
        <span><b>⌁</b> Scroll to zoom</span>
      </div>

      <div className="mobile-materials" aria-label="Block material">
        {(Object.keys(MATERIALS) as BlockMaterial[]).map((key) => (
          <button
            key={key}
            className={`swatch ${key} ${material === key ? 'selected' : ''}`}
            aria-label={`${MATERIALS[key].label} block`}
            aria-pressed={material === key}
            type="button"
            onClick={() => { setMaterial(key); setTool('place'); }}
          />
        ))}
      </div>
    </main>
  );
}
