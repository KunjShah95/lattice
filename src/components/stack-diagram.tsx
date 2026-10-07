import Link from "next/link";
import { BANDS, bandOf, hatchClass, layerColor, layerStyle } from "@/lib/layer";
import { maxCategoryCount, offStack, stackLayers } from "@/lib/data";

/**
 * The hero. This is a map of a production AI system, not a pitch: nine
 * bands ordered substrate-first, each sized by how many tools sit in it,
 * each linking to its section. The index below the fold is the legend.
 *
 * The nine bands are grouped into three — Compute, State, Control — because
 * nine hues is a rainbow and a reader cannot hold a rainbow in working
 * memory. Three is a number they can, and the group a layer belongs to is
 * the shortest path from a symptom ("it is slow", "the answers are wrong")
 * to the two sections worth reading. The grouping is stated rather than
 * implied, so the palette does work instead of decorating.
 *
 * Off-stack material is deliberately rendered outside the stack frame —
 * reading material is not a layer, and pretending otherwise is the kind of
 * small dishonesty that makes a directory feel like marketing.
 */
export function StackDiagram() {
  // Surface first: the top of the stack is what you look at.
  const ordered = [...stackLayers].sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0));
  // Bands, surface-first too, so a group break reads as a change of family.
  const bandOrder = [...BANDS].sort(
    (a, b) => Math.max(...b.layers) - Math.max(...a.layers),
  );

  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          The stack
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          {stackLayers.length} layers · {offStack.length} off-stack
        </span>
      </div>

      {/*
        A plain div, not `role="list"`.

        It carried `role="list"` with the label "AI system layers, ordered surface
        first", but its children are the three band `<section>`s — not
        `listitem`s. axe reports it as `aria-required-children`, and it was a real
        defect rather than a pedantic one: a list whose children are not list items
        announces as a list and then offers a screen-reader user nothing to move
        between.

        The list semantics belong on each band's `<ul>` below, where the children
        genuinely are list items, and each is labelled with its band so the
        announcement is *better* than one flat list was — the reader hears which
        family of layers they have moved into.
      */}
      {/* The frame is a drawing, so it carries permanent crop corners just
          outside its edge — the same marks a row picks up on hover, at rest. */}
      <div className="crop crop-static relative rounded-xl bg-bg-elevated/70 p-1.5 shadow-ink [--crop-inset:-7px] [--crop:10px]">
        {bandOrder.map((band) => (
          <section key={band.id} className="mb-1 last:mb-0">
            {/* The band heading carries the symptom it is associated with,
                because readers arrive with a symptom rather than a layer
                number. */}
            <h3 className="flex flex-wrap items-baseline gap-x-2.5 px-3 pb-1 pt-2.5">
              <span
                className="font-mono text-[9.5px] uppercase tracking-[0.18em]"
                style={{ color: `var(--band-${band.id})` }}
              >
                Band {band.roman} · {band.title}
              </span>
              <span className="text-[11.5px] text-fg-subtle">
                usually sounds like {band.sounds}
              </span>
            </h3>

            <ul aria-label={`Band ${band.roman} · ${band.title} layers, surface first`}>
              {ordered
                .filter((c) => bandOf(c.layer) === band.id)
                .map((category) => {
                  const layer = category.layer ?? 0;
                  const width = Math.round(
                    (category.tools.length / maxCategoryCount) * 100,
                  );
                  const isCrosscutting = category.role === "crosscutting";

                  return (
                    <li key={category.slug}>
                      {/* `--i` staggers the meter and rule draw-on by depth,
                          so the stack assembles surface-down on load. Crop
                          marks sit inside the row (`overflow-hidden`). */}
                      <Link
                        href={`/${category.slug}`}
                        data-spot=""
                        style={
                          {
                            "--i": 9 - layer,
                            "--spot": layerColor(layer),
                          } as React.CSSProperties
                        }
                        className="crop group relative flex min-h-14 items-center gap-3 overflow-hidden rounded-lg px-3 py-3 transition-colors duration-200 [--crop-inset:3px] [--crop:6px] hover:bg-bg-sunken sm:gap-4"
                      >
                        {/* Full-bleed tint in the layer's own colour. */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.16]"
                          style={layerStyle(layer)}
                        />
                        {/* Hatch encodes position rather than colour: a layer
                            that spans the stack is dashed, one that occupies a
                            place in it is solid. Redundant with the identity
                            rule below, which is what a reader notices first. */}
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 ${hatchClass(layer, category.role)}`}
                          style={{ color: layerColor(layer) }}
                        />
                        {/* The layer's identity rule. Cross-cutting layers are
                            dashed because they span the stack rather than sit
                            in it. */}
                        <span
                          aria-hidden="true"
                          className={`draw-y relative h-9 w-[3px] shrink-0 rounded-full transition-[height] duration-300 ease-[var(--ease-spring)] group-hover:h-10 ${
                            isCrosscutting ? "opacity-70" : ""
                          }`}
                          style={{
                            ...layerStyle(layer),
                            ...(isCrosscutting
                              ? {
                                  backgroundImage: `repeating-linear-gradient(to bottom, ${layerColor(layer)} 0 3px, transparent 3px 6px)`,
                                  backgroundColor: "transparent",
                                }
                              : {}),
                          }}
                        />

                        <span className="relative w-6 shrink-0 font-mono text-[12px] tabular-nums text-fg-subtle transition-colors group-hover:text-fg">
                          {category.index}
                        </span>

                        <span className="relative min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-medium">
                              {category.title}
                            </span>
                            <span
                              aria-hidden="true"
                              className="-translate-x-1 text-[12px] text-fg-subtle opacity-0 transition-[translate,scale,rotate,opacity] duration-300 ease-[var(--ease-out)] group-hover:translate-x-0 group-hover:opacity-100"
                            >
                              →
                            </span>
                          </span>
                          {/* The responsibility line is the reason to click, so
                              it stays — but two lines on a 390px screen pushed
                              the tool count out of view entirely. One line
                              below `sm` keeps the row scannable and the count
                              legible; the full sentence is on the section
                              page either way. */}
                          <span className="mt-0.5 hidden text-pretty text-[12.5px] leading-relaxed text-fg-muted sm:block">
                            {category.responsibility}
                          </span>
                        </span>

                        {/* Density meter — width is the tool count, so the shape
                            of the ecosystem is legible before you read a word.
                            The count is always shown; only the meter bar drops
                            below `sm`, where it would be too thin to read. */}
                        <span className="relative flex shrink-0 items-center gap-2">
                          <span className="hidden h-[3px] w-24 overflow-hidden rounded-full bg-border sm:block">
                            <span
                              className="draw-x block h-full rounded-full"
                              style={{ width: `${width}%`, ...layerStyle(layer) }}
                            />
                          </span>
                          <span className="w-6 text-right font-mono text-[12px] tabular-nums text-fg-muted">
                            {category.tools.length}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}

        {/* Substrate marker. */}
        <div className="flex items-center gap-2 px-3 pb-1 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            Substrate
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>

        {/* Title block — the box in the corner of every engineering sheet
            that says what the drawing is, how it is scaled and which way up
            it reads. Here it is the legend for the two encodings above. */}
        <dl className="mx-1.5 mb-1 mt-2 hidden grid-cols-3 sm:grid overflow-hidden rounded-md border border-border font-mono text-[9.5px] uppercase tracking-[0.12em] text-fg-subtle">
          <div className="border-r border-border px-2.5 py-1.5">
            <dt className="sr-only">Orientation</dt>
            <dd>Drawn surface ↑</dd>
          </div>
          <div className="border-r border-border px-2.5 py-1.5">
            <dt className="sr-only">Scale</dt>
            <dd>Bar · tools/layer</dd>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <dt className="sr-only">Hatch</dt>
            <dd className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-3 rounded-[1px] border border-current opacity-60 [background:repeating-linear-gradient(to_right,currentColor_0_1px,transparent_1px_3px)]" />
              <span className="truncate">solid · in stack</span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Off-stack: visually detached, deliberately not part of the stack. */}
      {offStack.map((category) => (
        <Link
          key={category.slug}
          href={`/${category.slug}`}
          className="group mt-3 flex items-center gap-3 rounded-lg border border-dashed border-border-strong px-3 py-2.5 transition-[background-color,border-color] duration-200 hover:border-fg-subtle hover:bg-bg-sunken sm:gap-4"
        >
          <span aria-hidden="true" className="h-9 w-[3px] shrink-0 rounded-full bg-fg-subtle opacity-40" />
          <span className="w-6 shrink-0 font-mono text-[12px] text-fg-subtle">
            {category.index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-fg-muted group-hover:text-fg">
              {category.title}
            </span>
            <span className="mt-0.5 block text-pretty text-[12.5px] leading-relaxed text-fg-subtle">
              {category.responsibility}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-fg-subtle">
            {category.tools.length}
          </span>
        </Link>
      ))}
    </div>
  );
}