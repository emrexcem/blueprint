/* Build-time social cards, one per post, drawn in the site's own
   drafting-sheet style so a shared link looks like the page it opens. */

import { readFileSync } from "node:fs";
import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";
import { basePresets, theme } from "../../config";

/* A card is a build artefact, so it cannot follow a live palette
   switch and does not try to — but it must follow the palette the
   site is *configured* with, and canvas takes channel numbers where
   CSS takes a var(). Lifting the token out of the stylesheet at build
   time is what keeps global.css the only place a colour is written
   down; the alternative is a second copy of every palette in TypeScript
   that nobody remembers to update.

   Cards are drawn on the dark ground in every palette — a social card
   has no theme to follow — so it is the dark block that is read. */
function accentInk(palette: string): [number, number, number] {
  const css = readFileSync("src/styles/global.css", "utf8");
  const from =
    palette === basePresets.palette
      ? css.indexOf(":root {")
      : css.indexOf(`.dark[data-palette="${palette}"]`);
  const hex = from < 0 ? null : /--accent-primary:\s*#([0-9A-Fa-f]{6})/.exec(css.slice(from));
  if (!hex) throw new Error(`No --accent-primary for palette "${palette}" in global.css`);
  return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as [number, number, number];
}

const accent = accentInk(theme.palette);

const posts = (await getCollection("blog")).filter((post) => !post.data.draft);

const pages = Object.fromEntries(
  posts.map((post) => [
    post.slug,
    { title: post.data.title, description: post.data.description },
  ])
);

const route = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: { title: string; description: string }) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[13, 13, 13]],
    border: { color: accent, width: 8, side: "inline-start" },
    padding: 60,
    // `families` names the family as CanvasKit parses it out of the file,
    // not a CSS stack — both faces below report "Geist". Left unset it
    // defaults to "Noto Sans", which is not among the loaded fonts, so the
    // card would render in whatever CanvasKit fell back to.
    font: {
      title: { size: 58, weight: "Bold", color: [232, 232, 232], lineHeight: 1.1, families: ["Geist"] },
      description: { size: 26, weight: "Normal", color: [136, 136, 136], lineHeight: 1.4, families: ["Geist"] },
    },
    // Rasterised at build time from the full originals in public/, which the
    // subsetter never touches — dist/fonts holds subsets, these do not.
    fonts: [
      "./public/fonts/geist/Geist-Bold.woff2",
      "./public/fonts/geist/Geist-Regular.woff2",
    ],
  }),
});

export const getStaticPaths = route.getStaticPaths;
export const GET = route.GET;
