/* Typed access to the generated layout (skill-layout.json is the
   output of `npm run layout` — never hand-edit it). */

import layoutData from "../../../data/skill-layout.json";
import { LAYOUT } from "../../../data/tree-layout";
import { GROUND, ROPE } from "./tokens";
import type { LayoutDomain, LayoutSkill, PortraitLayout } from "./types";

export const DOMAINS = layoutData.domains as LayoutDomain[];
export const SKILLS = layoutData.skills as LayoutSkill[];
export const ME = layoutData.me as { x: number; y: number };
export const VIEWBOX = layoutData.viewBox as { width: number; height: number };
/** Phone layout — a vertical spine, not a scaled-down landscape tree. */
export const PORTRAIT = layoutData.portrait as PortraitLayout;
/** Derived by the layout engine from the number of skill rows, so it
    moves when the tree grows — never hardcode it alongside. */
export const DOMAIN_Y = layoutData.domainY as number;
export const GROUND_Y = DOMAIN_Y + GROUND.drop;
export const PAD_X = LAYOUT.padX;

/** Point where a skill rope attaches, above the domain marker. */
export function ropeAnchor(domain: string): { x: number; y: number } {
  const d = DOMAINS.find((x) => x.name === domain) ?? { x: VIEWBOX.width / 2, y: DOMAIN_Y };
  return { x: d.x, y: d.y - ROPE.anchorLift };
}

/** A domain lights up when it, "Me", or one of its skills is hovered. */
export function domainLit(name: string, hovered: string | null): boolean {
  return (
    hovered === name ||
    hovered === "Me" ||
    SKILLS.some((s) => s.domains.includes(name) && hovered === s.name)
  );
}

/** True when `skill` should recede while `hovered` has focus.
    Takes the structural minimum so both layout skills and portrait
    chips can be passed. */
export function skillDimmed(skill: { name: string; domains: string[] }, hovered: string | null): boolean {
  if (hovered === null || hovered === "Me") return false;
  return hovered !== skill.name && !skill.domains.includes(hovered);
}

/** True when a domain (and its trunk) should recede. */
export function domainDimmed(domain: string, hovered: string | null): boolean {
  return hovered !== null && hovered !== "Me" && !domainLit(domain, hovered);
}
