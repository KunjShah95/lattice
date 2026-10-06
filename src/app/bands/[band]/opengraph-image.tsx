import { ImageResponse } from "next/og";
import { BANDS, bandLayers, bandMeta, type Band } from "@/lib/layer";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for one band.
 *
 * Mirrors `generateStaticParams` on the page, so a band can never gain a page
 * without a card or the reverse — the same pairing `roles/[role]` uses.
 */
export function generateStaticParams() {
  return BANDS.map((b) => ({ band: b.id }));
}

type BandRouteParams = { params: Promise<{ band: string }> };

export async function generateMetadata({ params }: BandRouteParams) {
  const { band } = await params;
  const meta = bandMeta(band as Band);
  if (!meta) return { alt: "Band" };
  return {
    alt: `Band ${meta.roman} · ${meta.title} — ${bandLayers(meta.id).reduce((n, c) => n + c.tools.length, 0)} tools for when it is ${meta.sounds}`,
  };
}

export default async function Image({ params }: BandRouteParams) {
  const { band } = await params;
  const meta = bandMeta(band as Band);
  if (!meta) return new Response("Not found", { status: 404 });

  const layers = bandLayers(meta.id);
  const tools = layers.reduce((n, c) => n + c.tools.length, 0);

  return new ImageResponse(
    (
      <OgCard
        // Not `plain`, unlike `/roles` and `/all`: a band *is* a set of layers,
        // contiguous in the ramp, so the strata rail is meaningful here — it is
        // the one page where "which depths does this cover" is the question.
        eyebrow={`Band ${meta.roman}`}
        title={`When it fails, it fails like “${meta.sounds}”.`}
        subtitle={layers.map((c) => c.title).join(" · ")}
        meta={`${tools} tools · layers ${meta.layers.join(", ")}`}
        // The band's own colour rather than a single layer's: the layers it owns
        // share a band, so a representative layer would still be arbitrary.
        // The band's *shallowest* layer, which `OgCard` resolves to the band
        // tint from. Every layer the band owns shares that tint by
        // construction, so this is not an arbitrary pick among them — and it
        // keeps the badge and the strata rail consistent with a section card.
        layer={meta.layers[0]}
        footNote={meta.title}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}