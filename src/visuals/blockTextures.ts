import {
  CanvasTexture,
  NearestFilter,
  NearestMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
} from 'three';
import type { BlockMaterial } from '../game/world';

type BlockFace = 'side' | 'top' | 'bottom';

export type BlockTextureSet = {
  side: Texture;
  top: Texture;
  bottom: Texture;
  preview: string;
};

const SIZE = 16;
const textureCache = new Map<BlockMaterial, BlockTextureSet>();

function seededRandom(value: string) {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let result = seed;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(context: CanvasRenderingContext2D, color: string) {
  context.fillStyle = color;
  context.fillRect(0, 0, SIZE, SIZE);
}

function scatter(
  context: CanvasRenderingContext2D,
  random: () => number,
  colors: string[],
  count: number,
  maxSize = 2,
) {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = colors[Math.floor(random() * colors.length)];
    const size = 1 + Math.floor(random() * maxSize);
    context.fillRect(
      Math.floor(random() * SIZE),
      Math.floor(random() * SIZE),
      size,
      size,
    );
  }
}

function paintDirt(context: CanvasRenderingContext2D, random: () => number) {
  fill(context, '#855637');
  scatter(context, random, ['#6b432c', '#a46c43', '#b67b4d', '#523522'], 46);
}

function paintStone(context: CanvasRenderingContext2D, random: () => number) {
  fill(context, '#7d8587');
  scatter(context, random, ['#686f71', '#92999a', '#596163', '#a5aaa9'], 42);
  context.fillStyle = '#555d5f';
  for (let y = 2; y < SIZE; y += 6) {
    const start = Math.floor(random() * 8);
    context.fillRect(start, y, 4, 1);
    context.fillRect(start + 3, y + 1, 1, 2);
  }
}

function paintOre(
  context: CanvasRenderingContext2D,
  random: () => number,
  dark: string,
  light: string,
) {
  paintStone(context, random);
  for (let index = 0; index < 8; index += 1) {
    const x = Math.floor(random() * 14);
    const y = Math.floor(random() * 14);
    context.fillStyle = dark;
    context.fillRect(x, y, 3, 2);
    context.fillStyle = light;
    context.fillRect(x + 1, y, 1, 1);
  }
}

