import type { Metadata } from "next";
import Link from "next/link";
import { Byline } from "@/components/byline";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FreshnessMeter } from "@/components/ui/freshness";
import { ToolChip } from "@/components/ui/tool-chip";
import { allTools, STALE_AFTER_MONTHS, toolCount } from "@/lib/data";
import { freshnessOf } from "@/lib/freshness";
import { toJsonLd } from "@/lib/jsonld";
import {
  absolute,
  breadcrumbNode,
  credit,
  graph,
  ids,
  indexCrumbs,
} from "@/lib/seo";
import { site } from "@/lib/site";
import { buildVerificationReport, groupByCheck } from "@/lib/verification";

export const metadata: Metadata = {
  title: "Freshness ledger — what the build refuses to ship stale",
  description:
    "Licence, cost and deployment data older than six months fails the build. Every entry's check date, how much of its window is left, and the month it expires.",
  alternates: { canonical: "/verification" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/verification") },
};

/**
 * The build date, fixed once. This page and `/verification.json` describe the
 * same instant — the one the guard in `data.ts` actually ran — so both read the
 * clock at build time and neither at request time.
 */
const BUILT_AT = new Date();

/**
 * The human view of `/verification.json`.
 *
 * ## Why this page exists
 *
 * `strategy/02` §3 names the staleness guard the strongest true claim the site
 * can make, and the biggest gap between what it is and what it shows. The JSON
 * receipt is the proof; a machine can audit it and a reader will not. This is the
 * same data with the argument attached: what the rule is, how much of each
 * entry's life is left, and when the next forced re-check lands.
 *
 * ## Why grouped, and why no count in the headline
 *
 * Almost every entry shares one check month, so a table of 112 rows is 112 copies
 * of one fact. Grouping shows the distribution — how much goes stale at once —
 * which is the thing a sceptical reader wants to know. And the headline leads with
 * the claim, not a tool count: `strategy/02` §"What to refuse" lists a hero stat
 * as the opening move that makes a directory read as small.
 *
 * ## What it is not
 *
 * Not a claim that the facts are right. The guard enforces that someone *looked*
 * recently, not that they saw correctly; `/methodology` says so under "where this
 * is wrong", and this page links there rather than restating it where it could
 * drift.
 */
export default function VerificationPage() {
  const pageUrl = `${site.url}/verification`;
  const report = buildVerificationReport(BUILT_AT);
  const groups = groupByCheck(report.entries);
  const byName = new Map(allTools.map((t) => [t.name, t]));

  const summary: Array<[string, string]> = [
    ["Gate", report.status === "pass" ? "passed" : "failed"],
    ["Build ran", report.generatedAt],
    ["Window", `${report.rule.staleAfterMonths} months`],
    ["Oldest accepted check", report.rule.cutoff],
    ["Next forced re-check", report.nextRecheckBy],
    ["Re-checked on their own", `${report.perToolChecked} of ${report.toolCount}`],
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: "Freshness ledger",
                description: metadata.description as string,
                ...credit(),
                isPartOf: { "@id": ids.website },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, indexCrumbs("Freshness ledger", "/verification")),
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
            <li className="text-fg-muted">Freshness ledger</li>
          </ol>
        </nav>

        <Eyebrow className="mt-6 tracking-[0.16em]">Build gate · receipt</Eyebrow>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          The build refuses stale facts.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          Licence, cost and deployment data last confirmed more than{" "}
          {STALE_AFTER_MONTHS} months ago throws an error and stops the deploy. Not
          a warning, not a review task. A deployed copy of this page is therefore a
          receipt for a check that ran; the same data is machine-readable at{" "}
          <Link
            href="/verification.json"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            /verification.json
          </Link>
          .
        </p>
        <Byline fact="Build gate last ran" date={report.generatedAt} />
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        {summary.map(([label, value]) => (
          <div key={label} className="bg-bg-elevated p-3.5">
            <dt>
              <Eyebrow as="span" size="xs">
                {label}
              </Eyebrow>
            </dt>
            <dd className="mt-1.5 font-serif text-[20px] leading-tight tracking-[-0.01em]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-12">
        <Eyebrow as="h2">Soonest to expire first</Eyebrow>
        <p className="editorial-justify mt-3 max-w-[60ch] text-pretty text-[13.5px] leading-relaxed text-fg-muted">
          Each cell is one month the build still accepts the entry; the meter drains
          as it ages. An entry is refused the month after its last full cell.
        </p>

        <ol className="mt-6 space-y-8">
          {groups.map((g) => {
            const f = freshnessOf(g.asOf, BUILT_AT, STALE_AFTER_MONTHS);
            const own = g.perTool;
            return (
              <li key={g.asOf} className="border-t border-border pt-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h3 className="font-serif text-[20px] font-medium tracking-[-0.01em]">
                    Checked <time dateTime={g.asOf}>{g.asOf}</time>
                  </h3>
                  <FreshnessMeter freshness={f} />
                  <span className="font-mono text-[11px] text-fg-subtle">
                    refused from {g.expires}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-fg-subtle">
                  {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"}
                  {" · "}
                  {own === 0
                    ? "all inherit the dataset sweep"
                    : own === g.entries.length
                      ? "each re-checked on its own"
                      : `${own} re-checked on their own, the rest inherit the sweep`}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.entries.map((e) => {
                    const tool = byName.get(e.name);
                    return (
                      <li key={e.path}>
                        <ToolChip href={e.path} layer={tool?.category.layer ?? null}>
                          {e.name}
                        </ToolChip>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <Eyebrow as="h2">How to read this</Eyebrow>
        <ul className="mt-4 space-y-3 text-pretty text-[14px] leading-relaxed text-fg-muted">
          <li className="editorial-justify">
            <span className="text-fg">It proves someone looked, not that they saw
            correctly.</span>{" "}
            The gate enforces recency. A wrong licence checked last month passes it.{" "}
            <Link
              href="/methodology"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              The method
            </Link>{" "}
            says where the index is wrong in ways a date cannot show.
          </li>
          <li className="editorial-justify">
            <span className="text-fg">Most entries share one month, on purpose.</span>{" "}
            A single dataset-wide sweep is a stronger claim than {toolCount}{" "}
            independent ones only if it is actually done; the split above shows which
            entries carry their own date and which inherit the sweep.
          </li>
          <li className="editorial-justify">
            <span className="text-fg">A changelog can be edited; a build that
            throws cannot.</span>{" "}
            The history of what changed is on{" "}
            <Link
              href="/corrections"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              Corrections
            </Link>
            . This page is the part with an enforcement mechanism behind it.
          </li>
        </ul>
      </section>
    </div>
  );
}
