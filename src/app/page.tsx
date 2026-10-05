import Link from "next/link";
import { CategorySection } from "@/components/category-section";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { categories, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { graph, siteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";

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
        Hero. The headline does the work; nothing competes with it.

        The `112 tools · hand-picked` eyebrow that used to sit above the h1 is
        gone. It made three claims that are all already made elsewhere and
        better: the count is in the diagram header and the footer, and
        "hand-picked" is exactly what the paragraph below the headline argues
        ("Most AI tooling directories list products"). An eyebrow directly above
        a headline is the second-loudest element on the page, and this one was
        spending that on a number.
      */}
      <section className="pb-12 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="text-balance font-serif text-[36px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[46px]">
              The infrastructure behind{" "}
              <span className="text-accent">working</span> AI systems.
            </h1>

            <p className="mt-5 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
              Every entry here carries two sentences: when to use it, and when to skip it.
              Most directories publish the first. Almost none publish the second — it is the
              one that tells you whether anything on this page is worth your time.
            </p>

            {/*
              One decision per viewport. The hero sets context, the diagram
              shows the shape, and this says what to actually do — in that
              order. It was previously absent, so a first-time reader landed on
              a beautiful diagram and had to infer that scrolling further was
              the intended action.

              The label names the action rather than the destination. "Start here"
              would compete with the section below it that is also called Start
              Here; this says what happens when you click.
            */}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/stack-builder"
                className="inline-flex items-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[14px] font-medium text-bg transition-opacity hover:opacity-90"
              >
                Build my stack
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#start-here"
                className="text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                or find my starting layers ↓
              </a>
              <Link
                href="/all"
                className="text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                browse all {toolCount}
              </Link>
            </div>

            {/*
              The proof point, placed at first contact rather than in a
              footer nobody opens.

              "112 hand-picked tools" is the category's opening move and it is
              why 112 reads as small against directories claiming 50,000. This
              block is the better number: it is the one claim nobody else in
              the category can make, because making it means doing it rather
              than writing it. The six-month gate in `lib/data.ts` throws and
              stops the deploy, so the date on a page is a receipt, not a
              promise.

              It also fills what was a large dead zone under the CTA. The
              alternative was another navigation widget, and this page already
              has enough of those.
            */}
            <div className="mt-9 max-w-[40ch] border-t border-border pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
                Why you can trust the figures
              </p>
              <p className="mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
                Licence, cost and deployment facts go stale, so every entry is dated
                and the build{" "}
                <span className="text-fg">fails</span> if any is more than six months
                old. A stale entry cannot reach production, which is more than
                &ldquo;updated daily&rdquo; can tell you.
              </p>
              <Link
                href="/methodology"
                className="mt-2.5 inline-block font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                Read the method, including where it is wrong →
              </Link>
            </div>

            {/* No search field here. The sticky header already carries one and
                is visible in the first viewport at every breakpoint, so a
                second copy below the fold-adjacent hero was a duplicated
                affordance competing with the diagram — which is the actual
                pitch on this page, per the note above. */}
          </div>

          <StackDiagram />
        </div>
      </section>

      {/* Symptom entry. Most readers arrive with a problem, not a category —
          and no other index in the category routes by symptom. Each card is
          one click from an ordered checklist through the stack. */}
      <section aria-labelledby="fix-heading" className="border-t border-border py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="fix-heading" className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Something wrong? Start from the symptom
          </h2>
          <Link href="/fix" className="shrink-0 font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 hover:text-fg">
            All symptoms →
          </Link>
        </div>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {resolvedSymptoms.map((s) => (
            <li key={s.slug} className="bg-bg">
              <Link href={`/fix/${s.slug}`} className="group flex h-full flex-col gap-1.5 p-4 transition-colors hover:bg-bg-sunken">
                <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: bandColor(s.band) }} />
                  {s.label}
                </span>
                <span className="text-pretty text-[15px] font-medium leading-snug group-hover:text-accent">{s.title}</span>
              </Link>
            </li>
          ))}
          <li className="bg-bg">
            <Link href="/compare" className="group flex h-full flex-col gap-1.5 p-4 transition-colors hover:bg-bg-sunken">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Choosing, not fixing</span>
              <span className="text-pretty text-[15px] font-medium leading-snug group-hover:text-accent">
                Compare tools — including across layers →
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Decision path — the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section id="start-here" className="scroll-mt-20 border-t border-border py-12">
        <StartHere />
      </section>

      {/* The index — the legend for the diagram above. */}
      <div id="all" className="scroll-mt-20">
        <div className="mb-8 flex items-baseline gap-3 border-t border-border pt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            The index
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] text-fg-subtle">
            {categories.length} sections
          </span>
        </div>

        {categories.map((category) => (
          <CategorySection key={category.slug} category={category} />
        ))}
      </div>

      {/* Colophon.

          The build in `src/lib/data.ts` throws if any entry's licence or cost
          has not been re-checked within six months, so this site cannot ship
          with a confident stale figure in it. That is the hardest claim in
          this category to copy — it means doing the work, not writing the
          sentence — and it is worth stating plainly rather than leaving in a
          changelog nobody reads. */}
      <section className="border-t border-border py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[46ch]">
            <h2 className="text-[15px] font-medium">How this list is kept</h2>
            <p className="mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
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
              .
            </p>
          </div>
          <a
            href={`mailto:${site.contact.email}`}
            className="shrink-0 text-[13px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            Suggest a tool
          </a>
        </div>

        {/* Reader-facing links only. /feed.xml and /llms.txt are deliberately not
            linked from anywhere visible: they are for crawlers and agents, which
            find them via robots.txt and the sitemap, and a human clicking "RSS"
            gets a raw XML document with no explanation of what it is. */}
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 font-mono text-[11px] text-fg-subtle">
          <Link href="/all" className="transition-colors hover:text-fg-muted">
            All {toolCount} tools, filterable →
          </Link>
        </div>
      </section>
    </div>
  );
}
