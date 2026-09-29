// Stand-in figures built from simple shapes: Tobious (farmer and future self) and an Iwang.
// Joints are nested groups so walk and pose animation can be written in code.
import * as THREE from 'three';
import { tag } from './materials.js';

function capsule(r, len, surf, seg = 8) {
  const g = new THREE.CapsuleGeometry(r, len, 4, seg);
  g.translate(0, -len / 2 - r, 0); // hangs down from its joint
  return tag(new THREE.Mesh(g), surf);
}
function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------------- Tobious ----------------
export function makeTobious({ future = false } = {}) {
  const root = new THREE.Group();
  const hips = joint(root, 0, 0.95, 0);
  const cloth = future ? 'clothDark' : 'clothCream';
  // torso
  const torso = tag(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10)), cloth);
  torso.scale.set(1.08, 1, 0.72); torso.position.y = 0.33; hips.add(torso);
  // tunic skirt
  const skirtGeo = new THREE.CylinderGeometry(0.19, future ? 0.2 : 0.29, future ? 0.18 : 0.5, 12, 1, true);
  const skirt = tag(new THREE.Mesh(skirtGeo), cloth); skirt.position.y = future ? 0.02 : -0.17; skirt.scale.z = 0.8; hips.add(skirt);
  // belt
  const belt = tag(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16)), future ? 'leather' : 'rope');
  belt.rotation.x = Math.PI / 2; belt.scale.set(1.05, 0.78, 1); belt.position.y = 0.08; hips.add(belt);
  // ochre mantle across the left shoulder
  const mantle = tag(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.78, 0.05, 1, 4, 1)), 'clothOchre');
  mantle.position.set(0.02, 0.28, 0.11); mantle.rotation.z = 0.62; hips.add(mantle);
  const mantleBack = mantle.clone(); mantleBack.position.z = -0.11; hips.add(mantleBack);
  const drape = tag(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.04)), 'clothOchre');
  drape.position.set(0.21, -0.12, 0.05); drape.rotation.z = 0.08; hips.add(drape);
  // neck + head
  const chest = joint(hips, 0, 0.55, 0);
  const neck = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8)), 'skin'); neck.position.y = 0.05; chest.add(neck);
  const head = joint(chest, 0, 0.2, 0);
  const skull = tag(new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12)), 'skin'); skull.scale.set(0.95, 1.12, 1); head.add(skull);
  const hair = tag(new THREE.Mesh(new THREE.IcosahedronGeometry(future ? 0.112 : 0.125, 2)), 'hair');
  hair.scale.set(1.05, future ? 0.9 : 1.02, 1.05); hair.position.set(0, future ? 0.05 : 0.04, -0.025); head.add(hair);
  if (!future) { // tied at the nape
    const bun = tag(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1)), 'hair'); bun.position.set(0, -0.04, -0.12); head.add(bun);
  } else { // scar under the left eye is too small to read; the short hair carries the change
  }
  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = joint(chest, side * 0.215, 0.02, 0);
    const upper = capsule(0.047, 0.22, 'skin'); sh.add(upper);
    const el = joint(sh, 0, -0.3, 0);
    const fore = capsule(0.04, 0.2, 'skin'); el.add(fore);
    const hand = tag(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6)), 'skin'); hand.scale.set(0.8, 1.3, 0.6); hand.position.y = -0.3; el.add(hand);
    if (side === 1 && !future) { // right wrist bound in linen
      const wrap = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.07, 10)), 'bandage'); wrap.position.y = -0.23; el.add(wrap);
    }
    arms.push({ sh, el, side });
  }
  // legs
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = joint(hips, side * 0.1, -0.02, 0);
    const thigh = capsule(0.068, 0.3, 'skin'); hip.add(thigh);
    const knee = joint(hip, 0, -0.44, 0);
    const shin = capsule(0.055, 0.32, 'skin'); knee.add(shin);
    const foot = tag(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.22)), future ? 'leather' : 'leather');
    foot.position.set(0, -0.47, 0.05); knee.add(foot);
    legs.push({ hip, knee, side });
  }
  const s = { phase: 0, speed: 0 };
  function update(dt, speed, t) {
    s.speed += (speed - s.speed) * Math.min(1, dt * 8);
    s.phase += dt * (2.2 + s.speed * 3.2) * (s.speed > 0.05 ? 1 : 0);
    const a = Math.min(1, s.speed / 1.5);
    const ph = s.phase;
    for (const L of legs) {
      const p = ph + (L.side > 0 ? Math.PI : 0);
      L.hip.rotation.x = Math.sin(p) * 0.5 * a;
      L.knee.rotation.x = Math.max(0, -Math.cos(p)) * 0.7 * a;
    }
    for (const A of arms) {
      const p = ph + (A.side > 0 ? 0 : Math.PI);
      if (future && A.side === 1) { // hand pressed to the right ribs
        A.sh.rotation.set(-0.35, 0, 0.35); A.el.rotation.set(-1.9, 0, 0);
        continue;
      }
      A.sh.rotation.x = Math.sin(p) * 0.45 * a;
      A.sh.rotation.z = A.side * (0.08 + 0.03 * Math.sin(t * 1.3));
      A.el.rotation.x = -0.25 - 0.3 * a;
    }
    hips.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.04 * a + Math.sin(t * 1.8) * 0.004;
    chest.rotation.y = Math.sin(ph) * 0.08 * a;
    chest.rotation.x = 0.04 + Math.sin(t * 1.8) * 0.01;
  }
  update(0, 0, 0);
  root.userData.update = update;
  root.userData.height = 1.75;
  return root;
}