function paintMaterial(
  context: CanvasRenderingContext2D,
  material: BlockMaterial,
  face: BlockFace,
  random: () => number,
) {
  switch (material) {
    case 'grass': {
      if (face === 'top') {
        fill(context, '#579344');
        scatter(context, random, ['#3f7c39', '#75aa51', '#8fbd59', '#315f32'], 58);
        return;
      }
      paintDirt(context, random);
      if (face === 'side') {
        context.fillStyle = '#579344';
        context.fillRect(0, 0, SIZE, 3);
        for (let x = 0; x < SIZE; x += 1) {
          const fringe = 1 + Math.floor(random() * 4);
          context.fillStyle = random() > 0.45 ? '#579344' : '#75aa51';
          context.fillRect(x, 2, 1, fringe);
        }
        scatter(context, random, ['#376d35', '#8fbd59'], 18, 1);
      }
      return;
    }
    case 'soil':
      paintDirt(context, random);
      return;
    case 'stone':
      paintStone(context, random);
      return;
    case 'sand':
      fill(context, '#d8bd77');
      scatter(context, random, ['#ead596', '#bea25d', '#f1dfa6', '#aa8e4f'], 48, 1);
      context.fillStyle = '#b99c5b';
      context.fillRect(2, 5, 5, 1);
      context.fillRect(9, 11, 4, 1);
      return;
    case 'wood':
      fill(context, '#9c6335');
      if (face === 'top' || face === 'bottom') {
        context.strokeStyle = '#6e4227';
        context.lineWidth = 1;
        for (let inset = 2; inset < 7; inset += 2) {
          context.strokeRect(inset, inset, SIZE - inset * 2, SIZE - inset * 2);
        }
        context.fillStyle = '#c0874d';
        context.fillRect(7, 7, 2, 2);
      } else {
        for (let x = 1; x < SIZE; x += 4) {
          context.fillStyle = x % 8 === 1 ? '#714126' : '#bd7d43';
          context.fillRect(x, 0, 2, SIZE);
          context.fillStyle = '#d09552';
          context.fillRect(x + 1, 2 + (x % 5), 1, 4);
        }
      }
      return;
    case 'leaves':
      fill(context, '#3e733e');
      scatter(context, random, ['#275a31', '#55934c', '#6fa656', '#1f4828'], 80, 2);
      return;
    case 'brick':
      fill(context, '#d2ae96');
      for (let row = 0; row < 3; row += 1) {
        const y = row * 6;
        const offset = row % 2 === 0 ? -4 : 0;
        for (let x = offset; x < SIZE; x += 8) {
          context.fillStyle = random() > 0.5 ? '#a94f3e' : '#934235';
          context.fillRect(x + 1, y + 1, 7, 5);
          context.fillStyle = '#c66b53';
          context.fillRect(x + 2, y + 2, 4, 1);
        }
      }
      return;
    case 'clay':
      fill(context, '#b96e56');
      scatter(context, random, ['#cc846a', '#9b5545', '#d28e73'], 35, 1);
      context.fillStyle = '#914f40';
      context.fillRect(2, 5, 6, 1);
      context.fillRect(9, 12, 5, 1);
      return;
    case 'snow':
      if (face === 'side') {
        fill(context, '#bed7dc');
        scatter(context, random, ['#a5c7cf', '#d8e8e7'], 30, 1);
        context.fillStyle = '#f5f7ef';
        context.fillRect(0, 0, SIZE, 4);
        context.fillStyle = '#e1ece8';
        for (let x = 0; x < SIZE; x += 2) context.fillRect(x, 3, 1, 1 + (x % 3));
      } else {
        fill(context, '#f1f5ee');
        scatter(context, random, ['#ffffff', '#d8e8e7', '#c9dcdf'], 32, 1);
      }
      return;
    case 'ice':
      fill(context, '#8dcedd');
      scatter(context, random, ['#b8e5eb', '#68b3c9', '#d6f2f1'], 28, 1);
      context.fillStyle = '#e8fbf8';
      for (let index = -8; index < SIZE; index += 7) {
        for (let step = 0; step < 7; step += 1) context.fillRect(index + step, 2 + step, 1, 1);
      }
      return;
    case 'water':
      fill(context, '#3d8fb7');
      for (let y = 1; y < SIZE; y += 4) {
        const offset = Math.floor(random() * 5);
        context.fillStyle = y % 8 === 1 ? '#73bdd5' : '#246f9b';
        context.fillRect(offset, y, 7, 1);
        context.fillRect((offset + 9) % SIZE, y + 1, 5, 1);
      }
      return;
    case 'lava':
      fill(context, '#b9341d');
      scatter(context, random, ['#df491d', '#8d251a'], 30, 2);
      for (let y = 0; y < SIZE; y += 1) {
        const x = (4 + Math.floor(y / 2) + (y % 3)) % SIZE;
        context.fillStyle = '#ffb51f';
        context.fillRect(x, y, 2, 1);
        context.fillStyle = '#ff7022';
        context.fillRect((x + 2) % SIZE, y, 1, 1);
      }
      return;
    case 'obsidian':
      fill(context, '#292334');
      scatter(context, random, ['#171521', '#3d2f52', '#4b3865'], 38, 1);
      context.fillStyle = '#624481';
      for (let index = -5; index < SIZE; index += 8) {
        for (let step = 0; step < 8; step += 1) context.fillRect(index + step, 14 - step, 1, 1);
      }
      return;
    case 'coal':
      paintOre(context, random, '#282d2c', '#444b49');
      return;
    case 'iron':
      paintOre(context, random, '#a89b87', '#d0c2a8');
      return;
    case 'gold':
      paintOre(context, random, '#b77d15', '#f0ca47');
      return;
    case 'copper':
      paintOre(context, random, '#a95737', '#d88451');
      context.fillStyle = '#4f8b74';
      context.fillRect(11, 3, 2, 2);
      return;
    case 'glass':
      fill(context, '#c5e5df');
      context.fillStyle = '#78aca7';
      context.fillRect(0, 0, SIZE, 1);
      context.fillRect(0, SIZE - 1, SIZE, 1);
      context.fillRect(0, 0, 1, SIZE);
      context.fillRect(SIZE - 1, 0, 1, SIZE);
      context.fillStyle = '#f3fffb';
      for (let step = 0; step < 7; step += 1) context.fillRect(3 + step, 2 + step, 1, 1);
      return;
    case 'moss':
      fill(context, '#667d3b');
      scatter(context, random, ['#83974c', '#465e30', '#98a95c', '#344829'], 72, 2);
      return;
    case 'mud':
      fill(context, '#634633');
      scatter(context, random, ['#4a3328', '#825c41', '#9a7050'], 42, 2);
      context.fillStyle = '#b18a67';
      context.fillRect(3, 4, 4, 1);
      context.fillRect(10, 11, 3, 1);
      return;
    case 'gravel':
      fill(context, '#7d7a75');
      scatter(context, random, ['#aaa39a', '#5d5c59', '#c0b7aa', '#6c6762'], 65, 2);
      return;
    case 'marble':
      fill(context, '#dddcd3');
      scatter(context, random, ['#f1efe5', '#c9cbc4'], 28, 1);
      for (let y = 0; y < SIZE; y += 1) {
        const x = 2 + Math.floor(y / 3) + (y % 4 === 0 ? 1 : 0);
        context.fillStyle = y % 3 === 0 ? '#929b98' : '#b3b8b4';
        context.fillRect(x, y, 1, 1);
        if (y > 7) context.fillRect(x + 1, y, 1, 1);
      }
      return;
    case 'basalt':
      fill(context, '#4c5257');
      for (let x = 0; x < SIZE; x += 3) {
        context.fillStyle = x % 6 === 0 ? '#34393d' : '#666c70';
        context.fillRect(x, 0, 2, SIZE);
        context.fillStyle = '#747b7f';
        context.fillRect(x + 1, 2 + (x % 5), 1, 5);
      }
      return;
    case 'crystal':
      fill(context, '#7450a8');
      context.fillStyle = '#9f7bd0';
      context.beginPath();
      context.moveTo(8, 0);
      context.lineTo(15, 8);
      context.lineTo(8, 15);
      context.lineTo(1, 8);
      context.closePath();
      context.fill();
      context.fillStyle = '#d5b9f0';
      context.beginPath();
      context.moveTo(8, 0);
      context.lineTo(8, 15);
      context.lineTo(4, 8);
      context.closePath();
      context.fill();
      context.fillStyle = '#5b388c';
      context.fillRect(8, 0, 1, SIZE);
      return;
    case 'cobblestone':
      fill(context, '#4c5350');
      for (let row = 0; row < 4; row += 1) {
        const y = row * 4;
        const offset = row % 2 === 0 ? -3 : 0;
        for (let x = offset; x < SIZE; x += 6) {
          context.fillStyle = random() > 0.5 ? '#747c78' : '#626a67';
          context.fillRect(x + 1, y + 1, 5, 3);
          context.fillStyle = '#909692';
          context.fillRect(x + 2, y + 1, 2, 1);
        }
      }
      return;
    case 'limestone':
      fill(context, '#c7bb97');
      scatter(context, random, ['#ded3ad', '#aa9c79', '#e8ddba'], 34, 1);
      context.fillStyle = '#998b6c';
      context.fillRect(0, 4, 11, 1);
      context.fillRect(5, 5, 7, 1);
      context.fillRect(3, 11, 13, 1);
      context.fillRect(0, 12, 6, 1);
      return;
    case 'granite':
      fill(context, '#906861');
      scatter(context, random, ['#c99a8e', '#654a48', '#dcc0ad', '#3e3d3b'], 78, 2);
      return;
    case 'slate':
      fill(context, '#485761');
      for (let y = 1; y < SIZE; y += 3) {
        context.fillStyle = y % 2 === 0 ? '#687782' : '#34434d';
        context.fillRect(Math.floor(random() * 4), y, 10 + Math.floor(random() * 6), 1);
      }
      scatter(context, random, ['#82909a', '#27343c'], 24, 1);
      return;
    case 'sandstone':
      fill(context, '#c89e61');
      scatter(context, random, ['#e0bb7a', '#ad814a', '#efd08b'], 32, 1);
      for (let y = 3; y < SIZE; y += 4) {
        context.fillStyle = y % 8 === 3 ? '#a77843' : '#dfb572';
        context.fillRect(0, y, SIZE, 1);
        context.fillRect((y * 3) % 9, y + 1, 6, 1);
      }
      return;
    case 'planks':
      fill(context, '#a86f3b');
      for (let y = 0; y < SIZE; y += 5) {
        context.fillStyle = '#714326';
        context.fillRect(0, y, SIZE, 1);
        const joint = (y * 5 + 4) % SIZE;
        context.fillRect(joint, y, 1, 5);
        context.fillStyle = '#cf9353';
        context.fillRect((joint + 3) % SIZE, y + 2, 6, 1);
      }
      scatter(context, random, ['#87542f', '#dc9e5a'], 20, 1);
      return;
    case 'crafting-bench':
      fill(context, '#8c562e');
      if (face === 'top') {
        context.fillStyle = '#d39a58';
        context.fillRect(1, 1, 14, 14);
        context.strokeStyle = '#5a341f';
        context.lineWidth = 1;
        context.strokeRect(1.5, 1.5, 13, 13);
        context.fillStyle = '#6b4025';
        for (let line = 4; line < 14; line += 4) {
          context.fillRect(line, 2, 1, 12);
          context.fillRect(2, line, 12, 1);
        }
      } else {
        context.fillStyle = '#c18448';
        context.fillRect(2, 2, 12, 4);
        context.fillStyle = '#4e2b1b';
        context.fillRect(2, 6, 3, 10);
        context.fillRect(11, 6, 3, 10);
        for (let step = 0; step < 7; step += 1) {
          context.fillRect(5 + step, 7 + step, 1, 1);
          context.fillRect(10 - step, 7 + step, 1, 1);
        }
      }
      return;
    case 'terracotta':
      fill(context, '#b75f43');
      scatter(context, random, ['#cf7756', '#944731', '#dc8964'], 30, 1);
      context.fillStyle = '#71392e';
      for (let index = -8; index < SIZE; index += 8) {
        for (let step = 0; step < 8; step += 1) {
          context.fillRect(index + step, step, 1, 1);
          context.fillRect(index + step, SIZE - 1 - step, 1, 1);
        }
      }
      return;
    case 'concrete':
      fill(context, '#9fa39f');
      scatter(context, random, ['#c4c7c1', '#777d79', '#d7d7ce', '#626a66'], 62, 2);
      context.fillStyle = '#e2e0d6';
      context.fillRect(2, 3, 1, 1);
      context.fillRect(12, 9, 2, 1);
      return;
    case 'steel':
      fill(context, '#7f8e95');
      context.fillStyle = '#b5c1c5';
      context.fillRect(1, 1, SIZE - 2, 1);
      context.fillRect(1, SIZE - 2, SIZE - 2, 1);
      context.fillStyle = '#4e5d64';
      context.fillRect(0, 7, SIZE, 2);
      context.fillRect(7, 0, 2, SIZE);
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) {
        context.fillStyle = '#d3dcde';
        context.fillRect(x, y, 1, 1);
      }
      return;
    case 'glowstone':
      fill(context, '#8d5c21');
      scatter(context, random, ['#c4862d', '#724517', '#e8b948'], 44, 2);
      context.fillStyle = '#ffe47a';
      for (let y = 0; y < SIZE; y += 1) {
        const x = (11 - Math.floor(y / 3) + (y % 4)) % SIZE;
        context.fillRect(x, y, 1, 1);
        if (y % 4 === 0) context.fillRect(x - 1, y, 3, 1);
      }
      return;
    case 'diamond':
      paintOre(context, random, '#2aa9b4', '#9ff4ee');
      context.fillStyle = '#d6ffff';
      context.fillRect(4, 3, 1, 1);
      context.fillRect(11, 10, 1, 1);
      return;
    case 'emerald':
      paintOre(context, random, '#238b50', '#7ee4a0');
      context.fillStyle = '#c5ffd2';
      context.fillRect(3, 11, 1, 1);
      context.fillRect(12, 4, 1, 1);
      return;
    case 'quartz':
      fill(context, '#e8e0d5');
      scatter(context, random, ['#f8f3e9', '#cfc4ba', '#fffdf6'], 34, 1);
      context.fillStyle = '#bcaeb0';
      for (let index = -6; index < SIZE; index += 7) {
        for (let step = 0; step < 8; step += 1) {
          context.fillRect(index + step, 3 + step, 1, 1);
        }
      }
      return;
    case 'bamboo':
      fill(context, '#76993a');
      if (face === 'top' || face === 'bottom') {
        context.fillStyle = '#a8c65c';
        context.fillRect(2, 2, 12, 12);
        context.fillStyle = '#4e702c';
        context.fillRect(3, 3, 10, 1);
        context.fillRect(3, 12, 10, 1);
        context.fillRect(3, 3, 1, 10);
        context.fillRect(12, 3, 1, 10);
      } else {
        for (let x = 1; x < SIZE; x += 5) {
          context.fillStyle = '#a4c252';
          context.fillRect(x, 0, 3, SIZE);
          context.fillStyle = '#4f702d';
          context.fillRect(x, 5, 3, 1);
          context.fillRect(x, 11, 3, 1);
        }
      }
      return;
    case 'peat':
      fill(context, '#4a3329');
      scatter(context, random, ['#2f211c', '#68483a', '#806049', '#39281f'], 72, 2);
      context.fillStyle = '#967051';
      context.fillRect(2, 5, 5, 1);
      context.fillRect(9, 12, 4, 1);
      return;
    case 'coral':
      fill(context, '#cf6c76');
      scatter(context, random, ['#ef9c91', '#b34e68', '#f2b09e', '#913d58'], 58, 2);
      context.fillStyle = '#7e394f';
      for (const [x, y] of [[3, 3], [11, 2], [7, 8], [13, 12], [2, 13]]) {
        context.fillRect(x, y, 2, 2);
        context.fillStyle = '#f3aaa0';
        context.fillRect(x, y, 1, 1);
        context.fillStyle = '#7e394f';
      }
      return;
  }
}

function createFaceTexture(material: BlockMaterial, face: BlockFace) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas textures are unavailable in this browser.');
  context.imageSmoothingEnabled = false;
  paintMaterial(context, material, face, seededRandom(`${material}-${face}`));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return { texture, preview: canvas.toDataURL('image/png') };
}

export function getBlockTextures(material: BlockMaterial) {
  const cached = textureCache.get(material);
  if (cached) return cached;

  const side = createFaceTexture(material, 'side');
  const top = createFaceTexture(material, 'top');
  const bottom = createFaceTexture(material, 'bottom');
  const textures = {
    side: side.texture,
    top: top.texture,
    bottom: bottom.texture,
    preview: material === 'grass' || material === 'wood' || material === 'snow' || material === 'bamboo'
      ? top.preview
      : side.preview,
  };
  textureCache.set(material, textures);
  return textures;
}
