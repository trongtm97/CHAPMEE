import { resolveProfileAvatarUrl, type ProfileAvatarFields } from "@/lib/profile/resolve-profile-avatar";

/** Map DB profile row fields to API `avatarUrl` (custom upload or stable default mascot). */
export function profileAvatarUrlFromRow(
  profile: ProfileAvatarFields | null | undefined
): string {
  return resolveProfileAvatarUrl(profile);
}
