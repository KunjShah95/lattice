import type { Metadata } from "next";
import Link from "next/link";
import { ROLES } from "@/lib/roles";
import { toolsByRole, toolCount } from "@/lib/data";
import { site } from "@/lib/site";
import {
  absolute,
  collectionPageNodes,
  indexCrumbs,
} from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Tools by engineering role",
  description:
    `The ${site.name} index cut by engineering specialisation rather than stack ` +
    `layer: what an ML platform, AI infrastructure, data, applied or production ` +
    `engineer owns, and the ${toolCount} tools that answer to it.`,
  alternates: { canonical: "/roles" },
  openGraph: { url: absolute("/roles") },
};

/**
 * The specialisation axis, as a landing page.
 *
 * Every other view on this site starts from the tool or the symptom. This one
 * starts from the person, because that is how a reader who already knows their
 * job describes what they want: "I own the eval harness", not "I am looking for
 * something in layer 7". It is the only index here that can answer that in one
 * hop.
 */
export default function RolesIndexPage() {
  const pageUrl = `${site.url}/roles`;

  // The overlap figure, stated rather than implied. Roles are multi-valued, so
  // the five lists sum to more than the index; a reader who adds the counts and
  // gets a number that does not match will assume one of the lists is wrong.
  const tagged = ROLES.reduce((n, r) => n + toolsByRole(r.id).length, 0);
  const overlap = tagged - toolCount;

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name: "Tools by role",
              description: metadata.description as string,
              listId: "roles",
              crumbs: indexCrumbs("By role", "/roles"),
              // An ItemList of the roles, each linking to the collection page
              // that holds its tools. Without this the page is prose to a
              // crawler and the five sub-pages are undiscoverable from it.
              items: ROLES.map((r) => ({
                name: r.title,
                description: r.owns,
                url: `${pageUrl}/${r.id}`,
              })),
            }),
          ),
        }}
      />

      <header className="mb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {ROLES.length} specialisations · {toolCount} tools
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Start from what you own.
        </h1>
        <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The stack diagram answers <em>where things sit</em>; this answers{" "}
          <em>what you are accountable for</em>. Each specialisation lists the
          tools that role actually owns, grouped by the layer they live in — so
          you can see both at once, and see which cross-layer tools (the gateway,
          the eval harness, the orchestrator) land in more than one column.
        </p>
      </header>

      <ul className="space-y-px">
        {ROLES.map((role) => {
          const tools = toolsByRole(role.id);
          const layers = [...new Set(tools.map((t) => t.category.layer))].sort(
            (a, b) => (a ?? 99) - (b ?? 99),
          );
          return (
            <li key={role.id}>
              <Link
                href={`/roles/${role.id}`}
                className="group -mx-2 block rounded-md px-2 py-5 transition-colors hover:bg-bg-sunken"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-serif text-[22px] font-medium tracking-[-0.01em] group-hover:text-accent">
                    {role.title}
                  </h2>
                  <span className="font-mono text-[11px] text-fg-subtle">
                    {tools.length} tools · {layers.filter((l) => l != null).length}{" "}
                    layers
                  </span>
                </div>
                <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg">
                  {role.owns}
                </p>
                <p className="mt-1 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
                  <span className="text-fg-subtle">Asks</span>{" "}
                  {role.question}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="editorial-justify mt-10 border-t border-border pt-6 text-pretty text-[13.5px] leading-relaxed text-fg-subtle">
        Roles are assigned by what the tool is <em>for</em>, not by who vendors
        it, and a tool can belong to two — an eval framework really is part of
        what a platform engineer owns and part of what an applied engineer owns.
        That makes these counts overlap by{" "}
        <span className="text-fg-muted">
          {overlap} {overlap === 1 ? "entry" : "entries"}
        </span>
        , so the five totals sum to {tagged} rather than {toolCount};{" "}
        <span className="text-fg-muted">that is the honest reading</span>, not a
        rounding error. See the{" "}
        <Link
          href="/methodology"
          className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
        >
          method
        </Link>{" "}
        for how the index decides anything at all.
      </p>
    </div>
  );
}