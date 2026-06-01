export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** a-z, 0-9, dấu chấm — không đầu/cuối bằng chấm, không `..` */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9.]{1,28}[a-z0-9])?$/;

/** Dùng trong proxy / route matching `/@username` */
export const USERNAME_PATH_REGEX = "[a-z0-9](?:[a-z0-9.]{1,28}[a-z0-9])?";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "studio",
  "login",
  "register",
  "settings",
  "me",
  "profile",
  "chapmee",
  "support",
  "help",
  "coin",
  "wallet",
  "reels",
  "truyen",
  "creators",
  "creator",
  "author",
  "authors",
  "tacgia",
  "u"
]);

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.toLowerCase());
}

export function isValidUsernameShape(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < USERNAME_MIN_LENGTH ||
    normalized.length > USERNAME_MAX_LENGTH
  ) {
    return false;
  }
  if (!/^[a-z0-9.]+$/.test(normalized)) {
    return false;
  }
  if (normalized.startsWith(".") || normalized.endsWith(".")) {
    return false;
  }
  if (normalized.includes("..")) {
    return false;
  }
  return USERNAME_PATTERN.test(normalized);
}

/**
 * Chuẩn hoá chuỗi thành username gợi ý từ tên hiển thị (không dấu, không khoảng trắng).
 * Ví dụ: "Bánh Cuốn Nhỏ" => "banhcuonnho"
 */
/** @alias normalizeUsername — shared slug from display name */
export function generateUsernameFromDisplayName(value: string): string {
  return normalizeUsername(value);
}

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

/** Lọc input username thủ công — giữ a-z, 0-9 và dấu chấm. */
export function sanitizeUsernameInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function validateUsernameFormat(value: string): {
  normalized: string | null;
  error: string | null;
} {
  const normalized = sanitizeUsernameInput(value.trim());

  if (!normalized) {
    return { normalized: null, error: null };
  }

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      normalized: null,
      error: "Username cần ít nhất 3 ký tự."
    };
  }

  if (!isValidUsernameShape(normalized)) {
    return {
      normalized: null,
      error: "Username chỉ dùng chữ thường, số và dấu chấm (không đầu/cuối bằng chấm)."
    };
  }

  if (isReservedUsername(normalized)) {
    return {
      normalized: null,
      error: "Username này không thể sử dụng."
    };
  }

  return { normalized, error: null };
}
