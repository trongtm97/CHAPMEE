"use server";

import { revalidatePath } from "next/cache";
import { isContentStatusEnumError } from "@/lib/admin/content-review-queue-statuses";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { awardMilestone } from "@/lib/data/milestones";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/data/server";
import { invalidateStoryCatalogCache } from "@/lib/stories/getPublicStoriesCatalogCached";
import { ensureStoryPublicUrl } from "@/lib/stories/ensure-story-public-url";
import type {
  ContentReviewActionKind,
  ContentReviewItemType,
  ContentReviewReasonCode
} from "@/types/admin-content-review";
import type { NotificationTargetType, NotificationType } from "@/types/notification";

type ReviewInput = {
  type: ContentReviewItemType;
  id: string;
  action: ContentReviewActionKind;
  reasonCode?: ContentReviewReasonCode | null;
  moderatorNote: string;
};

async function requireModerator() {
  const guard = await requireAdminOrModerator("/admin/content");
  if (!guard.ok) {
    return { ok: false as const, error: guard.error };
  }
  await assertAnyPermission(["story.approve", "story.moderate", "story.reject"]);
  return { ok: true as const, profile: guard.profile };
}

async function notifyCreator(
  userId: string,
  type: NotificationType,
  payload: {
    title: string;
    body: string;
    actionUrl: string;
    targetType: NotificationTargetType;
    targetId: string;
  }
) {
  await createNotification(userId, type, {
    title: payload.title,
    body: payload.body,
    actionUrl: payload.actionUrl,
    targetType: payload.targetType,
    targetId: payload.targetId,
    dedupeWindowMinutes: 15
  });
}

async function resolveCreatorUserId(
  db: Awaited<ReturnType<typeof createClient>>,
  type: ContentReviewItemType,
  id: string
) {
  if (type === "story") {
    const { data } = await db
      .from("stories")
      .select("title, creator_profiles(user_id)")
      .eq("id", id)
      .maybeSingle();
    const cp = Array.isArray(data?.creator_profiles)
      ? data?.creator_profiles[0]
      : data?.creator_profiles;
    return { userId: cp?.user_id as string | undefined, title: data?.title as string };
  }
  if (type === "episode") {
    const { data } = await db
      .from("episodes")
      .select("title, stories(creator_profiles(user_id))")
      .eq("id", id)
      .maybeSingle();
    const story = Array.isArray(data?.stories) ? data?.stories[0] : data?.stories;
    const cp = Array.isArray(story?.creator_profiles)
      ? story?.creator_profiles[0]
      : story?.creator_profiles;
    return { userId: cp?.user_id as string | undefined, title: data?.title as string };
  }
  return { userId: undefined, title: undefined };
}

