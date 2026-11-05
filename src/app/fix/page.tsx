import type { Metadata } from "next";
import Link from "next/link";
import { BANDS, bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export const metadata: Metadata = {
  title: "Fix an AI system by symptom",
  description:
    "Start from what is wrong, not from a tool category: slow, expensive, wrong answers, unreliable agents. Each symptom gets an ordered, layer-by-layer checklist.",
  alternates: { canonical: "/fix" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/fix") },
};

/** Symptoms grouped under the band whose failure they sound like. */
export default function FixIndexPage() {
  const pageUrl = `${site.url}/fix`;
  const name = "Fix a symptom";

  return (
    <div className="page-shell pt-14 sm:pt-20">
      {/* The symptoms as an ItemList. These five pages are the ones phrased the
          way people actually type — "why is my LLM app slow" — and each carries
          HowTo + FAQPage. This index is their only parent, and it described none
          of them. `description` is the symptom's own summary, the same line the
          page leads with. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name,
              description: metadata.description as string,
              listId: "symptoms",
              crumbs: indexCrumbs("Fix a symptom", "/fix"),
              items: resolvedSymptoms.map((s) => ({
                name: s.title,
                description: s.description,
                url: absolute(`/fix/${s.slug}`),
              })),
            }),
          ),
        }}
      />

      <header>
        <p className="t-label">
          {resolvedSymptoms.length} symptoms
        </p>
        <h1 className="mt-4 t-h1">
          Start from what is wrong.
        </h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          Nobody opens a directory because they want a vector database. They
          open it because answers are wrong, or slow, or the bill doubled. Pick
          the symptom; each one is an ordered checklist through the stack,
          cheapest check first, with the tools worth reaching for at each step
          and when to skip them.
        </p>
      </header>

      {BANDS.map((band) => {
        const items = resolvedSymptoms.filter((s) => s.band === band.id);
        if (!items.length) return null;
        return (
          <section key={band.id} className="mt-16 border-t border-border pt-10">
            <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-[var(--r-pill)]"
                style={{ backgroundColor: bandColor(band.id) }}
              />
              <span>
                Band {band.roman} · {band.title}
              </span>
              <span className="font-normal text-fg-muted">— “{band.sounds}”</span>
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {items.map((s) => (
                <li key={s.slug} className="h-full">
                  <Link
                    href={`/fix/${s.slug}`}
                    className="group card flex h-full flex-col p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
                  >
                    <h3 className="text-[19px] font-medium leading-snug tracking-[-0.012em] transition-colors group-hover:text-accent">
                      {s.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-fg-muted">
                      {s.description}
                    </p>
                    <span className="mt-auto flex items-center justify-between gap-3 pt-4 font-mono text-[12.5px] text-fg-subtle">
                      <span>{s.checks.length} checks</span>
                      <span aria-hidden="true" className="nudge text-fg-muted">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <div className="pb-16">
        <PageGuidance rules={PAGE_GUIDANCE.fixIndex.rules} answers={PAGE_GUIDANCE.fixIndex.answers} />
      </div>
    </div>
  );
}
