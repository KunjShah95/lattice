/**
 * Prefilled "ask an assistant about this page" links.
 *
 * Shared by the header's Copy / Ask AI menu (a client component) and the
 * server-rendered section at the foot of each page, so both send the same
 * question. Kept free of imports so the client bundle pays only for this.
 *
 * Gemini's own app has no supported way to prefill a question from a link, so
 * the Google entry opens Google AI Mode (which runs on Gemini) instead of an
 * empty Gemini chat that would ignore the question.
 */
const ASSISTANTS: Array<[name: string, base: string]> = [
  ["ChatGPT", "https://chatgpt.com/?hints=search&q="],
  ["Claude", "https://claude.ai/new?q="],
  ["Perplexity", "https://www.perplexity.ai/search?q="],
  ["Google AI Mode", "https://www.google.com/search?udm=50&q="],
  ["Grok", "https://grok.com/?q="],
];

export function askPrompt(url: string): string {
  return `Read ${url} and summarise what it recommends and why, in plain terms. Cite the page.`;
}

export function askLinks(url: string): Array<{ name: string; href: string }> {
  const q = encodeURIComponent(askPrompt(url));
  return ASSISTANTS.map(([name, base]) => ({ name, href: base + q }));
}
