import { ImageResponse } from "next/og";
import { getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard, bandLabel } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Section cover";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for a stack layer, generated on demand. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return new Response("Not found", { status: 404 });

  // The eyebrow carries the band, because the badge already carries the depth
  // and the strata rail already carries the position. Three different facts,
  // stated once each — the previous pass said "LAYER 03" in both the eyebrow
  // and the masthead, which told the reader nothing and used the most
  // prominent line on the card to do it.
  const eyebrow = bandLabel(category.layer);

  return new ImageResponse(
    (
      <OgCard
        variant="section"
        eyebrow={eyebrow}
        title={category.title}
        subtitle={category.responsibility}
        // The count is a scale signal, not a claim, so it goes on the right of
        // the footer rather than into the title block. Nothing on this site
        // leads with a tool count — that is the category's opening move and it
        // is the reason the index reads as small.
        meta={`${category.tools.length} tools`}
        layer={category.layer}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}