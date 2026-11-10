import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "AI infrastructure from zero: a nine-lesson path";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for the beginner start path.
 *
 * `variant="plain"` and `layer={null}`: the page is a path across layers, not
 * an entry in one, same reasoning as `/submit` and `/review`.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Start here"
        title="AI infrastructure from zero."
        subtitle="Nine short lessons, one for each layer of the stack, in the order you will need them. What it is, one thing to try, and when to leave it alone."
        meta="9 lessons · then one working app in 5 steps"
        layer={null}
        footNote="For first-timers"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
