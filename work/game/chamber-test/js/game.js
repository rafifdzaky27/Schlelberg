// Schlelberg chamber test: one style, one place, the threshold sequence.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Look, toon, toonify, RAMP } from './look.js';
import { buildWorld, heightAt, canStand, OBSTACLES, R, SUNK, DOOR, STAIR } from './world.js';
import { addRipple } from './water.js';

const $ = (id) => document.getElementById(id);
const hashOpts = (location.hash || '').slice(1).split('.');
const opt = (k) => hashOpts.includes(k);
let low = opt('low');

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.25;
$('stage').appendChild(renderer.domElement);
const look = new Look(renderer);
const scene = new THREE.Scene();
const W = buildWorld(scene);
const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 90);

// ---------- loading models shipped as base64 text ----------
const loader = new GLTFLoader();
async function loadModel(name) {
  const txt = await (await fetch(`assets/${name}.b64.txt`)).text();
  const bin = Uint8Array.from(atob(txt.trim()), (c) => c.charCodeAt(0));
  return loader.parseAsync(bin.buffer, '');
}
// Scale a model to a height, stand it on the ground, centre it.
function fit(obj, height) {
  const box = new THREE.Box3().setFromObject(obj);
  const s = height / (box.max.y - box.min.y);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  const g = new THREE.Group(); g.add(obj); return g;
}

