// The old storehouse under the ancestor terrace.
// You come down a stair from daylight into a round chamber of old stone, braced with timber by the dig.
// At the far end, down three steps, stands the carved doorway with its black surface.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, PAINT, paintTexture } from './look.js';
import { makeWater } from './water.js';
import { rng } from './tex.js';

export const R = 7.0;                                  // chamber radius
export const SUNK = { x: 2.3, z0: -6.3, z1: -3.1, y: -0.9 };   // sunken area before the door
export const DOOR = { z: -6.25, y0: -0.72, w: 2.0, h: 2.9 };    // the black surface, standing on its stone step
export const STAIR = { x: 1.05, z0: 6.7, z1: 11.2, rise: 3.2 };  // stair up to daylight
export const STEP_D = 0.36;                                     // depth of each step down into the pit
// water surface height: ankle-deep on the hall floor, a thin sheet on each step
export function waterY(x, z) { const g = heightAt(x, z); return g + (g <= SUNK.y + 0.01 ? 0.06 : 0.05); }
const STONE = [0xb9ab93, 0xa89a82, 0xc4b69c, 0x9c8f79, 0xb3a58c];
const r = rng(7);

function blockGeo() { return new RoundedBoxGeometry(1, 1, 1, 2, 0.09); }

export function heightAt(x, z) {
  if (Math.abs(x) < STAIR.x && z > STAIR.z0 - 0.3) {
    const k = Math.floor((z - (STAIR.z0 - 0.3)) / 0.35);
    return Math.min(STAIR.rise, Math.max(0, (k + 1) * 0.25));
  }
  if (Math.abs(x) < SUNK.x && z < SUNK.z1 && z > SUNK.z0) {
    const k = Math.floor((SUNK.z1 - z) / 0.36);
    return k < 3 ? -0.3 * (k + 1) : SUNK.y;
  }
  return 0;
}

export function canStand(x, z, fromY) {
  const inStair = Math.abs(x) < STAIR.x - 0.3 && z > R - 1.2 && z < STAIR.z1;
  if (!inStair && Math.hypot(x, z) > R - 0.6) return false;
  if (Math.abs(x) < SUNK.x && z < SUNK.z1 && z > SUNK.z0) { if (Math.abs(x) > SUNK.x - 0.35 || z < DOOR.z + 1.2) return false; }
  if (Math.abs(heightAt(x, z) - fromY) > 0.32) return false;
  for (const o of OBSTACLES) if (Math.hypot(x - o[0], z - o[1]) < o[2]) return false;
  return true;
}
export const OBSTACLES = [];

