#!/usr/bin/env node
/* ================================================================
   layout-engine.ts — Build-time skill tree layout solver (v5)
   ================================================================
   Strategy: "ruled rows, tiered by reach"

   Skills sit on a small number of shared baselines. A skill's tier
   is how many domains it feeds: tier 1 rides at the top, and deeper
   tiers sink toward the ground line, where a rope that has to reach
   several domains has the shortest way to go.

   Overlap is structural rather than negotiated. Rows are one
   `rowPitch` apart and a pill is `PILL.height` tall, so two rows
   cannot touch. Within a row, a pill wants its domains' centroid
   subject to a mandatory `gapX` between neighbours — substituting
   out the cumulative separations turns that into isotonic
   regression, which PAVA solves exactly in one pass. The result is
   the least-displaced arrangement that still honours the gap.

   That leaves nothing to converge and nothing to tune. v3 placed
   pills freely and then pushed them apart with a force-relaxation
   loop guarded by `dy > minGapY`; two pills 71 units apart (a pill
   is 68 tall) counted as clear no matter how far they overlapped
   horizontally, which is how FastAPI/Kubernetes and
   PostgreSQL/Python ended up touching. Both the guard and the loop
   are gone.

   The composition below the skills is derived, not fixed: the
   domain line hangs one `ropeSpan` under the last row, "Me" one
   `trunkSpan` under that, and the viewBox height follows. Adding a
   skill that needs another row makes the sheet taller instead of
   crowding the rows already there.

   Run: npx tsx src/scripts/layout-engine.ts
   Or:  npm run layout

   Output: src/data/skill-layout.json
   ================================================================ */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { domains, skills } from "../config.js";
import {
  LAYOUT, PORTRAIT, validateSkills,
  type Skill, type Domain,
} from "../data/tree-layout.js";
import { pillMetrics } from "../components/react/skill-tree/geometry.js";
import { ME_NODE, PILL } from "../components/react/skill-tree/tokens.js";

/* ── Types ─────────────────────────────────────────────────── */

interface PositionedDomain {
  name: string;
  x: number;
  y: number;
}

interface PositionedSkill {
  name: string;
  kind: "language" | "tool";
  domains: string[];
  x: number;
  y: number;
  halfW: number;
  swayAmp: number;
  swayDelay: number;
}

interface LayoutResult {
  /* Deliberately no timestamp. The emitted file is tracked, and the
     build regenerates it, so a clock reading in here would dirty the
     working tree on every build and bury the one diff that matters —
     a position that moved — under one that never does. The solver is
     deterministic; identical input produces an identical file. */
  version: number;
  viewBox: { width: number; height: number };
  /** Derived from the row count — the renderer reads it from here
      rather than from a constant that would go stale. */
  domainY: number;
  domains: PositionedDomain[];
  skills: PositionedSkill[];
  me: { x: number; y: number };
  portrait: PortraitLayout;
}

/* ── Portrait (phone) layout types ─────────────────────────── */

interface PortraitChip {
  name: string;
  kind: "language" | "tool";
  domains: string[];
  /** Pill center X. */
  x: number;
  halfW: number;
  /** True when this skill also hangs under another domain. */
  shared: boolean;
}

interface PortraitRow {
  y: number;
  chips: PortraitChip[];
}

interface PortraitGroup {
  name: string;
  markerY: number;
  /** Spine segment this group draws as it scrolls into view. */
  segTop: number;
  segBottom: number;
  rows: PortraitRow[];
}

interface PortraitLayout {
  viewBox: { width: number; height: number };
  spineX: number;
  chipX: number;
  me: { x: number; y: number };
  groups: PortraitGroup[];
}

interface Placed {
  skill: Skill;
  halfW: number;
  /** Where this pill would sit if it were the only one in its row. */
  target: number;
  x: number;
  y: number;
}

/* ── The corridor every pill lives in ──────────────────────── */

const MIN_X = LAYOUT.padX + LAYOUT.edgeInset;
const MAX_X = LAYOUT.width - LAYOUT.padX - LAYOUT.edgeInset;
const USABLE_W = MAX_X - MIN_X;
/** Clear air between two rows, given the pitch and the pill height. */
const ROW_AIR = LAYOUT.rowPitch - PILL.height;

