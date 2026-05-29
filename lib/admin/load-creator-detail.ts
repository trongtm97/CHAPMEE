"use server";

import { getAdminCreatorDetail } from "@/lib/admin/get-creator-detail";

export async function loadAdminCreatorDetailAction(userId: string) {
  return getAdminCreatorDetail(userId);
}
