// The circular flooded chamber under the ancestor terrace, and the black threshold in the lower pit.
// Test sequence: dormant -> (E at the clamp) echo -> live, the Iwang steps through -> (Space) closing -> dormant.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { tag, NOISE_GLSL } from './materials.js';
import { makeWater, addRipple } from './water.js';
import { makeIwangCode } from './figures.js';
import { Echo } from './echo.js';

const R = 6.0;                  // chamber radius
const PIT = { x0: -1.6, x1: 1.6, z0: -5.3, z1: -1.2, floor: -1.0 };
const DOOR = { z: -5.26, w: 2.0, h: 2.3, y0: -1.0 };
const ECHO_SECONDS = 41;        // the root records the first contact as forty-one seconds (Chapter 12)
const FACE = 0.73;              // the first line of light appears at face height (fraction of door height)

function scaleUV(g, s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); return g; }
function box(w, h, d, surf, x, y, z, uv = 0.5) { const m = tag(new THREE.Mesh(scaleUV(new THREE.BoxGeometry(w, h, d), uv)), surf); m.position.set(x, y, z); return m; }

export class Chamber {
  constructor(materials) {
    this.materials = materials;
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.FogExp2(0x1d1813, 0.05);
    s.background = new THREE.Color(0x0b0908);
    this.buildRoom();
    this.buildThreshold();
    this.buildLights();
    this.buildProps();
    this.buildDust();
    this.echo = new Echo(materials);
    this.doorU.uEcho.value = this.echo.rt.texture;
    this.iwCode = makeIwangCode();
    this.iwCode.visible = false;
    s.add(this.iwCode);
    this.iwTripo = null;
    this.iwangMode = 'code';
    this.cams = this.buildCameras();
    this.spawn = new THREE.Vector3(1.0, 0, 1.6);
    this.reset();
  }

