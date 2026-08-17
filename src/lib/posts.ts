/* Shared blog queries.

   Both language variants of every blog route read posts through
   here, so "drafts are excluded from the build entirely" is stated
   once instead of in six places that could drift apart. */

import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** Published posts, newest first. Drafts never reach the build. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("blog");
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** getStaticPaths entries for one post route, in one language. */
export async function postPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}
