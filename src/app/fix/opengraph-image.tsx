import { ImageResponse } from "next/og";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Fix a symptom — start from what is wrong, not from a category";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the symptom index.
 *
 * Without this file the page fell through to the root layout's card, so a share
 * of `/fix` showed "The layers behind working AI systems" — the layer framing,
 * on the one page whose argument is that arriving by layer is the wrong move.
 *
 * `variant="plain"` because the page has no single depth: symptoms span all
 * three bands by design, and drawing one strata rail here would assert an
 * ordering the content denies.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="By symptom"
        title="Start from what is wrong."
        subtitle={`${resolvedSymptoms.length} symptoms — slow, expensive, wrong answers, unreliable agents — each with an ordered checklist that walks the stack cheapest fix first.`}
        meta={resolvedSymptoms.map((s) => s.label).join(" · ")}
        layer={null}
        footNote="Cheapest fix first"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}