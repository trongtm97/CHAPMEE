"use server";

import { createClient } from "@/lib/data/server";
import { getNotificationGroup } from "@/lib/notifications/notification-groups";
import type {
  NotificationItem,
  NotificationMetadata,
  NotificationTargetType,
  NotificationType
} from "@/types/notification";

type CreateNotificationData = {
  title: string;
  body: string;
  targetType?: NotificationTargetType | null;
  targetId?: string | null;
  actionUrl?: string | null;
  metadata?: NotificationMetadata | null;
  dedupeWindowMinutes?: number;
  actorUserId?: string | null;
  /** skip: không tạo nếu đã có; update: làm mới bản ghi cũ trong cửa sổ dedupe */
  mergeMode?: "skip" | "update";
};

function normalizeUserIds(userIds: string[]) {
  return Array.from(new Set(userIds.filter(Boolean)));
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  data: CreateNotificationData
): Promise<NotificationItem | null> {
  if (!userId) {
    return null;
  }

  if (data.actorUserId && data.actorUserId === userId) {
    return null;
  }

  const db = await createClient();
  const dedupeWindowMinutes = data.dedupeWindowMinutes ?? 20;
  const sinceIso = new Date(Date.now() - dedupeWindowMinutes * 60_000).toISOString();

  try {
    const group = getNotificationGroup(type);
    const { data: preferences } = await db
      .from("notification_preferences")
      .select("reader_enabled, author_enabled, system_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (
      (group === "reader" && preferences && !preferences.reader_enabled) ||
      (group === "author" && preferences && !preferences.author_enabled) ||
      (group === "system" && preferences && !preferences.system_enabled)
    ) {
      return null;
    }

    const dedupeQuery = db
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: existing, error: dedupeError } = data.targetId
      ? await dedupeQuery.eq("target_id", data.targetId)
      : await dedupeQuery.is("target_id", null);

    if (dedupeError) {
      console.warn("[notifications] dedupe failed", dedupeError.message);
    } else if ((existing ?? []).length > 0) {
      const existingId = existing![0].id as string;
      if (data.mergeMode === "update") {
        const { data: updated, error: updateError } = await db
          .from("notifications")
          .update({
            title: data.title,
            body: data.body,
            action_url: data.actionUrl ?? null,
            metadata: data.metadata ?? null,
            read_at: null,
            created_at: new Date().toISOString()
          })
          .eq("id", existingId)
          .eq("user_id", userId)
          .select(
            "id, user_id, type, title, body, target_type, target_id, action_url, metadata, read_at, created_at"
          )
          .maybeSingle();

        if (updateError) {
          console.warn("[notifications] merge update failed", updateError.message);
          return null;
        }

        return (updated ?? null) as NotificationItem | null;
      }

      return null;
    }

    const { data: created, error } = await db
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title: data.title,
        body: data.body,
        target_type: data.targetType ?? null,
        target_id: data.targetId ?? null,
        action_url: data.actionUrl ?? null,
        metadata: data.metadata ?? null
      })
      .select(
        "id, user_id, type, title, body, target_type, target_id, action_url, metadata, read_at, created_at"
      )
      .maybeSingle();

    if (error) {
      console.warn("[notifications] create failed", error.message);
      return null;
    }

    return (created ?? null) as NotificationItem | null;
  } catch (error) {
    console.warn(
      "[notifications] create failed",
      error instanceof Error ? error.message : "Unknown notification error"
    );
    return null;
  }
}

export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  data: CreateNotificationData
) {
  const uniqueUserIds = normalizeUserIds(userIds);

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const created = await Promise.all(
    uniqueUserIds.map((userId) => createNotification(userId, type, data))
  );

  return created.filter((item): item is NotificationItem => Boolean(item));
}
