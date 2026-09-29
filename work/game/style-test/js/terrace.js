// The Aras terraces falling toward the bay: dry barley fields, olive trees, mud-brick houses on stone,
// the granary with its jars, and the red cloth of Telassar on the ridge across the valley.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tag } from './materials.js';
import { makeWater } from './water.js';
import { makeNoise, fbm, rng } from './tex.js';

const noise = makeNoise(64, 5);
const STEP = 1.7;

// Land rises inland (negative z) from the bay (positive z). Terraces are soft steps in that rise.
export function terrainHeight(x, z) {
  const inland = THREE.MathUtils.clamp((58 - z) * 0.16, 0, 60);
  const hills = (fbm(noise, x * 0.012 + 3, z * 0.012 + 7, 4) - 0.45) * 16;
  let h = inland + hills * THREE.MathUtils.smoothstep(inland, 0, 10);
  // terraces on the village slope
  const onSlope = THREE.MathUtils.smoothstep(z, 40, 25) * THREE.MathUtils.smoothstep(z, -70, -50) * THREE.MathUtils.smoothstep(Math.abs(x), 90, 60);
  if (onSlope > 0) {
    const t = h / STEP;
    const stepped = STEP * (Math.floor(t) + THREE.MathUtils.smoothstep(t - Math.floor(t), 0.82, 1.0));
    h = h + (stepped - h) * onSlope;
  }
  // the far ridge across the valley
  const ridge = Math.exp(-Math.pow((x - 150) / 70, 2)) * Math.exp(-Math.pow((z + 40) / 90, 2)) * 45;
  // shoreline dips under the sea
  const shore = THREE.MathUtils.smoothstep(z, 55, 75) * 6;
  return h + ridge - shore;
}

export class Terrace {
  constructor(materials) {
    this.materials = materials;
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.FogExp2(0xd8c7a3, 0.0065);
    this.buildSky();
    this.buildGround();
    this.buildSea();
    this.buildVillage();
    this.buildTrees();
    this.buildGrass();
    this.buildRidge();
    this.buildLights();
    this.cams = this.buildCameras();
    this.spawn = new THREE.Vector3(2, 0, 6);
    this.spawn.y = terrainHeight(this.spawn.x, this.spawn.z);
  }

  buildSky() {
    this.skyU = { uTop: { value: new THREE.Color(0x9fb2bd) }, uHorizon: { value: new THREE.Color(0xe6d5b0) }, uSunDir: { value: new THREE.Vector3(0.4, 0.35, 0.8).normalize() } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform vec3 uTop, uHorizon, uSunDir; varying vec3 vD;
        void main() {
          float h = clamp(vD.y, 0.0, 1.0);
          vec3 c = mix(uHorizon, uTop, pow(h, 0.55));
          float sun = max(dot(vD, uSunDir), 0.0);
          c += vec3(1.0, 0.85, 0.6) * (pow(sun, 8.0) * 0.2 + pow(sun, 400.0) * 3.0);
          if (vD.y < 0.0) c = uHorizon;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    this.scene.add(sky);
  }

  buildGround() {
    const size = 560, seg = 240;
    const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const dry = new THREE.Color(0xc9a95e), green = new THREE.Color(0x8f9460), soil = new THREE.Color(0x9c7a55), stone = new THREE.Color(0x9a8f80), sand = new THREE.Color(0xd8c9a0);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) + 20;
      p.setZ(i, z);
      const h = terrainHeight(x, z);
      p.setY(i, h);
      const e = 0.8;
      const slope = Math.hypot(terrainHeight(x + e, z) - h, terrainHeight(x, z + e) - h) / e;
      const n = fbm(noise, x * 0.05, z * 0.05, 3);
      c.copy(dry).lerp(green, THREE.MathUtils.clamp((n - 0.4) * 2.5, 0, 1));
      if (Math.abs(x) < 26 && z > -12 && z < 26) c.lerp(soil, 0.55); // trodden village ground
      if (slope > 0.9) c.copy(stone).multiplyScalar(0.85 + n * 0.3); // terrace walls
      if (h < 1.2) c.copy(sand);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 60);
    this.ground = tag(new THREE.Mesh(g), 'terrain', false, true);
    this.scene.add(this.ground);
  }

