import { NextResponse } from "next/server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getUnreadNotificationCount } from "@/lib/supabase/notifications";

export async function GET() {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ unreadCount: 0 });
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

  const unreadCount = await getUnreadNotificationCount(user.id);
  return NextResponse.json({ unreadCount });
}
