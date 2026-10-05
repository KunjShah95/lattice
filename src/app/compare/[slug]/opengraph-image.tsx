import { ImageResponse } from "next/og";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Comparison cover";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Prerendered at build time, mirroring the page's own params. On the Worker
 * there is no filesystem behind `process.cwd()`, so the font reads in
 * lib/og.tsx fail and an on-demand render returns a 500 — which is what every
 * card in this segment did in production before this existed.
 */
export function generateStaticParams() {
  return resolvedComparisons.map((c) => ({ slug: c.slug }));
}

/**
 * The verdict is a full paragraph, which is the wrong shape for a card: at
 * 1200x630 it runs six lines and unbalances the whole layout. Take the first
 * sentence and cap it, so every comparison card composes the same way.
 */
function shortVerdict(verdict: string): string {
  const firstSentence = verdict.split(/(?<=\.)\s/)[0] ?? verdict;
  const capped =
    firstSentence.length > 190
      ? `${firstSentence.slice(0, 187).replace(/[\s,;:—-]+$/, "")}…`
      : firstSentence;
  return capped;
}

/** Cover image for a head-to-head comparison. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = resolvedComparisons.find((c) => c.slug === slug);
  if (!comparison) return new Response("Not found", { status: 404 });

  // The tool names, which is the query. "pgvector vs Qdrant vs Pinecone" is
  // what somebody pastes into a channel; the count is not.
  const field = comparison.tools.map((t) => t.name).join(" · ");

  return new ImageResponse(
    (
      <OgCard
        variant="plain"
        eyebrow={`Comparison · ${comparison.tools.length} tools`}
        title={comparison.title}
        subtitle={shortVerdict(comparison.verdict)}
        meta={field}
        footNote="Recommendation, not a scoreboard"
        layer={comparison.tools[0]?.layer ?? null}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
