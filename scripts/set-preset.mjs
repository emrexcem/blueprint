// Rewrites the shipped variation defaults in src/config.ts, in place.
//
//   node scripts/set-preset.mjs palette=redline
//   node scripts/set-preset.mjs palette=graphite corner=square grid=plain
//
// This exists because the release pipeline builds the same tree once per
// palette and ships the source alongside the output: someone who unzips a
// starter and runs `npm run dev` has no environment set, so the palette has
// to be *in the file*, not in an env var the zip cannot carry. Editing the
// file is therefore the mechanism, and an env override would be a second one
// doing the same job in a way the starter could not inherit.
//
// Two things make this safe to run unattended, and both are assertions
// rather than conventions:
//
//   - `basePresets` is never touched. It declares what `:root` in global.css
//     already is, and `rootAttrs` writes a `data-*` attribute only where the
//     preset differs from it. Rewrite `basePresets.palette` to "redline" and
//     the page stops emitting `data-palette` while `:root` still paints
//     blueprint — the drawing silently reverts. So the edit is scoped to the
//     `theme` block by slicing the file, not by matching a line.
//   - The allowed values are read out of the union types in the same file,
//     so a palette added to `Palette` is accepted here with no edit, and a
//     typo is rejected before it reaches a build.

import { readFile, writeFile } from "node:fs/promises";

const CONFIG = new URL("../src/config.ts", import.meta.url);

/** preset key -> the union type in config.ts that constrains it. */
const TYPE_OF = {
  palette: "Palette",
  corner: "Corner",
  grid: "Grid",
  rule: "Rule",
  motion: "Motion",
};

const fail = (msg) => {
  console.error(`set-preset: ${msg}`);
  process.exit(1);
};

const args = process.argv.slice(2);
if (args.length === 0) {
  fail(
    `nothing to set. Usage: node scripts/set-preset.mjs key=value ...\n` +
      `             keys: ${Object.keys(TYPE_OF).join(", ")}`,
  );
}

const source = await readFile(CONFIG, "utf8");

// Slice out `export const theme: Presets = { ... };` and edit only that.
// The opening line is matched in full rather than by key so a renamed or
// reordered export fails loudly here instead of quietly editing nothing.
const OPEN = "export const theme: Presets = {";
const start = source.indexOf(OPEN);
if (start === -1) fail(`could not find \`${OPEN}\` in src/config.ts`);
const end = source.indexOf("\n};", start);
if (end === -1) fail("the theme block in src/config.ts is not terminated by `\\n};`");

let block = source.slice(start, end);

for (const arg of args) {
  const [key, value] = arg.split("=");
  if (!value) fail(`\`${arg}\` is not key=value`);

  const typeName = TYPE_OF[key];
  if (!typeName) {
    fail(`unknown preset \`${key}\`. Known: ${Object.keys(TYPE_OF).join(", ")}`);
  }

  // Read the permitted values straight off the union so this file never
  // holds a second copy of them.
  const decl = source.match(new RegExp(`export type ${typeName} =([^;]*);`));
  if (!decl) fail(`could not find \`export type ${typeName}\` in src/config.ts`);
  const allowed = [...decl[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (!allowed.includes(value)) {
    fail(`\`${value}\` is not a ${typeName}. Allowed: ${allowed.join(", ")}`);
  }

  // Anchored to the line start so it cannot match inside a comment that
  // happens to quote a preset line.
  const line = new RegExp(`^(\\s*)${key}: "[^"]*",$`, "m");
  if (!line.test(block)) fail(`no \`${key}:\` line in the theme block`);
  block = block.replace(line, `$1${key}: "${value}",`);

  console.log(`set-preset: theme.${key} = ${value}`);
}

await writeFile(CONFIG, source.slice(0, start) + block + source.slice(end));
