/* ================================================================
   tokens.ts — Design tokens for the SkillTree.
   Every visual constant lives here; components and the build-time
   layout engine both read this file, so sizing can never drift
   between them. Geometry is in SVG user units.

   Colors are CSS custom properties (resolved per theme by
   global.css), except the stress ramp: it is interpolated in JS,
   which needs literal hex, so it carries one value per theme.
   ================================================================ */

import type { SkillKind } from "../../../data/tree-layout";

export const FONT = {
  /* Resolved from global.css like every other token here. It must be
     applied through the `style` prop, never as a presentation attribute —
     `font-family="var(…)"` does not substitute, exactly as with fill and
     stroke below. */
  family: "var(--font-mono)",
  /* The mono has a fixed 0.6 em advance width, so text width is exactly
     chars × fontSize × 0.6 — no measuring needed. Verified against the
     shipped woff2: every glyph advances 600/1000 em. A mono swap must
     preserve that ratio; `npm run build` asserts it and fails if not.
     See public/fonts/README.md. */
  advance: 0.6,
};

/* ── Node geometry ─────────────────────────────────────────── */
export const PILL = {
  height: 68,
  rx: 10,         // chip corners — ties into the site's low-radius card language
  fontSize: 33,
  baseline: 11.5, // text baseline offset from vertical center
  padX: 40,       // identical inset on every pill
  dotRadius: 8,
  dotGap: 18,     // glyph → text gap
  stroke: 2.6,
  fill: "rgba(128, 128, 128, 0.08)",
  glowBlur: 18,
  hoverLift: -6,  // CSS px lift on hover
};

/* Blueprint survey-marker style: core dot inside an open ring. */
export const DOMAIN_NODE = {
  core: 10,
  ring: 21,
  ringLit: 27,
  stroke: 2.6,
  fontSize: 33,
  labelRise: 47,
  glow: 52,
  glowLit: 78,
};

export const ME_NODE = { width: 156, height: 78, rx: 14, fontSize: 40, glow: 91 };
export const GROUND = { drop: 26 }; // ground line sits below domain centers

/* Focus dimming: while something is hovered, unrelated nodes recede.
   This is a transient, pointer-driven state — the resting state below
   is the one that has to clear WCAG AA. */
export const DIM = { opacity: 0.35, transition: "opacity .35s ease" };

/* ── Label opacity ─────────────────────────────────────────────
   Domain labels are drawn in accent-primary, which is 7.5:1 on the
   dark plate at full strength — so the *idle* opacity is the only
   thing deciding whether they clear AA (4.5:1; these render at
   ~20px landscape / ~15px portrait, i.e. normal text, not large).
   Dark idle used to be 0.45 landscape and 0.55 portrait, which
   measured 2.50:1 and 3.12:1 on painted pixels. 0.78 measures
   ~5.0:1.

   The lit/idle hierarchy survives the raise: it is carried by the
   ring radius, the glow, the core dot's fill-opacity and — most of
   all — by every unrelated node dropping to DIM.opacity. The light
   theme has run idle == lit == 1 since launch and still reads,
   which is the evidence that opacity was never the load-bearing
   half of that signal. Both variants read these, so the two stay
   in step. Non-text marks (ropes, rings, the ground line) keep the
   lower 3:1 bar and are not governed here. */
export const LABEL = {
  domain: {
    dark: { idle: 0.78, lit: 1 },
    light: { idle: 1, lit: 1 },
  },
};

export const ROPE = {
  anchorLift: 31, // ropes attach this far above the domain dot
  active: { width: 3.9, opacity: 0.85 },
  idle: { dark: { width: 1.56, opacity: 0.18 }, light: { width: 2.6, opacity: 0.5 } },
  trunk: {
    active: { width: 5.2, opacity: 0.75 },
    idle: { dark: { width: 2.6, opacity: 0.15 }, light: { width: 3.5, opacity: 0.45 } },
  },
};

