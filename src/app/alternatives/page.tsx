import type { Metadata } from "next";
import Link from "next/link";
import { layerColor, layerStyle } from "@/lib/layer";
import { alternativesIndex } from "@/lib/alternatives";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { CtaBand } from "@/components/marketing";

/**
 * `/alternatives`the substitutes graph as one index.
 *
 * The 39 alternatives pages were each reachable from exactly one place: the
 * tool page they propose leaving. That is the right link for a reader who is
 * already on the tool, and useless to the reader who has decided to leave
 * something but has not yet picked a category to be disappointed in.
 *
 * Grouped by section rather than alphabetically because the section is the
 * constraint: a reader leaving a vector store is not in the market for an
 * inference engine, and an A–Z list would suggest otherwise.
 */

const sections = alternativesIndex();
const pages = sections.reduce((n, s) => n + s.entries.length, 0);

export const metadata: Metadata = {
  title: "Alternatives to AI infrastructure tools",
  description:
    `${pages} pages answering "what do I use instead of X", grouped by the layer you ` +
    `are leaving. Each names the real swaps, the adjacent tools that are not swaps, ` +
    `and skips the pretence of a winner.`,
  alternates: { canonical: "/alternatives" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/alternatives") },
};

export default function AlternativesIndexPage() {
  const pageUrl = `${site.url}/alternatives`;
  const name = "Alternatives";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-2 sm:px-6 sm:pt-4">
      {/* The pages as an ItemList. Each entry is described by what it contains
          (a substitute count and where the substitutes sit), not by the tool's
          own blurb: a crawler reading only this list should learn the shape of
          the answer, not what the tool is. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name,
              description: metadata.description as string,
              listId: "alternatives",
              crumbs: indexCrumbs("Alternatives", "/alternatives"),
              items: sections.flatMap(({ category, entries }) =>
                entries.map(({ tool, substitutes }) => ({
                  name: `${tool.name} alternatives`,
                  description: `${substitutes.length} recorded substitutes for ${tool.name}, compared on layer, deployment and licence.`,
                  url: absolute(`/${category.slug}/${tool.slug}/alternatives`),
                })),
              ),
            }),
          ),
        }}
      />

      <header className="hero-head">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted hero-pill">
          {pages} pages · {sections.length} layers
        </p>
        <h1 className="mt-4 text-balance font-display font-medium text-[34px] leading-[1.06] tracking-[-0.025em] sm:text-[48px]">
          What to use instead.
        </h1>
        <p className="editorial-justify mt-4 max-w-[62ch] text-pretty text-[16px] sm:text-[17px] leading-relaxed text-fg-muted">
          Leaving something is a decision, and it is the one a vendor cannot help
          with: nobody publishes an honest alternatives page for a competitor.
          These pages do, for every tool with enough of a substitutes graph to
          answer the question. Grouped by the layer you are leaving, because that
          is the constraint you already have.
        </p>
      </header>

      {sections.map(({ category, entries }) => (
        <section
          key={category.slug}
          className="mt-12 border-t border-border pt-8"
          style={{ "--wash": layerColor(category.layer) } as React.CSSProperties}
        >
          <h2 className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={layerStyle(category.layer)}
            />
            Layer {category.index} · {category.title} · {entries.length}
          </h2>

          <ul className="mt-5 space-y-px">
            {entries.map(({ tool, substitutes }) => {
              // The in-layer entries are the real answer; the rest are marked
              // adjacent on the page itself, so the index says it up front
              // rather than promising twelve swaps and delivering three.
              const inLayer = substitutes.filter((s) => s.category.layer === category.layer);
              const adjacent = substitutes.length - inLayer.length;

              return (
                <li key={tool.slug}>
                  <Link
                    href={`/${category.slug}/${tool.slug}/alternatives`}
                    className="group -mx-2 block rounded-md px-2 py-4 transition-colors hover:bg-bg-sunken"
                  >
                    <h3 className="text-balance font-display text-[19px] font-medium tracking-[-0.01em] group-hover:text-accent">
                      {tool.name} alternatives
                    </h3>
                    <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg-muted">
                      {tool.blurb}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-fg-subtle">
                      {substitutes.length} substitutes · {inLayer.length} in{" "}
                      {category.short.toLowerCase()} · {adjacent} adjacent
                    </p>
                    {inLayer.length ? (
                      <p className="mt-1 text-pretty text-[13px] leading-relaxed text-fg-muted">
                        Swap for {inLayer.map((s) => s.tool.name).join(", ")}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="editorial-justify mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-fg-subtle">
        Every graph here is bidirectional and unsponsored: a tool is listed if the
        tool being left names it, or if it names the tool being left. Where both
        sides deserve a paragraph rather than a row, the pair gets a{" "}
        <Link
          href="/compare"
          className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted"
        >
          comparison
        </Link>
        .{" "}
        <Link
          href="/methodology"
          className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted"
        >
          How this index is compiled
        </Link>{" "}
        including where it is wrong.
      </p>
      <div className="pb-4 pt-16">
        <CtaBand />
      </div>
    </div>
  );
}
