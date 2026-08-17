/* Homepage motion layer.

   Loaded only by index.astro, so no other page pays for it. Nothing
   runs when the visitor prefers reduced motion, and every starting
   state is applied by the animation rather than by CSS — so with JS
   off, or motion turned down, the page is simply present rather than
   invisible. */

import { onPageLoad, prefersReducedMotion } from "../lifecycle";
import { heroTimeline } from "./hero";
import { sectionReveals } from "./reveals";

onPageLoad((scope) => {
  const root = document.querySelector<HTMLElement>('main[data-page="home"]');
  if (!root || prefersReducedMotion()) return;

  const animations = heroTimeline();
  // Cancelling on navigation stops half-finished tweens leaving
  // elements mid-transform in the outgoing page
  scope.observe({ disconnect: () => animations.forEach((a) => a.cancel()) });

  sectionReveals((observer) => scope.observe(observer));
});
