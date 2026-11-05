export type Option<V extends string> = { value: V; label: string; hint?: string };

/**
 * A single-choice pill group: one of N values, each a toggle button.
 *
 * Lived inside `stack-builder.tsx`, where six questions use it. Extracted because
 * the compare builder and the role lens need the same control, and a second copy
 * would drift from the first in exactly the details that matter here: the
 * `aria-pressed` state, the group label, and the focus ring.
 *
 * Buttons with `aria-pressed`, not radios: the group is a filter the reader can
 * flip back and forth, there is no form submission, and a native radio group would
 * need arrow-key handling that a row of buttons gets from Tab for free.
 *
 * No hooks, no browser APIs: a plain function of its props, so it works inside a
 * client component without adding anything to a server route's bundle.
 */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: Array<Option<V>>;
  value: V;
  onPick: (v: V) => void;
}) {
  return (
    <div>
      <p className="text-[14.5px] font-medium">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            aria-pressed={value === o.value}
            title={o.hint}
            className="chip min-h-9 px-3.5"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
