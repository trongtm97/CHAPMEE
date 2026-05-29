import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      if (isMissingAuthSession(userError.message)) {
        return { user: null, profile: null, error: null };
      }

      return { user: null, profile: null, error: userError.message };
    }

    if (!user) {
      return { user: null, profile: null, error: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile as CurrentProfile | null,
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