// ---------------- Iwang (built in code) ----------------
function strut(len, thick, surf = 'bone') {
  const g = new THREE.CylinderGeometry(thick * 0.6, thick, len, 5, 2);
  g.translate(0, -len / 2, 0);
  // knock the vertices about a little so it reads as grown, not turned
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 + 0.25 * Math.sin(y * 23.0 + i) * Math.min(1, Math.abs(y) * 4);
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (2 - k));
  }
  g.computeVertexNormals();
  return tag(new THREE.Mesh(g), surf);
}
function knob(r, surf = 'tissue') {
  return tag(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0)), surf);
}
function rib(points, r = 0.018) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return tag(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, r, 5, false)), 'bone');
}

export function makeIwangCode() {
  const root = new THREE.Group();
  const pelvis = joint(root, 0, 1.4, 0);
  const pel = tag(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0)), 'bone'); pel.scale.set(1.6, 0.7, 0.8); pelvis.add(pel);
  const chest = joint(pelvis, 0, 0.0, 0);
  // hollow torso: two side struts, a back strut, open ribs
  for (const x of [-0.13, 0.13]) { const s = strut(0.62, 0.022); s.rotation.z = Math.PI; s.position.set(x, 0.02, 0.02); chest.add(s); }
  const spine = strut(0.66, 0.03); spine.rotation.z = Math.PI; spine.position.set(0, 0.02, -0.09); chest.add(spine);
  for (let i = 0; i < 3; i++) {
    const y = 0.28 + i * 0.12;
    for (const sx of [-1, 1]) chest.add(rib([[0, y, -0.09], [sx * 0.2, y + 0.02, -0.02], [sx * 0.19, y + 0.05, 0.08], [sx * 0.08, y + 0.08, 0.12]]));
  }
  // collar and the dark knot
  const collar = joint(chest, 0, 0.7, 0);
  const bar = strut(0.62, 0.028); bar.rotation.z = Math.PI / 2; bar.position.set(0.31, 0, 0); collar.add(bar);
  const knotGeo = new THREE.IcosahedronGeometry(0.1, 2);
  const kp = knotGeo.attributes.position;
  for (let i = 0; i < kp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(kp, i); const k = 1 + 0.22 * Math.sin(v.x * 60) * Math.sin(v.y * 55) + 0.1 * Math.sin(v.z * 80); v.multiplyScalar(k); kp.setXYZ(i, v.x, v.y, v.z); }
  knotGeo.computeVertexNormals();
  const knot = tag(new THREE.Mesh(knotGeo), 'tissue'); knot.scale.set(1.2, 0.9, 0.9); knot.position.set(0, 0.03, 0.03); collar.add(knot);
  const neck = strut(0.2, 0.03); neck.rotation.z = Math.PI; neck.position.y = 0.02; collar.add(neck);
  const head = joint(collar, 0, 0.22, 0.02);
  const skullGeo = new THREE.IcosahedronGeometry(0.15, 0);
  const skull = tag(new THREE.Mesh(skullGeo), 'bone'); skull.scale.set(0.8, 1.45, 0.95); skull.position.y = 0.12; skull.rotation.set(0.2, 0.4, 0.1); head.add(skull);
  // arms with an extra forearm joint and long fingers
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = joint(collar, side * 0.33, -0.01, 0);
    sh.add(knob(0.045));
    const up = strut(0.52, 0.035); sh.add(up);
    const el = joint(sh, 0, -0.52, 0); el.add(knob(0.035));
    const f1 = strut(0.42, 0.028); el.add(f1);
    const el2 = joint(el, 0, -0.42, 0); el2.add(knob(0.03));
    const f2 = strut(0.34, 0.024); el2.add(f2);
    const hand = joint(el2, 0, -0.34, 0);
    const fingers = [];
    for (let k = 0; k < 4; k++) {
      const base = joint(hand, (k - 1.5) * 0.028, 0, 0.01 * (k % 2));
      base.rotation.z = (k - 1.5) * 0.12 * side;
      let parent = base;
      const segs = [];
      for (const len of [0.12, 0.1, 0.08]) { const f = strut(len, 0.012); parent.add(f); const nj = joint(parent, 0, -len, 0); segs.push(parent); parent = nj; }
      fingers.push(segs);
    }
    arms.push({ sh, el, el2, hand, fingers, side });
  }
  // digitigrade legs
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = joint(pelvis, side * 0.15, -0.03, 0); hip.add(knob(0.04));
    const th = strut(0.6, 0.04); hip.add(th);
    const knee = joint(hip, 0, -0.6, 0); knee.add(knob(0.035));
    const sn = strut(0.55, 0.032); knee.add(sn);
    const ankle = joint(knee, 0, -0.55, 0); ankle.add(knob(0.03));
    const mt = strut(0.36, 0.026); ankle.add(mt);
    const foot = joint(ankle, 0, -0.36, 0);
    for (let k = 0; k < 3; k++) { const toe = strut(0.2, 0.014); toe.rotation.set(-1.45, (k - 1) * 0.35, 0); foot.add(toe); }
    legs.push({ hip, knee, ankle, foot, side });
  }
  const s = { phase: 0, speed: 0, mode: 'idle', modeT: 0, press: 0, windup: 0, strike: 0 };
  function update(dt, speed, t) {
    s.speed += (speed - s.speed) * Math.min(1, dt * 5);
    s.phase += dt * (1.6 + s.speed * 2.6) * (s.speed > 0.04 ? 1 : 0);
    const a = Math.min(1, s.speed / 0.9);
    const ph = s.phase;
    for (const L of legs) {
      const p = ph + (L.side > 0 ? Math.PI : 0);
      L.hip.rotation.x = -0.35 + Math.sin(p) * 0.38 * a;
      L.knee.rotation.x = 0.8 + Math.max(0, Math.cos(p)) * 0.45 * a;
      L.ankle.rotation.x = -0.9 - Math.max(0, Math.cos(p)) * 0.25 * a;
      L.foot.rotation.x = 0.45;
    }
    pelvis.position.y = 1.36 + Math.abs(Math.sin(ph)) * 0.05 * a;
    // insect-like head twitches
    head.rotation.y = Math.sin(t * 0.7) * 0.25 + (Math.sin(t * 3.1) > 0.95 ? 0.3 : 0);
    head.rotation.x = 0.15 + Math.sin(t * 0.9) * 0.08;
    chest.rotation.x = 0.12 + Math.sin(t * 1.1) * 0.03;
    for (const A of arms) {
      const p = ph + (A.side > 0 ? 0 : Math.PI);
      const idleSway = Math.sin(t * 0.8 + A.side) * 0.05;
      let shx = Math.sin(p) * 0.3 * a + idleSway, shz = A.side * 0.18, elx = -0.2, el2x = -0.25, curl = 0.25 + Math.sin(t * 1.3 + A.side) * 0.1;
      // hand pressed flat on the threshold (right hand)
      if (s.press > 0 && A.side === 1) { shx = -1.35 * s.press + shx * (1 - s.press); elx = -0.1; el2x = 0.15 * s.press; curl = 0.05; }
      // wind-up: both arms rise and spread, fingers open
      if (s.windup > 0) { shx = shx * (1 - s.windup) - 1.9 * s.windup; shz = A.side * (0.18 + 0.7 * s.windup); elx = -0.6 * s.windup; el2x = -0.2; curl = 0.05; }
      if (s.strike > 0) { shx = -1.9 + 2.6 * s.strike; shz = A.side * (0.88 - 0.6 * s.strike); elx = -0.3; }
      A.sh.rotation.x = shx; A.sh.rotation.z = shz; A.el.rotation.x = elx; A.el2.rotation.x = el2x;
      for (const segs of A.fingers) segs.forEach((j, i) => { if (i > 0) j.rotation.x = -curl * (0.6 + i * 0.3); });
    }
  }
  update(0, 0, 0);
  root.userData.update = update;
  root.userData.state = s;
  root.userData.knot = knot;
  root.userData.height = 2.6;
  return root;
}
