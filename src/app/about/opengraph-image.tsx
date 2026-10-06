import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "About — what Lattice is, who maintains the index, and how entries are chosen";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the about page.
 *
 * `variant="plain"` and `layer={null}` because this page is about the index
 * rather than an entry in it — the same framing as `/methodology` and `/submit`.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="About"
        title="What this index is, and who keeps it."
        subtitle="Who maintains the entries, how tools are chosen and checked, and where to read the methodology and corrections log."
        meta="Maintainer · Selection · Corrections"
        layer={null}
        footNote="Curated, not comprehensive"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
