/* Scroll-choreographed section entrances.

   A section header arrives as a small sequence — index, heading, then
   the rule drawing itself across — and the content under it follows in
   a stagger. Elements that enter together are animated as one group,
   so a row of cards moves as a row rather than one at a time. */

import { play, playOnEnter, type Step } from "./engine";

/** Elements that share a scroll position animate as a batch. */
const GROUP_TOLERANCE_PX = 80;

export function sectionReveals(collect: (o: { disconnect(): void }) => void): void {
  /** Anything already on screen is left alone, so `playOnEnter` returns
      nothing to collect. */
  const arm = (o: { disconnect(): void } | null) => o && collect(o);

  // ── Sheets: title block → heading → rule → standfirst ──
  //  Anchored on the sheet rather than on the heading, because the
  //  title block sits above the heading: triggering off the heading
  //  would hide a block the visitor already has on screen.
  document.querySelectorAll<HTMLElement>("[data-sheet]").forEach((sheet) => {
    const steps: Step[] = [
      { target: sheet.querySelector(".sheet-tb"), from: { opacity: 0, x: -8 }, at: 0, duration: 0.5 },
      { target: sheet.querySelector("h1, h2"), from: { opacity: 0, y: 18 }, at: 0.1, duration: 0.7 },
      {
        target: sheet.querySelector(".sheet-rule"),
        from: { scaleX: 0 },
        at: 0.2,
        duration: 0.9,
        transformOrigin: "left center",
      },
      { target: sheet.querySelector(".sheet-lede"), from: { opacity: 0, y: 10 }, at: 0.35, duration: 0.6 },
    ];
    arm(playOnEnter(sheet, steps, () => {}));
  });

  // ── Everything else marked .reveal, grouped by vertical position ──
  const rest = [...document.querySelectorAll<HTMLElement>(".reveal")];

  const groups: HTMLElement[][] = [];
  for (const el of rest) {
    const top = el.getBoundingClientRect().top + window.scrollY;
    const last = groups.at(-1);
    const lastTop = last
      ? last[0].getBoundingClientRect().top + window.scrollY
      : -Infinity;
    if (last && Math.abs(top - lastTop) < GROUP_TOLERANCE_PX) last.push(el);
    else groups.push([el]);
  }

  for (const group of groups) {
    arm(
      playOnEnter(
        group[0],
        [{ target: group, from: { opacity: 0, y: 24 }, duration: 0.7, stagger: 0.09 }],
        () => {}
      )
    );
  }
}

export { play };
