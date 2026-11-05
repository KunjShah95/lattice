import type { Metadata } from "next";
import Link from "next/link";
import { BANDS, bandColor, bandLayers, layerColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export const metadata: Metadata = {
  title: "The three bands of the stack",
  // 195 characters. The three failure phrases are the whole hook and each one
  // is a thing people search, so they are kept and the framing around them cut
  // — a description that hit the ceiling by dropping "unreliable and unmeasured"
  // would lose the band III is the interesting one.
  description:
    "Nine stack layers, three bands: compute is slow and expensive, state gives wrong answers, control is unreliable and unmeasured.",
  alternates: { canonical: "/bands" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/bands") },
};

/**
 * The three bands, as a landing page.
 *
 * ## Why this needed a route
 *
 * The bands were already load-bearing and already everywhere — the stack diagram
 * colours by them, `/fix` groups symptoms under them, the layer ramp is built
 * from them, and `layer_overlaps` reports them — but they had no URL. So the one
 * view a reader cannot reach from a link, cannot cite, and cannot send to a
 * colleague was the axis the rest of the site's vocabulary is built on.
 *
 * ## Why three and not nine
 *
 * A nine-step hue ramp is decoration; nobody holds nine colours in working
 * memory. Three families are information. Band III being five of the nine layers
 * is the honest signal that the tooling market is now concentrated in control.
 * The argument is `strategy/02-unique-selling-points.md` §5 and it is stated
 * here rather than assumed, because the collapse is a simplification and a page
 * that hid that would be the kind of page this site refuses to publish.
 */
export default function BandsIndexPage() {
  const pageUrl = `${site.url}/bands`;
  const name = "The three bands";

  return (
    <div className="page-shell pt-14 sm:pt-20">
      {/* The bands as an ItemList. Each is a collection with its own page, so
          this is the only parent they have — and without it they are prose to a
          crawler. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              faq: PAGE_GUIDANCE.bands.answers,
              name,
              description: metadata.description as string,
              listId: "bands",
              crumbs: indexCrumbs("Bands", "/bands"),
              items: BANDS.map((b) => ({
                name: `Band ${b.roman} · ${b.title}`,
                description: `Layers ${b.layers.join(" and ")}. Failure sounds like: ${b.sounds}.`,
                url: absolute(`/bands/${b.id}`),
              })),
            }),
          ),
        }}
      />

      <header>
        <p className="t-label">
          {BANDS.length} bands · {BANDS.reduce((n, b) => n + b.layers.length, 0)} layers
        </p>
        <h1 className="mt-4 t-h1">
          Nine layers, three bands.
        </h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          The layers are ordered because they are a dependency chain — you cannot
          tune weights before you serve them. But a reader rarely arrives with a
          layer in mind; they arrive with a symptom. And almost every production
          problem lives in one of these three places.
        </p>
      </header>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {BANDS.map((band) => {
          const layers = bandLayers(band.id);
          const tools = layers.reduce((n, c) => n + c.tools.length, 0);
          const symptoms = resolvedSymptoms.filter((s) => s.band === band.id);
          return (
            <li key={band.id} className="h-full">
              <Link
                href={`/bands/${band.id}`}
                className="group card flex h-full flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
              >
                {/* The band as a colour field, with its numeral. The title and
                    every fact sit below it — no text over a tint that a theme
                    change or a low-contrast display could swallow. */}
                <div
                  aria-hidden="true"
                  className="hatch hatch-span relative flex h-28 items-end justify-between px-5 pb-3"
                  style={{
                    color: bandColor(band.id),
                    backgroundColor: `color-mix(in oklab, ${bandColor(band.id)} 14%, var(--bg-elevated))`,
                    borderBottom: `2px solid ${bandColor(band.id)}`,
                  }}
                >
                  <span className="font-serif text-[40px] leading-none" style={{ color: "var(--fg)" }}>
                    {band.roman}
                  </span>
                  <span className="font-mono text-[12px] uppercase tracking-[0.08em]" style={{ color: "var(--fg-muted)" }}>
                    {band.layers.length} layers
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="t-h3">{band.title}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    Failure sounds like{" "}
                    <span className="text-fg">“{band.sounds}”</span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {layers.map((c) => (
                      <span
                        key={c.slug}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12.5px] text-fg-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: layerColor(c.layer) }}
                        />
                        {c.short}
                      </span>
                    ))}
                  </div>

                  <span className="mt-auto flex items-center justify-between gap-3 pt-5 font-mono text-[12.5px] text-fg-subtle">
                    <span>
                      {tools} tools
                      {symptoms.length ? ` · ${symptoms.length} symptoms` : ""}
                    </span>
                    <span aria-hidden="true" className="nudge text-fg-muted">→</span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="editorial-justify mt-12 border-t border-border pt-8 text-pretty text-[15px] leading-relaxed text-fg-subtle">
        The collapse is a simplification, and it hides something:{" "}
        <span className="text-fg-muted">band III is five of the nine layers</span>
        , so the band a reader is in does not tell them how much of the stack is
        involved. That is the honest shape of the data rather than a defect in it
        — the tooling market has concentrated in control — but it does mean the
        bands are a shortcut and not a taxonomy. The{" "}
        <Link
          href="/methodology"
          className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
        >
          method
        </Link>{" "}
        says where else this index is wrong.
      </p>
      <PageGuidance url={pageUrl} rules={PAGE_GUIDANCE.bands.rules} answers={PAGE_GUIDANCE.bands.answers} />
    </div>
  );
}