/**
 * One facet value as a toggle chip, with its count.
 *
 * Lived inside `tool-explorer.tsx`. Extracted for the compare builder's picker and
 * the role lens, which filter the same dataset by the same axes and should look and
 * announce identically.
 *
 * `tickColor` is a CSS colour string, not a layer number, on purpose: this module
 * must not import `lib/layer`, which pulls the whole dataset into the browser. The
 * caller resolves the colour and passes it in.
 *
 * `facetGroup` / `facetValue` are `data-` attributes and not styling hooks. The
 * accessible name is `${label} ${count}`"Free 77"which collides: `free` and
 * `free-tier` both start with "Free", so a name-based selector matches two chips
 * and fails in strict mode. The browser tests need to address one facet
 * deterministically, and no role or ARIA attribute distinguishes them without also
 * changing what a screen reader announces.
 *
 * The count is set in mono and sits at the end of the pill, dimmed a step from
 * the label: it is the second half of the same fact ("Free · 77") but it is a
 * figure, and figures line up.
 */
export function FilterChip({
  active,
  onClick,
  label,
  count,
  tickColor,
  facetGroup,
  facetValue,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tickColor?: string;
  facetGroup?: string;
  facetValue?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...(facetGroup && facetValue
        ? { "data-facet": facetGroup, "data-facet-value": facetValue }
        : {})}
      className="chip min-h-9"
    >
      {tickColor ? (
        <span
          aria-hidden="true"
          className="h-2.5 w-[3px] rounded-full"
          style={{ backgroundColor: tickColor }}
        />
      ) : null}
      {label}
      <span className="font-mono text-[12px] tabular-nums">{count}</span>
    </button>
  );
}
