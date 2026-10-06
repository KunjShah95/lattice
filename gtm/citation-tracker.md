# Lattice — citation tracker

*Monthly cadence, same calendar day each month. Run `npm run cite` in `site/`.*

**This file is now generated.** The query set lives in
`site/src/lib/citation-queries.mjs` and the monthly sections below are appended by
`site/scripts/cite-check.mjs`. Rows go to `citation-log.csv` beside this file —
20 queries × 5 engines × 2 runs is 200 rows, and 200 rows of markdown is not a
log anyone reads.

The reason it is generated rather than kept by hand: the tracker's own instructions
said *"anything that moves 3+ positions → double down on the tactic category it maps
to"*, and **there was no defined vocabulary for a tactic category anywhere.** Every
query now carries a `claim`, and the summary is grouped by claim. "Position moved 4
places" says nothing; "the `skip-when` queries moved and the `neutrality` queries did
not" says which half of the strategy is working.

## Running it

```bash
cd site
node scripts/cite-check.mjs --self-test     # exercises everything except the HTTP call
node scripts/cite-check.mjs                 # every provider you have configured
node scripts/cite-check.mjs --runs 3
node scripts/cite-check.mjs --query 17,20    # a subset
node scripts/cite-check.mjs --provider openai
node scripts/cite-check.mjs --dry-run       # validate config, write nothing
```

Providers need **both** a key and a model id, and neither is defaulted:

| Engine | Env |
| --- | --- |
| ChatGPT (web search) | `OPENAI_API_KEY` + `OPENAI_MODEL` |
| Claude (web search) | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` |
| Perplexity | `PERPLEXITY_API_KEY` + `PERPLEXITY_MODEL` |
| Gemini (grounded) | `GOOGLE_API_KEY` + `GOOGLE_MODEL` |

A default model id would be a guess, and a guess that rots silently is worse than a
clear "set this". With nothing configured the script writes **nothing** and exits 1 —
a run with no engines produces a table of empty cells, which reads like "not cited
yet" rather than "never ran".

## What it measures, and what it does not

- **Attribution, not traffic.** It asks engines, not readers.
- **Position over distinct hosts, not URLs.** An engine citing one page under three
  headings has cited one source, and counting them three times would make a deep
  site look better-placed for free.
- **The engine's own clock.** Answers are non-deterministic, so every run is logged
  rather than averaged away.
- **Whatever engines are configured.** A run covering two of five says so in the log
  header. It is not inferred from an empty cell.

## Reading the output

| Section | Read it for |
| --- | --- |
| **By claim** | Which half of the strategy is working. `skip-when` and `cross-layer` are the two load-bearing rows. |
| **By query** | Which specific query moved, and where it landed. |
| **Content gaps** | Tracked queries with **no page on this site** to be cited from. These need a page written, not a ranking improved — a different job with a different fix. `target: ""` in the query set marks exactly these. |
| **Movement** | Signed deltas against earlier runs. Positive means closer to the top. |

## The query set

26 queries. 20 carried over from the original table, unrewritten — these strings
*are* the measurement, so rewording one invalidates every prior month and starts a
new series. Six added under `skip-when`, because that is the claim
`strategy/02-unique-selling-points.md` §2 calls most defensible and one query was not
a measurement of it.

**No query names Lattice.** A query containing the brand measures whether the brand
is known, not whether the content is chosen. Those are different problems with
different fixes, and mixing them produces a number that responds to PR and not to
copy.

## Run log

*Nothing yet. The first real run needs at least one provider configured — run
`--self-test` first to confirm the pipeline works end to end.*