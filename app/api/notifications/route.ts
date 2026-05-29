import { NextResponse } from "next/server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  getUnreadNotificationCount,
  getUserNotifications
} from "@/lib/supabase/notifications";
import type { NotificationFilterTab, NotificationGroup } from "@/types/notification";

const legacyGroups = new Set<NotificationGroup | "all">(["all", "reader", "author", "system"]);
const tabs = new Set<NotificationFilterTab>([
  "all",
  "unread",
  "reading",
  "author",
  "community",
  "wallet",
  "system"
]);

export async function GET(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await assertActionAccess("notification.view.own");
  } catch (error) {
    const message =
      error instanceof ActionAccessError
        ? error.message
        : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const rawTab = searchParams.get("tab") as NotificationFilterTab | null;
  const rawGroup = searchParams.get("group") as NotificationGroup | "all" | null;
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const tab =
    rawTab && tabs.has(rawTab)
      ? rawTab
      : rawGroup && legacyGroups.has(rawGroup)
        ? rawGroup === "reader"
          ? "reading"
          : rawGroup === "author"
            ? "author"
            : rawGroup === "system"
              ? "system"
              : "all"
        : "all";

  const items = await getUserNotifications({
    group: "all",
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 20,
    offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
    tab: tab === "all" && unreadOnly ? "unread" : tab,
    unreadOnly: tab === "unread" || unreadOnly,
    userId: user.id
  });

  const unreadCount = await getUnreadNotificationCount(user.id);

  return NextResponse.json({
    items,
    unreadCount
  });
}
