/* Injects a reading-time estimate into every post's frontmatter, so
   listings and post headers read the same number from one place. */

import { toString } from "mdast-util-to-string";

const WORDS_PER_MINUTE = 230;

export function remarkReadingTime() {
  return (tree, file) => {
    const words = toString(tree).split(/\s+/).filter(Boolean).length;
    file.data.astro.frontmatter.readingTime = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  };
}
