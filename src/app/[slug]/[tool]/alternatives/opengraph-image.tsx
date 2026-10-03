import { ImageResponse } from "next/og";
import { getTool } from "@/lib/data";
import { allAlternativesPages, getSubstitutes, hasAlternativesPage } from "@/lib/alternatives";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for an alternatives page.
 *
 * These pages declare `twitter: { card: "summary_large_image" }` and a full
 * `openGraph` block, but before this file existed none of them had an image
 * behind either — so every share of an "X alternatives" link, which is the
 * single most shareable query on a directory like this, rendered as a bare
 * text card. That is the same defect the tool cards were added for, on the
 * route segment added after them.
 *
 * `generateStaticParams` is derived from `allAlternativesPages()` — the same
 * helper the page's own `generateMetadata` gates on — so a tool can neither
 * grow an alternatives page without a card nor grow a card without a page.
 * Using `allTools` here instead would try to prerender 112 images of which 73
 * 404 at runtime.
 */
export function generateStaticParams() {
  return allAlternativesPages();
}

/**
 * Params are typed explicitly rather than via `PageProps`: the generated route
 * map does not include metadata routes, so `PageProps<"/…/opengraph-image">` is
 * not a valid key and fails to typecheck.
 */
type AlternativesRouteParams = {
  params: Promise<{ slug: string; tool: string }>;
};

/** The alt text is per-tool, so it is set here rather than as a static export. */
export async function generateMetadata({ params }: AlternativesRouteParams) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) return { alt: "Alternatives" };
  const count = getSubstitutes(slug, tool).length;
  return {
    alt: `${found.tool.name} alternatives — ${count} substitutes compared`,
  };
}

export default async function Image({ params }: AlternativesRouteParams) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) return new Response("Not found", { status: 404 });

  // The page 404s below the three-substitute threshold, so the card must too —
  // otherwise a card exists at a URL that resolves to nothing.
  if (!hasAlternativesPage(slug, tool)) return new Response("Not found", { status: 404 });

  const { tool: t, category } = found;
  const subs = getSubstitutes(slug, tool);

  // Named substitutes on the card, not a count. "Qdrant, Pinecone" tells a
  // reader scrolling a timeline whether this is the page they want; "12" does
  // not. `clamp` in og.tsx still guards the width, so an unusually broad list
  // truncates on a word boundary rather than overflowing the frame.
  const names = subs
    .slice(0, 3)
    .map((s) => s.tool.name)
    .join(", ");

  return new ImageResponse(
    (
      <OgCard
        eyebrow={category.short}
        title={`${t.name} alternatives`}
        subtitle={`${subs.length} recorded substitutes, each with what it is for here — and when it stops being a fair swap.`}
        meta={`${names}${subs.length > 3 ? ` +${subs.length - 3}` : ""}`}
        layer={category.layer}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}