export function buildWorld(scene, stones) {
  const W = {};
  STONES = stones; // chiselled block variants made in Blender (blender/stones.py)
  scene.background = new THREE.Color(0x1a1410);
  scene.fog = new THREE.FogExp2(0x2a1f17, 0.035);
  const geo = blockGeo();

  // ---------- wall: courses of hand-cut blocks, gaps for the stair and the door ----------
  const wallBlocks = [];
  let y = 0;
  for (let course = 0; y < 5.2; course++) {
    const h = 0.62 + r() * 0.34;
    let a = r() * 0.3;
    while (a < Math.PI * 2) {
      const len = 1.0 + r() * 1.1;
      const da = len / R;
      const mid = a + da / 2;
      const x = Math.sin(mid) * R, z = Math.cos(mid) * R;
      const skip = (Math.abs(x) < STAIR.x + 0.25 && z > 0 && y < 2.9) || (Math.abs(x) < 2.6 && z < 0 && y < 3.4 && Math.abs(x) < 2.6);
      if (!skip) wallBlocks.push({ x: x * (1 + (r() - 0.5) * 0.015), y: y + h / 2, z: z * (1 + (r() - 0.5) * 0.015), sx: len - 0.05, sy: h - 0.04, sz: 0.7, ry: mid, tilt: (r() - 0.5) * 0.04 });
      a += da;
    }
    y += h;
  }
  // straight face of blocks behind the door
  y = SUNK.y;
  while (y < 3.6) {
    const h = 0.45 + r() * 0.25; let x = -2.6 - r() * 0.4;
    while (x < 2.6) { const len = 0.6 + r() * 0.7; const cx = x + len / 2; if (!(Math.abs(cx) < DOOR.w / 2 + 0.6 && y < DOOR.y0 + DOOR.h + 0.3)) wallBlocks.push({ x: cx, y: y + h / 2, z: DOOR.z - 0.6, sx: len - 0.04, sy: h - 0.04, sz: 0.8, ry: 0, tilt: (r() - 0.5) * 0.03 }); x += len; }
    y += h;
  }
  // sunken area side walls
  for (const sx of [-1, 1]) {
    for (let z = SUNK.z0; z < SUNK.z1; ) { const len = 0.7 + r() * 0.5; wallBlocks.push({ x: sx * (SUNK.x + 0.3), y: SUNK.y / 2, z: z + len / 2, sx: 0.6, sy: -SUNK.y + 0.1, sz: len - 0.04, ry: 0, tilt: 0 }); z += len; }
  }
  // stair tunnel walls
  for (const sx of [-1, 1]) {
    for (let z = STAIR.z0 - 0.4; z < STAIR.z1 + 0.5; ) {
      const len = 0.6 + r() * 0.5;
      const base = heightAt(0, z);
      for (let yy = base - 0.4; yy < base + 3.0; yy += 0.55) wallBlocks.push({ x: sx * (STAIR.x + 0.35), y: yy + 0.27, z: z + len / 2, sx: 0.7, sy: 0.52, sz: len - 0.04, ry: 0, tilt: (r() - 0.5) * 0.03 });
      z += len;
    }
  }
  // the doorway's depth: stone sides and a lintel stone set back into the wall, and a step at its foot
  const rev = [];
  for (const sx of [-1, 1]) for (let yy = DOOR.y0; yy < DOOR.y0 + DOOR.h; ) { const h = 0.5 + r() * 0.3; rev.push({ x: sx * (DOOR.w / 2 + 0.22), y: yy + h / 2, z: DOOR.z + 0.2, sx: 0.44, sy: h - 0.03, sz: 0.5, ry: 0, tilt: 0 }); yy += h; }
  rev.push({ x: 0, y: DOOR.y0 + DOOR.h + 0.2, z: DOOR.z + 0.2, sx: DOOR.w + 0.9, sy: 0.42, sz: 0.5, ry: 0, tilt: 0 });
  rev.push({ x: 0, y: DOOR.y0 - 0.18, z: DOOR.z + 0.55, sx: DOOR.w + 1.0, sy: 0.36, sz: 1.3, ry: 0, tilt: 0 }); // the step: its top is the door's sill
  wallBlocks.push(...rev);
  W.walls = instBlocks('wall', wallBlocks, STONE, scene);
  // dried mud still crusted along the foot of the black surface (Chapter 1)
  const mud = new THREE.Mesh(new THREE.BoxGeometry(DOOR.w, 0.22, 0.08), toon(0x4a3524)); mud.position.set(0, DOOR.y0 + 0.1, DOOR.z + 0.04); scene.add(mud);

  // ---------- floor: flagstones under ankle-deep water ----------
  const flags = [];
  for (let gx = -R; gx < R; gx += 1.15) for (let gz = -R; gz < R; gz += 1.15) {
    const x = gx + (r() - 0.5) * 0.2, z = gz + (r() - 0.5) * 0.2;
    if (Math.hypot(x, z) > R + 0.2) continue;
    if (Math.abs(x) < SUNK.x + 0.4 && z < SUNK.z1 + 0.3 && z > SUNK.z0 - 0.4) continue;
    flags.push({ x, y: -0.1, z, sx: 1.05 + r() * 0.12, sy: 0.2, sz: 1.05 + r() * 0.12, ry: (r() - 0.5) * 0.12, tilt: (r() - 0.5) * 0.03 });
  }
  for (let gx = -SUNK.x + 0.5; gx < SUNK.x; gx += 1.0) for (let gz = SUNK.z0 + 0.4; gz < SUNK.z1 - 1.0; gz += 1.0) flags.push({ x: gx, y: SUNK.y - 0.1, z: gz, sx: 0.95, sy: 0.2, sz: 0.95, ry: (r() - 0.5) * 0.1, tilt: 0 });
  // the three steps down
  for (let k = 0; k < 3; k++) {
    const top = -0.3 * (k + 1), bottom = SUNK.y - 0.2, sy = top - bottom;
    for (let x = -SUNK.x; x < SUNK.x - 0.2; ) { const len = 0.8 + r() * 0.5; flags.push({ x: x + len / 2, y: top - sy / 2, z: SUNK.z1 - 0.18 - k * 0.36, sx: len - 0.04, sy, sz: 0.36, ry: 0, tilt: 0 }); x += len; }
  }
  // stair treads
  for (let k = 0; k * 0.35 < STAIR.z1 - STAIR.z0 + 0.3; k++) {
    const z = STAIR.z0 - 0.3 + k * 0.35 + 0.175;
    const top = Math.min(STAIR.rise, (k + 1) * 0.25);
    flags.push({ x: 0, y: top - 0.35, z, sx: STAIR.x * 2, sy: 0.7, sz: 0.36, ry: 0, tilt: (r() - 0.5) * 0.02 });
  }
  W.floor = instBlocks('slab', flags, [0x9b8e78, 0x8e826d, 0xa69880, 0x857a66], scene, false);
  // Floor outline with a hole over the sunken area. The hole must sit fully inside the outline,
  // or the triangulation silently drops it; the outline runs under the wall, so R + 0.6 is safe.
  const floorShape = () => {
    const sh = new THREE.Shape(); sh.absarc(0, 0, R + 0.6, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.moveTo(-SUNK.x, -SUNK.z1); hole.lineTo(-SUNK.x, -SUNK.z0); hole.lineTo(SUNK.x, -SUNK.z0); hole.lineTo(SUNK.x, -SUNK.z1); hole.closePath();
    sh.holes.push(hole); return sh;
  };
  const under = new THREE.Mesh(new THREE.ShapeGeometry(floorShape(), 48).rotateX(-Math.PI / 2), toon(0x2b231b)); under.position.y = -0.22; scene.add(under);
  const under2 = new THREE.Mesh(new THREE.PlaneGeometry(SUNK.x * 2 + 1, 4).rotateX(-Math.PI / 2), toon(0x2b231b)); under2.position.set(0, SUNK.y - 0.22, (SUNK.z0 + SUNK.z1) / 2); scene.add(under2);

  // ---------- ceiling: a low dome of dark stone with roots hanging from the joints ----------
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 0.4, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x3d3128, { side: THREE.BackSide }));
  dome.scale.y = 0.42; dome.position.y = 4.7; scene.add(dome);
  // stair ceiling slabs and the opening to daylight
  const ceil = []; for (let z = STAIR.z0; z < STAIR.z1 + 0.5; z += 0.9) ceil.push({ x: 0, y: heightAt(0, z) + 2.9, z: z + 0.45, sx: STAIR.x * 2 + 1.4, sy: 0.5, sz: 0.86, ry: 0, tilt: 0 });
  instBlocks('wall', ceil, [0x8f836e, 0x857a66], scene);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(STAIR.x * 2 + 0.4, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d2).multiplyScalar(1.8), fog: false }));
  sky.position.set(0, STAIR.rise + 1.2, STAIR.z1 + 0.9); sky.rotation.y = Math.PI; scene.add(sky); W.sky = sky;

  // ---------- water ----------
  const water = makeWater({ deep: 0x1d2b2c, refl: 0x587071, toon: 1, opacity: 0.72, scale: 2.2 });
  W.waterMain = new THREE.Mesh(new THREE.ShapeGeometry(floorShape(), 48).rotateX(-Math.PI / 2), water);
  W.waterMain.position.y = 0.05; scene.add(W.waterMain);
  const water2 = makeWater({ deep: 0x16211f, refl: 0x4a6060, toon: 1, opacity: 0.8, scale: 2.2 });
  // pit water reaches the foot of the bottom step (the third step sits at pit level)
  const pitEnd = SUNK.z1 - 2 * STEP_D;
  W.waterSunk = new THREE.Mesh(new THREE.PlaneGeometry(SUNK.x * 2, pitEnd - SUNK.z0).rotateX(-Math.PI / 2), water2);
  W.waterSunk.position.set(0, SUNK.y + 0.06, (SUNK.z0 + pitEnd) / 2); scene.add(W.waterSunk);
  water2.uniforms.uLineZ.value = DOOR.z + 0.03;
  // a thin sheet on each upper step, same material, so ripples cross from step to step
  W.stepWater = [0, 1].map((k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SUNK.x * 2, STEP_D).rotateX(-Math.PI / 2), water2);
    m.position.set(0, -0.3 * (k + 1) + 0.05, SUNK.z1 - STEP_D * (k + 0.5)); scene.add(m); return m;
  });
  // water spilling over each step edge: from the hall floor onto step 1, then 1 to 2, then 2 to the pit
  W.falls = [];
  const fallMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uCalm: { value: 0 } }]),
    vertexShader: 'varying vec2 vUv; varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader: /* glsl */`
      uniform float uTime, uCalm; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main() {
        float speed = mix(1.6, 0.05, uCalm);
        float streak = n(vec2(vW.x * 26.0, vUv.y * 3.0 + uTime * speed * 4.0));
        float foam = smoothstep(0.35, 0.0, vUv.y) + smoothstep(0.8, 1.0, vUv.y) * 0.5;
        vec3 col = mix(vec3(0.2, 0.28, 0.28), vec3(0.75, 0.82, 0.8), smoothstep(0.55, 0.9, streak) * 0.8 + foam * 0.6);
        float a = (0.45 + 0.35 * streak) * smoothstep(0.0, 0.08, vUv.y);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
  });
  for (let k = 0; k < 3; k++) {
    const top = k === 0 ? 0.05 : -0.3 * k + 0.05, bottom = -0.3 * (k + 1) + 0.05;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(SUNK.x * 2 - 0.1, top - bottom), fallMat);
    f.position.set(0, (top + bottom) / 2, SUNK.z1 - STEP_D * k - 0.015); scene.add(f);
    W.falls.push({ mesh: f, z: SUNK.z1 - STEP_D * k - 0.04, top, bottom });
  }
  W.fallMat = fallMat;
  W.waters = [W.waterMain, W.waterSunk];

  // ---------- light ----------
  W.hemi = new THREE.HemisphereLight(0x8a93a6, 0x3a2b1e, 0.55); scene.add(W.hemi);
  // daylight falling down the stair
  W.day = new THREE.SpotLight(0xffe6c0, 28, 26, 0.5, 0.6, 1.4);
  W.day.position.set(0, STAIR.rise + 2.6, STAIR.z1 + 1.2); W.day.target.position.set(0, 0, 3.5);
  W.day.castShadow = true; W.day.shadow.mapSize.set(1024, 1024); W.day.shadow.bias = -0.002;
  scene.add(W.day, W.day.target);
  // a pale shaft of light you can see (additive cone)
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uCol: { value: new THREE.Color(0xffe2b0) }, uStr: { value: 0.22 } },
    vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uStr; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(uCol * uStr * edge * smoothstep(0.0, 0.9, vY), 1.0); }',
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.3, 9, 24, 1, true), shaftMat);
  shaft.position.set(0, 2.2, 7.4); shaft.rotation.x = -0.72; scene.add(shaft); W.shaft = shaft;
  // lamp positions: two on stands flanking the door steps, one at the stair foot
  W.lampSpots = [new THREE.Vector3(-1.95, 1.05, -2.55), new THREE.Vector3(1.95, 1.05, -2.55), new THREE.Vector3(1.7, 0.55, 5.5)];
  W.lamps = W.lampSpots.map((p, i) => {
    const l = new THREE.PointLight(0xffa04a, i < 2 ? 7 : 5, 11, 1.5);
    l.position.copy(p).add(new THREE.Vector3(0, 0.45, 0));
    if (i < 2) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.005; }
    scene.add(l); return l;
  });
  // stone stands for the lamps
  for (const p of W.lampSpots) {
    const st = new THREE.Mesh(geo, toon(0x6f6352)); st.scale.set(0.45, p.y - 0.05, 0.45); st.position.set(p.x, (p.y - 0.05) / 2, p.z); st.castShadow = st.receiveShadow = true; scene.add(st);
    OBSTACLES.push([p.x, p.z, 0.45]);
  }
  // the door's own light, off until it opens
  W.doorLight = new THREE.SpotLight(0xcfe4ff, 0, 22, 1.1, 0.75, 1.2);
  W.doorLight.position.set(0, DOOR.y0 + 1.4, DOOR.z + 0.2); W.doorLight.target.position.set(0, -0.2, 3);
  W.doorLight.castShadow = true; W.doorLight.shadow.mapSize.set(1024, 1024); W.doorLight.shadow.bias = -0.002;
  scene.add(W.doorLight, W.doorLight.target);

  return W;
}

let STONES = null;
// Blocks drawn with the Blender stone variants, one draw call per variant, each block its own tone.
function instBlocks(kind, list, palette, scene, cast = true) {
  const variants = (STONES && STONES[kind] && STONES[kind].length) ? STONES[kind] : [blockGeo()];
  const groups = variants.map(() => []);
  list.forEach((b) => groups[Math.floor(r() * variants.length)].push(b));
  const mat = toon(0xffffff);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const meshes = groups.map((g, vi) => {
    const m = new THREE.InstancedMesh(variants[vi], mat, Math.max(1, g.length));
    m.count = g.length;
    g.forEach((b, i) => {
      // flip some blocks so the same variant never shows the same face twice in a row
      e.set(b.tilt, b.ry + (r() < 0.5 ? Math.PI : 0), b.tilt * 0.5); q.setFromEuler(e);
      mx.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.sx, b.sy, b.sz));
      m.setMatrixAt(i, mx);
      c.setHex(palette[Math.floor(r() * palette.length)]).multiplyScalar(0.9 + r() * 0.18);
      m.setColorAt(i, c);
    });
    m.castShadow = cast; m.receiveShadow = true;
    scene.add(m);
    return m;
  });
  return meshes;
}
