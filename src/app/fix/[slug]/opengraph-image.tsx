import { ImageResponse } from "next/og";
import { AS_OF } from "@/lib/attributes";
import { BANDS } from "@/lib/layer";
import { getSymptom, resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { OG_FONTS, OG_SIZE, OgCard } from "@/lib/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * Cover image for a symptom page.
 *
 * These pages declared `twitter: { card: "summary_large_image" }` with no
 * image behind it, so every share of "why is my LLM app slow" — the query this
 * route exists to answer, and the one a reader pastes into a channel rather
 * than a browser — rendered as a bare text card. The same defect the tool and
 * alternatives cards were added for, on the segment added after them.
 *
 * `generateStaticParams` mirrors the page's, so a symptom can never gain a page
 * without a card or the reverse.
 */
export function generateStaticParams() {
  return resolvedSymptoms.map((s) => ({ slug: s.slug }));
}

/** Typed explicitly: the generated route map has no entry for metadata routes. */
type FixRouteParams = { params: Promise<{ slug: string }> };

/**
 * The first sentence of the short answer.
 *
 * A card subtitle is two lines. The full answer is 40–75 words, so it truncates
 * mid-clause and ends in an ellipsis — which reads as a broken render rather
 * than as brevity. The first sentence stands on its own; the rest is the
 * elaboration the page is one click away for.
 */
function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return (m?.[0] ?? text).trim();
}

export async function generateMetadata({ params }: FixRouteParams) {
  const { slug } = await params;
  const s = getSymptom(slug);
  if (!s) return { alt: "Symptom checklist" };
  return { alt: `${s.title} — ${s.checks.length} checks, layer by layer` };
}

export default async function Image({ params }: FixRouteParams) {
  const { slug } = await params;
  const s = getSymptom(slug);
  if (!s) return new Response("Not found", { status: 404 });

  const band = BANDS.find((b) => b.id === s.band);

  // The first check is the one worth sharing. A symptom card that led with the
  // layer count would be a number nobody asked for; led with the first move, it
  // is the reason a reader clicks — and every vendor card for this query leads
  // with their own product name instead.
  const first = s.checks[0];

  return new ImageResponse(
    (
      <OgCard
        // `section` rather than `plain`: a symptom *does* have a depth, and
        // `band.layers[0]` is the layer the band starts at, which is what the
        // strata rail needs to mark one.
        variant="section"
        eyebrow={band ? `Band ${band.roman} · ${band.title}` : "Symptom"}
        title={s.title}
        // The answer runs 40-75 words by design (it is the meta description length)
        // and `clamp` cuts at 128, which lands most of them mid-sentence. The
        // first sentence is the whole answer; the rest is elaboration the page
        // exists to give. Same approach as compare/[slug]/opengraph-image.tsx.
        subtitle={firstSentence(s.answer)}
        meta={`${s.checks.length} checks · ${first ? first.check : ""}`}
        layer={band?.layers[0] ?? null}
        footNote={`Verified ${AS_OF}`}
        siteName={site.name}
        siteHost={site.url.replace(/^https?:\/\//, "")}
      />
    ),
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}