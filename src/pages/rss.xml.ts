import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { en } from "../i18n/ui";

/* One feed, in English: posts are English documents in both languages
   (only the furniture around them translates), so the feed's own title
   and description come from the English dictionary rather than being
   restated here. */
export async function GET(context: APIContext) {
  const posts = (await getCollection("blog"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: en.meta.blogTitle,
    description: en.meta.blogDescription,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/blog/${post.slug}/`,
    })),
    customData: "<language>en-us</language>",
  });
}
