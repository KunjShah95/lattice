import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recommendStack, WORKLOADS, type Workload } from "@/lib/stacks";
import { encodeStackInput, stackReportJson, stackReportMarkdown } from "@/lib/stack-url";
import { CopyButton } from "@/components/copy-button";
import { site } from "@/lib/site";
import {
  absolute,
  breadcrumbNode,
  datasetModified,
  graph,
  ids,
} from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

/**
 * A static recommendation for one workload, at the default case.
 *
 * ## Why these exist
 *
 * The Stack Builder is a client-side tool. Its output — the recommendation —
 * is not indexable, not citable, and not reachable for a model that has not run
 * the questionnaire. Seven workloads, each enumerable at build time, so they
 * get prerendered pages: a reader searching "RAG application stack" lands on a
 * decision record rather than a blank form, and an agent gets the same answer
 * from `recommend_stack` on `/mcp` — the URL is the same one the page links to.
 *
 * ## The default case is stated, not assumed
 *
 * The engine's recommendation depends on the case the caller describes, and a
 * static page describes none. So it says so: the picks here are the median case
 * — 100k requests a month, no special constraints — and the page links to the
 * builder with the workload preselected so the reader can change it. Anything
 * less honest makes these pages look like answers rather than starting points.
 */

const DEFAULT_CASE = { queriesPerMonth: 100_000 } as const;

export function generateStaticParams() {
  return WORKLOADS.map((w) => ({ workload: w.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stack/[workload]">): Promise<Metadata> {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  if (!meta) return { title: "Not found" };

  return {
    title: `${meta.label} stack — what to run, and when to skip it`,
    description:
      `The default-case stack for a ${meta.label.toLowerCase()}: one pick per ` +
      `layer, each with its reason and its own skip-when, at a heuristic cost ` +
      `band. Describe your case in the Stack Builder to change the answer.`,
    alternates: { canonical: `/stack/${meta.id}` },
    openGraph: { url: absolute(`/stack/${meta.id}`) },
  };
}

export default async function StackWorkloadPage({
  params,
}: PageProps<"/stack/[workload]">) {
  const { workload } = await params;
  const meta = WORKLOADS.find((w) => w.id === workload);
  if (!meta) notFound();

  const result = recommendStack({ workload: meta.id as Workload, ...DEFAULT_CASE });
  const pageUrl = `${site.url}/stack/${meta.id}`;
  const builderPath = `/stack-builder?${encodeStackInput({ workload: meta.id as Workload, ...DEFAULT_CASE })}`;
  // Built here, at prerender, against the canonical origin — so a report
  // copied from any preview deployment still links to the real site.
  const reportSource = { origin: site.url, caseUrl: `${site.url}${builderPath}` };

  const fitClass = (fit: string) =>
    fit === "Best fit"
      ? "text-fg"
      : fit === "Strong fit"
        ? "text-fg-muted"
        : "text-fg-subtle";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                // WebPage about a composition of SoftwareApplications, rather
                // than CollectionPage: it is a decision record for one workload,
                // not a list of its own children.
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: `${meta.label} stack`,
                description: `Default-case stack recommendation for a ${meta.label.toLowerCase()}.`,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: meta.label, path: `/stack/${meta.id}` },
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
              <Link
                href="/stack-builder"
                className="transition-colors hover:text-fg-muted"
              >
                Stack Builder
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-fg-muted">{meta.label}</li>
          </ol>
        </nav>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {meta.detail}
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          A {meta.label.toLowerCase()} stack.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          {result.summary}. At the default case — 100k requests a month, no
          further constraints — drawn from the 112 tools already in the index.
          Each pick is a tool whose own skip-when is stated, because a stack
          built on tools it does not know how to overcommit to is a guess.
        </p>
        <p className="editorial-justify mt-3 max-w-[58ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
          This is the default case, stated as such.{" "}
          <Link
            href={builderPath}
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            Describe your case
          </Link>{" "}
          to change it — the recommendation recomputes, and anything it assumes
          comes back in the answer rather than staying silent.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <CopyButton
            text={stackReportMarkdown(result, reportSource)}
            label="Copy decision report"
            copiedLabel="Report copied"
          />
          <CopyButton
            text={stackReportJson(result, reportSource)}
            label="Copy JSON"
            copiedLabel="JSON copied"
          />
        </div>
      </header>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The picks
        </h2>
        <ul className="mt-5 space-y-6">
          {result.picks.map((p) => (
            <li key={p.sectionSlug}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-balance font-serif text-[20px] font-medium tracking-[-0.01em]">
                  <Link
                    href={p.url}
                    className="transition-colors hover:text-accent"
                  >
                    {p.section} — {p.tool}
                  </Link>
                </h3>
                <span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${fitClass(p.fitLabel)}`}>
                  {p.fitLabel}
                </span>
              </div>
              {p.matches.length ? (
                <p className="mt-1 font-mono text-[11px] text-fg-subtle">
                  {p.matches.join(" · ")}
                </p>
              ) : null}
              <p className="editorial-justify mt-2 text-pretty text-[14px] leading-relaxed text-fg-muted">
                {p.why}
              </p>
              <p className="editorial-justify mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
                <span className="text-fg-muted">Watch out: </span>
                {p.watchOut}
              </p>
              {p.alternative !== "—" && p.switchWhen ? (
                <p className="editorial-justify mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
                  <span className="text-fg-subtle">Consider </span>
                  {p.alternative}
                  <span className="text-fg-subtle"> instead when </span>
                  {p.switchWhen}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The costs and the risks
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-4 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Estimated cost
            </dt>
            <dd className="mt-1 text-pretty leading-relaxed text-fg-muted">
              ${result.costLow}–${result.costHigh} per month — a heuristic band
              from query volume, not a vendor quote.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Confidence
            </dt>
            <dd className="mt-1 text-pretty leading-relaxed text-fg-muted">
              {Math.round(result.confidence * 100)}% — lower when constraints
              narrow the field.
            </dd>
          </div>
          {result.costDrivers.length ? (
            <div className="sm:col-span-2">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
                Cost drivers
              </dt>
              <dd className="mt-1 text-pretty leading-relaxed text-fg-muted">
                {result.costDrivers.join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="editorial-justify mt-5 text-pretty text-[14px] leading-relaxed text-fg-muted">
          <span className="text-fg">Biggest risk at the default case: </span>
          {result.risk}
        </p>
      </section>

      <p className="editorial-justify mt-12 border-t border-border pt-6 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
        A starting point, not a prescription. The recommendation at the default
        case is what the engine would tell a stranger with your workload; the
        recommendation at *your* case is what it tells you once it knows the
        constraints. The Stack Builder holds both —{" "}
        <Link
          href={builderPath}
          className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
        >
          the builder link
        </Link>{" "}
        preselects this workload and starts with your volumes from here.
      </p>
    </div>
  );
}