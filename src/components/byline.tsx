import Link from "next/link";
import { datasetModified } from "@/lib/seo";
import { bylineName } from "@/lib/seo";

/**
 * The byline every page making a factual claim carries under its lead.
 *
 * Exists because three page families had one and four did not, and the ones
 * that lacked it were the larger ones: 112 tool pages, 51 glossary pages and
 * every alternatives page described the index's facts with no accountable name
 * and no date next to them, while `/compare`, `/fix` and `/blog` did.
 *
 * A named editor and a stated verification date is the cheapest citability
 * signal on the site, and it was attached to the smallest share of it.
 *
 * `fact` names *what* was verified rather than saying "verified", because those
 * are different claims: a licence and a cost model expire, a definition does
 * not, and a reader deciding whether to trust a price is asking which one they
 * are looking at. `className` is set by the caller because the vertical rhythm
 * differs between a lead paragraph and a decision box.
 */
export function Byline({
  fact,
  date,
  className = "mt-5",
}: {
  fact: string;
  date: string;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-fg-muted ${className}`}>
      <span>By {bylineName}</span>
      <span aria-hidden="true" className="text-fg-subtle">·</span>
      <span>{fact}</span>
      <time dateTime={datasetModified} className="font-mono tabular-nums">
        {date}
      </time>
      <span aria-hidden="true" className="text-fg-subtle">·</span>
      <Link
        href="/methodology"
        className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
      >
        method
      </Link>
    </p>
  );
}