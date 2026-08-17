/* SkillTree entry point.
   SSR + first paint: Static (works everywhere, no JS needed).
   After hydration the variant is picked from the device:
     narrow viewport  → Spine, the portrait layout
     fine pointer     → Interactive, the physics variant
     otherwise        → Static

   Both upgrades happen while the island is still below the fold —
   it hydrates with a 600px rootMargin — so the swap is never seen.

   `text` carries the page's language into the island; see text.tsx
   for why it is a prop rather than an import. */

import { useEffect, useState } from "react";
import Interactive from "./Interactive";
import Spine from "./Spine";
import Static from "./Static";
import { useIsNarrow } from "./hooks";
import { usePrefersReducedMotion } from "../lib/animation";
import { TreeTextProvider, type TreeText } from "./text";

export default function SkillTree({ text }: { text: TreeText }) {
  const [finePointer, setFinePointer] = useState(false);
  const reduced = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  useEffect(() => {
    setFinePointer(window.matchMedia("(pointer: fine)").matches);
  }, []);

  // Narrow wins over the physics variant: a phone plugged into a
  // mouse still has no room for the landscape tree.
  const variant = narrow ? (
    <Spine instant={reduced} />
  ) : finePointer && !reduced ? (
    <Interactive />
  ) : (
    <Static sway={!reduced} instant={reduced} />
  );

  return <TreeTextProvider value={text}>{variant}</TreeTextProvider>;
}
