import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import { type Group, Vector3 } from 'three';
import type { Animal } from '../game/ecosystem';
import { BLOCK_SIZE, cellToWorld } from '../game/world';

type V3 = [number, number, number];
type Palette = { body: string; head: string; legs: string; accent: string; scale: number };
type PartData = {
  shape: 'box' | 'round' | 'cone';
  position: V3;
  size: V3;
  color: string;
  rotation?: V3;
};
type Appearance = { scale: number; parts: PartData[] };

const scaled = ([x, y, z]: V3): V3 => [x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE];
const box = (position: V3, size: V3, color: string, rotation?: V3): PartData =>
  ({ shape: 'box', position, size, color, rotation });
const round = (position: V3, size: V3, color: string): PartData =>
  ({ shape: 'round', position, size, color });
const cone = (position: V3, radius: number, height: number, color: string, rotation?: V3): PartData =>
  ({ shape: 'cone', position, size: [radius, height, 0], color, rotation });
const eyes = (x: number, y: number, z: number): PartData[] => [-z, z].map((eyeZ) =>
  round([x, y, eyeZ], [0.035, 0.035, 0.035], '#171a18'));
const legs = (xs: [number, number], z: number, height: number, width: number, color: string): PartData[] =>
  xs.flatMap((x) => [-z, z].map((legZ) =>
    box([x, height / 2, legZ], [width, height, width], color)));
const quad = (
  palette: Palette,
  bodyPosition: V3,
  bodySize: V3,
  headPosition: V3,
  headSize: V3,
  legXs: [number, number],
  legZ: number,
  legHeight: number,
  legWidth: number,
): PartData[] => [
  round(bodyPosition, bodySize, palette.body),
  round(headPosition, headSize, palette.head),
  ...legs(legXs, legZ, legHeight, legWidth, palette.legs),
];

const P = {
  sheep: { body: '#f5f1df', head: '#494941', legs: '#494941', accent: '#d8d1bc', scale: 0.92 },
  cow: { body: '#eee4d5', head: '#76513b', legs: '#5c4336', accent: '#684531', scale: 1.03 },
  pig: { body: '#e9a4a1', head: '#efb1ad', legs: '#bb7978', accent: '#c77778', scale: 0.88 },
  rabbit: { body: '#c9bba5', head: '#b9aa93', legs: '#9b8b75', accent: '#f0d7d1', scale: 0.72 },
  goat: { body: '#d8d0bc', head: '#b8aa8d', legs: '#625c50', accent: '#8c7655', scale: 0.92 },
  deer: { body: '#a9784b', head: '#9d6b43', legs: '#5b4636', accent: '#ead3a8', scale: 0.92 },
  horse: { body: '#865438', head: '#75442f', legs: '#4b3429', accent: '#342821', scale: 1.02 },
  chicken: { body: '#eee5d1', head: '#f5ecda', legs: '#bb873b', accent: '#c34e3f', scale: 0.62 },
  duck: { body: '#8d9b63', head: '#52734e', legs: '#b97d2e', accent: '#df9b34', scale: 0.68 },
  turtle: { body: '#66884d', head: '#71965d', legs: '#536f42', accent: '#3f6038', scale: 0.72 },
  beaver: { body: '#7a5035', head: '#875b3e', legs: '#4d3528', accent: '#b57a4c', scale: 0.88 },
  'small-fish': { body: '#4d9aa3', head: '#6db8b4', legs: '#377681', accent: '#a7d7c8', scale: 0.58 },
  'big-fish': { body: '#315f75', head: '#3c7588', legs: '#244b62', accent: '#85b9b3', scale: 0.9 },
  fox: { body: '#d9682f', head: '#df7439', legs: '#342d2a', accent: '#f5e8d0', scale: 0.82 },
  wolf: { body: '#777d7d', head: '#6a7071', legs: '#454b4d', accent: '#c6c1ae', scale: 0.88 },
  bear: { body: '#65452f', head: '#74513a', legs: '#3e3026', accent: '#b68a61', scale: 1.08 },
  eagle: { body: '#594432', head: '#eee8d7', legs: '#c69231', accent: '#d7aa42', scale: 0.74 },
  crocodile: { body: '#536b3d', head: '#5c7541', legs: '#3e5232', accent: '#9fa268', scale: 0.94 },
} satisfies Record<string, Palette>;

const show = (palette: Palette, parts: PartData[]): Appearance => ({ scale: palette.scale, parts });

