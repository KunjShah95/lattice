/** Types for `origin.mjs`, which stays plain JS so bare-node scripts can import it. */
export declare const CANONICAL_HOST: string;
export declare const CANONICAL_ORIGIN: string;
export declare const LEGACY_HOST_PATTERNS: RegExp[];
export declare function resolveSiteUrl(value: string | undefined | null): string;
