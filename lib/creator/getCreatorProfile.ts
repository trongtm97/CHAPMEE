import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CreatorProfile = {
  id: string;
  user_id: string;
  pen_name: string;
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

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export const getCreatorProfileByUserId = cache(
  async function getCreatorProfileByUserId(
    userId: string
  ): Promise<{ creatorProfile: CreatorProfile | null; error: string | null }> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("id, user_id, pen_name, bio, status, created_at")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      return {
        creatorProfile: data as CreatorProfile | null,
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
        .select("id, user_id, pen_name, bio, status, created_at")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      return {
        user: {
          id: user.id,
          email: user.email
        },
        creatorProfile: data as CreatorProfile | null,
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
