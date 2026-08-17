// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { remarkStripTitle } from "./src/plugins/remark-strip-title.mjs";

export default defineConfig({
  // Canonical origin for feeds, sitemap, canonical links and OG image
  // URLs, and the subdirectory the site is served from.
  //
  // Both read the environment so one checkout can build for more than one
  // target without an edit: a GitHub Pages fork lives at
  // https://<owner>.github.io/<repo>/ and needs BASE_PATH=/<repo>/, while
  // a custom domain needs no base at all. Set SITE_URL to your own domain
  // and leave BASE_PATH alone if you deploy at a root.
  //
  // `site` is the ORIGIN and must not include the base: Astro composes the
  // two, and a base written into both is a base written twice.
  site: process.env.SITE_URL ?? "https://example.com",
  base: process.env.BASE_PATH ?? "/",
  // English is unprefixed (/blog/x), German is prefixed (/de/blog/x).
  // Keeping the default locale unprefixed means every existing English
  // URL — and every link and share pointing at one — keeps working.
  i18n: {
    locales: ["en", "de"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // Must precede mdx() so code blocks are processed before MDX compiles
    expressiveCode({
      themes: ["github-dark", "github-light"],
      // Follows the site's own .dark/.light class rather than the OS
      themeCssSelector: (theme) => `.${theme.type}`,
      useDarkModeMediaQuery: false,
      styleOverrides: {
        borderRadius: "var(--radius-plate)",
        borderColor: "var(--border-subtle)",
        codeFontFamily: "var(--font-mono)",
        codeFontSize: "0.875rem",
        uiFontFamily: "var(--font-mono)",
        uiFontSize: "0.75rem",
        codeBackground: "var(--surface-plate)",
        frames: {
          editorActiveTabIndicatorTopColor: "var(--accent-primary)",
          terminalTitlebarDotsForeground: "var(--text-muted)",
          inlineButtonBorder: "var(--border-subtle)",
        },
      },
    }),
    mdx(),
    react(),
    // Emits hreflang alternates so the two language versions of a page
    // are announced as translations rather than duplicates
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", de: "de" } },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkStripTitle, remarkReadingTime],
  },
  vite: {
    plugins: [tailwindcss()],
    // The demo's variation control strip is a showcase, not a feature: a
    // fork should get the palettes and the treatments without inheriting
    // a toolbar it never asked for. `SHOWCASE=1` turns it on, which the
    // Pages workflow sets and nothing else does.
    //
    // Defined rather than read at runtime so it folds to a literal at
    // build time and the strip's markup, styles and script are absent
    // from a default build rather than hidden in it. CI asserts that.
    //
    // `src/config.ts`'s SHOWCASE export is what components import: it
    // ors this with import.meta.env.DEV, so `npm run dev` shows the
    // strip without an env var — no cross-platform inline assignment
    // in package.json.
    define: {
      "import.meta.env.SHOWCASE": JSON.stringify(process.env.SHOWCASE === "1"),
    },
  },
});
