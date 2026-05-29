"use server";

import { revalidatePath } from "next/cache";
import { communityRejectReasonLabel } from "@/lib/admin/community-admin-labels";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  CommunityPostActionInput,
  CommunityRejectReasonCode
} from "@/types/community-admin";

async function requirePostModerator() {
  return assertStaffAnyPermission([
    "community.post.moderate",
    "community.group.approve"
  ]);
}

async function getPost(supabase: Awaited<ReturnType<typeof createClient>>, postId: string) {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id, title, status, user_id, story_id")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy bài viết.");
  return data;
}

function auditActionFor(input: CommunityPostActionInput) {
  const map: Record<string, string> = {
    approve: "community_post_approved",
    reject: "community_post_rejected",
    hide: "community_post_hidden",
    restore: "community_post_restored",
    pin: "community_post_pinned",
    unpin: "community_post_unpinned",
    feature: "community_post_featured",
    unfeature: "community_post_unfeatured",
    lock_comments: "community_comments_locked",
    unlock_comments: "community_comments_unlocked"
  };
  return map[input.action] ?? "community_post_approved";
}

function buildUpdate(
  input: CommunityPostActionInput,
  userId: string,
  oldStatus: string
): Record<string, unknown> {
  const now = new Date().toISOString();

  if (input.action === "approve") {
    return {
      status: "approved",
      approved_by: userId,
      approved_at: now,
      published_at: now
    };
  }

  if (input.action === "reject") {
    const note = input.note?.trim() ?? "";
    const label = communityRejectReasonLabel(input.reasonCode ?? "other");
    return {
      status: "rejected",
      rejected_reason: label,
      rejection_reason_code: input.reasonCode ?? "other",
      public_note: note || label
    };
  }

  if (input.action === "hide") {
    return {
      status: "hidden",
      hidden_by: userId,
      hidden_at: now,
      hidden_reason: input.hiddenReason?.trim() || input.note?.trim() || "Ẩn bởi quản trị"
    };
  }

  if (input.action === "restore") {
    return {
      status: oldStatus === "rejected" ? "pending" : "approved",
      hidden_by: null,
      hidden_at: null,
      hidden_reason: null
    };
  }

  if (input.action === "pin") {
    return {
      is_pinned: true,
      pinned_scope: input.pinnedScope ?? "story",
      pinned_by: userId,
      pinned_at: now
    };
  }

  if (input.action === "unpin") {
    return {
      is_pinned: false,
      pinned_scope: null,
      pinned_by: null,
      pinned_at: null,
      pinned_until: null
    };
  }

  if (input.action === "feature") {
    return {
      is_featured: true,
      featured_by: userId,
      featured_at: now
    };
  }

  if (input.action === "unfeature") {
    return {
      is_featured: false,
      featured_by: null,
      featured_at: null,
      featured_until: null
    };
  }

  if (input.action === "lock_comments") {
    return {
      comments_locked: true,
      comments_locked_by: userId,
      comments_locked_at: now,
      comments_locked_reason: input.note?.trim() || "Khóa bình luận bởi quản trị"
    };
  }

  return {
    comments_locked: false,
    comments_locked_by: null,
    comments_locked_at: null,
    comments_locked_reason: null
  };
}

