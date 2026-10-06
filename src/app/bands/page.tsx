import type { Metadata } from "next";
import Link from "next/link";
import { BANDS, bandColor, bandLayers } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

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
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* The bands as an ItemList. Each is a collection with its own page, so
          this is the only parent they have — and without it they are prose to a
          crawler. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {BANDS.length} bands · {BANDS.reduce((n, b) => n + b.layers.length, 0)} layers
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Nine layers, three bands.
        </h1>
        <p className="mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The layers are ordered because they are a dependency chain — you cannot
          tune weights before you serve them. But a reader rarely arrives with a
          layer in mind; they arrive with a symptom. And almost every production
          problem lives in one of these three places.
        </p>
      </header>

      <ul className="mt-10 space-y-px">
        {BANDS.map((band) => {
          const layers = bandLayers(band.id);
          const tools = layers.reduce((n, c) => n + c.tools.length, 0);
          const symptoms = resolvedSymptoms.filter((s) => s.band === band.id);
          return (
            <li key={band.id}>
              <Link
                href={`/bands/${band.id}`}
                className="group -mx-2 block rounded-md px-2 py-5 transition-colors hover:bg-bg-sunken"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em] group-hover:text-accent">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: bandColor(band.id) }}
                    />
                    Band {band.roman} · {band.title}
                  </h2>
                  <span className="font-mono text-[11px] text-fg-subtle">
                    {tools} tools · layers {band.layers.join(", ")}
                  </span>
                </div>
                <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg">
                  Failure sounds like{" "}
                  <em className="text-fg not-italic">“{band.sounds}”</em>
                </p>
                <p className="mt-1 text-[13px] text-fg-subtle">
                  {layers.map((c) => c.short).join(" · ")}
                  {symptoms.length ? ` · ${symptoms.length} symptom guides` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 border-t border-border pt-6 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
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
    </div>
  );
}