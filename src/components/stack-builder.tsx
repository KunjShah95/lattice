"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { WORKLOADS, recommendStack, type Workload } from "@/lib/stacks";

/**
 * Stack Builder — the conversion surface. Four questions, one deterministic
 * recommendation from the existing dataset. No accounts, no persistence in
 * this MVP: the result links into real tool pages.
 */
export function StackBuilder() {
  const [workload, setWorkload] = useState<Workload>("rag");
  const [queries, setQueries] = useState("500000");
  const [documents, setDocuments] = useState("10000000");
  const [openSource, setOpenSource] = useState(false);
  const [selfHosted, setSelfHosted] = useState(false);
  const [avoidLockIn, setAvoidLockIn] = useState(true);
  const [costVsPerf, setCostVsPerf] = useState(0);
  const [built, setBuilt] = useState(false);

  const result = useMemo(() => {
    if (!built) return null;
    return recommendStack({
      workload,
      queriesPerMonth: Number(queries) || 0,
      documents: workload === "rag" || workload === "search" ? Number(documents) || 0 : 0,
      openSource,
      selfHosted,
      avoidLockIn,
      costVsPerf,
      simplicityVsControl: selfHosted ? 2 : 0,
    });
  }, [built, workload, queries, documents, openSource, selfHosted, avoidLockIn, costVsPerf]);

  return (
    <div>
      <div className="grid gap-6 rounded-lg border border-border bg-bg-elevated p-5 sm:p-6">
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            01 — What are you building?
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {WORKLOADS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWorkload(w.id)}
                aria-pressed={workload === w.id}
                className={`rounded-md border px-4 py-3 text-left transition-colors ${
                  workload === w.id
                    ? "border-accent bg-bg-sunken"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <span className="block text-[14px] font-medium">{w.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-fg-muted">{w.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            02 — Scale
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] text-fg-muted">Requests / month</span>
              <input
                value={queries}
                onChange={(e) => setQueries(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-fg-muted">Documents (RAG / search)</span>
              <input
                value={documents}
                onChange={(e) => setDocuments(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-[14px]"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            03 — Constraints
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { v: openSource, s: setOpenSource, l: "Open source" },
              { v: selfHosted, s: setSelfHosted, l: "Self-hostable" },
              { v: avoidLockIn, s: setAvoidLockIn, l: "Avoid vendor lock-in" },
            ].map((c) => (
              <button
                key={c.l}
                type="button"
                onClick={() => c.s(!c.v)}
                aria-pressed={c.v}
                className={`rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
                  c.v ? "border-accent bg-bg-sunken text-fg" : "border-border text-fg-muted"
                }`}
              >
                {c.v ? "☑ " : "☐ "}{c.l}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            04 — Priority
          </legend>
          <label className="mt-3 block">
            <span className="flex justify-between text-[13px] text-fg-muted">
              <span>Cost</span>
              <span className="font-mono text-[11px]">
                {costVsPerf < 0 ? " minimise cost" : costVsPerf > 0 ? " maximise performance" : " balanced"}
              </span>
              <span>Performance</span>
            </span>
            <input
              type="range"
              min={-2}
              max={2}
              step={1}
              value={costVsPerf}
              onChange={(e) => setCostVsPerf(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </fieldset>

        <button
          type="button"
          onClick={() => setBuilt(true)}
          className="rounded-md bg-fg px-4 py-2.5 text-[14px] font-medium text-bg transition-opacity hover:opacity-90"
        >
          Generate my stack →
        </button>
      </div>

      {result ? (
        <section aria-live="polite" className="mt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Your recommended stack · {result.summary}
          </p>
          <ol className="mt-4 space-y-px overflow-hidden rounded-lg border border-border">
            {result.picks.map((p) => (
              <li key={p.sectionSlug} className="bg-bg-elevated p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                    {p.section}
                  </span>
                  <span className="font-mono text-[11px] text-fg-subtle">fit {p.fit.toFixed(1)}</span>
                </div>
                <Link href={p.url} className="mt-1 block font-serif text-[20px] font-medium hover:text-accent">
                  {p.tool}
                </Link>
                <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">✓ {p.why}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">
                  Alternative: {p.alternative} · {p.avoid}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-3 rounded-lg border border-border p-5 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Estimated cost</p>
              <p className="mt-1 font-serif text-[22px]">
                ${result.costLow}–${result.costHigh}<span className="text-[13px] text-fg-muted">/mo</span>
              </p>
              <p className="mt-1 text-[11.5px] text-fg-subtle">Heuristic band from query volume, not a quote.</p>
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Confidence</p>
              <p className="mt-1 font-serif text-[22px]">{Math.round(result.confidence * 100)}%</p>
              <p className="mt-1 text-[11.5px] text-fg-subtle">Lower when constraints narrow the field.</p>
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Biggest risk</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{result.risk}</p>
            </div>
          </div>

          <p className="mt-6 text-[13px] text-fg-subtle">
            Rankings are editorial — every why/avoid clause comes from the tool&apos;s own
            use-when / skip-when. <Link href="/methodology" className="underline underline-offset-4 hover:text-fg">Read the method →</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