const APPEARANCES: Record<string, Appearance> = {
  sheep: show(P.sheep, [
    ...quad(P.sheep, [0, 0.57, 0], [0.62, 0.4, 0.43], [0.62, 0.55, 0], [0.27, 0.29, 0.29], [-0.34, 0.34], 0.25, 0.34, 0.12),
    round([-0.2, 0.83, 0], [0.33, 0.17, 0.34], P.sheep.accent), ...eyes(0.79, 0.62, 0.18),
  ]),
  cow: show(P.cow, [
    box([0, 0.68, 0], [1.28, 0.65, 0.78], P.cow.body),
    round([0.7, 0.66, 0], [0.3, 0.32, 0.34], P.cow.head),
    ...legs([-0.42, 0.42], 0.27, 0.46, 0.13, P.cow.legs),
    box([-0.18, 0.73, 0.4], [0.38, 0.3, 0.025], P.cow.accent),
    round([0, 0.31, 0], [0.22, 0.09, 0.2], '#d99b96'),
    cone([0.7, 1.03, -0.2], 0.045, 0.27, '#e5d4a4', [0, 0, -0.35]),
    cone([0.7, 1.03, 0.2], 0.045, 0.27, '#e5d4a4', [0, 0, -0.35]),
    box([0.94, 0.55, 0], [0.15, 0.17, 0.4], '#b98a72'), ...eyes(0.87, 0.74, 0.23),
  ]),
  pig: show(P.pig, [
    ...quad(P.pig, [-0.05, 0.45, 0], [0.62, 0.36, 0.4], [0.58, 0.49, 0], [0.31, 0.29, 0.31], [-0.35, 0.34], 0.24, 0.26, 0.14),
    box([0.89, 0.43, 0], [0.16, 0.2, 0.36], P.pig.accent),
    cone([0.5, 0.8, -0.18], 0.1, 0.2, P.pig.head), cone([0.5, 0.8, 0.18], 0.1, 0.2, P.pig.head),
    box([-0.7, 0.58, 0], [0.25, 0.07, 0.07], P.pig.accent, [0, 0, -0.55]), ...eyes(0.77, 0.57, 0.19),
  ]),
  rabbit: show(P.rabbit, [
    round([-0.12, 0.39, 0], [0.48, 0.34, 0.34], P.rabbit.body),
    round([0.38, 0.53, 0], [0.3, 0.3, 0.29], P.rabbit.head),
    box([0.35, 0.96, -0.12], [0.13, 0.58, 0.11], P.rabbit.head),
    box([0.35, 0.96, 0.12], [0.13, 0.58, 0.11], P.rabbit.accent),
    box([-0.28, 0.12, -0.24], [0.42, 0.16, 0.18], P.rabbit.legs),
    box([-0.28, 0.12, 0.24], [0.42, 0.16, 0.18], P.rabbit.legs),
    round([-0.62, 0.46, 0], [0.16, 0.16, 0.16], '#f2eee4'), ...eyes(0.57, 0.61, 0.18),
  ]),
  goat: show(P.goat, [
    box([-0.05, 0.61, 0], [1.05, 0.52, 0.6], P.goat.body),
    round([0.56, 0.65, 0], [0.28, 0.3, 0.29], P.goat.head), ...legs([-0.34, 0.34], 0.2, 0.44, 0.11, P.goat.legs),
    cone([0.49, 1, -0.17], 0.045, 0.35, P.goat.accent, [0, 0, -0.38]),
    cone([0.49, 1, 0.17], 0.045, 0.35, P.goat.accent, [0, 0, -0.38]),
    cone([0.68, 0.35, 0], 0.08, 0.3, '#756a58', [0, 0, -0.2]), ...eyes(0.74, 0.73, 0.18),
  ]),
  deer: show(P.deer, [
    ...quad(P.deer, [-0.08, 0.76, 0], [0.57, 0.29, 0.3], [0.62, 1.1, 0], [0.25, 0.24, 0.24], [-0.36, 0.32], 0.19, 0.62, 0.085),
    box([0.4, 0.92, 0], [0.25, 0.57, 0.25], P.deer.body, [0, 0, -0.3]),
    box([0.54, 1.42, -0.16], [0.055, 0.5, 0.055], P.deer.accent), box([0.54, 1.42, 0.16], [0.055, 0.5, 0.055], P.deer.accent),
    box([0.68, 1.5, -0.16], [0.3, 0.055, 0.055], P.deer.accent, [0, 0, 0.35]), box([0.68, 1.5, 0.16], [0.3, 0.055, 0.055], P.deer.accent, [0, 0, 0.35]),
    round([-0.63, 0.88, 0], [0.13, 0.13, 0.13], P.deer.accent), ...eyes(0.78, 1.15, 0.15),
  ]),
  horse: show(P.horse, [
    ...quad(P.horse, [-0.08, 0.79, 0], [0.66, 0.34, 0.34], [0.68, 1.19, 0], [0.31, 0.25, 0.25], [-0.43, 0.38], 0.21, 0.67, 0.095),
    box([0.45, 0.98, 0], [0.28, 0.66, 0.3], P.horse.body, [0, 0, -0.38]),
    box([0.31, 1.16, 0], [0.12, 0.56, 0.36], P.horse.accent, [0, 0, -0.38]),
    box([-0.73, 0.68, 0], [0.55, 0.13, 0.19], P.horse.accent, [0, 0, -0.72]),
    cone([0.61, 1.48, -0.13], 0.06, 0.24, P.horse.head), cone([0.61, 1.48, 0.13], 0.06, 0.24, P.horse.head), ...eyes(0.86, 1.25, 0.15),
  ]),
  chicken: show(P.chicken, [
    round([-0.05, 0.48, 0], [0.4, 0.47, 0.36], P.chicken.body), round([0.3, 0.86, 0], [0.24, 0.25, 0.23], P.chicken.head),
    cone([0.56, 0.84, 0], 0.11, 0.28, '#d99a31', [0, 0, -Math.PI / 2]),
    round([-0.05, 0.5, -0.34], [0.27, 0.31, 0.08], '#d9cfb8'), round([-0.05, 0.5, 0.34], [0.27, 0.31, 0.08], '#d9cfb8'),
    box([0, 0.14, -0.1], [0.06, 0.3, 0.06], P.chicken.legs), box([0, 0.14, 0.1], [0.06, 0.3, 0.06], P.chicken.legs),
    round([0.08, 1.14, 0], [0.07, 0.1, 0.07], P.chicken.accent), round([0.2, 1.14, 0], [0.07, 0.1, 0.07], P.chicken.accent),
    cone([-0.42, 0.67, 0], 0.16, 0.38, P.chicken.head, [0, 0, 0.8]), ...eyes(0.44, 0.94, 0.14),
  ]),
  duck: show(P.duck, [
    round([-0.08, 0.39, 0], [0.55, 0.3, 0.36], P.duck.body), round([0.38, 0.67, 0], [0.28, 0.29, 0.27], P.duck.head),
    box([0.68, 0.63, 0], [0.28, 0.1, 0.35], P.duck.accent),
    round([-0.04, 0.45, -0.34], [0.33, 0.19, 0.07], '#6e7d51'), round([-0.04, 0.45, 0.34], [0.33, 0.19, 0.07], '#6e7d51'),
    box([0, 0.13, -0.13], [0.055, 0.24, 0.055], P.duck.legs), box([0, 0.13, 0.13], [0.055, 0.24, 0.055], P.duck.legs),
    box([0.1, 0.03, -0.13], [0.28, 0.06, 0.16], P.duck.accent), box([0.1, 0.03, 0.13], [0.28, 0.06, 0.16], P.duck.accent), ...eyes(0.54, 0.75, 0.16),
  ]),
  turtle: show(P.turtle, [
    round([-0.08, 0.29, 0], [0.62, 0.23, 0.48], P.turtle.accent), round([-0.08, 0.34, 0], [0.49, 0.2, 0.39], P.turtle.body),
    round([0.58, 0.27, 0], [0.25, 0.2, 0.21], P.turtle.head),
    box([-0.35, 0.12, -0.42], [0.28, 0.11, 0.18], P.turtle.legs), box([-0.35, 0.12, 0.42], [0.28, 0.11, 0.18], P.turtle.legs),
    box([0.3, 0.12, -0.42], [0.28, 0.11, 0.18], P.turtle.legs), box([0.3, 0.12, 0.42], [0.28, 0.11, 0.18], P.turtle.legs),
    cone([-0.68, 0.27, 0], 0.08, 0.25, P.turtle.legs, [0, 0, Math.PI / 2]), ...eyes(0.74, 0.32, 0.13),
  ]),
  beaver: show(P.beaver, [
    ...quad(P.beaver, [-0.08, 0.46, 0], [0.62, 0.36, 0.4], [0.55, 0.53, 0], [0.33, 0.34, 0.33], [-0.34, 0.32], 0.25, 0.28, 0.13),
    round([0.83, 0.43, 0], [0.19, 0.17, 0.24], P.beaver.accent),
    box([0.97, 0.34, -0.07], [0.1, 0.2, 0.1], '#f2dfba'), box([0.97, 0.34, 0.07], [0.1, 0.2, 0.1], '#f2dfba'),
    box([-0.79, 0.31, 0], [0.58, 0.13, 0.48], P.beaver.accent, [0, 0, -0.25]),
    round([0.45, 0.84, -0.23], [0.12, 0.12, 0.1], P.beaver.head), round([0.45, 0.84, 0.23], [0.12, 0.12, 0.1], P.beaver.head), ...eyes(0.75, 0.61, 0.19),
  ]),
  'small-fish': show(P['small-fish'], [
    round([0, 0.32, 0], [0.62, 0.25, 0.28], P['small-fish'].body),
    round([0.48, 0.33, 0], [0.25, 0.23, 0.25], P['small-fish'].head),
    cone([-0.68, 0.32, 0], 0.25, 0.48, P['small-fish'].accent, [0, 0, Math.PI / 2]),
    cone([-0.05, 0.55, 0], 0.15, 0.32, P['small-fish'].legs),
    cone([0, 0.26, -0.28], 0.12, 0.3, P['small-fish'].legs, [Math.PI / 2, 0, 0]),
    cone([0, 0.26, 0.28], 0.12, 0.3, P['small-fish'].legs, [-Math.PI / 2, 0, 0]),
    ...eyes(0.62, 0.39, 0.14),
  ]),
  'big-fish': show(P['big-fish'], [
    round([-0.05, 0.39, 0], [0.82, 0.34, 0.4], P['big-fish'].body),
    round([0.67, 0.41, 0], [0.34, 0.31, 0.34], P['big-fish'].head),
    box([0.91, 0.28, 0], [0.28, 0.09, 0.42], P['big-fish'].accent),
    cone([-0.94, 0.39, 0], 0.36, 0.68, P['big-fish'].accent, [0, 0, Math.PI / 2]),
    cone([-0.1, 0.75, 0], 0.22, 0.42, P['big-fish'].legs),
    cone([0, 0.28, -0.4], 0.16, 0.38, P['big-fish'].legs, [Math.PI / 2, 0, 0]),
    cone([0, 0.28, 0.4], 0.16, 0.38, P['big-fish'].legs, [-Math.PI / 2, 0, 0]),
    ...eyes(0.86, 0.5, 0.2),
  ]),
  fox: show(P.fox, [
    ...quad(P.fox, [-0.06, 0.53, 0], [0.58, 0.29, 0.31], [0.55, 0.64, 0], [0.29, 0.3, 0.28], [-0.34, 0.34], 0.2, 0.39, 0.1),
    box([0.82, 0.55, 0], [0.32, 0.2, 0.27], P.fox.accent),
    cone([0.5, 0.98, -0.16], 0.11, 0.3, P.fox.head), cone([0.5, 0.98, 0.16], 0.11, 0.3, P.fox.head),
    round([-0.64, 0.66, 0], [0.47, 0.17, 0.2], P.fox.body), round([-1.03, 0.78, 0], [0.22, 0.15, 0.17], P.fox.accent), ...eyes(0.72, 0.72, 0.16),
  ]),
  wolf: show(P.wolf, [
    ...quad(P.wolf, [-0.06, 0.62, 0], [0.64, 0.32, 0.33], [0.58, 0.72, 0], [0.31, 0.33, 0.3], [-0.4, 0.38], 0.21, 0.49, 0.1),
    box([0.88, 0.65, 0], [0.38, 0.22, 0.27], P.wolf.accent),
    cone([0.54, 1.08, -0.17], 0.11, 0.34, P.wolf.head), cone([0.54, 1.08, 0.17], 0.11, 0.34, P.wolf.head),
    box([-0.73, 0.67, 0], [0.58, 0.14, 0.18], P.wolf.body, [0, 0, -0.34]), ...eyes(0.78, 0.8, 0.17),
  ]),
  bear: show(P.bear, [
    ...quad(P.bear, [-0.12, 0.64, 0], [0.68, 0.5, 0.48], [0.57, 0.71, 0], [0.38, 0.4, 0.38], [-0.4, 0.37], 0.29, 0.39, 0.19),
    round([0.87, 0.63, 0], [0.22, 0.2, 0.24], P.bear.accent),
    round([0.47, 1.06, -0.27], [0.14, 0.14, 0.12], P.bear.head), round([0.47, 1.06, 0.27], [0.14, 0.14, 0.12], P.bear.head),
    round([-0.77, 0.72, 0], [0.13, 0.13, 0.13], P.bear.accent), ...eyes(0.78, 0.81, 0.23),
  ]),
  eagle: show(P.eagle, [
    round([-0.05, 0.57, 0], [0.38, 0.48, 0.3], P.eagle.body), round([0.27, 0.93, 0], [0.28, 0.28, 0.26], P.eagle.head),
    cone([0.56, 0.89, 0], 0.12, 0.31, P.eagle.accent, [0, 0, -Math.PI / 2]),
    box([-0.08, 0.65, -0.52], [0.58, 0.12, 0.78], P.eagle.body, [-0.08, 0, -0.12]), box([-0.08, 0.65, 0.52], [0.58, 0.12, 0.78], P.eagle.body, [0.08, 0, 0.12]),
    box([0.05, 0.18, -0.13], [0.07, 0.35, 0.07], P.eagle.legs), box([0.05, 0.18, 0.13], [0.07, 0.35, 0.07], P.eagle.legs),
    box([0.18, 0.03, -0.13], [0.26, 0.055, 0.1], P.eagle.accent), box([0.18, 0.03, 0.13], [0.26, 0.055, 0.1], P.eagle.accent),
    cone([-0.43, 0.51, -0.13], 0.15, 0.42, '#d8d0bb', [0, 0, 0.9]), cone([-0.43, 0.51, 0.13], 0.15, 0.42, '#d8d0bb', [0, 0, 0.9]), ...eyes(0.45, 1, 0.15),
  ]),
  crocodile: show(P.crocodile, [
    round([-0.16, 0.29, 0], [0.78, 0.22, 0.38], P.crocodile.body), box([0.62, 0.3, 0], [0.68, 0.31, 0.57], P.crocodile.head),
    box([1.09, 0.24, 0], [0.48, 0.2, 0.48], P.crocodile.accent), box([-0.91, 0.3, 0], [0.68, 0.25, 0.3], P.crocodile.body, [0, 0, -0.12]),
    cone([-1.35, 0.26, 0], 0.18, 0.72, P.crocodile.body, [0, 0, Math.PI / 2]),
    box([-0.44, 0.1, -0.42], [0.34, 0.12, 0.16], P.crocodile.legs), box([-0.44, 0.1, 0.42], [0.34, 0.12, 0.16], P.crocodile.legs),
    box([0.27, 0.1, -0.42], [0.34, 0.12, 0.16], P.crocodile.legs), box([0.27, 0.1, 0.42], [0.34, 0.12, 0.16], P.crocodile.legs),
    ...[-0.55, -0.15, 0.25, 0.58].map((x) => cone([x, 0.57, 0], 0.07, 0.18, P.crocodile.accent)), ...eyes(0.91, 0.54, 0.2),
  ]),
};

