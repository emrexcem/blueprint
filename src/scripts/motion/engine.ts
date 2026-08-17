/* A very small choreography helper built on the Web Animations API.

   Everything this site animates on scroll is an entrance: an element
   moves a little and fades in, sometimes in a sequence, sometimes as a
   staggered group. WAAPI expresses that directly, and one shared
   IntersectionObserver handles the triggering, so no animation library
   is needed on top.

   Starting states are applied by the animation itself (`fill: backwards`)
   rather than by CSS, which is what keeps the page fully visible when
   JS never runs or motion is turned down. */

export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export interface Step {
  /** Element(s) to animate. Empty or missing targets are skipped. */
  target: Element | NodeListOf<Element> | Element[] | null | undefined;
  /** Starting offsets. Omitted values mean "no change". */
  from?: { opacity?: number; x?: number; y?: number; scale?: number; scaleX?: number };
  /** Seconds. */
  at?: number;
  duration?: number;
  /** Extra seconds between successive targets. */
  stagger?: number;
  easing?: string;
  transformOrigin?: string;
}

function transformOf(from: NonNullable<Step["from"]>): string | null {
  const parts: string[] = [];
  if (from.x) parts.push(`translateX(${from.x}px)`);
  if (from.y) parts.push(`translateY(${from.y}px)`);
  if (from.scale !== undefined) parts.push(`scale(${from.scale})`);
  if (from.scaleX !== undefined) parts.push(`scaleX(${from.scaleX})`);
  return parts.length ? parts.join(" ") : null;
}

function toArray(target: Step["target"]): Element[] {
  if (!target) return [];
  if (target instanceof Element) return [target];
  return Array.from(target as ArrayLike<Element>);
}

/** Hold every target at its start state, inline, until its animation
    runs. Returns a function that clears the hold again.

    Without this the element renders normally until the observer fires
    and the animation's own backwards fill snaps it to the start state —
    a visible blink, since the trigger point is inside the viewport.
    Only ever called for content still below the fold. */
function holdStart(steps: Step[]): () => void {
  const release: (() => void)[] = [];

  for (const step of steps) {
    const from = step.from ?? { opacity: 0, y: 20 };
    const transform = transformOf(from);

    for (const el of toArray(step.target)) {
      const style = (el as HTMLElement).style;
      const prev = { opacity: style.opacity, transform: style.transform };

      if (from.opacity !== undefined) style.opacity = String(from.opacity);
      if (transform) style.transform = transform;
      if (step.transformOrigin) style.transformOrigin = step.transformOrigin;

      release.push(() => {
        style.opacity = prev.opacity;
        style.transform = prev.transform;
      });
    }
  }

  return () => release.forEach((fn) => fn());
}

/** Play a sequence of entrance steps immediately. Returns the animations
    so a caller can cancel them if the page goes away mid-flight. */
export function play(steps: Step[]): Animation[] {
  const animations: Animation[] = [];

  for (const step of steps) {
    const elements = toArray(step.target);
    if (!elements.length) continue;

    const from = step.from ?? { opacity: 0, y: 20 };
    const transform = transformOf(from);
    const start: Keyframe = {};
    const end: Keyframe = {};

    if (from.opacity !== undefined) {
      start.opacity = from.opacity;
      end.opacity = 1;
    }
    if (transform) {
      start.transform = transform;
      end.transform = "none";
    }

    elements.forEach((el, i) => {
      if (step.transformOrigin) {
        (el as HTMLElement).style.transformOrigin = step.transformOrigin;
      }
      animations.push(
        el.animate([start, end], {
          duration: (step.duration ?? 0.7) * 1000,
          delay: ((step.at ?? 0) + i * (step.stagger ?? 0)) * 1000,
          easing: step.easing ?? EASE_OUT,
          fill: "backwards", // hold the start state during the delay only
        })
      );
    });
  }

  return animations;
}

/** Run `steps` the first time `trigger` scrolls into view.

    Returns null when `trigger` is already on screen: an entrance is for
    arriving content, and hiding something the visitor is already reading
    so it can fade back in is a glitch rather than a flourish. The margin
    starts the animation just below the fold, so content is already in
    motion by the time any of it is visible. */
export function playOnEnter(
  trigger: Element,
  steps: Step[],
  onAnimations: (a: Animation[]) => void,
  rootMargin = "0px 0px 10% 0px"
): { disconnect(): void } | null {
  if (trigger.getBoundingClientRect().top < window.innerHeight) return null;

  const release = holdStart(steps);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        // Cleared and replaced by the animation's backwards fill in the
        // same task, so the element is never left un-held for a frame.
        release();
        onAnimations(play(steps));
      }
    },
    { rootMargin }
  );
  observer.observe(trigger);

  // Releasing on teardown too: whatever is still held has not been seen,
  // and must not be left hidden if the page goes away before its turn.
  return {
    disconnect() {
      observer.disconnect();
      release();
    },
  };
}
