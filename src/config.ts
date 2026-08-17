/* src/config.ts — everything a fork edits: identity, theme presets,
   comments, projects, experience, skills, bio.

   English is required on every content entry below; German is
   optional and falls back to English through `pick()` in
   src/i18n/index.ts. That asymmetry is deliberate — this file is the
   fork author's, where requiring German would mean writing it (or
   tearing it out, see the README's "Removing German" recipe) before
   shipping. Compare src/i18n/ui.ts, the theme author's file, where
   `de: typeof en` makes a missing key a compile error.

   This file must import NOTHING from src/i18n. `npm run layout` and
   `prebuild` run this file under tsx — plain Node, no Vite — and
   import.meta.env only exists because Vite's `define` injects it.
   src/i18n/index.ts reads import.meta.env.BASE_URL at module scope
   and would throw the moment this file pulled it in. SHOWCASE below
   is guarded the same way, for the same reason. */

import type { Skill, Domain } from "./data/tree-layout";

type Localized<T> = { en: T; de?: T };

/* ── Site identity ─────────────────────────────────────────────── */

/** `en`/`de` are content: the phrase after the em dash in the page
    title, the full meta description sentence, the role-cycler list,
    the hero's one-line thesis, and its status note. `headline` is
    combined with `author` at render time (BaseLayout.astro), so
    renaming the person only means editing `author`; `description` is
    stored as the complete sentence, matching how a blog post's
    description is a free-standing sentence rather than a template. */
export const site = {
  author: "Nora Hellwig",
  location: "Braunschweig, DE",

  /** The contact sheet, in order. `display` is what the row prints,
      so it should be the readable form of `url` rather than a second
      address. These point at example.com because the demo persona is
      fictional and a made-up handle on a real host would send a
      visitor to a stranger's profile. The longest display string
      sets the contact row's stacking breakpoint — see the note in
      Contact.astro before using a longer one. */
  channels: [
    { key: "github", url: "https://example.com/github", display: "example.com/github" },
    { key: "linkedin", url: "https://example.com/linkedin", display: "example.com/linkedin" },
    { key: "email", url: "mailto:hello@example.com", display: "hello@example.com" },
  ] as const,

  en: {
    headline: "Computer Scientist & Developer",
    description:
      "Portfolio of Nora Hellwig — full-stack developer, GPU programmer, builder of things.",
    roles: [
      "Computer Scientist",
      "Full-Stack Developer",
      "GPU Programmer",
      "Builder of Things",
    ],
    thesis: "Building software that bridges hardware, vision, and the web.",
    status: "Open to work",
  },
  de: {
    headline: "Informatikerin & Entwicklerin",
    description:
      "Portfolio von Nora Hellwig — Full-Stack-Entwicklerin, GPU-Programmiererin, Tüftlerin.",
    roles: [
      "Informatikerin",
      "Full-Stack-Entwicklerin",
      "GPU-Programmiererin",
      "Tüftlerin",
    ],
    thesis:
      "Ich baue Software, die Hardware, Computer Vision und das Web verbindet.",
    status: "Offen für Anfragen",
  },
};

/* ── Theme ─────────────────────────────────────────────────────
   Two kinds of knob live here, and the difference between them is
   the point.

   `theme` is named and discrete. Each value is a token block in
   global.css selected by a data-* attribute on <html>, so changing
   one is a cascade change and nothing else: no component anywhere
   branches on these.

   `values` is continuous. There is no sensible shortlist for a
   number, so these are hand-edited and nothing switches them at
   runtime. They deliberately name variables that no preset block
   declares — a knob and a preset never name the same thing, which is
   what stops the cascade turning into a puzzle.

   The demo's control strip switches `theme` only. If you are looking
   for a slider, it is in `values`. */

/** Accent set. Every palette carries the same three inks doing the
    same three jobs — see "the three inks" in global.css — and every
    one of the six colours clears WCAG AA in its mode, with the
    measured ratio written beside it there. Add a palette by adding a
    `[data-palette]` block to that file and a member here. */
export type Palette = "blueprint" | "redline" | "verdigris" | "graphite";

/** Corner treatment. `notched` is the drafting-set default: the
    clipped top-right corner that marks a plate as interactive.
    `square` removes every radius, `soft` trades the notch for a
    rounded corner. */
