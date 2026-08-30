import { NextResponse } from "next/server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  getNotificationPreferences,
  updateNotificationPreferences
} from "@/lib/data/notifications";
import type { NotificationPreferences } from "@/types/notification";

export async function GET() {
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

  const preferences = await getNotificationPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function POST(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await assertActionAccess("notification.settings.update.own");
  } catch (error) {
    const message =
      error instanceof ActionAccessError
        ? error.message
        : "Bạn không có quyền thực hiện thao tác này.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const body = (await request.json()) as Partial<NotificationPreferences>;
  const current = await getNotificationPreferences(user.id);
  const next: NotificationPreferences = {
    reader_enabled:
      typeof body.reader_enabled === "boolean" ? body.reader_enabled : current.reader_enabled,
    author_enabled:
      typeof body.author_enabled === "boolean" ? body.author_enabled : current.author_enabled,
    system_enabled:
      typeof body.system_enabled === "boolean" ? body.system_enabled : current.system_enabled,
    community_enabled:
      typeof body.community_enabled === "boolean"
        ? body.community_enabled
        : current.community_enabled,
    wallet_enabled:
      typeof body.wallet_enabled === "boolean" ? body.wallet_enabled : current.wallet_enabled,
    creator_enabled:
      typeof body.creator_enabled === "boolean" ? body.creator_enabled : current.creator_enabled
  };

  await updateNotificationPreferences(user.id, next);
  return NextResponse.json({ ok: true, preferences: next });
}
