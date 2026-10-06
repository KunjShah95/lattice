import { ImageResponse } from "next/og";
import { BANDS } from "@/lib/layer";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export const alt = `The three bands of the AI stack — ${BANDS.length} bands over nine layers`;

/**
 * Cover image for the band index.
 *
 * `variant="plain"` for the same reason `/roles` and `/all` are: a band is a
 * *group* of layers rather than one depth, so there is no single layer to badge
 * and a strata rail drawn here would assert an ordering the page does not have.
 */
export default function OpengraphImage() {
  const names = BANDS.map((b) => `Band ${b.roman} · ${b.title}`).join("  ·  ");

  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="The stack, collapsed"
        title="Nine layers, three bands."
        subtitle="Compute is slow and expensive. State gives wrong answers. Control is unreliable and unmeasured."
        meta={names}
        layer={null}
        footNote="Almost every production problem lives in one of them"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}