"use server";

import { allocateUsernameFromDisplayName } from "@/lib/username/generate-username-from-display-name";
import {
  isReservedUsername,
  isValidUsernameShape,
  USERNAME_MAX_LENGTH
} from "@/lib/username/normalize-username";
import { createClient } from "@/lib/supabase/server";

function fallbackBase(userId: string) {
  return `user${userId.replace(/-/g, "").slice(0, 8)}`.slice(0, USERNAME_MAX_LENGTH);
}

async function isUsernameAvailable(
  username: string,
  userId: string
): Promise<boolean> {
  if (!isValidUsernameShape(username) || isReservedUsername(username)) {
    return false;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle();

  return !data;
}

/**
 * Gán username tự động từ tên hiển thị nếu chưa có (hoặc username hiện tại không hợp lệ).
 */
export async function ensureProfileUsername(
  userId: string,
  displayName?: string | null
): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const current = profile.username?.trim().toLowerCase() ?? "";
  if (current && isValidUsernameShape(current) && !isReservedUsername(current)) {
    return current;
  }

  const name = displayName?.trim() || profile.display_name?.trim() || "";
  let allocated = name
    ? await allocateUsernameFromDisplayName(name, userId)
    : null;

  if (!allocated) {
    const base = fallbackBase(userId);
    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate =
        suffix === 0 ? base : `${base}${suffix}`.slice(0, USERNAME_MAX_LENGTH);
      if (await isUsernameAvailable(candidate, userId)) {
        allocated = candidate;
        break;
      }
    }
  }

  if (!allocated) {
    return null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: allocated })
    .eq("id", userId);

  if (error) {
    return null;
  }

  return allocated;
}
