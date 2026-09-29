// Procedural textures drawn on canvases: stone walls, flagstones, cloth, water normals.
import * as THREE from 'three';

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000003) / 1000003; };
}

// Tileable 2D value noise with a given period in cells.
export function makeNoise(period, seed) {
  const r = rng(seed);
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (i, j) => g[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
    return a + (b - a) * v;
  };
}

export function fbm(noise, x, y, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function toTexture(c, srgb, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Height field -> normal map (wrapping Sobel).
function normalFromHeight(h, size, strength) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const H = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Irregular block masonry. kind: 'wall' (courses of blocks) or 'floor' (flagstones).
export function makeStone({ size = 512, rows = 6, seed = 1, kind = 'wall', moss = 0.5 } = {}) {
  const r = rng(seed);
  const n = makeNoise(16, seed + 7);
  const n2 = makeNoise(64, seed + 13);
  const rowH = size / rows;
  // per row: list of block edges (x positions), with a random offset
  const rowsEdges = [];
  const rowTone = [];
  for (let j = 0; j < rows; j++) {
    const edges = [0];
    let x = 0;
    const minW = kind === 'wall' ? size / 3.2 : size / 2.6;
    while (x < size) { x += minW * (0.7 + r() * 0.9); edges.push(Math.min(x, size)); }
    edges[edges.length - 1] = size;
    rowsEdges.push({ edges, off: r() * size });
    rowTone.push(edges.map(() => 0.72 + r() * 0.45));
  }
  const mortar = kind === 'wall' ? 5 : 4;
  const cc = canvas(size), ctx = cc.getContext('2d');
  const img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  const rough = canvas(size), rctx = rough.getContext('2d'), rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const j = Math.floor(y / rowH);
    const ly = y - j * rowH;
    const { edges, off } = rowsEdges[j];
    for (let x = 0; x < size; x++) {
      const xx = (x + off) % size;
      let k = 0;
      while (k < edges.length - 1 && edges[k + 1] <= xx) k++;
      const dxe = Math.min(xx - edges[k], edges[k + 1] - xx);
      const dye = Math.min(ly, rowH - ly);
      // wobble the joints so they don't look ruled
      const wob = (fbm(n, x / size * 12, y / size * 12, 3) - 0.5) * 16;
      const d = Math.min(dxe, dye) + wob;
      const inMortar = d < mortar;
      const grain = fbm(n2, x / size * 64, y / size * 64, 3);
      const big = fbm(n, x / size * 8 + j, y / size * 8, 4);
      const tone = rowTone[j][k];
      let v = inMortar ? 0.42 + grain * 0.12 : (0.55 + big * 0.35 + grain * 0.18) * tone;
      // bevel height
      const bevel = Math.min(1, Math.max(0, (d - mortar) / 14));
      h[y * size + x] = inMortar ? grain * 0.2 : 0.35 + bevel * 0.5 + grain * 0.25 + big * 0.2;
      let R = v, G = v * 0.95, B = v * 0.86;
      // moss: in joints and on low, damp parts of the wall
      const damp = kind === 'wall' ? Math.max(0, (y / size - 0.55) * 2.2) : 0.35;
      const m = (inMortar ? 1 : 0.25) * moss * damp * fbm(n, x / size * 24 + 3, y / size * 24, 3) * 2;
      if (m > 0.35) { const t = Math.min(1, (m - 0.35) * 2.2); R = R * (1 - t) + 0.24 * t; G = G * (1 - t) + 0.3 * t; B = B * (1 - t) + 0.15 * t; }
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, R * 255); img.data[i + 1] = Math.min(255, G * 255); img.data[i + 2] = Math.min(255, B * 255); img.data[i + 3] = 255;
      const ro = inMortar ? 0.95 : 0.75 + grain * 0.2;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = ro * 255; rimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return { map: toTexture(cc, true), normalMap: toTexture(normalFromHeight(h, size, 2.2), false), roughnessMap: toTexture(rough, false) };
}

// Soft woven cloth / generic grain texture (greyscale, tinted by material colour).
export function makeGrain({ size = 256, seed = 3, scale = 32, weave = true } = {}) {
  const n = makeNoise(scale, seed);
  const c = canvas(size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0.75 + (fbm(n, x / size * scale, y / size * scale, 3) - 0.5) * 0.35;
    if (weave) v *= 0.93 + 0.07 * Math.sin(x * 1.6) * Math.sin(y * 1.6);
    h[y * size + x] = v;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v * 255); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: toTexture(c, true), normalMap: toTexture(normalFromHeight(h, size, 1.2), false) };
}

// A three-band gradient for toon shading.
export function toonRamp() {
  const t = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
