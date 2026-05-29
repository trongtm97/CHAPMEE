export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** a-z, 0-9, underscore, dot — no leading/trailing dot, no .. */
export const USERNAME_PATTERN = /^(?!\.)(?!.*\.\.)([a-z0-9._]{3,30})(?<!\.)$/;

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function validateUsernameFormat(value: string): {
  normalized: string | null;
  error: string | null;
} {
  const normalized = normalizeUsername(value);

  if (!normalized) {
    return { normalized: null, error: null };
  }

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      normalized: null,
      error: "Username cần ít nhất 3 ký tự."
    };
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return {
      normalized: null,
      error:
        "Username chỉ gồm chữ thường, số, dấu gạch dưới hoặc dấu chấm (3–30 ký tự), không bắt đầu/kết thúc bằng dấu chấm."
    };
  }

  return { normalized, error: null };
}
