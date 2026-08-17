import type { APIContext } from "astro";
import { withBase } from "../i18n";

/* robots.txt is generated rather than served from public/, because the
   one line in it that matters — the sitemap URL — is absolute, and a
   static file cannot know the domain or the base path it was built for.
   As a route it reads both from the config, so a fork gets a correct
   sitemap URL without editing anything.

   Caveat worth knowing if you deploy under a subpath: crawlers only read
   robots.txt from the origin root, so on a GitHub project Pages site
   (https://<owner>.github.io/<repo>/) this file is emitted but never
   fetched — the account-level robots.txt wins. It is correct and
   effective on a custom domain, which is where it matters.

   The AI-crawler blocklist below is an opinion, not a default. It is
   here because it is what this theme's author wants; delete the whole
   block if you disagree, and nothing else changes. */

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "CCBot",
  "anthropic-ai",
  "Claude-Web",
  "Google-Extended",
  "Bytespider",
  "Cohere-ai",
  "PerplexityBot",
  "Meta-ExternalAgent",
  "Applebot-Extended",
];

export function GET(context: APIContext) {
  const sitemap = new URL(withBase("/sitemap-index.xml"), context.site).href;

  const body = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${sitemap}`,
    "",
    ...AI_CRAWLERS.flatMap((agent) => [`User-agent: ${agent}`, "Disallow: /", ""]),
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
