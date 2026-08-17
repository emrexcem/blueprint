#!/usr/bin/env node
/* ================================================================
   subset-fonts.mjs — build-time web-font subsetting.

   The twelve self-hosted faces ship the foundry's full character
   set: Latin, Cyrillic, Greek, box drawing, private-use glyphs,
   and — in the mono — nine stylistic sets of alternates. The site
   is English and German. Roughly four glyphs in five are
   downloaded and never drawn, 247 KB of it in the four faces
   BaseLayout preloads before first paint.

   This runs as `postbuild`, after `astro build` has copied
   `public/` into `dist/`. It rewrites `dist/fonts/**` in place
   with subsets cut from the full originals in `public/fonts/**`.

     - `public/fonts/` stays the tracked source and is never
       touched, so the subset is always cut from the complete font
       and re-running is idempotent. It is also what
       `src/pages/og/[...route].ts` rasterises OG cards from at
       build time; those keep the full character set, because a
       post title can contain anything.
     - Filenames and directories are preserved exactly, so the
       `@font-face` rules in `src/styles/fonts.css` and the
       preloads in `src/layouts/BaseLayout.astro` need no change.
     - All twelve faces are subset. None is dropped: the theme
       ships no upright SemiBold and `font-synthesis: none` is
       global, so a face that went missing would resolve silently
       to the wrong weight rather than erroring.

   ── The metric invariant ─────────────────────────────────────
   The SkillTree computes pill widths as chars × fontSize ×
   FONT.advance and never measures them (`FONT.advance` in
   src/components/react/skill-tree/tokens.ts, imported below rather
   than restated). That constant is a physical property of the
   shipped mono: its advance width divided by its em square. If
   subsetting ever rescaled `unitsPerEm` or rewrote an advance
   width — or if someone swaps in a mono with a different ratio —
   every pill on the site mis-sizes and nothing reports it.

   So each emitted file is re-opened and asserted, hard:
     - unitsPerEm unchanged from the source,
     - advance('A') / unitsPerEm == FONT.advance on every mono face,
       which admits any mono at that ratio on any em square and
       still fails loudly on one that would break the tree,
     - every surviving codepoint keeps the exact advance it had,
     - every required character the source could draw is still in
       the subset's cmap,
     - `liga` shaping is unchanged: the same glyph count with the
       same advances, before and after.
   A failure exits non-zero and fails the build. This project has
   no test runner; the build-time assertion is the test. Do not
   downgrade it to a warning.
   ================================================================ */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { FONT } from "../src/components/react/skill-tree/tokens.ts";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "public", "fonts");
const DIST = path.join(ROOT, "dist");
const OUT_DIR = path.join(DIST, "fonts");

/* ── Character set ───────────────────────────────────────────────
   Derived from the build output, over a floor. Fixed Unicode
   ranges were tried first and cost a great deal for nothing: the
   whole of Latin Extended-A is 6,016 bytes on a proportional face
   and 4,228 on a mono one, to carry 117 glyphs of which the demo
   content draws none at all. Add a language whose prose needs it
   and the derived set picks the glyphs up on the next build,
   which is the point of deriving rather than listing.

   1. THE CORPUS — every codepoint in every HTML file under
      `dist/`. This site
      is entirely static, so the built HTML *is* the complete set
      of text it can ever show: both languages, every post body and
      code block, and the two strings that reach the DOM through
      JavaScript. Those two are covered by a rule the site already
      keeps for a different reason — a script bundled once for the
      whole site cannot know which language rendered the page, so it
      reads its strings from a `data-` attribute: `data-roles` on the
      `data-strings` on the blog filter bar. Both were confirmed
      present in dist/index.html and dist/blog/index.html, German
      included ("Tüftler", "Älteste", "Beiträge").

      The other emitted text — rss.xml, the sitemap, the JS and CSS
      chunks, inline SVG — is scanned too. Today it adds only ×
      (U+00D7, from a JS chunk), which the floor already covers,
      but scanning it costs nothing and stops the feed or a script
      drifting away from the pages.

      Not scanned, because it needs nothing: the OG cards. They are
      PNGs rasterised at build time by `src/pages/og/[...route].ts`
      straight from the *full* originals in `public/fonts/`, which
      this script never touches. No webfont is served for them.

   2. THE FLOOR — printable ASCII plus Latin-1 Supplement, kept
      whether or not the corpus uses them. Deriving alone is a
      little too sharp: `^` (U+005E) appears in no built HTML on
      this site today, so a purely derived subset would ship a font
      with no caret in it, and the first code block or regex to use
      one would fall back mid-word. Latin-1 is the same argument
      for prose — it is the block German and every neighbouring
      language draw from, and at ~4-5 KB it is the cheap half of
      what the old fixed ranges cost.

   Everything above the floor is earned by appearing in the build,
   so the set re-derives itself every time: undrafting a post or
   adding a language re-scans on that build. Codepoints the font
   lacks are ignored by harfbuzz, so over-asking is free.        */
