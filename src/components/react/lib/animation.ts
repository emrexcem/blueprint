/* Small animation primitives for the React islands.

   These replace the handful of framer-motion features the islands
   actually used — an in-view trigger, entrance transitions, an SVG
   line draw, and one exit animation. Everything else is CSS, so no
   animation library ships to the browser. */

import { useEffect, useState } from "react";
import { onMotionPreferenceChange, prefersReducedMotion } from "../../../scripts/lifecycle";

/** The islands' view of the motion predicate in scripts/lifecycle.ts —
    same answer as the page scripts get, tracked live so a change to
    the visitor's setting (or to `data-motion`) re-renders. Starts
    false: the server has no window, and `false` is the state the
    server-rendered markup is already in. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const read = () => setReduced(prefersReducedMotion());
    read();
    return onMotionPreferenceChange(read);
  }, []);
  return reduced;
}

/** Where an element is in its entrance.

    - `idle`   — never hidden. The server renders this, and it also
                 sticks when the element was already on screen at mount,
                 because hiding something the visitor is looking at to
                 fade it back in reads as a glitch, not an entrance.
    - `hidden` — held at its start state, below the fold, unseen.
    - `shown`  — scrolled into view; the transition to settled runs.

    Starting at `idle` is what keeps the islands readable with JS off:
    the server never emits `opacity: 0`. */
export type EntrancePhase = "idle" | "hidden" | "shown";

/** Drives an entrance for `ref` without ever hiding content that has
    already been seen. */
export function useEntrance<T extends Element>(
  ref: React.RefObject<T | null>,
  rootMargin = "0px"
): EntrancePhase {
  const [phase, setPhase] = useState<EntrancePhase>("idle");

  // Decided once, on mount: below the fold is the only case we may hide.
  // Islands hydrate ahead of the viewport (client:visible rootMargin),
  // so in normal scrolling this is true and the entrance still plays.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setPhase("hidden");
  }, [ref]);

  // Armed only after the hidden state has been committed, so the
  // transition into `shown` has a start value to run from.
  useEffect(() => {
    if (phase !== "hidden") return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase("shown");
        observer.disconnect();
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase, ref, rootMargin]);

  return phase;
}

/** Inline styles for one entrance phase. `idle` deliberately returns
    nothing at all, leaving the element exactly as authored — the
    SkillTree engine writes its own transforms to these nodes and must
    not find a leftover `transform` to fight. */
export function entranceStyle(
  phase: EntrancePhase,
  from: string,
  delay = 0,
  duration = 0.6,
  easing = "var(--ease-out-expo)"
): React.CSSProperties {
  if (phase === "idle") return {};
  if (phase === "hidden") return { opacity: 0, transform: from };
  return {
    opacity: 1,
    transform: "none",
    transition: `opacity ${duration}s ease ${delay}s, transform ${duration}s ${easing} ${delay}s`,
  };
}

/** Keeps `open` content mounted for `ms` after it closes, so an exit
    transition can play. Returns [shouldRender, isClosing]. */
export function useDelayedUnmount(open: boolean, ms: number): [boolean, boolean] {
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    if (!rendered) return;
    const timer = setTimeout(() => setRendered(false), ms);
    return () => clearTimeout(timer);
  }, [open, ms, rendered]);

  return [rendered, rendered && !open];
}
