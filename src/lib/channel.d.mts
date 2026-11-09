export type Channel = "ai" | "search" | "social" | "direct" | "referral";

export const CHANNELS: Channel[];

/** Classify a bare hostname into a channel. */
export function channelForHost(host: string | null | undefined): Channel;

/**
 * The channel of a landing, from `document.referrer`, `location.search` and the
 * site's own hostname. Null for a same-origin hop, which says nothing about
 * where the reader came from.
 */
export function classifyArrival(
  referrer: string | null | undefined,
  search: string | null | undefined,
  ownHost: string | null | undefined,
): Channel | null;

export function isChannel(value: unknown): value is Channel;