const FLOOR_RANGES = [
  [0x0020, 0x007e, "Basic Latin — printable ASCII"],
  [0x00a0, 0x00ff, "Latin-1 Supplement — ä ö ü ß Ä Ö Ü ç, European prose, © ° × ÷ « »"],
];

/* The corpus. HTML is the authoritative one; the rest is drift
   insurance. Fonts and images must never be scanned as text. */
const CORPUS_PRIMARY = [".html"];
const CORPUS_SECONDARY = [".xml", ".js", ".mjs", ".css", ".svg", ".txt", ".json"];

/* A spot-check printed in the summary so a human reading the build
   log can see the characters that matter most came through. It is
   NOT the assertion — that is driven by the derived set below, and
   covers every requested codepoint the source font can draw. */
const SPOT_CHECK = "äöüßÄÖÜç ’— →↑←↗ ·×";

/* OpenType features to retain, and therefore to run glyph closure
   over. This is HarfBuzz's default-on set for horizontal Latin —
   the same list pyftsubset uses when you do not pass
   `--layout-features`.

   It matters a great deal which way this goes. Retaining *every*
   feature (`--layout-features=*`) drags in `aalt`, `salt`, nine
   stylistic sets and two character variants, whose closure pulls
   1505 of the mono's 2320 glyphs back in and gives up two thirds
   of the saving. Retaining none loses the f-ligatures, which
   would change how body copy renders — a silent typographic
   regression smuggled in under a performance change.

   Nothing in the project asks for a discretionary feature: there
   is no `font-feature-settings` or `font-variant` anywhere in
   src/. If that changes, the feature must be added here or it
   will silently do nothing. */
const KEEP_FEATURES = [
  "ccmp", "locl",                  // composition, localised forms
  "liga", "clig", "rlig",          // standard, contextual, required ligatures
  "calt", "rclt",                  // contextual alternates
  "kern", "cpsp",                  // pair kerning, capital spacing
  "mark", "mkmk", "curs", "dist",  // mark attachment and positioning
];

/* name-table records to keep. HarfBuzz drops nearly all of them.
   These are licensed commercial faces, so the copyright,
   trademark and licence records stay in the shipped file. 1 and 2
   (family, subfamily) cost almost nothing and keep the face
   identifiable in devtools. */
const PRESERVE_NAME_IDS = [0, 1, 2, 7, 13, 14];

/* HarfBuzz constants (hb-subset.h). */
const HB_SUBSET_SETS_NAME_ID = 4;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_MEMORY_MODE_WRITABLE = 2;

/* ── helpers ─────────────────────────────────────────────────── */

const fmt = (n) => n.toLocaleString("en-US");
const saved = (a, b) => `${(100 * (1 - b / a)).toFixed(1)}%`;
const U = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* Codepoints occurring in dist files with one of `exts`. Reading
   the whole file rather than parsing it is deliberate: tag names,
   class names and minified identifiers are all ASCII, so the noise
   they add is already in the floor, while attribute values — where
   `data-roles` and `data-strings` live — are caught for free. */
function scanCorpus(exts) {
  const found = new Set();
  let files = 0;
  for (const file of walk(DIST)) {
    if (file.startsWith(OUT_DIR + path.sep)) continue;
    if (!exts.includes(path.extname(file).toLowerCase())) continue;
    files++;
    for (const ch of fs.readFileSync(file, "utf8")) found.add(ch.codePointAt(0));
  }
  return { found, files };
}

