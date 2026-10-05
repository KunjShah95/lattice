import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "Submit a tool — every submission is reviewed by a person before it becomes an entry";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the submission page.
 *
 * `variant="plain"` and `layer={null}` because this page belongs to no layer —
 * it is about the index rather than an entry in it, the same reason the
 * methodology card drops its layer framing.
 *
 * The subtitle carries the one claim that matters when this page is shared:
 * a submission is reviewed, not auto-published. A card that said only "submit a
 * tool" would be the sort of thing that circulates and quietly contradicts
 * `/methodology` §01.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Submit"
        title="Suggest a tool for the index."
        subtitle="A maintainer reviews every submission and decides whether it becomes an entry. The bar is published, and most submissions are declined."
        meta="Submission · Review · Rejection reasons"
        layer={null}
        footNote="Reviewed by a person"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}