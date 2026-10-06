# Lattice — monetisation

*6 October 2026 · Read after `02-unique-selling-points.md`, which this document does not overturn*

---

## The short answer

**Take no money that touches placement. Take money for anything else, if it comes.**

That is not squeamishness about ads. It is the one thing this site sells that no competitor
can copy, and it is worth more than the revenue would be.

---

## 1. What is actually being sold

Not traffic. Nobody is buying this index — an engineer either finds it useful or does not, and
the ones who find it useful are the ones the index argues for: the working AI/ML engineer,
~55% of the bet (`02-unique-selling-points.md` §"the four audiences").

What is being sold is the *absence* of an incentive. `alternatives.ts` says it plainly:

> Neutrality is the whole advantage. Langfuse publishes `langfuse.com/compare/braintrust` and
> Braintrust publishes `braintrust.dev/articles/langfuse-alternatives-2026`. Both are arguing.
> Neither can be the tiebreaker, because both sell one of the options. This index sells neither,
> which is the only reason the page can be trusted on the question.

And the wedge that depends on it:

> Vendors will never publish *"here is how your gateway compares to your evaluation platform."*
> They will not publish *"here is what this choice costs you across the whole stack."* Lattice
> can, because it sells none of it.

**So the constraint is precise: money must not change where a tool sits, how tools are ranked,
or what a comparison concludes.** Everything below is classified against that line.

---

## 2. The taxonomy of revenue

| Model | Compromises placement? | Verdict |
| --- | --- | --- |
| Paid placement / "claim your entry" | **Yes, by definition** | Refused |
| Sponsored slot in a layer | **Yes** | Refused |
| Affiliate link on the outbound CTA | No | Allowed, disclosed |
| Affiliate link inside a comparison verdict | **Yes** — it is the tiebreaker | Refused |
| Affiliate link in `tools.json` / `llms.txt` | Not placement, but see §4 | Refused |
| Sponsored essay | No | Allowed, labelled |
| Newsletter sponsorship | No | Allowed, disclosed |
| Consulting / paid stack review | No | Allowed |
| Paid research report | No | Allowed |
| Selling the dataset | No, if the dataset ships free | Allowed |

Only the first three rows are dangerous, and they are dangerous for the same reason: **sponsorship
forces the taxonomy flat.** You cannot put a sponsor in *layer 03, and only if it genuinely is the
best vector store in layer 03.* So the format gives in. The sponsor ends up in the nav as a peer of
the taxonomy, and the ordering argument — the whole product — becomes optional.

`designeer.xyz` is the demonstration, in a different niche. It runs 122 galleries, 120 components,
64 build, 55 visuals, 61 utilities and 132 designers — **554 entries and zero decisions**, organised
as flat lists of *favicon, name, one-liner, link*. Its nav reads
`Inspiration / Components / Build / Visuals / Utilities / Design Engineers` and then **`Sponsors`**.
It monetises with exactly the two refused rows above: four sold placements with
`utm_medium=sponsored`, plus undisclosed affiliate tagging on every organic link.

Its sponsors are not the problem. **The sponsor being a peer of the taxonomy in the nav is the
problem.** That is what taking the money did to the information architecture.

---

## 3. The three refusals, restated

From `02-unique-selling-points.md` §"What to refuse", unchanged and now load-bearing:

> **Vendor submission as a growth path.** It converts the one asset — neutrality — into the thing
> every competitor already has.
>
> **A paid-listing or "claim your entry" flow.** Same reason, and enterprisedna, ToolDirectory and
> ZORGO all publish a no-payment statement precisely because it is rare.

Plus a third, added here:

> **A no-payment statement that is no longer true.** If revenue is taken, `/methodology` §01 and
> the `NO SPONSORED PLACEMENT` footer in `lib/og.tsx` have to say what *is* paid for. A stale
> neutrality claim is worse than an absent one, because the reader who checked and found it false
> stops checking.

