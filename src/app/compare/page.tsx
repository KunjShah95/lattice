import type { Metadata } from "next";
import Link from "next/link";
import { layerStyle } from "@/lib/layer";
import { resolvedComparisons, type ResolvedComparison } from "@/lib/comparisons";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "AI tool comparisons",
  description:
    "Head-to-head comparisons of genuine substitutes, and cross-layer comparisons no vendor publishes — gateway vs evals, retrieval vs fine-tuning — each ending in a recommendation.",
  alternates: { canonical: "/compare" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/compare") },
};

const substitutes = resolvedComparisons.filter((c) => c.kind === "substitutes");
const crossLayer = resolvedComparisons.filter((c) => c.kind === "cross-layer");

export default function CompareIndexPage() {
  const pageUrl = `${site.url}/compare`;
  const name = "Comparisons";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* The comparisons as an ItemList, with each one described by its verdict
          rather than its intro. The verdict is the answer — it is what the page
          exists to give — and on the page itself it is further down, after the
          case for both sides. A crawler reading only this list gets the
          conclusion. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name,
              description: metadata.description as string,
              listId: "comparisons",
              crumbs: indexCrumbs("Comparisons", "/compare"),
              items: resolvedComparisons.map((c) => ({
                name: c.title,
                description: c.verdict,
                url: absolute(`/compare/${c.slug}`),
              })),
            }),
          ),
        }}
      />

      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {resolvedComparisons.length} comparisons
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          When the list is not the answer.
        </h1>
        <p className="mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          A directory can tell you what exists. It cannot tell you which of two
          things to pick. These comparisons cover tools that are genuine
          substitutes for one another, and end with a recommendation rather
          than a feature grid.
        </p>
      </header>

      <ComparisonGroup
        title="Across layers"
        dek="Tools in different layers that compete for the same week of work. No vendor publishes these, because no vendor sells every column. Each ends in an order of adoption, not a winner."
        items={crossLayer}
      />

      <ComparisonGroup
        title="Substitutes"
        dek="Tools that do the same job. Pick one."
        items={substitutes}
      />
    </div>
  );
}

function ComparisonGroup({
  title,
  dek,
  items,
}: {
  title: string;
  dek: string;
  items: ResolvedComparison[];
}) {
  if (!items.length) return null;
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
        {title} · {items.length}
      </h2>
      <p className="mt-2 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
        {dek}
      </p>
      <ol className="mt-6 space-y-px">
        {items.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/compare/${c.slug}`}
              className="group -mx-2 flex gap-4 rounded-md px-2 py-5 transition-colors hover:bg-bg-sunken"
            >
              {/* One segment per distinct layer, top to bottom in stack order,
                  so a cross-layer entry shows its span at a glance. */}
              <span aria-hidden="true" className="mt-1.5 flex h-8 w-[3px] shrink-0 flex-col gap-px">
                {[...new Set(c.tools.map((t) => t.layer))].map((layer) => (
                  <span key={layer ?? "none"} className="flex-1 rounded-full" style={layerStyle(layer)} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <h3 className="text-balance font-serif text-[19px] font-medium tracking-[-0.01em] group-hover:text-accent">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {c.description}
                </p>
                <span className="mt-2 font-mono text-[11px] text-fg-subtle">
                  {c.tools.map((t) => t.name).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
