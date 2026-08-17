/* ================================================================
   i18n helpers — language detection and path localisation.
   ================================================================
   The language is read from the URL, never from a prop, so any
   component can ask for it without the page threading it down:

       const lang = getLang(Astro.url);
       const t = useTranslations(lang);

   React islands are the exception — they have no Astro.url — so the
   Astro wrapper passes the strings they need as props.

   URL scheme: English is unprefixed (`/blog/x`), German is prefixed
   (`/de/blog/x`). Keeping the default locale unprefixed means the
   existing English URLs, and every link already pointing at them,
   keep working unchanged.

   ── Base paths ──────────────────────────────────────────────────
   The site may be served from a subdirectory — a GitHub Pages fork
   lives at `https://<owner>.github.io/<repo>/` — so every href has
   to carry that prefix and every incoming pathname arrives with it
   already attached. Rather than sprinkle `import.meta.env.BASE_URL`
   across call sites, the helpers here are composed from `withBase`
   and `stripBase`, and the split is:

     - `localizePath` returns a **ready-to-use href**: base included.
     - `stripLang` returns a **logical key**: base and language both
       removed, so `/de/blog/x` and `/blueprint/de/blog/x` and
       `/blog/x` all reduce to `/blog/x`. That is what identifies a
       page across languages and deployments — it keys the hreflang
       set and the giscus comment thread, neither of which may move
       when the site is republished under a different base.
   ================================================================ */

import { DICTS, LOCALES, type Lang, type UI } from "./ui";

export { LOCALES };
export type { Lang, UI };
export const DEFAULT_LANG: Lang = "en";

const PREFIX: Record<Lang, string> = { en: "", de: "/de" };

/** Astro guarantees a leading slash; it does not guarantee a trailing
    one, and every use here wants both. `/` when there is no base. */
const BASE = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** Prefix a site-root-relative path with the deployment base.
    `/blog` → `/blueprint/blog`, and `/` → `/blueprint/`. */
export function withBase(path: string): string {
  return BASE + (path.startsWith("/") ? path.slice(1) : path);
}

/** The inverse: an incoming pathname reduced to site-root-relative.
    A pathname that does not start with the base is returned as-is —
    it is either already relative or not ours to rewrite. */
export function stripBase(pathname: string): string {
  if (BASE === "/") return pathname;
  const bare = BASE.slice(0, -1); // "/blueprint"
  if (pathname === bare || pathname === BASE) return "/";
  return pathname.startsWith(BASE) ? pathname.slice(bare.length) : pathname;
}

/** The language a URL belongs to. Unknown prefixes fall back to English.
    The base is stripped first, or every page under a subpath would read
    as English — `/blueprint/de/` does not start with `/de`. */
export function getLang(url: URL | { pathname: string }): Lang {
  const p = stripBase(url.pathname);
  for (const lang of LOCALES) {
    if (lang === DEFAULT_LANG) continue;
    const prefix = PREFIX[lang];
    if (p === prefix || p.startsWith(`${prefix}/`)) return lang;
  }
  return DEFAULT_LANG;
}

/** The string table for a language. */
export function useTranslations(lang: Lang): UI {
  return DICTS[lang];
}

/** Drop the base and the language prefix, giving the page's logical
    key: `/blueprint/de/blog/x` → `/blog/x`. */
export function stripLang(pathname: string): string {
  const p = stripBase(pathname);
  for (const lang of LOCALES) {
    if (lang === DEFAULT_LANG) continue;
    const prefix = PREFIX[lang];
    if (p === prefix || p === `${prefix}/`) return "/";
    if (p.startsWith(`${prefix}/`)) return p.slice(prefix.length);
  }
  return p;
}

/** Point a logical path at `lang`, as an href: `/blog` + de →
    `/blueprint/de/blog`. Takes the base with it, so the result can go
    straight into an `href`. */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return withBase(clean);
  // "/" must become "/de/", not "/de" — the built page is a directory
  return withBase(clean === "/" ? `${PREFIX[lang]}/` : `${PREFIX[lang]}${clean}`);
}

/** The same page in another language, from any current pathname. */
export function switchLangPath(pathname: string, to: Lang): string {
  return localizePath(stripLang(pathname), to);
}

/** Fill `{name}` placeholders: format("{n} min", { n: 5 }) → "5 min". */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** Resolve a localized content entry for `lang`, falling back to
    English. `T` is inferred from `entry.en` alone, so the call site
    never needs a type argument. */
export function pick<T>(
  entry: { en: T } & Partial<Record<Lang, T>>,
  lang: Lang,
): T {
  return entry[lang] ?? entry.en;
}