export type Corner = "notched" | "square" | "soft";

/** The sheet's ground: ruled paper behind the hero, plus the tint
    under the one lifted band. `plain` drops both. */
export type Grid = "ruled" | "coarse" | "plain";

/** Weight of the drawn rules — section hairlines, the title block's
    borders and its cell padding. */
export type Rule = "hairline" | "bold";

/** `system` follows the visitor's `prefers-reduced-motion`, which is
    the correct shipped default. The other two override it. CSS-only
    ambience (the hero's pulse, the tick, the skill sway) is gated on
    the media query itself, so `full` cannot bring it back on a
    machine that asked for less — nor should it. */
export type Motion = "system" | "full" | "reduced";

export interface Presets {
  palette: Palette;
  corner: Corner;
  grid: Grid;
  rule: Rule;
  motion: Motion;
}

/** What `:root` in global.css already declares. Attributes matching
    these are left off `<html>` rather than written out — the base is
    the base, and the served markup stays clean. */
export const basePresets: Presets = {
  palette: "blueprint",
  corner: "notched",
  grid: "ruled",
  rule: "hairline",
  motion: "system",
};

/** The shipped defaults. Edit these; they are the whole configuration
    of the theme's look short of the tokens themselves. */
export const theme: Presets = {
  palette: "blueprint",
  corner: "notched",
  grid: "ruled",
  rule: "hairline",
  motion: "system",
};

export const values = {
  /** Multiplier on the paper grain. 0 removes it; past about 2 it
      stops reading as tooth in the paper and starts reading as
      television static. Consumed as --noise-opacity. */
  noiseOpacity: 1,

  /** Multiplier on the hero's pointer parallax. The layers travel
      -6/-3/+8 px at the edges of the section at 1; past about 2 the
      sheet frame visibly detaches from its crop marks. */
  parallaxDepth: 1,

  /** Project-card tilt, in degrees at the corner of the card. The
      perspective is 800px, so past about 20 the type on the card
      shears rather than turns. 0 leaves the cards flat. */
  tiltMaxDeg: 15,
} as const;

/** Whether the demo's variation control strip is built at all. On in
    `astro dev` so that customising is a live activity, on in a build
    only when SHOWCASE=1 — which the Pages workflow sets and a fork
    does not. Optional-chained: npm run layout and prebuild run this
    file under tsx, where import.meta.env does not exist at all — so the
    `boolean` annotation holds under Vite only; under tsx the expression
    evaluates to `undefined` (falsy, so no behavioural difference, but
    not literally a boolean). */
export const SHOWCASE: boolean = import.meta.env?.SHOWCASE || import.meta.env?.DEV;

/** `data-*` attributes for `<html>`, with anything already true of
    `:root` left out. */
export function rootAttrs(presets: Presets = theme): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const key of Object.keys(basePresets) as (keyof Presets)[]) {
    if (presets[key] !== basePresets[key]) attrs[`data-${key}`] = presets[key];
  }
  return attrs;
}

/** The continuous values that CSS reads, as an inline style for
    `<html>`. Inline beats every selector, which is safe precisely
    because no preset block declares these. Parameter is named `v`,
    not `values`, so its default (`= values`) resolves to the module
    export instead of shadowing itself. */
export function rootStyle(v: typeof values = values): string {
  return `--noise-opacity:${v.noiseOpacity}`;
}

/* ── Comments ─────────────────────────────────────────────────────
   giscus comments, stored as GitHub Discussions.

   Off by default: if repo, repoId or categoryId is blank the comments
   section is not rendered at all — no empty box, no third-party
   request.

   To turn it on:
   1. Create a public repository for the threads. It can hold nothing
      but a README — giscus only needs a public repo with Discussions
      enabled and the giscus app installed. Keeping it separate from
      this one means your site's source can stay private, and any
      licensed font in public/fonts/ is never redistributed.
   2. Add a discussion category. An Announcement-type category is the
      recommended setup: only maintainers and giscus itself can open
      new discussions, so visitors comment on the threads that exist
      and cannot create new ones, which keeps drive-by spam out.
   3. Run the configurator at https://giscus.app with that repo and
      category selected, and copy the four values it prints below.

   The thread is keyed to the post's English path (data-mapping:
   specific in BlogPostPage.astro), so the two language versions of a
   post share one comment thread rather than splitting the
   discussion.

   Each value falls back to an environment variable so the Pages demo
   can have working comments while the four below stay blank here.
   That is not a convenience: this repository is a template, and IDs
   committed to this file would be inherited by every fork — someone
   else's readers would post into the demo's Discussions, and they
   would find out from a stranger's comment rather than from a build
   error. Edit the strings; leave the fallbacks alone. */
