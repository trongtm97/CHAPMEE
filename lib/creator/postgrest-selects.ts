/** Shared db select fragments for creator identity (profile-backed). */
export const CREATOR_PROFILE_PUBLIC_SELECT =
  "id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username, avatar_url)";

export const CREATOR_PROFILE_STORY_JOIN =
  `creator_profiles(${CREATOR_PROFILE_PUBLIC_SELECT})`;
