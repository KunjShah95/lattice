import { ImageResponse } from "next/og";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `Glossary — ${glossary.length} terms from production AI systems`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Cover image for the glossary index. `plain`: terms span every layer. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow="Glossary"
        title={`${glossary.length} terms, defined plainly.`}
        subtitle="Batching, the KV cache, prefix caching, reranking, hybrid search, LoRA, durable execution — what each one means in a running system, not what the paper calls it."
        meta="Serving · Retrieval · Training · Control"
        layer={null}
        footNote="Every term cites the tools it applies to"
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}