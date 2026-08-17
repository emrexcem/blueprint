# Fonts

The theme self-hosts two families and loads nothing from a CDN.

| Directory | Family | Version | Role |
|---|---|---|---|
| `geist/` | Geist | 1.800 | Display and body — `--font-display` |
| `geist-mono/` | Geist Mono | 1.700 | Data, labels, code, SkillTree — `--font-mono` |

Both are from the [vercel/geist-font](https://github.com/vercel/geist-font)
release **v1.7.2**, and both are licensed under the **SIL Open Font License
1.1**. The full licence text sits beside the faces it covers, as `OFL.txt` in
each directory.

Six weights ship per family, and they are the six the design uses: 100, 400,
400 italic, 500, 700, plus one italic upper weight. There is no upright 600 in
the shipped set and `font-synthesis: none` is set globally, so weight 600 on
upright text will not resolve to anything — use 500 or 700 deliberately.

To change a face, edit the `@font-face` blocks in `src/styles/fonts.css` and
the `--font-display` / `--font-mono` values in `src/styles/global.css`. Those
two files are the only places a family is named; every component points at the
custom properties.

## Replacing the mono: the 0.6 advance ratio

**The SkillTree never measures text.** Every pill in the tree is sized
arithmetically, as `chars × fontSize × 0.6`, and the build-time layout solver
and the browser both compute it from the same constant — `FONT.advance` in
`src/components/react/skill-tree/tokens.ts`. That is what lets the solver
guarantee no two pills collide without ever rendering anything.

The 0.6 is not a preference. It is a physical property of the shipped mono, so
**a replacement mono must satisfy `advance('A') / unitsPerEm === 0.6` exactly.**
A face whose glyphs advance any other fraction of the em will mis-size every
pill in the tree: labels overflow their capsules, and the clearance the solver
proved no longer holds.

Fonts that satisfy it: Geist Mono, JetBrains Mono, IBM Plex Mono — all 600 per
1000 em. Fonts that look like they do and do not: **Space Mono** at 0.612, and
**Roboto Mono** at 1229/2048 = 0.600098, which is close enough to pass a glance
and not close enough to be right.

You do not have to check by hand. `npm run build` asserts the ratio on every
mono face it subsets and **fails the build** rather than shipping mis-sized
pills. If you swap the mono and the build goes red on that assertion, the font
is the problem, not the assertion. After a successful swap, run `npm run layout`
to recompute the tree.
