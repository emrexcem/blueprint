/* Hero load sequence.

   The sheet is drawn before anything is written on it: rules, then
   frame, then crop marks, then the lines of text. One orchestrated
   moment rather than several independent fades. */

import { play, type Step } from "./engine";

export function heroSteps(): Step[] {
  const hero = document.getElementById("hero");
  if (!hero) return [];

  return [
    { target: hero.querySelector(".blueprint-grid"), from: { opacity: 0 }, at: 0, duration: 0.9 },
    {
      target: hero.querySelector("[data-parallax-frame]"),
      from: { opacity: 0, scale: 0.985 },
      at: 0.1,
      duration: 1.1,
    },
    {
      target: hero.querySelectorAll(".crop"),
      from: { opacity: 0, scale: 0.4 },
      at: 0.5,
      duration: 0.5,
      stagger: 0.06,
    },
    // The name animates per letter from Hero.astro's own script
    { target: hero.querySelector("#typewriter")?.parentElement, from: { opacity: 0 }, at: 1.1, duration: 0.6 },
    { target: hero.querySelector(".hero-thesis"), from: { opacity: 0, y: 10 }, at: 1.9, duration: 0.7 },
    // Margin notes land with the scroll cue, after the sheet is written
    { target: hero.querySelectorAll(".hero-note"), from: { opacity: 0 }, at: 2.3, duration: 0.6, stagger: 0.08 },
    { target: hero.querySelector("a[href='#about']"), from: { opacity: 0 }, at: 2.3, duration: 0.6 },
  ];
}

export function heroTimeline(): Animation[] {
  return play(heroSteps());
}
