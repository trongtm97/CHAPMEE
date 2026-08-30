"use server";

import {
  allocateProfileUsername,
  applyProfileUsername
} from "@/lib/profile/allocate-profile-username";

/**
 * Gán username tự động từ tên hiển thị nếu chưa có (hoặc username hiện tại không hợp lệ / trùng).
 */
export async function ensureProfileUsername(
  userId: string,
  displayName?: string | null
): Promise<string | null> {
  const allocated = await allocateProfileUsername(userId, displayName);
  if (!allocated) {
    return null;
  }

  const ok = await applyProfileUsername(userId, allocated);
  return ok ? allocated : null;
}
