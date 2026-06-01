import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";

type CreatorRow = {
  pen_name?: string | null;
  profiles?:
    | { display_name?: string | null; username?: string | null }
    | { display_name?: string | null; username?: string | null }[]
    | null;
} | null;

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

/** Resolve author display name from a creator_profiles join row. */
export function resolveCreatorRowName(creator: CreatorRow): string | null {
  if (!creator) {
    return null;
  }
  return resolvePublicDisplayName(firstRelation(creator.profiles), creator);
}

export function resolveCreatorRowUsername(creator: CreatorRow): string | null {
  if (!creator) {
    return null;
  }
  const username = firstRelation(creator.profiles)?.username?.trim().toLowerCase();
  return username || null;
}
