// The echo: Veyr seen through the threshold. Rendered into a texture the door displays.
// Pale sky, towers taller than the hills, roads with no pillars, a silver carriage, a road bowing,
// and the future Tobious in the foreground with blood at his right ribs.
import * as THREE from 'three';
import { makeTobious } from './figures.js';
import { rng } from './tex.js';

export class Echo {
  constructor(materials) {
    this.rt = new THREE.WebGLRenderTarget(640, 704, { type: THREE.HalfFloatType });
    this.rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 640 / 704, 0.1, 2000);
    this.camera.position.set(0, 1.55, 3.4);
    this.camera.lookAt(0, 3.2, -40);
    const s = this.scene;
    s.fog = new THREE.Fog(0xc4ccd0, 140, 1100);
    // sky
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0., 1.); vec3 c = mix(vec3(0.86,0.88,0.86), vec3(0.62,0.7,0.78), h); gl_FragColor = vec4(c*0.95, 1.); }',
    }));
    s.add(sky);
    s.add(new THREE.HemisphereLight(0xe8eef2, 0x6a6458, 1.1));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.position.set(-30, 60, 20); s.add(sun);
    const tower = new THREE.MeshStandardMaterial({ color: 0xc9bfae, roughness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x6f8595, roughness: 0.25, metalness: 0.3 });
    const green = new THREE.MeshStandardMaterial({ color: 0x7f9a74, roughness: 0.9 });
    const r = rng(41);
    this.towers = [];
    for (let i = 0; i < 26; i++) {
      const x = (r() - 0.5) * 260, z = -60 - r() * 260;
      const h = 60 + r() * 170, w = 10 + r() * 16;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.55, h, 10), r() > 0.5 ? tower : glass);
      body.position.y = h / 2 - 20; g.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(w * 0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tower);
      cap.position.y = h - 20; g.add(cap);
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w * 0.6, 1.5, 10), green); t.position.y = h * (0.3 + k * 0.22) - 20; g.add(t); }
      g.position.set(x, 0, z);
      s.add(g); this.towers.push({ x, z, h: h - 20 });
    }
    // skyways between tower pairs, no pillars underneath
    const road = new THREE.MeshStandardMaterial({ color: 0xd9d4c9, roughness: 0.8 });
    this.roads = [];
    for (let i = 0; i < 14; i++) {
      const a = this.towers[Math.floor(r() * this.towers.length)], b = this.towers[Math.floor(r() * this.towers.length)];
      if (a === b) continue;
      const y = Math.min(a.h, b.h) * (0.45 + r() * 0.4);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, 6), road);
      m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      s.add(m); this.roads.push(m);
    }
    // the near skyway that fails: two halves hinged at the middle
    const nearRoad = new THREE.Group(); nearRoad.position.set(-8, 34, -70); s.add(nearRoad);
    this.hingeL = new THREE.Group(); this.hingeR = new THREE.Group();
    this.hingeL.position.x = 0; this.hingeR.position.x = 0; nearRoad.add(this.hingeL, this.hingeR);
    const halfL = new THREE.Mesh(new THREE.BoxGeometry(60, 1.4, 7), road); halfL.position.x = -30; this.hingeL.add(halfL);
    const halfR = new THREE.Mesh(new THREE.BoxGeometry(60, 1.4, 7), road); halfR.position.x = 30; this.hingeR.add(halfR);
    // carriage
    this.carriage = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 16, 4, 10), new THREE.MeshStandardMaterial({ color: 0xdfe6ea, metalness: 0.9, roughness: 0.2 }));
    this.carriage.rotation.z = Math.PI / 2; this.carriage.position.set(-200, 62, -140); s.add(this.carriage);
    // falling people: small dark specks
    this.fallers = [];
    const speck = new THREE.MeshBasicMaterial({ color: 0x2a2a2e });
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), speck); m.visible = false; s.add(m); this.fallers.push({ m, v: 0, x: -8 + (r() - 0.5) * 12, delay: r() * 3 }); }
    // the future self in the foreground
    this.future = makeTobious({ future: true });
    this.future.position.set(0.45, 0, 0.2);
    this.future.rotation.y = 0.12;
    materials.apply(this.future, { name: '__echo', mat: 'standard', satMat: 0.9 });
    s.add(this.future);
    const cut = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6a0f0c, roughness: 0.4 }));
    cut.position.set(0.18, 1.2, 0.1); this.future.add(cut);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0xbcb5a8, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -10; s.add(ground);
    this.t = 0;
  }
  reset() {
    this.t = 0; this.hingeL.rotation.z = 0; this.hingeR.rotation.z = 0;
    for (const f of this.fallers) { f.m.visible = false; f.v = 0; }
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    this.carriage.position.x = -200 + ((t * 40) % 420);
    // the road bows after a few seconds, then people fall from it
    const bow = THREE.MathUtils.smoothstep(t, 9, 16);
    this.hingeL.rotation.z = -bow * 0.35; this.hingeR.rotation.z = bow * 0.35;
    this.hingeL.position.y = this.hingeR.position.y = -bow * 4;
    for (const f of this.fallers) {
      if (t > 12 + f.delay) {
        f.m.visible = true;
        if (f.v === 0) f.m.position.set(f.x, 30, -70);
        f.v += dt * 9.8;
        f.m.position.y -= f.v * dt;
        f.m.rotation.z += dt * 2;
        if (f.m.position.y < -30) f.m.visible = false;
      }
    }
    this.future.userData.update(dt, 0, t);
  }
  render(renderer) {
    const prev = renderer.getRenderTarget();
    const tm = renderer.toneMapping;
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prev);
    renderer.toneMapping = tm;
  }
}
