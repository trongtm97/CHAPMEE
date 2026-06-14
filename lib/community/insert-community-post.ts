import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { createClient } from "@/lib/data/server";
import type { CommunityPostType } from "@/lib/community/getCommunityFeed";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { saveCommunityPostContentObject } from "@/lib/storage/community-posts-content-storage";

const allowedTypes = new Set<CommunityPostType>([
  "discussion",
  "review",
  "poll_placeholder",
  "challenge"
]);

export type InsertCommunityPostInput = {
  content: string;
  type?: string;
  storyId?: string | null;
  episodeNumber?: number | null;
};

export type InsertCommunityPostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export function deriveCommunityPostTitle(content: string) {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  const source = firstLine ?? content.trim();
  const normalized = source.replace(/\s+/g, " ").trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157).trim()}...`;
}

async function resolveEpisodeId(
  db: Awaited<ReturnType<typeof createClient>>,
  storyId: string,
  episodeNumber: number
) {
  const { data } = await db
    .from("episodes")
    .select("id")
    .eq("story_id", storyId)
    .eq("episode_number", episodeNumber)
    .in("status", [...publicContentStatuses])
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}

export async function insertCommunityPost(
  input: InsertCommunityPostInput
): Promise<InsertCommunityPostResult> {
  const content = input.content.trim();
  const type = (input.type?.trim() || "discussion") as CommunityPostType;
  const storyId = input.storyId?.trim() || null;
  const episodeNumber =
    typeof input.episodeNumber === "number" && input.episodeNumber > 0
      ? Math.floor(input.episodeNumber)
      : null;

  if (!allowedTypes.has(type)) {
    return { ok: false, error: "Loại bài không hợp lệ." };
  }

  if (!content) {
    return { ok: false, error: "Vui lòng nhập nội dung." };
  }

  if (content.length > 5000) {
    return { ok: false, error: "Nội dung tối đa 5000 ký tự." };
  }

  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError && !isMissingAuthSession(userError.message)) {
    return { ok: false, error: userError.message };
  }

  if (!user) {
    return { ok: false, error: "Bạn cần đăng nhập để đăng bài." };
  }

  try {
    await assertActionAccess("community.post.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const postCheck = await assertNotRestricted(
    user.id,
    "post_block",
    "Bạn đang bị hạn chế đăng bài cộng đồng."
  );
  if (!postCheck.ok) {
    return { ok: false, error: postCheck.error };
  }

  let episodeId: string | null = null;

  if (storyId && episodeNumber) {
    episodeId = await resolveEpisodeId(db, storyId, episodeNumber);
  }

  const now = new Date().toISOString();
  const title = deriveCommunityPostTitle(content);

  const { data: inserted, error } = await db
    .from("community_posts")
    .insert({
      user_id: user.id,
      type,
      title,
      content,
      story_id: storyId,
      episode_id: episodeId,
      creator_id: null,
      status: "approved",
      approved_at: now,
      published_at: now,
      auto_decision: "auto_approved",
      auto_decision_reason_codes: ["instant_publish"]
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!inserted?.id) {
    return { ok: false, error: "Không thể đăng bài." };
  }

  const postId = String(inserted.id);

  // Persist canonical text to S3, NULL out inline content, keep content_preview in DB.
  try {
    const saved = await saveCommunityPostContentObject({
      content,
      postId,
      title
    });
    await db
      .from("community_posts")
      .update({
        content: null,
        content_blob_format: saved.blobFormat,
        content_encoding: saved.encoding,
        content_hash: saved.hash,
        content_object_key: saved.objectKey,
        content_preview: saved.contentPreview,
        content_size_bytes: saved.sizeBytes,
        content_storage_type: "s3",
        content_updated_at: now,
        title: null
      })
      .eq("id", postId);
  } catch (s3Error) {
    // Roll back the row to keep DB consistent with S3.
    await db.from("community_posts").delete().eq("id", postId);
    return {
      ok: false,
      error:
        s3Error instanceof Error
          ? `Không lưu được bài viết lên S3: ${s3Error.message}`
          : "Không lưu được bài viết lên S3."
    };
  }

  return { ok: true, postId };
}
