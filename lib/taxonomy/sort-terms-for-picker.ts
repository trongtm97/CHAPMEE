import { MAIN_GENRE_PIN_TO_END_SLUGS } from "@/lib/taxonomy/constants";
import type { TaxonomyType } from "@/types/taxonomy";

type SortableTerm = {
  name: string;
  slug: string;
  display_label?: string | null;
};

function labelOf<T extends SortableTerm>(term: T): string {
  return term.display_label ?? term.name;
}

/** Sắp A–Z (vi); với main_genre, ghim «Thể loại khác» xuống cuối. */
export function sortTaxonomyTermsForPicker<T extends SortableTerm>(
  terms: T[],
  type?: TaxonomyType
): T[] {
  const sorted = [...terms].sort((a, b) =>
    labelOf(a).localeCompare(labelOf(b), "vi", { sensitivity: "base" })
  );

  if (type !== "main_genre") {
    return sorted;
  }

  const pinned = new Set<string>(MAIN_GENRE_PIN_TO_END_SLUGS);
  const tail = sorted.filter((term) => pinned.has(term.slug));
  const body = sorted.filter((term) => !pinned.has(term.slug));
  return [...body, ...tail];
}
