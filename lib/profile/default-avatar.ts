export const DEFAULT_AVATAR_COUNT = 30;
export const DEFAULT_AVATAR_BASE_PATH = "/images/default-avatars";
export const DEFAULT_AVATAR_EXTENSION = "webp";

export function getStableDefaultAvatarId(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return (hash % DEFAULT_AVATAR_COUNT) + 1;
}

export function normalizeDefaultAvatarId(
  value: number | string | null | undefined
): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.trunc(parsed);

  if (rounded < 1 || rounded > DEFAULT_AVATAR_COUNT) {
    return null;
  }

  return rounded;
}

export function getDefaultAvatarUrl(id: number): string {
  const safeId = Math.max(1, Math.min(DEFAULT_AVATAR_COUNT, id || 1));
  const padded = String(safeId).padStart(2, "0");

  return `${DEFAULT_AVATAR_BASE_PATH}/chapmee-avatar-${padded}.${DEFAULT_AVATAR_EXTENSION}`;
}

export function resolveDefaultAvatarId(input: {
  id?: string | null;
  defaultAvatarId?: number | null;
  default_avatar_id?: number | null;
}): number {
  const stored =
    normalizeDefaultAvatarId(input.defaultAvatarId) ??
    normalizeDefaultAvatarId(input.default_avatar_id);

  if (stored) {
    return stored;
  }

  return getStableDefaultAvatarId(input.id?.trim() || "chapmee-user");
}
