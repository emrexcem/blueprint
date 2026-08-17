/* src/data/tree-layout.ts — the skill tree's layout-solver internals:
   tuning constants and types, not settings. Split out of what used to
   be skills.ts so a fork adding a skill (src/config.ts) never has to
   scroll past padX, rowPitch and ropeSpan to get there.

   RULES:
   - Every domain referenced by a skill in src/config.ts MUST exist in
     src/config.ts's `domains` array — validateSkills() checks this.
   - `kind` determines color + glyph, mapped in
     src/components/react/skill-tree/tokens.ts (KINDS). To add a new
     kind: extend SkillKind below and add one KINDS entry. */

export type SkillKind = "language" | "tool";

/** A skill (leaf node in the tree). */
export interface Skill {
  name: string;
  kind: SkillKind;
  /** Which domain root(s) this skill connects to. */
  domains: string[];
}

/** A domain (root node at the bottom of the tree). */
export interface Domain {
  name: string;
}

/* ── Landscape layout constants ────────────────────────────────
   These are SPANS, not absolute positions. The solver lays skills
   out in ruled rows, then hangs the rest of the composition off the
   last row: domain line, "Me", and the viewBox height are all
   derived and written into skill-layout.json. Adding a skill that
   needs a sixth row therefore makes the sheet one `rowPitch` taller
   instead of crowding the existing five — nothing to hand-retune.

   Clearance is structural. Rows are `rowPitch` apart and a pill is
   PILL.height tall, so two rows can never touch; `gapX` is enforced
   exactly by the in-row solver, so two pills in a row can never
   touch. There is no "close enough" test left to get wrong.        */
export const LAYOUT = {
  /** Sheet width. Only the height is derived — this is the budget
      every row has to pack into. */
  width: 2340,

  /** Horizontal padding from the SVG edges. */
  padX: 90,
  /** Extra inset for pills, so they clear the ground line's ends. */
  edgeInset: 30,

  /** Baseline of the first (top) row of skills. */
  skillYTop: 180,
  /** Row-to-row pitch: PILL.height (68) + 62 of guaranteed air. */
  rowPitch: 130,
  /** Mandatory clear space between two pill edges in the same row. */
  gapX: 70,

  /** Last skill row → the domain line. */
  ropeSpan: 340,
  /** Domain line → the "Me" node. */
  trunkSpan: 533,
  /** "Me" → the bottom of the viewBox. */
  padBottom: 143,
} as const;

/* ── Portrait layout constants (phones) ────────────────────────
   The landscape viewBox above is 2340 wide; scaled into a ~342px
   phone column that puts label text at ~4.8px. The portrait layout
   is a separate, much narrower viewBox so the SAME type tokens land
   at ~15px instead. Geometry is in the same SVG user units.

   Shape: one vertical spine. "Me" sits on it at the top, domain
   markers hang off it top-to-bottom, and each domain's skills flow
   in wrapped rows to the right of it. */
export const PORTRAIT = {
  /* The three below trade type size against row packing: a wider
     viewBox renders the same tokens smaller but fits more chips per
     row. 780 is the point where every natural pair (PyTorch +
     HuggingFace, FastAPI + TypeScript) fits, which buys two rows
     back for 0.4px of label size. */
  /** Floor for the viewBox width — widened if a long skill needs it. */
  minWidth: 780,
  /** X of the spine; every marker and the Me node center on it. */
  spineX: 96,
  /** Left edge of the skill chip column. */
  chipX: 150,
  /** Breathing room right of the widest chip. */
  marginRight: 16,

  meY: 68,
  /** Me node bottom → first domain marker. */
  meGap: 150,
  /** Domain marker → center of its first chip row. */
  headerGap: 96,
  /** Chip row pitch (pill height + breathing room). */
  rowGap: 94,
  /** Horizontal gap between two chips sharing a row. */
  chipGapX: 22,
  /** Last chip row → next domain marker. */
  domainGap: 116,
  padBottom: 60,
} as const;

/* Pill sizing lives in src/components/react/skill-tree/geometry.ts
   (pillMetrics) — exact monospace math shared by the layout engine
   and the render components, so they can never disagree. */

/** Validate that every skill's domain references exist. Takes the
    content arrays as parameters rather than reading module-level
    constants: the content (src/config.ts) imports Skill/Domain types
    from this file, so this file cannot import config.ts back without
    a cycle. src/scripts/layout-engine.ts is the only caller and
    passes config.ts's `skills`/`domains`. */
export function validateSkills(skills: Skill[], domains: Domain[]): string[] {
  const domainNames = new Set(domains.map(d => d.name));
  const errors: string[] = [];
  for (const skill of skills) {
    for (const d of skill.domains) {
      if (!domainNames.has(d)) {
        errors.push(`Skill "${skill.name}" references unknown domain "${d}"`);
      }
    }
    if (skill.domains.length === 0) {
      errors.push(`Skill "${skill.name}" has no domains`);
    }
  }
  return errors;
}
