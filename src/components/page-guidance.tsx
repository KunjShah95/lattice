import type { CSSProperties } from "react";
import type { QA } from "@/lib/seo";
import { AskAi } from "@/components/ask-ai";

/**
 * The two closing blocks every page on the site carries: "Rules of thumb" and
 * "Quick answers". They were first written for comparison pages, where they
 * did the most work, and then copied by hand onto tools, stacks and fixes
 * with small drifts in spacing. One component keeps the voice and the layout
 * identical everywhere.
 *
 * The voice is the point. A rule is two sentences: a claim that names the
 * failure, then the move that prevents it. An answer is one self-contained
 * passage that still reads correctly when quoted without the page around it.
 */
export function RulesOfThumb({
  rules,
  markerStyle,
  title = "Rules of thumb",
  className = "mt-16 border-t border-border pt-10",
}: {
  rules: readonly string[];
  /** Colour of the dash before each rule; defaults to the neutral border. */
  markerStyle?: CSSProperties;
  title?: string;
  className?: string;
}) {
  if (!rules.length) return null;
  return (
    <section className={className}>
      <h2 className="t-h4">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rules.map((rule) => (
          <li
            key={rule}
            className="editorial-justify flex max-w-[68ch] gap-3 text-pretty text-[15.5px] leading-relaxed text-fg-muted"
          >
            <span
              aria-hidden="true"
              className={`mt-2 h-[3px] w-3 shrink-0 rounded-full${markerStyle ? "" : " bg-border-strong"}`}
              style={markerStyle}
            />
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuickAnswers({
  answers,
  title = "Quick answers",
  className = "mt-16 border-t border-border pt-10",
}: {
  answers: readonly QA[];
  title?: string;
  className?: string;
}) {
  if (!answers.length) return null;
  return (
    <section className={className}>
      <h2 className="t-h4">{title}</h2>
      <dl className="mt-4 space-y-5">
        {answers.map((qa) => (
          <div key={qa.question}>
            <dt className="text-[16px] font-medium">{qa.question}</dt>
            <dd className="editorial-justify mt-1 max-w-[62ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
              {qa.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Both blocks, in reading order: the rules, the answers, then the AI links. */
export function PageGuidance({
  rules,
  answers,
  markerStyle,
  url,
}: {
  rules: readonly string[];
  answers: readonly QA[];
  markerStyle?: CSSProperties;
  /** The page's canonical URL, for the "Ask an AI about this page" links. */
  url: string;
}) {
  return (
    <>
      <RulesOfThumb rules={rules} markerStyle={markerStyle} />
      <QuickAnswers answers={answers} />
      <AskAi url={url} />
    </>
  );
}
