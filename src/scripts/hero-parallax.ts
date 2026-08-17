/* hero-parallax.ts
   Mouse-driven parallax in the Hero section: the sheet layers shift
   opposite to the cursor, the text block shifts with it, giving the
   hero depth without any external dependency.                     */

import { onPageLoad, prefersReducedMotion } from "./lifecycle";
import { values } from "../config";

onPageLoad((scope) => {
  // Fine pointer only, and only when motion is welcome
  if (matchMedia("(pointer: coarse)").matches || prefersReducedMotion()) return;

  const hero = document.getElementById("hero");
  if (!hero) return;

  const grid = hero.querySelector<HTMLElement>(".blueprint-grid");
  const frame = hero.querySelector<HTMLElement>("[data-parallax-frame]");
  const textBlock = hero.querySelector<HTMLElement>("[data-parallax-text]");
  // The sheet and its ruling travel against the pointer, the text with
  // it — which is what reads as depth rather than as drift. Scaled by
  // one knob so the whole effect stays in proportion.
  const d = values.parallaxDepth;
  const layers: [HTMLElement | null, number][] = [
    [grid, -6 * d],
    [frame, -3 * d],
    [textBlock, 8 * d],
  ];
  if (!layers.some(([el]) => el)) return;

  let rafId = 0;

  hero.addEventListener(
    "mousemove",
    (e) => {
      const rect = hero.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        for (const [el, depth] of layers) {
          if (el) el.style.transform = `translate(${mx * depth}px, ${my * depth}px)`;
        }
        rafId = 0;
      });
    },
    { signal: scope.signal }
  );

  hero.addEventListener(
    "mouseleave",
    () => {
      const ease = "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
      for (const [el] of layers) {
        if (!el) continue;
        el.style.transition = ease;
        el.style.transform = "translate(0, 0)";
      }
      // Drop the transition afterwards so mousemove stays snappy
      scope.timeout(() => {
        for (const [el] of layers) if (el) el.style.transition = "";
      }, 700);
    },
    { signal: scope.signal }
  );
});
