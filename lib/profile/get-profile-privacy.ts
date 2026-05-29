import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PROFILE_PRIVACY,
  type ProfilePrivacySettings
} from "@/types/public-profile";

type PrivacyRow = {
  user_id: string;
  show_public_collections: boolean;
  show_public_activities: boolean;
  show_public_comments: boolean;
  show_badges: boolean;
  show_creator_works: boolean;
  show_reading_history: boolean;
  show_saved_stories: boolean;
  show_followed_authors: boolean;
  show_followed_groups: boolean;
  allow_follow: boolean;
  allow_dm: boolean;
  updated_at: string;
};

function toPrivacySettings(row: PrivacyRow): ProfilePrivacySettings {
  return {
    userId: row.user_id,
    showPublicCollections: row.show_public_collections,
    showPublicActivities: row.show_public_activities,
    showPublicComments: row.show_public_comments,
    showBadges: row.show_badges,
    showCreatorWorks: row.show_creator_works,
    showReadingHistory: row.show_reading_history,
    showSavedStories: row.show_saved_stories,
    showFollowedAuthors: row.show_followed_authors,
    showFollowedGroups: row.show_followed_groups,
    allowFollow: row.allow_follow,
    allowDm: row.allow_dm,
    updatedAt: row.updated_at
  };
}

export function defaultPrivacyForUser(userId: string): ProfilePrivacySettings {
  return {
    userId,
    ...DEFAULT_PROFILE_PRIVACY,
    updatedAt: new Date().toISOString()
  };
}

export async function getProfilePrivacySettings(
  userId: string
): Promise<ProfilePrivacySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return defaultPrivacyForUser(userId);
  }

  return toPrivacySettings(data as PrivacyRow);
}

export async function ensureProfilePrivacySettings(
  userId: string
): Promise<ProfilePrivacySettings> {
  const existing = await getProfilePrivacySettings(userId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_privacy_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return existing;
  }

  const { data: inserted, error } = await supabase
    .from("profile_privacy_settings")
    .insert({
      user_id: userId,
      ...DEFAULT_PROFILE_PRIVACY
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return existing;
  }

  return toPrivacySettings(inserted as PrivacyRow);
}
