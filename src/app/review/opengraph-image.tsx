import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "A second opinion on your AI stack, written by the engineer who mapped the index";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the stack-review offer page.
 *
 * `variant="plain"` and `layer={null}` for the same reason as `/submit`'s:
 * this page is about getting judgement on a reader's system, not an entry in
 * the index, so it carries no layer framing.
 *
 * The subtitle states the one line that has to survive a share: free, and
 * never a ranking change. A card that only said "get a review" invites the
 * "what's the catch" reply this page exists to pre-empt.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Stack review"
        title="A second opinion on your AI stack."
        subtitle="A written, layer-by-layer review: what to keep, what to swap, what it costs, where it breaks. Free, and it never changes where a tool sits in the index."
        meta="Free · 5 working days · No ranking changes"
        layer={null}
        footNote="Written by the maintainer"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
