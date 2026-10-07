import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt =
  "Contact — how to reach the maintainers, report corrections, or suggest a tool";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the contact page.
 *
 * `variant="plain"` and `layer={null}` because this page belongs to no layer —
 * it is operator-facing trust material rather than an entry in the index.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Contact"
        title="How to reach the maintainers."
        subtitle="Email, social, and where to report a broken link, challenge an inclusion, or suggest a tool for the index."
        meta="Corrections · Submissions · Operator"
        layer={null}
        footNote={site.contact.email}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
