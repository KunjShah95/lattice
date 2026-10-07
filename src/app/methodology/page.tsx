import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageHeader } from "@/components/info-page";
import { BANDS } from "@/lib/layer";
import { AS_OF } from "@/lib/attributes";
import { allTools, categories, stackLayers, toolCount } from "@/lib/data";
import { resolvedComparisons } from "@/lib/comparisons";
import { posts } from "@/lib/posts";
import { glossary } from "@/lib/glossary";
import { CoverageBars } from "@/components/ui/coverage-bars";
import { extremeLayers, joinNames, layerCoverage } from "@/lib/coverage";
import { site } from "@/lib/site";
import { absolute, breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

/**
 * /methodology — what this index claims, how it is checked, and what it
 * gets wrong.
 *
 * This page exists because of a specific and measured behaviour: a stated
 * caveat is a citability signal. It marks a page as non-commodity, and an
 * answer engine that is otherwise summarising nine vendor pages has a reason
 * to name this one instead. The one practitioner who broke through reported
 * the same thing in different words — his note that he does not treat GitHub
 * stars as quality "because they can be inflated" was, by his account, what
 * got him cited where comparable roundups were not.
 *
 * It is also the honest thing to publish. Every comparable directory in this
 * category claims curation and none of them say what their curation misses.
 * The build guards in `data.ts` are real and invisible; this makes them
 * visible, and puts the weaknesses next to them where a sceptical reader can
 * weigh both.
 *
 * The limitations section is the point of the page. A methodology that lists
 * no limitations has not been stress-tested.
 */

export const metadata: Metadata = {
  title: "How the index is built",
  description:
    "How the Lattice index is compiled and checked — the inclusion rules, the six-month build gate on licence and cost data, and an explicit list of what this index gets wrong or leaves out.",
  alternates: { canonical: "/methodology" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/methodology") },
};

/** Count of entries whose licence could not be confirmed rather than guessed. */
const unconfirmedLicences = allTools.filter(
  (t) => t.kind !== "reading" && !t.license,
).length;

const selfHosted = allTools.filter((t) => t.deployment === "self-hosted").length;

/**
 * Coverage, derived. The limitation below used to name its thinnest layers by
 * hand and was wrong by its own dataset — Prompts, at 9, is thinner than Workflows
 * at 10 — so the sentence and the chart now both read from `lib/coverage`.
 */
const coverage = layerCoverage();
const fullest = extremeLayers(coverage, "fullest");
const thinnest = extremeLayers(coverage, "thinnest");

export default function MethodologyPage() {
  const pageUrl = `${site.url}/methodology`;

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      {/* A WebPage, not a CollectionPage: this page is *about* the index and
          lists nothing, so declaring a mainEntity it does not have would be the
          kind of small false claim the index is arguing against.
          `about: { @id: organization }` is the load-bearing line — it ties the
          methodology to the thing it describes, which is how a reader (or an
          engine) arrives at "this index states its own limits" rather than at a
          page about nothing in particular. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: "Methodology",
                description: metadata.description as string,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                about: { "@id": ids.organization },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Methodology", path: "/methodology" },
              ]),
            ),
          ),
        }}
      />

      <InfoPageHeader
        breadcrumb="Methodology"
        eyebrow={<>Methodology · v1 · dataset as of {AS_OF}</>}
        title="How this index is compiled, and where it is wrong."
        lede={
          <>
            {toolCount} tools across {categories.length} sections,{" "}
            {resolvedComparisons.length} head-to-head comparisons and {posts.length}{" "}
            essays. The selection, the checks, and — in the last section —{" "}
            <span className="text-fg">
              the specific ways a reader should distrust this page
            </span>
            .
          </>
        }
      />

      {/* ------------------------------------------------------------ 1 */}
      <Section n="01" title="What gets included">
        <p className="editorial-justify">
          An entry qualifies if it is infrastructure — something a production AI
          system runs on — rather than a product a person uses. That single rule
          is what separates this list from the directories that index
          applications, and it excludes most of what is called an AI tool.
        </p>
        <p className="editorial-justify">
          Reading material, courses and archives sit outside the stack
          deliberately. They are listed in{" "}
          <Link href="/learning-reference" className="underline decoration-border-strong underline-offset-4 hover:decoration-accent">
            Learning &amp; Reference
          </Link>
          , drawn detached from the stack frame, because a paper about attention is
          not a layer of your system.
        </p>
        <p className="editorial-justify">
          Tools are <strong>hand-picked, not submitted</strong>. There is no
          submission form that results in an entry. This is a real constraint on
          coverage, and it is the source of most of what follows in{" "}
          <em>Where this index is wrong</em>.
        </p>
      </Section>

      {/* ------------------------------------------------------------ 2 */}
      <Section n="02" title="Why the order is the point">
        <p className="editorial-justify">
          Sections are ordered as a dependency chain, layer 1 being the substrate
          everything else runs on. You cannot tune weights before you serve them.
          You cannot evaluate what you cannot observe. The order is the argument;
          the categories are a consequence of it.
        </p>
        <p className="editorial-justify">
          Most directories in this space have the right categories and no order —
          which means they cannot answer the question a reader actually has,
          which is <em>where does this sit relative to what I already run</em>.
          That question is what{" "}
          <Link href="/#start-here" className="underline decoration-border-strong underline-offset-4 hover:decoration-accent">
            Start Here
          </Link>{" "}
          is for.
        </p>
        <p className="editorial-justify">
          The nine layers also collapse into three bands. This is a convenience
          for the palette, but it is a claim too: most production problems live
          in exactly one band.
        </p>
        <p className="editorial-justify">
          A second axis cuts across all of it: <Link
            href="/roles"
            className="underline decoration-border-strong underline-offset-4 hover:decoration-accent"
          >
            specialisation
          </Link>
          . Layers describe where a tool sits; a role describes what a person is
          accountable for, and those are not the same partition — a platform
          engineer owns routing <em>and</em> orchestration <em>and</em> the evals that
          prove the whole thing works, which crosses all three bands. So roles are
          assigned separately, deliberately overlap, and no tool carries more than
          two. A seniority axis (senior, staff, principal) would not work: those
          people need the same tools, so it would filter to nothing while looking
          like it worked.
        </p>
        <ul className="mt-5 space-y-px border-y border-border">
          {BANDS.map((band) => (
            <li key={band.id} className="flex gap-3 py-2.5">
              <span
                aria-hidden="true"
                className="mt-1.5 h-3 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: `var(--band-${band.id})` }}
              />
              <span className="min-w-0 text-[13.5px] leading-relaxed text-fg-muted">
                <strong className="font-medium text-fg">
                  Band {band.roman} · {band.title}
                </strong>{" "}
                — layers {band.layers.join(", ")}, covering{" "}
                {band.layers
                  .map(
                    (l) =>
                      stackLayers.find((c) => c.layer === l)?.short ?? String(l),
                  )
                  .join(", ")}
                . Usually sounds like {band.sounds}.
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------------------------ 3 */}
      <Section n="03" title="The use-when / skip-when pair">
        <p className="editorial-justify">
          Every tool carries two sentences, and the second is the one that
          matters. Not a rating, not a star count, not a score out of ten — a
          statement of the condition under which you should pick something else.
        </p>
        <p className="editorial-justify">
          This is deliberate asymmetry. A directory that only tells you when to
          use something has no reason to tell you the truth about anything else.
          The <em>skip when</em> line is what makes the <em>use when</em> line
          worth reading, and it is the half that essentially nobody else
          publishes.
        </p>
        <p>
          Both lines are written to be falsifiable. If a sentence here cannot be
          checked against a real deployment, it does not ship.
        </p>
      </Section>

      {/* ------------------------------------------------------------ 4 */}
      <Section n="04" title="The build fails when data goes stale">
        <p className="editorial-justify">
          Licence, cost and deployment facts rot, and a confident stale figure is
          worse than an absent one — it changes architecture. So this index is
          gated: if any entry&rsquo;s facts were last confirmed more than six months
          ago, the build{" "}
          <strong className="text-fg">throws</strong> and the site does not
          deploy.
        </p>
        <p className="editorial-justify">
          That is a different class of claim from &ldquo;updated daily&rdquo;, because it is
          enforced rather than asserted, and it produces a receipt — the build
          log. The date on each tool page is the date of a check that
          demonstrably happened.
        </p>
        <p className="editorial-justify">
          Every one of the {toolCount} entries was last confirmed in{" "}
          <strong className="text-fg">{AS_OF}</strong>.{" "}
          {selfHosted} of them are self-hostable. {unconfirmedLicences === 0
            ? "Every licence is confirmed rather than guessed."
            : `${unconfirmedLicences} licence values could not be confirmed and are recorded as unknown, because a guessed licence is worse than an absent one.`}
        </p>
        <p className="editorial-justify">
          The receipt is public. Every build writes{" "}
          <a
            href="/verification.json"
            className="font-mono text-[0.92em] text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent"
          >
            /verification.json
          </a>{" "}
          — the rule, the date it was enforced, and each entry&rsquo;s check date
          and the month it expires. Nothing in it is hand-maintained; it is
          generated from the same dataset the guard reads. The dataset itself is
          published as{" "}
          <a
            href="/tools.json"
            className="font-mono text-[0.92em] text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent"
          >
            /tools.json
          </a>{" "}
          for anything that would rather parse than scrape.
        </p>
      </Section>

      {/* ------------------------------------------------------------ 5 */}
      <Section n="05" title="Where this index is wrong">
        <p>
          The section is the point of the page. A methodology that lists no
          limitations has not been stress-tested.
        </p>
        <ul className="mt-5 space-y-4">
          <Limitation title="It is small on purpose, which is also small.">
            {toolCount} entries against directories publishing 50,000, 30,925 and
            2,840. Hand-picking is a reason for that and not an apology for it,
            but the honest consequence is that{" "}
            <strong className="text-fg">whole projects will be missing</strong>{" "}
            — including good ones. The index is biased toward what is
            well-documented and English-language-first.
          </Limitation>

          <Limitation title="Nothing here is benchmarked.">
            No figure on this site was measured by Lattice. Throughput, recall,
            latency and cost claims in the comparison tables are{" "}
            <strong className="text-fg">reported by vendors or by third parties</strong>
            , read from primary documentation, and were correct when read. Where
            those sources disagree, the disagreement is not reproduced. Treat
            every number as a pointer to something you should verify yourself.
          </Limitation>

          <Limitation title="Popularity is not used as a signal at all.">
            Ordering by stack depth instead of popularity is the core position
            and it has a real cost: it is blind to momentum. A tool that is
            obviously going to be important next year can be absent today,
            because nobody has written the article explaining why yet.
          </Limitation>

          <Limitation title="The layer model is a simplification.">
            Real systems are not nine clean bands. Teams routinely couple layers
            the index treats as separate, and several entries straddle two. The
            ordering is a useful default, not a constraint on reality.
          </Limitation>

          <Limitation title="Role assignments are judgement calls, and the overlap is the point.">
            Nobody can derive which job owns a tool from the tool itself. An eval
            framework genuinely belongs to a platform engineer and an applied
            engineer, which is why roles overlap and the counts on{" "}
            <Link href="/roles" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
              /roles
            </Link>{" "}
            do not sum to {toolCount}. The cap of two per tool is enforced at
            build time precisely because an axis without a cap decays into a
            synonym for &ldquo;popular&rdquo;. Treat the assignment as an opening
            argument and tell us where it is wrong.
          </Limitation>

          <Limitation title="Coverage is uneven by construction.">
            Layers with more public writing about them get better entries, and an
            entry count is the crude, mechanical proxy for that. By count,{" "}
            {joinNames(fullest.map((r) => r.short))}{" "}
            {fullest.length > 1 ? "are" : "is"} the fullest layer
            {fullest.length > 1 ? "s" : ""} and{" "}
            {joinNames(thinnest.map((r) => r.short))}{" "}
            {thinnest.length > 1 ? "are" : "is"} the thinnest. The thin layers
            are where a vendor&rsquo;s marketing is most likely to outrun an
            independent reading; the counts are charted below so this can be
            checked rather than taken on trust.
          </Limitation>

          <Limitation title="Freshness is not the same as accuracy.">
            The six-month gate guarantees someone looked. It does not guarantee
            they were right, and it cannot detect a tool that was never honest
            about its licence in the first place.
          </Limitation>

          <Limitation title="There is no ranking, and that is a choice.">
            You will not find a &ldquo;best X&rdquo; page here. A ranking is a claim that
            one tool is best for a reader whose constraints are unknown, which is
            a claim nobody can verify. Where a comparison names one option, it
            is because the constraints were specific enough to justify it.
          </Limitation>
        </ul>

        {/* The evidence for the coverage limitation. In stack order, not sorted:
            the order of the layers is the argument and a chart that re-ranked
            them would be the one place this index ranks something. */}
        <figure className="mt-8">
          <figcaption className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Entries per layer, in stack order
          </figcaption>
          <CoverageBars rows={coverage} className="mt-4" />
          <p className="mt-3 text-[12.5px] leading-relaxed text-fg-subtle">
            A count of entries, not a measure of quality. Off-stack reading
            material is excluded.
          </p>
        </figure>
      </Section>

      {/* ------------------------------------------------------------ 6 */}
      <Section n="06" title="Corrections">
        <p className="editorial-justify">
          Two kinds of correction are treated as urgent. A wrong licence or a
          wrong deployment model, because either can change an architecture
          decision. A missing tool that has become load-bearing, because the
          index&rsquo;s value is proportional to its coverage of what matters.
        </p>
        <p className="editorial-justify">
          Slower to change, honestly: the use-when and skip-when lines, because
          those are judgements and re-litigating them on request would make them
          worse. If one is wrong, the argument for why is usually in{" "}
          <Link href="/blog" className="underline decoration-border-strong underline-offset-4 hover:decoration-accent">
            an essay
          </Link>
          , and disagreeing with the argument is a better route than asking for
          the conclusion to be edited.
        </p>
        <p>
          <a
            href={`mailto:${site.contact.email}`}
            className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
          >
            Corrections and suggestions
          </a>{" "}
          — and note that a submission only becomes an entry if it clears the
          same bar as everything already here.
        </p>
      </Section>

      <p className="mt-14 border-t border-border pt-6 text-[12.5px] leading-relaxed text-fg-subtle">
        The full dataset as plain text is at{" "}
        <Link href="/llms.txt" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
          /llms.txt
        </Link>
        . {glossary.length} terms are defined in the{" "}
        <Link href="/glossary" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
          glossary
        </Link>
        , the same {toolCount} tools can be cut by{" "}
        <Link href="/roles" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
          role
        </Link>
        , and each tool page states its licence, cost, deployment and the
        date those facts were last confirmed.
      </p>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-border pt-7">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
          {n}
        </span>
        <h2 className="font-serif text-[22px] font-medium leading-snug tracking-[-0.015em]">
          {title}
        </h2>
      </div>
      <div className="prose-lattice mt-4 max-w-[62ch]">{children}</div>
    </section>
  );
}

function Limitation({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="border-l-2 border-border-strong pl-4">
      <strong className="block text-[14.5px] font-medium text-fg">{title}</strong>
      <p className="editorial-justify mt-1 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
        {children}
      </p>
    </li>
  );
}