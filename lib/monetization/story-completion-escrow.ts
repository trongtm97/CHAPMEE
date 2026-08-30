import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { insertCreatorWalletLedgerEntry } from "@/lib/data/creator-finance";
import { shiftCreatorWalletBalances } from "@/lib/data/payouts";
import { createClient } from "@/lib/data/server";
import type {
  CreatorEarningReleaseStatus,
  StoryAdminCompletionStatus
} from "@/types/story-completion";
import type { CreatorRevenueStatus } from "@/types/wallet";

const STORY_COMPLETION_LOCKED_REASON = "story_completion_pending";

export async function getStoryAdminCompletionStatus(
  storyId: string
): Promise<StoryAdminCompletionStatus> {
  const db = await createClient();
  const { data } = await db
    .from("stories")
    .select("admin_completion_status")
    .eq("id", storyId)
    .maybeSingle();

  const status = String(data?.admin_completion_status ?? "not_requested");
  if (
    status === "pending_review" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return "not_requested";
}

export function isStoryCompletionApproved(status: StoryAdminCompletionStatus) {
  return status === "approved";
}

export async function resolveFullStoryPurchaseRevenue(input: {
  storyId: string;
  baseRevenueStatus: CreatorRevenueStatus;
}): Promise<{
  revenueStatus: CreatorRevenueStatus;
  releaseStatus: CreatorEarningReleaseStatus;
  lockedReason: string | null;
  escrowHeld: boolean;
}> {
  const adminStatus = await getStoryAdminCompletionStatus(input.storyId);

  if (isStoryCompletionApproved(adminStatus)) {
    return {
      revenueStatus: input.baseRevenueStatus,
      releaseStatus: "available",
      lockedReason: null,
      escrowHeld: false
    };
  }

  return {
    revenueStatus: "locked",
    releaseStatus: "locked_until_story_completion",
    lockedReason: STORY_COMPLETION_LOCKED_REASON,
    escrowHeld: true
  };
}

export async function sumLockedFullStoryRevenueForStory(storyId: string) {
  const db = await createClient();
  const { data } = await db
    .from("creator_earning_transactions")
    .select("creator_net_amount_vnd")
    .eq("story_id", storyId)
    .eq("source_type", "story_unlock")
    .eq("release_status", "locked_until_story_completion")
    .eq("status", "settled");

  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.creator_net_amount_vnd ?? 0),
    0
  );
}

export async function sumLockedFullStoryRevenueForCreator(creatorUserId: string) {
  const db = await createClient();
  const { data } = await db
    .from("creator_earning_transactions")
    .select("creator_net_amount_vnd")
    .eq("creator_user_id", creatorUserId)
    .eq("source_type", "story_unlock")
    .eq("release_status", "locked_until_story_completion")
    .eq("status", "settled");

  return (data ?? []).reduce(
    (sum, row) => sum + Number(row.creator_net_amount_vnd ?? 0),
    0
  );
}

