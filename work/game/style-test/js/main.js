// Style test: switch art styles, places, camera types and Iwang models live.
import * as THREE from 'three';
import { STYLES, STYLE_KEYS } from './styles.js';
import { Materials } from './materials.js';
import { Post } from './post.js';
import { Chamber } from './chamber.js';
import { Terrace } from './terrace.js';
import { makeTobious } from './figures.js';

const hash = (location.hash || '').slice(1).split('.');
const opt = (k) => hash.includes(k);
const $ = (id) => document.getElementById(id);

let low = opt('low');
const renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
$('stage').appendChild(renderer.domElement);

const materials = new Materials();
const chamber = new Chamber(materials);
const terrace = new Terrace(materials);
const places = { chamber, terrace };

// Tobious stand-in
const tobi = makeTobious();
const player = { pos: new THREE.Vector3(), yaw: Math.PI, moving: false };

const followCam = new THREE.PerspectiveCamera(55, 1, 0.05, 2500);
const post = new Post(renderer, chamber.scene, chamber.cams.wide);

const state = {
  style: STYLE_KEYS.find((k) => opt(k)) || 'gouache',
  place: opt('terrace') ? 'terrace' : 'chamber',
  cam: opt('follow') ? 'follow' : 'fixed',
  iwang: 'code',
  followYaw: Math.PI, followPitch: 0.32,
  helpHidden: false,
};

function place() { return places[state.place]; }

function setStyle(key) {
  state.style = key;
  const st = STYLES[key];
  renderer.toneMapping = st.toneMapping;
  renderer.toneMappingExposure = st.exposure;
  chamber.applyStyle(st);
  terrace.applyStyle(st);
  materials.apply(tobi, st);
  post.setStyle(st);
  $('blurb').textContent = st.blurb;
  document.querySelectorAll('[data-style]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.style === key));
}

function setPlace(p) {
  const prev = place();
  prev.scene.remove(tobi);
  state.place = p;
  const pl = place();
  pl.scene.add(tobi);
  player.pos.copy(pl.spawn);
  player.yaw = p === 'chamber' ? Math.PI : Math.PI * 0.85;
  state.followYaw = player.yaw;
  document.querySelectorAll('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.scene === p));
  $('keys').querySelectorAll('span')[1].textContent = p === 'chamber' ? 'Act (the clamp)' : 'Act';
}

function setCam(c) {
  state.cam = c;
  document.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cam === c));
}

function setIwang(m) {
  if (!chamber.setIwangMode(m)) return;
  state.iwang = m;
  document.querySelectorAll('[data-iwang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.iwang === m));
}

// ---------- UI ----------
const ui = {
  nameCard() {
    const n = $('namecard');
    n.style.opacity = 1;
    clearTimeout(ui._nc); ui._nc = setTimeout(() => (n.style.opacity = 0), 4200);
  },
  rewind() {
    const r = $('rewind');
    r.style.opacity = 1;
    post.finish.uniforms.uRewind.value = 1;
    showSubtitle({ who: '', text: 'No. That is not how it went.' }, 2200);
    setTimeout(() => { r.style.opacity = 0; post.finish.uniforms.uRewind.value = 0; }, 1200);
    // step Tobious back out of reach
    const pl = place();
    const back = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(-1.2);
    const nx = player.pos.x + back.x, nz = player.pos.z + back.z;
    if (pl.canStand(nx, nz, player.pos.y)) { player.pos.x = nx; player.pos.z = nz; }
  },
};
let subUntil = 0, forcedSub = null;
function showSubtitle(s, ms) { forcedSub = s; subUntil = performance.now() + ms; }

document.querySelectorAll('[data-style]').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style)));
document.querySelectorAll('[data-scene]').forEach((b) => b.addEventListener('click', () => setPlace(b.dataset.scene)));
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
document.querySelectorAll('[data-iwang]').forEach((b) => b.addEventListener('click', () => setIwang(b.dataset.iwang)));

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) e.target.blur();
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === '1' || k === '2' || k === '3') setStyle(STYLE_KEYS[+k - 1]);
  if (k === 't') setPlace(state.place === 'chamber' ? 'terrace' : 'chamber');
  if (k === 'c') setCam(state.cam === 'fixed' ? 'follow' : 'fixed');
  if (k === 'm') setIwang(state.iwang === 'code' ? 'tripo' : 'code');
  if (k === 'e') place().interact(player.pos);
  if (k === ' ') { place().closeDoor(); e.preventDefault(); }
  if (k === 'enter') place().skipEcho();
  if (k === 'r') { place().reset(); player.pos.copy(place().spawn); }
  if (k === 'q') { low = !low; resize(); }
  if (k === 'h') { state.helpHidden = !state.helpHidden; $('keys').hidden = state.helpHidden; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!drag) return;
  state.followYaw -= (e.clientX - drag.x) * 0.006;
  state.followPitch = THREE.MathUtils.clamp(state.followPitch + (e.clientY - drag.y) * 0.004, 0.05, 1.1);
  drag = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', () => (drag = null));

