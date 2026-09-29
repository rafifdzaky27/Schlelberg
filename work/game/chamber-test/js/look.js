// The one art style: soft toon light, painted surfaces, thin ink outlines, warm lamp against cold door.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeNoise, fbm } from './tex.js';

// Four soft bands: shadow never goes fully black, highlights stay broad.
export function makeRamp() {
  const t = new THREE.DataTexture(new Uint8Array([90, 150, 205, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
export const RAMP = makeRamp();

// Painted surface: big soft blotches and faint brush streaks, no ruled lines.
export function paintTexture({ size = 256, seed = 1, streak = 0.5, contrast = 0.22 } = {}) {
  const n = makeNoise(16, seed), n2 = makeNoise(64, seed + 9);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const blot = fbm(n, u * 6, v * 6, 4);
    const st = fbm(n2, u * 40, v * 4, 2) * streak + fbm(n2, u * 4, v * 40, 2) * streak * 0.5;
    const val = 1 - contrast + (blot + st * 0.4) * contrast * 1.4;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, val * 255)); img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export const PAINT = paintTexture({ seed: 4 });

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: RAMP, map: opts.map === undefined ? PAINT : opts.map, vertexColors: !!opts.vertexColors, side: opts.side || THREE.FrontSide, transparent: !!opts.transparent });
}

// Convert a loaded model's PBR materials to toon, keeping its painted colour map.
export function toonify(root, { tint = 0xffffff, sat = 1.0 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const m = new THREE.MeshToonMaterial({ gradientMap: RAMP, map: src.map || null, color: new THREE.Color(tint) });
    if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
    if (!src.map && src.color) m.color.copy(src.color);
    m.userData.sat = sat;
    o.material = m; o.castShadow = true; o.receiveShadow = true;
  });
}

// Ink outlines from depth and normals, then colour grading, vignette and a light paper grain.
const Ink = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null }, tNormal: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.05 }, uFar: { value: 80 },
    uInk: { value: new THREE.Color(0x1b120c) }, uStrength: { value: 0.85 }, uTime: { value: 0 }, uRewind: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tDepth, tNormal; uniform vec2 uRes; uniform float uNear, uFar, uStrength, uTime, uRewind; uniform vec3 uInk;
    varying vec2 vUv;
    float lin(vec2 uv){ float d = texture2D(tDepth, uv).x; return perspectiveDepthToViewZ(d, uNear, uFar); }
    vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 px = 1.0 / uRes;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float dc = lin(vUv);
      float e = 0.0;
      vec3 nc = nrm(vUv);
      for (int k = 0; k < 4; k++) {
        vec2 o = k == 0 ? vec2(px.x, 0.) : k == 1 ? vec2(-px.x, 0.) : k == 2 ? vec2(0., px.y) : vec2(0., -px.y);
        float d = lin(vUv + o);
        e = max(e, smoothstep(0.03, 0.12, abs(d - dc) / max(0.5, -dc)));
        e = max(e, smoothstep(0.35, 0.8, 1.0 - dot(nc, nrm(vUv + o))));
      }
      float fade = smoothstep(-40.0, -6.0, dc); // outlines thin out with distance
      col = mix(col, uInk * col * 0.6 + uInk * 0.2, e * uStrength * fade * 0.0); // outlines off: they showed through walls and the door
      // grade: lift shadows toward warm brown, keep highlights creamy
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, col * vec3(1.06, 1.0, 0.9) + vec3(0.025, 0.018, 0.01), 0.6);
      col = mix(vec3(l), col, 1.1 - uRewind * 0.95);
      float d2 = distance(vUv, vec2(0.5));
      col *= 1.0 - 0.32 * smoothstep(0.35, 0.9, d2);
      col += (h2(vUv * uRes + fract(uTime) * 91.0) - 0.5) * 0.018;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Look {
  constructor(renderer) {
    this.renderer = renderer;
    this.normalMat = new THREE.MeshNormalMaterial();
    const dt = new THREE.DepthTexture(1, 1); dt.type = THREE.UnsignedIntType;
    this.gbuf = new THREE.WebGLRenderTarget(1, 1, { depthTexture: dt, depthBuffer: true, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.5, 0.86);
    this.output = new OutputPass();
    this.ink = new ShaderPass(Ink);
    this.ink.uniforms.tDepth.value = dt;
    this.ink.uniforms.tNormal.value = this.gbuf.texture;
    for (const p of [this.renderPass, this.bloom, this.output, this.ink]) this.composer.addPass(p);
  }
  setSize(w, h, pr) {
    this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    this.gbuf.setSize(Math.floor(w * pr), Math.floor(h * pr));
    this.ink.uniforms.uRes.value.set(w * pr, h * pr);
  }
  render(scene, camera, t, hidden = []) {
    // (the outline pre-pass was removed: its edges showed through walls and the door)
    this.ink.uniforms.uNear.value = camera.near; this.ink.uniforms.uFar.value = camera.far;
    this.ink.uniforms.uTime.value = t;
    this.renderPass.scene = scene; this.renderPass.camera = camera;
    this.composer.render();
  }
}
