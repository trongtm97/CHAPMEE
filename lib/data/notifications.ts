import { createClient } from "@/lib/data/server";
import { mapUserNotificationToNotificationItem } from "@/lib/notifications/campaign-notification-adapter";
import { filterNotificationsByTab } from "@/lib/notifications/filter-notifications";
import { sanitizeUserNotificationHref } from "@/lib/platform-content/campaign-href";
import type {
  NotificationGroup,
  NotificationItem,
  NotificationPreferences
} from "@/types/notification";
import type { NotificationFilterTab } from "@/types/notification";
import { listUserNotifications } from "@/lib/platform-content/notification-campaigns";

function sanitizeNotificationItem(item: NotificationItem): NotificationItem {
  const href = sanitizeUserNotificationHref(item.action_url);
  return href === item.action_url ? item : { ...item, action_url: href };
}

export async function getUnreadNotificationCount(userId: string) {
  const db = await createClient();
  const [legacyRes, campaignRes] = await Promise.all([
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    db
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
  ]);

  if (legacyRes.error || campaignRes.error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[notifications] unread count:",
        legacyRes.error?.message ?? campaignRes.error?.message
      );
    }
    return 0;
  }

  return (legacyRes.count ?? 0) + (campaignRes.count ?? 0);
}

export async function getUserNotifications(input: {
  userId: string;
  limit?: number;
  offset?: number;
  group?: NotificationGroup | "all";
  tab?: NotificationFilterTab;
  unreadOnly?: boolean;
}): Promise<NotificationItem[]> {
  const limit = input.limit ?? 30;
  const offset = input.offset ?? 0;
  const fetchSize = Math.min(100, limit + offset);

  const db = await createClient();
  let legacyQuery = db
    .from("notifications")
    .select(
      "id, user_id, type, title, body, target_type, target_id, action_url, metadata, read_at, created_at"
    )
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false });

  if (input.unreadOnly) {
    legacyQuery = legacyQuery.is("read_at", null);
  }

  const [legacyRes, campaignRes] = await Promise.all([
    legacyQuery.range(0, fetchSize - 1),
    listUserNotifications({
      userId: input.userId,
      unreadOnly: input.unreadOnly,
      limit: fetchSize,
      offset: 0
    })
  ]);

  if (legacyRes.error) {
    throw legacyRes.error;
  }

  if (campaignRes.error) {
    throw campaignRes.error;
  }

  const legacyItems = (legacyRes.data ?? []).map((row) =>
    sanitizeNotificationItem(row as NotificationItem)
  );
  const campaignItems = campaignRes.items.map((item) =>
    sanitizeNotificationItem(mapUserNotificationToNotificationItem(item))
  );
  const merged = [...legacyItems, ...campaignItems]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const filtered =
    input.tab && input.tab !== "all"
      ? filterNotificationsByTab(merged, input.tab)
      : merged;

  return filtered.slice(offset, offset + limit);
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const {
    isCampaignNotificationId,
    stripCampaignNotificationId
  } = await import("@/lib/notifications/campaign-notification-adapter");

  if (isCampaignNotificationId(notificationId)) {
    const { markNotificationRead } = await import(
      "@/lib/platform-content/notification-campaigns"
    );
    const { error } = await markNotificationRead(
      userId,
      stripCampaignNotificationId(notificationId)
    );
    if (error) {
      throw new Error(error);
    }
    return;
  }

  const db = await createClient();
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const db = await createClient();
  const { markAllUserNotificationsRead } = await import(
    "@/lib/platform-content/notification-campaigns"
  );

  const [legacyRes, campaignRes] = await Promise.all([
    db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null),
    markAllUserNotificationsRead(userId)
  ]);

  if (legacyRes.error) {
    throw legacyRes.error;
  }

  if (campaignRes.error) {
    throw new Error(campaignRes.error);
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const db = await createClient();
  const { data, error } = await db
    .from("notification_preferences")
    .select("reader_enabled, author_enabled, system_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const defaults: NotificationPreferences = {
    reader_enabled: true,
    author_enabled: true,
    system_enabled: true,
    community_enabled: true,
    wallet_enabled: true,
    creator_enabled: true
  };

  if (!data) {
    await db.from("notification_preferences").upsert({
      user_id: userId,
      reader_enabled: defaults.reader_enabled,
      author_enabled: defaults.author_enabled,
      system_enabled: defaults.system_enabled
    });
    return defaults;
  }

  const row = data as NotificationPreferences;
  return {
    ...defaults,
    ...row,
    community_enabled: row.community_enabled ?? row.reader_enabled ?? true,
    wallet_enabled: row.wallet_enabled ?? true,
    creator_enabled: row.creator_enabled ?? row.author_enabled ?? true
  };
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferences
) {
  const db = await createClient();
  const { error } = await db.from("notification_preferences").upsert({
    user_id: userId,
    reader_enabled: input.reader_enabled,
    author_enabled: input.author_enabled,
    system_enabled: input.system_enabled
  });

  if (error) {
    throw error;
  }
}
