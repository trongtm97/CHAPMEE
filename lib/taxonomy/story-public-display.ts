import type { DatabaseClient } from "@/lib/db/types";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { presentationModeDescription } from "@/lib/taxonomy/presentation-labels";

export type StoryPublicTaxonomyDisplay = {
  genreName: string | null;
  genreSlug: string | null;
  subgenres: string[];
  tags: string[];
  tagsExtra: string[];
  contentWarnings: string[];
  presentationLabel: string | null;
  ageRatingLabel: string | null;
  statusLabels: string[];
};

const VISIBLE_TAG_LIMIT = 6;

export async function resolveStoryPublicTaxonomyDisplay(
  db: DatabaseClient,
  storyId: string
): Promise<StoryPublicTaxonomyDisplay> {
  const labels = await getStoryTaxonomyLabelsByStoryIds(db, [storyId]);
  const taxonomy = labels.get(storyId);

  const allTags = (taxonomy?.tagNames ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean);
  const visibleTags = allTags.slice(0, VISIBLE_TAG_LIMIT);
  const tagsExtra = allTags.slice(VISIBLE_TAG_LIMIT);

  const { data: presentation } = await db
    .from("story_presentation_settings")
    .select("mode")
    .eq("story_id", storyId)
    .maybeSingle();

  const mode = presentation?.mode ? String(presentation.mode) : null;

  return {
    genreName: taxonomy?.mainGenreName ?? null,
    genreSlug: taxonomy?.mainGenreSlug ?? null,
    subgenres: taxonomy?.subgenreNames ?? [],
    tags: visibleTags,
    tagsExtra,
    contentWarnings: taxonomy?.contentWarningNames ?? [],
    presentationLabel: mode ? (presentationModeDescription(mode) ?? mode) : null,
    ageRatingLabel: taxonomy?.ageRatingName ?? null,
    statusLabels: taxonomy?.storyStatusNames ?? []
  };
}
