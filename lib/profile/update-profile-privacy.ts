"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import type { ProfilePrivacySettings } from "@/types/public-profile";
import { ensureProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { ensureMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";

export type UpdateProfilePrivacyInput = Partial<
  Omit<ProfilePrivacySettings, "userId" | "updatedAt">
>;

export type UpdateProfilePrivacyState = {
  error: string | null;
  success: boolean;
};

export async function updateProfilePrivacyAction(
  _previous: UpdateProfilePrivacyState,
  formData: FormData
): Promise<UpdateProfilePrivacyState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/me/settings/privacy");
  }

  const keys = [
    "showPublicCollections",
    "showPublicActivities",
    "showPublicComments",
    "showBadges",
    "showCreatorWorks",
    "showReadingHistory",
    "showSavedStories",
    "showFollowedAuthors",
    "showFollowedGroups",
    "allowFollow",
    "allowDm"
  ] as const;

  const columnMap: Record<(typeof keys)[number], string> = {
    showPublicCollections: "show_public_collections",
    showPublicActivities: "show_public_activities",
    showPublicComments: "show_public_comments",
    showBadges: "show_badges",
    showCreatorWorks: "show_creator_works",
    showReadingHistory: "show_reading_history",
    showSavedStories: "show_saved_stories",
    showFollowedAuthors: "show_followed_authors",
    showFollowedGroups: "show_followed_groups",
    allowFollow: "allow_follow",
    allowDm: "allow_dm"
  };

  const payload: Record<string, boolean> = {};
  for (const key of keys) {
    payload[columnMap[key]] = formData.get(key) === "on";
  }

  const current = await ensureProfilePrivacySettings(user.id);

  const { error } = await supabase
    .from("profile_privacy_settings")
    .upsert({
      user_id: user.id,
      show_public_collections: current.showPublicCollections,
      show_public_activities: current.showPublicActivities,
      show_public_comments: current.showPublicComments,
      show_badges: current.showBadges,
      show_creator_works: current.showCreatorWorks,
      show_reading_history: current.showReadingHistory,
      show_saved_stories: current.showSavedStories,
      show_followed_authors: current.showFollowedAuthors,
      show_followed_groups: current.showFollowedGroups,
      allow_follow: current.allowFollow,
      allow_dm: current.allowDm,
      ...payload,
      updated_at: new Date().toISOString()
    });

  if (error) {
    return { error: "Không thể lưu cài đặt riêng tư.", success: false };
  }

  const allowDm = payload.allow_dm ?? current.allowDm;
  await ensureMessagePrivacySettings(user.id);
  await supabase
    .from("message_privacy_settings")
    .update({
      who_can_message: allowDm ? "followers_only" : "no_one",
      allow_message_requests: allowDm,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  revalidatePath("/me/settings/messages");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/me");
  revalidatePath("/me/settings/privacy");
  revalidatePublicProfilePaths(profile?.username);

  return { error: null, success: true };
}
