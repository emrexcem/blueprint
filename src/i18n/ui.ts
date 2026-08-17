/* ================================================================
   ui.ts — every user-facing string on the site, in both languages.
   ================================================================
   `en` is the source of truth: its shape becomes the `UI` type, so
   `de` cannot compile with a missing, extra or misspelled key. Add a
   string to `en` first, then to `de` — TypeScript will point at the
   gap. This guarantee is `ui.ts`'s own — it does NOT extend to
   content in src/config.ts, where German is optional and falls back
   to English through `pick()` (src/i18n/index.ts). The two files
   split on one rule: anything that describes the person or their
   work lives in config.ts; anything that labels the interface lives
   here.

   What is deliberately NOT in here:
   - Blog post titles, descriptions, tags and bodies. Posts are
     English documents; only the furniture around them translates.
   - Proper nouns: skill names, project tech stacks, links, the
     author's name, place names.
   - Domain *keys* in config.ts. Those are identifiers the layout
     engine and the hover logic match on — `tree.domains` maps a key
     to its display name, so translating never moves a node.
   - Bio, interests, spoken languages, project copy, experience
     entries and the hero's roles/thesis/status — all content, all in
     src/config.ts, each carrying its own copy inline instead of
     being zipped against this file by array position.
   ================================================================ */

import { site } from "../config";

export const LOCALES = ["en", "de"] as const;
export type Lang = (typeof LOCALES)[number];

interface RouteText {
  label: string;
  note: string;
}

/* ================================================================
   English
   ================================================================ */

