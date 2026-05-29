import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH
} from "@/lib/username/validate-display-name";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsernameFormat
} from "@/lib/username/normalize-username";

export {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
};

export const BIO_MAX_LENGTH = 160;

/** Kiểm tra định dạng đồng bộ (client). Policy DB kiểm tra trên server. */
export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Vui lòng nhập tên hiển thị.";
  }

  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
    return "Tên hiển thị cần ít nhất 2 ký tự.";
  }

  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return "Tên hiển thị quá dài (tối đa 50 ký tự).";
  }

  if (/(?:https?:\/\/|www\.)/i.test(trimmed)) {
    return "Tên hiển thị không được chứa liên kết URL.";
  }

  return null;
}

export function validateUsernameField(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const { error } = validateUsernameFormat(trimmed);
  return error;
}

export function validateBioField(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > BIO_MAX_LENGTH) {
    return `Bio tối đa ${BIO_MAX_LENGTH} ký tự.`;
  }

  return null;
}
