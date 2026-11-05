/**
 * The review offer: a written review of a reader's stack by the maintainer.
 *
 * It sells nothing: reviews are free, and there is no paid tier. A review is
 * a document with a date on it; it never edits the index, a ranking or a
 * comparison verdict. `/review` says so above the fold.
 *
 * ## Booking
 *
 * `NEXT_PUBLIC_BOOKING_URL` (a Cal.com or Calendly link) is where every
 * "book" button goes. Unset, buttons fall back to the review request section
 * on `/review`, which routes to the contact channel: never a dead link.
 */
import { site } from "@/lib/site";

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
    a: "No. A review is judgement about your system, never placement. Rankings, layers and comparison verdicts are not for sale, and vendors cannot book a review of their own product.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Reviews are free. There is no paid tier, no subscription and nothing to upgrade to.",
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
