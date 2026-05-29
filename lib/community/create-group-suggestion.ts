"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import type { GroupSuggestionInput } from "@/types/community-group";
import { DEFAULT_GROUP_ADMIN_CONFIG } from "@/types/community-group";

export type GroupSuggestionResult = {
  ok: boolean;
  message: string;
};

/**
 * MVP: validate input and acknowledge submission.
 * TODO: persist to `community_groups` when table + moderation flow exist.
 * TODO: block duplicate default group per story_id (group_type = story).
 * TODO: read admin flags from settings (enable_community_groups, require_group_approval).
 */
export async function submitGroupSuggestion(
  input: GroupSuggestionInput
): Promise<GroupSuggestionResult> {
  const config = DEFAULT_GROUP_ADMIN_CONFIG;

  if (!config.enableCommunityGroups) {
    return { ok: false, message: "Tính năng nhóm cộng đồng đang tắt." };
  }

  if (!config.allowUserGroupSuggestions) {
    return { ok: false, message: "Đề xuất nhóm tạm thời không khả dụng." };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Bạn cần đăng nhập để đề xuất nhóm." };
  }

  try {
    await assertActionAccess("community.group.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  if (!input.storyId.trim()) {
    return { ok: false, message: "Vui lòng chọn truyện liên quan." };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, message: "Vui lòng nhập tên nhóm." };
  }

  if (name.length > config.maxGroupNameLength) {
    return {
      ok: false,
      message: `Tên nhóm tối đa ${config.maxGroupNameLength} ký tự.`
    };
  }

  if (input.description.trim().length > config.maxGroupDescriptionLength) {
    return {
      ok: false,
      message: `Mô tả tối đa ${config.maxGroupDescriptionLength} ký tự.`
    };
  }

  if (input.isDefaultGroup || input.groupType === "story") {
    return {
      ok: false,
      message:
        "Mỗi truyện đã có nhóm mặc định. Hãy đề xuất nhóm phụ (fan theory, review, spoiler...)."
    };
  }

  // TODO: insert with status = pending when require_group_approval

  return {
    ok: true,
    message: config.requireGroupApproval
      ? "Đề xuất đã gửi và chờ duyệt."
      : "Đề xuất nhóm đã được ghi nhận."
  };
}