function Part({ part }: { part: PartData }) {
  if (part.shape === 'round') {
    return <mesh position={scaled(part.position)} scale={part.size} castShadow>
      <sphereGeometry args={[BLOCK_SIZE, 8, 6]} /><meshStandardMaterial color={part.color} roughness={0.92} />
    </mesh>;
  }
  if (part.shape === 'cone') {
    return <mesh position={scaled(part.position)} rotation={part.rotation} castShadow>
      <coneGeometry args={[part.size[0] * BLOCK_SIZE, part.size[1] * BLOCK_SIZE, 5]} /><meshStandardMaterial color={part.color} roughness={0.88} />
    </mesh>;
  }
  return <mesh position={scaled(part.position)} rotation={part.rotation} castShadow>
    <boxGeometry args={scaled(part.size)} /><meshStandardMaterial color={part.color} roughness={0.9} />
  </mesh>;
}

export const AnimalModel = memo(function AnimalModel({ animal, surfaceY }: { animal: Animal; surfaceY: number }) {
  const group = useRef<Group>(null);
  const target = useMemo(() => new Vector3(
    cellToWorld(animal.x), cellToWorld(surfaceY + 1), cellToWorld(animal.z),
  ), [animal.x, animal.z, surfaceY]);
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

  const appearance = APPEARANCES[animal.kind as string] ?? APPEARANCES.sheep;
  const scale = appearance.scale * (animal.isBaby ? 0.62 : 1);
  return <group ref={group} position={initialPosition} scale={scale}>
    {appearance.parts.map((part, index) => <Part key={index} part={part} />)}
  </group>;
}, (previous, next) =>
  previous.surfaceY === next.surfaceY &&
  previous.animal.kind === next.animal.kind &&
  previous.animal.x === next.animal.x &&
  previous.animal.z === next.animal.z &&
  previous.animal.facingX === next.animal.facingX &&
  previous.animal.facingZ === next.animal.facingZ &&
  previous.animal.isBaby === next.animal.isBaby,
);
