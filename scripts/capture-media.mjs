/* capture-media.mjs — the README's stills.

   Driven by .github/workflows/media.yml against a preview server, and
   runnable by hand the same way:

     SHOWCASE=1 npm run build
     npm run preview -- --host 127.0.0.1 --port 4173
     npm i -D --no-save playwright && npx playwright install chromium
     node scripts/capture-media.mjs --base-url http://127.0.0.1:4173

   Three properties are what make the output worth committing, and each
   costs something in this file:

   Matched. Every variant of a shot — both themes, all four palettes —
   comes out of one run at one framing, because the README puts them
   beside each other and a pair captured a week apart never quite lines
   up. Themes are chosen per browser context; palettes are switched on
   the loaded page, which is safe precisely because a palette is a block
   of colour tokens and moves nothing.

   Still. Every context asks for reduced motion, which is not only about
   entrance animations arriving mid-flight: the hero's script reads it
   and leaves the server-rendered name alone instead of cycling roles,
   and the skill tree answers with its static landscape rather than the
   physics variant. Under reduced motion this page is a drawing, which
   is what a screenshot wants it to be.

   Framed. Shots are either an element or the viewport at the top of a
   page. Nothing here scrolls to a number and hopes. */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
/* Astro depends on sharp for astro:assets, so it is already installed
   and this script needs nothing of its own to encode with. The shots
   are captured at 2× and written as WebP: the same PNGs are ~2.7 MB
   each and these are ~45 KB, and a template nobody wants to clone is
   not a template. */
import sharp from "sharp";

/** Both sides of the skill tree's 900px breakpoint, because below it the
    tree is not a narrower landscape drawing but an entirely different
    composition, and the README has to show both. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const DESKTOP = VIEWPORTS[0];

/** The phone the portrait tree is shown in.

    Its own screen, not the mobile viewport above: at 390 wide the spine
    draws about 900px tall, so a 844 screen would cut a third of it and
    the point of the picture is that the whole composition is different.
    940 holds it. That is a long phone and still a real one — a 21:9
    handset is 2.33:1 and this is 2.41:1 — which the element capture it
    replaces was not: 390 by 1584 is a 1:4 ribbon that reads in a README
    as a mistake rather than as a screen.

    Bezel numbers are device pixels, so they are the 2x of what they
    look like. */
const PHONE = { width: 390, height: 940, bezel: 12, radius: 60 };

/** Neither theme's ink. The frame is drawn once and read on a white
    README and a black one, so it is a grey that holds against both. */
const BEZEL_INK = "#6f767e";

/** How much page to keep above the variation rail. Enough for the
    domain markers and the ropes converging into Me, because a picture
    of the control on its own does not show that it controls anything. */
const STRIP_CONTEXT = 320;

const THEMES = ["light", "dark"];

/** `blueprint` is what :root already declares, so it is captured with no
    `data-palette` attribute at all — the same rule the theme itself
    follows in rootAttrs (src/config.ts) — and its files carry no
    palette suffix. */
const BASE_PALETTE = "blueprint";
const PALETTES = [BASE_PALETTE, "redline", "verdigris", "graphite"];

/** Long enough to cover the islands' 0.6s entrance transition, which is
    a CSS transition driven from JS and so is not silenced by the reduced
    motion request the way the page's own motion scripts are. */
const SETTLE_MS = 900;

/** `palettes: true` marks the shots the README's variation section is
    built from. The rest are captured in the base palette only: four
    copies of every screenshot would document the palette switch four
    times over and bury the shot that was actually being made. */
