---
title: "Solving a row of pills exactly"
description: "The skill tree lays itself out at build time. Once the spacing constraint is rewritten as an ordering constraint, the whole thing is isotonic regression — one pass, no tuning constants, no collisions by construction."
date: 2026-06-11
tags: ["layout", "algorithms", "typescript", "svg"]
---

The skill tree on the front page is not laid out in the browser. A build step
reads the skills, solves their positions, writes a JSON file, and asserts that
nothing overlaps before the site is allowed to build. That last part is the
interesting one: the assertion has never fired, and it never can, because the
solver cannot produce a collision.

That is not carefulness. It is a consequence of the shape of the problem, and
it took one rewrite to find.

## What a row wants

Every skill hangs under the domains that use it, so each one has a target: the
horizontal centroid of its domains. Two skills that feed the same domain want
the same spot. A skill that feeds *Web Dev* and *Data Analysis* wants the
midpoint between them, which is very likely where something else is already
sitting.

Meanwhile the pills have widths — real ones, computed from the character count
and the mono's advance ratio rather than measured — and neighbours have to keep
a mandatory `gapX` between them. So the row is a tug of war: everything wants
its own centroid, and nothing may touch.

![Two rows of skill pills. In the upper row, WANTED, each pill is centred on a dashed guide dropped from its domain centroid and two pairs overlap. In the lower row, SOLVED, the same pills sit slightly off their guides, separated by a marked gap, with the two overlapping pairs bracketed as pooled blocks and the untouched pill labelled "already feasible".](./pills/row-solver.png)
*Pills want their domains' centroid; the gap says they cannot all have it. The solver moves the least it can get away with.*

The first version of this solver did what everyone's first version does. Place
everything at its target, look for overlaps, push the offenders apart, repeat
until nothing moves or the iteration budget runs out. It mostly worked. It had
a proximity threshold, a relaxation factor, and a maximum pass count, and each
of the three was a number I had picked by looking at the result and changing it
until the result looked better. Add a skill with a long name and one of them
would need picking again.

## Rewriting the constraint

Number the pills in a row left to right and let `x_i` be the centre of pill
`i`. The spacing rule is

```
x_{i+1} − x_i  ≥  halfW_i + halfW_{i+1} + gapX
```

The right-hand side is fixed: it depends only on the two pills' widths, and the
widths are known before anything is placed. So define `c_i` as the cumulative
minimum separation from the first pill — `c_1 = 0`, and each subsequent `c`
adds the pair's required distance — and substitute `x_i = u_i + c_i`.

Every constant cancels, and the constraint collapses to

```
u_1  ≤  u_2  ≤  …  ≤  u_n
```

The pills are gone. What is left is a list of numbers that has to come out
non-decreasing, and a set of targets it should stay as close to as possible.
That is isotonic regression, and isotonic regression under squared error is
solved exactly by pool adjacent violators.

The corridor edges come along for free. Clamping the first pill's left edge and
the last pill's right edge both turn into bounds on `u`, and because the `c`
terms cancel there too, they are the *same* interval for every `u_i`. One
`clamp` at the top of the loop, and the row can no longer run off the sheet.

## The pass

```ts
/** Place a row's pills at minimum total displacement from their
    targets, subject to `gapX` between neighbours and the corridor. */
function solveRow(items: Placed[]): void {
  const n = items.length;

  // c_i — cumulative minimum separation from the first pill.
  const c: number[] = [0];
  for (let i = 1; i < n; i++) {
    c.push(c[i - 1] + items[i - 1].halfW + items[i].halfW + LAYOUT.gapX);
  }

  const lo = MIN_X + items[0].halfW;
  const hi = MAX_X - items[n - 1].halfW - c[n - 1];

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
```

Twenty-odd lines, one pass, and the inner `while` is amortised constant: every
iteration removes a block, and blocks are only ever created once each.

The pooling is the part worth watching. When two pills want to be in the wrong
order, they are merged into a block that sits at their mean, and from then on
they move together. A third pill can pull the whole block; the block never
comes apart. That is why the figure above shows the pair moving as a unit
rather than one of them budging and the other staying put — and it is also why
the answer is optimal rather than merely tidy.

### What about the rows themselves?

Rows never collide with each other for a duller reason: they sit one `rowPitch`
apart and a pill is `PILL.height` tall, with `rowPitch` larger than the height.
There is no interaction between rows to solve. A skill's row comes from its
tier — how many domains it feeds — so a tool shared by three domains sinks
toward the ground line and a specialist rides the top.

## What it bought

The tuning constants are gone. There is no relaxation factor, no proximity
threshold, no iteration cap, and no "good enough" — the output is the exact
minimiser of total squared displacement subject to the constraints, every
time, for any set of skills that fits the corridor at all.

The build still asserts clearance, on the *rounded* numbers that actually ship
rather than on the solver's full-precision output — a check that passes at
double precision and fails at two decimals is not a check. It runs on every
build and exits non-zero. It has never fired. The point of keeping it is that
if someone rewrites this solver into something with a tuning constant in it,
they will find out on the first build rather than in a screenshot.
