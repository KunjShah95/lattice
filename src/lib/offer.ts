/**
 * The paid offer: stack reviews and architecture help from the maintainer.
 *
 * This is the one thing Lattice sells, and it is on the allowed side of the
 * line in `strategy/04-monetisation.md` §2: it sells the author's judgement,
 * not a tool's position. A review is a document with a date on it; it never
 * edits the index, a ranking or a comparison verdict. `/review` says so above
 * the fold, as §6 requires of anything paid.
 *
 * ## Free during early access
 *
 * Every tier ships with `price: null`, which renders as "Free during early
 * access". To start charging, set a number here: nothing else changes. The
 * layout is a pricing table from day one so that flip is a data edit, not a
 * redesign, and so early readers see the shape of what they are getting.
 *
 * ## Booking
 *
 * `NEXT_PUBLIC_BOOKING_URL` (a Cal.com or Calendly link) is where every
 * "book" button goes. Unset, buttons fall back to the review request section
 * on `/review`, which routes to the contact channel: never a dead link.
 */
import { site } from "@/lib/site";

export type Tier = {
  id: "review" | "session" | "advisory";
  name: string;
  /** One line under the name: who it is for. */
  forWho: string;
  /** USD. `null` = free during early access. */
  price: number | null;
  /** Shown after the price, e.g. "one-off" or "/ month". */
  cadence: string;
  /** What arrives, in the order the client receives it. */
  includes: string[];
  turnaround: string;
  /** The tier the page leads with. Exactly one. */
  featured?: boolean;
  cta: string;
};

export const TIERS: Tier[] = [
  {
    id: "review",
    name: "Stack Review",
    forWho: "You have a stack, or a plan for one, and want a second opinion.",
    price: null,
    cadence: "one-off",
    includes: [
      "Written review of your current or planned AI stack, layer by layer",
      "What to keep, what to swap, and what you are missing",
      "Cost band for your traffic, and the biggest risk in it",
      "Every recommendation tied to its trade-off, not a vendor",
    ],
    turnaround: "3 working days",
    cta: "Request a review",
  },
  {
    id: "session",
    name: "Architecture Session",
    forWho: "You are about to commit to a design and want it pressure-tested live.",
    price: null,
    cadence: "one-off",
    includes: [
      "Everything in Stack Review",
      "60-minute live call on your system with the maintainer",
      "Decision record (ADR) you can commit to your repo",
      "A follow-up review two weeks later",
    ],
    turnaround: "Within a week",
    featured: true,
    cta: "Book a session",
  },
  {
    id: "advisory",
    name: "Advisory",
    forWho: "You are shipping AI to production and want an engineer on call.",
    price: null,
    cadence: "/ month",
    includes: [
      "Async access for architecture and tooling questions",
      "Monthly review of what changed in your stack and in the market",
      "Eval, cost and reliability check-ins",
      "Cancel any month",
    ],
    turnaround: "Replies within 1 working day",
    cta: "Talk about advisory",
  },
];

/** "Free" while early access lasts; "$1,500" once priced. */
export function priceLabel(t: Tier): string {
  return t.price === null ? "Free" : `$${t.price.toLocaleString("en-US")}`;
}

export const isEarlyAccess = TIERS.every((t) => t.price === null);

const BOOKING = process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || null;

/** Where a "book" button goes: the scheduler when configured, else the request section. */
export const bookingHref = BOOKING ?? "/review#request";
export const bookingIsExternal = Boolean(BOOKING);

/** The contact channel a request goes to when there is no scheduler. */
export const requestChannel = { href: site.contact.href, label: site.contact.label };

/** Questions a buyer asks before booking, answered plainly. */
export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Will a review change where a tool sits in the index?",
    a: "No. Reviews sell judgement about your system, never placement. Rankings, layers and comparison verdicts are not for sale, and vendors cannot book a review of their own product.",
  },
  {
    q: "Why is it free right now?",
    a: "Early access. The first reviews shape the format, so they cost nothing in exchange for honest feedback. Prices will be published on this page before that changes; nothing you book now is charged retroactively.",
  },
  {
    q: "Who does the review?",
    a: `${site.maintainer ?? "The maintainer"}, who writes and verifies the index. Not a contractor, not a template.`,
  },
  {
    q: "What do you need from me?",
    a: "A short description of what you are building, rough traffic, and the tools you run or are considering. A diagram helps but is not required. Nothing confidential is needed for a useful review.",
  },
  {
    q: "Do you recommend tools you earn money from?",
    a: "No. There are no affiliate links in reviews and no paid relationships with the vendors in the index.",
  },
];
