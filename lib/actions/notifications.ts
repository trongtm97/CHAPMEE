"use server";

import { revalidatePath } from "next/cache";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead
} from "@/lib/data/notifications";

async function guardNotificationReadAccess() {
  try {
    await assertActionAccess("notification.view.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false as const, error: error.message };
    }
    throw error;
  }
  return { ok: true as const, error: null };
}

export async function markNotificationAsReadByIdAction(notificationId: string) {
  const { user } = await getCurrentProfile();

  if (!user || !notificationId) {
    return { ok: false as const };
  }

  const access = await guardNotificationReadAccess();
  if (!access.ok) {
    return { ok: false as const };
  }

  try {
    await markNotificationAsRead(user.id, notificationId);
  } catch (error) {
    console.warn(
      "[notifications] mark as read failed",
      error instanceof Error ? error.message : "Unknown notification error"
    );
    return { ok: false as const };
  }

  revalidatePath("/notifications");
  return { ok: true as const };
}

export async function markNotificationAsReadAction(formData: FormData) {
  const notificationId = String(formData.get("notificationId") ?? "");
  await markNotificationAsReadByIdAction(notificationId);
}

export async function markAllNotificationsAsReadAction() {
  const { user } = await getCurrentProfile();

  if (!user) {
    return;
  }

  const access = await guardNotificationReadAccess();
  if (!access.ok) {
    return;
  }

  try {
    await markAllNotificationsAsRead(user.id);
  } catch (error) {
    console.warn(
      "[notifications] mark all as read failed",
      error instanceof Error ? error.message : "Unknown notification error"
    );
  }

  revalidatePath("/notifications");
}