  buildSea() {
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1600).rotateX(-Math.PI / 2), makeWater({ deep: 0x2f5d6e, refl: 0xb7c8cc, opacity: 1, scale: 0.35 }));
    this.sea.position.set(0, 0.6, 700);
    this.scene.add(this.sea);
  }

  place(obj, x, z, yOff = 0) { obj.position.set(x, terrainHeight(x, z) + yOff, z); this.scene.add(obj); return obj; }

  buildVillage() {
    const r = rng(77);
    const houseSpots = [];
    for (let i = 0; i < 34; i++) {
      const x = (r() - 0.5) * 50, z = -10 + r() * 34;
      if (Math.hypot(x - 2, z - 6) < 7) continue; // keep the granary yard clear
      if (houseSpots.some(([a, b]) => Math.hypot(a - x, b - z) < 5.5)) continue;
      houseSpots.push([x, z]);
    }
    for (const [x, z] of houseSpots) {
      const w = 3.2 + r() * 2.2, d = 3 + r() * 2, h = 2.2 + r() * 1.3;
      const g = new THREE.Group();
      const base = tag(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.9, d + 0.3)), 'stoneWall'); base.position.y = 0.2; g.add(base);
      const body = tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, d)), 'mudbrick'); body.position.y = 0.6 + h / 2; g.add(body);
      const roof = tag(new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.22, d + 0.25)), 'wood'); roof.position.y = 0.6 + h + 0.1; g.add(roof);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), new THREE.MeshBasicMaterial({ color: 0x1a120c })); door.position.set(0, 1.35, d / 2 + 0.01); g.add(door);
      g.rotation.y = (r() - 0.5) * 0.4;
      this.place(g, x, z, -0.2);
    }
    // the granary and its fourteen jars
    const gran = new THREE.Group();
    const gb = tag(new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5)), 'mudbrick'); gb.position.y = 1.7 + 0.6; gran.add(gb);
    const gs = tag(new THREE.Mesh(new THREE.BoxGeometry(7.4, 1, 5.4)), 'stoneWall'); gs.position.y = 0.3; gran.add(gs);
    const gl = tag(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 0.5)), 'wood'); gl.position.set(0, 2.6, 2.6); gran.add(gl);
    const gd = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), new THREE.MeshBasicMaterial({ color: 0x140e09 })); gd.position.set(0, 1.55, 2.51); gran.add(gd);
    this.place(gran, 2, -1, -0.1);
    const jarG = new THREE.LatheGeometry([[0, 0], [0.22, 0.02], [0.34, 0.3], [0.36, 0.55], [0.26, 0.85], [0.16, 0.95], [0.18, 1.02], [0, 1.02]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
    for (let k = 0; k < 14; k++) {
      const jar = tag(new THREE.Mesh(jarG), 'clay');
      this.place(jar, -3.5 + k * 0.78, 3.4 + (k % 2) * 0.12, 0);
    }
    // statue of the woman with the bowl by the well (simple stand-in)
    const well = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.8, 20, 1, true)), 'stoneWall'); this.place(well, 10, 10, 0.4);
    const statue = tag(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 4, 10)), 'plaster'); this.place(statue, 11.6, 9.2, 0.85);
  }

  buildTrees() {
    const r = rng(9);
    const trunk = new THREE.CylinderGeometry(0.16, 0.34, 2.2, 7); trunk.translate(0, 1.1, 0);
    const parts = [];
    for (let k = 0; k < 5; k++) { const b = new THREE.IcosahedronGeometry(1.1 + r() * 0.5, 1); b.scale(1.2, 0.75, 1.2); b.translate((r() - 0.5) * 1.6, 2.6 + r() * 0.8, (r() - 0.5) * 1.6); parts.push(b); }
    const canopy = mergeGeometries(parts);
    const N = 170;
    const tr = tag(new THREE.InstancedMesh(trunk, undefined, N), 'bark');
    const cn = tag(new THREE.InstancedMesh(canopy, undefined, N), 'olive');
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < 900 && n < N; i++) {
      const x = (r() - 0.5) * 220, z = -80 + r() * 130;
      if (Math.abs(x) < 30 && z > -14 && z < 28) continue; // not inside the village
      if (z > 48) continue;
      const k = 0.8 + r() * 0.6;
      ps.set(x, terrainHeight(x, z) - 0.1, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28); sc.set(k, k * (0.9 + r() * 0.3), k);
      m.compose(ps, q, sc); tr.setMatrixAt(n, m); cn.setMatrixAt(n, m); n++;
    }
    tr.count = cn.count = n;
    this.scene.add(tr, cn);
  }

  buildGrass(count = 42000) {
    const blade = new THREE.PlaneGeometry(0.07, 0.55, 1, 4);
    const bp = blade.attributes.position;
    for (let i = 0; i < bp.count; i++) { const y = bp.getY(i) + 0.275; bp.setY(i, y); bp.setX(i, bp.getX(i) * (1 - y / 0.6)); }
    blade.computeVertexNormals();
    const g = tag(new THREE.InstancedMesh(blade, undefined, count), 'grass', false, true);
    const r = rng(31);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), c = new THREE.Color();
    const gold = new THREE.Color(0xd8b560), olive = new THREE.Color(0x9aa066), pale = new THREE.Color(0xe6d29a);
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 46;
      const x = 2 + Math.cos(a) * rad, z = 8 + Math.sin(a) * rad;
      if (Math.abs(x) < 24 && z > -12 && z < 26 && r() > 0.12) continue;
      const h = terrainHeight(x, z);
      const slope = Math.hypot(terrainHeight(x + 0.6, z) - h, terrainHeight(x, z + 0.6) - h) / 0.6;
      if (slope > 0.7 || h < 1.5) continue;
      ps.set(x, h - 0.02, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      const k = 0.7 + r() * 0.9; sc.set(k, k * (0.8 + r() * 0.8), k);
      m.compose(ps, q, sc); g.setMatrixAt(n, m);
      c.copy(gold).lerp(r() > 0.5 ? olive : pale, r() * 0.7); g.setColorAt(n, c);
      n++;
    }
    g.count = n;
    this.grass = g;
    this.scene.add(g);
  }

  buildRidge() {
    // the citadel on the far ridge and the red cloth of Telassar
    const cx = 150, cz = -40;
    const top = terrainHeight(cx, cz);
    const cit = new THREE.Group();
    for (let k = 0; k < 6; k++) { const b = tag(new THREE.Mesh(new THREE.BoxGeometry(8 + k * 2, 6 + (k % 3) * 4, 8)), 'mudbrick'); b.position.set((k - 3) * 7, 3, (k % 2) * 5); cit.add(b); }
    cit.position.set(cx, top - 1, cz); this.scene.add(cit);
    const pole = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 16, 6)), 'wood'); pole.position.set(cx, top + 14, cz); this.scene.add(pole);
    const fg = new THREE.PlaneGeometry(9, 5, 12, 4); fg.translate(4.5, 0, 0);
    this.flag = tag(new THREE.Mesh(fg), 'flag', false, false); this.flag.position.set(cx + 0.2, top + 19.5, cz); this.scene.add(this.flag);
    this.flagBase = fg.attributes.position.array.slice();
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfd0dc, 0x8a7550, 0.9); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2b0, 2.6);
    this.sunDir = new THREE.Vector3(-0.45, 0.42, -0.79).normalize();
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 260;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.skyU.uSunDir.value.copy(this.sunDir);
  }

  buildCameras() {
    const mk = (fov, p, l) => { const c = new THREE.PerspectiveCamera(fov, 1, 0.2, 2500); c.position.set(...p); c.lookAt(...l); return c; };
    const h = (x, z) => terrainHeight(x, z);
    return {
      bay: mk(50, [-16, h(-16, -30) + 15, -30], [6, 0, 78]),
      yard: mk(44, [12, h(12, 16) + 3.2, 16], [0, h(0, 3) + 1.4, 2]),
    };
  }

  applyStyle(st) {
    this.style = st;
    this.materials.apply(this.scene, st);
    const t = st.terrace;
    this.scene.fog.color.setHex(t.fog[0]); this.scene.fog.density = t.fog[1];
    this.skyU.uTop.value.setHex(t.sky[0]); this.skyU.uHorizon.value.setHex(t.sky[1]);
    this.sun.color.setHex(t.sun[0]); this.sun.intensity = t.sun[1];
    this.hemi.color.setHex(t.hemi[0]); this.hemi.groundColor.setHex(t.hemi[1]); this.hemi.intensity = t.hemi[2];
    const u = this.sea.material.uniforms;
    u.uToon.value = st.water.toon;
    u.uDeep.value.setHex(st.mat === 'toon' ? 0x2d7b93 : 0x24566a);
    u.uRefl.value.setHex(t.sky[0]).lerp(new THREE.Color(t.fog[0]), 0.35);
    u.uSunDir.value.copy(this.sunDir); u.uSunPow.value = 1.2;
    u.uLampPow.value = 0; u.uDoorPow.value = 0;
  }

  heightAt(x, z) { return terrainHeight(x, z); }
  canStand(x, z, fromY) {
    if (Math.hypot(x - 2, z - 6) > 60) return false;
    return Math.abs(terrainHeight(x, z) - fromY) < 0.6;
  }
  fixedCamera(p) { return p.z > 8 ? this.cams.yard : this.cams.bay; }
  followBounds(pos) { pos.y = Math.max(pos.y, terrainHeight(pos.x, pos.z) + 0.6); }
  prompt() { return null; }
  interact() { return false; }
  skipEcho() {}
  closeDoor() {}
  reset() {}
  ripplePlayer() {}

  update(dt, t, player) {
    this.materials.grassShared.uTime.value = t;
    this.sea.material.uniforms.uTime.value = t;
    this.sea.material.uniforms.uFlowOff.value.set(t * 0.05, t * 0.08);
    // sun shadow follows the player
    this.sun.position.copy(player).addScaledVector(this.sunDir, 120);
    this.sun.target.position.copy(player);
    // flag waves
    const a = this.flag.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      const x = this.flagBase[i];
      a[i + 2] = this.flagBase[i + 2] + Math.sin(x * 0.7 - t * 3.2) * 0.35 * (x / 9);
      a[i + 1] = this.flagBase[i + 1] + Math.sin(x * 0.5 - t * 2.1) * 0.15 * (x / 9);
    }
    this.flag.geometry.attributes.position.needsUpdate = true;
    this.flag.geometry.computeVertexNormals();
  }
}