export const en = {
  /* Passed to toLocaleDateString / used for <html lang> and og:locale */
  dateLocale: "en-US",
  htmlLang: "en",
  ogLocale: "en_US",
  /** This language's name *in* this language, for the switcher. */
  name: "English",

  meta: {
    blogTitle: `Blog — ${site.author}`,
    blogDescription:
      "Notes on engineering, experiments, and things I find interesting.",
    notFoundTitle: `404 — Page not found | ${site.author}`,
    notFoundDescription:
      "That page isn't here. Head back to the portfolio, the blog, or get in touch.",
  },

  nav: {
    about: "About",
    skills: "Skills",
    projects: "Projects",
    experience: "Experience",
    blog: "Blog",
    contact: "Contact",
    toggleTheme: "Toggle theme",
    openMenu: "Open menu",
    language: "Language",
    /* aria-label of the switcher cell that leads *to* this language,
       written in this language — a German speaker reading the DE cell
       should hear German. */
    switchTo: "Switch to English",
  },

  hero: {
    scroll: "Scroll",
    scrollAria: "Scroll to About",
  },

  about: {
    label: "About",
    title: "About me",
    interestsLabel: "Interests",
    languagesLabel: "Languages",
    /* The spoken-language table. `native` (in config.ts) is the
       language's own name and never translates; `name` and `level`
       are what a row swaps to on hover, so they are written in the
       *page's* language. */
    languageNames: {
      English: "English",
      Deutsch: "German",
      "Français": "French",
      "Español": "Spanish",
      Nederlands: "Dutch",
    } as Record<string, string>,
    levels: { fluent: "Fluent", learning: "Learning" },
  },

  skills: {
    label: "Skills",
    title: "What I work with",
    description:
      "Grouped by domain and wired to the tools they lean on. Drag a branch to see what holds it up.",
    descriptionNarrow:
      "Grouped by domain and wired to the tools they lean on. Tap a skill to see every domain it feeds.",
  },

  /* Strings inside the SkillTree island. Handed over as one prop so
     the island never bundles the language it is not rendering. */
  tree: {
    me: "Me",
    hint: "drag the skills to play · triple-click to pop",
    aria:
      "Skills grouped by domain. Skills that feed more than one domain are listed under each.",
    legend: {
      domain: "Domains",
      language: "Languages",
      tool: "Tools",
      shared: "Shared",
    },
    /* Key = the domain name in config.ts. Never rename a key. */
    domains: {
      "GPU Programming": "GPU Programming",
      "Image Processing": "Image Processing",
      "Data Analysis": "Data Analysis",
      "AI / ML": "AI / ML",
      "System Admin": "System Admin",
      "Web Dev": "Web Dev",
    } as Record<string, string>,
    panel: {
      open: "PHYSICS",
      close: "CLOSE",
      spring: "SPRING",
      damping: "DAMPING",
      breakAt: "BREAK AT",
      heal: "HEAL",
      off: "OFF",
      on: "ON",
      sound: "SOUND",
      reset: "RESET TREE",
    },
  },

  projects: {
    label: "Work",
    title: "Things I've built",
    description:
      "Personal work spanning GPU rendering, computer vision, and the web. Each one started as a problem worth solving rather than a tutorial worth following.",
    view: "View Project",
  },

  experience: {
    label: "History",
    title: "Where I've been",
    /* Column heads of the ledger. */
    colPeriod: "Period",
    colRole: "Role",
    colOrg: "Organisation",
    colType: "Type",
    badgeWork: "Work",
    badgeEducation: "Education",
    badgeOpen: "Open for work",
    current: "Currently here",
    couldBe: "Could be here",
    hireTypes: [
      "Full-Time Employment",
      "Part-Time Collaboration",
      "One-Time Project",
      "Freelance Contract",
    ],
  },

  writing: {
    label: "Writing",
    title: "Notes and write-ups",
    description:
      "Thoughts on engineering, experiments, and things I find interesting.",
    empty: "No posts yet — check back soon.",
    readAll: "Read all posts",
  },

  contact: {
    label: "Contact",
    title: "Get in touch",
    description:
      "Open to full-time roles, part-time collaborations, and one-off projects. The fastest route is email.",
    github: "GitHub",
    linkedin: "LinkedIn",
    email: "Email",
  },

  footer: {
    drawnBy: "Drawn by",
    location: "Location",
    revision: "Revision",
    sheet: "Sheet",
    sheetValue: "01 of 01",
    backToTop: "Back to top ↑",
  },

  blogIndex: {
    home: "Home",
    rss: "RSS feed →",
    filterByTag: "Filter by tag",
    all: "All",
    year: "Year",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    noMatch: "No posts match these filters.",
    clearFilters: "Clear filters",
    /* {n} min — the listing's compact reading time */
    readingTime: "{n} min",
    /* Built at runtime by the filter script: {n}, {m} → counts */
    countOne: "{n} post",
    countMany: "{n} posts",
    countFiltered: "{n} of {m} posts",
    showing: "Showing {parts}",
    tagPart: "tag: {v}",
    yearPart: "year: {v}",
  },

  post: {
    allPosts: "All posts",
    /* {n} min read */
    readingTime: "{n} min read",
    older: "← Older",
    newer: "Newer →",
    contents: "Contents",
    comments: "Comments",
    /* giscus UI language code */
    giscusLang: "en",
  },

  notFound: {
    label: "Not found",
    title: "This sheet isn't in the set",
    body:
      "The page you asked for isn't here. It may have moved, or the link may have been mistyped. Everything below is still where it should be.",
    routes: [
      { label: "Home", note: "The full portfolio" },
      { label: "Blog", note: "Writing and teardowns" },
      { label: "Contact", note: "Get in touch" },
    ] as RouteText[],
  },

  /* The demo's variation strip. It is built only when SHOWCASE is set,
     but a control the visitor can read is still copy, so its strings
     live here with everything else. `axes` are the attributes the strip
     writes on <html>; `values` are their settings, keyed by the value
     itself so a component never maps one name to another. */
  showcase: {
    label: "Variations",
    /* Accessible names for the collapse control. Each contains the
       visible label above, which is what the tab shows while collapsed
       (WCAG 2.5.3). */
    expand: "Show variations",
    collapse: "Hide variations",
    axes: {
      palette: "Palette",
      corner: "Corner",
      grid: "Grid",
      rule: "Rule",
      motion: "Motion",
    },
    values: {
      blueprint: "Blueprint",
      redline: "Redline",
      verdigris: "Verdigris",
      graphite: "Graphite",
      notched: "Notched",
      square: "Square",
      soft: "Soft",
      ruled: "Ruled",
      coarse: "Coarse",
      plain: "Plain",
      hairline: "Hairline",
      bold: "Bold",
      system: "System",
      full: "Full",
      reduced: "Reduced",
    },
  },
};

