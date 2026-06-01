import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { ensureProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { createClient } from "@/lib/supabase/server";
import { getUserVerificationSummary } from "@/lib/verification/get-user-verification";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import type { StudioSettingsFormValues, StudioSettingsPageData } from "@/types/studio-settings";

export async function getStudioSettingsPageData(
  creatorProfile: CreatorProfile
): Promise<StudioSettingsPageData> {
  const supabase = await createClient();

  const [profileResult, privacy, verification, storiesCountResult, followerCountResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, bio, created_at")
        .eq("id", creatorProfile.user_id)
        .maybeSingle(),
      ensureProfilePrivacySettings(creatorProfile.user_id),
      getUserVerificationSummary(creatorProfile.user_id),
      supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorProfile.id)
        .eq("visibility", "public")
        .in("status", ["published", "approved"]),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorProfile.id)
    ]);

  const profile = profileResult.data;
  const username = profile?.username ?? "";

  const initialValues: StudioSettingsFormValues = {
    avatarUrl: profile?.avatar_url ?? "",
    bio: profile?.bio ?? creatorProfile.bio ?? "",
    displayName: profile?.display_name?.trim() || creatorProfile.display_name,
    privacy: {
      allowDm: privacy.allowDm,
      allowFollow: privacy.allowFollow,
      showBadges: privacy.showBadges,
      showCreatorWorks: privacy.showCreatorWorks,
      showFollowedAuthors: privacy.showFollowedAuthors,
      showFollowedGroups: privacy.showFollowedGroups,
      showPublicActivities: privacy.showPublicActivities,
      showPublicCollections: privacy.showPublicCollections,
      showPublicComments: privacy.showPublicComments,
      showReadingHistory: privacy.showReadingHistory,
      showSavedStories: privacy.showSavedStories
    },
    username,
    usernameManuallyEdited: Boolean(username)
  };

  const profilePath = getProfileUrlOrFallback(username);

  return {
    accountCreatedAt: profile?.created_at ?? creatorProfile.created_at ?? null,
    creatorId: creatorProfile.id,
    email: null,
    followerCount: followerCountResult.count ?? 0,
    initialValues,
    profilePath,
    publicStoriesCount: storiesCountResult.count ?? 0,
    userId: creatorProfile.user_id,
    verification
  };
}