export const comments = {
  repo: import.meta.env?.GISCUS_REPO || "",
  repoId: import.meta.env?.GISCUS_REPO_ID || "",
  category: import.meta.env?.GISCUS_CATEGORY || "",
  categoryId: import.meta.env?.GISCUS_CATEGORY_ID || "",
} as const;

export const commentsEnabled: boolean = Boolean(
  comments.repo && comments.repoId && comments.categoryId
);

/* ── About ────────────────────────────────────────────────────── */

/** One run of the About bio. `style` picks the emphasis treatment;
    `accentPrimary/Secondary/Tertiary` name the ink directly (there
    are three, and prose spends all three — see About.astro).
    `underline` is the fallback signal for a segment that has to
    reuse an ink because there are more callouts than inks. */
export interface BioSegment {
  text: string;
  style?: "strong" | "accentPrimary" | "accentSecondary" | "accentTertiary";
  underline?: boolean;
}

export const about = {
  bio: {
    en: [
      {
        text:
          "I am a Computer Scientist and full-stack web developer who has been " +
          "interested and involved in the field since a very young age. Currently " +
          "pursuing my ",
      },
      { text: "M.Sc. in Computer Science at Weststadt University of Technology", style: "strong" },
      { text: ", my work spans " },
      { text: "image & video processing", style: "accentTertiary" },
      { text: ", " },
      { text: "AI / ML workflows", style: "accentPrimary" },
      { text: ", " },
      { text: "systems architecture and pipeline engineering", style: "accentSecondary" },
      { text: ", " },
      { text: "GPU programming", style: "accentTertiary", underline: true },
      { text: ", and more." },
    ] as BioSegment[],
    de: [
      {
        text:
          "Ich bin Informatikerin und Full-Stack-Webentwicklerin und beschäftige mich " +
          "seit früher Jugend mit diesem Feld. Derzeit absolviere ich meinen ",
      },
      { text: "M.Sc. in Informatik an der Technischen Universität Weststadt", style: "strong" },
      { text: "; meine Arbeit umfasst " },
      { text: "Bild- und Videoverarbeitung", style: "accentTertiary" },
      { text: ", " },
      { text: "KI/ML-Workflows", style: "accentPrimary" },
      { text: ", " },
      { text: "Systemarchitektur und Pipeline-Engineering", style: "accentSecondary" },
      { text: ", " },
      { text: "GPU-Programmierung", style: "accentTertiary", underline: true },
      { text: " und mehr." },
    ] as BioSegment[],
  } satisfies Localized<BioSegment[]>,

  interests: {
    en: [
      "DIY Electronics",
      "3D Printing",
      "Architecture",
      "Linguistics",
      "Astrophotography",
      "Board Games",
      "Game Development",
      "Sailing",
    ],
    de: [
      "DIY-Elektronik",
      "3D-Druck",
      "Architektur",
      "Linguistik",
      "Astrofotografie",
      "Brettspiele",
      "Spieleentwicklung",
      "Segeln",
    ],
  } satisfies Localized<string[]>,

  /** `native` is the language's own name and its own word for the
      level — never translated, and the same regardless of which
      language the page is rendered in (see the design note in the
      spec: "which languages the person speaks is content"; what
      "Fluent" is called in the page's language is chrome, and stays
      in ui.ts as `about.languageNames`/`levels`). */
  languages: [
    { native: "English", levelNative: "Fluent", learning: false },
    { native: "Deutsch", levelNative: "Fließend", learning: false },
    { native: "Français", levelNative: "Courant", learning: false },
    { native: "Español", levelNative: "aprendiendo", learning: true },
    { native: "Nederlands", levelNative: "aan het leren", learning: true },
  ],
};

/* ── Projects ─────────────────────────────────────────────────── */

