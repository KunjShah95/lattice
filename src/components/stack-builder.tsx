"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayerStrip } from "@/components/ui/layer-strip";
import { Meter } from "@/components/ui/meter";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Segmented, type Option } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { stackLayers } from "@/lib/data";
import { sendSignal } from "@/lib/beacon";
import { describeChange, diffPicks, type PickChange } from "@/lib/stack-diff";
import {
  WORKLOADS,
  recommendStack,
  type Durability,
  type Filtering,
  type Freshness,
  type Latency,
  type Safety,
  type StackInput,
  type StackLanguage,
  type Workload,
} from "@/lib/stacks";
import {
  decodeStackInput,
  encodeStackInput,
  neutraliseStackInput,
  stackPostText,
  stackReportJson,
  stackReportMarkdown,
  workloadAsks,
} from "@/lib/stack-url";
import { withSource, xIntentUrl } from "@/lib/share.mjs";

/**
 * Stack Builder — answer the questions, then build. Answers edit a draft; the
 * recommendation is computed when the reader submits ("Build my stack"), so a
 * half-answered case never flickers a stack the reader did not ask for. The URL
 * describes the last *built* case (so every stack is a shareable link), and the
 * report copies out as Markdown for an ADR or design doc. No accounts, no
 * storage: the URL is the save.
 */

const FILTERING: Array<Option<Filtering>> = [
  { value: "none", label: "No filtering", hint: "Pure similarity search" },
  { value: "light", label: "Light", hint: "A tenant or tag field" },
  { value: "heavy", label: "Heavy", hint: "Facets, permissions, ranges combined" },
];

const FRESHNESS: Array<Option<Freshness>> = [
  { value: "static", label: "Mostly static" },
  { value: "daily", label: "Daily updates" },
  { value: "realtime", label: "Constantly changing" },
];

const LATENCY: Array<Option<Latency>> = [
  { value: "flexible", label: "Background" },
  { value: "fast", label: "< 2 s interactive" },
  { value: "realtime", label: "< 500 ms realtime" },
];

const LANGUAGE: Array<Option<StackLanguage>> = [
  { value: "any", label: "Any" },
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
];

const DURABILITY: Array<Option<Durability>> = [
  { value: "stateless", label: "Single request" },
  { value: "minutes", label: "Runs for minutes" },
  { value: "hours", label: "Runs for hours" },
];

const SAFETY: Array<Option<Safety>> = [
  { value: "none", label: "No special handling" },
  { value: "pii", label: "PII flows through it" },
  { value: "strict", label: "Strict policy" },
];

type Case = {
  workload: Workload;
  queries: string;
  documents: string;
  filtering: Filtering;
  freshness: Freshness;
  latency: Latency;
  language: StackLanguage;
  durability: Durability;
  safety: Safety;
  openSource: boolean;
  selfHosted: boolean;
  avoidLockIn: boolean;
  costVsPerf: number;
};

const DEFAULT_CASE: Case = {
  workload: "rag",
  queries: "500000",
  documents: "10000000",
  filtering: "heavy",
  freshness: "static",
  latency: "fast",
  language: "any",
  durability: "stateless",
  safety: "none",
  openSource: false,
  selfHosted: false,
  avoidLockIn: true,
  costVsPerf: 0,
};

const CLEARED_CASE: Case = {
  workload: "rag",
  queries: "",
  documents: "",
  filtering: "none",
  freshness: "static",
  latency: "flexible",
  language: "any",
  durability: "stateless",
  safety: "none",
  openSource: false,
  selfHosted: false,
  avoidLockIn: false,
  costVsPerf: 0,
};

const PRESETS: Array<{ label: string; detail: string; state: Case }> = [
  {
    label: "10M-doc RAG",
    detail: "500K q/mo · heavy filtering · daily updates",
    state: {
      ...DEFAULT_CASE,
      workload: "rag",
      queries: "500000",
      documents: "10000000",
      filtering: "heavy",
      freshness: "daily",
      latency: "fast",
    },
  },
  {
    label: "Support chatbot, PII in play",
    detail: "200K q/mo · Python · redaction required",
    state: {
      ...DEFAULT_CASE,
      workload: "chatbot",
      queries: "200000",
      latency: "fast",
      language: "python",
      safety: "pii",
      filtering: "none",
      documents: "",
    },
  },
  {
    label: "Overnight research agent",
    detail: "Hour-long runs · strict tool policy",
    state: {
      ...DEFAULT_CASE,
      workload: "agent",
      queries: "50000",
      latency: "flexible",
      language: "python",
      durability: "hours",
      safety: "strict",
      filtering: "none",
      documents: "",
    },
  },
  {
    label: "Weekend prototype",
    detail: "8K q/mo · cheapest path to working",
    state: {
      ...DEFAULT_CASE,
      workload: "chatbot",
      queries: "8000",
      latency: "flexible",
      safety: "none",
      avoidLockIn: false,
      costVsPerf: -2,
      filtering: "none",
      documents: "",
    },
  },
];

