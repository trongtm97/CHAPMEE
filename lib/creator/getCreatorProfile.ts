import { cache } from "react";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { createClient } from "@/lib/supabase/server";

export type CreatorProfile = {
  id: string;
  user_id: string;
  /** @deprecated Use display_name — kept for DB/legacy reads only. */
  pen_name: string;
  display_name: string;
  bio: string | null;
  status: "active" | "suspended";
  created_at: string;
};

export type CreatorProfileState = {
  user: {
    id: string;
    email?: string;
  } | null;
  creatorProfile: CreatorProfile | null;
  error: string | null;
};

function mapCreatorRow(
  row: {
    id: string;
    user_id: string;
    pen_name: string;
    bio: string | null;
    status: "active" | "suspended";
    created_at: string;
    profiles?:
      | { display_name: string | null; username: string | null }
      | { display_name: string | null; username: string | null }[]
      | null;
  } | null
): CreatorProfile | null {
  if (!row) {
    return null;
  }

  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const display_name = resolvePublicDisplayName(profile, row);

  return {
    bio: row.bio,
    created_at: row.created_at,
    display_name,
    id: row.id,
    pen_name: row.pen_name,
    status: row.status,
    user_id: row.user_id
  };
}

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

const CREATOR_SELECT =
  "id, user_id, pen_name, bio, status, created_at, profiles!creator_profiles_user_id_fkey(display_name, username)";

export const getCreatorProfileByUserId = cache(
  async function getCreatorProfileByUserId(
    userId: string
  ): Promise<{ creatorProfile: CreatorProfile | null; error: string | null }> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("creator_profiles")
        .select(CREATOR_SELECT)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      return {
        creatorProfile: mapCreatorRow(data),
        error: error?.message ?? null
      };
    } catch (error) {
      return {
        creatorProfile: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load creator profile."
      };
    }
  }
);

export const getCurrentCreatorProfile = cache(
  async function getCurrentCreatorProfile(): Promise<CreatorProfileState> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) {
        if (isMissingAuthSession(userError.message)) {
          return { user: null, creatorProfile: null, error: null };
        }

        return { user: null, creatorProfile: null, error: userError.message };
      }

      if (!user) {
        return { user: null, creatorProfile: null, error: null };
      }

      const { data, error } = await supabase
        .from("creator_profiles")
        .select(CREATOR_SELECT)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      return {
        user: {
          id: user.id,
          email: user.email
        },
        creatorProfile: mapCreatorRow(data),
        error: error?.message ?? null
      };
    } catch (error) {
      return {
        user: null,
        creatorProfile: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load creator profile."
      };
    }
  }
);
