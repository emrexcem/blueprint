# Contributing

Thanks for looking. This is a theme, so the bar for a change is a little
different from an app: anything that lands here ships in every fork of it.

## Getting set up

```bash
npm install
npm run dev        # localhost:4321
```

Node 22 or newer. The build pulls `canvaskit-wasm`, `harfbuzzjs` and `fontkit`,
which are the parts most likely to object to an older runtime.

## There is no test runner. The build is the test.

`npm run build` is not just a bundle step. It runs two assertion suites that
exit non-zero, and between them they cover the two things in this theme that
can break silently:

- **`prebuild`** solves the skill-tree layout and then runs `assertClearance`
  over the *emitted, rounded* JSON — the numbers that actually ship, not the
  solver's full-precision output. A layout that overlaps fails the build.
- **`postbuild`** subsets every font into `dist/` and re-opens each written
  file to check that no advance width moved, that the mono still measures
  `advance('A') / unitsPerEm === FONT.advance`, that every character the page
  needs survived the cut, and that `liga` shaping is unchanged.

**Neither may be downgraded to a warning.** If a change makes one of them
fail, the change is wrong or the assertion needs to become more precise — not
quieter.

So when you open a PR, say which of these you ran:

1. `npm run check` — `astro check`, the typecheck. Clean, or explain why not.
2. `npm run build` — the assertions above.
3. **Looking at it**, in `npm run dev`: both themes, desktop *and* under 900px.
   The skill tree is two entirely different compositions across that
   breakpoint and only one of them is on screen at a time.

## Things that will bite you

These are the rules a change is most likely to break without noticing. Read
them before a first change:

- **Every user-facing string lives in `src/i18n/ui.ts`, in both languages.**
  `de` is typed as `typeof en`, so a missing German key is a compile error.
  Add to `en` first.
- **Nothing in CSS may hide content that JavaScript later reveals.** Entrance
  states are applied at runtime, so the page stays readable with JS off.
- **Every script that touches the DOM goes through `onPageLoad`** from
  `src/scripts/lifecycle.ts`. The view-transition router swaps the DOM on
  navigation while module scripts run once per session.
- **The palette is edited in `src/styles/global.css` and nowhere else.** Each
  accent publishes both a hex and a bare `r g b` triplet; change them in the
  same edit.
- **Pill widths in the skill tree are computed, never measured.** Swapping the
  mono for one with a different advance ratio mis-sizes every pill — see
  `public/fonts/README.md`.

## What is likely to be accepted

- Bug fixes, accessibility fixes, and anything that makes the no-JS or
  reduced-motion path more honest.
- Documentation, especially where the README told you something that turned
  out not to be true.
- Build and CI improvements.

## What is likely to be argued with

- **New dependencies**, particularly an animation library. The motion budget
  is a design position, not an oversight: four animations, ~1.2 KB of Web
  Animations helper, and a deliberate refusal to add a fifth without a reason.
- **New ambient motion.** Same argument.
- **New tuning constants in the layout engine.** The row solver produces its
  result exactly, in one pass, with nothing to tune. A relaxation factor or an
  iteration cap appearing in that file means an invariant has been lost.
- **A second tinted band, or a plate inside a plate.** The design system's
  structural devices carry meaning; repeating one turns it into decoration.

None of these is a no. They are the arguments you should expect to have, and
"here is why this case is different" is a perfectly good answer to each.

## Commits and PRs

Write commit messages that say why, in the imperative. Keep unrelated changes
in separate commits. If a change moves any of the numbers the README quotes —
bundle sizes, contrast ratios, the advance ratio — update the README in the
same PR.
