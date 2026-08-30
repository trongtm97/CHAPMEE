import { createAdminClient } from "@/lib/data/admin";
import type { DatabaseClient } from "@/lib/db/types";

export type StoryTaxonomyTrackingContext = {
  taxonomyTermIds: string[];
  mainGenreId: string | null;
};

export async function getStoryTaxonomyTrackingContext(
  storyId: string,
  db?: DatabaseClient
): Promise<StoryTaxonomyTrackingContext> {
  const client = db ?? createAdminClient();
  const { data: links } = await client
    .from("story_taxonomy_terms")
    .select("term_id, type")
    .eq("story_id", storyId);

  const taxonomyTermIds = (links ?? []).map((row) => String(row.term_id));
  const mainGenreId =
    (links ?? []).find((row) => row.type === "main_genre")?.term_id ?? null;

  return {
    taxonomyTermIds,
    mainGenreId: mainGenreId ? String(mainGenreId) : null
  };
}

export function taxonomyMetadataFromContext(
  context: StoryTaxonomyTrackingContext,
  extra?: Record<string, string | number | boolean | null | string[]>
) {
  return {
    story_id: extra?.story_id ?? null,
    taxonomy_term_ids: context.taxonomyTermIds,
    main_genre_id: context.mainGenreId,
    ...extra
  };
}