export const projects = [
  {
    link: "https://example.com/voxel-cone-renderer",
    tech: ["C++", "OpenGL", "GLSL", "GPU"],
    en: {
      title: "Voxel Cone Renderer",
      description:
        "Real-time renderer for sparse voxel volumes — cone-traced lighting, a GPU-resident octree, and a streaming loader that keeps a 40 GB scan resident in 2 GB of VRAM. Grew out of the thesis and outlived it.",
    },
    de: {
      title: "Voxel-Cone-Renderer",
      description:
        "Echtzeit-Renderer für dünn besetzte Voxel-Volumen — cone-traced Beleuchtung, ein Octree im GPU-Speicher und ein Streaming-Loader, der einen 40-GB-Scan in 2 GB VRAM hält. Aus der Abschlussarbeit entstanden und ihr entwachsen.",
    },
  },
  {
    link: "https://example.com/lens-bench",
    tech: ["Python", "OpenCV", "NumPy"],
    en: {
      title: "Lens Bench",
      description:
        "Measures lens distortion from a live video stream against a sheet of printed targets. No calibration rig, no tripod — hold the sheet, move it around, and the solver converges in about twenty seconds.",
    },
    de: {
      title: "Lens Bench",
      description:
        "Misst Objektivverzeichnung im Live-Videostream anhand eines Bogens gedruckter Marker. Kein Kalibrierstand, kein Stativ — den Bogen halten, bewegen, und der Solver konvergiert in etwa zwanzig Sekunden.",
    },
  },
  {
    link: "https://example.com/timetable-archaeology",
    tech: ["Git", "Python", "Open Data"],
    en: {
      title: "Timetable Archaeology",
      description:
        "Seventy years of a city's published tram timetables committed to a git repository, one commit per schedule change, so git log, git diff and git blame answer when a line moved, when a stop was cut, and what replaced it.",
    },
    de: {
      title: "Fahrplan-Archäologie",
      description:
        "Siebzig Jahre veröffentlichter Straßenbahn-Fahrpläne einer Stadt in einem Git-Repository, ein Commit pro Fahrplanwechsel — sodass git log, git diff und git blame beantworten, wann eine Linie verlegt, eine Haltestelle gestrichen und wodurch sie ersetzt wurde.",
    },
  },
  {
    link: "https://example.com/broadsheet",
    tech: ["Python", "SQLite", "systemd", "Nginx"],
    en: {
      title: "Broadsheet",
      description:
        "A self-hosted feed reader that renders the day's reading to an e-ink panel at six each morning. Nothing to open, nothing to scroll, and a day's news is one sheet of paper that never refreshes.",
    },
    de: {
      title: "Broadsheet",
      description:
        "Ein selbst gehosteter Feed-Reader, der die Lektüre des Tages jeden Morgen um sechs auf ein E-Ink-Panel zeichnet. Nichts zu öffnen, nichts zu scrollen — ein Blatt Nachrichten, das sich nicht aktualisiert.",
    },
  },
];

/* ── Experience ───────────────────────────────────────────────────
   Index 0 is the hire card, which stands above the ledger rather than
   being an entry in it — Experience.astro reads it out separately and
   sorts the rest newest-first. Each entry carries its own title/org/
   description per language now, so there is no positional zip left
   to desync: insert an entry anywhere and its prose can never attach
   to the wrong one. */
