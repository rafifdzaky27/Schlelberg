// Ankle-deep water: flow that can change direction, ripples from feet, a line ripples cannot cross,
// and specular glints from the lamp and the threshold.
import * as THREE from 'three';

const MAX_RIP = 8;

export function makeWater({ deep, refl, toon = 0, opacity = 0.82, scale = 3.0 }) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 },
    uFlowOff: { value: new THREE.Vector2() },
    uDeep: { value: new THREE.Color(deep) },
    uRefl: { value: new THREE.Color(refl) },
    uLampPos: { value: new THREE.Vector3() },
    uLampCol: { value: new THREE.Color(0xffa050) },
    uLampPow: { value: 1 },
    uDoorPos: { value: new THREE.Vector3() },
    uDoorCol: { value: new THREE.Color(0xd8e8ff) },
    uDoorPow: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunPow: { value: 0 },
    uRip: { value: Array.from({ length: MAX_RIP }, () => new THREE.Vector4(0, 0, -99, 0)) },
    uLineZ: { value: -1e6 },
    uToon: { value: toon },
    uOpacity: { value: opacity },
    uScale: { value: scale },
    uCalm: { value: 0 },
  }]);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */`
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uLampPow, uDoorPow, uSunPow, uLineZ, uToon, uOpacity, uScale, uCalm;
      uniform vec2 uFlowOff;
      uniform vec3 uDeep, uRefl, uLampPos, uLampCol, uDoorPos, uDoorCol, uSunDir;
      uniform vec4 uRip[${MAX_RIP}];
      varying vec3 vW;
      #include <fog_pars_fragment>
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float surf(vec2 p) {
        vec2 q = p * uScale - uFlowOff;
        float h = n2(q) * 0.5 + n2(q * 2.1 + 3.7 - uFlowOff * 0.6) * 0.25 + n2(q * 4.3 - uTime * 0.2) * 0.12;
        h *= (1.0 - uCalm);
        for (int i = 0; i < ${MAX_RIP}; i++) {
          vec4 r = uRip[i];
          float age = uTime - r.z;
          if (age < 0.0 || age > 3.0) continue;
          if (p.y < uLineZ) continue;
          float d = distance(p, r.xy);
          float front = age * 0.55;
          float ring = sin((d - front) * 22.0) * exp(-abs(d - front) * 6.0) * exp(-age * 1.3) * r.w;
          h += ring * 0.35;
        }
        return h;
      }
      void main() {
        vec2 p = vW.xz;
        float e = 0.02;
        float hc = surf(p);
        float hx = surf(p + vec2(e, 0.0)), hz = surf(p + vec2(0.0, e));
        vec3 N = normalize(vec3(-(hx - hc) / e * 0.06, 1.0, -(hz - hc) / e * 0.06));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(uDeep, uRefl, clamp(fres * 0.9 + 0.05, 0.0, 1.0));
        // lamp glint
        vec3 L = uLampPos - vW; float dl = length(L); L /= dl;
        float sl = pow(max(dot(N, normalize(L + V)), 0.0), 90.0) * uLampPow / (1.0 + dl * dl * 0.25);
        vec3 D = uDoorPos - vW; float dd = length(D); D /= dd;
        float sd = pow(max(dot(N, normalize(D + V)), 0.0), 60.0) * uDoorPow / (1.0 + dd * dd * 0.08);
        float ss = pow(max(dot(N, normalize(uSunDir + V)), 0.0), 120.0) * uSunPow;
        if (uToon > 0.5) { sl = smoothstep(0.3, 0.6, sl) * 0.45; sd = smoothstep(0.25, 0.55, sd) * 0.9; ss = smoothstep(0.35, 0.6, ss) * 1.2; }
        col += uLampCol * sl * 2.0 + uDoorCol * sd * 2.0 + vec3(1.0, 0.95, 0.85) * ss * 2.0;
        // the door's light washes across the water surface near it
        col += uDoorCol * uDoorPow * 0.05 / (1.0 + dd * dd * 0.4);
        gl_FragColor = vec4(col, uOpacity);
        #include <fog_fragment>
      }`,
  });
  mat.userData.ripIndex = 0;
  return mat;
}

export function addRipple(mat, x, z, t, amp = 1) {
  const i = mat.userData.ripIndex = (mat.userData.ripIndex + 1) % MAX_RIP;
  mat.uniforms.uRip.value[i].set(x, z, t, amp);
}
