import {
  createRule,
  formatBlockingErrors,
  mergeChecklistResults,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import { validateStoryForPublish } from "@/lib/publish/validate-story-for-publish";
import { getStoryTaxonomyPublishRules } from "@/lib/publish/story-taxonomy-publish-rules";
import {
  hasStandaloneContent,
  isStandaloneStory,
  mapStoryStructureFromRow
} from "@/lib/stories/story-structure";
import { getStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { DatabaseClient } from "@/lib/db/types";

async function storyHasCover(
  db: DatabaseClient,
  storyId: string,
  coverUrl: string | null
) {
  if (coverUrl?.trim()) {
    return true;
  }

  const { count } = await db
    .from("story_images")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("is_current", true);

  return (count ?? 0) > 0;
}

async function storyHasReelsPromo(db: DatabaseClient, storyId: string) {
  const { count } = await db
    .from("reels_items")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("status", "published");

  return (count ?? 0) > 0;
}

export async function validateStoryBeforePublishFromDb(
  db: DatabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishChecklistResult> {
  const { data, error } = await db
    .from("stories")
    .select(
      "id, title, hook, short_description, long_description, cover_url, status, visibility, seo_description, creator_id, structure_type, content_format, standalone_content_json, standalone_plain_text, standalone_word_count, validation_status"
    )
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "story",
        label: "Không tìm thấy truyện",
        message: "Không tìm thấy truyện hoặc bạn không có quyền.",
        ok: false,
        targetType: "story"
      })
    ]);
  }

  const structure = mapStoryStructureFromRow(data);

  const [
    taxonomyCount,
    storyTaxonomy,
    taxonomyTagCount,
    hasCover,
    hasReelsPromo,
    publishedChapterCountResult,
    scheduledChapterCountResult,
    invalidEpisodeCountResult
  ] = await Promise.all([
    db
      .from("taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .limit(1)
      .then((r) => r.count ?? 0),
    getStoryTaxonomy(storyId),
    db
      .from("story_taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
      .in("type", ["trope_tag", "subgenre"])
      .then((r) => r.count ?? 0),
    storyHasCover(db, storyId, data.cover_url),
    storyHasReelsPromo(db, storyId),
    isStandaloneStory(structure)
      ? Promise.resolve({ count: 0 })
      : db
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyId)
          .in("status", ["approved", "published"]),
    isStandaloneStory(structure)
      ? Promise.resolve({ count: 0 })
      : db
          .from("scheduled_publications")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyId)
          .eq("target_type", "chapter")
          .eq("status", "scheduled"),
    isStandaloneStory(structure)
      ? Promise.resolve({ count: 0 })
      : db
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("story_id", storyId)
          .eq("validation_status", "invalid")
  ]);

  const taxonomyActive = taxonomyCount > 0;
  const taxonomyFormTagCount =
    (storyTaxonomy.data.subgenre?.length ?? 0) +
    (storyTaxonomy.data.trope_tag?.length ?? 0);
  const effectiveTagCount = taxonomyActive
    ? Math.max(taxonomyTagCount, taxonomyFormTagCount)
    : 0;
  const hasMainGenre = (storyTaxonomy.data.main_genre?.length ?? 0) > 0;

  const standaloneWordCount = structure.standaloneWordCount ?? 0;

  const baseResult = validateStoryForPublish({
    coverUrl: data.cover_url,
    genreId: hasMainGenre ? "taxonomy" : null,
    hasCover,
    hasReelsPromo,
    hook: data.hook,
    longDescription: data.long_description,
    seoDescription: data.seo_description,
    shortDescription: data.short_description,
    status: data.status,
    structureType: structure.structureType,
    standaloneContentJson: structure.standaloneContentJson,
    standalonePlainText: structure.standalonePlainText,
    publishedChapterCount: publishedChapterCountResult.count ?? 0,
    scheduledChapterCount: scheduledChapterCountResult.count ?? 0,
    composerHasErrors: isStandaloneStory(structure)
      ? (data as { validation_status?: string | null }).validation_status === "invalid"
      : (invalidEpisodeCountResult.count ?? 0) > 0,
    standaloneTooShort: isStandaloneStory(structure) && standaloneWordCount > 0 && standaloneWordCount < 100,
    tagCount: effectiveTagCount,
    taxonomyActive,
    title: data.title,
    visibility: data.visibility
  });

  if (!taxonomyActive) {
    return baseResult;
  }

  const taxonomyRules = await getStoryTaxonomyPublishRules(db, storyId);

  return mergeChecklistResults(baseResult, summarizeChecklist(taxonomyRules));
}

export async function assertStoryCanPublish(
  db: DatabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await validateStoryBeforePublishFromDb(
    db,
    storyId,
    creatorProfileId
  );

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
