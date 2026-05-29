import { createClient } from "@/lib/supabase/server";
import type {
  NotificationGroup,
  NotificationItem,
  NotificationPreferences
} from "@/types/notification";
import { getNotificationGroup } from "@/lib/notifications/notification-categories";
import type { NotificationFilterTab } from "@/types/notification";
import { filterNotificationsByTab } from "@/lib/notifications/filter-notifications";

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getUserNotifications(input: {
  userId: string;
  limit?: number;
  offset?: number;
  group?: NotificationGroup | "all";
  tab?: NotificationFilterTab;
  unreadOnly?: boolean;
}): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const limit = input.limit ?? 30;
  const offset = input.offset ?? 0;
  let query = supabase
    .from("notifications")
    .select(
      "id, user_id, type, title, body, target_type, target_id, action_url, metadata, read_at, created_at"
    )
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false });

  if (input.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  const items = (data ?? []) as NotificationItem[];

  if (input.tab) {
    return filterNotificationsByTab(items, input.tab);
  }

  if (!input.group || input.group === "all") {
    return items;
  }

  return items.filter((item) => getNotificationGroup(item.type) === input.group);
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data, error } = await supabase
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
    await supabase.from("notification_preferences").upsert({
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
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    reader_enabled: input.reader_enabled,
    author_enabled: input.author_enabled,
    system_enabled: input.system_enabled
  });

  if (error) {
    throw error;
  }
}