/* ── Kind → color mapping ──────────────────────────────────────
   To add a new kind: add a SkillKind union member in
   src/data/tree-layout.ts, one entry here, and its legend label
   under `tree.legend` in src/i18n/ui.ts (both languages) —
   everything else (pills, ropes, legend, stress colors) picks it
   up automatically.                                              */
export interface KindSpec {
  /** The token this kind is drawn in, named once. `fill` and `glow`
      are var() references to it for CSS; `stressColor` resolves the
      same token for the ramp it has to interpolate in JS. Nothing
      here restates a colour, so a palette swap is one edit in
      global.css and the tree follows it live. */
  ink: "--accent-primary" | "--accent-secondary" | "--accent-tertiary";
  fill: string;
  glow: string;
  /** Glyph inside the pill / legend — a second signal besides color. */
  glyph: "circle" | "diamond";
}

export const KINDS: Record<SkillKind | "domain", KindSpec> = {
  domain:   { ink: "--accent-primary",   fill: "var(--accent-primary)",   glow: "var(--glow-primary)",   glyph: "circle"  },
  language: { ink: "--accent-secondary", fill: "var(--accent-secondary)", glow: "var(--glow-secondary)", glyph: "diamond" },
  tool:     { ink: "--accent-tertiary",  fill: "var(--accent-tertiary)",  glow: "var(--glow-tertiary)",  glyph: "circle"  },
};

/* Rope colour under drag strain: the kind's own ink → the print's ink
   → overload. Token names rather than values, resolved at draw time,
   so both the theme and the palette are already accounted for. */
export const STRESS_RAMP = { mid: "--accent-primary", max: "--stress-max" };

/* ── Motion ────────────────────────────────────────────────── */
export const ENTRANCE = {
  domainDelay: 0.2,
  domainStagger: 0.1,
  pillBase: 0.55,
  pillSpread: 0.5, // left-to-right wave across the viewBox
  me: 0.9,
  /* Pill entrance. The overshoot in --ease-spring stands in for the
     spring this used to be (stiffness 130, damping 16 → ζ ≈ 0.7). */
  pillDuration: 0.55,
  domainDuration: 0.6,
  meDuration: 0.8,
  drawDuration: 1.2,
};

export const SWAY = { freqX: 0.8, freqY: 0.6, ampX: 0.6, ampY: 0.3, blend: 0.025 };

/* ── Portrait spine (phones) ───────────────────────────────────
   Render-only geometry for the vertical variant. Positions come
   from the layout engine (PORTRAIT in src/data/tree-layout.ts);
   these are the sizes the renderer draws at. Markers run slightly
   smaller than the landscape ones because the portrait viewBox is
   ~3× tighter, so the same user units read ~3× larger on screen. */
export const SPINE = {
  ring: 18,
  ringLit: 24,
  core: 8,
  stroke: 2.6,
  labelSize: 31,
  /** Marker center → start of its label text. */
  labelGap: 46,
  glow: 44,
  glowLit: 64,
  /** Accent bar marking a skill that also feeds another domain —
      the SVG counterpart of the site's `.accent-edge` device. */
  accentEdge: 6,
  accentInset: 4,
  accentTrim: 11, // vertical inset at each end of the bar
  /** Extra tap area around a chip, so targets clear ~44px. */
  hitPadX: 10,
  hitPadY: 13,
  leader: { width: 2.2, opacity: { dark: 0.22, light: 0.5 } },
  spine: { width: 3.2, opacity: { dark: 0.3, light: 0.55 } },
};

/* Portrait entrance: each domain group draws its own length of
   spine as it scrolls up, then hangs its marker and chips off it. */
export const SPINE_ENTRANCE = {
  segmentDuration: 0.9,
  markerDelay: 0.12,
  markerDuration: 0.5,
  rowBase: 0.28,
  rowStagger: 0.07,
  chipDuration: 0.5,
  leaderDuration: 0.45,
  /** SVG units a chip slides out from the spine. */
  chipShift: 26,
};

export const PHYSICS_DEFAULTS = { springK: 0.015, damping: 0.94, breakThreshold: 1.8, healRate: 0.0004 };
