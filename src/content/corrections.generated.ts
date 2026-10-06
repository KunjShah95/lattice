/**
 * GENERATED — do not edit. Run `npm run generate` to rebuild.
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
      "the index"
    ]
  },
  {
    "date": "2026-10-01",
    "title": "Classify every tool with structured attributes and an alternatives graph",
    "hash": "9381e64",
    "url": "https://github.com/KunjShah95/lattice/commit/9381e64e3cca20311de8807bc1c8bf1960c41b60",
    "touched": [
      "classification",
      "the index"
    ]
  },
  {
    "date": "2026-09-30",
    "title": "Add per-tool pages, a filterable all-tools view, a decision path, and RSS",
    "hash": "2b516cb",
    "url": "https://github.com/KunjShah95/lattice/commit/2b516cb51afed63ec4f2d2ddbbc3deda586f1f6c",
    "touched": [
      "the index"
    ]
  },
  {
    "date": "2026-09-30",
    "title": "checkpoint: uncommitted essays, diagrams, OG images, comparisons",
    "hash": "66b7533",
    "url": "https://github.com/KunjShah95/lattice/commit/66b753309febfc26877f8e946d70a6991e4ff058",
    "touched": [
      "the index"
    ]
  },
  {
    "date": "2026-09-30",
    "title": "Add MDX essay section, architecture diagrams, cover images, and SEO",
    "hash": "1d7c350",
    "url": "https://github.com/KunjShah95/lattice/commit/1d7c350d65aae7cdf6ff939463ccce35cc2162f4",
    "touched": [
      "the index"
    ]
  },
  {
    "date": "2026-09-30",
    "title": "Lattice: initial commit — AI tooling directory",
    "hash": "81f85fe",
    "url": "https://github.com/KunjShah95/lattice/commit/81f85fe8a9b1f30c00140ae41216ebba9326f967",
    "touched": [
      "the index"
    ]
  }
];