// ---------- the black surface ----------
const doorU = { uTime: { value: 0 }, uState: { value: 0 }, uOpen: { value: 0 }, uEcho: { value: null }, uFace: { value: 0.66 } };
const doorMat = new THREE.ShaderMaterial({
  uniforms: doorU,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform float uTime, uState, uOpen, uFace; uniform sampler2D uEcho; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main() {
      vec2 uv = vUv; float t = uTime;
      // dormant: black that does not reflect the lamp, with a slow oily sheen crawling over it
      float sheen = n(uv * vec2(3., 5.) + vec2(t * 0.05, -t * 0.08)) * n(uv * 11. - t * 0.1);
      vec3 col = vec3(0.004, 0.005, 0.008) + vec3(0.05, 0.07, 0.1) * smoothstep(0.55, 0.9, sheen) * 0.7;
      float d = abs(uv.y - uFace);
      float hw = uOpen * 0.8;
      float mask = (1.0 - smoothstep(hw - 0.02, hw + 0.015, d)) * smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
      if (uState > 0.5 && uState < 1.5) {
        vec2 w = uv + vec2(sin(uv.y * 40. + t * 2.), sin(uv.x * 30. + t * 1.6)) * 0.002;
        col = mix(col, texture2D(uEcho, w).rgb, mask);
      } else if (uState > 1.5) {
        float corridor = 1.0 - pow(abs(uv.x - 0.5) * 1.9, 2.0);
        float walls = n(uv * vec2(4., 7.) + t * 0.2);
        vec3 live = mix(vec3(0.7, 0.8, 0.92), vec3(1.05, 1.05, 1.0), walls) * (0.6 + 0.8 * corridor) * 1.8;
        col = mix(col, live, mask);
      }
      float line = exp(-d * d / (0.00012 + uOpen * uOpen * 0.002)) * step(0.001, uOpen) * step(0.5, uState);
      col += vec3(0.9, 0.96, 1.0) * line * 2.0;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const door = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w, DOOR.h), doorMat);
door.position.set(0, DOOR.y0 + DOOR.h / 2, DOOR.z);
scene.add(door);

// ---------- the echo: Veyr, seen through the surface ----------
const echo = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(46, DOOR.w / DOOR.h, 0.1, 2000), rt: new THREE.WebGLRenderTarget(512, 728, { type: THREE.HalfFloatType }), t: 0 };
doorU.uEcho.value = echo.rt.texture;
{
  const s = echo.scene;
  s.background = new THREE.Color(0xc8d6df);
  s.fog = new THREE.Fog(0xd6dfe2, 120, 900);
  s.add(new THREE.HemisphereLight(0xf0f4f6, 0x8c8474, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(-40, 80, 30); s.add(sun);
  echo.cam.position.set(0, 1.6, 3.2); echo.cam.lookAt(0, 3.4, -40);
  let seed = 3; const rr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const towers = [];
  for (let i = 0; i < 24; i++) {
    const x = (rr() - 0.5) * 240, z = -70 - rr() * 240, h = 70 + rr() * 170, w = 10 + rr() * 14;
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.55, h, 12), toon(rr() > 0.5 ? 0xe6ddcc : 0xaec0cc, { map: null }));
    tw.position.set(x, h / 2 - 20, z); s.add(tw); towers.push({ x, z, h: h - 20 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(w * 0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe6ddcc, { map: null })); cap.position.set(x, h - 20, z); s.add(cap);
    for (let k = 0; k < 3; k++) { const g = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.58, w * 0.58, 2, 12), toon(0x8faa7f, { map: null })); g.position.set(x, h * (0.3 + k * 0.2) - 20, z); s.add(g); }
  }
  for (let i = 0; i < 12; i++) {
    const a = towers[Math.floor(rr() * towers.length)], b = towers[Math.floor(rr() * towers.length)]; if (a === b) continue;
    const yy = Math.min(a.h, b.h) * (0.4 + rr() * 0.4), len = Math.hypot(b.x - a.x, b.z - a.z);
    const road = new THREE.Mesh(new THREE.BoxGeometry(len, 1.4, 6), toon(0xded7ca, { map: null }));
    road.position.set((a.x + b.x) / 2, yy, (a.z + b.z) / 2); road.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); s.add(road);
  }
  // the near road that bows, and the people who fall from it
  echo.hinge = [new THREE.Group(), new THREE.Group()];
  const near = new THREE.Group(); near.position.set(-6, 36, -75); s.add(near);
  echo.hinge.forEach((g, i) => { near.add(g); const half = new THREE.Mesh(new THREE.BoxGeometry(60, 1.6, 7), toon(0xded7ca, { map: null })); half.position.x = i ? 30 : -30; g.add(half); });
  echo.carriage = new THREE.Mesh(new THREE.CapsuleGeometry(1.8, 18, 4, 10), new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 0.9, roughness: 0.2 }));
  echo.carriage.rotation.z = Math.PI / 2; s.add(echo.carriage);
  echo.fallers = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), new THREE.MeshBasicMaterial({ color: 0x2a2a30 })); m.visible = false; s.add(m); return { m, v: 0, x: -6 + (rr() - 0.5) * 14, d: rr() * 3 }; });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), toon(0xbdb5a6, { map: null })); ground.rotation.x = -Math.PI / 2; ground.position.z = -8; s.add(ground);
}
function echoUpdate(dt) {
  echo.t += dt; const t = echo.t;
  echo.carriage.position.set(-200 + ((t * 45) % 420), 64, -150);
  const bow = THREE.MathUtils.smoothstep(t, 10, 17);
  echo.hinge[0].rotation.z = -bow * 0.35; echo.hinge[1].rotation.z = bow * 0.35; echo.hinge.forEach((g) => (g.position.y = -bow * 4));
  for (const f of echo.fallers) if (t > 13 + f.d) { f.m.visible = true; if (!f.v) f.m.position.set(f.x, 32, -75); f.v += dt * 9.8; f.m.position.y -= f.v * dt; f.m.rotation.z += dt * 2; }
  if (echo.future && echo.futureMixer) echo.futureMixer.update(dt);
  renderer.setRenderTarget(echo.rt); renderer.render(echo.scene, echo.cam); renderer.setRenderTarget(null);
}
function echoReset() { echo.t = 0; echo.hinge.forEach((g) => { g.rotation.z = 0; g.position.y = 0; }); echo.fallers.forEach((f) => { f.v = 0; f.m.visible = false; }); }

