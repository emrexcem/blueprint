/* Page-scoped script lifecycle.

   With ClientRouter, a module script's top level runs once per session but
   the DOM is replaced on every navigation. Anything that queries elements,
   binds listeners, or starts timers has to re-run per page and tear itself
   down before the next swap, or it leaks and double-fires.

   Register work with onPageLoad and take listeners/timers from the scope —
   both are released automatically before the next navigation. */

export interface PageScope {
  /** Pass as `{ signal }` to addEventListener; aborted before the next swap. */
  readonly signal: AbortSignal;
  /** Cleared before the next swap. */
  timeout(fn: () => void, ms: number): void;
  /** Cleared before the next swap. */
  interval(fn: () => void, ms: number): void;
  /** Disconnected before the next swap. */
  observe(observer: { disconnect(): void }): void;
}

export function onPageLoad(init: (scope: PageScope) => void): void {
  let controller: AbortController | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const observers: { disconnect(): void }[] = [];

  const teardown = () => {
    controller?.abort();
    controller = null;
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    observers.forEach((o) => o.disconnect());
    timers.length = intervals.length = observers.length = 0;
  };

  document.addEventListener("astro:page-load", () => {
    teardown();
    controller = new AbortController();
    init({
      signal: controller.signal,
      timeout: (fn, ms) => void timers.push(setTimeout(fn, ms)),
      interval: (fn, ms) => void intervals.push(setInterval(fn, ms)),
      observe: (o) => void observers.push(o),
    });
  });

  document.addEventListener("astro:before-swap", teardown);
}

/* ── The motion predicate ──────────────────────────────────────
   Everything that decides whether to animate asks this one function:
   the homepage load sequence, the scroll reveals, the hero, the
   ledger's type cycler, the pointer parallax, and — through
   `usePrefersReducedMotion` in react/lib/animation.ts — both islands.
   One predicate rather than a media query per call site, so the
   answer cannot come out differently in two places.

   `data-motion` on <html> overrides the visitor's setting, which is
   how the demo shows both paths on one machine. The theme ships
   without the attribute, and then the setting alone decides. */

/** Reduced motion, re-read per page load rather than cached at module scope. */
export function prefersReducedMotion(): boolean {
  const forced = document.documentElement.dataset.motion;
  if (forced === "reduced") return true;
  if (forced === "full") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fires whenever that answer may have changed — the visitor's setting,
    or the attribute being rewritten. Returns an unsubscribe. */
export function onMotionPreferenceChange(fn: () => void): () => void {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  const observer = new MutationObserver(fn);
  query.addEventListener("change", fn);
  observer.observe(document.documentElement, { attributeFilter: ["data-motion"] });
  return () => {
    query.removeEventListener("change", fn);
    observer.disconnect();
  };
}