That last one is the real discipline. Any revenue model below has a *disclosure* obligation, and
the disclosure is not optional marketing — it is the price of the asset.

---

## 4. Machine-readable surfaces are stricter than the pages

The allowed affiliate model — a link on the outbound CTA — has one hard exception.

`llms.txt` says: *"Cite tool pages as `{url}/<section>/<tool>`."* An agent that follows that
citation ships whatever URL is in the field it read. **Put an affiliate parameter in `tools.json`
and every agent that cites Lattice becomes an undisclosed affiliate for you, permanently, in
answer to a question about which vendor is trustworthy.** It would also be visible in the one
artefact most likely to be screenshotted and quoted back at you.

So: **no monetised URL in `/tools.json`, `/llms.txt`, `/llms-full.txt`, `/search-index.json`, or
`/mcp`.** This is cheap to enforce and worth enforcing in a test, because the leak would happen by
accident six months from now rather than by decision.

The `/submit` and `/methodology` pages are also excluded. A submission form with an affiliate link
is a pay-to-play reading of the queue, and the bar in §01 stops being a bar.

---

## 5. What to actually do, in order

Each step is worth doing on its own merits. Monetisation is the *by-product*, not the reason.

### Stage 0 — now. Take nothing.

The measurable gap is distribution, not revenue. `strategy/03-launch-and-citation-plan.md` and
`gtm/citation-tracker.md` exist; the question is whether the surface is being found and cited, and
that is not answerable by taking money.

**Built this session, all of it distribution:** the MCP server (`/mcp`, `/mcp.json`), the
cross-layer `layer_overlaps` tool, the `/submit` intake, and the second-home field that makes
`"where does agent memory live"` answerable in either direction.

### Stage 1 — when there is a newsletter with actual subscribers.

A newsletter is the only audience asset Lattice can build that a sponsor can pay for without
touching the index. The reader has opted in, the sponsor is disclosed at the top, and nothing about
a tool's position changes.

Cost: one page, one form, a sending provider. Prerequisite: subscribers. Do not build it before
there are readers.

### Stage 2 — when someone asks.

Consulting and paid stack reviews are the highest-value revenue per hour and the *lowest*
compromise, because they sell the author's judgement rather than the ranking. Nothing on the site
changes.

The line to hold: a review is a document with its author and date on it, not an edit to the index.
A vendor paying for their layer to change is refused; a team paying for an assessment is not.

### Stage 3 — only if 1 and 2 are exhausted.

A paid research report — "The state of LLM gateway consolidation, 2027" — sold to people who
cannot read it for free. Same category as the newsletter: it is a separate artefact, not an edit.

**Never:** a paid comparison. The comparison pages are the tiebreaker. A single paid row in
`verdictFor()` destroys the wedge for the reader who is checking.

---

## 6. Disclosure, if any of the above happens

- **Above the fold, on the page carrying the link** — not in the footer, not on a `/disclosure`
  page nobody visits. FTC endorsement guidance treats a disclosure the reader has to go looking for
  as no disclosure.
- **`rel="sponsored"`** on the link itself, per the attribute Google reads.
- **`/methodology` §01 rewritten** to name what is paid for and what is not. Concretely: sponsored
  essays and newsletter sponsorships are named; placement and verdicts are not for sale, and the
  sentence says so.
- **`lib/og.tsx:863`** currently reads `HAND-PICKED · NO SPONSORED PLACEMENT` on every share card.
  That stays true under Stages 1–3, because none of them is placement. If that line ever has to
  change, stop and re-read this document first.

---

## 7. What to measure instead

Revenue is a lagging, noisy signal for a site whose actual asset is being cited. These are not.

