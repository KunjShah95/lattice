import type { Metadata } from "next";
import Link from "next/link";
import { BANDS, bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

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
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {resolvedSymptoms.length} symptoms
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Start from what is wrong.
        </h1>
        <p className="mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
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
          <section key={band.id} className="mt-12 border-t border-border pt-8">
            <h2 className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bandColor(band.id) }} />
              Band {band.roman} · {band.title} · &ldquo;{band.sounds}&rdquo;
            </h2>
            <ul className="mt-5 space-y-px">
              {items.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/fix/${s.slug}`}
                    className="group -mx-2 block rounded-md px-2 py-4 transition-colors hover:bg-bg-sunken"
                  >
                    <h3 className="text-balance font-serif text-[20px] font-medium tracking-[-0.01em] group-hover:text-accent">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg-muted">
                      {s.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