export async function communityPostAction(
  input: CommunityPostActionInput
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await requirePostModerator();
    const supabase = await createClient();
    const post = await getPost(supabase, input.postId);
    const oldStatus = post.status as string;

    if (input.action === "reject") {
      if (!input.reasonCode) {
        return { ok: false, error: "Vui lòng chọn lý do từ chối." };
      }
      if (input.reasonCode === "other" && (input.note?.trim().length ?? 0) < 5) {
        return { ok: false, error: "Vui lòng nhập ghi chú khi chọn lý do Khác." };
      }
    }

    const patch = buildUpdate(input, userId, oldStatus);
    const { error } = await supabase
      .from("community_posts")
      .update(patch)
      .eq("id", input.postId);

    if (error) {
      if (isMissingSchemaError(error)) {
        const minimal: Record<string, unknown> = {};
        if (input.action === "approve") minimal.status = "approved";
        if (input.action === "reject") minimal.status = "rejected";
        if (input.action === "hide") minimal.status = "hidden";
        if (input.action === "restore") {
          minimal.status = oldStatus === "rejected" ? "pending" : "approved";
        }
        if (Object.keys(minimal).length) {
          const retry = await supabase
            .from("community_posts")
            .update(minimal)
            .eq("id", input.postId);
          if (retry.error) return { ok: false, error: retry.error.message };
        } else {
          return { ok: false, error: error.message };
        }
      } else {
        return { ok: false, error: error.message };
      }
    }

    if (input.action === "reject") {
      await createModerationCase({
        actionTaken: "Rejected community post",
        moderatorId: userId,
        note: input.note?.trim() ?? "",
        targetId: input.postId,
        targetType: "community_post"
      });
    }

    const { data: latestDecision } = await supabase
      .from("community_moderation_decisions")
      .select("id")
      .eq("post_id", input.postId)
      .is("overridden_by", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDecision?.id && input.overrideReason?.trim()) {
      await supabase
        .from("community_moderation_decisions")
        .update({
          overridden_by: userId,
          overridden_at: new Date().toISOString(),
          override_reason: input.overrideReason.trim(),
          final_status: (patch.status as string) ?? oldStatus
        })
        .eq("id", latestDecision.id);
    }

    await logAdminAction({
      actorId: userId,
      action: auditActionFor(input),
      targetType: "community_post",
      targetId: input.postId,
      metadata: {
        title: post.title,
        old_status: oldStatus,
        new_status: (patch.status as string) ?? oldStatus,
        reason_code: input.reasonCode ?? null,
        note: input.note ?? null,
        override: input.overrideReason ?? null
      }
    });

    if (input.action === "approve" && post.user_id) {
      await createNotification(post.user_id as string, "community_guideline_update", {
        title: "Bài cộng đồng đã được duyệt",
        body: `Bài "${post.title}" đã được duyệt và hiển thị công khai.`,
        actionUrl: "/community",
        targetType: "community_post",
        targetId: input.postId,
        dedupeWindowMinutes: 30
      });
    }

    if (input.action === "reject" && post.user_id) {
      await createNotification(post.user_id as string, "community_guideline_update", {
        title: "Bài cộng đồng bị từ chối",
        body: `Bài "${post.title}" không được đăng. Lý do: ${communityRejectReasonLabel(input.reasonCode as CommunityRejectReasonCode)}`,
        actionUrl: "/community",
        targetType: "community_post",
        targetId: input.postId,
        dedupeWindowMinutes: 30
      });
    }

    revalidatePath("/admin/community");
    revalidatePath("/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thực hiện được thao tác."
    };
  }
}

export async function hideCommunityCommentAction(
  commentId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await requirePostModerator();
    const supabase = await createClient();
    const { error } = await supabase
      .from("comments")
      .update({ status: "hidden" })
      .eq("id", commentId);

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_post_hidden",
      targetType: "comment",
      targetId: commentId,
      metadata: { note: "Ẩn bình luận" }
    });

    revalidatePath("/admin/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không ẩn được bình luận."
    };
  }
}

export async function restoreCommunityCommentAction(
  commentId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { userId } = await requirePostModerator();
    const supabase = await createClient();
    const { error } = await supabase
      .from("comments")
      .update({ status: "visible" })
      .eq("id", commentId);

    if (error) return { ok: false, error: error.message };

    await logAdminAction({
      actorId: userId,
      action: "community_post_restored",
      targetType: "comment",
      targetId: commentId,
      metadata: { note: "Khôi phục bình luận" }
    });

    revalidatePath("/admin/community");
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không khôi phục được bình luận."
    };
  }
}
