// One material per surface type, rebuilt for each art style.
// Meshes carry userData.surf; applyStyle() swaps their materials in place.
import * as THREE from 'three';
import { makeStone, makeGrain, toonRamp } from './tex.js';

export const NOISE_GLSL = /* glsl */`
float iwH13(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float iwNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(iwH13(i), iwH13(i+vec3(1,0,0)), f.x), mix(iwH13(i+vec3(0,1,0)), iwH13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(iwH13(i+vec3(0,0,1)), iwH13(i+vec3(1,0,1)), f.x), mix(iwH13(i+vec3(0,1,1)), iwH13(i+vec3(1,1,1)), f.x), f.y), f.z); }
float iwFbm(vec3 p){ return 0.5*iwNoise(p) + 0.25*iwNoise(p*2.03) + 0.125*iwNoise(p*4.01) + 0.0625*iwNoise(p*8.02); }
`;

// Surface catalogue: base colour, texture, roughness, metalness.
const SURF = {
  stoneWall:  { color: 0xa39684, tex: 'wall',  rough: 0.95 },
  stoneFloor: { color: 0x8f8574, tex: 'floor', rough: 0.9 },
  stoneDark:  { color: 0x5e554b, tex: 'wall',  rough: 0.95 },
  stoneWallIn:{ color: 0xa39684, tex: 'wall',  rough: 0.95, side: THREE.BackSide },
  stoneDarkIn:{ color: 0x4a433b, tex: 'wall',  rough: 0.95, side: THREE.BackSide },
  frame:      { color: 0x7d7466, tex: 'wall',  rough: 0.85 },
  mudbrick:   { color: 0xc3a47a, tex: 'wall',  rough: 0.95 },
  plaster:    { color: 0xdccbaa, tex: 'grain', rough: 0.95 },
  wood:       { color: 0x6b5038, tex: 'grain', rough: 0.8 },
  rope:       { color: 0x9a8360, tex: 'grain', rough: 0.9 },
  clay:       { color: 0xa5643f, tex: 'grain', rough: 0.8 },
  metalGreen: { color: 0x4f7d62, tex: null,    rough: 0.45, metal: 0.6 },
  bronze:     { color: 0xa87a3e, tex: null,    rough: 0.35, metal: 0.85 },
  clothCream: { color: 0xd3c5a4, tex: 'grain', rough: 0.95 },
  clothOchre: { color: 0xb98a2e, tex: 'grain', rough: 0.95 },
  clothRust:  { color: 0x8e3b2a, tex: 'grain', rough: 0.95 },
  clothDark:  { color: 0x2e2f33, tex: 'grain', rough: 0.9 },
  bandage:    { color: 0xe6ddcb, tex: 'grain', rough: 0.95 },
  leather:    { color: 0x5d3c25, tex: 'grain', rough: 0.7 },
  skin:       { color: 0x8c5a3a, tex: null,    rough: 0.6 },
  hair:       { color: 0x17110d, tex: null,    rough: 0.7 },
  bone:       { color: 0xdcd3c1, tex: 'grain', rough: 0.6, iwang: true },
  tissue:     { color: 0x1d1512, tex: null,    rough: 0.25, iwang: true },
  olive:      { color: 0x7b8a5a, tex: null,    rough: 0.9 },
  bark:       { color: 0x5b4a3a, tex: 'grain', rough: 0.95 },
  flag:       { color: 0xa12c1e, tex: 'grain', rough: 0.9, side: THREE.DoubleSide },
  terrain:    { color: 0xffffff, tex: 'grain', rough: 0.95, vertexColors: true },
  grass:      { color: 0xffffff, tex: null,    rough: 0.9, grass: true, side: THREE.DoubleSide },
  ember:      { color: 0x2a1a10, tex: null,    rough: 0.9 },
};

function saturate(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * amt), hsl.l);
  return c;
}

