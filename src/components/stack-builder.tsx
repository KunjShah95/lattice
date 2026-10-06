"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { decodeStackInput, encodeStackInput, stackReportMarkdown } from "@/lib/stack-url";

/**
 * Stack Builder — a live configurator, not a form. The recommendation
 * recomputes as you answer, the URL always describes the current case (so
 * every stack is a shareable link), and the report copies out as Markdown
 * for an ADR or design doc. No accounts, no storage: the URL is the save.
 */

type Option<V extends string> = { value: V; label: string; hint?: string };

function Segmented<V extends string>({
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
      <p className="text-[13px] font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            aria-pressed={value === o.value}
            title={o.hint}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              value === o.value
                ? "border-accent bg-bg-sunken text-fg"
                : "border-border text-fg-muted hover:border-border-strong"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  if (typeof window === "undefined") return CLEARED_CASE;
  const decoded = decodeStackInput(window.location.search);
  if (!decoded) return CLEARED_CASE;
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

export function StackBuilder() {
  const [c, setC] = useState<Case>(readInitialCase);
  const patch = (p: Partial<Case>) => setC((prev) => ({ ...prev, ...p }));
  const [copied, setCopied] = useState<"link" | "report" | null>(null);

  const { workload } = c;
  const retrieval = workload === "rag" || workload === "search";
  const asksLanguage =
    workload === "agent" || workload === "chatbot" || workload === "finetuned";
  const asksDurability =
    workload === "agent" || workload === "voice" || workload === "finetuned";
  const asksSafety =
    workload === "agent" || workload === "chatbot" || workload === "llm-api" || workload === "voice";
  const asksLatency = workload !== "finetuned";

  const input: StackInput = useMemo(
    () => ({
      workload: c.workload,
      queriesPerMonth: Number(c.queries) || 0,
      documents: retrieval ? Number(c.documents) || 0 : 0,
      openSource: c.openSource,
      selfHosted: c.selfHosted,
      avoidLockIn: c.avoidLockIn,
      costVsPerf: c.costVsPerf,
      simplicityVsControl: c.selfHosted ? 2 : 0,
      filtering: retrieval ? c.filtering : "none",
      freshness: retrieval ? c.freshness : "static",
      latency: asksLatency ? c.latency : "flexible",
      language: asksLanguage ? c.language : "any",
      durability: asksDurability ? c.durability : "stateless",
      safety: asksSafety ? c.safety : "none",
    }),
    [c, retrieval, asksLatency, asksLanguage, asksDurability, asksSafety],
  );

  const result = useMemo(() => recommendStack(input), [input]);
  const encoded = useMemo(() => encodeStackInput(input), [input]);

  // The URL is the save: every answer is reflected, so the stack is a link.
  // replaceState, never pushState — answering questions must not spray history.
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}?${encoded}`);
  }, [encoded]);

  function applyCase(next: Case) {
    setC(next);
    setCopied(null);
  }

  // Blank slate: keep the chosen workload, wipe every answer back to
  // neutral so the visitor starts from nothing, not from demo defaults.
  function clearCase() {
    setC((prev) => ({ ...CLEARED_CASE, workload: prev.workload }));
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

  async function copyText(text: string, which: "link" | "report") {
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
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Start from a real case
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={clearCase}
              disabled={isCleared}
              title="Wipe every answer back to a blank slate (keeps the workload)"
              className="rounded-md border border-border px-3 py-1 text-[12px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-fg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={resetDefaults}
              title="Restore the demo defaults"
              className="rounded-md border border-border px-3 py-1 text-[12px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
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
              className="rounded-md border border-border px-4 py-3 text-left transition-colors hover:border-accent hover:bg-bg-elevated"
            >
              <span className="block text-[14px] font-medium">{p.label} →</span>
              <span className="mt-0.5 block text-[12.5px] text-fg-muted">{p.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-7 rounded-lg border border-border bg-bg-elevated p-5 sm:p-6">
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            01 — What are you building?
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {WORKLOADS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => patch({ workload: w.id })}
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
            02 — Your case
          </legend>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
            <label className="block">
              <span className="flex items-baseline justify-between text-[13px] font-medium">
                Requests / month
                {c.queries !== "" ? (
                  <button
                    type="button"
                    onClick={() => patch({ queries: "" })}
                    className="text-[12px] font-normal text-fg-subtle underline underline-offset-4 hover:text-fg"
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
                className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-[14px]"
              />
            </label>
            {retrieval ? (
              <label className="block">
                <span className="flex items-baseline justify-between text-[13px] font-medium">
                  Documents in the corpus
                  {c.documents !== "" ? (
                    <button
                      type="button"
                      onClick={() => patch({ documents: "" })}
                      className="text-[12px] font-normal text-fg-subtle underline underline-offset-4 hover:text-fg"
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
                  className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-[14px]"
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
          <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            03 — Constraints
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { v: c.openSource, k: "openSource", l: "Open source" },
              { v: c.selfHosted, k: "selfHosted", l: "Self-hostable" },
              { v: c.avoidLockIn, k: "avoidLockIn", l: "Avoid vendor lock-in" },
            ].map((t) => (
              <button
                key={t.l}
                type="button"
                onClick={() => patch({ [t.k]: !t.v } as Partial<Case>)}
                aria-pressed={t.v}
                className={`rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
                  t.v ? "border-accent bg-bg-sunken text-fg" : "border-border text-fg-muted"
                }`}
              >
                {t.v ? "☑ " : "☐ "}{t.l}
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

      <section aria-live="polite" className="mt-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          Your stack — updates as you answer
        </p>
        <p className="mt-2 font-serif text-[20px] leading-snug">{result.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyText(`${window.location.origin}${window.location.pathname}?${encoded}`, "link")}
            className="rounded-md border border-border px-3.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            {copied === "link" ? "✓ Link copied" : "Copy link to this stack"}
          </button>
          <button
            type="button"
            onClick={() => void copyText(stackReportMarkdown(result), "report")}
            className="rounded-md border border-border px-3.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            {copied === "report" ? "✓ Report copied" : "Copy decision report"}
          </button>
        </div>

        <ol className="mt-5 space-y-px overflow-hidden rounded-lg border border-border">
          {result.picks.map((p) => (
            <li key={p.sectionSlug} className="bg-bg-elevated p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                  {p.section}
                </span>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10.5px] text-fg-muted">
                  {p.fitLabel}
                </span>
              </div>
              <Link href={p.url} className="mt-1 block font-serif text-[21px] font-medium hover:text-accent">
                {p.tool}
              </Link>
              {p.matches.length ? (
                <ul aria-label="Requirements this satisfies" className="mt-2 flex flex-wrap gap-1.5">
                  {p.matches.map((m) => (
                    <li
                      key={m}
                      className="rounded-full bg-bg-sunken px-2.5 py-0.5 text-[12px] text-fg-muted"
                    >
                      ✓ {m}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">
                <span className="font-medium text-fg">Why for you: </span>{p.why}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                <span className="font-medium text-fg">Watch out: </span>{p.watchOut}
              </p>
              {p.switchWhen ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-subtle">
                  Consider {p.alternative} when {p.switchWhen}.
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-3 rounded-lg border border-border p-5 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Estimated cost</p>
            <p className="mt-1 font-serif text-[22px]">
              ${result.costLow}–${result.costHigh}<span className="text-[13px] text-fg-muted">/mo</span>
            </p>
            <p className="mt-1 text-[11.5px] text-fg-subtle">
              {result.costDrivers.length
                ? `Driven by ${result.costDrivers.join(", ")} — the usage-billed picks.`
                : "No usage-billed picks in this stack."}{" "}
              Heuristic band, not a quote.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Confidence</p>
            <p className="mt-1 font-serif text-[22px]">{Math.round(result.confidence * 100)}%</p>
            <p className="mt-1 text-[11.5px] text-fg-subtle">Lower when constraints narrow the field.</p>
          </div>
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Biggest risk for your case</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{result.risk}</p>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-fg-subtle">
          Every why and watch-out comes from the tool&apos;s own use-when / skip-when.{" "}
          <Link href="/methodology" className="underline underline-offset-4 hover:text-fg">Read the method →</Link>
        </p>
      </section>
    </div>
  );
}
