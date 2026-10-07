/**
 * A boolean pill: on or off, with the state in a glyph as well as the colour.
 *
 * The ☑ / ☐ prefix is deliberate and not decoration. A pressed pill differs from an
 * unpressed one only by border colour, which is the one cue a colour-blind reader
 * or a high-contrast mode can lose; the glyph carries the state without it.
 */
export function Toggle({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      className={`rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
        pressed ? "border-accent bg-bg-sunken text-fg" : "border-border text-fg-muted"
      }`}
    >
      <span aria-hidden="true">{pressed ? "☑ " : "☐ "}</span>
      {children}
    </button>
  );
}