export class Materials {
  constructor() {
    const wall = makeStone({ kind: 'wall', rows: 5, seed: 11 });
    const floor = makeStone({ kind: 'floor', rows: 3, seed: 23, moss: 0.3 });
    const grain = makeGrain({});
    this.tex = { wall, floor, grain };
    this.ramp = toonRamp();
    this.iwangShared = { uCoh: { value: 1 }, uTime: { value: 0 } };
    this.grassShared = { uTime: { value: 0 }, uWind: { value: 1 } };
    this.current = null;
    this.cache = {};
  }

  build(style) {
    if (this.cache[style.name]) return this.cache[style.name];
    const out = {};
    for (const [key, s] of Object.entries(SURF)) {
      const t = s.tex ? this.tex[s.tex] : null;
      const color = saturate(s.color, style.satMat);
      let m;
      const common = { color, side: s.side || THREE.FrontSide, vertexColors: !!s.vertexColors };
      if (style.mat === 'toon') {
        m = new THREE.MeshToonMaterial({ ...common, gradientMap: this.ramp, map: t ? t.map : null });
        if (t && t.normalMap && s.tex !== 'grain') { m.normalMap = t.normalMap; m.normalScale = new THREE.Vector2(0.35, 0.35); }
      } else {
        const detailed = style.mat === 'detailed';
        m = new THREE.MeshStandardMaterial({
          ...common,
          map: t ? t.map : null,
          roughness: detailed ? s.rough : Math.max(0.8, s.rough),
          metalness: detailed ? (s.metal || 0) : (s.metal || 0) * 0.4,
        });
        if (t && t.normalMap) { m.normalMap = t.normalMap; const k = detailed ? 1.3 : 0.55; m.normalScale = new THREE.Vector2(k, k); }
        if (t && t.roughnessMap && detailed) m.roughnessMap = t.roughnessMap;
      }
      if (s.iwang) this.patchIwang(m, key);
      if (s.grass) this.patchGrass(m);
      out[key] = m;
    }
    this.cache[style.name] = out;
    return out;
  }

  // Dissolve the Iwang where its coherence is low; a pale rim glows at the edge of the dissolve.
  patchIwang(m, key) {
    const sh = this.iwangShared;
    m.onBeforeCompile = (s) => {
      s.uniforms.uCoh = sh.uCoh; s.uniforms.uTime = sh.uTime;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vIwPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvIwPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vIwPos;\nuniform float uCoh;\nuniform float uTime;\n' + NOISE_GLSL)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float iwN = iwFbm(vIwPos * 3.2 + vec3(0.0, uTime * 0.7, uTime * 0.2));
          float iwEdge = uCoh * 1.15 - 0.1;
          if (iwN > iwEdge) discard;
          float iwRim = smoothstep(iwEdge - 0.12, iwEdge, iwN) * (1.0 - step(0.999, uCoh));`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb += vec3(0.75, 0.85, 1.0) * iwRim * 1.4;');
    };
    m.customProgramCacheKey = () => 'iwang-' + key + '-' + m.type;
  }

  // Grass blades bend with the wind; phase varies by instance position.
  patchGrass(m) {
    const sh = this.grassShared;
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = sh.uTime; s.uniforms.uWind = sh.uWind;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 gp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 gp = vec3(0.0);
          #endif
          float bend = position.y * position.y;
          float ph = uTime * 1.7 + gp.x * 0.35 + gp.z * 0.23;
          float gust = 0.6 + 0.4 * sin(uTime * 0.37 + gp.x * 0.05);
          transformed.x += (sin(ph) * 0.25 + 0.3) * bend * uWind * gust;
          transformed.z += cos(ph * 0.8) * 0.12 * bend * uWind;`);
    };
    m.customProgramCacheKey = () => 'grass-' + m.type;
  }

  // Swap every tagged mesh in a scene to this style's material.
  apply(root, style) {
    const mats = this.build(style);
    root.traverse((o) => {
      const surf = o.userData && o.userData.surf;
      if (surf && mats[surf]) o.material = mats[surf];
    });
    this.current = mats;
  }
}

// Helper: tag a mesh with its surface type.
export function tag(mesh, surf, cast = true, receive = true) {
  mesh.userData.surf = surf;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}
