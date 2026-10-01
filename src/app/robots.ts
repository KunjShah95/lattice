import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Crawler policy: everything is open to everything.
 *
 * There is no per-agent allow/deny list and no `Disallow` anywhere. This is a
 * public reference index — the content is already public, the links are already
 * outbound, and the only thing a restrictive robots.txt could accomplish here is
 * keep the site out of search results and off AI answer engines.
 *
 * `Allow: /` for `User-Agent: *` is the default behaviour anyway, so this file
 * earns its keep for one reason: it advertises the sitemap. Crawlers that do not
 * guess `/sitemap.xml` will be told where it is.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}