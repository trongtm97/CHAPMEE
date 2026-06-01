import Link from "next/link";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import { getTaxonomyTermsByIds } from "@/lib/taxonomy/queries";
import type { TaxonomyIndexConfig } from "@/lib/discovery/taxonomy-index-config";
import type { TaxonomyTerm } from "@/types/taxonomy";

type TaxonomyTermIndexPageProps = {
  config: TaxonomyIndexConfig;
  terms: TaxonomyTerm[];
};

async function loadParentGenreNames(terms: TaxonomyTerm[]) {
  if (terms.length === 0 || terms[0]?.type !== "subgenre") {
    return new Map<string, string>();
  }
  const parentIds = [
    ...new Set(terms.map((term) => term.parent_id).filter((id): id is string => Boolean(id)))
  ];
  if (parentIds.length === 0) {
    return new Map<string, string>();
  }
  const parents = await getTaxonomyTermsByIds(parentIds);
  const map = new Map<string, string>();
  for (const parent of parents.data) {
    if (parent.type === "main_genre") {
      map.set(parent.id, parent.name);
    }
  }
  return map;
}

export async function TaxonomyTermIndexPage({ config, terms }: TaxonomyTermIndexPageProps) {
  const parentNames = await loadParentGenreNames(terms);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="page-kicker">{config.kicker}</p>
        <h1 className="page-title">{config.title}</h1>
        <p className="page-copy max-w-2xl">{config.description}</p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <Link className="text-cyan-200 hover:text-cyan-100" href="/truyen">
            Danh mục truyện
          </Link>
          <Link className="text-cyan-200 hover:text-cyan-100" href="/kham-pha">
            Trung tâm taxonomy
          </Link>
        </div>
      </div>

      {terms.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[var(--surface)] p-4 text-sm text-zinc-400">
          {config.emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((term) => {
            const href = taxonomyTermPublicUrl(config.type, term.slug, true);
            if (!href) return null;
            return (
              <Link
                className="chap-card block space-y-1.5 p-4 transition hover:border-cyan-300/30"
                href={href}
                key={term.id}
              >
                <p className="text-base font-bold text-white">{term.name}</p>
                {term.description ? (
                  <p className="line-clamp-2 text-sm text-zinc-400">{term.description}</p>
                ) : null}
                <p className="text-xs text-zinc-500">
                  {term.parent_id && parentNames.get(term.parent_id)
                    ? `${parentNames.get(term.parent_id)} · `
                    : ""}
                  {(term.usage_count ?? 0) > 0
                    ? `${term.usage_count} truyện`
                    : "Khám phá"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