export async function unlockStoryFullAccessEscrowRevenue(input: {
  storyId: string;
  adminUserId: string;
  adminNote?: string | null;
}) {
  const db = await createClient();

  const { data: story, error: storyError } = await db
    .from("stories")
    .select(
      "id, title, admin_completion_status, creator_profiles(user_id)"
    )
    .eq("id", input.storyId)
    .maybeSingle();

  if (storyError || !story) {
    return { ok: false, error: "Không tìm thấy truyện.", unlockedAmountVnd: 0 };
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;
  const creatorUserId = creator?.user_id as string | undefined;
  if (!creatorUserId) {
    return { ok: false, error: "Không xác định được tác giả.", unlockedAmountVnd: 0 };
  }

  const { data: lockedRows, error: lockedError } = await db
    .from("creator_earning_transactions")
    .select("id, creator_net_amount_vnd, legacy_transaction_id")
    .eq("story_id", input.storyId)
    .eq("creator_user_id", creatorUserId)
    .eq("source_type", "story_unlock")
    .eq("release_status", "locked_until_story_completion")
    .eq("status", "settled");

  if (lockedError) {
    return { ok: false, error: lockedError.message, unlockedAmountVnd: 0 };
  }

  const unlockAmount = (lockedRows ?? []).reduce(
    (sum, row) => sum + Number(row.creator_net_amount_vnd ?? 0),
    0
  );

  const now = new Date().toISOString();
  const { error: storyUpdateError } = await db
    .from("stories")
    .update({
      admin_completion_status: "approved",
      admin_completion_reviewed_at: now,
      admin_completion_reviewed_by: input.adminUserId,
      admin_completion_note: input.adminNote?.trim() || null
    })
    .eq("id", input.storyId);

  if (storyUpdateError) {
    return { ok: false, error: storyUpdateError.message, unlockedAmountVnd: 0 };
  }

  if (unlockAmount > 0) {
    const shifted = await shiftCreatorWalletBalances({
      creatorUserId,
      from: "locked",
      to: "available",
      amountVnd: unlockAmount
    });

    if (!shifted.data) {
      await db
        .from("stories")
        .update({
          admin_completion_status: story.admin_completion_status,
          admin_completion_reviewed_at: null,
          admin_completion_reviewed_by: null
        })
        .eq("id", input.storyId);
      return {
        ok: false,
        error: shifted.error ?? "Không thể mở khóa doanh thu trọn bộ.",
        unlockedAmountVnd: 0
      };
    }

    const earningIds = (lockedRows ?? []).map((row) => String(row.id));
    await db
      .from("creator_earning_transactions")
      .update({
        release_status: "released",
        locked_reason: null
      })
      .in("id", earningIds);

    for (const row of lockedRows ?? []) {
      const amount = Number(row.creator_net_amount_vnd ?? 0);
      if (!(amount > 0)) continue;

      await insertCreatorWalletLedgerEntry({
        creatorUserId,
        type: "penalty_release",
        amountVnd: amount,
        direction: "credit",
        sourceType: "story_unlock",
        sourceId: String(row.id),
        storyId: input.storyId,
        earningTransactionId: String(row.id),
        balanceType: "available",
        description: "Mở khóa doanh thu bán trọn bộ sau khi admin xác nhận hoàn thành",
        metadata: {
          release_status: "released",
          locked_reason: STORY_COMPLETION_LOCKED_REASON,
          admin_user_id: input.adminUserId,
          legacy_transaction_id: row.legacy_transaction_id
        }
      });

      if (row.legacy_transaction_id) {
        const { data: txRow } = await db
          .from("transactions")
          .select("metadata")
          .eq("id", row.legacy_transaction_id)
          .maybeSingle();

        await db
          .from("transactions")
          .update({
            metadata: {
              ...((txRow?.metadata as Record<string, unknown> | null) ?? {}),
              release_status: "released",
              locked_reason: null,
              story_completion_unlocked_at: now,
              story_completion_unlocked_by: input.adminUserId
            }
          })
          .eq("id", row.legacy_transaction_id);
      }
    }
  }

  await createAdminAuditLog({
    action: "approve_story_completion",
    targetType: "story",
    targetId: input.storyId,
    note: input.adminNote?.trim() || null,
    metadata: {
      story_id: input.storyId,
      author_id: creatorUserId,
      admin_id: input.adminUserId,
      unlocked_amount_vnd: unlockAmount
    },
    actorId: input.adminUserId
  });

  return { ok: true, error: null, unlockedAmountVnd: unlockAmount };
}

export async function rejectStoryCompletionReview(input: {
  storyId: string;
  adminUserId: string;
  adminNote: string;
}) {
  const note = input.adminNote.trim();
  if (!note) {
    return { ok: false, error: "Vui lòng nhập lý do từ chối." };
  }

  const db = await createClient();
  const { data: story } = await db
    .from("stories")
    .select("id, title, admin_completion_status, creator_profiles(user_id)")
    .eq("id", input.storyId)
    .maybeSingle();

  if (!story) {
    return { ok: false, error: "Không tìm thấy truyện." };
  }

  if (story.admin_completion_status !== "pending_review") {
    return { ok: false, error: "Truyện không ở trạng thái chờ duyệt." };
  }

  const creator = Array.isArray(story.creator_profiles)
    ? story.creator_profiles[0]
    : story.creator_profiles;
  const creatorUserId = creator?.user_id as string | undefined;

  const now = new Date().toISOString();
  const { error } = await db
    .from("stories")
    .update({
      admin_completion_status: "rejected",
      admin_completion_reviewed_at: now,
      admin_completion_reviewed_by: input.adminUserId,
      admin_completion_note: note
    })
    .eq("id", input.storyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createAdminAuditLog({
    action: "reject_story_completion",
    targetType: "story",
    targetId: input.storyId,
    note,
    metadata: {
      story_id: input.storyId,
      author_id: creatorUserId ?? null,
      admin_id: input.adminUserId
    },
    actorId: input.adminUserId
  });

  return { ok: true, error: null };
}