export type UI = typeof en;

/* ================================================================
   German

   Register: UI micro-copy is impersonal ("Ein Ast lässt sich
   ziehen…") rather than du/Sie, which matches the drafting-sheet
   voice and avoids mixing forms of address. The one place a person
   is addressed directly — the hire card — uses formal Sie, because
   it speaks to a prospective employer.
   ================================================================ */

export const de: UI = {
  dateLocale: "de-DE",
  htmlLang: "de",
  ogLocale: "de_DE",
  name: "Deutsch",

  meta: {
    blogTitle: `Blog — ${site.author}`,
    blogDescription:
      "Notizen zur Technik, Experimente und Dinge, die ich interessant finde.",
    notFoundTitle: `404 — Seite nicht gefunden | ${site.author}`,
    notFoundDescription:
      "Diese Seite gibt es nicht. Zurück zum Portfolio, zum Blog oder direkt Kontakt aufnehmen.",
  },

  nav: {
    about: "Über mich",
    skills: "Fähigkeiten",
    projects: "Projekte",
    experience: "Werdegang",
    blog: "Blog",
    contact: "Kontakt",
    toggleTheme: "Design wechseln",
    openMenu: "Menü öffnen",
    language: "Sprache",
    switchTo: "Zu Deutsch wechseln",
  },

  hero: {
    scroll: "Scrollen",
    scrollAria: "Zum Abschnitt Über mich scrollen",
  },

  about: {
    label: "Über mich",
    title: "Über mich",
    interestsLabel: "Interessen",
    languagesLabel: "Sprachen",
    languageNames: {
      English: "Englisch",
      Deutsch: "Deutsch",
      "Français": "Französisch",
      "Español": "Spanisch",
      Nederlands: "Niederländisch",
    },
    levels: { fluent: "Fließend", learning: "Lerne gerade" },
  },

  skills: {
    label: "Fähigkeiten",
    title: "Womit ich arbeite",
    description:
      "Nach Fachgebiet gruppiert und mit den Werkzeugen verbunden, auf die sie sich stützen. Ein Ast lässt sich ziehen — dahinter zeigt sich, was ihn trägt.",
    descriptionNarrow:
      "Nach Fachgebiet gruppiert und mit den Werkzeugen verbunden, auf die sie sich stützen. Ein Tippen auf eine Fähigkeit zeigt jedes Fachgebiet, in das sie einfließt.",
  },

  tree: {
    me: "Ich",
    hint: "an den Fähigkeiten ziehen · Dreifachklick zum Zerplatzen",
    aria:
      "Fähigkeiten nach Fachgebiet gruppiert. Fähigkeiten, die mehreren Fachgebieten dienen, stehen unter jedem davon.",
    legend: {
      domain: "Fachgebiete",
      language: "Sprachen",
      tool: "Werkzeuge",
      shared: "Übergreifend",
    },
    domains: {
      "GPU Programming": "GPU-Programmierung",
      "Image Processing": "Bildverarbeitung",
      "Data Analysis": "Datenanalyse",
      "AI / ML": "KI / ML",
      "System Admin": "Systemadmin",
      "Web Dev": "Webentwicklung",
    },
    panel: {
      open: "PHYSIK",
      close: "SCHLIESSEN",
      spring: "FEDER",
      damping: "DÄMPFUNG",
      breakAt: "BRUCH BEI",
      heal: "HEILUNG",
      off: "AUS",
      on: "AN",
      sound: "TON",
      reset: "BAUM ZURÜCKSETZEN",
    },
  },

  projects: {
    label: "Projekte",
    title: "Was ich gebaut habe",
    description:
      "Eigene Projekte aus GPU-Rendering, Computer Vision und dem Web. Jedes begann als ein Problem, das es zu lösen galt — nicht als Tutorial, dem man folgt.",
    view: "Projekt ansehen",
  },

  experience: {
    label: "Werdegang",
    title: "Meine Stationen",
    colPeriod: "Zeitraum",
    colRole: "Station",
    colOrg: "Organisation",
    colType: "Art",
    badgeWork: "Arbeit",
    badgeEducation: "Studium",
    badgeOpen: "Offen für Anfragen",
    current: "Aktuell hier",
    couldBe: "Könnte hier stehen",
    hireTypes: [
      "Festanstellung",
      "Teilzeit-Zusammenarbeit",
      "Einzelprojekt",
      "Freelance-Auftrag",
    ],
  },

  writing: {
    label: "Blog",
    title: "Notizen und Analysen",
    description:
      "Gedanken zur Technik, Experimente und Dinge, die ich interessant finde.",
    empty: "Noch keine Beiträge — bald mehr.",
    readAll: "Alle Beiträge lesen",
  },

  contact: {
    label: "Kontakt",
    title: "Kontakt aufnehmen",
    description:
      "Offen für Festanstellungen, Zusammenarbeit in Teilzeit und einzelne Projekte. Am schnellsten geht es per E-Mail.",
    github: "GitHub",
    linkedin: "LinkedIn",
    email: "E-Mail",
  },

  footer: {
    drawnBy: "Gezeichnet von",
    location: "Ort",
    revision: "Revision",
    sheet: "Blatt",
    sheetValue: "01 von 01",
    backToTop: "Nach oben ↑",
  },

  blogIndex: {
    home: "Startseite",
    rss: "RSS-Feed →",
    filterByTag: "Nach Tag filtern",
    all: "Alle",
    year: "Jahr",
    sort: "Sortierung",
    newest: "Neueste",
    oldest: "Älteste",
    noMatch: "Keine Beiträge passen zu diesen Filtern.",
    clearFilters: "Filter zurücksetzen",
    readingTime: "{n} Min.",
    countOne: "{n} Beitrag",
    countMany: "{n} Beiträge",
    countFiltered: "{n} von {m} Beiträgen",
    showing: "Gefiltert nach {parts}",
    tagPart: "Tag: {v}",
    yearPart: "Jahr: {v}",
  },

  post: {
    allPosts: "Alle Beiträge",
    readingTime: "{n} Min. Lesezeit",
    older: "← Älter",
    newer: "Neuer →",
    contents: "Inhalt",
    comments: "Kommentare",
    giscusLang: "de",
  },

  notFound: {
    label: "Nicht gefunden",
    title: "Dieses Blatt gehört nicht zum Satz",
    body:
      "Die angeforderte Seite ist nicht hier. Vielleicht wurde sie verschoben, vielleicht enthält der Link einen Tippfehler. Alles Weitere steht noch dort, wo es hingehört.",
    routes: [
      { label: "Startseite", note: "Das vollständige Portfolio" },
      { label: "Blog", note: "Artikel und Analysen" },
      { label: "Kontakt", note: "Kontakt aufnehmen" },
    ],
  },

  showcase: {
    label: "Varianten",
    expand: "Varianten einblenden",
    collapse: "Varianten ausblenden",
    axes: {
      palette: "Palette",
      corner: "Ecke",
      grid: "Raster",
      rule: "Linie",
      motion: "Bewegung",
    },
    values: {
      /* Die Paletten tragen Namen aus dem Zeichenbüro — der
         Korrekturzug in Rot, die Kupferpatina, der Bleistift — und
         bleiben unübersetzt: Namen, keine Wörter. */
      blueprint: "Blueprint",
      redline: "Redline",
      verdigris: "Verdigris",
      graphite: "Graphite",
      notched: "Gekerbt",
      square: "Eckig",
      soft: "Rund",
      ruled: "Liniert",
      coarse: "Grob",
      plain: "Blanko",
      hairline: "Haarlinie",
      bold: "Kräftig",
      system: "System",
      full: "Voll",
      reduced: "Reduziert",
    },
  },
};

export const DICTS: Record<Lang, UI> = { en, de };
