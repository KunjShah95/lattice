import { askLinks } from "@/lib/ask-ai";

/**
 * "Ask an AI about this page", at the foot of every page: one prefilled link
 * per assistant. Plain server-rendered links, so crawlers see them and no
 * client code ships. The header's Copy / Ask AI menu offers the same links at
 * the top of the page; the question itself lives in `lib/ask-ai.ts`.
 */
export function AskAi({
  url,
  className = "mt-16 border-t border-border pt-10",
}: {
  /** The page's canonical, absolute URL. */
  url: string;
  className?: string;
}) {
  return (
    <section aria-labelledby="ask-ai" className={className}>
      <h2 id="ask-ai" className="t-h4">
        Ask an AI about this page
      </h2>
      <p className="mt-2 max-w-[62ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
        Opens the assistant with this page&rsquo;s link and a question already
        filled in.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {askLinks(url).map((a) => (
          <li key={a.name}>
            <a
              href={a.href}
              target="_blank"
              rel="noopener"
              className="chip min-h-9 no-underline hover:no-underline"
            >
              {a.name}
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