const SHOTS = [
  { name: "hero", path: "/", selector: "#hero", palettes: true },
  { name: "skill-tree", path: "/", selector: "#skills", palettes: true },
  { name: "projects", path: "/", selector: "#projects" },
  { name: "blog-index", path: "/blog/" },
  // Resolved from the index rather than named, so renaming or reordering
  // the demo posts cannot quietly turn this shot into a 404.
  { name: "blog-post", path: null },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  const value = i === -1 ? undefined : process.argv[i + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const baseUrl = arg("base-url", "http://127.0.0.1:4321");
const outDir = path.resolve(arg("out", "docs/media"));

/** The first post link on the blog index, as a path. */
async function findFirstPost(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(new URL("/blog/", baseUrl).href, { waitUntil: "load" });
    const href = await page.getAttribute("#post-list a[href]", "href");
    if (!href) throw new Error("the blog index rendered no posts");
    return new URL(href, baseUrl).pathname;
  } finally {
    await page.close();
  }
}

async function setPalette(page, palette) {
  await page.evaluate((name) => {
    const root = document.documentElement;
    if (name) root.dataset.palette = name;
    else delete root.dataset.palette;
  }, palette === BASE_PALETTE ? null : palette);
}

/** Everything that has to be true before the shutter opens: the target
    on screen, subresources in, the real faces swapped in for the
    fallback, and any transition the scroll just started finished. */
async function settle(page, target) {
  if (target) await target.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(SETTLE_MS);
}

/** Everything the captures need to be true of a browser, in one place so
    the passes below cannot drift apart on any of it. */
async function newContext(browser, viewport, theme) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    // Retina-density source images, so the README can scale them down
    // and still be sharp on the displays most people read it on.
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    // The stored choice wins over the OS in the theme's pre-paint
    // script, but anything keyed on the media query directly — an image,
    // an embed — would disagree with it if this were left at the
    // default. Both are set so nothing on the page is in two minds about
    // which theme it is in.
    colorScheme: theme,
  });

  // The same key BaseLayout's pre-paint script reads, written before the
  // document runs: the theme is chosen for the first paint rather than
  // toggled after it, so no shot can catch the transition.
  await context.addInitScript((value) => {
    try {
      localStorage.setItem("theme", value);
    } catch {
      // A context with storage blocked still renders; it just falls back
      // to the OS preference, which colorScheme has already set.
    }
  }, theme);

  return context;
}

/** Both rules are armed by a class on <html> rather than applied
    outright, because one shot in this file wants the strip in the
    picture and one wants a shot taller than the viewport to lose the
    navbar. Written on every load: a style tag does not survive one. */
async function armCaptureCss(page) {
  await page.addStyleTag({
    content: `
      .capture-hide-strip .variation-bar { display: none !important; }
      .capture-hide-fixed #navbar { display: none !important; }
    `,
  });
}

const setCaptureClass = (page, name, on) =>
  page.evaluate(
    ({ name, on }) => document.documentElement.classList.toggle(name, on),
    { name, on }
  );

const write = async (png, file) => {
  await sharp(png).webp({ quality: 82, effort: 6 }).toFile(file);
  console.log(path.relative(process.cwd(), file));
};

async function capture(page, shot, viewport, theme, palette) {
  const suffix = palette === BASE_PALETTE ? "" : `-${palette}`;
  const file = path.join(outDir, `${shot.name}-${viewport.name}-${theme}${suffix}.webp`);

  await setPalette(page, palette);

  const target = shot.selector ? page.locator(shot.selector) : null;
  await settle(page, target);

  // A fixed element is painted once, where the scroll left it, so a
  // capture spanning more than a viewport catches the navbar halfway down
  // the picture. The hero is exactly one viewport tall and keeps its bar,
  // which is where a visitor sees it; anything taller drops it.
  const box = target ? await target.boundingBox() : null;
  await setCaptureClass(page, "capture-hide-fixed", Boolean(box && box.height > viewport.height));

  const png = target ? await target.screenshot() : await page.screenshot();
  await write(png, file);
}

/** The tree's own SVG, in page coordinates. Found by size rather than by
    a hook added to the component: the legend below it draws 13px glyphs
    with the same tag name, and a screenshot is not a reason to put a
    handle in shipped markup. Measured after the island has mounted —
    before that this is the server-rendered landscape fallback, which is
    a fifth of the height. */
async function treeBox(page) {
  const box = await page.evaluate(() =>
    [...document.querySelectorAll("#skills svg")]
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.width > 100)
      .map((rect) => ({ top: rect.top, height: rect.height }))[0]
  );
  if (!box) throw new Error("the skill tree did not mount");
  return box;
}

/** Rounds the screen's corners off and draws the bezel around it. Alpha
    outside the corners, so the frame sits on whatever the README is
    being read on. */
