import { posts } from "@/lib/posts";
import { site } from "@/lib/site";

/**
 * RSS 2.0 feed of the essays. A blog without one is a blog people cannot
 * follow, and every reader agent looks for this before anything else.
 */
export function GET() {
  const items = posts
    .map((post) => {
      const url = `${site.url}/blog/${post.meta.slug}`;
      return `    <item>
      <title><![CDATA[${post.meta.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.meta.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.meta.dek}]]></description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${site.name}</title>
    <link>${site.url}/blog</link>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description><![CDATA[${site.description}]]></description>
    <language>en</language>
    <lastBuildDate>${new Date(posts[0]?.meta.date ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
