import Link from "next/link";
import { ToolDirectory } from "@/components/tool-directory";
import { ProductHuntBadge } from "@/components/product-hunt-badge";
import { StackConsole } from "@/components/stack-console";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { categories, stackLayers, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { graph, siteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { resolvedComparisons } from "@/lib/comparisons";
import { Faq, SectionHeading } from "@/components/marketing";

function ArrowUpRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nudge nudge-up-right mb-0.5 shrink-0 text-fg-subtle transition-colors group-hover:text-accent"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/**
 * The ways in, as a plain table of routes. Each row is a real path on the
 * site, printed as one, because the reader of an infrastructure index is
 * someone who reads URLs.
 */
const SURFACES = [
  {
    href: "/stack-builder",
    name: "Stack Builder",
    body: "Describe the workload, get one pick per layer with its reason, its skip-when and a cost band.",
  },
  {
    href: "/fix",
    name: "Fix",
    body: "Start from the symptom: slow, expensive, wrong answers, flaky agents. An ordered checklist through the stack.",
  },
  {
    href: "/compare",
    name: "Compare",
    body: `${resolvedComparisons.length} head-to-heads with a verdict, including across layers, which no vendor will publish.`,
  },
  {
    href: "/roles",
    name: "Roles",
    body: "What a platform, infra, data, applied or production engineer owns, and the tools for each.",
  },
  {
    href: "/all",
    name: "Index",
    body: "Every tool, filterable by section, role, deployment, licence and cost.",
  },
  {
    href: "/mcp",
    name: "MCP server",
    body: "llms.txt, a JSON dataset and an MCP server, so a model can query the index instead of guessing.",
  },
];

const HOME_FAQ = [
  {
    q: "Is Lattice free?",
    a: "Yes. The index, the Stack Builder, comparisons, symptom guides and the dataset are free, with no account. The only thing offered on top is a review of your own stack by the maintainer.",
  },
  {
    q: "Can a vendor pay to be listed or ranked higher?",
    a: "No. Placement, rankings and comparison verdicts are not for sale, and there are no affiliate links in the index or its data files. That neutrality is the reason the comparisons are worth reading.",
  },
  {
    q: "How are tools chosen?",
    a: "Hand-picked against a published bar, ordered by where they sit in a real system rather than by popularity. Every fact is dated, and the build fails if any is more than six months old.",
  },
  {
    q: "What is a stack review?",
    a: "You describe what you are building; you get back a written, layer-by-layer review with what to keep, swap or add, a cost band and the biggest risk. It is free.",
  },
  {
    q: "Can my AI assistant use Lattice?",
    a: "Yes. There is an llms.txt, a JSON dataset and an MCP server, so a model can look tools up instead of guessing.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* Site-level identity. Every other page references these nodes by @id
          rather than restating them. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(graph(siteJsonLd())) }}
      />
      {/*
        Hero. The claim on the left, the product working on the right.

        No announcement pill, no accent word, no backdrop: the exhibit is the
        Stack Builder's real answer for the most common workload, so the
        first thing a reader sees is the thing they came to use.
      */}
      <section className="grid gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
        <div className="min-w-0">
          <h1 className="max-w-[15ch] text-balance font-display text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[52px] lg:text-[56px]">
            Every AI infrastructure tool, with when to skip it.
          </h1>

          <p className="mt-6 max-w-[46ch] text-pretty text-[16.5px] leading-relaxed text-fg-muted">
            {toolCount} tools across {stackLayers.length} stack layers. Each entry says when to use it
            and when not to, so you can choose without vendor spin. Describe your workload and get a
            stack back, with a reason and a cost band for every pick.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/stack-builder"
              className="btn-ink group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 text-[14.5px] font-medium"
            >
              Build my stack
              <span aria-hidden="true" className="nudge">→</span>
            </Link>
            <Link
              href="/review"
              className="inline-flex min-h-11 items-center text-[14.5px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
            >
              Or get an expert review
            </Link>
          </div>

          <p className="mt-6 text-[13px] text-fg-subtle">
            Never shipped one of these?{" "}
            <Link
              href="/start"
              className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
            >
              Start with a five-step path to one working RAG app
            </Link>
            .
          </p>
        </div>

        <StackConsole />
      </section>

      {/* Spec line. The numbers a buyer would ask for, stated once, plainly.
          Counts come from the dataset so they cannot drift. */}
      <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-3 lg:grid-cols-6">
        {[
          [String(toolCount), "tools indexed"],
          [String(stackLayers.length), "stack layers"],
          [String(resolvedComparisons.length), "comparisons"],
          [String(resolvedSymptoms.length), "symptom guides"],
          ["6 mo", "max fact age"],
          ["0", "sponsored slots"],
        ].map(([value, label], i) => (
          <div
            key={label}
            className={`flex flex-col-reverse px-1 py-4 sm:px-4 ${i > 0 ? "lg:border-l lg:border-border" : ""}`}
          >
            <dt className="text-[12.5px] text-fg-muted">{label}</dt>
            <dd className="font-display text-[22px] font-medium tracking-[-0.02em]">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <p className="max-w-[60ch] text-pretty text-[13px] leading-relaxed text-fg-muted">
          Every entry is dated, and the build fails if any licence or cost fact is more than six
          months old. Placement is not for sale.{" "}
          <Link
            href="/methodology"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-fg"
          >
            Read the method
          </Link>
          .
        </p>
        <ProductHuntBadge />
      </div>

      {/* 01 · The stack. The map the whole index hangs off. */}
      <section aria-labelledby="the-stack" className="py-12">
        <SectionHeading
          id="the-stack"
          index="01"
          title="Nine layers, three families."
          lede="Ordered substrate first. Compute is where requests run, state is where knowledge lives, control is where behaviour is decided. The family a layer sits in is usually the shortest path from a symptom to the section worth reading."
        />
        <div className="mt-10">
          <StackDiagram />
        </div>
      </section>

      {/* 02 · Ways in, as a route table. */}
      <section aria-labelledby="ways-in" className="py-12">
        <SectionHeading
          id="ways-in"
          index="02"
          title="Start from where you are."
          lede="Most people arrive with a workload, a symptom or a shortlist rather than a category. Each has its own door."
        />
        <ul className="mt-8">
          {SURFACES.map((s) => (
            <li key={s.href} className="border-b border-border">
              <Link
                href={s.href}
                className="group -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 rounded px-2 py-4 transition-colors hover:bg-bg-sunken sm:grid-cols-[10rem_12rem_minmax(0,1fr)_auto]"
              >
                <span className="font-mono text-[12px] text-fg-subtle sm:order-none">{s.href}</span>
                <span className="col-start-1 text-[15px] font-medium transition-colors group-hover:text-accent sm:col-start-auto">
                  {s.name}
                </span>
                <span className="col-start-1 text-pretty text-[13.5px] leading-relaxed text-fg-muted sm:col-start-auto">
                  {s.body}
                </span>
                <span className="col-start-2 row-span-3 row-start-1 self-center sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  <ArrowUpRight />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 03 · The index itself. */}
      <section id="all" aria-labelledby="directory" className="scroll-mt-20 py-12">
        <SectionHeading
          id="directory"
          index="03"
          title={`All ${toolCount} tools, by layer.`}
          lede="Ordered by where each tool sits in a production system, not by how popular it is. Open any entry for when to use it, when to skip it, and its alternatives."
        />
        <div className="mt-8">
          <ToolDirectory categories={categories} />
        </div>
      </section>

      {/* 04 · Symptom entry. Most readers arrive with a problem, not a
          category. Each cell is one click from an ordered checklist through
          the stack. */}
      <section aria-labelledby="fix-heading" className="py-12">
        <SectionHeading
          id="fix-heading"
          index="04"
          title="Something wrong? Start from the symptom."
          lede={
            <>
              Each one is an ordered checklist through the stack, cheapest check first.{" "}
              <Link
                href="/fix"
                className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg"
              >
                See every symptom
              </Link>
              .
            </>
          }
        />
        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {resolvedSymptoms.map((s) => (
            <li key={s.slug} className="bg-bg">
              <Link
                href={`/fix/${s.slug}`}
                className="group flex h-full min-h-[7rem] flex-col gap-2 p-5 transition-colors hover:bg-bg-sunken"
              >
                <span className="inline-flex items-center gap-2 text-[12.5px] text-fg-subtle">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: bandColor(s.band) }} />
                  {s.label}
                </span>
                <span className="mt-auto flex items-end justify-between gap-3">
                  <span className="text-pretty text-[15px] font-medium leading-snug transition-colors group-hover:text-accent">{s.title}</span>
                  <ArrowUpRight />
                </span>
              </Link>
            </li>
          ))}
          <li className="bg-bg-sunken">
            <Link href="/compare" className="group flex h-full min-h-[7rem] flex-col gap-2 p-5 transition-colors hover:bg-bg">
              <span className="text-[12.5px] text-fg-subtle">Choosing, not fixing</span>
              <span className="mt-auto flex items-end justify-between gap-3">
                <span className="text-pretty text-[15px] font-medium leading-snug transition-colors group-hover:text-accent">
                  Compare tools, including across layers
                </span>
                <ArrowUpRight />
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Decision path: the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section id="start-here" className="scroll-mt-20 py-12">
        <StartHere />
      </section>

      {/* 05 · The offer. Placed after the free tools on purpose: a reader who
          has used the Stack Builder or a symptom guide knows what a review
          would add, and is the reader most likely to want one. */}
      <section id="review" aria-labelledby="offer" className="scroll-mt-20 py-12">
        <SectionHeading
          id="offer"
          index="05"
          title="Want an engineer to check your stack?"
          lede="The same rulebook as the index, applied to your system: a written review of every layer, with a cost band and the risk most likely to bite first. Reviews never change where a tool sits in the index."
        />
        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Every layer", "What you run, checked against the index: keep, swap or add."],
            ["Cost band", "What the stack costs at your traffic, and what moves the number."],
            ["The biggest risk", "The failure most likely to bite first, and the cheapest guard."],
            ["Written down", "A dated document you keep, not a call you have to remember."],
          ].map(([title, body]) => (
            <li key={title} className="bg-bg p-5">
              <p className="text-[15px] font-medium">{title}</p>
              <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/review"
            className="btn-ink group inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[14px] font-medium"
          >
            Request a review
            <span aria-hidden="true" className="nudge">→</span>
          </Link>
          <Link
            href="/stack-review"
            className="inline-flex min-h-11 items-center text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            How a review runs
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-faq" className="py-12">
        <SectionHeading id="home-faq" index="06" title="The short answers." />
        <div className="mt-8 max-w-3xl">
          <Faq items={HOME_FAQ} />
        </div>
      </section>

      {/* Colophon.

          Opens with the definition this homepage exists to rank for. "AI
          infrastructure" is the head term; the two sentences that follow are
          written to stand alone as a quoted answer, naming each layer so an
          answer engine can lift the passage whole. Counts come from the
          dataset, not prose, so they cannot drift.
      */}
      <section className="border-t border-border py-12">
        <div className="max-w-[62ch]">
          <h2 className="text-[15px] font-medium">What is AI infrastructure?</h2>
          <p className="editorial-justify mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
            AI infrastructure is everything between your product and the model:
            runtimes that serve weights, gateways that route requests, stores
            that hold embeddings, frameworks that run agents, and evals that say
            whether any of it works. Lattice indexes {toolCount} such AI
            infrastructure tools as one AI stack, ordered by depth: {" "}
            <Link
              href="/all"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              browse every tool
            </Link>
            , or{" "}
            <Link
              href="/stack-builder"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              build your stack
            </Link>
            .
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[46ch]">
            <h2 className="text-[15px] font-medium">How this list is kept</h2>
            <p className="editorial-justify mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
              Entries are hand-picked rather than submitted, and ordered by where
              they sit in a real system rather than by how popular they are. Any
              licence or cost figure older than six months fails the build, so a
              stale entry cannot reach production.{" "}
              <Link
                href="/methodology"
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                The full method, including what this list gets wrong
              </Link>
              . When something changes, it is listed on{" "}
              <Link
                href="/corrections"
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                Corrections
              </Link>
              .
            </p>
          </div>
          <a
            href={site.contact.href}
            className="shrink-0 text-[13px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            Suggest a tool
          </a>
        </div>

        {/* Reader-facing links only. /feed.xml and /llms.txt are deliberately not
            linked from anywhere visible: they are for crawlers and agents, which
            find them via the sitemap (robots.txt cannot list URLs, only rules),
            and a human clicking "RSS" gets a raw XML document with no
            explanation of what it is. */}
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 font-mono text-[11px] text-fg-subtle">
          <Link href="/all" className="transition-colors hover:text-fg-muted">
            All {toolCount} AI infrastructure tools, filterable →
          </Link>
        </div>
      </section>
    </div>
  );
}
