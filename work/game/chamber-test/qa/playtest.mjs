// Fixed-timestep playtest: hold keys for N frames at 60 fps and check the results with numbers.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.env.OUT;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const T = '/tmp/claude-0/-home-user-Schlelberg/f447f769-af17-5712-a5e2-b5eaac9f6a07/scratchpad/gt/node_modules/three/';
await p.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(T + r.request().url().split('three@0.180.0/')[1]) }));
await p.route('https://fonts.**', (r) => r.abort());
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('useProgram')) errs.push(m.text().slice(0, 300)); });
await p.goto('http://localhost:8767/index.html#low.nointro', { waitUntil: 'load' });
await p.waitForTimeout(14000);
const checks = [];
function check(name, ok, detail) { checks.push([ok ? 'PASS' : 'FAIL', name, detail]); }
const ev = (f, ...a) => p.evaluate(f, ...a);
const st = () => ev(() => { const c = window.__ct; return { x: c.player.pos.x, z: c.player.pos.z, yaw: c.player.yaw, camYaw: c.cam.yaw, anim: c.tobiState() }; });
const deg = (a) => Math.round(a * 57.2958);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// 0. before the door opens, the Iwang is not in the room
const hiddenAtStart = await ev(() => { window.__ct.sim(60, []); return window.__ct.iw.root ? window.__ct.iw.root.visible : null; });
check('the Iwang is hidden before the door opens', hiddenAtStart === false, String(hiddenAtStart));
// 0b. arrow keys turn the camera and do not move Tobious
const arrow = await ev(() => { const c = window.__ct; c.go(0, 2, Math.PI); c.cam.yaw = Math.PI; const y0 = c.cam.yaw, x0 = c.player.pos.x, z0 = c.player.pos.z; c.sim(60, ['arrowleft']); return { turned: c.cam.yaw - y0, moved: Math.hypot(c.player.pos.x - x0, c.player.pos.z - z0) }; });
check('left arrow turns the camera, not Tobious', arrow.turned > 1 && arrow.moved < 0.01, JSON.stringify(arrow));
// 0c. nothing between the camera-side sky and Tobious's feet in the pit except the ankle-deep water
const pit = await ev(() => { const c = window.__ct, T = c.THREE; const sc = c.W.waterMain.parent; const rc = new T.Raycaster(new T.Vector3(0.3, 2, -4.6), new T.Vector3(0, -1, 0)); return rc.intersectObjects(sc.children, true).filter((h) => h.object.type !== 'Points' && (!c.tobi || !c.tobi.getObjectById(h.object.id))).slice(0, 2).map((h) => +h.point.y.toFixed(2)); });
check('only ankle-deep water above the pit floor', pit[0] === -0.84 && pit[1] === -0.9, JSON.stringify(pit));
// 0d. textures load under the artifact's security policy (they were white before)
const tex = await ev(() => { const c = window.__ct; let n = 0, ok = 0; c.W.waterMain.parent.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.map.isTexture && o !== c.W.waterMain) { n++; const im = o.material.map.image; if (im && (im.naturalWidth || im.width)) ok++; } }); return { n, ok }; });
check('all model textures load under the page policy', tex.n > 20 && tex.ok === tex.n, JSON.stringify(tex));
// 0e. the stone blocks are the Blender variants
const stones = await ev(() => { let inst = 0; window.__ct.W.waterMain.parent.traverse((o) => { if (o.isInstancedMesh && o.geometry.type === 'BufferGeometry') inst++; }); return inst; });
check('walls and floor use the Blender stone variants', stones >= 10, `${stones} instanced variant meshes`);
// 0f. the model visibly faces the way he walks (toes point along the path)
for (const [k, label] of [['w', 'W'], ['a', 'A'], ['d', 'D'], ['s', 'S']]) {
  const r = await ev((k) => { const c = window.__ct, T = c.THREE; c.go(0, 2, Math.PI); c.cam.yaw = Math.PI; c.sim(20, []); const a = c.player.pos.clone(); c.sim(45, [k]); const mv = c.player.pos.clone().sub(a); c.tobi.updateMatrixWorld(true); const b = {}; c.tobi.traverse((o) => { if (o.isBone) b[o.name] = new T.Vector3().setFromMatrixPosition(o.matrixWorld); }); const toe = Math.atan2(b.L_ToeBase.x - b.L_Foot.x, b.L_ToeBase.z - b.L_Foot.z) + Math.atan2(b.R_ToeBase.x - b.R_Foot.x, b.R_ToeBase.z - b.R_Foot.z); const move = Math.atan2(mv.x, mv.z); const avgToe = Math.atan2(Math.sin(Math.atan2(b.L_ToeBase.x - b.L_Foot.x, b.L_ToeBase.z - b.L_Foot.z)) + Math.sin(Math.atan2(b.R_ToeBase.x - b.R_Foot.x, b.R_ToeBase.z - b.R_Foot.z)), Math.cos(Math.atan2(b.L_ToeBase.x - b.L_Foot.x, b.L_ToeBase.z - b.L_Foot.z)) + Math.cos(Math.atan2(b.R_ToeBase.x - b.R_Foot.x, b.R_ToeBase.z - b.R_Foot.z))); return Math.round(Math.atan2(Math.sin(avgToe - move), Math.cos(avgToe - move)) * 57.3); }, k);
  check(`key ${label}: the model's toes point where he walks`, Math.abs(r) < 30, `toes off by ${r} deg`);
}
// 1. each key moves Tobious the right way relative to the camera, and he faces where he walks
for (const [k, want] of [['w', 0], ['s', 180], ['a', 90], ['d', -90]]) {
  await ev(() => { window.__ct.go(0, 2, Math.PI); window.__ct.cam.yaw = Math.PI; window.__ct.sim(30, []); });
  const a = await st();
  const trace = await ev((k) => window.__ct.sim(60, [k]), k);
  const bb = await st();
  const move = Math.atan2(bb.x - a.x, bb.z - a.z);
  const rel = deg(wrap(move - a.camYaw));
  const dist = Math.hypot(bb.x - a.x, bb.z - a.z);
  const faceErr = deg(wrap(bb.yaw - move));
  const camDrift = deg(wrap(bb.camYaw - a.camYaw));
  check(`key ${k}: moves ${want} deg from camera forward`, Math.abs(wrap((rel - want) / 57.3)) * 57.3 < 8 && dist > 1.2, `moved ${dist.toFixed(2)} m at ${rel} deg`);
  check(`key ${k}: faces the way he walks`, Math.abs(faceErr) < 10, `facing error ${faceErr} deg`);
  check(`key ${k}: camera does not turn by itself`, Math.abs(camDrift) < 2, `camera turned ${camDrift} deg`);
  check(`key ${k}: plays the walk animation`, trace.slice(1).every((s) => s[3] === 'walk'), trace.map((s) => s[3]).join(','));
}
// 2. holding A for 3 s walks a straight line, not a circle
await ev(() => { window.__ct.go(-2, 3, Math.PI); window.__ct.cam.yaw = Math.PI; });
const line = await ev(() => window.__ct.sim(180, ['a']));
const xs = line.map((s) => s[0]), zs = line.map((s) => s[1]);
const zSpread = Math.max(...zs) - Math.min(...zs);
check('holding A walks a straight line', zSpread < 0.15, `z spread ${zSpread.toFixed(2)} m over ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)} m`);
// 3. stopping returns to idle
const stop = await ev(() => window.__ct.sim(30, []));
check('letting go returns to idle', stop[stop.length - 1][3] === 'idle', stop.map((s) => s[3]).join(','));
// 4. the hip does not slide: bone world position stays under the character while walking in place
const slide = await ev(() => {
  const c = window.__ct; c.go(0, 2, Math.PI);
  const hips = []; let hip = null; c.tobi.traverse((o) => { if (o.isBone && /Hip$/.test(o.name)) hip = o; });
  for (let i = 0; i < 8; i++) { c.sim(15, ['w']); hip.updateWorldMatrix(true, false); const v = new c.THREE.Vector3().setFromMatrixPosition(hip.matrixWorld); hips.push(Math.hypot(v.x - c.player.pos.x, v.z - c.player.pos.z)); }
  return hips;
});
check('walk has no root slide (hip stays over the feet)', Math.max(...slide) < 0.25, slide.map((v) => v.toFixed(2)).join(' '));
// 5. walk from the stair top down to the door using only W and mouse-free turning
await ev(() => { window.__ct.resetScene(); window.__ct.skipIntro(); window.__ct.cam.yaw = Math.PI; });
const down = await ev(() => window.__ct.sim(60 * 9, ['w']));
const end = down[down.length - 1];
check('W from the stair top reaches the door area', end[1] < -3.2, `ended at z=${end[1]}`);
// 6. at the clamp, E starts the echo; Enter skips it; the door goes live and the Iwang arrives
await ev(() => { window.__ct.go(0.8, -4.95, Math.PI); window.__ct.sim(5, []); window.__ct.press('e'); });
const s1 = await ev(() => window.__ct.S.state);
check('E at the clamp starts the echo', s1 === 'echo', s1);
const frozen = await ev(() => { const c = window.__ct; const a = c.player.pos.clone(); c.sim(60, ['w']); return +c.player.pos.distanceTo(a).toFixed(3); });
check('Tobious stands still during the echo', frozen === 0, `moved ${frozen} m`);
await ev(() => { window.__ct.press('enter'); window.__ct.sim(60 * 5, []); });
const s2 = await ev(() => ({ st: window.__ct.S.state, iw: window.__ct.iw.mode }));
check('after the echo the door goes live', s2.st === 'live', JSON.stringify(s2));
await ev(() => window.__ct.sim(60 * 7, []));
const iwp = await ev(() => ({ mode: window.__ct.iw.mode, z: +window.__ct.iw.pos.z.toFixed(2), coh: +window.__ct.iw.coh.toFixed(2), vis: window.__ct.iw.root.visible }));
check('the Iwang steps out of the door', iwp.vis && iwp.z > -6.25 + 0.5, JSON.stringify(iwp));
const iwFace = await ev(() => { const c = window.__ct; const to = Math.atan2(c.player.pos.x - c.iw.pos.x, c.player.pos.z - c.iw.pos.z); return Math.round(Math.atan2(Math.sin(c.iw.yaw - to), Math.cos(c.iw.yaw - to)) * 57.3); });
check('the Iwang faces Tobious', Math.abs(iwFace) < 25, `facing error ${iwFace} deg`);
await ev(() => { window.__ct.press(' '); window.__ct.sim(60 * 8, []); });
const s3 = await ev(() => ({ st: window.__ct.S.state, iw: window.__ct.iw.mode }));
check('Space closes the door and the Iwang goes back', s3.st === 'dormant' && s3.iw === 'hidden', JSON.stringify(s3));
for (const c of checks) console.log(c[0], c[1], '|', c[2]);
console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
await b.close();
