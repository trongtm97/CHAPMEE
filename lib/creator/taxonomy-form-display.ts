import type { StoryFormTaxonomyBundle } from "@/lib/creator/get-story-form-taxonomy";

export function collectSelectedTaxonomyTagNames(
  bundle: StoryFormTaxonomyBundle
): string[] {
  const names: string[] = [];
  for (const type of ["subgenre", "trope_tag"] as const) {
    const selected = bundle.selectedByType[type] ?? [];
    const options = bundle.optionsByType[type] ?? [];
    for (const id of selected) {
      const term = options.find((row) => row.id === id);
      if (term?.name) {
        names.push(term.name);
      }
    }
  }
  return names;
}

export function getSelectedMainGenreTerm(bundle: StoryFormTaxonomyBundle) {
  return bundle.optionsByType.main_genre?.find((term) =>
    bundle.selectedByType.main_genre?.includes(term.id)
  );
}
