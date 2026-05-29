"use server";

import { getAdminUserDetailFull } from "@/lib/admin/get-admin-user-detail-full";

export async function loadAdminUserDetailAction(userId: string) {
  return getAdminUserDetailFull(userId);
}