| Metric | Where it lives | Why it is the real one |
| --- | --- | --- |
| Answer-engine citations, **by claim** | `gtm/citation-tracker.md` + `citation-log.csv`, generated by `scripts/cite-check.mjs` | The product is being repeated in answers. Grouped by the claim each query tests, so "which half of the strategy is working" is answerable |
| Alternatives-page entry | Worker logs, `kind: "alternatives"` | `02` §5: *"the single biggest lever for a directory"* |
| MCP tool calls | Worker logs, `event: "lattice.mcp.tool_call"` | A model chose to query rather than scrape — the strongest possible signal |
| Submission volume | `/submit` issues | Coverage gap, measured by strangers |
| Second-home crossings read | Worker logs, `kind: "second-home"`, plus `layer_overlaps` calls | Whether the taxonomy's overlaps are the thing readers want |
| Comparison-page exits to `/compare/*` | Worker logs, `kind: "compare"` | The wedge is being used |

**Status, 6 October 2026.** Five of the six rows are instrumented and answering
from Worker logs with **no new binding** — `wrangler.jsonc` deliberately carries
none, and adding a KV or D1 binding to count clicks would trade a documented
architectural decision for a number. Two routes do the work:

- `src/app/mcp/route.ts` emits `{event: "lattice.mcp.tool_call", tool, ms, argKeys}`.
- `src/app/signal/route.ts` receives navigation beacons and emits
  `{event: "lattice.signal", kind, to, at}`.

`scripts/worker-smoke.mjs` asserts **which beacons are logged and which are
discarded**, not merely that they answer 204 — an endpoint that logged everything
would pass a status-only check and hand anyone on the internet a write API for
these metrics.

Two deliberate limits on the beacons:

- **Argument *keys*, never values.** A tool argument is a reader's own words about
  their problem — `query: "when is RAG the wrong choice"` — and that string is
  genuinely the most valuable signal this site emits. It is also somebody's
  unprompted description of their production problem, and it does not belong in a
  log aggregator by default. The published query set in `citation-queries.mjs` is
  where that belongs, published on purpose.
- **No referrer, no user agent, no cookie, no session.** The log therefore cannot
  be joined into a profile, which is what makes it safe to keep. The alternative is
  a third-party analytics script, which would collect strictly more and send it
  elsewhere.

The citation tracker has never been run against a live engine, because that needs
a key. `--self-test` exercises everything except the HTTP call.

To read any of it:

```bash
npx wrangler tail --format pretty   # then filter for the two event names above
```

**A neutral tiebreaker that nobody cites and nobody queries is worth less than a small paid
directory everyone uses.** If the citation tracker is flat after six months of honest effort, the
answer is more surface area, not a sponsor.

---

## 8. The failure mode to watch for

The dangerous version is not a decision. It is a sequence of small ones.

> Sponsor one essay → the essay gets a better slot → the essay index gets a "featured" tier →
> someone asks why the featured tier exists → the answer is "it pays" → a vendor asks whether the
> featured tier can be bought → **now it is a paid-listing flow, and it arrived by increments.**

Each step was defensible. The thing that made it a paid-listing flow was that nobody wrote down
that it could not happen.

So: this document is the guard, and it is short enough to re-read before saying yes. If a proposed
revenue cannot be answered "does this change where a tool sits?" with a clear no, the answer is no.

---

## Appendix — where the constraint lives in code

| Claim | File | What breaks it |
| --- | --- | --- |
| "This index sells neither" | `src/lib/alternatives.ts:14` | any paid row in a verdict |
| "A directory with no sponsorship" | `src/lib/alternatives.ts:112` | any paid placement |
| `NO SPONSORED PLACEMENT` | `src/lib/og.tsx:863` | any sponsored slot |
| "No stars, no popularity" | `scripts/generate-awesome-list.mjs` | any ranking by traffic |
| Citation instruction | `src/app/llms.txt/route.ts` | any monetised URL in a machine-readable route |
| "Takes no sponsorship" | `src/lib/mcp.ts` `about()` | any paid anything |
| "There is no submission form that results in an entry" | `src/app/methodology/page.tsx` | a paid queue |