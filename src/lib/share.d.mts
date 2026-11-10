import type { Channel } from "./channel.mjs";

/** The query parameter `classifyArrival` reads first. */
export const SOURCE_PARAM: "src";

/**
 * Tag a URL (absolute, or a path starting with `/`) with the channel it is
 * about to be posted to. Replaces an existing tag; throws on an unknown channel.
 */
export function withSource(url: string, channel: Channel): string;

/** The X compose window, pre-filled with `text` and an absolute `url`. */
export function xIntentUrl(text: string, url: string): string;
