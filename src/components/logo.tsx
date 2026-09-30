import { site } from "@/lib/site";

/**
 * Wordmark. The glyph is a small lattice of cells — abstract, and
 * deliberately not a play on either reference site's logo.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-accent"
      >
        <rect x="0.75" y="0.75" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10.25" y="0.75" width="7" height="7" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="0.75" y="10.25" width="7" height="7" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10.25" y="10.25" width="7" height="7" rx="1.25" fill="currentColor" />
      </svg>
      <span className="font-medium tracking-[-0.01em]">{site.name}</span>
    </span>
  );
}
