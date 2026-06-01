import { getSelectableTaxonomyTermsForCreator } from "@/lib/taxonomy/queries";
import { PRESENTATION_MODE_SLUGS } from "@/lib/taxonomy/constants";
import { presentationModeDescription } from "@/lib/taxonomy/presentation-labels";
import type { TaxonomyType } from "@/types/taxonomy";

export type StudioTaxonomyFilterOption = {
  id: string;
  label: string;
  slug: string;
};

export type StudioTaxonomyFilterOptions = {
  contentTypes: StudioTaxonomyFilterOption[];
  mainGenres: StudioTaxonomyFilterOption[];
  subgenres: StudioTaxonomyFilterOption[];
  ageRatings: StudioTaxonomyFilterOption[];
  trope_tag: StudioTaxonomyFilterOption[];
  presentationModes: Array<{ slug: string; label: string }>;
};

export async function getStudioTaxonomyFilterOptions(): Promise<StudioTaxonomyFilterOptions> {
  const types: TaxonomyType[] = [
    "content_type",
    "main_genre",
    "subgenre",
    "age_rating",
    "trope_tag"
  ];

  const [contentTypes, mainGenres, subgenres, ageRatings, tropeTags] = await Promise.all(
    types.map((type) => getSelectableTaxonomyTermsForCreator(type))
  );

  const mapOpts = (result: { data: Array<{ id: string; name: string; slug: string }> }) =>
    result.data.map((t) => ({
      id: t.id,
      label: t.name,
      slug: t.slug
    }));

  return {
    contentTypes: mapOpts(contentTypes),
    mainGenres: mapOpts(mainGenres),
    subgenres: mapOpts(subgenres),
    ageRatings: mapOpts(ageRatings),
    trope_tag: mapOpts(tropeTags),
    presentationModes: PRESENTATION_MODE_SLUGS.map((slug) => ({
      slug,
      label: presentationModeDescription(slug) ?? slug
    }))
  };
}
