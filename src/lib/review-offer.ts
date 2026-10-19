/**
 * The paid stack review.
 *
 * ## Why this offer and not a subscription
 *
 * `strategy/04-monetisation.md` is unambiguous: money must not change where a
 * tool sits, how tools are ranked, or what a comparison concludes. A
 * subscription implies the index degrades when you stop paying, which makes
 * every entry conditional on revenue — that is placement, by another route.
 *
 * So the thing being sold is **the author's judgement, applied to one team's
 * stack, as a dated document.** The line the strategy sets is the one this
 * respects exactly:
 *
 * > A review is a document with its author and date on it, not an edit to the
 * > index. A vendor paying for their layer to change is refused; a team paying
 * > for an assessment is not.
 *
 * Nothing on the index changes when this is bought. That is not a constraint
 * worked around — it is the only version of the offer that is defensible, and
 * it is also the version that sells, because the whole pitch of the free
 * product is neutrality and a buyer who suspects the index is for sale has
 * already stopped reading.
 *
 * ## The free tier is not a decoy
 *
 * `free` below is not a "lite" version of the paid thing. It is the index,
 * which is the actual product. The paid tier buys depth and a conversation,
 * not access. Any pricing page that implies the free product is crippled is
 * describing a different product than this one.
 *
 * ## Before this ships
 *
 * `priceUsd`, `deliveryDays` and `slots` are the commercial facts and are set
 * here rather than in prose so the page, the JSON-LD offer and the FAQ cannot
 * disagree. Set them to the real numbers before the route is indexed — a price
 * in structured data that does not match the page is a rich-results violation,
 * and this repo already fails builds on claims it cannot keep (§`brand.test.ts`).
 */

import { site } from "@/lib/site";

export const reviewOffer = {
  slug: "stack-review",
  name: "Stack Review",
  /**
   * Set `NEXT_PUBLIC_REVIEW_PRICE` rather than editing this number, so a price
   * change is an env change and shows up in the deploy diff instead of hiding
   * in a commit.
   */
  priceUsd: Number(process.env.NEXT_PUBLIC_REVIEW_PRICE ?? 490),
  currency: "USD",
  /** Working days from "context received" to "document delivered". */
  deliveryDays: 5,
  /** Deliberately capped. A capped book reads as a real constraint; an
   *  uncapped one reads as an AI service with a form in front of it. */
  slots: 6,

  /**
   * The risk reversal, and the single highest-leverage line on the page.
   *
   * It works because it is falsifiable and checkable: the reader can read the
   * delivered document and count. A refund guarantee against an unfalsifiable
   * promise ("satisfaction") is theatre; this one names a condition.
   *
   * It also inverts the objection it answers. "Why would I pay for an opinion"
   * is answered by "then you don't" — which is a much cheaper thing for a
   * sceptical engineer to accept than a refund policy.
   */
  guarantee: {
    headline: "If it does not name three changes worth more than the fee, you do not pay.",
    detail:
      "The deliverable is a written list of specific changes with a dollar figure against each one. If fewer than three of them are worth more than what you paid, tell me and I will refund it in full. No form, no retention process.",
  },

  /** What the money buys, stated as the delta from free rather than as a list. */
  promise:
    "You already know what the layers are. What you do not have is someone who has read all 112 entries, will not benefit from any of your choices, and can tell you which three of your decisions are costing you the most.",

  /** The three tiers. `free` is the product, not a trial. */
  tiers: [
    {
      id: "index",
      name: "The Index",
      priceUsd: 0,
      pitch: "Everything on this site, forever, for anyone.",
      features: [
        "All 112 entries, ordered by stack depth",
        "When to use it and when to skip it, per tool",
        "Symptom → ordered checklist routing",
        "Stack Builder and 3-way comparisons",
        "Every figure on the site fails the build if it is six months stale",
      ],
      cta: { label: "Start here", href: "/stack-builder" },
      featured: false,
    },
    {
      id: "review",
      name: "Stack Review",
      priceUsd: Number(process.env.NEXT_PUBLIC_REVIEW_PRICE ?? 490),
      pitch: "The author's judgement, applied to one team's stack.",
      features: [
        "Every layer you run, reviewed against the index — what you picked, what it costs, and whether it is the right call",
        "The three changes ranked by cost of delay, each with a dollar figure",
        "What to delete: the tools that pay for themselves by leaving",
        "A migration order that names what breaks at each step",
        "Written, dated, and attributable — not a call recording",
      ],
      cta: { label: "Book the review", href: "#book" },
      featured: true,
    },
    {
      id: "review-plus",
      name: "Review + Build Session",
      priceUsd: Number(process.env.NEXT_PUBLIC_REVIEW_PLUS_PRICE ?? 1450),
      pitch: "The document, then ninety minutes inside your actual repo.",
      features: [
        "Everything in Stack Review",
        "A 90-minute working session against your real config and dashboards",
        "We leave with the first two changes half-built, not just described",
        "Two weeks of async follow-up while you land them",
      ],
      cta: { label: "Book the session", href: "#book" },
      featured: false,
    },
  ] as const,

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
      body: "A first pass lands in your inbox. Push back on anything that does not match your reality — a review written once and delivered unrevised is a guess with a price tag.",
      meta: "2 days + one round",
    },
    {
      n: "04",
      title: "Delivered",
      body: "The dated document lands, with a call if you want one. The index is unchanged, because it was never for sale.",
      meta: `${deliveryDaysLabel()} working days total`,
    },
  ],

  /** Honest friction. Naming the objection pre-emptively beats answering it in the DMs. */
  faq: [
    {
      q: "Does buying this change anything on the site?",
      a: "No, and that is the reason the offer exists in this shape. No entry moves, no comparison changes, no ranking is for sale. If a vendor pays for their layer to change, the answer is no — that is the same answer before and after your payment.",
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
      q: "Is this a subscription?",
      a: "No, and it cannot become one. A subscription would make the index's quality conditional on paying, which is the one thing this site does not do.",
    },
  ],

  /**
   * Rendered directly under the price and repeated in the FAQ. FTC endorsement
   * guidance treats a disclosure the reader has to go looking for as no
   * disclosure, so it sits on the page carrying the link rather than on a
   * `/disclosure` route nobody visits — the requirement `strategy/04` §6 sets.
   */
  disclosure:
    "This review is a paid service. Nothing on this index is for sale: no entry is sponsored, no tool's position can be bought, and no comparison verdict changes because of who paid. Paying for a review changes nothing on this site.",
} as const;

function deliveryDaysLabel(): string {
  return String(reviewOffer.deliveryDays);
}

export type ReviewTier = (typeof reviewOffer.tiers)[number];
