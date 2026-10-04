import { ImageResponse } from "next/og";
import { categories, kinds, selfHostedCount, toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `All ${toolCount} tools in the ${site.name} index, filterable`;
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the flat tool list.
 *
 * `variant="plain"` because this page deliberately has no layer framing — it is
 * the one view that refuses to sort by depth, so drawing the strata rail here
 * would contradict the page's own premise.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="The whole index"
        title={`${toolCount} tools, one list.`}
        subtitle={`Every entry across ${categories.length} sections, filterable by section, role, deployment, kind and cost. ${selfHostedCount} run on your own hardware.`}
        meta={`${kinds.length} kinds · ${selfHostedCount} self-hosted`}
        layer={null}
        footNote="Filter by role"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}