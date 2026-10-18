"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusArt } from "@/components/status-art";

/**
 * Runtime error boundary for every page under the root layout.
 *
 * Nearly every route is prerendered, so this is rare: it catches a client
 * component that throws (the explorer, the Stack Builder) or a dynamic route
 * whose render fails. Rendered inside the layout, so the header, footer and
 * theme survive and the reader keeps their bearings.
 *
 * `retry` (stable in Next 16.3) re-fetches and re-renders the segment, which
 * is the right first move for a transient failure. The digest is shown so a
 * reader reporting the problem can quote something that matches the server
 * log; the message itself is not, because a server error's message can leak
 * internals and a client error's is rarely meaningful to a reader.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-2 sm:px-6 sm:pt-4">
      <div className="hero-head text-center">
        <div className="flex justify-center">
          <StatusArt variant="fault" />
        </div>

        <p className="hero-pill mt-8 font-mono uppercase tracking-[0.14em] text-fg-muted">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          Error · Sheet failed to draw
        </p>

        <h1 className="mx-auto mt-5 max-w-2xl text-balance font-serif text-[36px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[52px]">
          Something slipped out of place.
        </h1>

        <p className="mx-auto mt-5 max-w-[48ch] text-pretty text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
          This page hit a problem while drawing. Trying again usually fixes it,
          and the rest of the index is unaffected.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => retry()}
            className="btn-ink group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium"
          >
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-180"
            >
              ↺
            </span>
            Try again
          </button>
          <Link
            href="/"
            className="btn-paper inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium"
          >
            Back to the index
          </Link>
        </div>
      </div>

      {/* What to quote when reporting it. The digest matches the server log;
          a reader can copy it without understanding it. */}
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 border-t border-border pt-8 text-center">
        {error.digest ? (
          <p className="font-mono text-[11px] text-fg-subtle">
            Reference{" "}
            <span className="rounded-md bg-bg-elevated px-2 py-0.5 text-fg-muted shadow-ink">
              {error.digest}
            </span>
          </p>
        ) : null}
        <p className="text-[13px] text-fg-subtle">
          Keeps happening?{" "}
          <Link
            href="/contact"
            className="text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-accent"
          >
            Report it
          </Link>
          {error.digest ? " with the reference above" : ""}.
        </p>
      </div>
    </div>
  );
}
