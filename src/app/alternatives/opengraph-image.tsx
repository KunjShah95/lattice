import { ImageResponse } from "next/og";
import { alternativesIndex } from "@/lib/alternatives";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Alternatives: what to use instead, grouped by the layer you are leaving";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the alternatives index.
 *
 * `variant="plain"` for the same reason `/fix` uses it: the page spans every
 * layer by design, so drawing one strata rail would assert a single depth the
 * content denies. The count is derived so the card cannot claim a number the
 * index no longer has.
 */
export default function OpengraphImage() {
  const sections = alternativesIndex();
  const pages = sections.reduce((n, s) => n + s.entries.length, 0);

  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Alternatives"
        title="What to use instead."
        subtitle={`${pages} pages, one per tool with a real substitutes graph: the in-layer swaps, the adjacent tools that are not swaps, and no invented winner.`}
        meta={sections.map((s) => s.category.short).join(" · ")}
        layer={null}
        footNote="Unsponsored, bidirectional"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
