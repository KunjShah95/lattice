/**
 * Product Hunt "Featured" badge.
 *
 * Renders the official embed snippet as a theme-aware badge: the light asset
 * in light mode and the dark asset in dark mode, toggled with CSS so server
 * and client markup stay identical (no hydration mismatch, same pattern as
 * ThemeToggle).
 *
 * Both images share the same link, dimensions (250x54) and alt text from the
 * Product Hunt embed code.
 */
const HREF =
  "https://www.producthunt.com/products/lattice-12?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-lattice-13";
const ALT = "Lattice - ai infrastructure tools | Product Hunt";
const POST_ID = "1270009";
const CACHE_BUST = "1791253162489";

function src(theme: "light" | "dark") {
  return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=${theme}&t=${CACHE_BUST}`;
}

export function ProductHuntBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Featured on Product Hunt"
      className={`inline-block ${className}`}
    >
      {/* Light mode */}
      <img
        src={src("light")}
        alt={ALT}
        width={250}
        height={54}
        loading="lazy"
        className="block dark:hidden"
      />
      {/* Dark mode */}
      <img
        src={src("dark")}
        alt={ALT}
        width={250}
        height={54}
        loading="lazy"
        className="hidden dark:block"
        aria-hidden="true"
      />
    </a>
  );
}
