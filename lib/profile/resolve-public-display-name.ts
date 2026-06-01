export type ProfileNameFields = {
  display_name?: string | null;
  username?: string | null;
};

/** @deprecated Legacy creator_profiles.pen_name — read only for unmigrated rows. */
export type LegacyPenNameFields = {
  pen_name?: string | null;
};

/**
 * Public-facing name: profile display_name → username → legacy pen_name → fallback.
 */
export function resolvePublicDisplayName(
  profile: ProfileNameFields | null | undefined,
  legacy?: LegacyPenNameFields | null
): string {
  const display = profile?.display_name?.trim();
  if (display) {
    return display;
  }

  const username = profile?.username?.trim();
  if (username) {
    return username;
  }

  const pen = legacy?.pen_name?.trim();
  if (pen) {
    return pen;
  }

  return "Tác giả";
}
