import { cache } from "react";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import type { PostgrestRow } from "@/lib/db/postgrest-row";
import { createClient } from "@/lib/data/server";

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

function mapCreatorRow(row: PostgrestRow | null): CreatorProfile | null {
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
const CREATOR_SELECT_FALLBACK = "id, user_id, pen_name, bio, status, created_at";

async function attachProfileDisplayName<T extends PostgrestRow | null>(
  db: Awaited<ReturnType<typeof createClient>>,
  row: T
): Promise<T> {
  if (!row?.user_id || row.profiles) {
    return row;
  }

  const { data } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("id", row.user_id as string)
    .maybeSingle();

  return data ? ({ ...row, profiles: data } as T) : row;
}

export const getCreatorProfileByUserId = cache(
  async function getCreatorProfileByUserId(
    userId: string
  ): Promise<{ creatorProfile: CreatorProfile | null; error: string | null }> {
    try {
      const db = await createClient();
      const { data, error } = await db
        .from("creator_profiles")
        .select(CREATOR_SELECT)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        const fallback = await db
          .from("creator_profiles")
          .select(CREATOR_SELECT_FALLBACK)
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        return {
          creatorProfile: mapCreatorRow(await attachProfileDisplayName(db, fallback.data)),
          error: fallback.error?.message ?? null
        };
      }

      return {
        creatorProfile: mapCreatorRow(data),
        error: null
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
      const db = await createClient();
      const {
        data: { user },
        error: userError
      } = await db.auth.getUser();

      if (userError) {
        if (isMissingAuthSession(userError.message)) {
          return { user: null, creatorProfile: null, error: null };
        }

        return { user: null, creatorProfile: null, error: userError.message };
      }

      if (!user) {
        return { user: null, creatorProfile: null, error: null };
      }

      const { data, error } = await db
        .from("creator_profiles")
        .select(CREATOR_SELECT)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        const fallback = await db
          .from("creator_profiles")
          .select(CREATOR_SELECT_FALLBACK)
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        return {
          user: {
            id: user.id,
            email: user.email
          },
          creatorProfile: mapCreatorRow(await attachProfileDisplayName(db, fallback.data)),
          error: fallback.error?.message ?? null
        };
      }

      return {
        user: {
          id: user.id,
          email: user.email
        },
        creatorProfile: mapCreatorRow(data),
        error: null
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