// ---------- flames on the lamps ----------
const flameU = { uTime: { value: 0 }, uLean: { value: new THREE.Vector3() } };
const flameMat = new THREE.ShaderMaterial({
  uniforms: flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    uniform vec3 uLean; uniform float uTime; varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      float y = position.y + 0.5;
      vec3 wp = c + right * position.x * 0.09 + vec3(0.0, y * 0.2, 0.0) + uLean * y * y * 0.16 + right * sin(uTime * 12.0 + c.x * 40.0 + c.z * 13.0) * 0.012 * y;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vec2 p = vUv - vec2(0.5, 0.25);
      float r = length(vec2(p.x * 2.2, p.y * (p.y > 0.0 ? 0.85 : 2.6)));
      float a = smoothstep(0.5, 0.05, r);
      vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.92, 0.65), smoothstep(0.32, 0.0, r));
      gl_FragColor = vec4(col * 3.2 * a, a);
    }`,
});
const flames = [];
function addFlames(center, n = 3, rad = 0.07) {
  for (let k = 0; k < n; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flameMat);
    const a = k * Math.PI * 2 / n + 0.4;
    f.position.copy(center).add(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad));
    f.frustumCulled = false; scene.add(f); flames.push(f);
  }
}

// ---------- dust in the air ----------
const DUST = 900;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST * 3);
function dustSpawn(i) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (R - 0.5); dustPos[i * 3] = Math.cos(a) * rr; dustPos[i * 3 + 1] = Math.random() * 3.8 - 0.8; dustPos[i * 3 + 2] = Math.sin(a) * rr; }
for (let i = 0; i < DUST; i++) dustSpawn(i);
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,240,210,1)'); g.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.045, map: dustTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6c0 }));
scene.add(dust);

// ---------- props ----------
const PROPS = [
  // name, x, z, height, rotation, obstacle radius
  ['timber', -5.2, 3.6, 3.0, 1.0, 0.5], ['timber', 5.3, 3.2, 3.0, -1.0, 0.5], ['timber', -5.6, -2.4, 3.0, 2.0, 0.5], ['timber', 5.6, -2.0, 3.0, -2.1, 0.5],
  ['jar', -4.3, 1.4, 1.15, 0.3, 0.45], ['jar', -4.9, 0.6, 1.05, 1.4, 0.45], ['jar', -4.1, 0.1, 0.95, 2.4, 0.4],
  ['basket', 3.2, 4.3, 0.45, 0.2, 0.4], ['basket', 3.9, 3.7, 0.4, 1.2, 0.35], ['basket', -2.8, -1.6, 0.42, 0.5, 0.35],
  ['rubble', 4.6, 0.8, 0.8, 0.4, 0.8], ['rubble', -3.6, 4.9, 0.7, 2.0, 0.7], ['rubble', 3.4, -3.9, 0.6, 1.1, 0.6],
  ['tools', 4.4, 2.2, 1.5, -0.8, 0.35], ['tools', -3.3, -2.4, 1.4, 0.9, 0.35],
];
async function loadProps() {
  const cache = {};
  for (const [name, x, z, h, ry, rad] of PROPS) {
    if (!cache[name]) { cache[name] = (await loadModel(name)).scene; toonify(cache[name]); }
    const g = fit(cache[name].clone(), h);
    g.position.set(x, heightAt(x, z) - 0.02, z); g.rotation.y = ry;
    scene.add(g);
    OBSTACLES.push([x, z, rad]);
  }
  // lamps on their stands, with three flames each
  const lamp = (await loadModel('lamp')).scene; toonify(lamp);
  for (const p of W.lampSpots) { const g = fit(lamp.clone(), 0.18); g.scale.multiplyScalar(1.6); g.position.set(p.x, p.y - 0.06, p.z); scene.add(g); addFlames(p.clone().add(new THREE.Vector3(0, 0.12, 0))); }
  // the carved doorway around the black surface
  const portal = (await loadModel('portal')).scene; toonify(portal);
  // Tripo may hand the frame back turned sideways: face its wide side to the room
  const pb = new THREE.Box3().setFromObject(portal).getSize(new THREE.Vector3());
  if (pb.z > pb.x) portal.rotation.y = Math.PI / 2;
  const pg = fit(portal, DOOR.h * 1.42);
  pg.scale.x *= 1.05;
  pg.position.set(0, DOOR.y0 - 0.02, DOOR.z - 0.12);
  scene.add(pg);
}

// ---------- characters ----------
const player = { pos: new THREE.Vector3(0, 0, STAIR.z1 - 0.6), yaw: Math.PI, speed: 0 };
player.pos.y = heightAt(player.pos.x, player.pos.z);
let tobi = null, tobiMix = null, tobiAct = {}, tobiCur = 'idle';
const stand = new THREE.Group(); // stand-in until the model arrives
{ const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 10), toon(0xd8cbb0)); b.position.y = 0.8; stand.add(b); scene.add(stand); }
async function loadTobious() {
  let gltf;
  try { gltf = await loadModel('tobious'); } catch (e) { return; }
  const model = gltf.scene; toonify(model);
  model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  const g = fit(model, 1.75);
  scene.remove(stand); scene.add(g); tobi = g;
  if (gltf.animations.length) {
    tobiMix = new THREE.AnimationMixer(model);
    for (const c of gltf.animations) tobiAct[c.name] = tobiMix.clipAction(c);
    (tobiAct.idle || Object.values(tobiAct)[0]).play();
  }
  // the future self in the echo: same man, darker clothes, blood at the right ribs
  const fut = SkeletonUtils.clone(model);
  fut.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setRGB(0.55, 0.52, 0.52); } });
  const fg = fit(fut, 1.75); fg.position.set(0.5, 0, 0.2); fg.rotation.y = 0.15; echo.scene.add(fg);
  if (gltf.animations.length) { echo.futureMixer = new THREE.AnimationMixer(fut); const c = gltf.animations.find((a) => a.name === 'idle') || gltf.animations[0]; echo.futureMixer.clipAction(c).play(); }
  const blood = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0x7a1410, { map: null })); blood.position.set(0.2, 1.15, 0.12); fg.add(blood);
  echo.future = fg;
}

// Iwang (Tripo model)
const iw = { root: null, model: null, mix: null, act: {}, cur: 'idle', pos: new THREE.Vector3(), yaw: 0, mode: 'hidden', coh: 0, t: 0, windup: 0, lunge: 0 };
const iwU = { uCoh: { value: 1 }, uTime: { value: 0 } };
async function loadIwang() {
  const gltf = await loadModel('iwang');
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const m = new THREE.MeshToonMaterial({ gradientMap: RAMP, map: src.map, color: 0xffffff });
    m.onBeforeCompile = (s) => {
      s.uniforms.uCoh = iwU.uCoh; s.uniforms.uTime = iwU.uTime;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vIw;').replace('#include <project_vertex>', '#include <project_vertex>\nvIw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vIw; uniform float uCoh; uniform float uTime;
          float ih(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
          float inz(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(ih(i), ih(i+vec3(1,0,0)), f.x), mix(ih(i+vec3(0,1,0)), ih(i+vec3(1,1,0)), f.x), f.y), mix(mix(ih(i+vec3(0,0,1)), ih(i+vec3(1,0,1)), f.x), mix(ih(i+vec3(0,1,1)), ih(i+vec3(1,1,1)), f.x), f.y), f.z); }
          float ifbm(vec3 p){ return 0.5*inz(p) + 0.25*inz(p*2.03) + 0.125*inz(p*4.01) + 0.0625*inz(p*8.02); }`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float iN = ifbm(vIw * 3.0 + vec3(0.0, uTime * 0.8, uTime * 0.3));
          float iE = uCoh * 1.15 - 0.1;
          if (iN > iE) discard;
          float iRim = smoothstep(iE - 0.12, iE, iN) * (1.0 - step(0.999, uCoh));`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb += vec3(0.7, 0.85, 1.0) * iRim * 2.0;');
    };
    m.customProgramCacheKey = () => 'iwang';
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), -DOOR.z)];
    o.material = m; o.castShadow = true; o.frustumCulled = false;
  });
  const g = fit(model, 2.6);
  g.visible = false; scene.add(g);
  iw.root = g; iw.model = model;
  iw.mix = new THREE.AnimationMixer(model);
  for (const c of gltf.animations) iw.act[c.name] = iw.mix.clipAction(c);
  iw.act.idle && iw.act.idle.play();
}

// ---------- the sequence ----------
const ECHO_SECONDS = 41;
const clampPos = new THREE.Vector3(DOOR.w / 2 - 0.1, SUNK.y, DOOR.z + 0.8);
const S = { state: 'dormant', t: 0, open: 0, draft: 0, cut: 0, sub: null, cardShown: false };
function setState(s) { S.state = s; S.t = 0; }
function resetScene() {
  setState('dormant'); S.open = 0; S.draft = 0; S.cut = 0; S.cardShown = false; S.sub = null;
  iw.mode = 'hidden'; if (iw.root) iw.root.visible = false; echoReset();
  player.pos.set(0, 0, STAIR.z1 - 0.6); player.pos.y = heightAt(0, player.pos.z); player.yaw = Math.PI;
  cam.intro = 0;
}
function gradientAt(p) {
  const live = (S.state === 'live' || S.state === 'closing') ? S.open : 0;
  const d = Math.hypot(p.x, (p.y - (DOOR.y0 + 1)) * 0.5, p.z - DOOR.z);
  return live * THREE.MathUtils.clamp(1.3 - (d - 1) / 4.5, 0, 1);
}

// ---------- camera ----------
const cam = { mode: opt('fixed') ? 'fixed' : 'follow', yaw: Math.PI, pitch: 0.3, intro: opt('nointro') ? 99 : 0, pos: new THREE.Vector3(), look: new THREE.Vector3() };
const FIXED = {
  stair: [new THREE.Vector3(1.2, 2.6, 3.2), new THREE.Vector3(0, 2.0, 9.5)],
  hall: [new THREE.Vector3(-3.6, 3.6, 5.2), new THREE.Vector3(0.4, -0.4, -3.2)],
  door: [new THREE.Vector3(-2.2, 1.2, -1.5), new THREE.Vector3(0.4, -0.2, -5.8)],
  echo: [new THREE.Vector3(-1.1, 0.35, -2.7), new THREE.Vector3(0.25, 0.2, -6.3)],
  live: [new THREE.Vector3(-3.2, 2.2, 0.6), new THREE.Vector3(0.2, -0.3, -5)],
};
const INTRO = [
  [0, new THREE.Vector3(0, 4.2, 5.8), new THREE.Vector3(0, 0.2, -5.6)],
  [4.5, new THREE.Vector3(-4.5, 3.4, 1.0), new THREE.Vector3(0, -0.5, -5.8)],
  [7.0, null, null],
];
function updateCamera(dt) {
  let wantPos, wantLook, snap = false;
  if (cam.intro < INTRO[2][0]) {
    cam.intro += dt;
    const k = THREE.MathUtils.smoothstep(cam.intro, 0, INTRO[1][0]);
    wantPos = INTRO[0][1].clone().lerp(INTRO[1][1], k); wantLook = INTRO[0][2].clone().lerp(INTRO[1][2], k);
    snap = cam.intro < 0.1;
  } else if (S.state === 'echo') {
    [wantPos, wantLook] = FIXED.echo;
  } else if (S.cut > 0) {
    [wantPos, wantLook] = FIXED.live;
  } else if (cam.mode === 'follow') {
    const head = player.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
    const dist = 3.4;
    wantPos = head.clone().add(new THREE.Vector3(-Math.sin(cam.yaw) * dist * Math.cos(cam.pitch), Math.sin(cam.pitch) * dist, -Math.cos(cam.yaw) * dist * Math.cos(cam.pitch)));
    // keep the camera inside the room
    const rr = Math.hypot(wantPos.x, wantPos.z);
    const inStair = Math.abs(wantPos.x) < STAIR.x + 0.3 && wantPos.z > R - 1;
    if (!inStair && rr > R - 0.5) { wantPos.x *= (R - 0.5) / rr; wantPos.z *= (R - 0.5) / rr; }
    if (inStair) wantPos.x = THREE.MathUtils.clamp(wantPos.x, -STAIR.x + 0.2, STAIR.x - 0.2);
    wantPos.y = THREE.MathUtils.clamp(wantPos.y, heightAt(wantPos.x, wantPos.z) + 0.6, inStair ? heightAt(0, wantPos.z) + 2.5 : 4.2);
    wantLook = head;
  } else {
    const p = player.pos;
    if (p.z > R - 1.2) [wantPos, wantLook] = FIXED.stair;
    else if (p.z < SUNK.z1 + 0.6) [wantPos, wantLook] = FIXED.door;
    else [wantPos, wantLook] = FIXED.hall;
  }
  const k = snap ? 1 : Math.min(1, dt * (cam.mode === 'follow' && cam.intro >= INTRO[2][0] ? 6 : 2.5));
  cam.pos.lerp(wantPos, k); cam.look.lerp(wantLook, k);
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
}

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (cam.intro < INTRO[2][0] && (k.length === 1 || k === 'enter' || k === ' ')) cam.intro = INTRO[2][0];
  if (k === 'e') interact();
  if (k === ' ') { if (S.state === 'live') setState('closing'); e.preventDefault(); }
  if (k === 'enter' && S.state === 'echo') S.t = ECHO_SECONDS;
  if (k === 'r') resetScene();
  if (k === 'c') cam.mode = cam.mode === 'follow' ? 'fixed' : 'follow';
  if (k === 'q') { low = !low; resize(); }
  if (k === 'h') $('help').hidden = !$('help').hidden;
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); if (cam.intro < INTRO[2][0]) cam.intro = INTRO[2][0]; });
renderer.domElement.addEventListener('pointermove', (e) => { if (!drag) return; cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.0); drag = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', () => (drag = null));

function interact() {
  if (S.state === 'dormant' && player.pos.distanceTo(clampPos) < 1.2) { setState('echo'); echoReset(); hint(null); }
}

// ---------- UI ----------
let hintKey = '';
function hint(h) { const k = h ? h.join('|') : ''; if (k === hintKey) return; hintKey = k; const el = $('hint'); if (!h) { el.hidden = true; return; } el.hidden = false; el.innerHTML = (h[0] ? `<kbd>${h[0]}</kbd>` : '') + h[1]; }
function nameCard() { const n = $('namecard'); n.classList.add('on'); setTimeout(() => n.classList.remove('on'), 4500); }
let rewindT = 0;
function rewind() {
  rewindT = 1.4;
  $('rewind').classList.add('on');
  setTimeout(() => $('rewind').classList.remove('on'), 1400);
  const back = new THREE.Vector3(player.pos.x - iw.pos.x, 0, player.pos.z - iw.pos.z).normalize().multiplyScalar(1.3);
  for (let k = 1; k >= 0.2; k -= 0.2) { const nx = player.pos.x + back.x * k, nz = player.pos.z + back.z * k; if (canStand(nx, nz, player.pos.y)) { player.pos.x = nx; player.pos.z = nz; break; } }
}

// ---------- per-frame ----------
const tmp = new THREE.Vector3();
function update(dt, t) {
  S.t += dt;
  // movement, relative to the camera
  let f = 0, s = 0;
  if (keys.has('w') || keys.has('arrowup')) f += 1;
  if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('a') || keys.has('arrowleft')) s -= 1;
  if (keys.has('d') || keys.has('arrowright')) s += 1;
  let speed = 0;
  if ((f || s) && cam.intro >= INTRO[2][0]) {
    const fw = new THREE.Vector3(); camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
    const rt = new THREE.Vector3(-fw.z, 0, fw.x);
    const dir = fw.multiplyScalar(f).addScaledVector(rt, s).normalize();
    speed = keys.has('shift') ? 2.8 : 1.6;
    const nx = player.pos.x + dir.x * speed * dt, nz = player.pos.z + dir.z * speed * dt;
    if (canStand(nx, nz, player.pos.y)) { player.pos.x = nx; player.pos.z = nz; }
    else if (canStand(nx, player.pos.z, player.pos.y)) player.pos.x = nx;
    else if (canStand(player.pos.x, nz, player.pos.y)) player.pos.z = nz;
    else speed = 0;
    const want = Math.atan2(dir.x, dir.z);
    player.yaw += Math.atan2(Math.sin(want - player.yaw), Math.cos(want - player.yaw)) * Math.min(1, dt * 10);
    if (cam.mode === 'follow' && !drag) cam.yaw += Math.atan2(Math.sin(player.yaw - cam.yaw), Math.cos(player.yaw - cam.yaw)) * Math.min(1, dt * 1.3);
  }
  player.pos.y += (heightAt(player.pos.x, player.pos.z) - player.pos.y) * Math.min(1, dt * 14);
  const body = tobi || stand;
  body.position.copy(player.pos); body.rotation.y = player.yaw;
  if (tobiMix) {
    const want = speed > 0.1 && tobiAct.walk ? 'walk' : 'idle';
    if (want !== tobiCur && tobiAct[want]) { tobiAct[want].reset().fadeIn(0.25).play(); tobiAct[tobiCur] && tobiAct[tobiCur].fadeOut(0.25); tobiCur = want; }
    if (tobiAct.walk) tobiAct.walk.timeScale = speed / 1.4;
    tobiMix.update(dt);
  }
  if (speed > 0 && Math.random() < dt * 5) { const w = player.pos.z < SUNK.z1 ? W.waterSunk : W.waterMain; addRipple(w.material, player.pos.x, player.pos.z, t, 0.9); }

  // door states
  const st = S.state;
  if (st === 'echo') {
    S.open = Math.min(1, S.t / 3.5); doorU.uState.value = 1; echoUpdate(dt);
    const lines = [[6, 13, "Don't go with him."], [15, 25, "Tobi. Listen. They aren't looking for stores."], [27, 37, 'That door is what they came for. And now they know you can open it.']];
    const cur = lines.find(([a, b]) => S.t > a && S.t < b);
    S.sub = cur ? ['A MAN WITH YOUR FACE', cur[2]] : (S.t < 5 ? ['', 'The water around your feet goes still.'] : null);
    if (S.t > ECHO_SECONDS) setState('dark');
  } else if (st === 'dark') {
    S.open = Math.max(0, S.open - dt * 1.3); if (S.open === 0) doorU.uState.value = 0;
    S.sub = S.t > 0.8 ? ['', 'Someone forces the clamp back into its recess. Metal clicks against metal.'] : null;
    if (S.t > 3.4) { setState('live'); S.cut = 5.5; S.sub = null; }
  } else if (st === 'live') {
    doorU.uState.value = 2; S.open = Math.min(1, S.open + dt * 0.45);
    S.sub = S.t > 0.8 && S.t < 4.2 ? ['', 'This time the water moves.'] : null;
    if (S.t > 2.2 && iw.mode === 'hidden' && iw.root) { iw.mode = 'emerge'; iw.pos.set(0.1, SUNK.y, DOOR.z - 1.4); iw.yaw = 0; iw.t = 0; }
  } else if (st === 'closing') {
    S.open = Math.max(0, S.open - dt * 0.35);
    if (S.open <= 0.001) { doorU.uState.value = 0; setState('dormant'); }
  } else { doorU.uState.value = 0; S.sub = null; }
  S.cut = Math.max(0, S.cut - dt);
  doorU.uOpen.value = S.open; doorU.uTime.value = t;
  const live = (st === 'live' || st === 'closing') ? S.open : 0;
  S.draft += (live - S.draft) * Math.min(1, dt * 1.5);
  W.doorLight.intensity = st === 'echo' ? S.open * 6 : live * 55;

  // lamps flicker; flames lean toward the door as the air moves
  W.lamps.forEach((l, i) => { const fl = 0.85 + 0.09 * Math.sin(t * 11 + i * 2) + 0.06 * Math.sin(t * 23 + i) ; l.intensity = (i < 2 ? 7 : 5) * fl; });
  flameU.uTime.value = t;
  flameU.uLean.value.set(0, 0, -1).multiplyScalar((st === 'echo' ? S.open * 0.8 : 0) + S.draft * 1.5);

  // dust drifts, then streams toward the open door
  for (let i = 0; i < DUST; i++) {
    const j = i * 3;
    const dx = -dustPos[j], dy = DOOR.y0 + 1.2 - dustPos[j + 1], dz = DOOR.z - dustPos[j + 2];
    const d = Math.hypot(dx, dy, dz) + 0.3, pull = S.draft * 1.8 / d;
    dustPos[j] += (Math.sin(t * 0.3 + i) * 0.03 + dx / d * pull) * dt;
    dustPos[j + 1] += (Math.cos(t * 0.2 + i * 0.7) * 0.02 + dy / d * pull * 0.5) * dt;
    dustPos[j + 2] += (Math.sin(t * 0.17 + i * 1.3) * 0.03 + dz / d * pull) * dt;
    if (d < 0.6 || dustPos[j + 2] < DOOR.z + 0.05) dustSpawn(i);
  }
  dustGeo.attributes.position.needsUpdate = true;

  // water: still during the echo, pulled toward the door when live
  S.flow = S.flow || new THREE.Vector2();
  S.flow.y -= S.draft * 0.9 * dt;
  for (const w of W.waters) {
    const u = w.material.uniforms;
    u.uTime.value = t; u.uFlowOff.value.copy(S.flow);
    u.uCalm.value = st === 'echo' ? Math.min(0.9, S.t) : Math.max(0, u.uCalm.value - dt);
    u.uLampPos.value.copy(W.lamps[0].position); u.uLampPow.value = 1.2;
    u.uDoorPos.value.set(0, DOOR.y0 + 1.1, DOOR.z); u.uDoorPow.value = W.doorLight.intensity / 30;
  }

  updateIwang(dt, t);

  // hints and subtitles
  if (cam.intro < INTRO[2][0]) hint(null);
  else if (st === 'dormant' && player.pos.distanceTo(clampPos) < 1.2) hint(['E', 'Clear the mud from the clamp']);
  else if (st === 'dormant' && player.pos.z > SUNK.z1) hint(['', 'Go down to the black door']);
  else if (st === 'echo') hint(['Enter', 'Skip the echo']);
  else if (st === 'live' && iw.mode !== 'hidden') hint(['Space', 'Close the door']);
  else hint(null);
  const sub = rewindT > 0 ? ['', 'No. That is not how it went.'] : S.sub;
  rewindT = Math.max(0, rewindT - dt);
  const html = sub ? (sub[0] ? `<span class="who">${sub[0]}</span>` : '') + sub[1] : '';
  if ($('subtitle').innerHTML !== html) $('subtitle').innerHTML = html;
  look.ink.uniforms.uRewind.value = rewindT > 0 ? Math.min(1, rewindT) : 0;
}

function updateIwang(dt, t) {
  if (!iw.root) return;
  iwU.uTime.value = t;
  iw.root.visible = iw.mode !== 'hidden';
  if (iw.mode === 'hidden') return;
  iw.t += dt;
  let speed = 0;
  const p = iw.pos;
  const near = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
  if (iw.mode === 'emerge') {
    if (iw.t > 1.2 && !S.cardShown) { S.cardShown = true; nameCard(); }
    if (iw.t > 0.8) { speed = 0.6; p.z += speed * dt; }
    if (p.z > DOOR.z + 1.5) iw.mode = 'prowl';
  } else if (iw.mode === 'prowl') {
    const tx = Math.sin(iw.t * 0.35) * 1.0, tz = THREE.MathUtils.clamp(player.pos.z, DOOR.z + 1.2, SUNK.z1 - 0.8);
    const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    if (near < 2.1 && iw.coh > 0.75) { iw.mode = 'windup'; iw.mt = 0; }
    else if (dist > 0.3) { speed = 0.55; p.x += dx / dist * speed * dt; p.z += dz / dist * speed * dt; }
    if (S.state === 'closing') iw.mode = 'retreat';
  } else if (iw.mode === 'windup') {
    iw.mt += dt; iw.windup = Math.min(1, iw.mt / 0.9);
    if (iw.mt > 1.0) { iw.mode = 'strike'; iw.mt = 0; }
  } else if (iw.mode === 'strike') {
    iw.mt += dt; iw.windup = Math.max(0, 1 - iw.mt * 5); iw.lunge = Math.sin(Math.min(1, iw.mt / 0.35) * Math.PI);
    if (iw.mt > 0.18 && !iw.hit) { iw.hit = true; if (near < 2.2) rewind(); }
    if (iw.mt > 0.8) { iw.hit = false; iw.lunge = 0; iw.mode = S.state === 'closing' ? 'retreat' : 'prowl'; }
  } else if (iw.mode === 'retreat') {
    iw.windup = 0; speed = 0.95; p.x += (0 - p.x) * dt; p.z -= speed * dt;
    if (p.z < DOOR.z - 1.8) iw.mode = 'hidden';
  }
  // face the person, or the door when leaving
  const face = iw.mode === 'retreat' ? Math.PI : Math.atan2(player.pos.x - p.x, player.pos.z - p.z);
  iw.yaw += Math.atan2(Math.sin(face - iw.yaw), Math.cos(face - iw.yaw)) * Math.min(1, dt * 2.5);
  p.y = p.z < DOOR.z ? SUNK.y : heightAt(p.x, p.z);
  // it is solid near the live seam and turns to smoke away from it
  const target = p.z < DOOR.z ? 1 : Math.min(1, gradientAt(p) * 1.35);
  iw.coh += (target - iw.coh) * Math.min(1, dt * 2.5);
  iwU.uCoh.value = iw.coh;
  iw.root.position.copy(p);
  iw.root.rotation.y = iw.yaw;
  iw.model.position.z = -0.25 * iw.windup + 0.45 * iw.lunge;
  iw.model.rotation.x = -0.12 * iw.windup + 0.2 * iw.lunge;
  const want = speed > 0.05 ? 'walk' : 'idle';
  if (want !== iw.cur && iw.act[want]) { iw.act[want].reset().fadeIn(0.3).play(); iw.act[iw.cur] && iw.act[iw.cur].fadeOut(0.3); iw.cur = want; }
  if (iw.act.walk) iw.act.walk.timeScale = 0.8;
  iw.mix.update(dt * (1 + iw.windup * 0.8));
  if (speed > 0 && Math.random() < dt * 4 && p.z > DOOR.z) addRipple(W.waterSunk.material, p.x, p.z, t, 0.7 * iw.coh);
}

// ---------- size + loop ----------
function resize() {
  const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio, low ? 0.7 : 1.5);
  renderer.setPixelRatio(pr); renderer.setSize(w, h); look.setSize(w, h, pr);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
const clock = new THREE.Clock();
let t = 0;
const hideFromInk = [dust, W.shaft, W.waterMain, W.waterSunk, W.sky];
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); t += dt;
  update(dt, t);
  updateCamera(dt);
  look.render(scene, camera, t, [...hideFromInk, ...flames]);
  requestAnimationFrame(frame);
}

// boot: show the room at once, fill in models as they arrive
cam.pos.copy(INTRO[0][1]); cam.look.copy(INTRO[0][2]);
requestAnimationFrame(frame);
Promise.all([loadProps(), loadTobious(), loadIwang()]).then(() => {
  $('loading').classList.add('done');
}).catch((e) => { console.error(e); $('loading').classList.add('done'); });
setTimeout(() => $('title').classList.add('on'), 600);
setTimeout(() => $('title').classList.remove('on'), 6800);

window.__ct = { S, player, cam, iw, get tobi() { return tobi; }, THREE, W, setState, resetScene, go(x, z, yaw) { player.pos.set(x, heightAt(x, z), z); if (yaw !== undefined) player.yaw = yaw; cam.yaw = player.yaw; }, interact, skipIntro() { cam.intro = 99; } };
