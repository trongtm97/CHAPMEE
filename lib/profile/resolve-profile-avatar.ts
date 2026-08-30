import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import {
  getDefaultAvatarUrl,
  resolveDefaultAvatarId
} from "@/lib/profile/default-avatar";

export type ProfileAvatarFields = {
  id?: string | null;
  avatar_url?: string | null;
  avatar_media_id?: string | null;
  default_avatar_id?: number | null;
  defaultAvatarId?: number | null;
};

/**
 * Resolve display URL for profile avatar.
 * Custom `avatar_url` (S3 key or legacy URL) takes priority; otherwise returns a stable default mascot.
 */
export function resolveProfileAvatarUrl(
  profile: ProfileAvatarFields | null | undefined
): string {
  const customAvatar = profile?.avatar_url?.trim();

  const defaultId = resolveDefaultAvatarId({
    id: profile?.id,
    default_avatar_id: profile?.default_avatar_id,
    defaultAvatarId: profile?.defaultAvatarId
  });

  if (customAvatar) {
    return resolveStoredMediaUrl(customAvatar) ?? getDefaultAvatarUrl(defaultId);
  }

  return getDefaultAvatarUrl(defaultId);
}

export function resolveProfileAvatarUrlForUser(
  userId: string,
  profile?: Omit<ProfileAvatarFields, "id"> | null
): string {
  return resolveProfileAvatarUrl({
    id: userId,
    avatar_url: profile?.avatar_url,
    default_avatar_id: profile?.default_avatar_id,
    defaultAvatarId: profile?.defaultAvatarId,
    avatar_media_id: profile?.avatar_media_id
  });
}

export function mapProfileWithResolvedAvatar<T extends ProfileAvatarFields>(
  profile: T
): T & { avatarUrl: string } {
  return {
    ...profile,
    avatarUrl: resolveProfileAvatarUrl(profile)
  };
}
