import type { Metadata } from "next";
import { StackBuilder } from "@/components/stack-builder";
import { absolute } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Stack Builder",
  description:
    "Describe your AI system and get a recommended stack of AI infrastructure tools — gateway, retrieval, inference, evals — as a shareable link with cost band, confidence and tradeoffs.",
  alternates: { canonical: "/stack-builder" },
  // Next does not derive `og:url` from the canonical, and an inherited one
  // points at the home page. See `absolute()` in lib/seo.ts.
  openGraph: { url: absolute("/stack-builder") },
};

export default function StackBuilderPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          Tell me what to use
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Build my AI stack.
        </h1>
        <p className="mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          Describe your case — or start from a real one below. The stack updates
          as you answer, every answer becomes part of a shareable link, and the
          decision copies out as a report. Drawn from the 112 tools already in
          the index; estimates are heuristic bands, not vendor quotes.
        </p>
      </header>
      <div className="mt-8">
        <StackBuilder />
      </div>
    </div>
  );
}
