/* Drops a leading `# Title` from a post body.

   The post layout already renders the frontmatter title as the page's
   only h1, so a body that opens with its own h1 prints the title twice
   and puts a second h1 in the document outline. Writing one is the
   natural habit — a standalone markdown file wants a title — so this
   removes it rather than asking every post to remember.

   Only the very first node is considered, and only at depth 1: an h1
   used later in a post is left alone. Runs before reading time, which
   would otherwise count the title's words twice. */

export function remarkStripTitle() {
  return (tree) => {
    const first = tree.children[0];
    if (first?.type === "heading" && first.depth === 1) tree.children.shift();
  };
}
