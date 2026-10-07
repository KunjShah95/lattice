/**
 * The zero-result state of a filter UI.
 *
 * A dead end is the worst outcome of a filter, so this names exactly what is
 * narrowing the list and lets each constraint be dropped on its own — usually one
 * chip is the culprit, and resetting all of them throws away the rest of the
 * reader's intent.
 *
 * The illustration is the site's own idea of an empty slot: three layers with the
 * middle one missing, drawn dashed. Generic over the group key (a plain string) so
 * the compare builder's picker can reuse it without sharing the explorer's types.
 */
export type ActiveConstraint = { group: string; value: string; label: string };

export function FilterEmptyState({
  query,
  active,
  onClearQuery,
  onRemove,
  onReset,
  title = "No tool fills that slot.",
}: {
  query: string;
  active: ActiveConstraint[];
  onClearQuery: () => void;
  onRemove: (group: string, value: string) => void;
  onReset: () => void;
  title?: string;
}) {
  return (
    <div className="crop crop-static mx-auto my-10 max-w-md rounded-xl border border-dashed border-border-strong px-6 py-10 text-center [--crop-inset:-6px]">
      <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true" className="mx-auto text-fg-subtle">
        <rect x="4" y="2" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
        <rect x="4.5" y="17.5" width="47" height="9" rx="2" stroke="currentColor" strokeDasharray="3 3" />
        <rect x="4" y="32" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
      </svg>
      <p className="mt-5 font-serif text-[20px] font-medium tracking-[-0.01em] text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-[36ch] text-pretty text-[13px] leading-relaxed text-fg-muted">
        Every tool here is ruled out by at least one constraint. Drop the one
        that matters least:
      </p>
      <ul className="mt-5 flex flex-wrap justify-center gap-1.5">
        {query ? (
          <li>
            <button
              type="button"
              onClick={onClearQuery}
              className="press group inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-[12px] text-fg-muted hover:border-border-strong hover:text-fg"
            >
              <span className="font-mono text-[10px] text-fg-subtle">text</span>
              &ldquo;{query}&rdquo;
              <span aria-hidden="true" className="text-fg-subtle transition-transform group-hover:rotate-90">×</span>
              <span className="sr-only">(remove)</span>
            </button>
          </li>
        ) : null}
        {active.map((a) => (
          <li key={`${a.group}-${a.value}`}>
            <button
              type="button"
              onClick={() => onRemove(a.group, a.value)}
              className="press group inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-[12px] text-fg-muted hover:border-border-strong hover:text-fg"
            >
              <span className="font-mono text-[10px] text-fg-subtle">{a.group}</span>
              {a.label}
              <span aria-hidden="true" className="text-fg-subtle transition-transform group-hover:rotate-90">×</span>
              <span className="sr-only">(remove)</span>
            </button>
          </li>
        ))}
      </ul>
      {/* Named "Reset", not "Clear": the toolbar's Clear button stays the one
          control by that name. */}
      <button
        type="button"
        onClick={onReset}
        className="btn-paper mt-6 inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium"
      >
        Reset every filter
      </button>
    </div>
  );
}
