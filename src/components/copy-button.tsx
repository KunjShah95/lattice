"use client";

import { useState } from "react";

/**
 * One button that copies a prepared string. The text is built by the caller —
 * on a static page, at build time — so this component knows nothing about
 * what it copies and can sit on a server-rendered page as the only client
 * island.
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  /**
   * The string, or a function that builds it. A function is for text that depends
   * on the browser — a URL with the current origin and query — which does not exist
   * at render on the server. It runs at click time, never during render.
   */
  text: string | (() => string);
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const value = typeof text === "function" ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API is unavailable on insecure origins and in some embeds.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded-md border border-border px-3.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
    >
      <span aria-live="polite">{copied ? `✓ ${copiedLabel}` : label}</span>
    </button>
  );
}