/* ── Helpers ───────────────────────────────────────────────── */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generateSway(name: string): { amp: number; delay: number } {
  const h = hashString(name);
  return {
    amp: Math.round((6.5 + (h % 500) / 100) * 100) / 100,
    delay: Math.round(((h % 200) / 100) * 100) / 100,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Step 1: Position domains ──────────────────────────────── */

function positionDomains(domains: Domain[]): PositionedDomain[] {
  const n = domains.length;
  const usableW = LAYOUT.width - LAYOUT.padX * 2;
  const spacing = usableW / (n - 1 || 1);
  return domains.map((d, i) => ({
    name: d.name,
    x: Math.round(LAYOUT.padX + i * spacing),
    y: 0, // filled in once the row count is known
  }));
}

/* ── Step 2: Deal each tier into rows ──────────────────────── */

/** What a row occupies: every pill, plus one mandatory gap between
    each neighbouring pair. */
function rowWidth(items: Placed[]): number {
  const pills = items.reduce((sum, it) => sum + it.halfW * 2, 0);
  return pills + LAYOUT.gapX * Math.max(0, items.length - 1);
}

/** Deal round-robin, preserving centroid order within each row.
    Contiguous chunks would stack all the left-hand domains into one
    row and leave the right-hand ones bare; dealing alternately keeps
    every row spanning the full sheet. */
function deal(items: Placed[], n: number): Placed[][] {
  const rows: Placed[][] = Array.from({ length: n }, () => []);
  items.forEach((it, i) => rows[i % n].push(it));
  return rows;
}

/** Fewest rows this tier can be dealt into and still fit. */
function packTier(items: Placed[]): Placed[][] {
  for (let n = 1; n <= items.length; n++) {
    const rows = deal(items, n);
    if (rows.every(r => rowWidth(r) <= USABLE_W)) return rows;
  }
  const widest = items.reduce((a, b) => (a.halfW > b.halfW ? a : b));
  throw new Error(
    `"${widest.skill.name}" is ${Math.round(widest.halfW * 2)} units wide and ` +
    `cannot fit the ${USABLE_W}-unit corridor even alone on its row. ` +
    `Shorten the name or widen LAYOUT.width.`,
  );
}

/* ── Step 3: Solve one row exactly ─────────────────────────── */

/** Place a row's pills at minimum total displacement from their
    targets, subject to `gapX` between neighbours and the corridor.

    Writing x_i = u_i + c_i, where c_i is the cumulative minimum
    separation from the first pill, turns the spacing constraint into
    u_1 ≤ u_2 ≤ … ≤ u_n, and — because every c_i cancels — turns both
    edge clamps into a single interval [lo, hi] shared by every u_i.
    What remains is isotonic regression: PAVA merges each adjacent
    pair that violates the order into one block holding their mean,
    and that is the exact optimum. One pass, no tuning constants. */
function solveRow(items: Placed[]): void {
  const n = items.length;

  const c: number[] = [0];
  for (let i = 1; i < n; i++) {
    c.push(c[i - 1] + items[i - 1].halfW + items[i].halfW + LAYOUT.gapX);
  }

  const lo = MIN_X + items[0].halfW;
  const hi = MAX_X - items[n - 1].halfW - c[n - 1];
  // packTier only hands us rows that fit, so lo ≤ hi always holds.
  if (hi < lo) throw new Error(`Row overflows the corridor: ${items.map(i => i.skill.name).join(", ")}`);

  // Blocks of pooled values, kept as (mean, size) pairs.
  const val: number[] = [];
  const size: number[] = [];
  for (let i = 0; i < n; i++) {
    val.push(clamp(items[i].target - c[i], lo, hi));
    size.push(1);
    while (val.length > 1 && val[val.length - 2] > val[val.length - 1]) {
      const v2 = val.pop()!, n2 = size.pop()!;
      const v1 = val.pop()!, n1 = size.pop()!;
      val.push((v1 * n1 + v2 * n2) / (n1 + n2));
      size.push(n1 + n2);
    }
  }

  let k = 0;
  for (let b = 0; b < val.length; b++) {
    for (let m = 0; m < size[b]; m++, k++) items[k].x = val[b] + c[k];
  }
}

/* ── Step 4: Lay every tier out ────────────────────────────── */

function placeSkills(skills: Skill[], domainXMap: Map<string, number>): { placed: Placed[]; rowCount: number } {
  /* Tier = how many domains a skill feeds. */
  const tiers = new Map<number, Placed[]>();
  for (const s of skills) {
    const xs = s.domains.map(d => domainXMap.get(d)!);
    const item: Placed = {
      skill: s,
      halfW: pillMetrics(s.name).halfW,
      target: xs.reduce((a, b) => a + b, 0) / xs.length,
      x: 0,
      y: 0,
    };
    if (!tiers.has(s.domains.length)) tiers.set(s.domains.length, []);
    tiers.get(s.domains.length)!.push(item);
  }

  const placed: Placed[] = [];
  let rowIndex = 0;

  for (const [tier, items] of [...tiers.entries()].sort((a, b) => a[0] - b[0])) {
    /* Centroid order is the barycenter heuristic for a layered
       graph — it is what keeps ropes from crossing, and it costs one
       sort instead of the swap search this engine used to run. The
       name tie-break only exists to keep runs reproducible. */
    items.sort((a, b) => a.target - b.target || a.skill.name.localeCompare(b.skill.name));

    const rows = packTier(items);
    for (const row of rows) {
      const y = LAYOUT.skillYTop + rowIndex * LAYOUT.rowPitch;
      for (const it of row) it.y = y;
      solveRow(row);
      placed.push(...row);
      rowIndex++;
    }
    const label = tier === 1 ? "1 domain " : `${tier} domains`;
    console.log(`  tier ${label}  ${String(items.length).padStart(2)} skills → ${rows.length} row(s)`);
  }

  return { placed, rowCount: rowIndex };
}

/* ── Step 5: Prove it ──────────────────────────────────────────
   The solver makes contact impossible, so a failure here means a
   constant or an assumption drifted. There is no test runner in this
   project and a layout that degrades quietly is exactly what shipped
   the last bug, so this fails the build instead of warning.

   It runs on the EMITTED numbers, not the solved ones. Checking the
   full-precision values would pass while the rounded JSON that
   actually ships sits under the gap — the same "measured something
   adjacent to the real thing" mistake that produced the bug this
   rewrite fixes.                                                   */

function assertClearance(skills: PositionedSkill[]): void {
  /* x is written to a tenth, so a pair can read one rounding step
     tight at each end. halfW is already rounded by pillMetrics, so
     it adds none. */
  const eps = 0.11;
  const problems: string[] = [];

  for (let i = 0; i < skills.length; i++) {
    const a = skills[i];
    if (a.x - a.halfW < MIN_X - eps || a.x + a.halfW > MAX_X + eps) {
      problems.push(`"${a.name}" escapes the corridor (${(a.x - a.halfW).toFixed(1)}…${(a.x + a.halfW).toFixed(1)}, allowed ${MIN_X}…${MAX_X})`);
    }
    for (let j = i + 1; j < skills.length; j++) {
      const b = skills[j];
      // Two boxes are clear if they are clear on either axis.
      const airX = Math.abs(a.x - b.x) - (a.halfW + b.halfW);
      const airY = Math.abs(a.y - b.y) - PILL.height;
      if (airX >= LAYOUT.gapX - eps || airY >= ROW_AIR - eps) continue;
      problems.push(
        `"${a.name}" / "${b.name}": ${airX.toFixed(1)} across, ${airY.toFixed(1)} down ` +
        `(need ${LAYOUT.gapX} or ${ROW_AIR})`,
      );
    }
  }

  if (problems.length > 0) {
    console.error(`\n  ✗ ${problems.length} clearance violation(s):`);
    problems.forEach(p => console.error(`      ${p}`));
    process.exit(1);
  }
  console.log(`  ✓ every pair clears ${LAYOUT.gapX} across or ${ROW_AIR} down`);
}

/* ── Portrait layout: one vertical spine ───────────────────────
   Phones get a different composition, not a scaled-down one. The
   landscape solver above pours skills into a 2340-wide sheet; in a
   phone column that renders its 33-unit labels at ~4.8px, so this
   draws a spine instead — a straight top-to-bottom walk with a
   greedy row wrap. Cross-domain skills repeat under each domain they
   feed and carry `shared` so the renderer can mark them.           */

function computePortrait(): PortraitLayout {
  const P = PORTRAIT;

  // Widen past the floor only if a long skill name demands it, so
  // the type stays as large as the longest label allows.
  const widest = Math.max(...skills.map(s => pillMetrics(s.name).halfW * 2));
  const width = Math.max(P.minWidth, Math.round(P.chipX + widest + P.marginRight));
  const contentW = width - P.chipX - P.marginRight;

  const groups: PortraitGroup[] = [];
  let cursor = P.meY + ME_NODE.height / 2 + P.meGap;

  for (const dom of domains) {
    const mine = skills.filter(s => s.domains.includes(dom.name));
    // Exclusive skills lead; shared ones trail, so each group opens
    // with what only it has.
    const ordered = [
      ...mine.filter(s => s.domains.length === 1),
      ...mine.filter(s => s.domains.length > 1),
    ];

    const markerY = cursor;
    const rows: PortraitRow[] = [];
    let row: PortraitChip[] = [];
    let rowW = 0;

    const flush = () => {
      if (row.length === 0) return;
      rows.push({ y: markerY + P.headerGap + (rows.length * P.rowGap), chips: row });
      row = [];
      rowW = 0;
    };

    for (const s of ordered) {
      const halfW = pillMetrics(s.name).halfW;
      const w = halfW * 2;
      const needed = rowW === 0 ? w : rowW + P.chipGapX + w;
      if (needed > contentW) flush();

      const startX = P.chipX + (rowW === 0 ? 0 : rowW + P.chipGapX);
      row.push({
        name: s.name,
        kind: s.kind,
        domains: s.domains,
        x: Math.round(startX + halfW),
        halfW: Math.round(halfW * 10) / 10,
        shared: s.domains.length > 1,
      });
      rowW = rowW === 0 ? w : rowW + P.chipGapX + w;
    }
    flush();

    groups.push({ name: dom.name, markerY, segTop: markerY, segBottom: markerY, rows });
    const lastRowY = rows.length ? rows[rows.length - 1].y : markerY;
    cursor = lastRowY + P.domainGap;
  }

  // Each group draws the spine from its own marker down to the next
  // one, so the line always reaches the rows hanging beside it. The
  // first group also draws the head running up to the Me node.
  const meBottom = P.meY + ME_NODE.height / 2;
  groups.forEach((g, i) => {
    g.segTop = i === 0 ? meBottom : g.markerY;
    const next = groups[i + 1];
    if (next) {
      g.segBottom = next.markerY;
    } else {
      const lastRow = g.rows[g.rows.length - 1];
      g.segBottom = Math.round((lastRow ? lastRow.y : g.markerY) + PILL.height / 2);
    }
  });

  const last = groups[groups.length - 1];
  const height = Math.round(last.segBottom + P.padBottom);

  console.log("─".repeat(52));
  console.log(`  Portrait: ${width}×${height}, ${groups.length} groups`);
  for (const g of groups) {
    const n = g.rows.reduce((a, r) => a + r.chips.length, 0);
    console.log(`    ${g.name.padEnd(18)} ${g.rows.length} rows, ${n} chips`);
  }

  return {
    viewBox: { width, height },
    spineX: P.spineX,
    chipX: P.chipX,
    me: { x: P.spineX, y: P.meY },
    groups,
  };
}

/* ── Main ─────────────────────────────────────────────────── */

function computeLayout(): LayoutResult {
  console.log("SkillTree Layout Engine v5 — ruled rows, tiered by reach");
  console.log("─".repeat(52));

  const errors = validateSkills(skills, domains);
  if (errors.length > 0) {
    console.error("Validation errors:");
    errors.forEach(e => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
  console.log(`  ✓ ${skills.length} skills, ${domains.length} domains`);

  const domainPositioned = positionDomains(domains);
  const domainXMap = new Map(domainPositioned.map(d => [d.name, d.x]));

  const { placed, rowCount } = placeSkills(skills, domainXMap);

  /* Everything below the skills hangs off the last row, so the sheet
     grows with the content instead of being re-tuned by hand. */
  const lastRowY = LAYOUT.skillYTop + (rowCount - 1) * LAYOUT.rowPitch;
  const domainY = lastRowY + LAYOUT.ropeSpan;
  const meY = domainY + LAYOUT.trunkSpan;
  const height = meY + LAYOUT.padBottom;
  for (const d of domainPositioned) d.y = domainY;

  // Me sits under the middle of the domain span, not the middle of
  // the sheet — they coincide today and would not if padX changed.
  const meX = Math.round(
    domainPositioned.reduce((a, d) => a + d.x, 0) / domainPositioned.length,
  );

  const positionedSkills: PositionedSkill[] = placed.map(p => {
    const sway = generateSway(p.skill.name);
    return {
      name: p.skill.name,
      kind: p.skill.kind,
      domains: p.skill.domains,
      // A tenth of a unit — the precision halfW already carries, so
      // the clearance the solver computed survives being written out.
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y),
      halfW: Math.round(p.halfW * 10) / 10,
      swayAmp: sway.amp,
      swayDelay: sway.delay,
    };
  });

  assertClearance(positionedSkills);

  console.log("─".repeat(52));
  console.log(`  Sheet ${LAYOUT.width}×${height} · ${rowCount} rows · domains at y=${domainY} · Me at ${meX},${meY}`);
  for (let r = 0; r < rowCount; r++) {
    const y = LAYOUT.skillYTop + r * LAYOUT.rowPitch;
    const line = positionedSkills
      .filter(s => s.y === y)
      .sort((a, b) => a.x - b.x)
      .map(s => (s.domains.length > 1 ? `${s.name}[${s.domains.length}]` : s.name))
      .join("  ·  ");
    console.log(`  y=${String(y).padStart(4)}  ${line}`);
  }

  return {
    version: 5,
    viewBox: { width: LAYOUT.width, height },
    domainY,
    domains: domainPositioned,
    skills: positionedSkills,
    me: { x: meX, y: meY },
    portrait: computePortrait(),
  };
}

/* ── Write output ─────────────────────────────────────────── */

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = computeLayout();
const outPath = resolve(__dirname, "../data/skill-layout.json");
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`\n✓ Written to ${outPath}`);
