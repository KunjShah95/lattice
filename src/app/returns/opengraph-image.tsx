import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "Returns and refunds — whether Lattice sells on this site, and where to ask about third-party charges";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the returns policy.
 *
 * `variant="plain"` and `layer={null}` because this page clarifies what the
 * index does and does not sell — trust material, not a stack entry.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Returns"
        title="Refunds and what this site sells."
        subtitle="Lattice is a free index — nothing on this domain is a purchase. If you paid a vendor listed here, that relationship is with them, not with the index."
        meta="No checkout · Third-party vendors · Contact"
        layer={null}
        footNote="Index only · not a store"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
