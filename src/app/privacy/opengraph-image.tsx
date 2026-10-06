import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "Privacy policy — what Lattice collects when you browse, and how to contact the maintainer";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the privacy policy.
 *
 * `variant="plain"` and `layer={null}` because this page is operator-facing
 * trust material rather than an entry in the stack index.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Privacy"
        title="What this site collects, and why."
        subtitle="Analytics, third-party badges, and how to reach the maintainer if you want data removed or have a question about tracking."
        meta="Analytics · Badges · Contact"
        layer={null}
        footNote="No accounts · no checkout on this site"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
