// Sound: the recorded voice lines (ElevenLabs), plus splashes and the trickle over the steps made in code.
// Browsers keep audio silent until the first key press or click, so everything waits for unlock().
export const VOICE = {
  darran: 2.88, door: 7.2, knuckle: 6.16, hum: 7.92,
  future1: 3.36, future2: 5.36, future3: 8.16, dark: 7.44, live: 7.76,
};

export class Sound {
  constructor() {
    this.ctx = null; this.buf = {}; this.voice = null; this.loaded = 0; this.failed = [];
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.startTrickle();
      this.load();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  async load() {
    await Promise.all(Object.keys(VOICE).map(async (k) => {
      try { const r = await fetch(`assets/voice/${k}.mp3`); this.buf[k] = await this.ctx.decodeAudioData(await r.arrayBuffer()); this.loaded++; }
      catch (e) { this.failed.push(k); }
    }));
  }
  ready() { return this.ctx && this.ctx.state === 'running'; }
  // a spoken line; a new line cuts off the one before
  say(name, gain = 1) {
    this.stopVoice();
    if (!this.ready() || !this.buf[name]) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.buf[name];
    const g = this.ctx.createGain(); g.gain.value = gain;
    s.connect(g).connect(this.master); s.start();
    this.voice = { s, g, name };
    s.onended = () => { if (this.voice && this.voice.s === s) this.voice = null; };
  }
  stopVoice() {
    if (!this.voice) return;
    const { s, g } = this.voice; const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.05); try { s.stop(t + 0.3); } catch (e) { /* already stopped */ }
    this.voice = null;
  }
  // a foot in shallow water: a short burst of filtered noise
  splash(strength = 1, dist = 2) {
    if (!this.ready()) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.5;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 1400; bp.Q.value = 0.9;
    const g = c.createGain(); const peak = 0.22 * strength / (1 + dist * 0.35);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16 + Math.random() * 0.08);
    s.connect(bp).connect(g).connect(this.master); s.start(t, Math.random() * 0.5, 0.3);
  }
  // water spilling over the steps: a looped hiss whose level follows distance
  startTrickle() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 1800; lp.Q.value = 0.5;
    this.trickleGain = c.createGain(); this.trickleGain.gain.value = 0;
    s.connect(lp).connect(this.trickleGain).connect(this.master); s.start();
  }
  trickle(level) { if (this.trickleGain) this.trickleGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.2); }
}
