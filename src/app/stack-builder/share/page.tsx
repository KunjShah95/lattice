import type { Metadata } from "next";
import StackBuilderPage from "../page";
import { absolute } from "@/lib/seo";
import { stackCardData, stackCardDescription, stackCardQuery, stackCardUrl } from "@/lib/stack-card";
import { stackInputFromSearch } from "@/lib/stack-url";

/**
 * A built stack, as a link that unfurls as that stack.
 *
 * ## Why this is its own route
 *
 * The card for a shared link has to be named in the page's `<head>`, because a
 * social crawler reads the HTML and runs no script. The query the builder uses
 * is only readable per request, and reading it opts a page out of static
 * rendering. `/stack-builder` is the page every visitor lands on, the hero sends
 * people to it, and it is prerendered and served from the edge: making it
 * dynamic would slow it for everyone to give a few shared links a picture.
 *
 * So the builder is rendered twice. `/stack-builder` stays static. This route
 * renders the identical page on request, and is the address the builder hands
 * out ("Copy link", "Post to X"). The builder reads the query from
 * `window.location` and preserves the path, so a reader who opens a shared link
 * lands in the same builder, on the same stack, and the address bar still reads
 * `/stack-builder/share?...`.
 *
 * ## What search engines see
 *
 * `rel=canonical` points at `/stack-builder` and the page is `noindex`: there
 * are as many of these as there are stacks, none is a page worth ranking, and
 * the canonical page is. `og:url` is the exact shared URL, not the canonical:
 * Facebook and LinkedIn treat `og:url` as the identity of the page and re-fetch
 * it, so pointing it at `/stack-builder` would swap the stack's card for the
 * generic one. The two disagree on purpose.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/stack-builder/share">): Promise<Metadata> {
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }

  const input = stackInputFromSearch(query.toString());
  const image = stackCardUrl(absolute(), input);

  const base: Metadata = {
    alternates: { canonical: "/stack-builder" },
    robots: { index: false, follow: true },
  };

  if (!input) {
    return {
      ...base,
      title: "AI stack builder",
      openGraph: { url: absolute("/stack-builder/share"), images: [{ url: image, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", images: [image] },
    };
  }

  const card = stackCardData(input);
  const title = `${card.label} stack, built with Lattice`;
  const description = stackCardDescription(card);
  const alt = `${card.label} stack: ${card.tools.join(", ")}`;
  const url = absolute(`/stack-builder/share?${stackCardQuery(input)}`);

  return {
    ...base,
    title,
    description,
    openGraph: { type: "website", title, description, url, images: [{ url: image, width: 1200, height: 630, alt }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default StackBuilderPage;
