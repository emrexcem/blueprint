/* ================================================================
   engine.ts — Physics engine for the interactive skill tree.

   One requestAnimationFrame loop with a fixed 60 Hz timestep drives
   every node (the old version ran one loop per skill and re-rendered
   React every frame; it also integrated per-frame, so physics ran
   2.75× too fast on a 165 Hz display). All continuous animation —
   springs, sway, rope strain, particles, shell reform — is written
   straight to the DOM. React only re-renders on discrete events
   (snap / unsnap / pop / reform), delivered via per-skill listeners.
   ================================================================ */

import { branchPath, dist, pillMetrics, stressColor } from "./geometry";
import { FONT, KINDS, PHYSICS_DEFAULTS, PILL, ROPE, SWAY } from "./tokens";
import { sfx } from "./sfx";
import type { LayoutDomain, LayoutSkill, PhysicsConfig, TreeEvent } from "./types";

interface Particle {
  char: string;
  x: number; y: number;   // balloon-local, absolute coords
  vx: number; vy: number;
  rot: number; vr: number;
  hx: number; hy: number; // home (reassembly target)
}

interface NodeState {
  skill: LayoutSkill;
  /* displacement from rest + velocity */
  x: number; y: number; vx: number; vy: number;
  dragging: boolean;
  damage: Map<string, number>;   // domain → 0..1 rope damage
  snapped: Set<string>;
  popped: boolean;
  phase: 0 | 1 | 2 | 3;          // 0 idle · 1 letters flying · 2 shell reform · 3 ropes regrow
  shell: number;                 // shell opacity during reform
  particles: Particle[] | null;
  particleT: number;             // sim time of the pop
  seed: number;
  /* smoothed rope visuals (lerped toward targets for soft hover) */
  ropeW: Map<string, number>;
  ropeO: Map<string, number>;
  /* DOM handles */
  balloon: SVGGElement | null;
  ropes: Map<string, SVGPathElement>;
  shellEl: SVGGElement | null;
  particleEls: (SVGTextElement | null)[];
  listener: ((e: TreeEvent) => void) | null;
}

const STEP = 1000 / 60; // fixed timestep — identical feel at any refresh rate

export class TreeEngine {
  private states = new Map<string, NodeState>();
  private anchors = new Map<string, { x: number; y: number }>();
  private cfg: PhysicsConfig = { ...PHYSICS_DEFAULTS };
  private sound = true;
  private light = false;
  private hovered: string | null = null;
  private raf = 0;
  private last = 0;
  private t = 0; // sim clock (ms)

  constructor(skills: LayoutSkill[], domains: LayoutDomain[]) {
    for (const d of domains) this.anchors.set(d.name, { x: d.x, y: d.y - ROPE.anchorLift });
    skills.forEach((skill, i) => {
      this.states.set(skill.name, {
        skill,
        x: 0, y: 0, vx: 0, vy: 0,
        dragging: false,
        damage: new Map(), snapped: new Set(),
        popped: false, phase: 0, shell: 1,
        particles: null, particleT: 0,
        seed: i * 1.7 + skill.swayDelay * Math.PI,
        ropeW: new Map(), ropeO: new Map(),
        balloon: null, ropes: new Map(), shellEl: null, particleEls: [],
        listener: null,
      });
    });
  }

  /* ── Wiring ─────────────────────────────────────────────── */

  setConfig(c: PhysicsConfig) { this.cfg = c; }
  setSound(on: boolean) { this.sound = on; }
  setTheme(light: boolean) { this.light = light; }
  setHover(name: string | null) { this.hovered = name; }

  registerBalloon(name: string, el: SVGGElement | null) {
    const st = this.states.get(name); if (st) st.balloon = el;
  }
  registerRope(name: string, domain: string, el: SVGPathElement | null) {
    const st = this.states.get(name); if (!st) return;
    if (el) st.ropes.set(domain, el);
    else { st.ropes.delete(domain); st.ropeW.delete(domain); st.ropeO.delete(domain); }
  }
  registerShell(name: string, el: SVGGElement | null) {
    const st = this.states.get(name); if (st) st.shellEl = el;
  }
  registerParticle(name: string, i: number, el: SVGTextElement | null) {
    const st = this.states.get(name); if (st) st.particleEls[i] = el;
  }
  /** Returns an unsubscribe function (use as a React effect cleanup). */
  setListener(name: string, fn: (e: TreeEvent) => void): () => void {
    const st = this.states.get(name);
    if (st) st.listener = fn;
    return () => { if (st && st.listener === fn) st.listener = null; };
  }

