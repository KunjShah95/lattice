"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  buildCompareRows,
  compareMarkdown,
  differingFacts,
  relationOf,
  type CompareTool,
} from "@/lib/compare-table";
import { COMPARE_EXAMPLES, decodeCompare, encodeCompare, MAX_COMPARE } from "@/lib/compare-url";
import { layerColor } from "@/lib/layer-color";

/**
 * Compare Builder — pick up to three tools from *any* layers and see them side by
 * side.
 *
 * Why this exists: `/compare/<slug>` pages are hand-written, narrow, and end in a
 * recommendation. `strategy/02` §4 says the surface no funded competitor can occupy
 * is the cross-layer one — "here is how your gateway compares to your evaluation
 * platform" — and there are 112 tools, so far more pairs than anyone will write by
 * hand. This lets the reader pose the comparison themselves, and says plainly when
 * the tools are not substitutes.
 *
 * It declares no winner. A verdict needs the reader's constraints, and the page
 * that takes constraints is the Stack Builder, which the result links to.
 *
 * State is the URL, as everywhere else on this site: no account, no storage.
 * Everything below is a pure function of the selected ids — the logic is in
 * `lib/compare-table` and `lib/compare-url`, where vitest can reach it.
 */

const MAX_RESULTS = 8;

export function CompareBuilder({ tools }: { tools: CompareTool[] }) {
  const byId = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);
  const valid = useMemo(() => new Set(byId.keys()), [byId]);

  // Read in the initialiser, not an effect: prerender has no `window`, so the
  // server gets the empty case and the client picks the URL up on first render.
  const [ids, setIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : decodeCompare(window.location.search, valid),
  );
  const [query, setQuery] = useState("");

  // Pick up the URL after mount, for in-app navigation.
  //
  // The initialiser above covers a direct load or a pasted link, where `window` is
  // already at the right URL. It does not cover arriving from another page of this
  // site: the App Router updates `window.location` *after* the new page first
  // renders, so a "Compare with another tool" link from a tool page would render
  // this component against the previous URL and open an empty builder. This runs
  // after commit, when the URL is current.
  //
  // It must stay *above* the writer below. Effects run in order, and the writer
  // would otherwise erase `?tools=` (the state is still empty on that first pass)
  // before this has read it.
  useEffect(() => {
    const fromUrl = decodeCompare(window.location.search, valid);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external system (the URL) after navigation, which the initialiser cannot see
    setIds((prev) =>
      prev.length === fromUrl.length && prev.every((id, i) => id === fromUrl[i]) ? prev : fromUrl,
    );
  }, [valid]);

  // The URL is the save. `replaceState`, never `pushState`: adding a tool must not
  // fill the back button with one entry per click.
  useEffect(() => {
    const q = encodeCompare(ids);
    const next = `${window.location.pathname}${q ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [ids]);

  const selected = useMemo(
    () => ids.map((id) => byId.get(id)).filter((t): t is CompareTool => Boolean(t)),
    [ids, byId],
  );
  const rows = useMemo(() => buildCompareRows(selected), [selected]);
  const relation = relationOf(selected);
  const full = ids.length >= MAX_COMPARE;

  const q = query.trim().toLowerCase();
  const matches = q
    ? tools
        .filter((t) => !ids.includes(t.id))
        .filter((t) => t.name.toLowerCase().includes(q) || t.categoryShort.toLowerCase().includes(q))
        // Name matches first: typing "vector" should surface the thing called a
        // vector store before a tool that merely lives in that section.
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)),
        )
        .slice(0, MAX_RESULTS)
    : [];

  const add = (id: string) => {
    setIds((prev) => (prev.includes(id) || prev.length >= MAX_COMPARE ? prev : [...prev, id]));
    setQuery("");
  };
  const remove = (id: string) => setIds((prev) => prev.filter((x) => x !== id));

  const source = () => ({
    origin: window.location.origin,
    url: `${window.location.origin}${window.location.pathname}?${encodeCompare(ids)}`,
  });

  return (
    <div>
      {/* ---- Picker ---------------------------------------------------- */}
      <div className="rounded-lg border border-border bg-bg-elevated p-5 sm:p-6">
        <Eyebrow as="h2">
          {full ? `${MAX_COMPARE} of ${MAX_COMPARE} chosen` : `Add a tool · ${ids.length} of ${MAX_COMPARE}`}
        </Eyebrow>

        <label className="mt-3 block">
          <span className="sr-only">Search tools to add to the comparison</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={full}
            placeholder={full ? "Remove one to add another" : "Search by name or layer, e.g. “qdrant” or “gateway”"}
            className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-[14px] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-fg-subtle focus:border-border-strong focus:shadow-[0_0_0_4px_var(--selection)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {q ? (
          matches.length ? (
            <ul aria-label="Matching tools" className="mt-2 divide-y divide-border rounded-md border border-border">
              {matches.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => add(t.id)}
                    className="press flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-bg-sunken"
                  >
                    <span
                      aria-hidden="true"
                      className="h-4 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: layerColor(t.layer) }}
                    />
                    <span className="font-medium">{t.name}</span>
                    <span className="font-mono text-[11px] text-fg-subtle">{t.categoryShort}</span>
                    <span className="ml-auto font-mono text-[11px] text-fg-subtle">add</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-fg-subtle">
              Nothing matches &ldquo;{query}&rdquo;. Names and layer names both count.
            </p>
          )
        ) : null}

        {ids.length === 0 ? (
          <div className="mt-5">
            <Eyebrow size="xs">Or start from one of these</Eyebrow>
            <ul className="mt-2 flex flex-wrap gap-2">
              {COMPARE_EXAMPLES.map((ex) => (
                <li key={ex.label}>
                  <button
                    type="button"
                    onClick={() => setIds(ex.ids.filter((id) => valid.has(id)))}
                    className="press rounded-md border border-border px-3 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                  >
                    {ex.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* ---- Result ---------------------------------------------------- */}
      <section aria-live="polite" className="mt-10">
        <Eyebrow>Side by side</Eyebrow>
        <p className="editorial-justify mt-2 max-w-[60ch] text-pretty font-serif text-[19px] leading-snug">{relation.text}</p>

        {selected.length >= 2 ? (
          <p className="mt-1.5 font-mono text-[11px] text-fg-subtle">
            {differingFacts(rows)} of {rows.filter((r) => r.kind === "fact").length} factual rows differ
          </p>
        ) : null}

        {selected.length ? (
          <>
            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[34rem] border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  Comparison of {selected.map((t) => t.name).join(", ")}
                </caption>
                <thead>
                  <tr className="border-b border-border bg-bg-sunken">
                    <th scope="col" className="w-28 p-3 align-bottom font-mono text-[10.5px] font-normal uppercase tracking-[0.12em] text-fg-subtle">
                      <span className="sr-only">Attribute</span>
                    </th>
                    {selected.map((t) => (
                      <th key={t.id} scope="col" className="p-3 align-bottom font-normal">
                        <span className="flex items-start justify-between gap-2">
                          <Link
                            href={`/${t.id}`}
                            className="inline-flex items-center gap-1.5 font-serif text-[17px] font-medium hover:text-accent"
                          >
                            <span
                              aria-hidden="true"
                              className="h-4 w-[3px] shrink-0 rounded-full"
                              style={{ backgroundColor: layerColor(t.layer) }}
                            />
                            {t.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(t.id)}
                            aria-label={`Remove ${t.name} from the comparison`}
                            className="press -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded text-fg-subtle hover:bg-bg hover:text-fg"
                          >
                            <span aria-hidden="true">×</span>
                          </button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b border-border last:border-b-0 align-top">
                      <th
                        scope="row"
                        className="p-3 font-mono text-[10.5px] font-normal uppercase tracking-[0.1em] text-fg-subtle"
                      >
                        {r.label}
                        {/* Marked in words as well as position: the row that
                            differs is the one a decision turns on. */}
                        {selected.length >= 2 && r.kind === "fact" && r.differs ? (
                          <span className="mt-1 block text-accent normal-case tracking-normal">differs</span>
                        ) : null}
                      </th>
                      {r.values.map((v, i) => (
                        <td
                          key={selected[i].id}
                          className={`p-3 leading-relaxed ${
                            r.kind === "judgement" ? "text-pretty text-fg-muted" : "text-fg"
                          }`}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CopyButton
                text={() => source().url}
                label="Copy link to this comparison"
                copiedLabel="Link copied"
              />
              <CopyButton
                text={() => compareMarkdown(selected, rows, source())}
                label="Copy as Markdown"
                copiedLabel="Markdown copied"
              />
            </div>

            <p className="editorial-justify mt-6 max-w-[62ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
              No winner is declared here: that needs your constraints, and they are not in this
              table. The{" "}
              <Link
                href="/stack-builder"
                className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                Stack Builder
              </Link>{" "}
              takes them. Every cell is the tool&rsquo;s own entry in the index; the
              use-when and skip-when lines are editorial judgements, not measurements.{" "}
              <Link
                href="/methodology"
                className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                Read the method →
              </Link>
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
