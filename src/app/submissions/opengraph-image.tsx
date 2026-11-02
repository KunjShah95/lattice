import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Accepted submissions: tools readers suggested that cleared the review bar";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Submissions"
        title="Accepted submissions, credited."
        subtitle="Every tool here arrived through a reader's submission issue and cleared the review bar, with credit to the submitter."
        meta="Submissions · Credit · Review"
        layer={null}
        footNote="Reviewed by a person"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}