/**
 * A shared link restores the case. This runs as the state initializer, not
 * in an effect: prerender has no window, so the server gets the blank slate
 * and the client picks up the URL on first render — no cascading re-renders.
 * With no query string the builder opens empty; DEFAULT_CASE only feeds
 * the Reset button and the preset bases below.
 */
function readInitialCase(): Case {
  return readUrlCase() ?? CLEARED_CASE;
}

/** The case a shared link carries, or null when the URL carries none. */
function readUrlCase(): Case | null {
  if (typeof window === "undefined") return null;
  const decoded = decodeStackInput(window.location.search);
  if (!decoded) return null;
  return {
    workload: decoded.workload,
    queries: String(decoded.queriesPerMonth),
    documents: decoded.documents ? String(decoded.documents) : "",
    filtering: decoded.filtering,
    freshness: decoded.freshness,
    latency: decoded.latency,
    language: decoded.language,
    durability: decoded.durability,
    safety: decoded.safety,
    openSource: decoded.openSource,
    selfHosted: decoded.selfHosted,
    avoidLockIn: decoded.avoidLockIn,
    costVsPerf: decoded.costVsPerf ?? 0,
  };
}

/** Which questions a workload asks: shared with the share card, see `stack-url.ts`. */
const asks = workloadAsks;

/**
 * The form's state as engine input.
 *
 * Pulled out of the component so the same function can price a *hypothetical*
 * case: `patch` runs it on the case a click is about to produce, to tell the
 * reader which pick that click moved. The neutralising of hidden questions is
 * `neutraliseStackInput`, shared with the share card.
 */
function caseToInput(c: Case): StackInput {
  return neutraliseStackInput({
    workload: c.workload,
    queriesPerMonth: Number(c.queries) || 0,
    documents: Number(c.documents) || 0,
    openSource: c.openSource,
    selfHosted: c.selfHosted,
    avoidLockIn: c.avoidLockIn,
    costVsPerf: c.costVsPerf,
    filtering: c.filtering,
    freshness: c.freshness,
    latency: c.latency,
    language: c.language,
    durability: c.durability,
    safety: c.safety,
  });
}

/** Save a string as a file. Browser-only; called from a click handler, never at render. */
function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Engine inputs that differ between two cases — what a rebuild would change. */
function changedAnswers(a: Case, b: Case): number {
  const x = caseToInput(a);
  const y = caseToInput(b);
  return (Object.keys(x) as Array<keyof StackInput>).filter((k) => x[k] !== y[k]).length;
}

