import { NextResponse } from "next/server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  getUnreadNotificationCount,
  getUserNotifications
} from "@/lib/data/notifications";
import type { NotificationFilterTab } from "@/types/notification";

const tabs = new Set<NotificationFilterTab>(["all", "unread", "read"]);

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
  const tab = rawTab && tabs.has(rawTab) ? rawTab : "all";

  const items = await getUserNotifications({
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 20,
    offset: Number.isFinite(offset) ? Math.max(0, offset) : 0,
    tab,
    unreadOnly: tab === "unread",
    userId: user.id
  });

  const unreadCount = await getUnreadNotificationCount(user.id);

  return NextResponse.json({
    items,
    unreadCount
  });
}