/* ── the subsetter ───────────────────────────────────────────────
   harfbuzzjs is deliberately raw bindings, so this is the usual
   pointer dance: copy the font into the wasm heap, build a subset
   input, run it, copy the result back out. fontverter handles
   woff2 → sfnt on the way in and sfnt → woff2 on the way out;
   HarfBuzz itself only speaks sfnt.

   `subset-font` wraps exactly this, but hardwires
   `--layout-features=*` with no way to narrow it — see
   KEEP_FEATURES above for why that is the one knob that matters
   here. Sixty lines of our own is the cheaper price.          */
function makeSubsetter(harfbuzz, fontverter) {
  const hb = harfbuzz;
  /* Re-read the view every time: a malloc can grow the wasm memory,
     which detaches any Uint8Array held across the call. */
  const heap = () => new Uint8Array(hb.memory.buffer);
  const TAG = (s) => s.split("").reduce((a, c) => (a << 8) + c.charCodeAt(0), 0);

  return async function subset(woff2Buffer, codepoints) {
    const sfnt = await fontverter.convert(woff2Buffer, "truetype");

    const input = hb.hb_subset_input_create_or_fail();
    if (input === 0) throw new Error("hb_subset_input_create_or_fail returned 0");

    const ptr = hb.malloc(sfnt.byteLength);
    heap().set(new Uint8Array(sfnt), ptr);
    const blob = hb.hb_blob_create(ptr, sfnt.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
    const face = hb.hb_face_create(blob, 0);
    hb.hb_blob_destroy(blob);

    const features = hb.hb_subset_input_set(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG);
    hb.hb_set_clear(features);
    for (const tag of KEEP_FEATURES) hb.hb_set_add(features, TAG(tag));

    const nameIds = hb.hb_subset_input_set(input, HB_SUBSET_SETS_NAME_ID);
    for (const id of PRESERVE_NAME_IDS) hb.hb_set_add(nameIds, id);

    const unicodes = hb.hb_subset_input_unicode_set(input);
    for (const cp of codepoints) hb.hb_set_add(unicodes, cp);

    let out;
    try {
      const result = hb.hb_subset_or_fail(face, input);
      if (result === 0) throw new Error("hb_subset_or_fail returned 0 — corrupt input font?");
      const resultBlob = hb.hb_face_reference_blob(result);
      const offset = hb.hb_blob_get_data(resultBlob, 0);
      const length = hb.hb_blob_get_length(resultBlob);
      if (length === 0) throw new Error("subset font came back empty");
      out = Buffer.from(heap().subarray(offset, offset + length));
      hb.hb_blob_destroy(resultBlob);
      hb.hb_face_destroy(result);
    } finally {
      hb.hb_subset_input_destroy(input);
      hb.hb_face_destroy(face);
      hb.free(ptr);
    }

    return Buffer.from(await fontverter.convert(out, "woff2", "truetype"));
  };
}

/* ── main ────────────────────────────────────────────────────── */

/* A fresh clone must build. harfbuzzjs, fontverter and fontkit are
   devDependencies — pure JS and WebAssembly, no native build step
   and no Python — so npm install is enough. If the module tree is
   stripped anyway, leave the full fonts in place and let the build
   succeed: a heavier site is a far better failure than no site.
   This fallback covers a missing tool, never a bad subset — the
   metric assertions below are unconditional. */
let harfbuzz, fontverter, fontkit;
try {
  fontverter = require("fontverter");
  fontkit = require("fontkit");
  const wasm = fs.readFileSync(require.resolve("harfbuzzjs/hb-subset.wasm"));
  harfbuzz = (await WebAssembly.instantiate(wasm)).instance.exports;
} catch (err) {
  console.warn(
    [
      "",
      "  ⚠  subset-fonts: font tooling is not installed.",
      `     (${err.message})`,
      "     Shipping the FULL fonts — the site is correct, just ~250 KB heavier.",
      "     Run `npm install` to restore subsetting.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

if (!fs.existsSync(SRC_DIR)) {
  console.error(`subset-fonts: no source fonts at ${SRC_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(DIST)) {
  console.error("subset-fonts: no dist/ — this is a postbuild step, run `npm run build`.");
  process.exit(1);
}

const faces = walk(SRC_DIR)
  .filter((f) => f.toLowerCase().endsWith(".woff2"))
  .sort();
if (faces.length === 0) {
  console.error(`subset-fonts: no .woff2 faces under ${SRC_DIR}`);
  process.exit(1);
}

/* Requested codepoints: the floor, plus what the build emitted. */
const requested = new Set();
for (const [lo, hi] of FLOOR_RANGES) for (let cp = lo; cp <= hi; cp++) requested.add(cp);
const floorCount = requested.size;

const html = scanCorpus(CORPUS_PRIMARY);
const fromHtml = [...html.found].filter((cp) => cp > 0x20 && !requested.has(cp)).sort((a, b) => a - b);
for (const cp of fromHtml) requested.add(cp);

const rest = scanCorpus(CORPUS_SECONDARY);
const fromRest = [...rest.found].filter((cp) => cp > 0x20 && !requested.has(cp)).sort((a, b) => a - b);
for (const cp of fromRest) requested.add(cp);

const codepoints = [...requested].sort((a, b) => a - b);
const subset = makeSubsetter(harfbuzz, fontverter);

const glyphList = (cps) => cps.map((cp) => `${String.fromCodePoint(cp)} ${U(cp)}`).join("  ");

console.log("\n  subset-fonts");
console.log(`  ├─ floor: ASCII + Latin-1 Supplement → ${fmt(floorCount)} codepoints`);
console.log(`  ├─ corpus: ${html.files} HTML file(s) → ${fromHtml.length} codepoint(s) above the floor`);
if (fromHtml.length) console.log(`  │    ${glyphList(fromHtml)}`);
console.log(`  ├─ other output: ${rest.files} file(s) → ${fromRest.length} codepoint(s) above those`);
if (fromRest.length) console.log(`  │    ${glyphList(fromRest)}`);
console.log(`  └─ requesting ${fmt(requested.size)} codepoints across ${faces.length} faces\n`);

let totalBefore = 0;
let totalAfter = 0;
const failures = [];
const rows = [];

for (const srcPath of faces) {
  const rel = path.relative(SRC_DIR, srcPath);
  const outPath = path.join(OUT_DIR, rel);
  const isMono = /mono/i.test(rel);
  const fail = (msg) => failures.push(`${rel}: ${msg}`);

  const srcBuf = fs.readFileSync(srcPath);
  const src = fontkit.openSync(srcPath);

  const outBuf = await subset(srcBuf, codepoints);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, outBuf);

  /* Verify the bytes just written, not the buffer we hoped for. */
  const out = fontkit.openSync(outPath);

  if (out.unitsPerEm !== src.unitsPerEm) {
    fail(`unitsPerEm drifted ${src.unitsPerEm} → ${out.unitsPerEm}`);
  }
  if (isMono) {
    /* The ratio FONT.advance encodes, not the two numbers one
       particular face happens to express it with — a mono at
       1200/2000 is as valid as one at 600/1000, and both size the
       tree's pills correctly. */
    const a = out.glyphForCodePoint(0x41).advanceWidth;
    const ratio = a / out.unitsPerEm;
    if (ratio !== FONT.advance) {
      fail(
        `mono advance ratio is ${a}/${out.unitsPerEm} = ${ratio}, ` +
        `expected ${FONT.advance} (FONT.advance in skill-tree/tokens.ts)`,
      );
    }
  }

  /* Stricter than the two checks above, and what actually
     guarantees a computed pill width still matches rendered text:
     no surviving glyph may have had its advance rewritten. */
  let drift = 0;
  for (const cp of out.characterSet) {
    if (!src.hasGlyphForCodePoint(cp)) continue;
    const before = src.glyphForCodePoint(cp).advanceWidth;
    const after = out.glyphForCodePoint(cp).advanceWidth;
    if (before !== after) {
      if (drift === 0) fail(`advance changed for ${U(cp)}: ${before} → ${after}`);
      drift++;
    }
  }
  if (drift > 1) failures.push(`${rel}: …and ${drift - 1} more advance change(s)`);

  /* Nothing we asked for and the source could draw may be missing.
     Driven by the derived set, so it grows with the site instead
     of being a hand-kept list that goes stale: every codepoint in
     the corpus or the floor that this face can draw must survive.
     A character that reaches a page and then falls out of the
     subset is exactly the failure this whole step risks. */
  const missing = codepoints.filter(
    (cp) => src.hasGlyphForCodePoint(cp) && !out.hasGlyphForCodePoint(cp),
  );
  if (missing.length) {
    const shown = missing.slice(0, 12).map((cp) => `${String.fromCodePoint(cp)} ${U(cp)}`).join(", ");
    fail(`dropped ${missing.length} requested character(s): ${shown}${missing.length > 12 ? " …" : ""}`);
  }

  /* The spot check is a subset of the above, but assert it by name
     so the reassuring line in the summary is one the script has
     actually earned. */
  const spotMissing = [...SPOT_CHECK.replace(/ /g, "")].filter(
    (ch) => src.hasGlyphForCodePoint(ch.codePointAt(0)) && !out.hasGlyphForCodePoint(ch.codePointAt(0)),
  );
  if (spotMissing.length) fail(`spot check dropped: ${spotMissing.join(" ")}`);

  /* Shaping still works: whatever the source does with `fi` — one
     ligature glyph, or two plain ones — the subset must do the same.
     Catches a subset that kept the glyphs but broke the layout
     tables, which would change how body copy renders.

     Compared by glyph count and advances rather than glyph names:
     subsetters legitimately drop the `post` table, so names come
     back empty from a perfectly good subset, and it is the metrics
     that this file exists to protect anyway. */
  const shaping = (font) =>
    font.layout("fi", ["liga"]).glyphs.map((g) => g.advanceWidth).join("+");
  if (shaping(src) !== shaping(out)) {
    fail(`liga shaping changed: ${shaping(src)} → ${shaping(out)} (advances)`);
  }

  totalBefore += srcBuf.length;
  totalAfter += outBuf.length;
  rows.push({
    rel,
    before: srcBuf.length,
    after: outBuf.length,
    gBefore: src.numGlyphs,
    gAfter: out.numGlyphs,
    cBefore: src.characterSet.length,
    cAfter: out.characterSet.length,
  });
}

const w = Math.max(...rows.map((r) => r.rel.length));
console.log(`  ${"face".padEnd(w)}   ${"before".padStart(7)} ${"after".padStart(7)} ${"saved".padStart(6)}   glyphs`);
for (const r of rows) {
  console.log(
    `  ${r.rel.padEnd(w)}   ${fmt(r.before).padStart(7)} ${fmt(r.after).padStart(7)} ` +
      `${saved(r.before, r.after).padStart(6)}   ${r.gBefore} → ${r.gAfter} (cmap ${r.cBefore} → ${r.cAfter})`,
  );
}
console.log(
  `\n  ${"total".padEnd(w)}   ${fmt(totalBefore).padStart(7)} ${fmt(totalAfter).padStart(7)} ` +
    `${saved(totalBefore, totalAfter).padStart(6)}`,
);

if (failures.length) {
  console.error("\n  ✗ subset-fonts: FONT ASSERTION FAILED\n");
  for (const f of failures) console.error(`      ${f}`);
  console.error(
    [
      "",
      `  The SkillTree computes every pill width from the mono's ${FONT.advance}`,
      "  em advance (FONT.advance in skill-tree/tokens.ts) and never measures",
      "  text, so a font whose metrics moved — or a replacement mono at a",
      "  different ratio — mis-sizes every pill on the site, silently.",
      "  Fix the font or the subsetter. Do not ship this.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const monoCount = rows.filter((r) => /mono/i.test(r.rel)).length;
console.log(`\n  ✓ advance('A') / unitsPerEm == ${FONT.advance} on all ${monoCount} mono faces`);
console.log("  ✓ no advance changed on any surviving glyph, in any face");
console.log(`  ✓ every requested codepoint the face can draw survived; liga shaping intact`);
console.log(`  ✓ spot check present in all ${rows.length} faces: ${SPOT_CHECK}\n`);
