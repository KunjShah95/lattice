import { describe, expect, it } from "vitest";
import { allTools, getCategory, stackLayers } from "./data";
import { getPost, posts, postsForSection, relatedPosts } from "./posts";

/**
 * Essays are the part of the site most likely to rot quietly: a backlink to a
 * renamed slug, a date that breaks sorting, a frontmatter field that a page
 * component dereferences without a null check.
 */

describe("post metadata", () => {
  it("has at least one post", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("gives every post a unique slug", () => {
    const slugs = posts.map((p) => p.meta.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const { meta } of posts) {
      expect(meta.slug, meta.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("sorts newest first", () => {
    const dates = posts.map((p) => p.meta.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("parses every date as a real ISO date", () => {
    for (const { meta } of posts) {
      expect(meta.date, meta.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(meta.date)), meta.date).toBe(false);
    }
  });

  it("writes a title and a standfirst", () => {
    for (const { meta } of posts) {
      expect(meta.title.length, meta.slug).toBeGreaterThan(5);
      expect(meta.dek.length, meta.slug).toBeGreaterThan(20);
    }
  });

  it("keeps meta descriptions within a sane length", () => {
    for (const { meta } of posts) {
      expect(meta.description.length, meta.slug).toBeGreaterThan(50);
      expect(meta.description.length, meta.slug).toBeLessThan(200);
    }
  });

  it("does not reuse one description across posts", () => {
    const descriptions = posts.map((p) => p.meta.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("declares a layer within the defined ramp", () => {
    for (const { meta } of posts) {
      expect(meta.layers.length, meta.slug).toBeGreaterThan(0);
      for (const layer of meta.layers) {
        expect(layer, `${meta.slug}: layer ${layer}`).toBeGreaterThanOrEqual(1);
        expect(layer, `${meta.slug}: layer ${layer}`).toBeLessThanOrEqual(
          stackLayers.length,
        );
      }
    }
  });

  it("points only at sections that exist", () => {
    for (const { meta } of posts) {
      expect(meta.sections.length, meta.slug).toBeGreaterThan(0);
      for (const slug of meta.sections) {
        expect(getCategory(slug)?.slug, `${meta.slug}: ${slug}`).toBe(slug);
      }
    }
  });

  it("links only to essays that exist", () => {
    const slugs = new Set(posts.map((p) => p.meta.slug));
    for (const { meta } of posts) {
      for (const slug of meta.related) {
        expect(slugs.has(slug), `${meta.slug} -> missing "${slug}"`).toBe(true);
      }
    }
  });

  it("does not relate a post to itself", () => {
    for (const { meta } of posts) {
      expect(meta.related, meta.slug).not.toContain(meta.slug);
    }
  });

  it("attaches a component to every post", () => {
    for (const post of posts) {
      expect(typeof post.Component, post.meta.slug).toBe("function");
    }
  });
});

describe("post lookups", () => {
  it("finds a post by slug", () => {
    expect(getPost("evals-are-the-asset")?.meta.title).toBeTruthy();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getPost("nope")).toBeUndefined();
  });

  it("lists the essays covering a section", () => {
    const found = postsForSection("inference-serving");
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) {
      expect(p.meta.sections).toContain("inference-serving");
    }
  });

  it("returns an empty list for a section with no essays", () => {
    expect(postsForSection("nope")).toEqual([]);
  });

  it("resolves the related posts of a post", () => {
    const related = relatedPosts("evals-are-the-asset");
    expect(related.length).toBeGreaterThan(0);
    for (const r of related) {
      expect(r.meta.slug).not.toBe("evals-are-the-asset");
    }
  });

  it("returns an empty list for an unknown post", () => {
    expect(relatedPosts("nope")).toEqual([]);
  });
});

describe("cross-linking", () => {
  it("gives every post at least one related essay, so no page is a dead end", () => {
    for (const { meta } of posts) {
      expect(meta.related.length, `${meta.slug} has no related posts`).toBeGreaterThan(0);
    }
  });

  it("has at least one essay for most sections", () => {
    // Off-stack reading material is allowed to have none.
    const uncovered = stackLayers
      .filter((c) => postsForSection(c.slug).length === 0)
      .map((c) => c.slug);
    expect(uncovered.length).toBeLessThanOrEqual(2);
  });

  it("keeps the essay count well below the tool count, so essays stay a minority", () => {
    // A directory that is mostly prose has stopped being a directory.
    expect(posts.length).toBeLessThan(allTools.length);
  });
});
