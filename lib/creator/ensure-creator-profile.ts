import "server-only";

import { getCreatorProfileByUserId, type CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { suggestDefaultUsername } from "@/lib/username/suggest-default-username";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { awardBadge } from "@/lib/data/badges";
import { createClient } from "@/lib/data/server";

function resolveAutoDisplayName(input: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
}) {
  const fromProfile = input.displayName?.trim();
  if (fromProfile && fromProfile.length >= 2) {
    return fromProfile.slice(0, 80);
  }

  const emailLocal = input.email?.split("@")[0]?.replace(/[^a-zA-Z0-9._-]/g, "").trim();
  if (emailLocal && emailLocal.length >= 2) {
    return emailLocal.slice(0, 50);
  }

  return `TacGia${input.userId.replace(/-/g, "").slice(0, 8)}`;
}

async function pickValidDisplayName(
  candidates: string[],
  userId: string
): Promise<string> {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const policy = await validateDisplayName(trimmed, userId);
    if (policy.valid && policy.normalized) {
      return policy.normalized;
    }
  }

  return resolveAutoDisplayName({ userId, displayName: candidates[0] ?? null });
}

/**
 * Idempotent: ensures the user has an active creator_profiles row.
 * No UI — used when entering Studio or starting creator actions.
 */
export async function ensureCreatorProfile(
  userId: string
): Promise<CreatorProfile | null> {
  const existing = await getCreatorProfileByUserId(userId);
  if (existing.creatorProfile) {
    return existing.creatorProfile;
  }

  if (existing.error) {
    console.warn("[ensureCreatorProfile] load failed", existing.error);
  }

  const db = await createClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("display_name, username, bio")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.warn("[ensureCreatorProfile] profiles", profileError.message);
  }

  const {
    data: { user }
  } = await db.auth.getUser();

  const displayName = await pickValidDisplayName(
    [profile?.display_name ?? "", resolveAutoDisplayName({ userId, email: user?.email })],
    userId
  );

  const bioValue = profile?.bio?.trim().slice(0, 500) ?? "";

  let username = profile?.username?.trim() || null;
  if (!username) {
    username = await suggestDefaultUsername(displayName, userId);
  }

  const { error: profileUpdateError } = await db
    .from("profiles")
    .update({
      bio: bioValue || null,
      display_name: displayName,
      ...(username ? { username } : {})
    })
    .eq("id", userId);

  if (profileUpdateError) {
    console.warn("[ensureCreatorProfile] profile update", profileUpdateError.message);
  }

  const { error: insertError } = await db.from("creator_profiles").insert({
    bio: bioValue || null,
    pen_name: displayName,
    status: "active",
    user_id: userId
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const retry = await getCreatorProfileByUserId(userId);
      if (retry.creatorProfile) {
        return retry.creatorProfile;
      }
    }
    console.warn("[ensureCreatorProfile] insert", insertError.message);
  }

  try {
    await awardBadge({
      metadata: { display_name: displayName, auto: true },
      userId,
      badgeKey: "author_new"
    });
  } catch {
    // Non-blocking
  }

  const created = await getCreatorProfileByUserId(userId);
  if (created.creatorProfile) {
    return created.creatorProfile;
  }

  return {
    id: userId,
    user_id: userId,
    pen_name: displayName,
    display_name: displayName,
    bio: bioValue || null,
    status: "active",
    created_at: new Date().toISOString()
  };
}
