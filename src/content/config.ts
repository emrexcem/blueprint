import { defineCollection, z } from "astro:content";

/*  ================================================================
    Content Collections
    Blog posts live in src/content/blog/ as .mdx files.
    Astro auto-generates pages + provides type-safe querying.
    ================================================================ */

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Optional cover image
    cover: z.string().optional(),
  }),
});

export const collections = { blog };
