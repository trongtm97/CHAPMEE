import type { TaxonomyType } from "@/types/taxonomy";

/** Child term types that may reference a parent term (usually main_genre). */
export const TAXONOMY_CHILD_TYPES: TaxonomyType[] = ["subgenre"];

export function taxonomyParentTypeFor(childType: TaxonomyType): TaxonomyType | null {
  if (childType === "subgenre") return "main_genre";
  return null;
}

export function filterTermsByParent<T extends { parent_id: string | null }>(
  terms: T[],
  parentId: string | null | undefined
): T[] {
  if (!parentId) {
    return [];
  }
  return terms.filter((term) => term.parent_id === parentId);
}