export const experience = [
  {
    type: "hire" as const,
    from: 2026,
    to: null as number | null,
    current: true,
    en: {
      title: "Your Company",
      org: "",
      description:
        "I'm available for work! Whether it's a focused one-time project, an ongoing part-time collaboration, or a full-time role. We can build something great together.",
    },
    de: {
      title: "Ihr Unternehmen",
      org: "",
      description:
        "Ich bin verfügbar! Ob ein klar umrissenes Einzelprojekt, eine laufende Teilzeit-Zusammenarbeit oder eine Festanstellung — gemeinsam lässt sich daraus etwas Großartiges bauen.",
    },
  },
  {
    type: "education" as const,
    from: 2025,
    to: 2027 as number | null,
    current: true,
    en: {
      title: "M.Sc. Computer Science",
      org: "Weststadt University of Technology",
      description:
        "Currently pursuing a computer science master's degree with a focus on AI systems.",
    },
    de: {
      title: "M.Sc. Informatik",
      org: "Technische Universität Weststadt",
      description:
        "Derzeit im Masterstudium Informatik mit Schwerpunkt auf KI-Systemen.",
    },
  },
  {
    type: "education" as const,
    from: 2019,
    to: 2025 as number | null,
    orgLink: "https://example.com/thesis",
    en: {
      title: "B.Sc. Computer Science",
      org: "Weststadt University of Technology",
      description: "Thesis: Real-Time Rendering of Sparse Voxel Volumes.",
    },
    de: {
      title: "B.Sc. Informatik",
      org: "Technische Universität Weststadt",
      description: "Abschlussarbeit: Echtzeit-Rendering dünn besetzter Voxel-Volumen.",
    },
  },
  {
    type: "work" as const,
    from: 2022,
    to: 2024 as number | null,
    orgLink: "https://example.com/materials-lab",
    en: {
      title: "Student Assistant — IT & Lab",
      org: "Weststadt Institute for Materials Research",
      description:
        "Managed ~40 Windows/Linux workstations, automated admin tasks with Python and bash, supported the experimental hardware behind two measurement rigs, integrated lab systems with the campus network, and assisted in carbon fibre manufacturing workflows.",
    },
    de: {
      title: "Studentische Hilfskraft — IT & Labor",
      org: "Institut für Werkstoffforschung Weststadt",
      description:
        "Betreuung von rund 40 Windows- und Linux-Arbeitsplätzen, Automatisierung von Admin-Aufgaben mit Python und Bash, Unterstützung der experimentellen Hardware hinter zwei Messständen, Anbindung der Laborsysteme an das Campusnetz sowie Mitarbeit in der Carbonfaser-Fertigung.",
    },
  },
];

/* ── Skills ───────────────────────────────────────────────────────
   HOW TO ADD A SKILL:
   1. Add it to the `skills` array below.
   2. Run `npm run layout` (or `npm run dev` — it auto-runs).
   3. The layout engine computes optimal positions at build time.

   HOW TO ADD A DOMAIN:
   1. Add it to the `domains` array below.
   2. Reference it from at least one skill's `domains` array.
   3. Run `npm run layout`.

   Domain order in the array = left-to-right display order. See
   src/data/tree-layout.ts for the solver's tuning constants and
   validateSkills(), which are engine internals rather than settings. */

export const domains: Domain[] = [
  { name: "GPU Programming" },
  { name: "Image Processing" },
  { name: "Data Analysis" },
  { name: "AI / ML" },
  { name: "System Admin" },
  { name: "Web Dev" },
];

export const skills: Skill[] = [
  // GPU Programming
  { name: "GLSL",       kind: "language", domains: ["GPU Programming"] },
  { name: "OpenGL",     kind: "tool",     domains: ["GPU Programming"] },

  // Image Processing
  { name: "OpenCV",     kind: "tool",     domains: ["Image Processing"] },

  // AI / ML
  { name: "PyTorch",    kind: "tool",     domains: ["AI / ML"] },

  // System Admin
  { name: "Linux",      kind: "tool",     domains: ["System Admin"] },

  // Web Dev
  { name: "Golang",     kind: "language", domains: ["Web Dev"] },
  { name: "React",      kind: "tool",     domains: ["Web Dev"] },
  { name: "FastAPI",    kind: "tool",     domains: ["Web Dev"] },
  { name: "TypeScript", kind: "language", domains: ["Web Dev"] },

  // Cross-domain skills (connect to multiple roots)
  { name: "Supervised Fine-Tuning", kind: "tool",     domains: ["GPU Programming", "AI / ML"] },
  { name: "HuggingFace",           kind: "tool",     domains: ["AI / ML"] },
  { name: "C / C++",               kind: "language", domains: ["GPU Programming", "Image Processing"] },
  { name: "PostgreSQL",            kind: "tool",     domains: ["Data Analysis", "Web Dev"] },
  { name: "Docker",                kind: "tool",     domains: ["System Admin", "Web Dev"] },
  { name: "NumPy",                 kind: "tool",     domains: ["Image Processing", "Data Analysis"] },
  { name: "Python",                kind: "language", domains: ["Data Analysis", "System Admin", "Web Dev"] },
  { name: "Kubernetes",            kind: "tool",     domains: ["System Admin", "Web Dev"] },
];
