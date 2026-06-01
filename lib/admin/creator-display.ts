import {
  CREATOR_PROFILE_PUBLIC_SELECT,
  CREATOR_PROFILE_STORY_JOIN
} from "@/lib/creator/supabase-selects";
import { resolveCreatorRowName } from "@/lib/creator/resolve-creator-row-name";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import type { LegacyPenNameFields, ProfileNameFields } from "@/lib/profile/resolve-public-display-name";

export { CREATOR_PROFILE_PUBLIC_SELECT, CREATOR_PROFILE_STORY_JOIN };

/** Inline `creator_profiles(...)` fragment for admin Supabase selects. */
export const ADMIN_CREATOR_JOIN = `creator_profiles(${CREATOR_PROFILE_PUBLIC_SELECT})`;

type CreatorJoinRow = LegacyPenNameFields & {
  profiles?:
    | ProfileNameFields
    | ProfileNameFields[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

/** Studio / author label for admin UI (profile-backed). */
export function resolveAdminCreatorName(creator: unknown): string | null {
  if (!creator || typeof creator !== "object") {
    return null;
  }
  const row = creator as CreatorJoinRow;
  return resolvePublicDisplayName(firstRelation(row.profiles), row);
}

/** Alias for story-nested creator_profiles rows. */
export function resolveAdminStudioName(creator: unknown): string | null {
  if (!creator || typeof creator !== "object") {
    return null;
  }
  return resolveCreatorRowName(creator as CreatorJoinRow);
}

/** Studio label from an already-loaded profile row. */
export function resolveAdminStudioFromProfile(
  profile: ProfileNameFields | null | undefined
): string | null {
  const name = profile?.display_name?.trim() || profile?.username?.trim();
  return name || null;
}
