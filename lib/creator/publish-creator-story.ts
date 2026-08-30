import "server-only";

import { afterStorySubmittedForReview } from "@/lib/creator/after-story-review-submitted";
import { getCurrentStoryImage } from "@/lib/images/get-current-story-image";
import { generateStorySEO } from "@/lib/seo/generate-story-seo";
import { ensureStoryPublicUrl } from "@/lib/stories/ensure-story-public-url";
import { invalidateStoryCatalogCache } from "@/lib/stories/getPublicStoriesCatalogCached";
import { getStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import type { DatabaseClient } from "@/lib/db/types";

export type PublishCreatorStoryResult =
  | { ok: true }
  | { ok: false; error: string };

type PublishCreatorStoryInput = {
  storyId: string;
  creatorId: string;
  userId?: string | null;
  authorDisplayName?: string | null;
  notify?: boolean;
};

const REPUBLISHABLE_STATUSES = new Set(["draft", "rejected", "pending"]);

function collectTagNames(
  taxonomy: Awaited<ReturnType<typeof getStoryTaxonomy>>["data"]
) {
  return [
    ...(taxonomy.trope_tag ?? []),
    ...(taxonomy.subgenre ?? []),
    ...(taxonomy.setting_tag ?? [])
  ]
    .map((term) => term.name)
    .slice(0, 12);
}

export async function publishCreatorStory(
  db: DatabaseClient,
  input: PublishCreatorStoryInput
): Promise<PublishCreatorStoryResult> {
  const { data: story, error } = await db
    .from("stories")
    .select(
      "id, status, title, slug, hook, short_description, long_description, cover_url, seo_title, seo_description, seo_keywords, visibility"
    )
    .eq("id", input.storyId)
    .eq("creator_id", input.creatorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!story) {
    return { ok: false, error: "Không tìm thấy truyện." };
  }

  const status = String(story.status);
  const visibility = String(story.visibility ?? "private");

  if (status === "archived") {
    return {
      ok: false,
      error: "Truyện đang ẩn — dùng «Hiện lại» trước khi đăng."
    };
  }

  if (
    (status === "published" || status === "approved") &&
    visibility === "public"
  ) {
    await ensureStoryPublicUrl(db, input.storyId);
    return { ok: true };
  }

  if (
    (status === "published" || status === "approved") &&
    visibility !== "public"
  ) {
    const { error: visibilityError } = await db
      .from("stories")
      .update({
        visibility: "public",
        published_at: new Date().toISOString()
      })
      .eq("id", input.storyId);

    if (visibilityError) {
      return { ok: false, error: visibilityError.message };
    }

    await ensureStoryPublicUrl(db, input.storyId);
    invalidateStoryCatalogCache();
    return { ok: true };
  }

  if (!REPUBLISHABLE_STATUSES.has(status)) {
    return {
      ok: false,
      error: "Chỉ có thể đăng truyện nháp, cần sửa hoặc chờ duyệt."
    };
  }

  const taxonomy = await getStoryTaxonomy(input.storyId);
  const mainGenre = taxonomy.data.main_genre?.[0]?.name ?? null;
  const tagNames = collectTagNames(taxonomy.data);
  const { image } = await getCurrentStoryImage(db, input.storyId);
  const resolvedCoverUrl =
    image?.portraitUrl ?? image?.originalUrl ?? story.cover_url ?? null;
  const hasCover = Boolean(resolvedCoverUrl);

  let seoTitle = String(story.seo_title ?? "").trim() || null;
  let seoDescription = String(story.seo_description ?? "").trim() || null;
  let seoKeywords = Array.isArray(story.seo_keywords)
    ? story.seo_keywords.filter(Boolean)
    : [];

  if (!seoTitle || !seoDescription || seoKeywords.length === 0) {
    const generated = generateStorySEO({
      authorName: input.authorDisplayName,
      genreName: mainGenre,
      hasCover,
      hasGenre: Boolean(mainGenre),
      hasTags: tagNames.length > 0,
      hook: story.hook,
      isIndexable: true,
      longDescription: story.long_description,
      shortDescription: story.short_description,
      tagNames,
      title: String(story.title)
    });

    if (!seoTitle) {
      seoTitle = generated.title;
    }
    if (!seoDescription) {
      seoDescription = generated.description;
    }
    if (seoKeywords.length === 0) {
      seoKeywords = generated.keywords;
    }
  }

  const patch: Record<string, unknown> = {
    published_at: new Date().toISOString(),
    seo_description: seoDescription,
    seo_keywords: seoKeywords,
    seo_title: seoTitle,
    status: "published",
    visibility: "public"
  };

  if (resolvedCoverUrl && !story.cover_url) {
    patch.cover_url = resolvedCoverUrl;
  }

  const { error: updateError } = await db
    .from("stories")
    .update(patch)
    .eq("id", input.storyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await ensureStoryPublicUrl(db, input.storyId);
  invalidateStoryCatalogCache();

  if (input.notify && input.userId) {
    await afterStorySubmittedForReview({
      storyId: input.storyId,
      storyTitle: String(story.title),
      userId: input.userId
    });
  }

  return { ok: true };
}