async function framePhone(png) {
  const { width, height } = await sharp(png).metadata();
  const { bezel: b, radius: r } = PHONE;

  const svg = (markup) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width + 2 * b}" height="${height + 2 * b}">${markup}</svg>`);

  const screen = await sharp(png)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  return sharp(screen)
    .extend({ top: b, bottom: b, left: b, right: b, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .composite([
      {
        // A stroke straddles its path, so a rect inset by half the bezel
        // and stroked its full width lands exactly in the extended
        // margin — and its radius is the screen's plus that same half,
        // which is what keeps the frame an even thickness around the
        // corners instead of pinching at them.
        input: svg(
          `<rect x="${b / 2}" y="${b / 2}" width="${width + b}" height="${height + b}" rx="${r + b / 2}" ry="${r + b / 2}" fill="none" stroke="${BEZEL_INK}" stroke-width="${b}"/>`
        ),
      },
    ])
    .png()
    .toBuffer();
}

/** The portrait tree, in a phone. Its own pass because it is the one
    shot with its own screen size; centred on the drawing rather than
    scrolled to a number, so a sixth row of skills crops evenly at both
    ends instead of falling off the bottom. */
async function capturePhone(browser, theme) {
  const context = await newContext(browser, PHONE, theme);
  const page = await context.newPage();

  await page.goto(new URL("/", baseUrl).href, { waitUntil: "load" });
  await armCaptureCss(page);
  await setCaptureClass(page, "capture-hide-strip", true);
  // The bar is a viewport-height band of chrome over a shot that is all
  // drawing; the frame is what says "phone" here.
  await setCaptureClass(page, "capture-hide-fixed", true);

  const tree = page.locator("#skills");
  await settle(page, tree);

  const box = await treeBox(page);
  await page.evaluate(
    ({ top, height, screen }) => window.scrollBy(0, top - (screen - height) / 2),
    { ...box, screen: PHONE.height }
  );
  await page.waitForTimeout(300);

  await write(await framePhone(await page.screenshot()), path.join(outDir, `skill-tree-phone-${theme}.webp`));
  await context.close();
}

/** The demo's variation rail, which every other shot in this file hides.
    Clipped to the foot of the viewport: the rail is 52px of a 900px
    screen, and a full-page shot of it is a picture of the page. */
async function captureStrip(browser, theme) {
  const context = await newContext(browser, DESKTOP, theme);
  const page = await context.newPage();

  await page.goto(new URL("/", baseUrl).href, { waitUntil: "load" });
  await armCaptureCss(page);

  const tree = page.locator("#skills");
  await settle(page, tree);

  const rail = await page.evaluate(
    () => document.querySelector(".vbar-rail")?.getBoundingClientRect().toJSON() ?? null
  );
  if (!rail) throw new Error("no variation rail on the page — build with SHOWCASE=1");

  const png = await page.screenshot({
    clip: { x: 0, y: rail.top - STRIP_CONTEXT, width: DESKTOP.width, height: STRIP_CONTEXT + rail.height },
  });
  await write(png, path.join(outDir, `variation-strip-${theme}.webp`));
  await context.close();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();

  // Resolved once, so every context shoots the same post.
  const postPath = await findFirstPost(browser);
  const shots = SHOTS.map((shot) => (shot.path ? shot : { ...shot, path: postPath }));

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await newContext(browser, viewport, theme);
      const page = await context.newPage();

      for (const shot of shots) {
        await page.goto(new URL(shot.path, baseUrl).href, { waitUntil: "load" });
        await armCaptureCss(page);

        // The variation strip is the demo's own furniture and ships in no
        // fork, so it has no business in a picture of the theme. The one
        // shot that is about the strip arms this differently.
        await setCaptureClass(page, "capture-hide-strip", true);

        const palettes = shot.palettes ? PALETTES : [BASE_PALETTE];
        for (const palette of palettes) {
          await capture(page, shot, viewport, theme, palette);
        }
      }

      await context.close();
    }
  }

  for (const theme of THEMES) {
    await capturePhone(browser, theme);
    await captureStrip(browser, theme);
  }

  await browser.close();
}

await main();
