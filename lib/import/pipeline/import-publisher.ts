import { applyEpisodeObjectStorageAfterSave } from "@/lib/chapters/apply-episode-object-storage-save";
import { resolveUniqueStorySlug } from "@/lib/creator/resolve-unique-story-slug";
import {
  getImportJobById,
  listImportItemsForJob,
  updateImportJob,
  updateImportItem
} from "@/lib/import/pipeline/import-jobs";
import { downloadProcessedChapterText } from "@/lib/import/pipeline/import-storage";
import type { DatabaseClient } from "@/lib/db/types";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { resolveContentSlug } from "@/lib/urls/slug";
import { getChapterUrl } from "@/lib/urls/paths";
import type { ImportItemRow } from "@/types/import-pipeline";

export type PublishImportItemsOptions = {
  itemIds: string[];
  /** Default draft + private — never public unless explicitly set. */
  storyStatus?: "draft" | "pending";
  visibility?: "private" | "public";
};

export type PublishImportItemsResult =
  | { ok: true; publishedCount: number; errors: string[] }
  | { ok: false; error: string };

export async function publishImportItems(
  db: DatabaseClient,
  jobId: string,
  options: PublishImportItemsOptions
): Promise<PublishImportItemsResult> {
  const job = await getImportJobById(db, jobId);
  if (!job) {
    return { ok: false, error: "Không tìm thấy import job." };
  }

  if (!job.owner_profile_id) {
    return { ok: false, error: "Job thiếu owner_profile_id — chọn tác giả sở hữu trước khi publish." };
  }

  const creator = await resolveCreatorForProfile(db, job.owner_profile_id);
  if (!creator) {
    return {
      ok: false,
      error: "owner_profile_id chưa có creator profile — tạo creator trước khi publish."
    };
  }

  const allItems = await listImportItemsForJob(db, jobId);
  const selected = new Set(options.itemIds);
  const toPublish = allItems.filter((item) => selected.has(item.id));

  if (toPublish.length === 0) {
    return { ok: false, error: "Không có item nào được chọn." };
  }

  await updateImportJob(db, jobId, { status: "publishing", error_message: null });

  const storyStatus = options.storyStatus ?? "draft";
  const visibility = options.visibility ?? "private";
  const errors: string[] = [];
  let publishedCount = 0;

  const storyItem = toPublish.find((item) => item.item_type === "story");
  const chapterItems = toPublish.filter((item) => item.item_type === "chapter");

  let targetStoryId: string | null =
    storyItem?.target_story_id ??
    allItems.find((item) => item.item_type === "story")?.target_story_id ??
    null;

  try {
    if (storyItem && storyItem.status !== "published" && storyItem.status !== "duplicate") {
      if (storyItem.status !== "ready" && storyItem.status !== "parsed") {
        errors.push(`Story item ${storyItem.id}: trạng thái ${storyItem.status}.`);
      } else {
        const created = await publishStoryItem(db, {
          item: storyItem,
          creatorId: creator.id,
          ownerUserId: creator.user_id,
          storyStatus,
          visibility
        });
        targetStoryId = created.storyId;
        publishedCount += 1;
        await updateImportItem(db, storyItem.id, {
          status: "published",
          target_story_id: created.storyId,
          error_message: null
        });
      }
    }

    if (!targetStoryId) {
      const existingStory = allItems.find(
        (item) => item.item_type === "story" && item.target_story_id
      );
      targetStoryId = existingStory?.target_story_id ?? null;
    }

    if (!targetStoryId && chapterItems.length > 0) {
      const autoStory = allItems.find(
        (item) =>
          item.item_type === "story" &&
          (item.status === "ready" || item.status === "parsed")
      );
      if (autoStory) {
        const created = await publishStoryItem(db, {
          item: autoStory,
          creatorId: creator.id,
          ownerUserId: creator.user_id,
          storyStatus,
          visibility
        });
        targetStoryId = created.storyId;
        publishedCount += 1;
        await updateImportItem(db, autoStory.id, {
          status: "published",
          target_story_id: created.storyId,
          error_message: null
        });
      }
    }

    if (!targetStoryId) {
      await updateImportJob(db, jobId, {
        status: "failed",
        error_message: "Chưa có story đích — chọn story item hoặc publish story trước."
      });
      return { ok: false, error: "Chưa có story đích — chọn story item hoặc publish story trước." };
    }

    const { data: storyRow } = await db
      .from("stories")
      .select("slug, public_code")
      .eq("id", targetStoryId)
      .maybeSingle();

    if (!storyRow?.public_code) {
      return { ok: false, error: "Story đích thiếu public_code." };
    }

    for (const item of chapterItems) {
      if (item.status === "published") {
        continue;
      }
      if (item.status === "duplicate" || item.status === "skipped") {
        errors.push(`Chương ${item.chapter_number}: bỏ qua (${item.status}).`);
        continue;
      }
      if (item.status !== "ready" && item.status !== "parsed") {
        errors.push(`Chương ${item.chapter_number}: trạng thái ${item.status}.`);
        continue;
      }

      try {
        const episodeId = await publishChapterItem(db, {
          item,
          storyId: targetStoryId,
          storySlug: storyRow.slug,
          storyPublicCode: storyRow.public_code,
          defaultStatus: storyStatus
        });
        publishedCount += 1;
        await updateImportItem(db, item.id, {
          status: "published",
          target_story_id: targetStoryId,
          target_chapter_id: episodeId,
          error_message: null
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Publish chương thất bại.";
        errors.push(`Chương ${item.chapter_number}: ${message}`);
        await updateImportItem(db, item.id, {
          status: "failed",
          error_message: message
        });
      }
    }

    const finalStatus = errors.length > 0 && publishedCount === 0 ? "failed" : "parsed";
    await updateImportJob(db, jobId, {
      status: publishedCount > 0 ? "published" : finalStatus,
      success_count: publishedCount,
      failed_count: errors.length,
      error_message: errors.length > 0 ? errors.slice(0, 5).join(" | ") : null,
      completed_at: publishedCount > 0 ? new Date().toISOString() : null
    });

    return { ok: true, publishedCount, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish thất bại.";
    await updateImportJob(db, jobId, {
      status: "failed",
      error_message: message
    });
    return { ok: false, error: message };
  }
}

async function resolveCreatorForProfile(
  db: DatabaseClient,
  profileId: string
): Promise<{ id: string; user_id: string } | null> {
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;

  const { data: creator } = await db
    .from("creator_profiles")
    .select("id, user_id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!creator?.id || !creator.user_id) {
    return null;
  }

  return { id: String(creator.id), user_id: String(creator.user_id) };
}

async function publishStoryItem(
  db: DatabaseClient,
  input: {
    item: ImportItemRow;
    creatorId: string;
    ownerUserId: string;
    storyStatus: "draft" | "pending";
    visibility: "private" | "public";
  }
) {
  if (input.item.target_story_id) {
    return { storyId: input.item.target_story_id };
  }

  const slug = await resolveUniqueStorySlug(db, input.item.title);
  const publicCode = await generateNumericPublicCode(db, "story");

  const { data: story, error } = await db
    .from("stories")
    .insert({
      creator_id: input.creatorId,
      owner_user_id: input.ownerUserId,
      title: input.item.title,
      slug,
      public_code: publicCode,
      short_description: input.item.metadata?.author
        ? `Tác giả nguồn: ${String(input.item.metadata.author)}`
        : null,
      visibility: input.visibility,
      status: input.storyStatus,
      structure_type: "serialized",
      content_format: "plain_text"
    })
    .select("id")
    .single();

  if (error || !story) {
    throw new Error(error?.message ?? "Không tạo được story.");
  }

  return { storyId: story.id as string };
}

async function publishChapterItem(
  db: DatabaseClient,
  input: {
    item: ImportItemRow;
    storyId: string;
    storySlug: string;
    storyPublicCode: string;
    defaultStatus: "draft" | "pending";
  }
) {
  if (!input.item.parsed_content_object_key) {
    throw new Error("Thiếu parsed_content_object_key.");
  }

  const content = await downloadProcessedChapterText(input.item.parsed_content_object_key);
  const episodeNumber = input.item.chapter_number;
  if (!episodeNumber || episodeNumber < 1) {
    throw new Error("chapter_number không hợp lệ.");
  }

  const title =
    input.item.chapter_title?.trim() || `Chương ${episodeNumber}`;
  const chapterPublicCode = await generateNumericPublicCode(db, "chapter");
  const chapterSlug = resolveContentSlug(title, "chapter", chapterPublicCode);
  const canonicalPath = getChapterUrl(
    { slug: input.storySlug, public_code: input.storyPublicCode },
    { slug: chapterSlug, public_code: chapterPublicCode }
  );

  const excerpt =
    typeof input.item.metadata?.excerpt === "string"
      ? input.item.metadata.excerpt
      : content.slice(0, 280);

  const wordCount =
    typeof input.item.metadata?.word_count === "number"
      ? input.item.metadata.word_count
      : content.split(/\s+/).filter(Boolean).length;

  const { data: episode, error } = await db
    .from("episodes")
    .insert({
      story_id: input.storyId,
      episode_number: episodeNumber,
      title,
      slug: chapterSlug,
      public_code: chapterPublicCode,
      canonical_path: canonicalPath,
      content: "",
      excerpt,
      word_count: wordCount,
      status: input.defaultStatus,
      content_format: "plain_text",
      content_storage_type: "db",
      structured_content: null
    })
    .select("id")
    .single();

  if (error || !episode?.id) {
    throw new Error(error?.message ?? "Không tạo được chapter.");
  }

  const storage = await applyEpisodeObjectStorageAfterSave(db, {
    storyId: input.storyId,
    chapterId: String(episode.id),
    content,
    structuredContent: null,
    contentFormat: "plain_text",
    excerpt
  });

  if (!storage.ok) {
    await db.from("episodes").delete().eq("id", episode.id);
    throw new Error(storage.error);
  }

  return String(episode.id);
}

export async function skipImportItems(
  db: DatabaseClient,
  itemIds: string[]
) {
  for (const id of itemIds) {
    await updateImportItem(db, id, { status: "skipped", error_message: null });
  }
}

export async function cancelImportJob(db: DatabaseClient, jobId: string) {
  await updateImportJob(db, jobId, {
    status: "cancelled",
    completed_at: new Date().toISOString()
  });
}