  canInteract(name: string): boolean {
    const st = this.states.get(name);
    return !!st && !st.popped && st.phase === 0;
  }

  /* ── Loop ───────────────────────────────────────────────── */

  start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number) => {
    let steps = Math.floor((now - this.last) / STEP);
    if (steps > 0) {
      // Cap catch-up after tab switches so we never spiral
      this.last = steps > 5 ? now : this.last + steps * STEP;
      steps = Math.min(5, steps);
      while (steps-- > 0) { this.t += STEP; for (const st of this.states.values()) this.step(st); }
      for (const st of this.states.values()) this.draw(st);
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /* ── Simulation (one fixed step) ────────────────────────── */

  private step(st: NodeState) {
    const cfg = this.cfg;

    // Letter particles: explode, then home back in once slow (if healing)
    if (st.particles && st.phase === 1) {
      let allHome = true;
      const heal = cfg.healRate > 0;
      const age = this.t - st.particleT;
      for (const p of st.particles) {
        const slow = p.vx * p.vx + p.vy * p.vy < 2;
        if (heal && (slow || age > 2000)) {
          const dx = p.hx - p.x, dy = p.hy - p.y;
          const spd = 0.03 + cfg.healRate * 25;
          p.x += dx * spd; p.y += dy * spd;
          p.rot *= 0.93; p.vx *= 0.85; p.vy *= 0.85; p.vr *= 0.85;
          if (Math.hypot(dx, dy) > 1.5) allHome = false;
        } else {
          p.vy += 0.15;
          p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          p.vx *= 0.97; p.vy *= 0.97; p.vr *= 0.96;
          allHome = false;
        }
      }
      if (heal && allHome) {
        st.particles = null; st.particleEls = [];
        st.phase = 2; st.shell = 0.05;
        if (this.sound) sfx.whoosh();
        st.listener?.({ type: "reforming" });
      }
    }

    // Shell reform
    if (st.phase === 2) {
      st.shell = Math.min(1, st.shell + 0.01);
      if (st.shell >= 1) st.phase = 3;
    }

    // Rope healing
    if (cfg.healRate > 0) {
      const rate = st.dragging ? cfg.healRate * 0.1 : cfg.healRate;
      for (const dn of st.skill.domains) {
        const cur = st.damage.get(dn) || 0;
        if (cur <= 0) continue;
        st.damage.set(dn, Math.max(0, cur - rate));
        if (cur - rate < 0.6 && st.snapped.has(dn)) {
          st.snapped.delete(dn);
          st.listener?.({ type: "unsnap", domain: dn });
        }
      }
      if (st.popped && st.phase >= 3 && st.skill.domains.every((dn) => (st.damage.get(dn) || 0) < 0.3)) {
        st.popped = false; st.phase = 0;
        if (st.shellEl) st.shellEl.style.opacity = "1";
        st.listener?.({ type: "restored" });
      }
    }

    if (st.dragging) return; // position is pointer-driven

    // Spring forces from surviving ropes
    let fx = 0, fy = 0, alive = 0;
    for (const dn of st.skill.domains) {
      const loss = st.damage.get(dn) || 0;
      if (loss >= 1) continue;
      const h = 1 - loss;
      fx -= st.x * cfg.springK * h;
      fy -= st.y * cfg.springK * h;
      alive++;
    }
    if (alive > 0 && alive < st.skill.domains.length) {
      const boost = st.skill.domains.length / alive;
      fx *= boost; fy *= boost;
    }
    if (alive === 0) { // free balloon floats away
      fy -= 0.2;
      fx += Math.sin(this.t / 700) * 0.1;
    }

    st.vx = (st.vx + fx) * cfg.damping;
    st.vy = (st.vy + fy) * cfg.damping;
    st.x += st.vx; st.y += st.vy;

    // Idle sway blends in near rest
    const disp = Math.hypot(st.x, st.y);
    if (disp < 25 && alive > 0) {
      const t = this.t / 1000;
      const sx = Math.sin(t * SWAY.freqX + st.seed) * st.skill.swayAmp * SWAY.ampX;
      const sy = Math.cos(t * SWAY.freqY + st.seed) * st.skill.swayAmp * SWAY.ampY;
      const blend = Math.max(0, 1 - disp / 25) * SWAY.blend;
      st.x += (sx - st.x) * blend;
      st.y += (sy - st.y) * blend;
    }
  }

  /* ── DOM writes (once per painted frame) ────────────────── */

  private draw(st: NodeState) {
    const cx = st.skill.x + st.x, cy = st.skill.y + st.y;
    st.balloon?.setAttribute("transform", `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)})`);

    for (const [dn, el] of st.ropes) {
      const loss = st.damage.get(dn) || 0;
      if (loss >= 1) continue; // React is swapping this rope for stubs
      const a = this.anchors.get(dn)!;
      const h = 1 - loss;
      const rd = dist(st.skill.x, st.skill.y, a.x, a.y);
      const cd = dist(cx, cy, a.x, a.y);
      const strain = Math.max(0, (rd > 0 ? cd / rd : 1) - 1);
      const active = this.hovered === st.skill.name || this.hovered === dn || this.hovered === "Me";
      const base = active ? ROPE.active : this.light ? ROPE.idle.light : ROPE.idle.dark;

      // Lerp width/opacity toward targets so hover changes ease in
      const wT = base.width * Math.max(0.25, h) * Math.max(0.5, 1 - strain * 0.4);
      const oT = base.opacity * Math.max(0.05, h);
      const w = (st.ropeW.get(dn) ?? wT) + (wT - (st.ropeW.get(dn) ?? wT)) * 0.25;
      const o = (st.ropeO.get(dn) ?? oT) + (oT - (st.ropeO.get(dn) ?? oT)) * 0.25;
      st.ropeW.set(dn, w); st.ropeO.set(dn, o);

      el.setAttribute("d", branchPath(cx, cy, a.x, a.y));
      el.setAttribute("stroke-width", w.toFixed(2));
      el.setAttribute("stroke-opacity", o.toFixed(3));
      el.setAttribute("stroke-dasharray", loss > 0.35 ? `${Math.max(2, 12 * h)} ${Math.max(1, 5 * loss)}` : "none");
      el.style.stroke = strain < 0.001 ? KINDS[st.skill.kind].fill : stressColor(st.skill.kind, strain);
    }

    if (st.phase >= 2 && st.shellEl) st.shellEl.style.opacity = st.shell.toFixed(3);

    if (st.phase === 1 && st.particles) {
      st.particles.forEach((p, i) => {
        const el = st.particleEls[i];
        if (el) el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(1)})`);
      });
    }
  }

  /* ── Interaction ────────────────────────────────────────── */

  beginDrag(name: string) {
    const st = this.states.get(name);
    if (!st || !this.canInteract(name)) return;
    st.dragging = true;
    st.vx = 0; st.vy = 0;
  }

  /** `px,py` in SVG user coordinates. */
  drag(name: string, px: number, py: number) {
    const st = this.states.get(name);
    if (!st || !st.dragging) return;
    const cfg = this.cfg;
    const nx = px - st.skill.x, ny = py - st.skill.y;

    // Elastic resistance grows with the most-stretched surviving rope
    let maxR = 0;
    for (const dn of st.skill.domains) {
      if ((st.damage.get(dn) || 0) >= 1) continue;
      const a = this.anchors.get(dn)!;
      const rd = dist(st.skill.x, st.skill.y, a.x, a.y);
      const cd = dist(st.skill.x + nx, st.skill.y + ny, a.x, a.y);
      maxR = Math.max(maxR, rd > 0 ? cd / rd : 1);
    }
    const res = 1 / (1 + Math.max(0, maxR - 1) ** 2 * 1.5);
    st.x = nx * res + st.x * (1 - res);
    st.y = ny * res + st.y * (1 - res);
    if (this.sound && maxR > 1.15) sfx.stretch(Math.min(1, maxR - 1));

    // Accumulate rope damage past the break threshold
    const start = cfg.breakThreshold * 0.75;
    const snappedNow: string[] = [];
    for (const dn of st.skill.domains) {
      if ((st.damage.get(dn) || 0) >= 1) continue;
      const a = this.anchors.get(dn)!;
      const rd = dist(st.skill.x, st.skill.y, a.x, a.y);
      const cd = dist(st.skill.x + st.x, st.skill.y + st.y, a.x, a.y);
      const ratio = rd > 0 ? cd / rd : 1;
      if (ratio <= start) continue;
      const nd = Math.min(1, (ratio - start) / (cfg.breakThreshold - start));
      if (nd > (st.damage.get(dn) || 0)) {
        st.damage.set(dn, nd);
        if (nd >= 1 && !st.snapped.has(dn)) { st.snapped.add(dn); snappedNow.push(dn); }
      }
    }
    if (snappedNow.length === 0) return;

    if (st.skill.domains.every((dn) => (st.damage.get(dn) || 0) >= 1)) {
      // Last rope gone — the pill pops (listener releases pointer capture)
      st.dragging = false;
      for (const dn of snappedNow) st.listener?.({ type: "snap", domain: dn });
      this.pop(name);
    } else {
      for (const dn of snappedNow) {
        if (this.sound) sfx.snap();
        const a = this.anchors.get(dn)!;
        const kx = st.skill.x + st.x - a.x, ky = st.skill.y + st.y - a.y;
        const kd = Math.hypot(kx, ky) || 1;
        st.vx += (kx / kd) * 10; st.vy += (ky / kd) * 10; // recoil kick
        st.listener?.({ type: "snap", domain: dn });
      }
    }
  }

  endDrag(name: string) {
    const st = this.states.get(name);
    if (!st || !st.dragging) return;
    st.dragging = false;
    st.vx -= st.x * 0.04; st.vy -= st.y * 0.04;
    const d = Math.hypot(st.x, st.y);
    if (this.sound && d > 30) sfx.spring(Math.min(1, d / 250));
  }

  pop(name: string) {
    const st = this.states.get(name);
    if (!st || st.popped || st.phase !== 0) return;
    st.popped = true;
    if (this.sound) sfx.pop();

    for (const dn of st.skill.domains) {
      st.damage.set(dn, 1);
      if (!st.snapped.has(dn)) { st.snapped.add(dn); st.listener?.({ type: "snap", domain: dn }); }
    }

    // One letter particle per character, launched from its exact
    // position in the pill (monospace, so positions are precise)
    const m = pillMetrics(st.skill.name);
    const adv = PILL.fontSize * FONT.advance;
    const chars = st.skill.name.split("");
    st.particles = chars.map((char, i) => {
      const hx = st.skill.x + m.textX + (i + 0.5) * adv;
      const hy = st.skill.y + PILL.baseline;
      return {
        char, hx, hy, x: hx, y: hy,
        vx: (Math.random() - 0.5) * 20 + (i - chars.length / 2) * 3.5,
        vy: (Math.random() - 0.7) * 18,
        rot: 0, vr: (Math.random() - 0.5) * 25,
      };
    });
    st.particleEls = new Array(chars.length).fill(null);
    st.particleT = this.t;
    st.shell = 0;
    st.phase = 1;
    st.vx = (Math.random() - 0.5) * 4; st.vy = -8;
    st.listener?.({ type: "popped" });
  }

  reset() {
    for (const st of this.states.values()) {
      st.x = 0; st.y = 0; st.vx = 0; st.vy = 0;
      st.dragging = false; st.popped = false; st.phase = 0; st.shell = 1;
      st.particles = null; st.particleEls = []; st.particleT = 0;
      st.damage.clear(); st.snapped.clear();
      st.ropeW.clear(); st.ropeO.clear();
      if (st.shellEl) st.shellEl.style.opacity = "1";
      st.balloon?.setAttribute("transform", "translate(0 0)");
      st.listener?.({ type: "reset" });
    }
  }
}