export async function reviewContentAction(input: ReviewInput) {
  const mod = await requireModerator();
  if (!mod.ok) {
    return { ok: false, error: mod.error };
  }

  const note = input.moderatorNote.trim();
  if (input.action !== "approve" && note.length < 5) {
    return { ok: false, error: "Vui lòng nhập ghi chú tối thiểu 5 ký tự." };
  }
  if (input.action === "reject" && !input.reasonCode) {
    return { ok: false, error: "Vui lòng chọn lý do từ chối." };
  }

  const db = await createClient();
  const now = new Date().toISOString();
  const auditMeta = {
    reason_code: input.reasonCode ?? null,
    moderator_note: note || null,
    old_status: "pending"
  };

  try {
    if (input.type === "story" || input.type === "episode") {
      const table = input.type === "story" ? "stories" : "episodes";

      if (input.action === "approve") {
        const { data: current } = await db
          .from(table)
          .select("published_at, status")
          .eq("id", input.id)
          .maybeSingle();

        const approvePatch: Record<string, unknown> = {
          status: "approved",
          published_at: current?.published_at ?? now,
          reviewed_by: mod.profile.id,
          reviewed_at: now,
          rejection_reason_code: null,
          rejection_note: null,
          changes_requested_note: null
        };

        if (input.type === "story") {
          approvePatch.visibility = "public";
        }

        const { error } = await db
          .from(table)
          .update(approvePatch)
          .eq("id", input.id);

        if (error) return { ok: false, error: error.message };

        if (input.type === "story") {
          await ensureStoryPublicUrl(db, input.id);
          const { userId, title } = await resolveCreatorUserId(db, "story", input.id);
          if (userId) {
            const { data: storyRow } = await db
              .from("stories")
              .select("creator_id, title")
              .eq("id", input.id)
              .maybeSingle();
            await awardMilestone({
              userId,
              milestoneKey: "first_story_published",
              relatedAuthorId: storyRow?.creator_id ?? null,
              metadata: { story_id: input.id }
            });
            await notifyCreator(userId, "story_approved", {
              title: "Nội dung đã được duyệt",
              body: `Truyện "${title ?? "của bạn"}" đã được duyệt và sẽ hiển thị theo trạng thái xuất bản.`,
              actionUrl: "/studio",
              targetType: "story",
              targetId: input.id
            });
          }
        } else {
          const { userId, title } = await resolveCreatorUserId(db, "episode", input.id);
          if (userId) {
            await notifyCreator(userId, "story_approved", {
              title: "Chương đã được duyệt",
              body: `Chương "${title ?? ""}" đã được duyệt.`,
              actionUrl: "/studio",
              targetType: "chapter",
              targetId: input.id
            });
          }
        }

        await logAdminAction({
          actorId: mod.profile.id,
          action: "approve_content",
          targetType: input.type,
          targetId: input.id,
          metadata: { ...auditMeta, new_status: "approved" }
        });
      } else if (input.action === "reject") {
        const { error } = await db
          .from(table)
          .update({
            status: "rejected",
            reviewed_by: mod.profile.id,
            reviewed_at: now,
            rejection_reason_code: input.reasonCode,
            rejection_note: note,
            changes_requested_note: null
          })
          .eq("id", input.id);

        if (error) return { ok: false, error: error.message };

        await createModerationCase({
          actionTaken: `Rejected ${input.type}`,
          moderatorId: mod.profile.id,
          note,
          targetId: input.id,
          targetType: input.type
        });

        const { userId, title } = await resolveCreatorUserId(db, input.type, input.id);
        if (userId) {
          await notifyCreator(userId, "story_rejected", {
            title: "Nội dung bị từ chối",
            body: `"${title ?? "Nội dung"}" bị từ chối. Xem lý do trong Studio.`,
            actionUrl: "/studio",
            targetType: input.type === "episode" ? "chapter" : "story",
            targetId: input.id
          });
        }

        await logAdminAction({
          actorId: mod.profile.id,
          action: "reject_content",
          targetType: input.type,
          targetId: input.id,
          metadata: { ...auditMeta, new_status: "rejected" }
        });
      } else {
        const { error } = await db
          .from(table)
          .update({
            status: "changes_requested",
            reviewed_by: mod.profile.id,
            reviewed_at: now,
            changes_requested_note: note,
            rejection_reason_code: input.reasonCode ?? null,
            rejection_note: null
          })
          .eq("id", input.id);

        if (error && isContentStatusEnumError(error.message)) {
          const fallback = await db
            .from(table)
            .update({
              status: "draft",
              reviewed_by: mod.profile.id,
              reviewed_at: now,
              changes_requested_note: note
            })
            .eq("id", input.id);
          if (fallback.error) {
            return { ok: false, error: fallback.error.message };
          }
        } else if (error) {
          return { ok: false, error: error.message };
        }

        const { userId, title } = await resolveCreatorUserId(db, input.type, input.id);
        if (userId) {
          await notifyCreator(userId, "content_quality_needs_fix", {
            title: "Nội dung cần chỉnh sửa",
            body: `"${title ?? "Nội dung"}" cần chỉnh sửa trước khi đăng. Xem ghi chú trong Studio.`,
            actionUrl: "/studio",
            targetType: input.type === "episode" ? "chapter" : "story",
            targetId: input.id
          });
        }

        await logAdminAction({
          actorId: mod.profile.id,
          action: "request_content_changes",
          targetType: input.type,
          targetId: input.id,
          metadata: { ...auditMeta, new_status: "changes_requested" }
        });
      }
    } else if (input.type === "community_post") {
      if (input.action === "approve") {
        const { error } = await db
          .from("community_posts")
          .update({ status: "approved" })
          .eq("id", input.id)
          .eq("status", "pending");
        if (error) return { ok: false, error: error.message };
        await logAdminAction({
          actorId: mod.profile.id,
          action: "approve_content",
          targetType: "community_post",
          targetId: input.id,
          metadata: auditMeta
        });
      } else {
        const { error } = await db
          .from("community_posts")
          .update({ status: "rejected" })
          .eq("id", input.id);
        if (error) return { ok: false, error: error.message };
        await logAdminAction({
          actorId: mod.profile.id,
          action: input.action === "reject" ? "reject_content" : "request_content_changes",
          targetType: "community_post",
          targetId: input.id,
          metadata: { ...auditMeta, moderator_note: note }
        });
      }
    } else if (input.type === "comment") {
      const status = input.action === "approve" ? "visible" : "hidden";
      const { error } = await db
        .from("comments")
        .update({ status })
        .eq("id", input.id);
      if (error) return { ok: false, error: error.message };
      await logAdminAction({
        actorId: mod.profile.id,
        action: input.action === "approve" ? "approve_content" : "reject_content",
        targetType: "comment",
        targetId: input.id,
        metadata: auditMeta
      });
    }

    revalidatePath("/admin/content");
    revalidatePath("/admin");
    revalidatePath("/studio");
    revalidatePath("/truyen");
    revalidatePath("/truyen-dich");
    revalidatePath("/truyen-sang-tac");
    if (input.type === "story") {
      invalidateStoryCatalogCache();
    }

    return {
      ok: true,
      message:
        input.action === "approve"
          ? "Đã duyệt nội dung."
          : input.action === "reject"
            ? "Đã từ chối nội dung."
            : "Đã gửi yêu cầu chỉnh sửa."
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể xử lý."
    };
  }
}

export async function sendToQualityReviewAction(storyId: string, note: string) {
  const mod = await requireModerator();
  if (!mod.ok) return { ok: false, error: mod.error };

  const { applyAdminQualityAction } = await import("@/lib/admin/apply-quality-action");
  return applyAdminQualityAction({
    storyId,
    action: "hide_temporarily",
    moderatorNote: note.trim() || "Chuyển từ kiểm duyệt nội dung",
    reasonCodes: ["moderator_confirmed_low_quality"]
  });
}
