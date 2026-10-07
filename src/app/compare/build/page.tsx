import type { Metadata } from "next";
import Link from "next/link";
import { CompareBuilder } from "@/components/compare-builder";
import { allTools } from "@/lib/data";
import type { CompareTool } from "@/lib/compare-table";
import { roleTitle } from "@/lib/roles";
import { toJsonLd } from "@/lib/jsonld";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Compare any AI infrastructure tools side by side",
  description:
    "Pick up to three tools from any layers of the stack and see where they differ — licence, deployment, cost, and when each is the wrong choice. No winner is declared.",
  alternates: { canonical: "/compare/build" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/compare/build") },
};

/**
 * The whole dataset as the builder's pool, flattened to scalars.
 *
 * Built here, on the server, and handed over as plain data: the client never
 * imports `data.ts`, which would ship the dataset's code to the browser. The shape
 * is `CompareTool` from `lib/compare-table`, the same type the tested logic takes.
 */
const pool: CompareTool[] = allTools.map((t) => ({
  id: `${t.category.slug}/${t.slug}`,
  name: t.name,
  categorySlug: t.category.slug,
  categoryShort: t.category.short,
  layer: t.category.layer,
  kind: t.kind,
  deployment: t.deployment,
  license: t.license,
  language: t.language,
  cost: t.cost,
  roles: t.roles.map(roleTitle),
  asOf: t.asOf,
  useWhen: t.useWhen,
  skipWhen: t.skipWhen,
}));

/**
 * /compare/build — an interactive cross-layer comparison.
 *
 * `strategy/02` §4: the surface no funded competitor can occupy is the comparison
 * across layers, because every vendor sells one of the options. The hand-written
 * `/compare/<slug>` pages cover the substitutes; this covers the pairs nobody will
 * write, including the ones that are not substitutes at all.
 *
 * `/compare/build` sits under the static `/compare` and beside the dynamic
 * `/compare/[slug]`. A static segment takes precedence over a dynamic one, the same
 * rule that lets `/all` and `/blog` coexist with `app/[slug]`. The one way that
 * breaks is a hand-written comparison whose slug is `build`: its page would be
 * silently unreachable. `compare-url.test.ts` fails the build if one is ever added.
 */
export default function CompareBuilderPage() {
  const pageUrl = `${site.url}/compare/build`;
  const name = "Compare Builder";

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* WebApplication, like `/stack-builder`: a thing a reader operates, not a
          list of pages. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebApplication",
                "@id": pageUrl,
                url: pageUrl,
                name,
                description: metadata.description as string,
                applicationCategory: "UtilitiesApplication",
                operatingSystem: "Any",
                isAccessibleForFree: true,
                browserRequirements: "Requires JavaScript",
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                publisher: { "@id": ids.organization },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Comparisons", path: "/compare" },
                { name, path: "/compare/build" },
              ]),
            ),
          ),
        }}
      />

      <header>
        <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
          <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            <li>
              <Link href="/" className="transition-colors hover:text-fg-muted">
                Index
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/compare" className="transition-colors hover:text-fg-muted">
                Comparisons
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg-muted">Build your own</li>
          </ol>
        </nav>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          Pick any three
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Compare tools that were never meant to be compared.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The written comparisons cover tools that do the same job. This one takes any
          tools from any layers, shows where they differ, and says so when they are not
          substitutes. Vendors do not publish this page, because each of them sells one
          of the columns.
        </p>
      </header>

      <div className="mt-8">
        <CompareBuilder tools={pool} />
      </div>
    </div>
  );
}
