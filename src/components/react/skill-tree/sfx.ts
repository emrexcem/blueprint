/* Web-Audio sound effects for the interactive tree. Lazily creates
   the AudioContext on first use (autoplay policy), rate-limits each
   effect so rapid physics events don't stack into noise. */

class Sfx {
  private c: AudioContext | null = null;
  private t: Record<string, number> = {};

  private a() {
    if (!this.c) try { this.c = new AudioContext(); } catch { return null; }
    if (this.c.state === "suspended") this.c.resume();
    return this.c;
  }

  private ok(k: string, ms: number) {
    const n = performance.now();
    if (n - (this.t[k] || 0) < ms) return false;
    this.t[k] = n;
    return true;
  }

  /** Creaking rope while a pill is stretched. `s` = strain 0..1. */
  stretch(s: number) {
    if (!this.ok("s", 100)) return;
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(50 + s * 180, t);
    o.frequency.exponentialRampToValueAtTime(25 + s * 60, t + 0.06);
    f.type = "bandpass"; f.frequency.value = 250 + s * 500; f.Q.value = 6;
    g.gain.setValueAtTime(0.025 * Math.min(1, s), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(f).connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.07);
  }

  /** A rope snapping. */
  snap() {
    if (!this.ok("n", 120)) return;
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain();
    o1.type = "square";
    o1.frequency.setValueAtTime(900, t);
    o1.frequency.exponentialRampToValueAtTime(60, t + 0.06);
    g1.gain.setValueAtTime(0.1, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o2.type = "sine";
    o2.frequency.setValueAtTime(120, t + 0.02);
    o2.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.03);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o1.connect(g1).connect(c.destination);
    o2.connect(g2).connect(c.destination);
    o1.start(t); o1.stop(t + 0.1);
    o2.start(t); o2.stop(t + 0.18);
  }

  /** The pill bursting. */
  pop() {
    if (!this.ok("p", 200)) return;
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    f.type = "highpass"; f.frequency.value = 600;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(f).connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.16);
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = "sine";
    o2.frequency.setValueAtTime(90, t);
    o2.frequency.exponentialRampToValueAtTime(25, t + 0.12);
    g2.gain.setValueAtTime(0.1, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o2.connect(g2).connect(c.destination);
    o2.start(t); o2.stop(t + 0.16);
  }

  /** Springing back after release. `i` = intensity 0..1. */
  spring(i: number) {
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(180 + i * 350, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    g.gain.setValueAtTime(0.035 * Math.min(1, i), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.25);
  }

  /** Reset chirp. */
  reset() {
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(600, t);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.1);
  }

  /** Shell re-forming: two detuned tones sweeping up a bandpass. */
  whoosh() {
    if (!this.ok("w", 600)) return;
    const c = this.a(); if (!c) return;
    const t = c.currentTime;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o1.type = "sine"; o2.type = "triangle";
    o1.frequency.setValueAtTime(80, t);
    o1.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    o2.frequency.setValueAtTime(95, t);
    o2.frequency.exponentialRampToValueAtTime(650, t + 0.28);
    f.type = "bandpass";
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(800, t + 0.2);
    f.Q.value = 2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.04);
    g.gain.setValueAtTime(0.04, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o1.connect(f); o2.connect(f);
    f.connect(g).connect(c.destination);
    o1.start(t); o1.stop(t + 0.4);
    o2.start(t); o2.stop(t + 0.4);
  }
}

export const sfx = new Sfx();
