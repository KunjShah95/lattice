import type { Metadata } from "next";
import Link from "next/link";
import { ToolExplorer } from "@/components/tool-explorer";
import { allToolEntries, kinds, licenses, selfHostedCount, toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export const metadata: Metadata = {
  title: "All AI infrastructure tools",
  description:
    `Every AI stack tool in the ${site.name} index — ${toolCount} tools ` +
    `across ${kinds.length} kinds, filterable by section, deployment model, kind and cost.`,
  alternates: { canonical: "/all" },
  // Next does not derive `og:url` from the canonical, and an inherited one
  // points at the home page. See `absolute()` in lib/seo.ts.
  openGraph: { url: absolute("/all") },
};

const permissive = licenses.filter((l) =>
  /MIT|Apache|BSD|PostgreSQL|CDLA|^ISC$/i.test(l.value),
).reduce((n, l) => n + l.count, 0);

export default function AllToolsPage() {
  const pageUrl = `${site.url}/all`;
  const name = "All AI infrastructure tools";

  return (
    <div className="page-shell pt-14 sm:pt-20">
      {/* Every tool in the index, as an ItemList. This is the one page that
          lists all 112 and the only parent of every tool page, so without it the
          complete set is described nowhere in structured data — a crawler sees
          112 links it has to follow rather than 112 entries it can read.
          `blurb` is the description, same field the section pages use. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              faq: PAGE_GUIDANCE.all.answers,
              name,
              description: metadata.description as string,
              listId: "tools",
              crumbs: indexCrumbs("All tools", "/all"),
              items: allToolEntries.map((t) => ({
                name: t.name,
                description: t.blurb,
                url: absolute(`/${t.categorySlug}/${t.slug}`),
              })),
            }),
          ),
        }}
      />

      <header className="pb-8 pt-14 sm:pt-20">
        <p className="t-label">The whole index</p>
        <h1 className="t-h1 mt-3">Every tool, filterable.</h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          The whole index in one list. Use it when you know what you are looking
          for; use the{" "}
          <Link
            href="/"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            stack diagram
          </Link>{" "}
          when you do not.
        </p>

        {/* Three figures, set as figures rather than as a sentence. The old
            header ran them together in one mono line, which made the only
            quantitative claim on the page read as a caption. */}
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-border py-4">
          {[
            { n: toolCount, label: "tools" },
            { n: selfHostedCount, label: "self-hosted" },
            { n: permissive, label: "permissively licensed" },
          ].map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-mono text-[28px] leading-none tracking-[-0.02em] tabular-nums">
                {s.n}
              </dd>
              <dd className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-subtle">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <ToolExplorer tools={allToolEntries} />
      <div className="pb-16">
        <PageGuidance url={pageUrl} rules={PAGE_GUIDANCE.all.rules} answers={PAGE_GUIDANCE.all.answers} />
      </div>
    </div>
  );
}
