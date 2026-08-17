/* Keep the language switch pointed at where the reader actually is.

   Switching language is a real navigation to a separately built page,
   so without help it lands at the top and the reader loses their
   place. Restoring a pixel offset would be wrong — German runs longer
   than English, so the same scrollY is a different part of the page.
   What survives translation is the *section*: the ids are identical in
   both languages, because they come from the markup rather than the
   copy.

   So this tracks the landmark the reader is currently in and writes it
   onto both switcher cells as a hash. With JS off the switcher is
   still a working link to the top of the other language's page — the
   anchor is an enhancement, never a requirement.

   Why scroll rather than an IntersectionObserver, which is what the
   blog's contents rail uses: the rail only has to highlight a row, so
   firing a beat late is invisible. Here a stale value is a wrong
   destination. An observer reports boundary crossings, and a reader
   who jumps — anchor link, Home/End, a restored position — can cross
   several in one frame and land without another crossing to report,
   leaving the href a section behind. Recomputing from geometry is a
   handful of reads on a list this short, and `pointerdown` re-reads it
   once more so the href cannot be stale at the moment it is used. */

import { onPageLoad, type PageScope } from "./lifecycle";

/** The reading line: a landmark counts as current once it has passed
    this far down the viewport. Matches the blog TOC's scroll-spy. */
const READING_LINE_PX = 120;

/** How long the page must stop changing height before an arriving
    anchor is considered settled. */
const QUIET_MS = 600;

/** Hard ceiling on the hold, so a page that never stops moving — an
    animation looping on a height, say — cannot pin the reader. */
const MAX_HOLD_MS = 3000;

/** Events inside this window belong to the click that caused the
    navigation, not to the reader deciding to go somewhere else. */
const GRACE_MS = 150;

/** Landing on `#projects` is not the end of the story: the SkillTree
    island hydrates *above* it a moment later and changes height — on
    phones it swaps the landscape tree for the portrait spine outright
    — so the section the reader asked for slides out from under them.
    They arrive in the right place and then silently drift off it. The
    browser scrolls once, against a layout that is not final yet.

    A fixed timeout is the wrong rule here: it is a guess about how
    long hydration takes, and it was still landing a section out on a
    phone. So hold the target at the top until the document has stopped
    changing height for QUIET_MS, capped at MAX_HOLD_MS. Any real input
    from the reader hands control straight back. */
function holdArrivalAnchor(scope: PageScope): void {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;

  // Only *scrolling* hands control back. A tap must not: the tap that
  // triggered this navigation lands on the outgoing page and its
  // trailing pointer events arrive after the new page has bound its
  // listeners, so treating pointerdown/touchstart as intent released
  // the hold on arrival — leaving the reader at the top of the page
  // with the right hash in the URL and nothing having scrolled.
  let released = false;
  const start = performance.now();
  const release = () => {
    // Anything in the first frames is still the click that got us here.
    if (performance.now() - start < GRACE_MS) return;
    released = true;
  };
  for (const event of ["wheel", "touchmove", "keydown"] as const) {
    addEventListener(event, release, { passive: true, signal: scope.signal });
  }

  const ceiling = performance.now() + MAX_HOLD_MS;
  let quietUntil = performance.now() + QUIET_MS;
  let lastHeight = document.documentElement.scrollHeight;

  const pin = () => {
    const now = performance.now();
    if (released || now > ceiling || now > quietUntil) return;

    // Every height change restarts the quiet period: the page is still
    // settling, so keep holding.
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      quietUntil = now + QUIET_MS;
    }

    // A pixel or two is rounding, not drift — re-scrolling on that
    // would fight the browser every frame for no visible gain.
    //
    // `instant` is load-bearing: global.css sets `scroll-behavior:
    // smooth`, so a plain scrollTo starts an *animation*. Re-issuing
    // one every frame meant each call restarted the easing, the pin
    // crawled toward the target instead of holding it, and whatever
    // position it happened to have reached when the hold expired was
    // where the reader was left — a section short, which is exactly
    // the bug this function exists to prevent.
    const drift = target.getBoundingClientRect().top;
    if (Math.abs(drift) > 2) {
      window.scrollTo({ top: window.scrollY + drift, behavior: "instant" });
    }

    requestAnimationFrame(pin);
  };
  requestAnimationFrame(pin);
}

/** The homepage's own sections, or a post's headings — whichever this
    page has. Both are "where am I" in the sense a reader means it. */
function landmarks(): HTMLElement[] {
  const sections = [
    ...document.querySelectorAll<HTMLElement>('main[data-page="home"] section[id]'),
  ];
  if (sections.length) return sections;
  return [...document.querySelectorAll<HTMLElement>(".blog-prose :is(h2, h3)[id]")];
}

onPageLoad((scope) => {
  // Runs before the early return below: an arriving anchor needs
  // holding even on a page with no switcher landmarks of its own.
  holdArrivalAnchor(scope);

  const cells = [...document.querySelectorAll<HTMLAnchorElement>(".lang-cell")];
  const marks = landmarks();
  if (!cells.length || !marks.length) return;

  // The href without a hash, kept so each update rebuilds from the
  // path rather than appending to a previous anchor.
  for (const cell of cells) {
    if (!cell.dataset.base) cell.dataset.base = cell.getAttribute("href") ?? "";
  }

  let applied: string | null = null;

  const update = () => {
    let active = "";
    for (const mark of marks) {
      if (mark.getBoundingClientRect().top <= READING_LINE_PX) active = mark.id;
    }
    // The hero *is* the top of the page; anchoring to it would only add
    // noise to a URL that already means "the beginning".
    if (active === "hero") active = "";

    if (active === applied) return;
    applied = active;

    for (const cell of cells) {
      cell.setAttribute("href", `${cell.dataset.base}${active ? `#${active}` : ""}`);
    }
  };

  // Coalesce to one measurement per frame: scroll fires far more often
  // than the layout can actually change.
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  addEventListener("scroll", onScroll, { passive: true, signal: scope.signal });
  addEventListener("resize", onScroll, { passive: true, signal: scope.signal });

  // The guarantee. Whatever the throttled pass last saw, the href is
  // rebuilt from current geometry before the click that follows uses
  // it — including middle-click and "copy link address", which both
  // raise pointerdown first.
  for (const cell of cells) {
    cell.addEventListener("pointerdown", update, { signal: scope.signal });
  }

  update();
});
