/**
 * JSON-LD serialisation.
 *
 * Script-injection safety: `<` is escaped so a string containing `</script>`
 * cannot terminate the block early. Everything we serialise is our own
 * content, but the escape is cheap and removes the whole class of problem.
 */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Breadcrumb trail for a nested route. */
export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path}`,
    })),
  };
}
