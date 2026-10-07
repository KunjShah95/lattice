import type { Tool } from "@/lib/types";
import { DecisionValve } from "./decision-valve";

/**
 * The body of a tool's hover card: what it is, the use/skip pair, and the three
 * facts that most often rule a tool in or out before anything else.
 *
 * Server component, rendered into the page and handed to `PreviewLink` as an
 * opaque node — the client never sees the dataset, only the finished markup.
 *
 * Licence and cost are shown and popularity is not, and that is the point of the
 * card: the one-line comparison a reader wants is "can I run this, and what does
 * it cost me", not a star count.
 */
export function ToolPreview({ tool }: { tool: Tool }) {
  const facts = [
    tool.license,
    tool.deployment,
    tool.cost,
  ].filter((f): f is string => Boolean(f));

  return (
    <>
      <span className="block text-[13px] font-medium text-fg">{tool.name}</span>
      <span className="mt-1 block text-pretty text-[12.5px] leading-relaxed text-fg-muted">
        {tool.blurb}
      </span>
      <DecisionValve
        variant="inline"
        className="mt-2.5 border-t border-border pt-2.5"
        toolName={tool.name}
        useWhen={tool.useWhen}
        skipWhen={tool.skipWhen}
      />
      {facts.length ? (
        <span className="mt-2.5 block font-mono text-[10.5px] text-fg-subtle">
          {facts.join(" · ")}
        </span>
      ) : null}
    </>
  );
}