export function StackBuilder() {
  /** The draft: what the form shows. Editing it computes nothing. */
  const [c, setC] = useState<Case>(readInitialCase);
  /**
   * The last case the reader submitted, or null before the first build. A
   * shared link counts as submitted — whoever sent it already pressed Build —
   * so it opens on the stack rather than on an empty results panel.
   */
  const [built, setBuilt] = useState<Case | null>(readUrlCase);
  const [copied, setCopied] = useState<"link" | "report" | "json" | "download" | null>(null);
  /**
   * What the reader's *last build* did to the stack, or null before they have
   * rebuilt once (and after a Clear, Reset or preset, which replace the draft
   * wholesale and would otherwise report a diff against something the reader
   * never chose).
   */
  const [changes, setChanges] = useState<PickChange[] | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  const { workload } = c;
  const { retrieval, language: asksLanguage, durability: asksDurability, safety: asksSafety, latency: asksLatency } =
    asks(workload);

  const result = useMemo(() => (built ? recommendStack(caseToInput(built)) : null), [built]);
  const pending = built ? changedAnswers(c, built) : null;
  const dirty = built === null || pending! > 0;

  /** Answers only edit the draft. Nothing is recomputed until the reader builds. */
  function patch(p: Partial<Case>) {
    setC((prev) => ({ ...prev, ...p }));
  }

  /**
   * Submit the draft. The diff is taken against the stack already on screen, so
   * the note names exactly what this build moved; the first build has nothing
   * to diff against and says nothing. Focus moves to the results heading so a
   * keyboard or screen-reader user lands on what they asked for.
   */
  function build() {
    const next = recommendStack(caseToInput(c));
    setChanges(result ? diffPicks(result.picks, next.picks) : null);
    setBuilt(c);
    setCopied(null);
    // A completed free tool: the conversion the Stack Builder exists for.
    // `to` is the workload's own stack page, so completions split by workload
    // without sending anything the reader typed (volumes, constraints).
    sendSignal("stack-built", `/stack/${c.workload}`);
    requestAnimationFrame(() => {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ block: "start" });
    });
  }

  const encoded = useMemo(() => (built ? encodeStackInput(caseToInput(built)) : null), [built]);

  // Pick up the URL after mount, for in-app navigation.
  //
  // `readInitialCase` in the state initialiser covers a direct load or a pasted
  // link. It does not cover arriving from another page of this site — the
  // `/stack/<workload>` pages link here with a full case in the query — because the
  // App Router updates `window.location` *after* the new page first renders. The
  // initialiser then saw the previous URL and built the blank case.
  //
  // Runs after commit, when the URL is current. It must stay *above* the writer:
  // effects run in order, and the writer would otherwise erase the query before
  // this had read it.
  useEffect(() => {
    const fromUrl = readUrlCase();
    if (!fromUrl) return;
    const same = (prev: Case | null) => JSON.stringify(prev) === JSON.stringify(fromUrl);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external system (the URL) after navigation, which the initialiser cannot see
    setC((prev) => (same(prev) ? prev : fromUrl));
    setBuilt((prev) => (same(prev) ? prev : fromUrl));
  }, []);

  // The URL is the save: each build is reflected, so the stack is a link.
  // replaceState, never pushState — rebuilding must not spray history. Before
  // the first build there is no stack, so the URL stays bare.
  useEffect(() => {
    if (!encoded) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${encoded}`);
  }, [encoded]);

  function applyCase(next: Case) {
    setC(next);
    setChanges(null);
    setCopied(null);
  }

  // Blank slate: keep the chosen workload, wipe every answer back to
  // neutral so the visitor starts from nothing, not from demo defaults.
  function clearCase() {
    setC((prev) => ({ ...CLEARED_CASE, workload: prev.workload }));
    setChanges(null);
    setCopied(null);
  }

  function resetDefaults() {
    applyCase(DEFAULT_CASE);
  }

  const isCleared =
    c.queries === "" &&
    c.documents === "" &&
    c.filtering === "none" &&
    c.freshness === "static" &&
    c.latency === "flexible" &&
    c.language === "any" &&
    c.durability === "stateless" &&
    c.safety === "none" &&
    !c.openSource &&
    !c.selfHosted &&
    !c.avoidLockIn &&
    c.costVsPerf === 0;

  // Read at click time, not render: `window` does not exist on the server.
  // Always the share path, whichever page the reader is on: it is the address
  // that unfurls as this stack (`app/stack-builder/share/page.tsx`).
  const caseUrl = () => `${window.location.origin}/stack-builder/share?${encoded ?? ""}`;
  const reportSource = () => ({ origin: window.location.origin, caseUrl: caseUrl() });

  async function copyText(text: string, which: "link" | "report" | "json") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="t-label">
            Start from a real case
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={clearCase}
              disabled={isCleared}
              title="Wipe every answer back to a blank slate (keeps the workload)"
              className="rounded-[var(--r-control)] border border-border px-3 py-1 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-fg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              title="Restore the demo defaults"
              className="rounded-[var(--r-control)] border border-border px-3 py-1 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyCase(p.state)}
              className="rounded-[var(--r-control)] border border-border px-4 py-3 text-left transition-colors hover:border-accent hover:bg-bg-elevated"
            >
              <span className="block text-[15px] font-medium">{p.label} →</span>
              <span className="mt-0.5 block text-[13.5px] text-fg-muted">{p.detail}</span>
            </button>
          ))}
        </div>
      </div>

      {/*
        A real <form>: Enter in a number field submits, and the submit bar below
        is its default button. Every other control inside is `type="button"`, so
        picking an answer never submits by accident.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          build();
        }}
        aria-label="Describe your workload"
      >
      <div className="grid gap-8 rounded-[var(--r-card)] border border-border bg-bg-elevated p-6 sm:p-8">
        <fieldset>
          <legend className="t-label text-fg">
            01 — What are you building?
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {WORKLOADS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => patch({ workload: w.id })}
                aria-pressed={workload === w.id}
                className={`relative rounded-[var(--r-card)] border px-4 py-3.5 text-left transition-colors ${
                  workload === w.id
                    ? "border-accent bg-bg-sunken"
                    : "border-border hover:border-border-strong"
                }`}
              >
                {workload === w.id ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-[var(--r-pill)] bg-fg text-[12px] leading-none text-bg"
                  >
                    ✓
                  </span>
                ) : null}
                <span className="block text-[16px] font-medium">{w.label}</span>
                <span className="mt-1 block text-[14px] leading-relaxed text-fg-muted">{w.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="t-label text-fg">
            02 — Your case
          </legend>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <label className="block">
              <span className="flex items-baseline justify-between text-[14.5px] font-medium">
                Requests / month
                {c.queries !== "" ? (
                  <button
                    type="button"
                    onClick={() => patch({ queries: "" })}
                    className="text-[13px] font-normal text-fg-subtle underline underline-offset-4 hover:text-fg"
                  >
                    Clear
                  </button>
                ) : null}
              </span>
              <input
                value={c.queries}
                onChange={(e) => patch({ queries: e.target.value.replace(/[^0-9]/g, "") })}
                inputMode="numeric"
                placeholder="e.g. 500000"
                className="field mt-2 h-11 font-mono tabular-nums"
              />
            </label>
            {retrieval ? (
              <label className="block">
                <span className="flex items-baseline justify-between text-[14.5px] font-medium">
                  Documents in the corpus
                  {c.documents !== "" ? (
                    <button
                      type="button"
                      onClick={() => patch({ documents: "" })}
                      className="text-[13px] font-normal text-fg-subtle underline underline-offset-4 hover:text-fg"
                    >
                      Clear
                    </button>
                  ) : null}
                </span>
                <input
                  value={c.documents}
                  onChange={(e) => patch({ documents: e.target.value.replace(/[^0-9]/g, "") })}
                  inputMode="numeric"
                  placeholder="e.g. 10000000"
                  className="field mt-2 h-11 font-mono tabular-nums"
                />
              </label>
            ) : null}
            {retrieval ? (
              <Segmented label="How much does retrieval depend on filtering?" options={FILTERING} value={c.filtering} onPick={(v) => patch({ filtering: v })} />
            ) : null}
            {retrieval ? (
              <Segmented label="How often does the corpus change?" options={FRESHNESS} value={c.freshness} onPick={(v) => patch({ freshness: v })} />
            ) : null}
            {asksDurability ? (
              <Segmented label="How long must work survive?" options={DURABILITY} value={c.durability} onPick={(v) => patch({ durability: v })} />
            ) : null}
            {asksLanguage ? (
              <Segmented label="What does the team ship in?" options={LANGUAGE} value={c.language} onPick={(v) => patch({ language: v })} />
            ) : null}
            {asksLatency ? (
              <Segmented label="How fast must an answer come back?" options={LATENCY} value={c.latency} onPick={(v) => patch({ latency: v })} />
            ) : null}
            {asksSafety ? (
              <Segmented label="What flows through the model?" options={SAFETY} value={c.safety} onPick={(v) => patch({ safety: v })} />
            ) : null}
          </div>
        </fieldset>

        <fieldset>
          <legend className="t-label text-fg">
            03 — Constraints
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { v: c.openSource, k: "openSource", l: "Open source" },
              { v: c.selfHosted, k: "selfHosted", l: "Self-hostable" },
              { v: c.avoidLockIn, k: "avoidLockIn", l: "Avoid vendor lock-in" },
            ].map((t) => (
              <Toggle
                key={t.l}
                pressed={t.v}
                onToggle={() => patch({ [t.k]: !t.v } as Partial<Case>)}
              >
                {t.l}
              </Toggle>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="t-label text-fg">
            04 — Priority
          </legend>
          <label className="mt-3 block">
            <span className="flex justify-between text-[14.5px] text-fg-muted">
              <span>Cost</span>
              <span className="font-mono text-[13px]">
                {c.costVsPerf < 0 ? " minimise cost" : c.costVsPerf > 0 ? " maximise performance" : " balanced"}
              </span>
              <span>Performance</span>
            </span>
            <input
              type="range"
              min={-2}
              max={2}
              step={1}
              value={c.costVsPerf}
              onChange={(e) => patch({ costVsPerf: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </label>
        </fieldset>
      </div>

        {/*
          The submit bar. Sticky to the bottom of the viewport while the form is
          on screen, so on a phone the button is reachable from any question
          without scrolling past the rest of them. Scoped to the form's own box,
          so it stops following once the results are in view.
        */}
        <div className="sticky bottom-0 z-20 -mx-1 mt-4 px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] bg-bg-elevated px-4 py-3 shadow-float">
            <p className="min-w-0 text-[14px] leading-snug text-fg-muted" aria-live="polite">
              {built === null ? (
                <>Answer what applies — nothing is required but the workload.</>
              ) : pending ? (
                <>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-accent" aria-hidden="true" />
                  {pending} {pending === 1 ? "answer has" : "answers have"} changed since your last build.
                </>
              ) : (
                <>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-band-state" aria-hidden="true" />
                  The stack below matches these answers.
                </>
              )}
            </p>
            <button
              type="submit"
              disabled={!dirty}
              className="btn-ink group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--r-control)] px-5 text-[15.5px] font-medium disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
            >
              {built === null ? "Build my stack" : "Update my stack"}
              <span aria-hidden="true" className="nudge">→</span>
            </button>
          </div>
        </div>
      </form>

      {result === null ? (
        <section aria-labelledby="stack-empty" className="mt-10">
          <div className="crop crop-static rounded-[var(--r-card)] border border-dashed border-border-strong px-6 py-10 text-center [--crop-inset:-6px]">
            {/* Nine empty layer slots: the stack, not yet drawn. */}
            <div aria-hidden="true" className="mx-auto flex w-fit flex-col-reverse gap-1">
              {stackLayers.map((s) => (
                <span key={s.slug} className="block h-1.5 w-24 rounded-full border border-dashed border-border-strong" />
              ))}
            </div>
            <h2 id="stack-empty" className="mt-6 font-serif text-[24px] font-medium tracking-[-0.015em]">
              Your stack is drawn here.
            </h2>
            <p className="mx-auto mt-2 max-w-[44ch] text-pretty text-[14.5px] leading-relaxed text-fg-muted">
              Pick a workload, answer what applies, then press{" "}
              <span className="font-medium text-fg">Build my stack</span>. Requests per
              month sharpens the cost band; everything else narrows the picks.
            </p>
          </div>
        </section>
      ) : (
      <section aria-live="polite" className="mt-10">
        <h2
          ref={resultsRef}
          tabIndex={-1}
          className="scroll-mt-24 t-h4 outline-none"
        >
          Your stack: built from your answers
        </h2>
        <p className="mt-2 font-serif text-[26px] leading-snug tracking-[-0.015em]">{result.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyText(stackReportMarkdown(result, reportSource()), "report")}
            className="btn-paper group inline-flex h-10 items-center gap-2 rounded-[var(--r-control)] px-3.5 text-[14px] font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h8" />
            </svg>
            {copied === "report" ? "Report copied" : "Copy decision report"}
          </button>
          <button
            type="button"
            onClick={() => void copyText(caseUrl(), "link")}
            className="press inline-flex h-10 items-center rounded-[var(--r-control)] px-3 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
          >
            {copied === "link" ? "Link copied" : "Copy link to this stack"}
          </button>
          <button
            type="button"
            onClick={() => void copyText(stackReportJson(result, reportSource()), "json")}
            className="press inline-flex h-10 items-center rounded-[var(--r-control)] px-3 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
          >
            {copied === "json" ? "JSON copied" : "Copy JSON"}
          </button>
          {/* Opens the X compose window with the stack as text and this case as
              the link. The link is tagged `?src=social`, because the X app
              strips the referrer and the visitors a post brings back would
              otherwise be counted as "direct". "Copy link" above stays
              untagged: nobody knows where a copied link gets pasted. Nothing
              is posted by this click; the reader edits and sends it, or not. */}
          <button
            type="button"
            onClick={() => {
              sendSignal("stack-shared", `/stack/${built?.workload ?? workload}`);
              window.open(
                xIntentUrl(stackPostText(result), withSource(caseUrl(), "social")),
                "_blank",
                "noopener,noreferrer",
              );
            }}
            className="press inline-flex h-10 items-center rounded-[var(--r-control)] px-3 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
          >
            Post to X
          </button>
          {/* The same Markdown as "Copy decision report", as a file: an ADR is a
              document that gets committed, and a clipboard is a poor place to
              keep one. Named for the workload so two downloads do not collide. */}
          <button
            type="button"
            onClick={() => {
              downloadText(`stack-${workload}.md`, stackReportMarkdown(result, reportSource()));
              setCopied("download");
              window.setTimeout(() => setCopied(null), 2000);
            }}
            className="press inline-flex h-10 items-center rounded-[var(--r-control)] px-3 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
          >
            {copied === "download" ? "Downloaded" : "Download .md"}
          </button>
        </div>

        {/* The shape of the stack before any of the picks: which layers it
            occupies. A dashed layer is one this workload does not call for. */}
        <div className="mt-5">
          <LayerStrip
            cells={stackLayers.map((s) => ({
              slug: s.slug,
              index: s.index,
              short: s.short,
              layer: s.layer as number,
              pick: result.picks.find((p) => p.sectionSlug === s.slug)?.tool ?? null,
            }))}
          />
        </div>

        {/* What the last rebuild moved: these answers, those picks. Shown only
            after a second build, and replaced rather than accumulated, so it
            always describes the last press of the button. */}
        {changes ? (
          <div className="mt-5 border-l-2 border-accent pl-3.5">
            <p className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-fg-subtle">
              Your last build changed
            </p>
            {changes.length ? (
              <ul className="mt-1.5 space-y-0.5 text-[15px] text-fg">
                {changes.map((ch) => (
                  <li key={ch.sectionSlug}>{describeChange(ch)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[15px] text-fg-muted">
                No pick changed. The same stack still fits.
              </p>
            )}
          </div>
        ) : null}

        <ol className="mt-5 space-y-px overflow-hidden rounded-[var(--r-card)] border border-border">
          {result.picks.map((p) => (
            <li key={p.sectionSlug} className="bg-bg-elevated p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                  {p.section}
                </span>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[12px] text-fg-muted">
                  {p.fitLabel}
                </span>
              </div>
              <Link href={p.url} className="mt-1 block font-serif text-[22px] font-medium hover:text-accent">
                {p.tool}
              </Link>
              {p.matches.length ? (
                <ul aria-label="Requirements this satisfies" className="mt-2 flex flex-wrap gap-1.5">
                  {p.matches.map((m) => (
                    <li
                      key={m}
                      className="rounded-full bg-bg-sunken px-2.5 py-0.5 text-[13px] text-fg-muted"
                    >
                      ✓ {m}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2.5 text-[15px] leading-relaxed text-fg-muted">
                <span className="font-medium text-fg">Why for you: </span>{p.why}
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">
                <span className="font-medium text-fg">Watch out: </span>{p.watchOut}
              </p>
              {p.switchWhen ? (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-subtle">
                  Consider {p.alternative} when {p.switchWhen}.
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--r-card)] border border-border bg-border sm:grid-cols-3">
          <div className="bg-bg-elevated p-5">
            <p className="t-label">Estimated cost</p>
            <p className="mt-2 font-mono text-[26px] leading-none tabular-nums tracking-[-0.02em]">
              $<RollingNumber value={result.costLow} />–$<RollingNumber value={result.costHigh} />
              <span className="text-[14px] text-fg-muted">/mo</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              {result.costDrivers.length
                ? `Driven by ${result.costDrivers.join(", ")} — the usage-billed picks.`
                : "No usage-billed picks in this stack."}{" "}
              Heuristic band, not a quote.
            </p>
          </div>
          <div className="bg-bg-elevated p-5">
            <p className="t-label">Confidence</p>
            <p className="mt-2 flex items-center gap-3 font-mono text-[26px] leading-none tabular-nums tracking-[-0.02em]">
              <span>{Math.round(result.confidence * 100)}%</span>
              <Meter value={result.confidence} />
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              Lower when constraints narrow the field.
            </p>
          </div>
          <div className="bg-bg-elevated p-5">
            <p className="t-label">Biggest risk for your case</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{result.risk}</p>
          </div>
        </div>

        <p className="mt-6 text-[14px] text-fg-muted">
          Every why and watch-out comes from the tool&apos;s own use-when / skip-when.{" "}
          <Link href="/methodology" className="underline underline-offset-4 hover:text-fg">Read the method →</Link>
        </p>
      </section>
      )}
    </div>
  );
}
