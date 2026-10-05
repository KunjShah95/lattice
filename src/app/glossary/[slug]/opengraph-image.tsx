import { ImageResponse } from "next/og";
import { glossary, getGlossaryTerm } from "@/lib/glossary";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Glossary term";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Prerendered at build time, mirroring the page's own params. On the Worker
 * there is no filesystem behind `process.cwd()`, so the font reads in
 * lib/og.tsx fail and an on-demand render returns a 500 — which is what every
 * card in this segment did in production before this existed.
 */
export function generateStaticParams() {
  return glossary.map((t) => ({ slug: t.slug }));
}

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