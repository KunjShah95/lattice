/**
 * "Ask an AI about this page": one prefilled link per assistant.
 *
 * Plain links, no client code: each assistant accepts the question in its own
 * URL, so there is nothing to run in the browser and nothing added to the
 * bundle budget. The prompt names the canonical URL and asks for a citation,
 * so an answer built from it points back here.
 *
 * Gemini's own app has no supported way to prefill a question from a link, so
 * the Google entry opens Google AI Mode (which runs on Gemini) instead of an
 * empty Gemini chat that would ignore the question.
 */
const ASSISTANTS: Array<{ name: string; href: (q: string) => string }> = [
  { name: "ChatGPT", href: (q) => `https://chatgpt.com/?hints=search&q=${q}` },
  { name: "Claude", href: (q) => `https://claude.ai/new?q=${q}` },
  { name: "Perplexity", href: (q) => `https://www.perplexity.ai/search?q=${q}` },
  { name: "Google AI Mode", href: (q) => `https://www.google.com/search?udm=50&q=${q}` },
  { name: "Grok", href: (q) => `https://grok.com/?q=${q}` },
];

export function askPrompt(url: string): string {
  return `Read ${url} and summarise what it recommends and why, in plain terms. Cite the page.`;
}

export function askLinks(url: string) {
  const q = encodeURIComponent(askPrompt(url));
  return ASSISTANTS.map((a) => ({ name: a.name, href: a.href(q) }));
}

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
