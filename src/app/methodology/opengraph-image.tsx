import { ImageResponse } from "next/og";
import { AS_OF } from "@/lib/attributes";
import { toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Methodology — how the index is compiled, and what it gets wrong";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the methodology page.
 *
 * Deliberately the only card whose footer carries the verification date rather
 * than a navigational hint. This is the page a sceptical reader opens to decide
 * whether to believe anything else on the site, so "when was this checked" is
 * the most useful thing that can sit in that slot — and putting it there is the
 * card making the same argument the page does.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Method"
        title="How this index is compiled."
        subtitle={`Inclusion rules, the six-month build gate on licence and cost data, and an explicit list of what ${toolCount} entries get wrong. Facts verified ${AS_OF}.`}
        meta="Selection · Verification · Limitations"
        layer={null}
        footNote={`Verified ${AS_OF}`}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}