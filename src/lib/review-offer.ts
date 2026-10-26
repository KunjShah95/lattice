/**
 * The stack review: the maintainer's judgement, applied to one team's stack,
 * as a dated document.
 *
 * It is free and there is no paid tier. Money must not change where a tool
 * sits, how tools are ranked, or what a comparison concludes, and the
 * simplest way to keep that true is to take none.
 *
 * > A review is a document with its author and date on it, not an edit to the
 * > index.
 *
 * `deliveryDays` and `slots` are set here rather than in prose so the page and
 * the FAQ cannot disagree.
 */

import { site } from "@/lib/site";

export const reviewOffer = {
  slug: "stack-review",
  name: "Stack Review",
  /** Working days from "context received" to "document delivered". */
  deliveryDays: 5,
  /** Deliberately capped. A capped book reads as a real constraint; an
   *  uncapped one reads as an AI service with a form in front of it. */
  slots: 6,

  /** What a review adds to the index, stated as the delta rather than as a list. */
  promise:
    "You already know what the layers are. What you do not have is someone who has read all 112 entries, will not benefit from any of your choices, and can tell you which three of your decisions are costing you the most.",

  /** Bento grid. Each is one claim with a shape, not a feature bullet. */
  deliverables: [
    {
      title: "Layer-by-layer verdict",
      body: "Each layer you run, checked against what the index says it costs and what it is actually for. Keep, change, or delete — with the reason in one sentence.",
      span: "sm:col-span-2",
    },
    {
      title: "Ranked by cost of delay",
      body: "Three changes, ordered by what it costs you per month to keep delaying them. The number is on each one.",
      span: "",
    },
    {
      title: "The deletion list",
      body: "The tools paying for themselves by leaving. Usually the longest answer on the page, and usually the cheapest to act on.",
      span: "",
    },
    {
      title: "A cost model, not a pricing page",
      body: "Built from your actual usage where you can share it. Vendor pricing pages tell you the list price, which is the wrong number.",
      span: "sm:col-span-2",
    },
    {
      title: "Migration order",
      body: "Sequenced, with the failure mode named at each step. Most rewrites die on step three of an unordered plan.",
      span: "",
    },
    {
      title: "A document, dated",
      body: "Written, attributed and dated. It stands on its own six months later, which a call does not.",
      span: "",
    },
  ],

  steps: [
    {
      n: "01",
      title: "Send the context",
      body: "A short form: what you are building, what you run, what it costs you, and what prompted the question. Thirty minutes of your time, not a repository archaeology exercise.",
      meta: "30 min, yours",
    },
    {
      n: "02",
      title: "I read the actual stack",
      body: "Every tool you named, against its entry here and against the alternatives I rejected when the entry was written. The rejected alternatives are usually where the finding is.",
      meta: "2 days",
    },
    {
      n: "03",
      title: "Drafted, with your questions folded in",
      body: "A first pass lands in your inbox. Push back on anything that does not match your reality — a review written once and delivered unrevised is a guess.",
      meta: "2 days + one round",
    },
    {
      n: "04",
      title: "Delivered",
      body: "The dated document lands, with a call if you want one. The index is unchanged, because it is not for sale.",
      meta: "5 working days total",
    },
  ],

  /** Honest friction. Naming the objection pre-emptively beats answering it in the DMs. */
  faq: [
    {
      q: "Does asking for a review change anything on the site?",
      a: "No. No entry moves, no comparison changes, no ranking is for sale. If a vendor asks for their layer to change, the answer is no, and the same goes for anyone who has had a review.",
    },
    {
      q: "What if my stack is already fine?",
      a: "Then the review says so and names the two things worth watching. That is a real outcome and you keep the document. It is also the outcome I cannot fake, because the first thing a reader checks on a neutral index is whether the author can be trusted when the answer is unflattering.",
    },
    {
      q: "Who actually writes it?",
      a: site.maintainer
        ? `${site.maintainer}, who maintains the index and verifies its figures. Not an agency, not a contractor, and not a model reading the site back to you.`
        : "Whoever maintains the index — the same person who writes the entries and verifies the figures, named on the methodology page.",
    },
    {
      q: "What do you need from us?",
      a: "A description of the workload, the tools in play, and rough spend. Architecture diagrams and config files help a lot but are not required; most of the signal is in what you run and what it is costing.",
    },
    {
      q: "What does it cost?",
      a: "Nothing. There is no paid tier and no subscription. The index's quality is never conditional on paying, because nobody pays.",
    },
  ],

  /** Stated under the call to action, on the page carrying the link. */
  disclosure:
    "Reviews are free. Nothing on this index is for sale: no entry is sponsored, no tool's position can be bought, and no comparison verdict changes because of who asked for a review.",
} as const;

