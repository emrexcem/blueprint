/* The SkillTree's strings, handed in from Astro.

   The island cannot read Astro.url, and importing the dictionary
   here would bundle *both* languages into the browser payload. So
   index.tsx takes the page's `tree` block as a prop and publishes it
   on this context; the type import is erased at build time, so
   nothing but the rendered language ships.

   Node labels are looked up by their English key — the same key the
   layout engine and the hover logic match on — so translating a
   domain changes what is drawn and never where. */

import { createContext, useContext } from "react";
import type { UI } from "../../../i18n/ui";

export type TreeText = UI["tree"];

const TreeTextContext = createContext<TreeText | null>(null);

export const TreeTextProvider = TreeTextContext.Provider;

export function useTreeText(): TreeText {
  const text = useContext(TreeTextContext);
  if (!text) {
    throw new Error("SkillTree pieces must render inside <TreeTextProvider>");
  }
  return text;
}

/** Display name for a domain, falling back to the key itself. */
export function domainLabel(text: TreeText, key: string): string {
  return text.domains[key] ?? key;
}
