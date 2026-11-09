/**
 * GENERATED: do not edit. Run `npm run generate` to rebuild.
 *
 * The corrections log for `/corrections`, derived from git history over
 * `src/lib/attributes.ts` and `src/lib/data.ts`. See
 * `scripts/build-corrections-log.mjs` for why it is generated and what counts.
 */

/** Newest first. */
export type Correction = {
  /** YYYY-MM-DD */
  date: string;
  /** The commit subject, verbatim. */
  title: string;
  /** Abbreviated SHA. */
  hash: string;
  /** Canonical commit URL. */
  url: string;
  /** Which dataset the commit touched. */
  touched: string[];
};

export const corrections: Correction[] = [
  {
    "date": "2026-11-05",
    "title": "feat: rebuild the site on one type, radius and contrast system",
    "hash": "74159e4",
    "url": "https://github.com/KunjShah95/lattice/commit/74159e4bfd24d7bb4855bb2ad1fe019aec4a2e86",
    "touched": [
      "the index"
    ]
  },
  {
    "date": "2026-10-18",
    "title": "Landing page as a tool directory; centred headings; no em dashes",
    "hash": "7c49fa4",
    "url": "https://github.com/KunjShah95/lattice/commit/7c49fa4965c721a5daf4837fbccdb9094845c280",
    "touched": [
      "classification",
      "the index"
    ]
  },
  {
    "date": "2026-10-06",
    "title": "Update .gitignore, package dependencies, and CI configuration; enhance accessibility and sitemap",
    "hash": "78f8be9",
    "url": "https://github.com/KunjShah95/lattice/commit/78f8be97b91484cfd75f0e86ed36984bfdd05cdf",
    "touched": [
      "classification",
      "the index"
    ]
  },
  {
    "date": "2026-10-05",
    "title": "Add rendering scripts for icons and SEO audit; update package.json and README",
    "hash": "3626745",
    "url": "https://github.com/KunjShah95/lattice/commit/3626745569a9fac096f66eb90bb22e280302a7d9",
    "touched": [
      "classification",
      "the index"
    ]
  },
  {
    "date": "2026-10-04",
    "title": "Cut the index by engineering role, and give every route a share card",
    "hash": "977ce50",
    "url": "https://github.com/KunjShah95/lattice/commit/977ce501c7a3ebab8dde43c5cc9041bad8074004",
    "touched": [
      "classification",
      "the index"
    ]
  },
  {
    "date": "2026-10-03",
    "title": "Add cross-layer comparisons and a public verification report",
    "hash": "f9765d4",
    "url": "https://github.com/KunjShah95/lattice/commit/f9765d4fd34f83ae59b93cff98020d64876d2864",
    "touched": [
      "classification",
      "the index"
    ]
  }
];
