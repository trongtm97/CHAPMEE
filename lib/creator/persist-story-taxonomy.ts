import type { DatabaseClient } from "@/lib/db/types";
import { resolveAgeRatingTermId } from "@/lib/taxonomy/age-rating";
import { setStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import type { TaxonomyType } from "@/types/taxonomy";
import type { StoryAgeRating } from "@/types/moderation";

export type PersistStoryTaxonomyInput = {
  taxonomyTermIds: string[];
  presentationMode: string | null;
  formatTemplateId?: string | null;
  contentWarningsConfirmed: boolean;
  ageRating: StoryAgeRating;
  forPublish?: boolean;
};

function groupTermIdsByType(
  rows: Array<{ id: string; type: string }>
): Partial<Record<TaxonomyType, string[]>> {
  const grouped: Partial<Record<TaxonomyType, string[]>> = {};
  for (const row of rows) {
    const type = row.type as TaxonomyType;
    if (!grouped[type]) grouped[type] = [];
    grouped[type]!.push(row.id);
  }
  return grouped;
}

export async function persistStoryTaxonomyFromForm(
  db: DatabaseClient,
  storyId: string,
  input: PersistStoryTaxonomyInput
): Promise<{ ok: boolean; error: string | null; genreId: string | null }> {
  const uniqueIds = [...new Set(input.taxonomyTermIds.filter(Boolean))];

  let selections: Partial<Record<TaxonomyType, string[]>> = {};

  if (uniqueIds.length > 0) {
    const { data: termRows, error: loadError } = await db
      .from("taxonomy_terms")
      .select("id, type")
      .in("id", uniqueIds);

    if (loadError) {
      return { ok: false, error: loadError.message, genreId: null };
    }

    selections = groupTermIdsByType(
      (termRows ?? []) as Array<{ id: string; type: string }>
    );
  }

  if (!selections.age_rating?.length) {
    const ageRatingTermId = await resolveAgeRatingTermId(db, input.ageRating);
    if (ageRatingTermId) {
      selections.age_rating = [ageRatingTermId];
    }
  }

  const taxonomyResult = await setStoryTaxonomy(
    storyId,
    {
      selections,
      presentationMode: input.presentationMode,
      formatTemplateId: input.formatTemplateId ?? null,
      contentWarningsConfirmed: input.contentWarningsConfirmed
    },
    { forPublish: input.forPublish }
  );

  if (!taxonomyResult.ok) {
    return { ok: false, error: taxonomyResult.error, genreId: null };
  }

  return { ok: true, error: null, genreId: null };
}
