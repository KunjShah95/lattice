import { ImageResponse } from "next/og";
import { allTools, getTool } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard, bandLabel } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for one tool.
 *
 * This file exists because Next's file convention injects metadata *per route
 * segment*: `app/[slug]/opengraph-image.tsx` covers `/<section>` and nothing
 * below it. Without a card at this level, all 112 tool pages declared
 * `twitter:card: "summary_large_image"` with no image behind it, so every share
 * of a tool link — the site's most shareable unit, since a tool page is what
 * somebody actually sends to a colleague — rendered as a bare text card.
 *
 * `generateStaticParams` matches the page's, so the set of generated images can
 * never drift from the set of pages: a tool added without an image, or an image
 * without a page, fails the build rather than shipping silently.
 */
export function generateStaticParams() {
  return allTools.map((entry) => ({
    slug: entry.category.slug,
    tool: entry.slug,
  }));
}

/**
 * Params are typed explicitly rather than via `PageProps`: the generated route
 * map does not include metadata routes, so `PageProps<"/…/opengraph-image">` is
 * not a valid key and fails to typecheck.
 */
type ToolRouteParams = { params: Promise<{ slug: string; tool: string }> };

/** The alt text is per-tool, so it is set here rather than as a static export. */
export async function generateMetadata({ params }: ToolRouteParams) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  return { alt: found ? `${found.tool.name} — ${found.category.title}` : "Tool cover" };
}

export default async function Image({ params }: ToolRouteParams) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) return new Response("Not found", { status: 404 });

  const { tool: t, category } = found;

  // Facts worth putting on the card, chosen for what helps a reader decide
  // whether to click: how it is deployed, what it costs, and its licence.
  // Reading material has no deployment, so that field is legitimately null and
  // is simply omitted rather than rendered as a placeholder.
  const facts = [
    t.deployment,
    t.cost,
    t.license,
  ].filter((f): f is string => Boolean(f));

  /**
   * The card is built around the site's thesis rather than around the tool.
   *
   * A tool page is the most shareable unit here, and every vendor that sells
   * one puts their own card on it. What a neutral index can put on it instead
   * is the decision pair — when to use it, and when to walk away — which is the
   * half nobody else publishes and the reason a reader who sees the card in a
   * channel has been given something a vendor's card cannot give them.
   *
   * The subtitle is therefore the definition (`blurb`) rather than `useWhen`,
   * because the valve below already carries `useWhen`; repeating it would spend
   * the most prominent line on the same sentence twice.
   */
  return new ImageResponse(
    (
      <OgCard
        variant="tool"
        eyebrow={bandLabel(category.layer)}
        title={t.name}
        domain={t.domain}
        subtitle={t.blurb}
        useWhen={t.useWhen}
        skipWhen={t.skipWhen}
        meta={facts.join(" · ")}
        layer={category.layer}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}