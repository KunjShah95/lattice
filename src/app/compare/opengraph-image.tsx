import { ImageResponse } from "next/og";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Comparisons — when the list is not the answer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Comparisons"
        title="When the list is not the answer."
        subtitle={`${resolvedComparisons.length} head-to-head comparisons of tools that are genuine substitutes — each ending in a recommendation, not a feature grid.`}
        meta="Runtimes · Vector stores · Gateways · Evals"
        layer={null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
