import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { syncAuthUserShim } from "@/lib/auth/sync-auth-user-shim";
import { getStableDefaultAvatarId } from "@/lib/profile/default-avatar";
import { allocateUsernameFromDisplayName } from "@/lib/username/generate-username-from-display-name";

type EnsureProfileInput = {
  userId: string;
  email: string;
  displayName?: string | null;
};

function fallbackUsername(userId: string) {
  const base = `u${userId.replace(/-/g, "").slice(0, 20)}`;
  return base.length >= 3 ? base.slice(0, 30) : `u${Date.now().toString(36).slice(-8)}`;
}

export async function ensureProfileForUser({
  userId,
  email,
  displayName
}: EnsureProfileInput) {
  await syncAuthUserShim({ id: userId, email });

  const name = displayName?.trim() || email.split("@")[0] || "Reader";
  const username =
    (await allocateUsernameFromDisplayName(name, userId)) ?? fallbackUsername(userId);
  const defaultAvatarId = getStableDefaultAvatarId(userId);

  await db.execute(sql`
    insert into public.profiles (id, display_name, username, role, default_avatar_id, created_at, updated_at)
    values (
      ${userId}::uuid,
      ${name},
      ${username},
      'user'::public.profile_role,
      ${defaultAvatarId},
      now(),
      now()
    )
    on conflict (id) do update set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      default_avatar_id = coalesce(public.profiles.default_avatar_id, excluded.default_avatar_id),
      updated_at = now()
  `);
}
