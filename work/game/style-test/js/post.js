// Post-processing per style: brush filter (Kuwahara), bloom, then paper, pigment edges, grading, vignette, grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Kuwahara = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uRadius: { value: 4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uRadius; varying vec2 vUv;
    void main() {
      vec2 px = 1.0 / uRes;
      vec3 m0 = vec3(0.), m1 = vec3(0.), m2 = vec3(0.), m3 = vec3(0.);
      vec3 s0 = vec3(0.), s1 = vec3(0.), s2 = vec3(0.), s3 = vec3(0.);
      float n = 0.0;
      int R = int(uRadius);
      for (int j = 0; j <= 6; j++) {
        if (j > R) break;
        for (int i = 0; i <= 6; i++) {
          if (i > R) break;
          vec3 c;
          c = texture2D(tDiffuse, vUv + vec2(-float(i), -float(j)) * px).rgb; m0 += c; s0 += c * c;
          c = texture2D(tDiffuse, vUv + vec2( float(i), -float(j)) * px).rgb; m1 += c; s1 += c * c;
          c = texture2D(tDiffuse, vUv + vec2(-float(i),  float(j)) * px).rgb; m2 += c; s2 += c * c;
          c = texture2D(tDiffuse, vUv + vec2( float(i),  float(j)) * px).rgb; m3 += c; s3 += c * c;
          n += 1.0;
        }
      }
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      vec3 v0 = abs(s0 / n - m0 * m0), v1 = abs(s1 / n - m1 * m1), v2 = abs(s2 / n - m2 * m2), v3 = abs(s3 / n - m3 * m3);
      float a0 = v0.r + v0.g + v0.b, a1 = v1.r + v1.g + v1.b, a2 = v2.r + v2.g + v2.b, a3 = v3.r + v3.g + v3.b;
      vec3 col = m0; float best = a0;
      if (a1 < best) { best = a1; col = m1; }
      if (a2 < best) { best = a2; col = m2; }
      if (a3 < best) { best = a3; col = m3; }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const Finish = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
    uPaper: { value: 0 }, uEdge: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uLift: { value: new THREE.Vector3() }, uVig: { value: 0.3 }, uGrain: { value: 0 }, uRewind: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uPaper, uEdge, uSat, uVig, uGrain, uRewind;
    uniform vec3 uTint, uLift; varying vec2 vUv;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main() {
      vec2 px = 1.0 / uRes;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      if (uEdge > 0.0) { // pigment pooling along value changes
        float l = lum(col);
        float gx = lum(texture2D(tDiffuse, vUv + vec2(px.x * 1.5, 0.)).rgb) - lum(texture2D(tDiffuse, vUv - vec2(px.x * 1.5, 0.)).rgb);
        float gy = lum(texture2D(tDiffuse, vUv + vec2(0., px.y * 1.5)).rgb) - lum(texture2D(tDiffuse, vUv - vec2(0., px.y * 1.5)).rgb);
        float e = clamp(length(vec2(gx, gy)) * 3.0, 0.0, 1.0);
        col *= 1.0 - uEdge * e * 0.45;
      }
      if (uPaper > 0.0) { // paper tooth and uneven wash
        vec2 q = vUv * uRes / 3.0;
        float tooth = n2(q) * 0.6 + n2(q * 2.7) * 0.4;
        float wash = n2(vUv * 6.0) * 0.5 + n2(vUv * 13.0) * 0.5;
        col *= mix(1.0, 0.88 + tooth * 0.16, uPaper);
        col *= mix(1.0, 0.94 + wash * 0.1, uPaper);
      }
      float l = lum(col);
      col = mix(vec3(l), col, uSat * (1.0 - uRewind * 0.9));
      col = col * uTint + uLift;
      float d = distance(vUv, vec2(0.5));
      col *= 1.0 - uVig * smoothstep(0.3, 0.85, d);
      col += (h2(vUv * uRes + fract(uTime * 7.1) * 100.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.kuwa = new ShaderPass(Kuwahara);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.5, 0.85);
    this.output = new OutputPass();
    this.finish = new ShaderPass(Finish);
    for (const p of [this.renderPass, this.kuwa, this.bloom, this.output, this.finish]) this.composer.addPass(p);
  }
  setScene(scene, camera) { this.renderPass.scene = scene; this.renderPass.camera = camera; }
  setStyle(st) {
    const p = st.post;
    this.kuwa.enabled = p.kuwahara > 0;
    this.kuwa.uniforms.uRadius.value = p.kuwahara;
    this.bloom.strength = p.bloom[0]; this.bloom.radius = p.bloom[1]; this.bloom.threshold = p.bloom[2];
    const u = this.finish.uniforms;
    u.uPaper.value = p.paper; u.uEdge.value = p.edge; u.uSat.value = p.sat;
    u.uTint.value.set(...p.tint); u.uLift.value.set(...p.lift); u.uVig.value = p.vignette; u.uGrain.value = p.grain;
  }
  setSize(w, h, pr) {
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.kuwa.uniforms.uRes.value.set(w * pr, h * pr);
    this.finish.uniforms.uRes.value.set(w * pr, h * pr);
  }
  render(t) { this.finish.uniforms.uTime.value = t; this.composer.render(); }
}
