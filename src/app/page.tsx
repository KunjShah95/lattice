import { CategorySection } from "@/components/category-section";
import { SearchTrigger } from "@/components/search-provider";
import { categories, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          {toolCount} tools · {categories.length} categories
        </p>

        <h1 className="mt-5 text-balance text-[34px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[52px] sm:leading-[1.05]">
          The infrastructure behind{" "}
          <span className="text-accent">working</span> AI systems.
        </h1>

        <p className="mt-5 max-w-[54ch] text-pretty text-[15px] leading-relaxed text-fg-muted sm:text-base">
          Most AI tooling directories list products. This one indexes the
          layers that decide whether a system holds up in production — serving,
          evaluation, retrieval, routing and the unglamorous plumbing between
          them.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <SearchTrigger />
          <a
            href="#all"
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border hover:text-fg"
          >
            Browse the index
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* Full index */}
      <div id="all" className="scroll-mt-20">
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
              Entries are hand-picked rather than submitted. Anything listed
              here is something worth understanding even if you never install
              it. Corrections and suggestions are welcome.
            </p>
          </div>
          <a
            href={`mailto:${site.contact.email}`}
            className="shrink-0 text-[13px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            Suggest a tool
          </a>
        </div>
      </section>
    </div>
  );
}
