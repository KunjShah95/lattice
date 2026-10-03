import { ImageResponse } from "next/og";
import { glossary, getGlossaryTerm } from "@/lib/glossary";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Glossary term";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Glossary"
        title={term.term}
        subtitle={term.definition}
        meta={`${glossary.length} terms defined`}
        layer={term.layer}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}