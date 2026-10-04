import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { ROLES, ROLE_IDS, roleMeta } from "@/lib/roles";
import { toolsByRole } from "@/lib/data";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";
import type { Role } from "@/lib/types";

/**
 * One page per specialisation, listing the tools that role owns.
 *
 * Grouped by section rather than by layer number, because the section is the
 * unit the rest of the site links with. Within each group the tools carry their
 * own use/skip pair, so the page answers "what should I look at for this job"
 * without a second click.
 *
 * The role's own question and the "skip when" halves are the two things here
 * that do not exist anywhere else in the index, and they are the reason to
 * build the page at all — a directory listing with a job title on it is what
 * every competitor already does.
 */
export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/roles/[role]">): Promise<Metadata> {
  const { role } = await params;
  const meta = roleMeta(role as Role);
  if (!meta) return { title: "Not found" };

  const tools = toolsByRole(meta.id);
  const names = tools.slice(0, 5).map((t) => t.name);
  // "In order" would be a promise the page does not keep — the list is grouped by
  // section, not ranked. A title that overstates what the page answers is the one
  // thing this site cannot afford, given the whole argument is about not
  // claiming more than the data supports.
  return {
    title: `${meta.title} tools — ${tools.length}, with when to skip each (${meta.short})`,
    description:
      `${tools.length} tools a ${meta.title.toLowerCase()} engineer is accountable for: ` +
      `${names.join(", ")} and more. What each is for, when to skip it, and which ` +
      `section of the stack it sits in.`,
    alternates: { canonical: `/roles/${meta.id}` },
    // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
    // canonical, and an inherited one points at the home page.
    openGraph: { url: absolute(`/roles/${meta.id}`) },
  };
}

export default async function RolePage({ params }: PageProps<"/roles/[role]">) {
  const { role: roleParam } = await params;
  const meta = roleMeta(roleParam as Role);
  if (!meta) notFound();

  const tools = toolsByRole(meta.id);
  const pageUrl = `${site.url}/roles/${meta.id}`;

  // Sections in stack order, off-stack last — the same order the stack diagram
  // uses, so a reader moving between the two views keeps their bearings.
  const bySection = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.category.slug;
    const list = bySection.get(key) ?? [];
    list.push(tool);
    bySection.set(key, list);
  }
  const groups = [...bySection.entries()].sort(
    (a, b) =>
      (a[1][0].category.layer ?? 99) - (b[1][0].category.layer ?? 99),
  );

  const siblings = ROLES.filter((r) => r.id !== meta.id);
  const multiRole = tools.filter((t) => t.roles.length > 1);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "CollectionPage",
                "@id": pageUrl,
                url: pageUrl,
                name: `${meta.title} tools`,
                description: `${meta.owns} ${meta.question}`,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
                mainEntity: { "@id": `${pageUrl}#tools` },
              },
              {
                "@type": "ItemList",
                "@id": `${pageUrl}#tools`,
                name: `Tools a ${meta.title} engineer owns`,
                numberOfItems: tools.length,
                itemListElement: tools.map((tool, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: tool.name,
                  url: `${site.url}/${tool.category.slug}/${tool.slug}`,
                })),
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Roles", path: "/roles" },
                { name: meta.title, path: `/roles/${meta.id}` },
              ]),
            ),
          ),
        }}
      />

      <header>
        <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
          <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            <li>
              <Link href="/" className="transition-colors hover:text-fg-muted">
                Index
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/roles" className="transition-colors hover:text-fg-muted">
                Roles
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-6">
          <h1 className="text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-[56ch] text-pretty text-[16px] leading-relaxed text-fg">
            {meta.owns}
          </p>
          <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-fg-muted">
            The question this role arrives with:{" "}
            <em className="text-fg-muted not-italic">“{meta.question}”</em>
          </p>
          <p className="mt-4 font-mono text-[11.5px] text-fg-subtle">
            {tools.length} tools · {groups.length} sections
            {multiRole.length
              ? ` · ${multiRole.length} also owned by another role`
              : ""}
          </p>
        </div>
      </header>

      {groups.map(([sectionSlug, sectionTools]) => {
        const section = sectionTools[0].category;
        return (
          <section key={sectionSlug} className="mt-12 border-t border-border pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-[3px] rounded-full"
                  style={layerStyle(section.layer)}
                />
                {section.title}
              </h2>
              <Link
                href={`/${section.slug}`}
                className="font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                all {section.tools.length} →
              </Link>
            </div>

            <ul className="mt-4 space-y-px">
              {sectionTools.map((tool) => (
                <li key={`${sectionSlug}-${tool.slug}`}>
                  <Link
                    href={`/${sectionSlug}/${tool.slug}`}
                    className="group -mx-2 block rounded-md px-2 py-3.5 transition-colors hover:bg-bg-sunken"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[15px] font-medium group-hover:text-accent">
                        {tool.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {tool.kind}
                      </span>
                      {tool.license ? (
                        <span className="font-mono text-[10px] text-fg-subtle">
                          {tool.license}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
                      <span className="text-fg-muted">Use when</span>{" "}
                      {tool.useWhen}
                    </p>
                    <p className="mt-0.5 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
                      <span className="text-fg-muted">Skip when</span>{" "}
                      {tool.skipWhen}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Cross-role tools: the rows worth surfacing twice, because they are the
          ones where two jobs disagree about who owns the decision. */}
      {multiRole.length ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Shared with another role
          </h2>
          <p className="mt-2 max-w-[60ch] text-pretty text-[13.5px] leading-relaxed text-fg-muted">
            These are part of what you own and part of what someone else owns.
            That overlap is where the interesting arguments happen — who decides
            the eval threshold, who carries the pager.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {multiRole.map((tool) => {
              const other = tool.roles.find((r) => r !== meta.id);
              const otherMeta = other ? roleMeta(other) : undefined;
              return (
                <li key={`${tool.category.slug}-${tool.slug}`}>
                  <Link
                    href={`/${tool.category.slug}/${tool.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-[2px] rounded-full"
                      style={layerStyle(tool.category.layer)}
                    />
                    {tool.name}
                    {otherMeta ? (
                      <span className="font-mono text-[10px] text-fg-subtle">
                        / {otherMeta.short}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Sibling roles, so no page is a dead end. */}
      <nav aria-label="Other roles" className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
          Other roles
        </h2>
        <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {siblings.map((r) => (
            <li key={r.id}>
              <Link
                href={`/roles/${r.id}`}
                className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
              >
                {r.title}
                <span className="font-mono text-[11px] text-fg-subtle">
                  {toolsByRole(r.id).length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-10 text-pretty text-[13px] leading-relaxed text-fg-subtle">
        Roles overlap on purpose, so these counts do not sum to the index. All{" "}
        {ROLE_IDS.length} specialisations are listed in{" "}
        <Link
          href="/roles"
          className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
        >
          /roles
        </Link>
        .
      </p>
    </div>
  );
}
