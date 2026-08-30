"use server";

import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import {
  getFullStoryEscrowStoriesPage,
  type FullStoryEscrowStoriesQuery
} from "@/lib/studio/get-full-story-escrow-stories-page";
import { createClient } from "@/lib/data/server";

export async function studioRequestStoryCompletionReviewAction(input: {
  storyId: string;
  authorNote?: string;
}) {
  const state = await getCurrentCreatorProfile();
  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  const db = await createClient();
  const storyId = input.storyId.trim();
  if (!storyId) {
    return { ok: false, error: "Thiếu mã truyện." };
  }

  const { data: story } = await db
    .from("stories")
    .select(
      "id, title, is_completed, admin_completion_status, creator_id, story_monetization_settings(full_access_enabled)"
    )
    .eq("id", storyId)
    .eq("creator_id", state.creatorProfile.id)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "Không tìm thấy truyện hoặc bạn không có quyền." };
  }

  const settings = Array.isArray(story.story_monetization_settings)
    ? story.story_monetization_settings[0]
    : story.story_monetization_settings;

  if (!settings?.full_access_enabled) {
    return {
      ok: false,
      error: "Truyện chưa bật bán trọn bộ nên không cần xác nhận hoàn thành."
    };
  }

  const status = String(story.admin_completion_status ?? "not_requested");
  if (status === "approved") {
    return { ok: false, error: "Truyện đã được admin xác nhận hoàn thành." };
  }
  if (status === "pending_review") {
    return { ok: false, error: "Yêu cầu đang chờ admin duyệt." };
  }

  const now = new Date().toISOString();
  const { error } = await db
    .from("stories")
    .update({
      admin_completion_status: "pending_review",
      admin_completion_requested_at: now,
      author_completion_request_note: input.authorNote?.trim() || null,
      admin_completion_note: null
    })
    .eq("id", storyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function studioFetchFullStoryEscrowStoriesAction(
  query: FullStoryEscrowStoriesQuery
) {
  const state = await getCurrentCreatorProfile();
  if (!state.creatorProfile || !state.user) {
    return {
      rows: [],
      totalCount: 0,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      totalPages: 1,
      error: "Bạn cần đăng nhập Studio."
    };
  }

  return getFullStoryEscrowStoriesPage(
    state.creatorProfile.id,
    state.user.id,
    query
  );
}
