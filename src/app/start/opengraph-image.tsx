import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Your first working RAG app, in five steps";
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
        title="Your first working RAG app, in five steps."
        subtitle="For people who have never shipped one. Pick the tool at each layer, in order, and stop when you have something that answers a question."
        meta="5 steps · One model call to one working app"
        layer={null}
        footNote="For first-timers"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
