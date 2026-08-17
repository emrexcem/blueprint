import { useEffect, useState } from "react";

/** SSR-safe light-theme flag, tracking the `.light` class on <html>. */
export function useIsLight(): boolean {
  const [light, setLight] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("light"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setLight(el.classList.contains("light")));
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return light;
}

/** Viewports too narrow for the landscape tree to be legible.
    The 2340-unit viewBox puts its 33-unit labels at 10.2px in an
    iPad's 768px portrait and only reaches ~12px around 900px, so
    that is where the portrait spine takes over. Tracked live, not
    read once, so a rotation re-picks the variant. */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 899px)");
    setNarrow(q.matches);
    const h = (e: MediaQueryListEvent) => setNarrow(e.matches);
    q.addEventListener("change", h);
    return () => q.removeEventListener("change", h);
  }, []);
  return narrow;
}
