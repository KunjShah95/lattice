"use client";

import { Children, useState } from "react";

/**
 * A long index section that shows its first few rows and reveals the rest on
 * request.
 *
 * The home page rendered all 113 tools at once. That is the whole dataset in a
 * single scroll, which is a good reference document and a bad front page: the
 * first section alone pushed the second one off the screen, and nothing told a
 * reader how much was left. Four rows is enough to judge whether a section is
 * relevant; the count on the button says what is behind it.
 *
 * The children are server-rendered rows, passed through as opaque nodes. This
 * component never sees the dataset, so expanding costs no client bundle — only
 * the markup that was already in the payload.
 */
export function ExpandableList({
  children,
  initial = 4,
  label,
}: {
  children: React.ReactNode;
  /** Rows visible before expanding. */
  initial?: number;
  /** Plural noun for the button, e.g. "tools". */
  label: string;
}) {
  const items = Children.toArray(children);
  const [open, setOpen] = useState(false);
  const hidden = Math.max(0, items.length - initial);
  const shown = open ? items : items.slice(0, initial);

  return (
    <div>
      <ul className="space-y-0.5">{shown}</ul>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="press mt-2 inline-flex min-h-10 items-center gap-2 rounded-[var(--r-control)] px-2 text-[14px] font-medium text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
        >
          {open ? (
            <>
              Show fewer
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 15 6-6 6 6" />
              </svg>
            </>
          ) : (
            <>
              Show all {items.length} {label}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
