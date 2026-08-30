import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getSessionUser } from "@/lib/auth/get-session-user";
import type { OnboardingGoal, OnboardingRolePreference } from "@/types/onboarding";

const PROFILE_BASE_SELECT =
  "id, username, display_name, avatar_url, default_avatar_id, bio, role, status, created_at";
const PROFILE_FULL_SELECT = `${PROFILE_BASE_SELECT}, onboarding_completed, onboarding_completed_at, user_role_preference, favorite_genres, onboarding_goals`;

export type CurrentUserProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  default_avatar_id?: number | null;
  bio: string | null;
  role: "user" | "admin" | "moderator" | "founder";
  status?: string;
  created_at: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  user_role_preference?: OnboardingRolePreference | null;
  favorite_genres?: string[];
  onboarding_goals?: OnboardingGoal[];
};

export type CurrentUserState = {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: CurrentUserProfile | null;
  error: string | null;
};

export async function getCurrentUser(): Promise<CurrentUserState> {
  try {
    const db = await createClient();
    const user = await getSessionUser();

    if (!user) {
      return { user: null, profile: null, error: null };
    }

    let profileData: CurrentUserProfile | null = null;
    let profileError = null as { message: string } | null;

    const profileResult = await db
      .from("profiles")
      .select(PROFILE_FULL_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    profileData = profileResult.data as CurrentUserProfile | null;
    profileError = profileResult.error;

    if (profileError && isMissingSchemaError(profileError)) {
      const fallback = await db
        .from("profiles")
        .select(PROFILE_BASE_SELECT)
        .eq("id", user.id)
        .maybeSingle();
      profileData = fallback.data as CurrentUserProfile | null;
      profileError = fallback.error;
    }

    let profile = profileData as CurrentUserProfile | null;

    if (profile?.id) {
      const { ensureProfileUsername } = await import(
        "@/lib/profile/ensure-profile-username"
      );
      const ensured = await ensureProfileUsername(
        profile.id,
        profile.display_name
      );
      if (ensured && ensured !== profile.username) {
        profile = { ...profile, username: ensured };
      }
    }

    if (profileError && process.env.NODE_ENV === "development") {
      console.warn("[auth] profile:", profileError.message);
    }

    return {
      user: {
        id: user.id,
        email: user.email
      },
      profile,
      error: profileError?.message ?? null
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[auth] getCurrentUser failed:", message);
    }
    return { user: null, profile: null, error: null };
  }
}
