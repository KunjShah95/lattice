import { ImageResponse } from "next/og";
import { AS_OF } from "@/lib/attributes";
import { toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Compare Builder — any three AI infrastructure tools, side by side, with no winner declared";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the compare builder.
 *
 * `variant="plain"` like `/stack-builder`'s sibling pages: the page is a tool that
 * spans every layer, so a strata rail drawn against one layer would assert a
 * position it does not have — the opposite of what a cross-layer comparison says.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Compare builder"
        title="Compare tools that were never meant to be compared."
        subtitle={`Pick any three of ${toolCount} tools from any layers. See where they differ, and where they are not substitutes at all.`}
        meta="Cross-layer · no winner declared"
        layer={null}
        footNote={`Verified ${AS_OF}`}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
