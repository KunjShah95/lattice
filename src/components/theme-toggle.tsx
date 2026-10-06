"use client";

/**
 * Inlined in <head> so the correct class lands before first paint.
 * Without this the page flashes light before hydration applies the theme.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * The active theme is a class on <html>, so it lives outside React.
 * Both icons render and CSS picks one via the `dark` variant — that keeps the
 * server and client markup identical, so there is no hydration mismatch and
 * no state to synchronise.
 */
export function ThemeToggle() {
  function toggle() {
    const next = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      // Both glyphs occupy the same grid cell and trade places with a quarter
      // turn: the sun sets as the moon rises. Still pure CSS on the `dark`
      // class, so the toggle keeps holding no React state.
      className="press grid h-9 w-9 place-items-center rounded-md text-fg-muted hover:bg-bg-sunken hover:text-fg [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:transition-[translate,scale,rotate,opacity] [&>svg]:duration-500 [&>svg]:ease-[var(--ease-spring)]"
    >
      {/* Shown in light mode — offers the switch to dark. */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className="rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-50 dark:opacity-0"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>

      {/* Shown in dark mode — offers the switch to light. */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="rotate-90 scale-50 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
