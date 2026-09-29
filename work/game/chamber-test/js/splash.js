// Water splashes: droplets thrown up where a foot lands, and a steady spray where water spills over a step.
import * as THREE from 'three';

const MAX = 700;

export class Splash {
  constructor(scene) {
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);   // seconds left; <= 0 means free
    this.max = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.floor = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.next = 0;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 400 }, uCol: { value: new THREE.Color(0xdbe8e6) } },
      vertexShader: /* glsl */`
        attribute float aSize, aAlpha; uniform float uScale; varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vA = aAlpha;
          gl_PointSize = aAlpha > 0.0 ? aSize * uScale / -mv.z : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uCol; varying float vA;
        void main() {
          vec2 p = gl_PointCoord - 0.5; float d = length(p);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.2, d) * vA;
          gl_FragColor = vec4(uCol * (0.85 + 0.3 * smoothstep(0.3, 0.0, length(p + vec2(0.12, 0.12)))), a);
        }`,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  setViewport(h, pr) { this.mat.uniforms.uScale.value = h * pr * 0.9; }
  // one droplet
  drop(x, y, z, vx, vy, vz, life, size, floor) {
    const i = this.next; this.next = (this.next + 1) % MAX;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    this.life[i] = this.max[i] = life; this.size[i] = size; this.floor[i] = floor;
  }
  // a foot or a claw striking the water: a crown of droplets thrown outward and up
  burst(x, y, z, strength = 1, dir = null) {
    const n = Math.round(22 * strength + 6);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, out = (0.4 + Math.random() * 0.9) * strength;
      let vx = Math.cos(a) * out, vz = Math.sin(a) * out;
      if (dir) { vx += dir.x * 0.6; vz += dir.z * 0.6; }
      this.drop(x + Math.cos(a) * 0.06, y + 0.01, z + Math.sin(a) * 0.06, vx, (1.1 + Math.random() * 1.3) * Math.sqrt(strength), vz, 0.9, 0.03 + Math.random() * 0.035, y - 0.01);
    }
    for (let k = 0; k < 5; k++) { const a = Math.random() * Math.PI * 2; this.drop(x, y + 0.02, z, Math.cos(a) * 0.35 * strength, 0.7 + Math.random() * 0.4, Math.sin(a) * 0.35 * strength, 0.5, 0.08 + Math.random() * 0.05, y - 0.01); }
  }
  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const j = i * 3;
      this.vel[j + 1] -= 9.8 * dt;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < this.floor[i]) this.life[i] = 0; // back into the water
      this.alpha[i] = this.life[i] > 0 ? Math.min(1, this.life[i] / this.max[i] * 2.5) * 0.9 : 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
  count() { let c = 0; for (let i = 0; i < MAX; i++) if (this.life[i] > 0) c++; return c; }
}

// Foot contact from the skeleton: a foot has landed when it stops falling close to the ground.
export function footTracker(model, names = ['L_Foot', 'R_Foot']) {
  const bones = [];
  model.traverse((o) => { if (o.isBone && names.includes(o.name)) bones.push(o); });
  const st = bones.map(() => ({ y: null, dy: 0 }));
  const v = new THREE.Vector3();
  return {
    bones,
    // returns the world positions of feet that touched down this frame
    step(groundAt, reach = 0.18) {
      const hits = [];
      bones.forEach((b, i) => {
        b.updateWorldMatrix(true, false);
        v.setFromMatrixPosition(b.matrixWorld);
        const s = st[i];
        if (s.y !== null) {
          const dy = v.y - s.y;
          if (s.dy < -0.0005 && dy >= -0.0002 && v.y - groundAt(v.x, v.z) < reach) hits.push(v.clone());
          s.dy = dy;
        }
        s.y = v.y;
      });
      return hits;
    },
  };
}
