import type { SkillKind } from "../../../data/tree-layout";

export type { SkillKind };

/** A skill as positioned by the build-time layout engine. */
export interface LayoutSkill {
  name: string;
  kind: SkillKind;
  domains: string[];
  x: number;
  y: number;
  halfW: number;
  swayAmp: number;
  swayDelay: number;
}

export interface LayoutDomain {
  name: string;
  x: number;
  y: number;
}

/* ── Portrait (phone) layout ───────────────────────────────── */

/** One chip in the spine layout. A cross-domain skill produces one
    of these under every domain it feeds, each flagged `shared`. */
export interface PortraitChip {
  name: string;
  kind: SkillKind;
  domains: string[];
  x: number;
  halfW: number;
  shared: boolean;
}

export interface PortraitRow {
  y: number;
  chips: PortraitChip[];
}

export interface PortraitGroup {
  name: string;
  markerY: number;
  segTop: number;
  segBottom: number;
  rows: PortraitRow[];
}

export interface PortraitLayout {
  viewBox: { width: number; height: number };
  spineX: number;
  chipX: number;
  me: { x: number; y: number };
  groups: PortraitGroup[];
}

export interface PhysicsConfig {
  springK: number;
  damping: number;
  breakThreshold: number;
  healRate: number;
}

/** Discrete engine → React notifications (everything continuous is
    written to the DOM directly by the engine). */
export type TreeEvent =
  | { type: "snap" | "unsnap"; domain: string }
  | { type: "popped" | "reforming" | "restored" | "reset" };
