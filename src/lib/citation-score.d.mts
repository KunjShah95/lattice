export function hostOf(url: string): string | null;

export function latticePosition(
  sources: string[] | null | undefined,
  siteHost: string,
): number | null;

export function topSources(
  sources: string[] | null | undefined,
  n?: number,
): string[];

export function median(values: (number | string)[] | null | undefined): number | null;

export type LogRow = {
  query_id: number;
  claim: string;
  cited: boolean;
  position: number | string;
};

export type ClaimRate = {
  claim: string;
  runs: number;
  cited: number;
  rate: number;
  median: number | null;
};

export function claimSummary(
  rows: LogRow[] | null | undefined,
  claimIds?: string[],
): ClaimRate[];

export type TrackedQuery = {
  id: number;
  query: string;
  target: string;
  claim: string;
};

export function contentGaps(
  queries: TrackedQuery[] | null | undefined,
  rows: LogRow[] | null | undefined,
): { id: number; query: string; claim: string }[];

export function movement(
  rows: LogRow[] | null | undefined,
  previousRows: LogRow[] | null | undefined,
): { queryId: number; from: number | null; to: number | null; delta: number }[];