import { normalizeUsername } from "@/lib/username/normalize-username";
import { validateUsernameFormat } from "@/lib/username/normalize-username";

export { normalizeUsername };

export function buildProfileHandle(input: {
  username?: string | null;
  displayName?: string | null;
  userId: string;
}) {
  if (input.username?.trim()) {
    return `@${input.username.trim().toLowerCase()}`;
  }

  const fromDisplay = normalizeUsername(input.displayName ?? "");
  if (fromDisplay.length >= 3) {
    return `@${fromDisplay}`;
  }

  return `@user${input.userId.replace(/-/g, "").slice(0, 8)}`;
}

export function validateUsername(value: string) {
  const { normalized, error } = validateUsernameFormat(value);
  if (error) {
    return { normalized: null, error };
  }
  return { normalized, error: null };
}

export function validateBio(value: string, maxLength = 160) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { bio: null as string | null, error: null as string | null };
  }
  if (trimmed.length > maxLength) {
    return {
      bio: null,
      error: `Bio tối đa ${maxLength} ký tự.`
    };
  }
  return { bio: trimmed, error: null };
}
