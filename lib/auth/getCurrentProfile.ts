import { createClient } from "@/lib/data/server";
import { resolveProfileAvatarUrl } from "@/lib/profile/resolve-profile-avatar";

export type ProfileRole = "user" | "admin" | "moderator" | "founder";

export type CurrentProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: ProfileRole;
};

export type CurrentProfileState = {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: CurrentProfile | null;
  error: string | null;
};

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export function isAdminOrModerator(profile: CurrentProfile | null) {
  return (
    profile?.role === "admin" ||
    profile?.role === "moderator" ||
    profile?.role === "founder"
  );
}

export function isAdminOrFounder(profile: CurrentProfile | null) {
  return profile?.role === "admin" || profile?.role === "founder";
}

export async function getCurrentProfile(): Promise<CurrentProfileState> {
  try {
    const db = await createClient();
    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError) {
      if (isMissingAuthSession(userError.message)) {
        return { user: null, profile: null, error: null };
      }

      return { user: null, profile: null, error: userError.message };
    }

    if (!user) {
      return { user: null, profile: null, error: null };
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, username, display_name, avatar_url, default_avatar_id, bio, role")
      .eq("id", user.id)
      .maybeSingle();

    const row = profile as CurrentProfile | null;
    const mapped = row
      ? { ...row, avatar_url: resolveProfileAvatarUrl(row) }
      : row;

    return {
      user: {
        id: user.id,
        email: user.email
      },
      profile: mapped,
      error: profileError?.message ?? null
    };
  } catch (error) {
    return {
      user: null,
      profile: null,
      error:
        error instanceof Error ? error.message : "Không thể tải hồ sơ hiện tại."
    };
  }
}
