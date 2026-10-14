"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Runtime error boundary for every page under the root layout.
 *
 * Nearly every route is prerendered, so this is rare — it catches a client
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
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-5 py-20 sm:px-6">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="crop crop-static grid h-16 w-16 shrink-0 place-items-center rounded-md border border-dashed border-border-strong [--crop-inset:-5px]"
        >
          <span className="font-mono text-[11px] text-fg-subtle">!</span>
        </div>
        <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-fg-subtle">
          Error
          <br />
          Sheet failed to draw
        </p>
      </div>

      <h1 className="mt-5 text-balance font-serif text-[34px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[44px]">
        This page hit a problem.
      </h1>

      <p className="mt-4 max-w-[48ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
        Something failed while drawing it. Trying again usually works; if it
        does not, the rest of the index is unaffected.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="btn-ink group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-medium"
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
          className="btn-paper inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] text-fg-muted hover:text-fg"
        >
          Back to the index
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 border-t border-border pt-4 font-mono text-[11px] text-fg-subtle">
          Reference <span className="text-fg-muted">{error.digest}</span> — quote it if you{" "}
          <Link
            href="/contact"
            className="underline decoration-border-strong underline-offset-4 hover:text-fg"
          >
            report this
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
