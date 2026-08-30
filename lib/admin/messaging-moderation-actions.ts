"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { requirePermission } from "@/lib/auth/require-permission";
import { notifyMessageRestriction } from "@/lib/notifications/create-message-notification";
import { restrictionEndsAt } from "@/lib/messaging/labels";
import { createClient } from "@/lib/data/server";
import type { MessagingRestrictionType } from "@/types/messaging-safety";
import type { RestrictionType } from "@/types/moderation";

export type MessagingRestrictDuration = "24h" | "7d" | "30d" | "ban";

const MESSAGE_RESTRICTION_TYPES: RestrictionType[] = [
  "message_block_24h",
  "message_block_7d",
  "message_block_30d",
  "message_banned"
];

function restrictionForDuration(
  duration: MessagingRestrictDuration
): { type: RestrictionType; hours: number | null } {
  switch (duration) {
    case "24h":
      return { type: "message_block_24h", hours: 24 };
    case "7d":
      return { type: "message_block_7d", hours: 24 * 7 };
    case "30d":
      return { type: "message_block_30d", hours: 24 * 30 };
    case "ban":
      return { type: "message_banned", hours: null };
  }
}

async function revalidateMessagingAdmin() {
  revalidatePath("/admin/messaging");
  revalidatePath("/admin/moderation/messages");
}

export async function restrictUserMessagingAction(input: {
  moderatorId: string;
  userId: string;
  duration: MessagingRestrictDuration;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const db = await createClient();
  const restriction = restrictionForDuration(input.duration);
  const endsAt = restriction.hours
    ? new Date(Date.now() + restriction.hours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await db.from("account_restrictions").insert({
    user_id: input.userId,
    restriction_type: restriction.type,
    reason: input.note ?? "Hạn chế nhắn tin (admin)",
    ends_at: endsAt,
    is_active: true,
    created_by: input.moderatorId
  });

  if (error) {
    return { ok: false, error: "Không áp dụng được hạn chế." };
  }

  const messagingTypeMap: Partial<Record<RestrictionType, MessagingRestrictionType>> = {
    message_block_24h: "mute_24h",
    message_block_7d: "mute_7d",
    message_block_30d: "mute_30d",
    message_banned: "permanent_messaging_ban"
  };
  const messagingType = messagingTypeMap[restriction.type];
  if (messagingType) {
    await db.from("messaging_restrictions").insert({
      user_id: input.userId,
      restriction_type: messagingType,
      reason_code: "other",
      note: input.note ?? null,
      ends_at: restrictionEndsAt(messagingType)?.toISOString() ?? endsAt,
      is_active: true,
      created_by: input.moderatorId
    });
  }

  await notifyMessageRestriction(input.userId, endsAt);

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_user_restricted",
    targetType: "profile",
    targetId: input.userId,
    metadata: {
      action: "restrict_messaging",
      duration: input.duration,
      note: input.note ?? null
    }
  });

  await revalidateMessagingAdmin();
  return { ok: true };
}

export async function liftUserMessagingRestrictionAction(input: {
  moderatorId: string;
  userId: string;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const db = await createClient();
  const { error } = await db
    .from("account_restrictions")
    .update({ is_active: false })
    .eq("user_id", input.userId)
    .eq("is_active", true)
    .in("restriction_type", MESSAGE_RESTRICTION_TYPES);

  if (error) {
    return { ok: false, error: "Không gỡ được hạn chế." };
  }

  await db
    .from("messaging_restrictions")
    .update({
      is_active: false,
      revoked_by: input.moderatorId,
      revoked_at: new Date().toISOString(),
      revoke_reason: input.note ?? "Admin gỡ hạn chế"
    })
    .eq("user_id", input.userId)
    .eq("is_active", true);

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_restriction_revoked",
    targetType: "profile",
    targetId: input.userId,
    metadata: {
      action: "lift_messaging_restriction",
      note: input.note ?? null
    }
  });

  await revalidateMessagingAdmin();
  return { ok: true };
}

export async function warnMessagingUserAction(input: {
  moderatorId: string;
  userId: string;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const db = await createClient();
  const { error } = await db.from("violations").insert({
    user_id: input.userId,
    target_type: "message",
    target_id: input.userId,
    policy_area: "harassment",
    severity: "warning",
    action_taken: "warn",
    strike_count: 0,
    note: input.note ?? "Cảnh cáo nhắn tin",
    report_id: null,
    created_by: input.moderatorId
  });

  if (error) {
    return { ok: false, error: "Không ghi được cảnh cáo." };
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: "messaging_user_warned",
    targetType: "profile",
    targetId: input.userId,
    metadata: {
      action: "warn_user",
      note: input.note ?? null
    }
  });

  await revalidateMessagingAdmin();
  return { ok: true };
}

export async function addMessagingModerationNoteAction(input: {
  moderatorId: string;
  userId: string;
  note: string;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission("moderation.action.create");
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (!input.note.trim()) {
    return { ok: false, error: "Ghi chú không được để trống." };
  }

  await logAdminAction({
    actorId: input.moderatorId,
    action: "message_moderation",
    targetType: "profile",
    targetId: input.userId,
    metadata: {
      action: "internal_note",
      note: input.note.trim()
    }
  });

  await revalidateMessagingAdmin();
  return { ok: true };
}
