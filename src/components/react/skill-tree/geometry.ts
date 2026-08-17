/* Pure geometry + color math. Shared by the render components,
   the physics engine, and the build-time layout engine. */

import { ENTRANCE, FONT, KINDS, PILL, STRESS_RAMP } from "./tokens";
import type { SkillKind } from "./types";

export interface PillMetrics {
  halfW: number;
  /** Dot center, relative to the pill center. */
  dotX: number;
  /** Text start (textAnchor="start"), relative to the pill center. */
  textX: number;
}

/** Exact pill metrics from the name alone — the font is monospace,
    so this is precise, and padding is identical on every pill. */
export function pillMetrics(name: string): PillMetrics {
  const textW = name.length * PILL.fontSize * FONT.advance;
  const contentW = PILL.dotRadius * 2 + PILL.dotGap + textW;
  const halfW = Math.round((contentW / 2 + PILL.padX) * 10) / 10;
  const dotX = -halfW + PILL.padX + PILL.dotRadius;
  return { halfW, dotX, textX: dotX + PILL.dotRadius + PILL.dotGap };
}

/** Cubic that leaves the skill vertically and lands on the anchor. */
export function branchPath(sx: number, sy: number, dx: number, dy: number): string {
  const m = sy + (dy - sy) * 0.55;
  return `M ${sx} ${sy} C ${sx} ${m}, ${dx} ${m}, ${dx} ${dy}`;
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/* Channels from whatever a palette token is written as. Hex is what
   global.css uses, but this is a template and someone's replacement
   palette will eventually arrive as rgb() — parsing both is cheaper
   than a silent NaN turning every strained rope black. */
function channels(color: string): [number, number, number] {
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const h = hex.length === 4 ? hex.slice(1).replace(/./g, (c) => c + c) : hex.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const nums = hex.match(/[\d.]+/g) ?? [];
  return [0, 1, 2].map((i) => Number(nums[i]) || 0) as [number, number, number];
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = channels(a), cb = channels(b);
  return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(",")})`;
}

/* Resolved custom properties, for the one thing SVG cannot express as
   var(): a ramp interpolated in JS needs literal channel values.

   Cached, because this is read once per strained rope per frame during
   a drag, and dropped whenever the theme class or the palette
   attribute changes — which is what lets the tree follow a live
   palette switch mid-drag rather than at the next reload. The observer
   is installed on first read so that the build-time layout engine,
   which imports this file under Node and never calls stressColor,
   never looks for a document. */
let inkCache: Record<string, string> = {};
let inkWatcher: MutationObserver | null = null;

function readInk(token: string): string {
  if (!inkWatcher) {
    inkWatcher = new MutationObserver(() => {
      inkCache = {};
    });
    inkWatcher.observe(document.documentElement, {
      attributeFilter: ["class", "data-palette"],
    });
  }
  return (inkCache[token] ??= getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim());
}

/** Rope colour under strain: the kind's own ink → the print's ink →
    overload. Theme and palette come from the resolved tokens, so this
    needs to be told neither. */
export function stressColor(kind: SkillKind, strain: number): string {
  const t = Math.min(1, Math.max(0, strain));
  const mid = readInk(STRESS_RAMP.mid);
  return t < 0.5
    ? lerpColor(readInk(KINDS[kind].ink), mid, t * 2)
    : lerpColor(mid, readInk(STRESS_RAMP.max), (t - 0.5) * 2);
}

/** Entrance stagger: a wave sweeping left → right across the tree. */
export function entranceDelay(x: number, viewBoxWidth: number): number {
  return ENTRANCE.pillBase + (x / viewBoxWidth) * ENTRANCE.pillSpread;
}