// camera-relative movement; the basis is held while keys stay down so a cut doesn't flip direction
let basis = null;
function moveInput() {
  let f = 0, s = 0;
  if (keys.has('w') || keys.has('arrowup')) f += 1;
  if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('a') || keys.has('arrowleft')) s -= 1;
  if (keys.has('d') || keys.has('arrowright')) s += 1;
  return { f, s };
}

let activeCam = chamber.cams.wide;
function chooseCamera(dt) {
  const pl = place();
  if (state.cam === 'follow' && !(state.place === 'chamber' && chamber.state === 'echo')) {
    const head = player.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
    const dist = state.place === 'terrace' ? 5.2 : 3.2;
    const want = head.clone().add(new THREE.Vector3(
      Math.sin(state.followYaw) * -dist * Math.cos(state.followPitch),
      Math.sin(state.followPitch) * dist,
      Math.cos(state.followYaw) * -dist * Math.cos(state.followPitch)));
    pl.followBounds(want);
    followCam.position.lerp(want, Math.min(1, dt * 6));
    followCam.lookAt(head);
    return followCam;
  }
  return pl.fixedCamera(player.pos);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.min(devicePixelRatio, low ? 0.75 : 1.5);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  post.setSize(w, h, pr);
  for (const c of [followCam, ...Object.values(chamber.cams), ...Object.values(terrace.cams)]) { c.aspect = w / h; c.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

// ---------- loop ----------
const clock = new THREE.Clock();
let t = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  t += dt;
  const pl = place();
  const cam = chooseCamera(dt);
  if (cam !== activeCam) { activeCam = cam; basis = null; }
  // movement
  const { f, s } = moveInput();
  const moving = f !== 0 || s !== 0;
  if (!moving) basis = null;
  if (moving && !basis) {
    const fw = new THREE.Vector3(); activeCam.getWorldDirection(fw); fw.y = 0; fw.normalize();
    basis = { fw, rt: new THREE.Vector3(-fw.z, 0, fw.x) };
  }
  let speed = 0;
  const locked = state.place === 'chamber' && chamber.state === 'echo' && false;
  if (moving && basis && !locked) {
    const dir = basis.fw.clone().multiplyScalar(f).addScaledVector(basis.rt, s).normalize();
    speed = state.place === 'chamber' ? 1.35 : 1.8;
    const nx = player.pos.x + dir.x * speed * dt, nz = player.pos.z + dir.z * speed * dt;
    if (pl.canStand(nx, nz, player.pos.y)) { player.pos.x = nx; player.pos.z = nz; }
    else if (pl.canStand(nx, player.pos.z, player.pos.y)) player.pos.x = nx;
    else if (pl.canStand(player.pos.x, nz, player.pos.y)) player.pos.z = nz;
    else speed = 0;
    const yaw = Math.atan2(dir.x, dir.z);
    player.yaw += Math.atan2(Math.sin(yaw - player.yaw), Math.cos(yaw - player.yaw)) * Math.min(1, dt * 10);
    if (state.cam === 'follow' && !drag) state.followYaw += Math.atan2(Math.sin(player.yaw - state.followYaw), Math.cos(player.yaw - state.followYaw)) * Math.min(1, dt * 1.2);
  }
  player.pos.y += (pl.heightAt(player.pos.x, player.pos.z) - player.pos.y) * Math.min(1, dt * 14);
  tobi.position.copy(player.pos);
  tobi.rotation.y = player.yaw;
  tobi.userData.update(dt, speed, t);
  pl.ripplePlayer(player.pos, t, speed > 0);
  pl.update(dt, t, player.pos, renderer, ui);
  // UI
  const pr = pl.prompt(player.pos);
  const pe = $('prompt');
  if (pr) { pe.hidden = false; pe.innerHTML = `<kbd>${pr[0]}</kbd>${pr[1]}`; } else pe.hidden = true;
  const sub = performance.now() < subUntil ? forcedSub : (state.place === 'chamber' ? chamber.subtitle : null);
  const se = $('subtitle');
  const html = sub ? (sub.who ? `<span class="who">${sub.who}</span>` : '') + sub.text : '';
  if (se.innerHTML !== html) se.innerHTML = html;
  const stTxt = state.place === 'chamber' ? `THRESHOLD: <b>${{ dormant: 'dormant', echo: 'the echo', dark: 'dark', live: 'live', closing: 'closing' }[chamber.state]}</b>` : 'ARAS, NOON';
  if ($('state').innerHTML !== stTxt) $('state').innerHTML = stTxt;
  post.setScene(pl.scene, activeCam);
  post.render(t);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
resize();
setStyle(state.style);
setPlace(state.place);
setCam(state.cam);
setIwang('code');
chamber.loadTripo('assets/iwang-glb.b64.txt').then(() => { if (opt('tripo')) setIwang('tripo'); }).catch((e) => { console.warn('Tripo Iwang not loaded', e); $('iw-tripo').disabled = true; });
requestAnimationFrame(frame);
setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 900); }, 300);

// test hooks for headless screenshots
window.__st = {
  setStyle, setPlace, setCam, setIwang,
  go(x, z, yaw) { player.pos.set(x, place().heightAt(x, z), z); if (yaw !== undefined) player.yaw = yaw; },
  interact() { place().interact(player.pos); },
  jump(stateName, secs) { chamber.state = stateName; chamber.stateT = secs; },
  chamber, terrace,
};