  // ---------- geometry ----------
  buildRoom() {
    const s = this.scene;
    // floor with a hole where the pit is
    const shape = new THREE.Shape(); shape.absarc(0, 0, R, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.moveTo(PIT.x0, -PIT.z1); hole.lineTo(PIT.x1, -PIT.z1); hole.lineTo(PIT.x1, -PIT.z0); hole.lineTo(PIT.x0, -PIT.z0); hole.lineTo(PIT.x0, -PIT.z1);
    shape.holes.push(hole);
    const fg = scaleUV(new THREE.ShapeGeometry(shape, 48), 0.22); fg.rotateX(-Math.PI / 2);
    this.floorShape = shape;
    s.add(tag(new THREE.Mesh(fg), 'stoneFloor', false, true));
    // wall and dome
    const wg = new THREE.CylinderGeometry(R, R, 4.6, 64, 1, true);
    const uv = wg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 7, uv.getY(i) * 1.3);
    const wall = tag(new THREE.Mesh(wg), 'stoneWallIn', false, true); wall.position.y = 1.3;
    s.add(wall); this.wall = wall;
    const dome = tag(new THREE.Mesh(scaleUV(new THREE.SphereGeometry(R, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), 3)), 'stoneDarkIn', false, true);
    dome.scale.y = 0.5; dome.position.y = 3.6; s.add(dome); this.dome = dome;
    // the pit: floor, side walls, three steps down
    const pf = scaleUV(new THREE.PlaneGeometry(PIT.x1 - PIT.x0, 3.2), 0.3); pf.rotateX(-Math.PI / 2);
    const pitFloor = tag(new THREE.Mesh(pf), 'stoneFloor', false, true); pitFloor.position.set(0, PIT.floor, -3.85); s.add(pitFloor);
    s.add(box(0.4, 1.05, 4.1, 'stoneWall', PIT.x0 - 0.2, -0.48, -3.25));
    s.add(box(0.4, 1.05, 4.1, 'stoneWall', PIT.x1 + 0.2, -0.48, -3.25));
    for (let k = 0; k < 3; k++) {
      const top = -0.25 * (k + 1);
      s.add(box(PIT.x1 - PIT.x0, 0.3, 0.35, 'stoneFloor', 0, top - 0.15, PIT.z1 - 0.175 - k * 0.35));
    }
    // straight masonry face for the threshold, in front of the curved wall
    s.add(box(5.2, 4.4, 0.7, 'stoneWall', 0, 1.1, DOOR.z - 0.42, 0.9));
    // stair out of the chamber (south)
    this.stairVoid = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), new THREE.MeshBasicMaterial({ color: 0x050403 }));
    this.stairVoid.position.set(0, 1.15, R - 0.22); this.stairVoid.rotation.y = Math.PI; s.add(this.stairVoid);
    for (let k = 0; k < 3; k++) s.add(box(1.3, 0.22 * (k + 1), 0.35, 'stoneFloor', 0, 0.11 * (k + 1), R - 1.1 + k * 0.35));
    // a few loose stones and rubble along the wall
    const rub = new THREE.IcosahedronGeometry(0.22, 0);
    for (let i = 0; i < 14; i++) {
      const a = i * 0.47 + 0.3, rr = R - 0.35 - (i % 3) * 0.12;
      if (Math.abs(Math.sin(a)) < 0.35 && Math.cos(a) < 0) continue;
      const m = tag(new THREE.Mesh(rub), 'stoneDark'); m.position.set(Math.sin(a) * rr, 0.08, Math.cos(a) * rr);
      m.scale.set(1 + (i % 4) * 0.3, 0.6, 1); m.rotation.y = i; s.add(m);
    }
  }

  buildThreshold() {
    const s = this.scene;
    // stone frame: two jambs and a lintel
    const cy = DOOR.y0 + DOOR.h / 2;
    s.add(box(0.36, DOOR.h + 0.36, 0.5, 'frame', -DOOR.w / 2 - 0.18, cy + 0.18 - 0.18, DOOR.z - 0.05));
    s.add(box(0.36, DOOR.h + 0.36, 0.5, 'frame', DOOR.w / 2 + 0.18, cy + 0.18 - 0.18, DOOR.z - 0.05));
    s.add(box(DOOR.w + 0.72, 0.4, 0.55, 'frame', 0, DOOR.y0 + DOOR.h + 0.2, DOOR.z - 0.05));
    // mud crusted on the lower edge
    const mud = box(DOOR.w, 0.16, 0.08, 'stoneDark', 0, DOOR.y0 + 0.08, DOOR.z + 0.04); s.add(mud);
    // clamp recess in the right jamb with the green metal bar, one end broken off
    const rec = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.1), new THREE.MeshBasicMaterial({ color: 0x080706 }));
    rec.position.set(DOOR.w / 2 + 0.18, DOOR.y0 + 0.95, DOOR.z + 0.21); s.add(rec);
    this.clamp = box(0.06, 0.3, 0.06, 'metalGreen', DOOR.w / 2 + 0.16, DOOR.y0 + 0.97, DOOR.z + 0.25); this.clamp.rotation.z = 0.25; s.add(this.clamp);
    this.clampPos = new THREE.Vector3(DOOR.w / 2 - 0.25, PIT.floor, DOOR.z + 0.75);
    // the lifted slab over the pit, and the lever rope
    const slab = box(3.2, 0.32, 1.2, 'stoneWall', -2.9, 0.22, -3.0, 0.6); slab.rotation.set(0, 0.35, 0.16); s.add(slab);
    // the black surface
    this.doorU = {
      uTime: { value: 0 }, uState: { value: 0 }, uOpen: { value: 0 }, uEcho: { value: null },
      uFace: { value: FACE }, uLive: { value: 1.6 },
    };
    const doorMat = new THREE.ShaderMaterial({
      uniforms: this.doorU,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform float uTime, uState, uOpen, uFace, uLive; uniform sampler2D uEcho; varying vec2 vUv;
        ${NOISE_GLSL}
        void main() {
          vec2 uv = vUv; float t = uTime;
          vec3 col = vec3(0.008, 0.008, 0.01) + 0.012 * iwFbm(vec3(uv * vec2(6., 9.), t * 0.05));
          float d = abs(uv.y - uFace);
          float hw = uOpen * 0.78;
          float mask = 1.0 - smoothstep(hw - 0.02, hw + 0.015, d);
          mask *= smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
          if (uState > 0.5 && uState < 1.5) {
            vec2 w = uv + vec2(sin(uv.y * 40. + t * 2.1), sin(uv.x * 30. + t * 1.7)) * 0.0025;
            vec3 e = texture2D(uEcho, w).rgb;
            col = mix(col, e, mask);
          } else if (uState > 1.5) {
            float n = iwFbm(vec3(uv * vec2(3., 5.), t * 0.35));
            float corridor = 1.0 - pow(abs(uv.x - 0.5) * 1.8, 2.0);
            vec3 live = mix(vec3(0.66, 0.74, 0.84), vec3(1.0, 1.0, 0.98), n) * (0.55 + 0.6 * corridor) * uLive;
            col = mix(col, live, mask);
          }
          float line = exp(-d * d / (0.00015 + uOpen * uOpen * 0.002)) * step(0.001, uOpen) * step(0.5, uState);
          col += vec3(0.85, 0.93, 1.0) * line * 1.5;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.door = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w, DOOR.h), doorMat);
    this.door.position.set(0, DOOR.y0 + DOOR.h / 2, DOOR.z);
    s.add(this.door);
  }

  buildLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0x5b5f66, 0x2a2018, 0.35); s.add(this.hemi);
    // three-wicked lamp on a block at the pit's edge
    this.lampPos = new THREE.Vector3(2.15, 0.68, -1.05);
    this.lamp = new THREE.PointLight(0xffa35a, 9, 14, 1.6);
    this.lamp.position.copy(this.lampPos).add(new THREE.Vector3(0, 0.12, 0));
    this.lamp.castShadow = true; this.lamp.shadow.mapSize.set(512, 512); this.lamp.shadow.bias = -0.004; this.lamp.shadow.radius = 3;
    s.add(this.lamp);
    // grey daylight falling down the stair
    this.stair = new THREE.SpotLight(0xbfc8d4, 6, 12, 0.6, 0.8, 1.2);
    this.stair.position.set(0, 3.2, R + 0.6); this.stair.target.position.set(0, 0, 3.2); s.add(this.stair, this.stair.target);
    // the threshold's own light, only when it is open
    this.doorLight = new THREE.SpotLight(0xd8e8ff, 0, 18, 1.05, 0.7, 1.3);
    this.doorLight.position.set(0, DOOR.y0 + 1.3, DOOR.z + 0.15);
    this.doorLight.target.position.set(0, -0.6, 2);
    this.doorLight.castShadow = true; this.doorLight.shadow.mapSize.set(1024, 1024); this.doorLight.shadow.bias = -0.002;
    s.add(this.doorLight, this.doorLight.target);
  }

  buildProps() {
    const s = this.scene;
    // lamp block and clay lamp
    s.add(box(0.5, 0.55, 0.5, 'stoneWall', this.lampPos.x, 0.27, this.lampPos.z));
    const dish = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.07, 14)), 'clay'); dish.position.copy(this.lampPos).add(new THREE.Vector3(0, -0.07, 0)); s.add(dish);
    // flames: camera-facing, leaning toward the door when the air moves
    this.flameU = { uTime: { value: 0 }, uLean: { value: new THREE.Vector3() } };
    const fm = new THREE.ShaderMaterial({
      uniforms: this.flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform vec3 uLean; uniform float uTime; varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          float y = position.y + 0.5;
          vec3 wobble = right * sin(uTime * 13.0 + c.x * 50.0) * 0.006 * y;
          vec3 wp = c + right * position.x * 0.06 + vec3(0.0, y * 0.13, 0.0) + uLean * y * y * 0.12 + wobble;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - vec2(0.5, 0.25);
          float r = length(vec2(p.x * 2.2, p.y * (p.y > 0.0 ? 0.9 : 2.4)));
          float a = smoothstep(0.5, 0.05, r);
          vec3 col = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.9, 0.6), smoothstep(0.35, 0.0, r));
          gl_FragColor = vec4(col * 3.0 * a, a);
        }`,
    });
    this.flames = [];
    for (let k = 0; k < 3; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fm);
      const a = k * Math.PI * 2 / 3;
      f.position.copy(this.lampPos).add(new THREE.Vector3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08));
      f.frustumCulled = false;
      s.add(f); this.flames.push(f);
    }
    // baskets, rope coil, the wooden rod in the pit water, a wooden lever
    const basketG = new THREE.CylinderGeometry(0.26, 0.2, 0.3, 14, 1, true);
    for (const [x, z] of [[-3.4, 1.8], [-3.9, 1.0], [3.3, 2.4]]) { const b = tag(new THREE.Mesh(basketG), 'rope'); b.position.set(x, 0.15, z); s.add(b); }
    const coil = tag(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 18)), 'rope'); coil.rotation.x = Math.PI / 2; coil.position.set(-2.4, 0.05, -1.3); s.add(coil);
    const rod = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6)), 'wood'); rod.rotation.set(Math.PI / 2, 0, 0.6); rod.position.set(-0.5, PIT.floor + 0.03, -3.4); s.add(rod);
    const lever = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.2)), 'wood'); lever.position.set(-3.1, 0.06, -2.0); lever.rotation.y = 0.9; s.add(lever);
    // water on the main floor and in the pit
    this.waterMain = new THREE.Mesh(new THREE.ShapeGeometry(this.floorShape, 48).rotateX(-Math.PI / 2), makeWater({ deep: 0x15191a, refl: 0x4a5354 }));
    this.waterMain.position.y = 0.07; s.add(this.waterMain);
    this.waterPit = new THREE.Mesh(new THREE.PlaneGeometry(PIT.x1 - PIT.x0, 3.35).rotateX(-Math.PI / 2), makeWater({ deep: 0x15191a, refl: 0x4a5354 }));
    this.waterPit.position.set(0, PIT.floor + 0.09, -3.6); s.add(this.waterPit);
    this.waterPit.material.uniforms.uLineZ.value = DOOR.z + 0.02;
    this.waters = [this.waterMain, this.waterPit];
  }

  buildDust() {
    const N = 500;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    this.dustV = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (R - 0.3); pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 3.2 - 0.8; pos[i * 3 + 2] = Math.sin(a) * r; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8c8a8, size: 0.012, transparent: true, opacity: 0.35, depthWrite: false }));
    this.scene.add(this.dust);
  }

  buildCameras() {
    const mk = (fov, p, l) => { const c = new THREE.PerspectiveCamera(fov, 1, 0.05, 80); c.position.set(...p); c.lookAt(...l); c.userData.look = new THREE.Vector3(...l); return c; };
    return {
      wide: mk(52, [-0.8, 3.7, 5.3], [0.2, -0.5, -2.6]),
      pit: mk(50, [-2.35, 1.35, -1.0], [0.35, -0.3, -5.3]),
      echo: mk(44, [-1.05, 0.15, -2.2], [0.25, 0.05, -5.3]),
      live: mk(42, [-2.3, 1.55, 0.9], [0.1, -0.2, -4.4]),
    };
  }

  // ---------- Tripo Iwang ----------
  async loadTripo(url) {
    // The model ships as base64 text so it can be served next to the page; decode, then parse the GLB.
    const txt = await (await fetch(url)).text();
    const bin = Uint8Array.from(atob(txt.trim()), (c) => c.charCodeAt(0));
    const gltf = await new GLTFLoader().parseAsync(bin.buffer, '');
    const model = gltf.scene;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.tripoMat = o.material; o.frustumCulled = false; } });
    const wrap = new THREE.Group();
    model.scale.setScalar(2.6);
    wrap.add(model);
    wrap.visible = false;
    this.scene.add(wrap);
    const mixer = new THREE.AnimationMixer(model);
    const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
    const actions = { walk: mixer.clipAction(clips.walk), idle: mixer.clipAction(clips.idle) };
    actions.idle.play();
    this.iwTripo = { root: wrap, model, mixer, actions, current: 'idle' };
    if (this.style) this.styleTripo(this.style);
    return this.iwTripo;
  }
  styleTripo(st) {
    if (!this.iwTripo) return;
    this.iwTripo.model.traverse((o) => {
      if (!o.isMesh) return;
      const src = o.userData.tripoMat;
      const key = 'tripo-' + st.name;
      o.userData.styled = o.userData.styled || {};
      if (!o.userData.styled[key]) {
        let m;
        if (st.mat === 'toon') m = new THREE.MeshToonMaterial({ map: src.map, gradientMap: this.materials.ramp, color: 0xffffff, normalMap: src.normalMap });
        else { m = src.clone(); m.roughness = st.mat === 'detailed' ? 1 : 1; if (st.mat !== 'detailed') { m.normalScale = new THREE.Vector2(0.5, 0.5); } }
        this.materials.patchIwang(m, 'tripo');
        o.userData.styled[key] = m;
      }
      o.material = o.userData.styled[key];
    });
  }
  setIwangMode(mode) {
    if (mode === 'tripo' && !this.iwTripo) return false;
    this.iwangMode = mode;
    return true;
  }
  get iw() { return this.iwangMode === 'tripo' && this.iwTripo ? this.iwTripo.root : this.iwCode; }

  // ---------- style ----------
  applyStyle(st) {
    this.style = st;
    this.materials.apply(this.scene, st);
    this.materials.apply(this.iwCode, st);
    this.styleTripo(st);
    const c = st.chamber;
    this.scene.fog.color.setHex(c.fog[0]); this.scene.fog.density = c.fog[1];
    this.scene.background.setHex(c.fog[0]).multiplyScalar(0.5);
    this.hemi.color.setHex(c.hemi[0]); this.hemi.groundColor.setHex(c.hemi[1]); this.hemi.intensity = c.hemi[2];
    this.lamp.color.setHex(c.lamp[0]); this.lampBase = c.lamp[1];
    this.stair.color.setHex(c.stair[0]); this.stair.intensity = c.stair[1];
    this.doorLight.color.setHex(c.door[0]); this.doorBase = c.door[1];
    for (const w of this.waters) {
      const u = w.material.uniforms;
      u.uDeep.value.setHex(st.water.deep); u.uRefl.value.setHex(st.water.refl); u.uToon.value = st.water.toon;
    }
    this.doorU.uLive.value = st.mat === 'toon' ? 1.9 : 1.6;
  }

  // ---------- walking ----------
  heightAt(x, z) {
    if (x > PIT.x0 && x < PIT.x1 && z < PIT.z1 && z > PIT.z0) {
      const k = Math.floor((PIT.z1 - z) / 0.35);
      return k < 3 ? -0.25 * (k + 1) : PIT.floor;
    }
    return 0;
  }
  canStand(x, z, fromY) {
    if (Math.hypot(x, z) > R - 0.45) return false;
    const inPitX = x > PIT.x0 + 0.25 && x < PIT.x1 - 0.25;
    if (z < PIT.z1 && z > PIT.z0 && !(x > PIT.x0 && x < PIT.x1)) { /* beside the pit on the main floor: fine */ }
    if (x > PIT.x0 && x < PIT.x1 && z < PIT.z1) { if (!inPitX || z < DOOR.z + 0.4) return false; }
    if (Math.abs(this.heightAt(x, z) - fromY) > 0.3) return false;
    if (Math.hypot(x - this.lampPos.x, z - this.lampPos.z) < 0.5) return false;
    return true;
  }
  fixedCamera(p) {
    if (this.state === 'echo') return this.cams.echo;
    if (this.liveCutT > 0) return this.cams.live;
    return p.z < PIT.z1 + 0.15 ? this.cams.pit : this.cams.wide;
  }
  followBounds(pos) {
    const r = Math.hypot(pos.x, pos.z);
    if (r > R - 0.4) { pos.x *= (R - 0.4) / r; pos.z *= (R - 0.4) / r; }
    pos.y = Math.max(pos.y, this.heightAt(pos.x, pos.z) + 0.5);
    pos.y = Math.min(pos.y, 3.4);
  }

  // ---------- the sequence ----------
  reset() {
    this.state = 'dormant'; this.stateT = 0; this.open = 0; this.draft = 0; this.liveCutT = 0; this.cardShown = false;
    this.subtitle = null;
    this.iwPos = new THREE.Vector3(0, PIT.floor, DOOR.z - 1.4);
    this.iwYaw = 0; this.iwMode = 'hidden'; this.iwCoh = 0; this.iwTarget = new THREE.Vector3();
    this.iwCode.visible = false; if (this.iwTripo) this.iwTripo.root.visible = false;
    this.echo && this.echo.reset();
    this.flowOff = new THREE.Vector2();
    this.flowDir = new THREE.Vector2(0, 0);
  }
  prompt(player) {
    if (this.state === 'dormant' && player.distanceTo(this.clampPos) < 1.1) return ['E', 'Clear the mud from the clamp'];
    if (this.state === 'echo') return ['Enter', 'Skip the echo'];
    if (this.state === 'live' && this.iwMode !== 'hidden') return ['Space', 'Close the door'];
    return null;
  }
  interact(player) {
    if (this.state === 'dormant' && player.distanceTo(this.clampPos) < 1.1) { this.state = 'echo'; this.stateT = 0; this.echo.reset(); return true; }
    return false;
  }
  skipEcho() { if (this.state === 'echo') { this.stateT = ECHO_SECONDS; } }
  closeDoor() { if (this.state === 'live') { this.state = 'closing'; this.stateT = 0; } }

  update(dt, t, player, renderer, ui) {
    this.stateT += dt;
    const st = this.state;
    // --- door state ---
    if (st === 'echo') {
      this.open = Math.min(1, this.stateT / 3.5);
      this.doorU.uState.value = 1;
      this.echo.update(dt);
      this.echo.render(renderer);
      const lines = [
        [6, 13, "Don't go with him."],
        [15, 25, "Tobi. Listen. They aren't looking for stores."],
        [27, 37, "That door is what they came for. And now they know you can open it."],
      ];
      const cur = lines.find(([a, b]) => this.stateT > a && this.stateT < b);
      this.subtitle = cur ? { who: 'THE MAN BEYOND THE OPENING', text: cur[2] } : null;
      if (this.stateT > ECHO_SECONDS) { this.state = 'dark'; this.stateT = 0; this.subtitle = null; }
    } else if (st === 'dark') {
      this.open = Math.max(0, this.open - dt * 1.2);
      if (this.open === 0) this.doorU.uState.value = 0;
      this.subtitle = this.stateT > 0.8 ? { who: 'TEST', text: 'The overseer forces the clamp back into its recess. Metal clicks against metal.' } : null;
      if (this.stateT > 3.2) { this.state = 'live'; this.stateT = 0; this.liveCutT = 5.5; this.subtitle = null; }
    } else if (st === 'live') {
      this.doorU.uState.value = 2;
      this.open = Math.min(1, this.open + dt * 0.45);
      if (this.stateT > 2.2 && this.iwMode === 'hidden') { this.iwMode = 'emerge'; this.iwPos.set(0.15, PIT.floor, DOOR.z - 1.3); this.iwYaw = 0; }
      if (this.stateT > 1.0 && this.stateT < 4.5) this.subtitle = { who: '', text: 'This time the water moved.' }; else this.subtitle = null;
    } else if (st === 'closing') {
      this.open = Math.max(0, this.open - dt * 0.35);
      if (this.open <= 0.001) { this.doorU.uState.value = 0; this.state = 'dormant'; this.stateT = 0; }
    } else {
      this.doorU.uState.value = 0;
    }
    this.liveCutT = Math.max(0, this.liveCutT - dt);
    this.doorU.uOpen.value = this.open;
    this.doorU.uTime.value = t;
    const live = (st === 'live' || st === 'closing') ? this.open : 0;
    this.draft += ((live > 0.05 ? 1 : 0) * live - this.draft) * Math.min(1, dt * 1.5);
    this.doorLight.intensity = (this.doorBase || 60) * (st === 'echo' ? this.open * 0.08 : live);
    // --- lamp flicker, flames lean toward the door ---
    const fl = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.7 + 1.2) + 0.04 * Math.sin(t * 5.1);
    this.lamp.intensity = (this.lampBase || 9) * fl;
    const toDoor = new THREE.Vector3(0, 0, DOOR.z).sub(this.lampPos).setY(0).normalize();
    const leanAmt = (st === 'echo' ? 0.9 * this.open : 0) + this.draft * 1.4;
    this.flameU.uLean.value.copy(toDoor).multiplyScalar(leanAmt);
    this.flameU.uTime.value = t;
    // --- dust: drifts, then streams toward the door when the air moves ---
    const p = this.dust.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const dx = 0 - p[i], dz = DOOR.z - p[i + 2], dy = (DOOR.y0 + 1.2) - p[i + 1];
      const d = Math.hypot(dx, dy, dz) + 0.3;
      const pull = this.draft * 1.6 / d;
      p[i] += (Math.sin(t * 0.3 + i) * 0.02 + dx / d * pull) * dt;
      p[i + 1] += (Math.cos(t * 0.23 + i * 0.7) * 0.015 + dy / d * pull * 0.6) * dt;
      p[i + 2] += (Math.sin(t * 0.17 + i * 1.3) * 0.02 + dz / d * pull) * dt;
      if (d < 0.6 || p[i + 2] < DOOR.z + 0.05) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (R - 0.4); p[i] = Math.cos(a) * r; p[i + 1] = Math.random() * 3 - 0.8; p[i + 2] = Math.sin(a) * r; }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    // --- water: still during the echo, flows toward the door when live ---
    const wantFlow = this.draft;
    this.flowDir.set(0, -1).multiplyScalar(wantFlow * 0.9);
    this.flowOff.addScaledVector(this.flowDir, dt);
    for (const w of this.waters) {
      const u = w.material.uniforms;
      u.uTime.value = t; u.uFlowOff.value.copy(this.flowOff);
      u.uCalm.value = st === 'echo' ? Math.min(1, this.stateT) * 0.85 : Math.max(0, u.uCalm.value - dt);
      u.uLampPos.value.copy(this.lamp.position); u.uLampPow.value = this.lamp.intensity / 9;
      u.uDoorPos.value.set(0, DOOR.y0 + 1.1, DOOR.z); u.uDoorPow.value = this.doorLight.intensity / 30;
      u.uDoorCol.value.copy(this.doorLight.color);
    }
    // --- the Iwang ---
    this.updateIwang(dt, t, player, ui);
  }

  gradientAt(pos) {
    const d = Math.hypot(pos.x, (pos.y - (DOOR.y0 + 1)) * 0.5, pos.z - DOOR.z);
    const live = (this.state === 'live' || this.state === 'closing') ? this.open : 0;
    return live * THREE.MathUtils.clamp(1.25 - (d - 1.0) / 4.2, 0, 1);
  }

  updateIwang(dt, t, player, ui) {
    const code = this.iwCode, tri = this.iwTripo;
    const useTripo = this.iwangMode === 'tripo' && tri;
    code.visible = !useTripo && this.iwMode !== 'hidden';
    if (tri) tri.root.visible = !!useTripo && this.iwMode !== 'hidden';
    const shared = this.materials.iwangShared;
    shared.uTime.value = t;
    if (this.iwMode === 'hidden') return;
    let speed = 0;
    const pos = this.iwPos;
    const g = this.gradientAt(pos);
    const s = code.userData.state;
    if (this.iwMode === 'emerge') {
      // a hand on the threshold first, then it steps through
      const e = this.stateT - 2.2;
      s.press = THREE.MathUtils.clamp(e < 2.5 ? e / 1.2 : 1 - (e - 2.5) / 1.0, 0, 1);
      if (e > 2.2) { speed = 0.55; pos.z += speed * dt; }
      if (!this.cardShown && e > 1.2) { this.cardShown = true; ui.nameCard(); }
      if (pos.z > DOOR.z + 1.4) { this.iwMode = 'prowl'; this.prowlT = 0; s.press = 0; }
    } else if (this.iwMode === 'prowl') {
      this.prowlT += dt;
      // wander in the pit, drawn toward the person, but never far from the live gradient
      const tx = Math.sin(this.prowlT * 0.35) * 0.9;
      const tz = THREE.MathUtils.clamp(player.z, DOOR.z + 1.2, PIT.z1 - 0.9);
      this.iwTarget.set(tx, 0, tz);
      const dx = this.iwTarget.x - pos.x, dz = this.iwTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const near = Math.hypot(player.x - pos.x, player.z - pos.z);
      if (near < 2.0 && this.iwCoh > 0.75 && s.windup === 0 && s.strike === 0) { this.iwMode = 'windup'; this.modeT = 0; }
      else if (dist > 0.25) { speed = 0.5; pos.x += dx / dist * speed * dt; pos.z += dz / dist * speed * dt; }
      const face = Math.atan2(player.x - pos.x, player.z - pos.z);
      this.iwYaw += Math.atan2(Math.sin(face - this.iwYaw), Math.cos(face - this.iwYaw)) * Math.min(1, dt * 2);
      if (this.state === 'closing') this.iwMode = 'retreat';
    } else if (this.iwMode === 'windup') {
      this.modeT += dt;
      s.windup = Math.min(1, this.modeT / 0.9);
      if (this.modeT > 1.0) { this.iwMode = 'strike'; this.modeT = 0; }
    } else if (this.iwMode === 'strike') {
      this.modeT += dt;
      s.windup = Math.max(0, 1 - this.modeT * 4);
      s.strike = Math.min(1, this.modeT / 0.25);
      if (this.modeT > 0.2 && !this.struck) { this.struck = true; const near = Math.hypot(player.x - pos.x, player.z - pos.z); if (near < 2.1) ui.rewind(); }
      if (this.modeT > 0.9) { s.strike = 0; this.struck = false; this.iwMode = this.state === 'closing' ? 'retreat' : 'prowl'; }
    } else if (this.iwMode === 'retreat') {
      // it follows the vanishing current back through the door, not fleeing from anyone
      s.windup = Math.max(0, s.windup - dt * 3); s.strike = 0;
      const back = Math.atan2(0 - pos.x, DOOR.z - 2 - pos.z);
      this.iwYaw += Math.atan2(Math.sin(back - this.iwYaw), Math.cos(back - this.iwYaw)) * Math.min(1, dt * 3);
      speed = 0.9;
      pos.x += (0 - pos.x) * dt * 0.8; pos.z -= speed * dt;
      if (pos.z < DOOR.z - 1.6 || this.state === 'dormant') { this.iwMode = 'hidden'; }
    }
    pos.y = pos.z < DOOR.z ? PIT.floor : this.heightAt(pos.x, pos.z);
    // coherence follows the gradient with a short lag; behind the door it is fully itself
    const target = pos.z < DOOR.z ? 1 : Math.min(1, g * 1.35);
    this.iwCoh += (target - this.iwCoh) * Math.min(1, dt * 2.5);
    shared.uCoh.value = this.iwMode === 'hidden' ? 0 : this.iwCoh;
    // ripples where its feet meet the water
    if (speed > 0 && Math.random() < dt * 4 && pos.z > DOOR.z) addRipple(this.waterPit.material, pos.x + (Math.random() - 0.5) * 0.3, pos.z, t, 0.6 * this.iwCoh);
    const node = useTripo ? tri.root : code;
    node.position.copy(pos);
    node.rotation.y = this.iwYaw;
    // clip everything still behind the black surface, so it steps out of it
    const clip = this._clip || (this._clip = [new THREE.Plane(new THREE.Vector3(0, 0, 1), -DOOR.z)]);
    node.traverse((o) => { if (o.isMesh && o.material) { o.material.clippingPlanes = clip; o.castShadow = this.iwCoh > 0.55; } });
    if (useTripo) {
      const want = speed > 0.05 ? 'walk' : 'idle';
      if (want !== tri.current) { tri.actions[want].reset().fadeIn(0.35).play(); tri.actions[tri.current].fadeOut(0.35); tri.current = want; }
      tri.actions.walk.timeScale = 0.8;
      tri.mixer.update(dt);
      // Tripo gives only idle and walk; a small lunge stands in for the strike
      const lunge = (s.windup > 0 ? -0.15 * s.windup : 0) + (s.strike > 0 ? 0.35 * Math.sin(s.strike * Math.PI) : 0);
      tri.model.position.z = lunge;
    } else {
      code.userData.update(dt, speed, t);
    }
    // the collar knot darkens and hardens when it is solid
    const knot = code.userData.knot;
    if (knot && knot.material && knot.material.emissive) knot.material.emissive.setRGB(0.12 * s.windup, 0.02 * s.windup, 0.0);
  }

  ripplePlayer(player, t, moving) {
    if (!moving) return;
    this._rt = (this._rt || 0) + 1;
    if (this._rt % 9 !== 0) return;
    const w = player.z < PIT.z1 ? this.waterPit : this.waterMain;
    addRipple(w.material, player.x, player.z, t, 0.8);
  }
}
