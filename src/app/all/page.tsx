import type { Metadata } from "next";
import Link from "next/link";
import { ToolExplorer } from "@/components/tool-explorer";
import { allTags, allToolEntries, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "All tools",
  description:
    `Every tool in the ${site.name} index in one filterable list — ${toolCount} tools, ${allTags.length} tags, filterable by section and by kind.`,
  alternates: { canonical: "/all" },
};

export default function AllToolsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {toolCount} tools · {allTags.length} tags
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Everything, filterable.
        </h1>
        <p className="mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The whole index in one list. Use it when you know what you are
          looking for; use the{" "}
          <Link
            href="/"
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            stack diagram
          </Link>{" "}
          when you do not.
        </p>
      </header>

      <ToolExplorer tools={allToolEntries} />
    </div>
  );
}
