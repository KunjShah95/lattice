import { ImageResponse } from "next/og";
import { corrections } from "@/content/corrections.generated";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `Corrections — ${corrections.length} changes to the entries, generated from the commit log`;

export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the corrections log.
 *
 * `variant="plain"` like `/methodology` and `/submit`: this page is *about* the
 * index's record rather than an entry in it, so a strata rail would assert a
 * position in the stack that the page does not have.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Corrections"
        title="What this index has got wrong."
        subtitle="Every change to the entries, in order, generated from the commit log rather than kept by hand. An index that says it wants to be corrected and then shows no corrections has told you nothing."
        meta={`${corrections.length} changes · generated, not maintained`}
        layer={null}
        footNote="A changelog can be edited · the build cannot"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}