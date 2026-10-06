export const ALLOWED_EVENTS: string[];
export const allowedEvents: string[];
export const MAX_SIGNAL_BYTES: number;

/**
 * Parse a beacon body, or return null to reject it silently.
 *
 * Both `from` and `to` are required. Null means "do not log and do not tell
 * anyone" — a beacon has no caller worth informing, and a 4xx would appear as
 * failed requests in the analytics this route exists to produce.
 */
export function parseSignal(
  raw: string | null | undefined,
): { event: string; from: string; to: string } | null;