import { ImageResponse } from "next/og";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `Essays — ${posts.length} notes on the decisions behind production AI systems`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for the essay index. `plain`: an essay can argue from any layer. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Essays"
        title={`${posts.length} arguments, not ${posts.length} summaries.`}
        subtitle="What each decision costs, what it forecloses, and the condition under which you would reverse it — written for people already holding the other trade-off."
        meta="Runtimes · Gateways · Evals · Cost"
        layer={null}
        footNote="No launch announcements"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}