import Link from "next/link";
import { CategorySection } from "@/components/category-section";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { categories, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* Hero — the diagram *is* the pitch. No button row, no metric
          eyebrow: a reader should be able to see the shape of the stack
          before scrolling. */}
      <section className="pb-12 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
              {toolCount} tools · hand-picked
            </p>

            <h1 className="mt-5 text-balance font-serif text-[36px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[46px]">
              The infrastructure behind{" "}
              <span className="text-accent">working</span> AI systems.
            </h1>

            <p className="mt-5 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
              Most AI tooling directories list products. This one indexes the
              layers that decide whether a system holds up in production —
              serving, retrieval, routing, and the unglamorous plumbing between
              them.
            </p>

            {/* No search field here. The sticky header already carries one and
                is visible in the first viewport at every breakpoint, so a
                second copy below the fold-adjacent hero was a duplicated
                affordance competing with the diagram — which is the actual
                pitch on this page, per the note above. */}
          </div>

          <StackDiagram />
        </div>
      </section>

      {/* Decision path — the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section className="border-t border-border py-12">
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

      {/* Colophon */}
      <section className="border-t border-border py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[46ch]">
            <h2 className="text-[15px] font-medium">How this list is kept</h2>
            <p className="mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
              Entries are hand-picked rather than submitted, and ordered by where
              they sit in a real system rather than by how popular they are.
              Anything listed here is something worth understanding even if you
              never install it. Corrections and suggestions are welcome.
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
