import { ImageResponse } from "next/og";
import { categories, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { site } from "@/lib/site";
import { OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Lattice — the layers behind working AI systems";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for the home page. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="A curated index"
        title="The layers behind working AI systems."
        subtitle={`${toolCount} tools across ${categories.length} sections, ordered by where they sit in a real system — with ${posts.length} essays on the decisions behind them.`}
        meta="Inference · Routing · Retrieval · Evals"
        layer={null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    OG_SIZE,
  );
}
