/**
 * Public submission log.
 *
 * Entries are appended by the triage workflow when a submission PR merges.
 * Empty until the first accepted submission lands; the page renders that
 * honestly rather than inventing rows.
 */
export type SubmissionEntry = {
  tool: string;
  section: string;
  submitter: string;
  pr: string;
  mergedAt: string;
};

export const submissionLog: SubmissionEntry[] = [];